import { NavLink } from 'react-router';
import Icone from './Icones';

const NAV_ITEMS = [
  { path: '/admin/agenda', icon: 'agenda', label: 'Agenda' },
  { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { path: '/admin/servicos', icon: 'servicos', label: 'Serviços' },
  { path: '/admin/configuracoes', icon: 'configuracoes', label: 'Configurações' },
];

const AdminSidebar = ({ collapsed, onToggle, user, onLogout }) => {
  const handleLogout = () => {
    onLogout();
  };

  return (
    <aside className={`admin-sidebar d-flex flex-column ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header d-flex align-items-center justify-content-between gap-2 p-3">
        <div className="d-flex align-items-center gap-2 overflow-hidden">
          <div className="logo-icon">✂</div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="logo-name text-truncate">Barbearia Novo Estilo</div>
              <div className="logo-subtitle">ADMIN</div>
            </div>
          )}
        </div>
        {/* Só existe no celular: no computador a sidebar é fixa. */}
        {onToggle && (
          <button
            type="button"
            className="btn btn-sm btn-light sidebar-toggle"
            onClick={onToggle}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? '→' : '←'}
          </button>
        )}
      </div>

      <nav className="flex-grow-1 py-3 overflow-y-auto">
        <ul className="nav flex-column">
          {NAV_ITEMS.map((item) => (
            <li key={item.path} className="nav-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-link w-100 d-flex align-items-center gap-3 ${isActive ? 'active' : ''}`
                }
                title={item.label}
              >
                <Icone nome={item.icon} />
                {!collapsed && <span className="text-truncate">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer p-3">
        {user && (
          <div className="sidebar-user" title={`${user.nome} · ${user.email}`}>
            <span className="sidebar-user-avatar">
              <Icone nome="perfil" size={20} />
            </span>
            {!collapsed && (
              <span className="sidebar-user-info">
                <b>{user.nome}</b>
                <small>{user.email}</small>
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={handleLogout}
          title="Sair"
        >
          <Icone nome="sair" size={18} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
