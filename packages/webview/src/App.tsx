import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import PlatformLayout from './layouts/PlatformLayout'
import Home from './pages/Home'
import ProjectWorkSpace from './pages/ProjectWorkSpace'
import CreateProject from './pages/CreateProject'
import AgentStore from './pages/AgentStore'
import PlatformHome from './pages/platform/PlatformHome'
import PlatformProjectDetail from './pages/platform/PlatformProjectDetail'
import PlatformUploads from './pages/platform/PlatformUploads'
import { getRuntimeConfig } from './config/runtime'
import { PlatformMockProvider } from './platform/PlatformMockProvider'
import './App.css'

// Vite's development server supports SPA history fallback, so pathname routes
// such as /agent/store should remain directly addressable while developing.
// Packaged Webviews still need hash routing because their host URL cannot serve
// arbitrary pathnames.
const LocalRouter = import.meta.env.DEV ? BrowserRouter : HashRouter

function LocalApp() {
  return (
    <LocalRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/workspace/:projectKey" element={<ProjectWorkSpace />} />
          <Route path="/create-project" element={<CreateProject />} />
        </Route>
        <Route path="/agent/store" element={<AgentStore />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LocalRouter>
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
          <Route path="/agent/store" element={<AgentStore />} />
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
