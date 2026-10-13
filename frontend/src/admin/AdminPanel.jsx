import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import useCelular from '../hooks/useCelular';
import AdminSidebar from './components/AdminSidebar';
import AgendaTab from './components/AgendaTab';
import DashboardTab from './components/DashboardTab';
import NotificacoesTab from './components/NotificacoesTab';
import useNotificacoes from './hooks/useNotificacoes';
import ServicesTab from './components/ServicesTab';
import SettingsTab from './components/SettingsTab';

// Rotas relativas a /admin (ver main.jsx). Os links da sidebar estão em AdminSidebar.
const AdminPanel = ({ user, onLogout }) => {
  // No computador a sidebar é fixa (sempre aberta); só em tela de celular ela pode ser recolhida.
  const celular = useCelular();
  const [recolhidaNoCelular, setRecolhidaNoCelular] = useState(true);
  const sidebarCollapsed = celular && recolhidaNoCelular;

  // Pedidos de cancelamento e reagendamentos de clientes ainda não vistos: ponto vermelho do menu e página de notificações.
  const { solicitacoes, reagendamentos, total: totalNotificacoes, erro: erroNotificacoes, recarregar: recarregarNotificacoes } =
    useNotificacoes();

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
        notificacoes={totalNotificacoes}
      />
      <main className={`admin-main ${sidebarCollapsed ? 'sidebar-closed' : ''}`}>
        <div className="container-xxl py-4 px-3 px-md-4">
          <Routes>
            <Route
              path="agenda"
              element={<AgendaTab notificacoes={totalNotificacoes} onNotificacoesMudaram={recarregarNotificacoes} />}
            />
            <Route
              path="notificacoes"
              element={
                <NotificacoesTab
                  solicitacoes={solicitacoes}
                  reagendamentos={reagendamentos}
                  erro={erroNotificacoes}
                  onMudou={recarregarNotificacoes}
                />
              }
            />
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
