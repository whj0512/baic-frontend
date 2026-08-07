[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$BaicLocalRoot,
  [Parameter(Mandatory)]
  [string]$LanguageServerRoot,
  [string]$Python = 'py',
  [string]$VsixOutput
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$baicRoot = (Resolve-Path $BaicLocalRoot).Path
$languageServerRoot = (Resolve-Path $LanguageServerRoot).Path
$extensionRoot = Join-Path $projectRoot 'packages\extension'
$serverRoot = Join-Path $extensionRoot 'server\win32-x64'
$baicOutput = Join-Path $baicRoot 'dist'
$languageServerOutput = Join-Path $languageServerRoot 'dist'

if (-not $VsixOutput) {
  $version = (Get-Content (Join-Path $extensionRoot 'package.json') -Raw | ConvertFrom-Json).version
  $VsixOutput = Join-Path $extensionRoot "requirements-management-extension-$version-win32-x64.vsix"
}

& $Python -3.12 (Join-Path $languageServerRoot 'tools\sync_grammars.py') --source-root (Join-Path $projectRoot 'helps') --check
if ($LASTEXITCODE -ne 0) { throw 'Language-server grammars are not synchronized with helps/.' }

& (Join-Path $baicRoot 'packaging\build.ps1') -Python "$Python -3.12" -OutputRoot $baicOutput
& (Join-Path $languageServerRoot 'packaging\build.ps1') -Python "$Python -3.12" -OutputRoot $languageServerOutput

$baicPayload = Join-Path $baicOutput 'baic-local'
$lspPayload = Join-Path $languageServerOutput 'textx-dsl-server'
if (-not (Test-Path (Join-Path $baicPayload 'baic-local.exe'))) { throw "BAIC-local payload was not built: $baicPayload" }
if (-not (Test-Path (Join-Path $lspPayload 'textx-dsl-server.exe'))) { throw "Language-server payload was not built: $lspPayload" }

$targetBaic = Join-Path $serverRoot 'baic-local'
$targetLsp = Join-Path $serverRoot 'textx-dsl-server'
$legacyBackend = Join-Path $serverRoot 'baic-backend'
foreach ($target in @($targetBaic, $targetLsp, $legacyBackend)) {
  if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
}
New-Item -ItemType Directory -Force -Path $serverRoot | Out-Null
Copy-Item -LiteralPath $baicPayload -Destination $targetBaic -Recurse
Copy-Item -LiteralPath $lspPayload -Destination $targetLsp -Recurse

$manifest = [ordered]@{
  target = 'win32-x64'
  generated_at_utc = (Get-Date).ToUniversalTime().ToString('o')
  components = [ordered]@{
    baic_local = [ordered]@{
      commit = (git -C $baicRoot rev-parse HEAD).Trim()
      executable = 'baic-local/baic-local.exe'
      sha256 = (Get-FileHash (Join-Path $targetBaic 'baic-local.exe') -Algorithm SHA256).Hash
    }
    language_server = [ordered]@{
      commit = (git -C $languageServerRoot rev-parse HEAD).Trim()
      executable = 'textx-dsl-server/textx-dsl-server.exe'
      sha256 = (Get-FileHash (Join-Path $targetLsp 'textx-dsl-server.exe') -Algorithm SHA256).Hash
    }
  }
  ports = [ordered]@{
    baic_local = 8000
    internal_constraints = 3000
    environment = 3001
    interaction = 3002
    internal_composition = 3003
    dialog_map = 3004
  }
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $serverRoot 'manifest.json') -Encoding utf8

Push-Location $projectRoot
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Webview or extension build failed.' }
  vsce package --target win32-x64 --no-dependencies --allow-missing-repository --skip-license --out $VsixOutput
  if ($LASTEXITCODE -ne 0) { throw 'VSIX packaging failed.' }
  $entries = tar -tf $VsixOutput
  foreach ($required in @(
    'extension/server/win32-x64/baic-local/baic-local.exe',
    'extension/server/win32-x64/textx-dsl-server/textx-dsl-server.exe',
    'extension/server/win32-x64/manifest.json',
    'extension/media/webview/index.html',
    'extension/dist/extension.js'
  )) {
    if ($entries -notcontains $required) { throw "VSIX is missing $required" }
  }
  if ($entries -match 'extension/server/win32-x64/baic-backend/') { throw 'VSIX still contains the legacy baic-backend payload.' }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $VsixOutput))
  try {
    $manifestEntry = $archive.GetEntry('extension/server/win32-x64/manifest.json')
    if (-not $manifestEntry) { throw 'VSIX manifest is missing.' }
    $reader = [System.IO.StreamReader]::new($manifestEntry.Open())
    try {
      $packageManifest = $reader.ReadToEnd() | ConvertFrom-Json
    } finally {
      $reader.Dispose()
    }
    foreach ($component in @($packageManifest.components.baic_local, $packageManifest.components.language_server)) {
      $entry = $archive.GetEntry("extension/server/win32-x64/$($component.executable)")
      if (-not $entry) { throw "VSIX manifest references a missing executable: $($component.executable)" }
      $sha256 = [System.Security.Cryptography.SHA256]::Create()
      $stream = $entry.Open()
      try {
        $hash = ([System.BitConverter]::ToString($sha256.ComputeHash($stream))).Replace('-', '')
      } finally {
        $stream.Dispose()
        $sha256.Dispose()
      }
      if ($hash -ne $component.sha256) { throw "VSIX manifest hash mismatch: $($component.executable)" }
    }
  } finally {
    $archive.Dispose()
  }
} finally {
  Pop-Location
}
