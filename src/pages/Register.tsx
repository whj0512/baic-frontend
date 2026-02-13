import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../config/api'
import { message } from 'antd'
import './Register.css'

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: ''
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(API_ENDPOINTS.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || '注册失败')
      }

      message.success('注册成功，请登录')
      // 注册成功后跳转到登录页面
      navigate('/login')
    } catch (error: any) {
      console.error('Register error:', error)
      message.error(error.message || '注册发生错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      {/* 左侧预留区域 */}
      <div className="register-visual">
        {/* 此区域留空，供后期填充素材 */}
      </div>

      {/* 右侧注册面板 */}
      <div className="register-panel">
        <div className="register-content">
          <h1 className="register-title">Create Account</h1>
          <p className="register-subtitle">加入需求管理系统</p>

          <form className="register-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                className="form-input"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                className="form-input"
                placeholder="请输入全名 (可选)"
                value={formData.full_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder="请输入邮箱地址 (可选)"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                placeholder="请输入密码"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="register-button" disabled={loading}>
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <div className="register-footer">
            <span>已有账号? </span>
            <a href="/login" className="login-link">立即登录</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
