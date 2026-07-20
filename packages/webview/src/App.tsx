import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import PlatformLayout from './layouts/PlatformLayout'
import Home from './pages/Home'
import ProjectWorkSpace from './pages/ProjectWorkSpace'
import CreateProject from './pages/CreateProject'
import PlatformHome from './pages/platform/PlatformHome'
import PlatformProjectDetail from './pages/platform/PlatformProjectDetail'
import PlatformUploads from './pages/platform/PlatformUploads'
import { getRuntimeConfig } from './config/runtime'
import { PlatformMockProvider } from './platform/PlatformMockProvider'
import './App.css'

function LocalApp() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/workspace/:projectKey" element={<ProjectWorkSpace />} />
          <Route path="/create-project" element={<CreateProject />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

function PlatformApp() {
  return (
    <BrowserRouter>
      <PlatformMockProvider>
        <Routes>
          <Route element={<PlatformLayout />}>
            <Route path="/" element={<PlatformHome />} />
            <Route path="/projects/:projectId" element={<PlatformProjectDetail />} />
            <Route path="/projects/:projectId/versions/:versionId" element={<PlatformProjectDetail />} />
            <Route path="/uploads" element={<PlatformUploads />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PlatformMockProvider>
    </BrowserRouter>
  )
}

function App() {
  return getRuntimeConfig().appTarget === 'platform' ? <PlatformApp /> : <LocalApp />
}

export default App
