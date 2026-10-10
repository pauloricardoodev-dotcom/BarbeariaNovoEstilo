import { useState } from 'react';
import { login } from '../api/auth';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, senha);
      onLogin(user);
    } catch (err) {
      setError(
        err.status === 429
          ? 'Muitas tentativas. Aguarde um minuto e tente novamente.'
          : err.message,
      );
      setSenha('');
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page d-flex align-items-center justify-content-center p-3">
      <div className="card login-card w-100">
        <div className="card-body p-4 p-sm-5">
          <div className="d-flex align-items-center gap-2 mb-4">
            <div className="logo-icon text-white">✂</div>
            <div>
              <div className="logo-name">Barbearia Novo Estilo</div>
              <div className="logo-subtitle text-secondary">PAINEL ADMINISTRATIVO</div>
            </div>
          </div>

          <h1 className="page-title mb-1">Entrar</h1>
          <p className="text-secondary mb-4">Acesso restrito à administração.</p>

          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label">E-mail</label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label htmlFor="login-senha" className="form-label">Senha</label>
              <input
                id="login-senha"
                type="password"
                className="form-control"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={submitting || !email || !senha}
            >
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
