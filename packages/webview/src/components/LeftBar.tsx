import { useNavigate, useLocation } from 'react-router-dom'
import './LeftBar.css'
import { FolderAddOutlined, HomeOutlined, ProjectOutlined, UserOutlined } from '@ant-design/icons'

function LeftBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { id: 'home', icon: <HomeOutlined />, path: '/', label: '首页' },
    { id: 'project', icon: <ProjectOutlined />, path: '/project/system', label: '需求项目管理' },
    { id: 'create', icon: <FolderAddOutlined />, path: '/create', label: '新建' },
    { id: 'user', icon: <UserOutlined />, path: '/users', label: '用户管理' },
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  const isItemActive = (item: typeof menuItems[0]) => {
    if (item.id === 'project') {
      return location.pathname.startsWith('/project')
    }
    return location.pathname === item.path
  }

  return (
    <div className="leftbar">
      <div className="leftbar-menu">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`menu-item ${isItemActive(item) ? 'active' : ''}`}
            onClick={() => handleNavigation(item.path)}
            title={item.label}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LeftBar
