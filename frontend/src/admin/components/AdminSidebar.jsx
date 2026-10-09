const NAV_ITEMS = [
  { id: 'agenda', icon: '📅', label: 'Agenda' },
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'services', icon: '💇', label: 'Serviços' },
  { id: 'professionals', icon: '👥', label: 'Profissionais' },
  { id: 'settings', icon: '⚙️', label: 'Configurações' },
];

const AdminSidebar = ({ activeTab, setActiveTab, collapsed, onToggle }) => {
  const handleLogout = () => {
    window.location.href = '/';
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
        <button
          type="button"
          className="btn btn-sm btn-light sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="flex-grow-1 py-3 overflow-y-auto">
        <ul className="nav flex-column">
          {NAV_ITEMS.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                type="button"
                className={`sidebar-link w-100 d-flex align-items-center gap-3 ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
              >
                <span className="fs-5">{item.icon}</span>
                {!collapsed && <span className="text-truncate">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer p-3">
        <button
          type="button"
          className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={handleLogout}
          title="Sair"
        >
          <span>🚪</span>
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
