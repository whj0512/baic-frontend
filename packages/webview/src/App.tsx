import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ProjectWorkSpace from './pages/ProjectWorkSpace'
import CreateProject from './pages/CreateProject'
import AuthCallback from './pages/AuthCallback'
import AuthFailure from './pages/AuthFailure'
import './App.css'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth-callback" element={<AuthCallback />} />
        <Route path="/auth-failure" element={<AuthFailure />} />

        {/* Authenticated Routes wrapped in MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/workspace/:projectKey" element={<ProjectWorkSpace />} />
          <Route path="/create-project" element={<CreateProject />} />
        </Route>

        <Route path="*" element={<Navigate to="/auth-callback" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
