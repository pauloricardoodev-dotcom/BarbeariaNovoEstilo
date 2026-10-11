/** Moldura das telas de conta: fundo escuro, cartão creme centralizado (mesmo visual do agendamento). */
const ContaLayout = ({ titulo, subtitulo, largo = false, children }) => (
  <section className="conta-page">
    <title>{`${titulo} — Barbearia Novo Estilo`}</title>
    <div className="container">
      <div className={`conta-card ${largo ? 'conta-card-largo' : ''}`}>
        <h1>{titulo}</h1>
        {subtitulo && <p className="conta-sub">{subtitulo}</p>}
        {children}
      </div>
    </div>
  </section>
);

/** Mensagem de erro/sucesso no topo de um formulário. */
export const Alerta = ({ tipo = 'erro', children }) =>
  children ? (
    <div className={`conta-alerta conta-alerta-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      {children}
    </div>
  ) : null;

export default ContaLayout;
