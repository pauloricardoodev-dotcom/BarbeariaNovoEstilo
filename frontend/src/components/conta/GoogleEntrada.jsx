import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { completarCadastroGoogle, entrarComGoogle } from '../../api/clientes';
import { destinoAposLogin, useSessaoCliente } from '../../sessao/sessaoCliente';
import { formatarTelefone } from '../../utils/telefone';
import Campo from './Campo';
import { Alerta } from './ContaLayout';

// Login com Google (Google Identity Services). O navegador só repassa o ID token ao nosso
// backend, que valida tudo; nome e e-mail nunca são aceitos do front.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_GOOGLE = 'https://accounts.google.com/gsi/client';

let promessaGoogle;
let inicializado = false;
// O GIS aceita um único callback por página; ele aponta para o botão que está na tela.
let aoReceberCredencial = null;

const carregarGoogle = () => {
  promessaGoogle ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const script = document.createElement('script');
    script.src = SCRIPT_GOOGLE;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => {
      promessaGoogle = undefined; // permite tentar de novo (ex.: voltou a internet)
      script.remove();
      reject(new Error('Não foi possível carregar o login do Google.'));
    };
    document.head.appendChild(script);
  });
  return promessaGoogle;
};

// O botão real do Google tem no máximo 40 px de altura e 400 de largura. Para ter o tamanho do
// botão "Entrar", desenhamos um botão nosso e deixamos o do Google invisível por cima, esticado
// (transform) para cobrir tudo: o clique cai no iframe do Google, que continua sendo quem autentica.
const ALTURA_GOOGLE = 40;
const ROTULOS = { signin_with: 'Entrar com o Google', signup_with: 'Cadastrar com o Google' };

const IconeGoogle = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

const MENSAGEM_LIMITE = 'Muitas tentativas. Aguarde um minuto e tente novamente.';

/**
 * Botão "Entrar com Google" + separador "ou". Não aparece sem VITE_GOOGLE_CLIENT_ID
 * ou se o script do Google não carregar (o login por e-mail continua disponível).
 * `onPendente(dados)`: conta nova, falta telefone + termos.
 */
export const BotaoGoogle = ({ texto = 'signin_with', voltar, onPendente, onErro }) => {
  const { definirCliente } = useSessaoCliente();
  const navigate = useNavigate();
  const areaRef = useRef(null);
  const blocoRef = useRef(null);
  const [disponivel, setDisponivel] = useState(Boolean(CLIENT_ID));
  const [enviando, setEnviando] = useState(false);

  // Sempre a versão mais recente dos handlers, sem reinicializar o Google a cada render.
  const handlerRef = useRef(null);
  useEffect(() => {
    handlerRef.current = async (credencial) => {
      onErro('');
      setEnviando(true);
      try {
        const resposta = await entrarComGoogle(credencial);
        if (resposta.status === 'autenticado') {
          definirCliente(resposta.cliente);
          navigate(destinoAposLogin(resposta.cliente, voltar), { replace: true });
        } else {
          setEnviando(false);
          onPendente(resposta);
        }
      } catch (err) {
        onErro(err.status === 429 ? MENSAGEM_LIMITE : err.message);
        setEnviando(false);
      }
    };
  });

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let ativo = true;
    let observador;
    carregarGoogle()
      .then((google) => {
        if (!ativo || !areaRef.current) return;
        if (!inicializado) {
          google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: (r) => aoReceberCredencial?.(r.credential),
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          inicializado = true;
        }
        aoReceberCredencial = (credencial) => handlerRef.current(credencial);
        const area = areaRef.current;
        const bloco = blocoRef.current;
        const largura = Math.min(400, Math.max(200, Math.round(bloco.offsetWidth)));
        area.style.width = `${largura}px`;
        area.style.height = `${ALTURA_GOOGLE}px`;
        area.style.transformOrigin = '0 0';
        // Estica o botão do Google até cobrir o nosso, inclusive quando a tela é redimensionada.
        const ajustar = () => {
          area.style.transform = `scale(${bloco.offsetWidth / largura}, ${bloco.offsetHeight / ALTURA_GOOGLE})`;
        };
        ajustar();
        observador = new ResizeObserver(ajustar);
        observador.observe(bloco);
        google.accounts.id.renderButton(area, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: texto,
          locale: 'pt-BR',
          width: largura,
        });
      })
      .catch(() => ativo && setDisponivel(false));
    return () => {
      ativo = false;
      observador?.disconnect();
      aoReceberCredencial = null;
    };
  }, [texto]);

  if (!disponivel) return null;
  return (
    <>
      <div className="conta-ou" aria-hidden="true">
        <span>ou</span>
      </div>
      <div ref={blocoRef} className={`conta-google ${enviando ? 'ocupado' : ''}`} aria-busy={enviando}>
        <span className="btn btn-google btn-block" aria-hidden="true">
          <IconeGoogle />
          {enviando ? 'Entrando…' : (ROTULOS[texto] ?? ROTULOS.signin_with)}
        </span>
        {/* Botão real do Google: invisível, por cima do nosso. */}
        <div className="conta-google-captura">
          <div ref={areaRef} />
        </div>
      </div>
    </>
  );
};

/** Primeiro acesso com Google: o Google não informa telefone, então pedimos aqui (+ termos). */
export const CompletarGoogle = ({ pendente, voltar, onExpirou, onCancelar }) => {
  const { definirCliente } = useSessaoCliente();
  const navigate = useNavigate();
  const [telefone, setTelefone] = useState('');
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroGeral('');
    const encontrados = {};
    if (telefone.replace(/\D/g, '').length < 10) encontrados.telefone = 'Informe seu celular com DDD.';
    if (!aceite) encontrados.aceite = 'É preciso aceitar os termos para criar a conta.';
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      const cliente = await completarCadastroGoogle(pendente.tokenPendente, telefone);
      definirCliente(cliente);
      navigate(destinoAposLogin(cliente, voltar), { replace: true });
    } catch (err) {
      setEnviando(false);
      if (err.status === 401) return onExpirou(err.message);
      const m = err.message.toLowerCase();
      if ((err.status === 400 || err.status === 409) && (m.includes('telefone') || m.includes('celular'))) {
        setErros({ telefone: err.message });
      } else if (err.status === 409) {
        onExpirou(err.message); // e-mail já virou conta no meio tempo: recomeçar pelo login
      } else {
        setErroGeral(err.status === 429 ? MENSAGEM_LIMITE : err.message);
      }
    }
  };

  return (
    <>
      <p className="conta-google-quem">
        Conta Google: <strong>{pendente.email}</strong>
      </p>
      <Alerta>{erroGeral}</Alerta>
      <form onSubmit={handleSubmit} noValidate>
        <Campo
          label="Celular (WhatsApp)"
          tipo="tel"
          name="tel"
          autoComplete="tel-national"
          inputMode="tel"
          placeholder="(41) 99999-0000"
          value={telefone}
          onChange={(e) => {
            setTelefone(formatarTelefone(e.target.value));
            if (erros.telefone) setErros({ ...erros, telefone: undefined });
          }}
          erro={erros.telefone}
          dica="Enviaremos um código de confirmação por WhatsApp."
          maxLength={30}
          autoFocus
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
          {enviando ? 'Criando conta…' : 'Concluir cadastro'}
        </button>
      </form>
      <p className="conta-rodape">
        <button type="button" className="conta-link conta-link-botao" onClick={onCancelar}>
          Usar outra conta
        </button>
      </p>
    </>
  );
};
