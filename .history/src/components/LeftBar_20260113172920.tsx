import { useNavigate, useLocation } from 'react-router-dom'
import './LeftBar.css'

function LeftBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { id: 'home', icon: '🏠', path: '/', label: '首页' },
    { id: 'project', icon: '📁', path: '/project', label: '需求项目管理' },
    { id: 'create', icon: '➕', path: '/create', label: '新建' },
    { id: 'user', icon: '👥', path: '/users', label: '用户管理' },
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  return (
    <div className="leftbar">
      <div className="leftbar-menu">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => handleNavigation(item.path)}
            title={item.label}
          >
            <span className="menu-icon">{item.icon}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LeftBar
