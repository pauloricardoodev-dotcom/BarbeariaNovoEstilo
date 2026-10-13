import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import useCelular from '../hooks/useCelular';
import AdminSidebar from './components/AdminSidebar';
import AgendaTab from './components/AgendaTab';
import DashboardTab from './components/DashboardTab';
import ServicesTab from './components/ServicesTab';
import SettingsTab from './components/SettingsTab';

// Rotas relativas a /admin (ver main.jsx). Os links da sidebar estão em AdminSidebar.
const AdminPanel = ({ user, onLogout }) => {
  // No computador a sidebar é fixa (sempre aberta); só em tela de celular ela pode ser recolhida.
  const celular = useCelular();
  const [recolhidaNoCelular, setRecolhidaNoCelular] = useState(true);
  const sidebarCollapsed = celular && recolhidaNoCelular;

  const toggleSidebar = () => {
    setRecolhidaNoCelular(!recolhidaNoCelular);
  };

  return (
    <div className="admin-layout">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={celular ? toggleSidebar : undefined}
        user={user}
        onLogout={onLogout}
      />
      <main className={`admin-main ${sidebarCollapsed ? 'sidebar-closed' : ''}`}>
        <div className="container-xxl py-4 px-3 px-md-4">
          <Routes>
            <Route path="agenda" element={<AgendaTab />} />
            <Route path="dashboard" element={<DashboardTab />} />
            <Route path="servicos" element={<ServicesTab />} />
            <Route path="configuracoes" element={<SettingsTab />} />
            <Route path="*" element={<Navigate to="agenda" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
