import { useEffect, useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { isAuthenticated } from '../config/api'
import './MainLayout.css'

function MainLayout() {
  const location = useLocation()
  const [authed, setAuthed] = useState(() => isAuthenticated())

  useEffect(() => {
    // 监听 storage 事件——当其它标签页清除 token 时同步本标签页的认证状态
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        setAuthed(isAuthenticated())
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // 每次路由变化时重新检查 token 是否仍然存在
  useEffect(() => {
    setAuthed(isAuthenticated())
  }, [location])

  // 若尚未鉴权，优先跳转至 /auth-callback 进行鉴权逻辑处理
  // 这里将 search 参数保留，以防外部系统直接携带 token 访问了内置的页面链接
  if (!authed) {
    const authSearch = location.search || window.location.search
    return (
      <Navigate
        to={{
          pathname: '/auth-callback',
          search: authSearch,
        }}
        replace
      />
    )
  }

  return (
    <div className="main-layout">
      <TopBar />
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout

