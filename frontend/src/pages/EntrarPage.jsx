import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useOutletContext, useSearchParams } from 'react-router';
import { entrar } from '../api/clientes';
import Campo, { CampoSenha } from '../components/conta/Campo';
import { Alerta } from '../components/conta/ContaLayout';
import { BotaoGoogle, CompletarGoogle } from '../components/conta/GoogleEntrada';
import { IconeCadeado, IconeEmail } from '../components/conta/icones';
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
  const [pendente, setPendente] = useState(null);
  const { definirCentral } = useOutletContext();

  // Etapa "Quase lá": o AuthShell escurece a imagem e centraliza o cartão.
  useEffect(() => {
    definirCentral(Boolean(pendente));
    return () => definirCentral(false);
  }, [pendente, definirCentral]);

  // Quem já está logado não precisa ver o login.
  if (status === 'logado') {
    return <Navigate to={destinoAposLogin(cliente, voltar)} replace />;
  }

  // Conta Google nova: o Google não dá telefone, então a segunda etapa é aqui (token só em memória).
  if (pendente) {
    return (
      <>
        <title>Quase lá — Barbearia Novo Estilo</title>
        <p className="auth-eyebrow">Primeiro acesso</p>
        <h1>Quase lá</h1>
        <p className="conta-sub">{`Olá, ${pendente.nome.split(' ')[0]}! Falta só o seu celular para concluir o cadastro.`}</p>
        <CompletarGoogle
          pendente={pendente}
          voltar={voltar}
          onExpirou={(mensagem) => {
            setPendente(null);
            setErro(mensagem);
          }}
          onCancelar={() => setPendente(null)}
        />
      </>
    );
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
    <>
      <title>Entrar — Barbearia Novo Estilo</title>
      <p className="auth-eyebrow">Bem-vindo de volta</p>
      <h1>Faça seu login</h1>
      <p className="conta-sub">Acesse sua conta para agendar e acompanhar seus horários.</p>
      <Alerta>{erro}</Alerta>
      {/* method/action e name nos campos ajudam o navegador a oferecer salvar a senha */}
      <form onSubmit={handleSubmit} method="post" action="/entrar" noValidate>
        <Campo
          label="E-mail"
          icone={<IconeEmail />}
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
          icone={<IconeCadeado />}
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
      <BotaoGoogle texto="signin_with" voltar={voltar} onPendente={setPendente} onErro={setErro} />
      <p className="conta-rodape">
        Ainda não tem conta?{' '}
        <Link to={`/cadastro${sufixo}`} className="conta-link">
          Criar conta
        </Link>
      </p>
    </>
  );
};

export default EntrarPage;
