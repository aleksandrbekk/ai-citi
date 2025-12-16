import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { expandWebApp } from './lib/telegram'
import { Layout } from '@/components/layout/Layout'
import { Home } from '@/pages/Home'
import { Profile } from '@/pages/Profile'
import { Agents } from '@/pages/Agents'
import { School } from '@/pages/School'
import { Missions } from '@/pages/Missions'
import { Shop } from '@/pages/Shop'
import PosterDashboard from '@/pages/tools/poster'
import PosterCreate from '@/pages/tools/poster/create'

function App() {
  useEffect(() => {
    expandWebApp()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="profile" element={<Profile />} />
          <Route path="agents" element={<Agents />} />
          <Route path="school" element={<School />} />
          <Route path="missions" element={<Missions />} />
          <Route path="shop" element={<Shop />} />
          <Route path="tools/poster" element={<PosterDashboard />} />
          <Route path="tools/poster/create" element={<PosterCreate />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
