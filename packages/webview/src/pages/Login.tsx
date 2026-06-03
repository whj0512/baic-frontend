import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../config/api'
import { saveBrowserAuth } from '../config/authClient'
import { message } from 'antd'
import './Login.css'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || '登录失败')
      }

      // 存储 token 和 user_id
      saveBrowserAuth({
        token: data.token,
        userId: data.user_id,
        username,
      })

      message.success('登录成功')
      // 登录成功后跳转到首页
      navigate('/')
    } catch (error: any) {
      console.error('Login error:', error)
      message.error(error.message || '登录发生错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigate('/register')
  }

  return (
    <div className="login-container">
      {/* 左侧登录面板 */}
      <div className="login-panel">
        <div className="login-content">
          <h1 className="login-title">Login</h1>
          <p className="login-subtitle">欢迎使用需求管理系统</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                type="text"
                id="username"
                className="form-input"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>记住我</span>
              </label>
              <a href="#" className="forgot-password">忘记密码?</a>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="login-footer">
            <span>还没有账号? </span>
            <a href="#" className="register-link" onClick={handleRegister}>立即注册</a>
          </div>
        </div>
      </div>

      {/* 右侧预留区域 */}
      <div className="login-visual">
        {/* 此区域留空，供后期填充图片或其它素材 */}
      </div>
    </div>
  )
}

export default Login
