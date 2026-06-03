import { cp, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const extensionRoot = resolve(currentDir, '..')
const sourceDir = resolve(extensionRoot, '..', 'webview', 'dist')
const targetDir = resolve(extensionRoot, 'media', 'webview')

await rm(targetDir, { recursive: true, force: true })
await mkdir(targetDir, { recursive: true })
await cp(sourceDir, targetDir, { recursive: true })
