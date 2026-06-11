import * as crypto from 'crypto'
import * as vscode from 'vscode'

import { getBackendMode } from './config'
import type { AuthSnapshot, RuntimeConfig } from './types'
import { getString, readJsonObject } from './utils'

const SECRET_TOKEN = 'baic.auth.token'
const SECRET_USER_ID = 'baic.auth.userId'
const SECRET_USERNAME = 'baic.auth.username'
const SECRET_EXPIRES_AT = 'baic.auth.expiresAt'
const LOCAL_JWT_SECRET = 'secret-key'
const LOCAL_JWT_EXPIRES_IN_SECONDS = 3600

export class AuthService {
  constructor(
    private readonly secrets: vscode.SecretStorage,
    private readonly extensionUri: vscode.Uri,
  ) {}

  async getSnapshot(): Promise<AuthSnapshot> {
    const token = await this.secrets.get(SECRET_TOKEN)
    if (!token) {
      return { status: 'unauthenticated' }
    }

    const storedExpiresAt = Number(await this.secrets.get(SECRET_EXPIRES_AT))
    const expiresAt = Number.isFinite(storedExpiresAt)
      ? storedExpiresAt
      : getTokenExpiresAt(token)

    if ((expiresAt && expiresAt <= Date.now()) || isTokenExpired(token)) {
      await this.clear()
      return { status: 'unauthenticated' }
    }

    const userId = await this.secrets.get(SECRET_USER_ID)
    const username = await this.secrets.get(SECRET_USERNAME)

    return {
      status: 'authenticated',
      token,
      user: userId && username ? { id: userId, email: username } : undefined,
      expiresAt,
    }
  }

  async login(email: string, config: RuntimeConfig): Promise<AuthSnapshot> {
    if (getBackendMode() === 'bundled') {
      const localUser = await this.getSeededUser(email)
      if (localUser) {
        const token = createLocalToken(localUser.id, localUser.email)
        await this.storeAuthSnapshot(token, localUser.id, localUser.email)
        return this.getSnapshot()
      }
    }

    const response = await fetch(`${config.apiBaseUrl}/auth/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const data = await readJsonObject(response)
    if (!response.ok) {
      throw new Error(
        getString(data.detail) || `Auth request failed: ${response.status}`,
      )
    }

    if (data.matched !== true || typeof data.token !== 'string') {
      throw new Error('Authentication failed')
    }

    const userId = getString(data.user_id) || getString(data.id) || ''
    const username = getString(data.email) || email
    await this.storeAuthSnapshot(data.token, userId, username)

    return this.getSnapshot()
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.secrets.delete(SECRET_TOKEN),
      this.secrets.delete(SECRET_USER_ID),
      this.secrets.delete(SECRET_USERNAME),
      this.secrets.delete(SECRET_EXPIRES_AT),
    ])
  }

  private async storeAuthSnapshot(
    token: string,
    userId: string,
    username: string,
  ): Promise<void> {
    const expiresAt = getTokenExpiresAt(token)

    await this.secrets.store(SECRET_TOKEN, token)
    await this.secrets.store(SECRET_USER_ID, userId)
    await this.secrets.store(SECRET_USERNAME, username)
    if (expiresAt) {
      await this.secrets.store(SECRET_EXPIRES_AT, String(expiresAt))
    } else {
      await this.secrets.delete(SECRET_EXPIRES_AT)
    }
  }

  private async getSeededUser(
    email: string,
  ): Promise<{ id: string; email: string } | undefined> {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return undefined

    const seedSqlUri = vscode.Uri.joinPath(
      this.extensionUri,
      'server',
      'win32-x64',
      'baic-backend',
      '_internal',
      'DB',
      'sqlite_init.sql',
    )

    try {
      const seedSql = Buffer.from(
        await vscode.workspace.fs.readFile(seedSqlUri),
      ).toString('utf8')
      return findSeededUser(seedSql, normalizedEmail)
    } catch {
      return undefined
    }
  }
}

function isTokenExpired(token: string): boolean {
  const expiresAt = getTokenExpiresAt(token)
  return Boolean(expiresAt && expiresAt <= Date.now())
}

function getTokenExpiresAt(token: string): number | undefined {
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return undefined

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : undefined
  } catch {
    return undefined
  }
}

function findSeededUser(
  seedSql: string,
  normalizedEmail: string,
): { id: string; email: string } | undefined {
  const insertPattern =
    /INSERT\s+OR\s+IGNORE\s+INTO\s+ibase_users[\s\S]*?VALUES\s*\(\s*'([^']+)'\s*,[\s\S]*?'([^']+@[^']+)'\s*,/gi
  let match: RegExpExecArray | null

  while ((match = insertPattern.exec(seedSql)) !== null) {
    const [, id, email] = match
    if (email.toLowerCase() === normalizedEmail) {
      return { id, email }
    }
  }

  return undefined
}

function createLocalToken(userId: string, email: string): string {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }
  const payload = {
    sub: userId,
    username: email,
    email,
    exp: nowSeconds + LOCAL_JWT_EXPIRES_IN_SECONDS,
  }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = crypto
    .createHmac('sha256', LOCAL_JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest()

  return `${encodedHeader}.${encodedPayload}.${base64UrlEncode(signature)}`
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}
