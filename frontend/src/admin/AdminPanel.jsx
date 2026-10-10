import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import AdminSidebar from './components/AdminSidebar';
import AgendaTab from './components/AgendaTab';
import DashboardTab from './components/DashboardTab';
import ServicesTab from './components/ServicesTab';
import ProfessionalsTab from './components/ProfessionalsTab';
import SettingsTab from './components/SettingsTab';

// Rotas relativas a /admin (ver main.jsx). Os links da sidebar estão em AdminSidebar.
const AdminPanel = ({ user, onLogout }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="admin-layout">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        user={user}
        onLogout={onLogout}
      />
      <main className={`admin-main ${sidebarCollapsed ? 'sidebar-closed' : ''}`}>
        <div className="container-xxl py-4 px-3 px-md-4">
          <Routes>
            <Route path="agenda" element={<AgendaTab />} />
            <Route path="dashboard" element={<DashboardTab />} />
            <Route path="servicos" element={<ServicesTab />} />
            <Route path="profissionais" element={<ProfessionalsTab />} />
            <Route path="configuracoes" element={<SettingsTab />} />
            <Route path="*" element={<Navigate to="agenda" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
