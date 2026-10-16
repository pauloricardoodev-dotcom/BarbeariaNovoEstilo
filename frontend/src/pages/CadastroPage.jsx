import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useOutletContext, useSearchParams } from 'react-router';
import { cadastrar } from '../api/clientes';
import Campo, { CampoSenha } from '../components/conta/Campo';
import { Alerta } from '../components/conta/ContaLayout';
import { BotaoGoogle, CompletarGoogle } from '../components/conta/GoogleEntrada';
import { IconeCadeado, IconeEmail, IconePessoa, IconeTelefone } from '../components/conta/icones';
import { destinoAposLogin, destinoSeguro, useSessaoCliente } from '../sessao/sessaoCliente';
import { formatarTelefone } from '../utils/telefone';

const VAZIO = { nome: '', email: '', telefone: '', senha: '', confirmacao: '' };

/** Validação rápida no navegador; a validação de verdade (inclusive do telefone) é do backend. */
const validar = (d, aceite) => {
  const erros = {};
  if (d.nome.trim().length < 2) erros.nome = 'Informe seu nome.';
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) erros.email = 'Informe um e-mail válido.';
  if (d.telefone.replace(/\D/g, '').length < 10) erros.telefone = 'Informe seu celular com DDD.';
  if (d.senha.length < 8) erros.senha = 'A senha deve ter pelo menos 8 caracteres.';
  else if (d.senha.length > 128) erros.senha = 'A senha deve ter no máximo 128 caracteres.';
  if (d.confirmacao !== d.senha) erros.confirmacao = 'As senhas não conferem.';
  if (!aceite) erros.aceite = 'É preciso aceitar os termos para criar a conta.';
  return erros;
};

/** Leva a mensagem do backend para o campo a que ela se refere. */
const campoDoErro = (mensagem) => {
  const m = mensagem.toLowerCase();
  if (m.includes('e-mail')) return 'email';
  if (m.includes('telefone') || m.includes('celular')) return 'telefone';
  if (m.includes('nome')) return 'nome';
  if (m.includes('senha')) return 'senha';
  if (m.includes('termos')) return 'aceite';
  return null;
};

const CadastroPage = () => {
  const { status, cliente, definirCliente } = useSessaoCliente();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const voltar = destinoSeguro(params.get('voltar'));

  const [dados, setDados] = useState(VAZIO);
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pendente, setPendente] = useState(null);
  const { definirCentral } = useOutletContext();

  // Etapa "Quase lá": o AuthShell escurece a imagem e centraliza o cartão.
  useEffect(() => {
    definirCentral(Boolean(pendente));
    return () => definirCentral(false);
  }, [pendente, definirCentral]);

  if (status === 'logado') return <Navigate to={destinoAposLogin(cliente, voltar)} replace />;

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
            setErroGeral(mensagem);
          }}
          onCancelar={() => setPendente(null)}
        />
      </>
    );
  }

  const alterar = (campo) => (e) => {
    const valor = campo === 'telefone' ? formatarTelefone(e.target.value) : e.target.value;
    setDados({ ...dados, [campo]: valor });
    if (erros[campo]) setErros({ ...erros, [campo]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroGeral('');
    const encontrados = validar(dados, aceite);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      const novo = await cadastrar({
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        senha: dados.senha,
        aceiteTermos: true,
      });
      definirCliente(novo);
      navigate(destinoAposLogin(novo, voltar), { replace: true });
    } catch (err) {
      const campo = err.status === 400 || err.status === 409 ? campoDoErro(err.message) : null;
      if (campo) setErros({ [campo]: err.message });
      else setErroGeral(err.status === 429 ? 'Muitas tentativas. Aguarde um minuto e tente novamente.' : err.message);
      setEnviando(false);
    }
  };

  const sufixo = params.get('voltar') ? `?voltar=${encodeURIComponent(voltar)}` : '';

  return (
    <>
      <title>Criar conta — Barbearia Novo Estilo</title>
      <p className="auth-eyebrow">Primeiro acesso</p>
      <h1>Crie sua conta</h1>
      <p className="conta-sub">Seus dados ficam salvos para os próximos agendamentos.</p>
      <Alerta>{erroGeral}</Alerta>
      <form onSubmit={handleSubmit} method="post" action="/cadastro" noValidate>
        <Campo
          label="Nome completo"
          icone={<IconePessoa />}
          name="name"
          autoComplete="name"
          value={dados.nome}
          onChange={alterar('nome')}
          erro={erros.nome}
          maxLength={120}
          autoFocus
        />
        <Campo
          label="E-mail"
          icone={<IconeEmail />}
          tipo="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={dados.email}
          onChange={alterar('email')}
          erro={erros.email}
          maxLength={254}
        />
        <Campo
          label="Celular (WhatsApp)"
          icone={<IconeTelefone />}
          tipo="tel"
          name="tel"
          autoComplete="tel-national"
          inputMode="tel"
          placeholder="(41) 99999-0000"
          value={dados.telefone}
          onChange={alterar('telefone')}
          erro={erros.telefone}
          dica="Enviaremos um código de confirmação por WhatsApp."
          maxLength={30}
        />
        <CampoSenha
          label="Senha"
          icone={<IconeCadeado />}
          name="new-password"
          autoComplete="new-password"
          value={dados.senha}
          onChange={alterar('senha')}
          erro={erros.senha}
          dica="Mínimo de 8 caracteres."
          maxLength={128}
        />
        <CampoSenha
          label="Confirme a senha"
          icone={<IconeCadeado />}
          name="confirm-password"
          autoComplete="new-password"
          value={dados.confirmacao}
          onChange={alterar('confirmacao')}
          erro={erros.confirmacao}
          maxLength={128}
        />
        <div className={`conta-check ${erros.aceite ? 'invalid' : ''}`}>
          <label>
            <input
              type="checkbox"
              checked={aceite}
              onChange={(e) => {
                setAceite(e.target.checked);
                if (erros.aceite) setErros({ ...erros, aceite: undefined });
              }}
            />
            <span>
              Li e aceito os{' '}
              <Link to="/termos" target="_blank" className="conta-link">
                termos de uso
              </Link>{' '}
              e a{' '}
              <Link to="/privacidade" target="_blank" className="conta-link">
                política de privacidade
              </Link>
              .
            </span>
          </label>
          {erros.aceite && <span className="err">{erros.aceite}</span>}
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>
      <BotaoGoogle texto="signup_with" voltar={voltar} onPendente={setPendente} onErro={setErroGeral} />
      <p className="conta-rodape">
        Já tem conta?{' '}
        <Link to={`/entrar${sufixo}`} className="conta-link">
          Entrar
        </Link>
      </p>
    </>
  );
};

export default CadastroPage;
