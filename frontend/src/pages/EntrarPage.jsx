import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { entrar } from '../api/clientes';
import Campo, { CampoSenha } from '../components/conta/Campo';
import ContaLayout, { Alerta } from '../components/conta/ContaLayout';
import { destinoAposLogin, destinoSeguro, useSessaoCliente } from '../sessao/sessaoCliente';

const EntrarPage = () => {
  const { status, cliente, definirCliente } = useSessaoCliente();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const voltar = destinoSeguro(params.get('voltar'));

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Quem já está logado não precisa ver o login.
  if (status === 'logado') {
    return <Navigate to={destinoAposLogin(cliente, voltar)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const logado = await entrar(email, senha);
      definirCliente(logado);
      navigate(destinoAposLogin(logado, voltar), { replace: true });
    } catch (err) {
      setErro(
        err.status === 429 ? 'Muitas tentativas. Aguarde um minuto e tente novamente.' : err.message,
      );
      setSenha('');
      setEnviando(false);
    }
  };

  const sufixo = params.get('voltar') ? `?voltar=${encodeURIComponent(voltar)}` : '';

  return (
    <ContaLayout titulo="Entrar" subtitulo="Acesse sua conta para agendar e acompanhar seus horários.">
      <Alerta>{erro}</Alerta>
      {/* method/action e name nos campos ajudam o navegador a oferecer salvar a senha */}
      <form onSubmit={handleSubmit} method="post" action="/entrar" noValidate>
        <Campo
          label="E-mail"
          tipo="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <CampoSenha
          label="Senha"
          name="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        <div className="conta-linha-direita">
          <Link to="/esqueci-senha" className="conta-link">
            Esqueci minha senha
          </Link>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={enviando || !email || !senha}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="conta-rodape">
        Ainda não tem conta?{' '}
        <Link to={`/cadastro${sufixo}`} className="conta-link">
          Criar conta
        </Link>
      </p>
    </ContaLayout>
  );
};

export default EntrarPage;
