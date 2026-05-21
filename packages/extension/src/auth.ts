import * as vscode from 'vscode'

import type { AuthSnapshot, RuntimeConfig } from './types'
import { getString, readJsonObject } from './utils'

const SECRET_TOKEN = 'baic.auth.token'
const SECRET_USER_ID = 'baic.auth.userId'
const SECRET_USERNAME = 'baic.auth.username'
const SECRET_EXPIRES_AT = 'baic.auth.expiresAt'

export class AuthService {
  constructor(private readonly secrets: vscode.SecretStorage) {}

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
    const expiresAt = getTokenExpiresAt(data.token)

    await this.secrets.store(SECRET_TOKEN, data.token)
    await this.secrets.store(SECRET_USER_ID, userId)
    await this.secrets.store(SECRET_USERNAME, username)
    if (expiresAt) {
      await this.secrets.store(SECRET_EXPIRES_AT, String(expiresAt))
    } else {
      await this.secrets.delete(SECRET_EXPIRES_AT)
    }

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
