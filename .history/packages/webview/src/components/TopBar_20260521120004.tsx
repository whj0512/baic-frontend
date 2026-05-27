import { useState } from 'react'
import { InfoCircleOutlined, LogoutOutlined, MenuUnfoldOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { clearAuth } from '../config/api'
import './TopBar.css'

function TopBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const auth = useAuth()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Search:', searchQuery)
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo">
          <span className="logo-icon">
            <MenuUnfoldOutlined />
          </span>
        </div>
      </div>

      <div className="topbar-right">
        <form className="search-box" onSubmit={handleSearch}>
          <input
            type="text"
            className="search-input"
            placeholder="搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-button">
            <SearchOutlined />
          </button>
        </form>

        <button className="notification-button">
          <span className="notification-icon">
            <InfoCircleOutlined />
          </span>
          <span className="notification-badge">3</span>
        </button>

        <div className="user-session">
          <div className="user-avatar" title={auth.user?.email || 'Current user'}>
            <UserOutlined />
          </div>
          <button className="logout-button" onClick={() => clearAuth()} title="退出登录">
            <LogoutOutlined />
          </button>
        </div>
      </div>
    </div>
  )
}

export default TopBar
