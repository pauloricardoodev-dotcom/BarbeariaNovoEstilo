import { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/admin.css';
import AdminPanel from './AdminPanel';
import LoginPage from './components/LoginPage';
import { getCurrentUser, logout } from './api/auth';

// Portão do admin: só renderiza o painel com sessão válida no backend.
// A proteção real é do servidor (toda rota da API exige o cookie de sessão);
// aqui só decidimos qual tela mostrar.
const AdminDashboard = () => {
  const [status, setStatus] = useState('loading'); // loading | anonymous | authenticated | error
  const [user, setUser] = useState(null);

  const handleSession = (currentUser) => {
    setUser(currentUser);
    setStatus(currentUser ? 'authenticated' : 'anonymous');
  };

  const handleSessionError = () => setStatus('error');

  useEffect(() => {
    getCurrentUser().then(handleSession, handleSessionError);
  }, []);

  const handleRetry = () => {
    setStatus('loading');
    getCurrentUser().then(handleSession, handleSessionError);
  };

  const handleLogin = (loggedUser) => {
    setUser(loggedUser);
    setStatus('authenticated');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  };

  let content;
  if (status === 'loading') {
    content = (
      <div className="login-page d-flex align-items-center justify-content-center">
        <div className="spinner-border text-secondary" role="status">
          <span className="visually-hidden">Carregando…</span>
        </div>
      </div>
    );
  } else if (status === 'error') {
    content = (
      <div className="login-page d-flex flex-column align-items-center justify-content-center gap-3 p-3 text-center">
        <p className="mb-0">Não foi possível conectar ao servidor.</p>
        <button type="button" className="btn btn-outline-secondary" onClick={handleRetry}>
          Tentar novamente
        </button>
      </div>
    );
  } else if (status === 'anonymous') {
    content = <LoginPage onLogin={handleLogin} />;
  } else {
    content = <AdminPanel user={user} onLogout={handleLogout} />;
  }

  return (
    <>
      <title>Admin - Barbearia Novo Estilo</title>
      {content}
    </>
  );
};

export default AdminDashboard;
