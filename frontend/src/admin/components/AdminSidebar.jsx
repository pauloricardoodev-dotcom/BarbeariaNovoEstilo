const AdminSidebar = ({ activeTab, setActiveTab, collapsed, onToggle }) => {
  const handleLogout = () => {
    window.location.href = '/';
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">✂</div>
          <div className="logo-text">
            <div className="logo-name">Barbearia Novo Estilo</div>
            <div className="logo-subtitle">ADMIN</div>
          </div>
        </div>
        {!collapsed && (
          <button className="sidebar-toggle" onClick={onToggle}>
            ←
          </button>
        )}
      </div>

      {collapsed && (
        <div className="sidebar-collapsed-toggle">
          <button className="sidebar-toggle" onClick={onToggle}>
            →
          </button>
        </div>
      )}

      <nav className="sidebar-nav">
        <ul className="nav-list">
          <li className="nav-item">
            <button
              className={`nav-button ${activeTab === 'agenda' ? 'active' : ''}`}
              onClick={() => setActiveTab('agenda')}
            >
              <span className="nav-icon">📅</span>
              <span className="nav-label">Agenda</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-label">Dashboard</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-button ${activeTab === 'services' ? 'active' : ''}`}
              onClick={() => setActiveTab('services')}
            >
              <span className="nav-icon">💇</span>
              <span className="nav-label">Serviços</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-button ${activeTab === 'professionals' ? 'active' : ''}`}
              onClick={() => setActiveTab('professionals')}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-label">Profissionais</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Configurações</span>
            </button>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-button" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          <span className="logout-label">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
