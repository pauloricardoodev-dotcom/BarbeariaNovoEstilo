import { useState } from 'react';
import Campo from '../components/conta/Campo';
import ContaLayout, { Alerta } from '../components/conta/ContaLayout';
import { criarAgendamentosMock } from '../data/agendamentosMock';
import { TIMES_MANHA, TIMES_TARDE, WEEKDAYS } from '../data/constants';

const PAGAMENTOS = { pix: 'Pix', cartao: 'Cartão', presencial: 'No salão' };
const STATUS = { agendado: 'Agendado', concluido: 'Concluído', cancelado: 'Cancelado' };
const HORARIOS = [...TIMES_MANHA, ...TIMES_TARDE];
const ANTECEDENCIA_MIN_MS = 2 * 60 * 60 * 1000; // reagendar só até 2 h antes

const pad = (n) => String(n).padStart(2, '0');
const paraData = (iso) => new Date(iso);
const chaveData = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatarDia = (d) =>
  `${WEEKDAYS[d.getDay()]} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const formatarHora = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const formatarPreco = (v) => 'R$ ' + v.toFixed(2).replace('.', ',');

// Janela de reagendamento: a partir de amanhã até 3 meses à frente.
const limitesJanela = () => {
  const min = new Date();
  min.setDate(min.getDate() + 1);
  const max = new Date();
  max.setMonth(max.getMonth() + 3);
  return { min: chaveData(min), max: chaveData(max) };
};

// Data de reagendamento válida: de amanhã a 3 meses, sem domingo (nunca hoje nem passado).
const dataPermitida = (chave) => {
  const { min, max } = limitesJanela();
  return chave >= min && chave <= max && new Date(`${chave}T00:00`).getDay() !== 0;
};

const Reagendar = ({ aoConfirmar, aoCancelar }) => {
  const { min, max } = limitesJanela();
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [erro, setErro] = useState('');

  const handleData = (e) => {
    const valor = e.target.value;
    setHora('');
    if (valor && !dataPermitida(valor)) {
      setData('');
      setErro('Escolha um dia de segunda a sábado, a partir de amanhã e em até 3 meses.');
      return;
    }
    setErro('');
    setData(valor);
  };

  return (
    <div className="agenda-reagendar">
      <h3>Escolha o novo horário</h3>
      <p className="step-sub">O serviço continua o mesmo; só o horário muda.</p>
      <Alerta>{erro}</Alerta>
      <Campo label="Nova data" tipo="date" min={min} max={max} value={data} onChange={handleData} />
      {data && (
        <div className="time-grid agenda-horarios">
          {HORARIOS.map((h) => (
            <button
              key={h}
              type="button"
              className={`time-slot ${hora === h ? 'selected' : ''}`}
              onClick={() => setHora(h)}
            >
              {h}
            </button>
          ))}
        </div>
      )}
      <div className="agenda-acoes">
        <button type="button" className="btn btn-outline" onClick={aoCancelar}>
          Voltar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!data || !hora}
          onClick={() => aoConfirmar(`${data}T${hora}`)}
        >
          Confirmar reagendamento
        </button>
      </div>
    </div>
  );
};

const MeusAgendamentosPage = () => {
  const [agendamentos, setAgendamentos] = useState(criarAgendamentosMock);
  const [reagendando, setReagendando] = useState(null);
  const [sucesso, setSucesso] = useState('');

  // Referência de "agora" fixada na montagem (render puro); suficiente para a regra das 2 h.
  const [agora] = useState(() => Date.now());
  const ordenados =[...agendamentos].sort((a, b) => b.inicio.localeCompare(a.inicio));

  const handleReagendar = (id, novoInicio) => {
    // Retroativo nunca: o atendimento já passou ou a nova data não é de amanhã em diante.
    const alvo = agendamentos.find((a) => a.id === id);
    if (!alvo || paraData(alvo.inicio).getTime() <= agora || !dataPermitida(novoInicio.slice(0, 10))) return;
    setAgendamentos((lista) => lista.map((a) => (a.id === id ? { ...a, inicio: novoInicio } : a)));
    setReagendando(null);
    setSucesso('Agendamento reagendado com sucesso.');
  };

  return (
    <ContaLayout titulo="Meus agendamentos" subtitulo="Acompanhe seus horários e reagende quando precisar." largo>
      <Alerta tipo="sucesso">{sucesso}</Alerta>
      {ordenados.length === 0 && <p className="conta-sub">Você ainda não tem agendamentos.</p>}
      <ul className="agenda-lista">
        {ordenados.map((a) => {
          const inicio = paraData(a.inicio);
          const criado = paraData(a.criadoEm);
          const retroativo = inicio.getTime() <= agora;
          const podeReagendar = a.status === 'agendado' && !retroativo && inicio.getTime() - agora >= ANTECEDENCIA_MIN_MS;
          const motivoBloqueio = retroativo
            ? 'Atendimento que já passou não pode ser reagendado.'
            : a.status !== 'agendado'
              ? 'Só agendamentos ativos podem ser reagendados.'
              : 'Reagendamento só até 2 horas antes do horário.';
          return (
            <li key={a.id} className="agenda-item">
              <div className="agenda-topo">
                <b>{a.servico}</b>
                <span className={`agenda-status agenda-status-${a.status}`}>{STATUS[a.status]}</span>
              </div>
              <dl className="agenda-dados">
                <div>
                  <dt>Dia</dt>
                  <dd>{formatarDia(inicio)} às {formatarHora(inicio)}</dd>
                </div>
                <div>
                  <dt>Pagamento</dt>
                  <dd>{PAGAMENTOS[a.pagamento]} · {formatarPreco(a.preco)}</dd>
                </div>
              </dl>
              {reagendando === a.id ? (
                <Reagendar
                  aoConfirmar={(novo) => handleReagendar(a.id, novo)}
                  aoCancelar={() => setReagendando(null)}
                />
              ) : (
                (
                  <div className="agenda-acoes">
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={!podeReagendar}
                      onClick={() => {
                        setSucesso('');
                        setReagendando(a.id);
                      }}
                    >
                      Reagendar
                    </button>
                    {!podeReagendar && (
                      <small className="agenda-aviso">{motivoBloqueio}</small>
                    )}
                  </div>
                )
              )}
              <small className="agenda-criado">
                Agendado em {pad(criado.getDate())}/{pad(criado.getMonth() + 1)}/{criado.getFullYear()} às {formatarHora(criado)}
              </small>
            </li>
          );
        })}
      </ul>
    </ContaLayout>
  );
};

export default MeusAgendamentosPage;
