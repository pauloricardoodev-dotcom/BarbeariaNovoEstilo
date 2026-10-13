// Selo da forma de pagamento escolhida no agendamento: Pix (azul), crédito (roxo) e dinheiro (verde).
// "presencial" é o pagamento no salão, mostrado como dinheiro.
const PAGAMENTOS = {
  pix: { rotulo: 'Pix', classe: 'badge-pgto-pix' },
  cartao: { rotulo: 'Crédito', classe: 'badge-pgto-credito' },
  presencial: { rotulo: 'Dinheiro', classe: 'badge-pgto-dinheiro' },
};

const PagamentoBadge = ({ pagamento }) => {
  const info = PAGAMENTOS[pagamento];
  if (!info) return null;
  return <span className={`badge rounded-pill ${info.classe}`}>{info.rotulo}</span>;
};

export default PagamentoBadge;
