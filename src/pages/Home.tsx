import { useNavigate } from 'react-router-dom'
import './Home.css'

function Home() {
  const navigate = useNavigate()

  const handleLogout = () => {
    // TODO: 实现登出逻辑
    console.log('Logout')
    navigate('/login')
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>需求管理系统</h1>
        <button onClick={handleLogout} className="logout-button">
          退出登录
        </button>
      </header>

      <main className="home-main">
        <div className="welcome-section">
          <h2>欢迎使用需求管理系统</h2>
          <p>这是系统首页，您可以在这里管理您的需求</p>
        </div>

        <div className="feature-cards">
          <div className="feature-card">
            <div className="card-icon">📋</div>
            <h3>需求列表</h3>
            <p>查看和管理所有需求</p>
          </div>

          <div className="feature-card">
            <div className="card-icon">➕</div>
            <h3>创建需求</h3>
            <p>添加新的需求项</p>
          </div>

          <div className="feature-card">
            <div className="card-icon">📊</div>
            <h3>需求统计</h3>
            <p>查看需求统计数据</p>
          </div>

          <div className="feature-card">
            <div className="card-icon">⚙️</div>
            <h3>系统设置</h3>
            <p>配置系统参数</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Home
