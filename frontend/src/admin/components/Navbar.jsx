const Navbar = ({ onMenuToggle }) => {
  return (
    <header className="admin-navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div className="navbar-right">
        <div className="notification-icon">
          <span className="notification-badge">3</span>
          🔔
        </div>
        
        <div className="user-menu">
          <div className="user-avatar">A</div>
          <div className="user-info">
            <span className="user-name">Administrador</span>
            <span className="user-dropdown">▼</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;