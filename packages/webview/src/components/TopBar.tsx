import { useState } from 'react'
import './TopBar.css'
import { InfoCircleOutlined, MenuUnfoldOutlined, SearchOutlined } from '@ant-design/icons'

function TopBar() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Search:', searchQuery)
  }

  return (
    <div className="topbar">
      {/* 左侧 Icon */}
      <div className="topbar-left">
        <div className="topbar-logo">
          <span className="logo-icon">
            <MenuUnfoldOutlined />
          </span>
        </div>
      </div>

      {/* 右侧内容 */}
      <div className="topbar-right">
        {/* 搜索框 */}
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

        {/* 通知提醒 */}
        <button className="notification-button">
          <span className="notification-icon">
            <InfoCircleOutlined />
          </span>
          <span className="notification-badge">3</span>
        </button>

        {/* 用户头像 */}
        <div className="user-avatar">
          <img
            src="https://via.placeholder.com/40"
            alt="User Avatar"
            className="avatar-image"
          />
        </div>
      </div>
    </div>
  )
}

export default TopBar
