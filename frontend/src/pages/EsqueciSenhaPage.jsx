import { useState } from 'react';
import { Link } from 'react-router';
import { esqueciSenha } from '../api/clientes';
import Campo from '../components/conta/Campo';
import ContaLayout, { Alerta } from '../components/conta/ContaLayout';

const EsqueciSenhaPage = () => {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      // A resposta é a mesma exista ou não a conta (não revelamos quem é cliente).
      const resposta = await esqueciSenha(email);
      setMensagem(resposta.mensagem);
    } catch (err) {
      setErro(err.status === 429 ? 'Muitas tentativas. Aguarde um minuto e tente novamente.' : err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ContaLayout
      titulo="Esqueci minha senha"
      subtitulo="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
    >
      {mensagem ? (
        <>
          <Alerta tipo="sucesso">{mensagem}</Alerta>
          <p className="conta-sub">O link vale por 30 minutos. Confira também a caixa de spam.</p>
        </>
      ) : (
        <>
          <Alerta>{erro}</Alerta>
          <form onSubmit={handleSubmit} noValidate>
            <Campo
              label="E-mail"
              tipo="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-block" disabled={enviando || !email}>
              {enviando ? 'Enviando…' : 'Enviar link'}
            </button>
          </form>
        </>
      )}
      <p className="conta-rodape">
        <Link to="/entrar" className="conta-link">
          Voltar para o login
        </Link>
      </p>
    </ContaLayout>
  );
};

export default EsqueciSenhaPage;
