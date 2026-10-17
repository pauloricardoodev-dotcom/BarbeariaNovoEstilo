import { Link } from 'react-router';

/** O que ainda falta na conta para poder agendar (vazio = nada pendente). */
const pendenciasConta = (cliente) =>
  [
    !cliente?.emailVerificado && { campo: 'E-mail', texto: 'não confirmado' },
    !cliente?.telefoneVerificado && { campo: 'Celular (WhatsApp)', texto: 'não confirmado' },
  ].filter(Boolean);

/**
 * Aviso vermelho com a lista do que falta e o caminho para resolver.
 * Some sozinho quando a conta está completa.
 */
const AvisoPendencias = ({ cliente, destino = '/minha-conta', textoBotao = 'Ir para Minha conta', className = '' }) => {
  const pendencias = pendenciasConta(cliente);
  if (pendencias.length === 0) return null;
  return (
    <div className={`conta-alerta conta-alerta-erro aviso-pendencias ${className}`} role="alert">
      <strong className="aviso-pendencias-titulo">Complete sua conta para poder agendar</strong>
      <p>Falta confirmar:</p>
      <ul>
        {pendencias.map(({ campo, texto }) => (
          <li key={campo}>
            <b>{campo}</b> — {texto}
          </li>
        ))}
      </ul>
      <Link to={destino} className="btn btn-primary aviso-pendencias-btn">
        {textoBotao}
      </Link>
    </div>
  );
};

export default AvisoPendencias;
