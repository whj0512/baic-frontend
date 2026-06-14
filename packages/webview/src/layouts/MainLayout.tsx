import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { isExtensionAuthMode, loginWithEmail } from '../config/authClient'
import './MainLayout.css'
import { useAuth } from '../hooks/useAuth'

function MainLayout() {
  const location = useLocation()
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  const handleExtensionLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return

    setLoggingIn(true)
    setLoginError('')

    try {
      const next = await loginWithEmail(email.trim())
      if (next.status !== 'authenticated') {
        setLoginError('鉴权失败，请确认账号信息')
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '鉴权失败')
    } finally {
      setLoggingIn(false)
    }
  }

  if (auth.status !== 'authenticated' && !isExtensionAuthMode()) {
    const authSearch = location.search || window.location.search
    return (
      <Navigate
        to={{
          pathname: '/auth-callback',
          search: authSearch,
        }}
        replace
      />
    )
  }

  if (auth.status === 'checking') {
    return (
      <div className="extension-auth-page">
        <div className="extension-auth-panel">
          <h2>正在检查登录状态</h2>
        </div>
      </div>
    )
  }

  if (auth.status !== 'authenticated') {
    return (
      <div className="extension-auth-page">
        <form className="extension-auth-panel" onSubmit={handleExtensionLogin}>
          <h2>BAIC Requirements Manager</h2>
          <p>请输入账号邮箱完成 VS Code 扩展鉴权。</p>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.org"
            className="extension-auth-input"
            autoFocus
          />
          {loginError && <div className="extension-auth-error">{loginError}</div>}
          <button
            type="submit"
            className="extension-auth-button"
            disabled={loggingIn || !email.trim()}
          >
            {loggingIn ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="main-layout">
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
