import { Outlet } from 'react-router-dom'
import TopBar from '../components/TopBar'
import LeftBar from '../components/LeftBar'
import './MainLayout.css'

function MainLayout() {
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
