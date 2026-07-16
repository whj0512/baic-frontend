import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CloudServerOutlined, UploadOutlined } from '@ant-design/icons'
import './PlatformLayout.css'

function PlatformLayout() {
  const location = useLocation()
  const isWorkspace = location.pathname.startsWith('/projects/')

  return (
    <div className="platform-layout">
      <header className="platform-header">
        <NavLink to="/" className="platform-brand" aria-label="返回远程平台首页">
          <CloudServerOutlined />
          <span>BAIC 需求管理平台</span>
        </NavLink>
        <nav className="platform-nav" aria-label="远程平台导航">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            项目管理
          </NavLink>
          <NavLink to="/uploads" className={({ isActive }) => isActive ? 'active' : ''}>
            <UploadOutlined />
            上传记录
          </NavLink>
        </nav>
      </header>
      <main className={`platform-content${isWorkspace ? ' platform-content--workspace' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}

export default PlatformLayout
