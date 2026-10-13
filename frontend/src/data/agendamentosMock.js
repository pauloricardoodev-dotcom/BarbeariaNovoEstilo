// MOCK até a Fase 5 (backend de agendamentos). Datas relativas a hoje para a tela sempre ter exemplos.
// Formato: inicio = 'YYYY-MM-DDTHH:mm' (horário local), criadoEm = ISO local.
const pad = (n) => String(n).padStart(2, '0');

const emDias = (dias, hora) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1); // domingo fechado
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${hora}`;
};

export const criarAgendamentosMock = () => [
  { id: 'ag-3', servico: 'Corte Masculino', duracao: 45, preco: 50, pagamento: 'pix', inicio: emDias(3, '10:00'), criadoEm: emDias(-1, '19:42'), status: 'agendado' },
  { id: 'ag-2', servico: 'Barba', duracao: 30, preco: 30, pagamento: 'presencial', inicio: emDias(10, '15:30'), criadoEm: emDias(-1, '19:45'), status: 'agendado' },
  { id: 'ag-1', servico: 'Corte Masculino', duracao: 45, preco: 50, pagamento: 'cartao', inicio: emDias(-14, '09:30'), criadoEm: emDias(-20, '14:10'), status: 'concluido' },
];
