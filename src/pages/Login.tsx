import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: 实现登录逻辑
    console.log('Login attempt:', { username, password })

    // 登录成功后跳转到首页
    navigate('/')
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

            <button type="submit" className="login-button">
              登录
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
