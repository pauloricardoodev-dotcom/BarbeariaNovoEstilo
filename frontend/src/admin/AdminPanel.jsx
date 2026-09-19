import { useState } from 'react';
import AdminSidebar from './components/AdminSidebar';
import AgendaTab from './components/AgendaTab';
import DashboardTab from './components/DashboardTab';
import ServicesTab from './components/ServicesTab';
import ProfessionalsTab from './components/ProfessionalsTab';
import SettingsTab from './components/SettingsTab';
import './styles/admin.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('agenda');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="admin-layout">
      <AdminSidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <main className={`admin-main ${sidebarCollapsed ? 'sidebar-closed' : ''}`}>
        {activeTab === 'agenda' && <AgendaTab />}
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'services' && <ServicesTab />}
        {activeTab === 'professionals' && <ProfessionalsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
};

export default AdminPanel;
