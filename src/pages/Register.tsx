import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Register.css'

function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: ''
  })
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: 实现注册逻辑
    console.log('Register attempt:', formData)

    // 注册成功后跳转到登录页面
    navigate('/login')
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
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  className="form-input"
                  placeholder="请输入名字"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  className="form-input"
                  placeholder="请输入姓氏"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder="请输入邮箱地址"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone no.</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="form-input"
                placeholder="请输入手机号码"
                value={formData.phone}
                onChange={handleChange}
                required
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

            <button type="submit" className="register-button">
              注册
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
