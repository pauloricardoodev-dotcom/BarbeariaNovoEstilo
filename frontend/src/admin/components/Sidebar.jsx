import { useState } from 'react';

const Sidebar = ({ isOpen, onToggle }) => {
  const [activeMenu, setActiveMenu] = useState('appointments');
  const [expandedMenu, setExpandedMenu] = useState('appointments');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { 
      id: 'appointments', 
      label: 'Agendamentos', 
      icon: '📅',
      submenu: [
        { id: 'scheduled', label: 'Cortes agendados', active: true }
      ]
    },
    { id: 'calendar', label: 'Calendário', icon: '📆' },
    { id: 'clients', label: 'Clientes', icon: '👥' },
    { id: 'services', label: 'Serviços', icon: '✂️' },
    { id: 'professionals', label: 'Profissionais', icon: '👨‍💼' },
    { id: 'reviews', label: 'Avaliações', icon: '⭐' },
    { id: 'reports', label: 'Relatórios', icon: '📈' },
    { id: 'settings', label: 'Configurações', icon: '⚙️' }
  ];

  const handleMenuClick = (itemId) => {
    setActiveMenu(itemId);
    if (menuItems.find(item => item.id === itemId)?.submenu) {
      setExpandedMenu(expandedMenu === itemId ? null : itemId);
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">✂️</div>
          <div className="logo-text">
            <span className="logo-name">Barbearia Novo Estilo</span>
            <span className="logo-subtitle">PAINEL ADMINISTRATIVO</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-button ${activeMenu === item.id ? 'active' : ''}`}
                onClick={() => handleMenuClick(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.submenu && (
                  <span className="nav-arrow">
                    {expandedMenu === item.id ? '▼' : '▶'}
                  </span>
                )}
              </button>
              
              {item.submenu && expandedMenu === item.id && (
                <ul className="submenu">
                  {item.submenu.map((subItem) => (
                    <li key={subItem.id} className="submenu-item">
                      <button className={`submenu-button ${subItem.active ? 'active' : ''}`}>
                        <span className="submenu-indicator"></span>
                        <span className="submenu-label">{subItem.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-button">
          <span className="logout-icon">🚪</span>
          <span className="logout-label">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;