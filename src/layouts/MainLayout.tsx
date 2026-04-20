import { Outlet, Navigate, useLocation } from 'react-router-dom'
import TopBar from '../components/TopBar'
import LeftBar from '../components/LeftBar'
import './MainLayout.css'

function MainLayout() {
  const token = localStorage.getItem('token')
  const location = useLocation()

  // 若尚未鉴权，优先跳转至 /auth-callback 进行鉴权逻辑处理
  // 这里将 search 参数保留，以防外部系统直接携带 token 访问了内置的页面链接
  if (!token) {
    return <Navigate to={`/auth-callback?${location.search}`} replace />
  }

  return (
    <div className="main-layout">
      <TopBar />
      <LeftBar />
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
