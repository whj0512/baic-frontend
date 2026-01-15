import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ProjectManagement from './pages/ProjectManagement'
import CreateProject from './pages/CreateProject/CreateProject'
import ProjectDetail from './pages/ProjectDetail'
import CreateRequirement from './pages/CreateRequirement'
import RequirementSectionEditor from './pages/RequirementSectionEditor'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Authenticated Routes wrapped in MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/project" element={<ProjectManagement />} />
          <Route path="/project/:type" element={<ProjectManagement />} />
          <Route path="/project/:type/:id" element={<ProjectDetail />} />
          <Route path="/project/:type/:id/create" element={<CreateRequirement />} />
          <Route path="/project/:type/:id/create/section/:sectionKey" element={<RequirementSectionEditor />} />
          <Route path="/create-project" element={<CreateProject />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
