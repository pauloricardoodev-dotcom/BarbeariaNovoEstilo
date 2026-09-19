import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AdminDashboard from './admin/AdminDashboard.jsx'
import './admin/styles/admin.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdminDashboard />
  </StrictMode>,
)