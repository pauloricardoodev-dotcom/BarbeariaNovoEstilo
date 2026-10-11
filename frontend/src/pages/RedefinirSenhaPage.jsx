import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { redefinirSenha } from '../api/clientes';
import { CampoSenha } from '../components/conta/Campo';
import ContaLayout, { Alerta } from '../components/conta/ContaLayout';
import { useSessaoCliente } from '../sessao/sessaoCliente';

/**
 * O link do e-mail traz o token no fragmento (#token=…), que não vai para o servidor.
 * Lemos uma vez e limpamos a barra de endereço, para o token não ficar no histórico.
 */
const lerToken = () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';

const RedefinirSenhaPage = () => {
  const { definirCliente } = useSessaoCliente();
  const [token] = useState(lerToken);

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  if (!token && !concluido) {
    return (
      <ContaLayout titulo="Link inválido" subtitulo="Este link de redefinição está incompleto ou já foi usado.">
        <Link to="/esqueci-senha" className="btn btn-primary btn-block">
          Pedir um novo link
        </Link>
      </ContaLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    if (senha.length < 8) return setErro('A senha deve ter pelo menos 8 caracteres.');
    if (senha.length > 128) return setErro('A senha deve ter no máximo 128 caracteres.');
    if (senha !== confirmacao) return setErro('As senhas não conferem.');
    setEnviando(true);
    try {
      await redefinirSenha(token, senha);
      // A redefinição derruba todas as sessões, inclusive uma aberta neste navegador.
      definirCliente(null);
      setConcluido(true);
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  };

  if (concluido) {
    return (
      <ContaLayout titulo="Senha alterada" subtitulo="Pronto! Entre com sua nova senha.">
        <Link to="/entrar" className="btn btn-primary btn-block">
          Entrar
        </Link>
      </ContaLayout>
    );
  }

  return (
    <ContaLayout titulo="Nova senha" subtitulo="Escolha uma nova senha para sua conta.">
      <Alerta>{erro}</Alerta>
      <form onSubmit={handleSubmit} noValidate>
        <CampoSenha
          label="Nova senha"
          name="new-password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          dica="Mínimo de 8 caracteres."
          maxLength={128}
          autoFocus
        />
        <CampoSenha
          label="Confirme a nova senha"
          name="confirm-password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          maxLength={128}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
      {erro.includes('expirado') && (
        <p className="conta-rodape">
          <Link to="/esqueci-senha" className="conta-link">
            Pedir um novo link
          </Link>
        </p>
      )}
    </ContaLayout>
  );
};

export default RedefinirSenhaPage;
