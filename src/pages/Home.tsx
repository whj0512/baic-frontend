import { useNavigate } from 'react-router-dom'
import './Home.css'

function Home() {
  const navigate = useNavigate()

  const navItems = [
    { id: 'system', label: '系统需求', path: '/project/system' },
    { id: 'subsystem', label: '子系统需求', path: '/project/subsystem' },
    { id: 'software', label: '软件需求', path: '/project/software' },
    { id: 'component', label: '部件需求', path: '/project/component' },
    { id: 'artifacts', label: '制品间关系', path: '/project/artifacts' },
  ]

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  return (
    <div className="home-content-wrapper">
      {/* 上方留空供后续填充图片 */}
      <div className="banner-placeholder">
        <span className="placeholder-text">Banner Image Placeholder</span>
      </div>

      {/* 下方目录导航项 */}
      <div className="navigation-list">
        {navItems.map((item) => (
          <div 
            key={item.id} 
            className="nav-item"
            onClick={() => handleNavClick(item.path)}
          >
            <span className="nav-text">{item.label}</span>
            <span className="nav-arrow">›</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Home
