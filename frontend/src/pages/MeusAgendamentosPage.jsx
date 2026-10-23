import { useCallback, useEffect, useState } from 'react';
import {
  consultarDisponibilidade,
  listarMeusAgendamentos,
  reagendarAgendamento,
  solicitarCancelamento,
} from '../api/agendamentos';
import Campo from '../components/conta/Campo';
import ContaLayout, { Alerta } from '../components/conta/ContaLayout';
import useConfiguracoes from '../configuracao/useConfiguracoes';
import useDiasFechados from '../configuracao/useDiasFechados';
import {
  diaAgendavel,
  diaDaSemana,
  formatarDataBR,
  formatarInstante,
  janelaDeAgendamento,
  separarPeriodos,
} from '../utils/datas';

const PAGAMENTOS = { pix: 'Pix', cartao: 'Cartão', presencial: 'No salão' };
const STATUS = { agendado: 'Agendado', concluido: 'Concluído', cancelado: 'Cancelado' };

// Pagamento online: reserva esperando o pagamento ou pago (cancelamento de pago só até 24 h antes).
const rotuloStatus = (a) => (a.aguardandoPagamento ? 'Aguardando pagamento' : STATUS[a.status]);
const classeStatus = (a) => (a.aguardandoPagamento ? 'aguardando' : a.status);
const formatarPreco = (v) => 'R$ ' + v.toFixed(2).replace('.', ',');

/** Escolha do novo dia e horário. Só muda o horário; o servidor confere janela, antecedência e disponibilidade. */
const Reagendar = ({ agendamento, aoConcluir, aoVoltar }) => {
  const configuracoes = useConfiguracoes();
  const janela = janelaDeAgendamento(configuracoes.janelaDias);
  const diasFechados = useDiasFechados(janela);
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [horarios, setHorarios] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregarHorarios = async (dia) => {
    setHora('');
    setHorarios([]);
    setCarregando(true);
    try {
      const resposta = await consultarDisponibilidade({ data: dia, servicoId: agendamento.servico.id });
      setHorarios(resposta.horarios);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleData = (e) => {
    const valor = e.target.value;
    setErro('');
    setHora('');
    setHorarios([]);
    setData('');
    if (!valor) return;
    if (!diaAgendavel(valor, janela, diasFechados)) {
      const fechado = diasFechados?.get(valor);
      setErro(
        fechado
          ? `Não abrimos nesta data (${fechado.motivo}). Escolha outro dia.`
          : `Escolha um dia aberto, a partir de hoje e em até ${configuracoes.janelaDias} dias.`,
      );
      return;
    }
    setData(valor);
    carregarHorarios(valor);
  };

  const handleConfirmar = async () => {
    setErro('');
    setEnviando(true);
    try {
      await reagendarAgendamento(agendamento.id, { data, hora });
      aoConcluir('Agendamento reagendado com sucesso.');
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
      // Horário tomado por outra pessoa no meio tempo: atualiza a lista de horários livres.
      if (err.status === 409) carregarHorarios(data);
    }
  };

  const { manha, tarde } = separarPeriodos(horarios, configuracoes.manhaFim);
  const botoes = (lista) =>
    lista.map((h) => (
      <button
        key={h}
        type="button"
        className={`time-slot ${hora === h ? 'selected' : ''}`}
        onClick={() => setHora(h)}
      >
        {h}
      </button>
    ));

  return (
    <div className="agenda-reagendar">
      <h3>Escolha o novo horário</h3>
      <p className="step-sub">O serviço continua o mesmo; só o horário muda.</p>
      <Alerta>{erro}</Alerta>
      <Campo label="Nova data" tipo="date" min={janela.min} max={janela.max} value={data} onChange={handleData} />
      {carregando && <p className="agenda-aviso">Carregando horários…</p>}
      {data && !carregando && horarios.length === 0 && !erro && (
        <p className="agenda-aviso">Não há horários livres neste dia. Escolha outra data.</p>
      )}
      {manha.length > 0 && (
        <>
          <h5 className="agenda-periodo">Manhã</h5>
          <div className="time-grid agenda-horarios">{botoes(manha)}</div>
        </>
      )}
      {tarde.length > 0 && (
        <>
          <h5 className="agenda-periodo">Tarde</h5>
          <div className="time-grid agenda-horarios">{botoes(tarde)}</div>
        </>
      )}
      <div className="agenda-acoes">
        <button type="button" className="btn btn-outline" onClick={aoVoltar} disabled={enviando}>
          Voltar
        </button>
        <button type="button" className="btn btn-primary" disabled={!data || !hora || enviando} onClick={handleConfirmar}>
          {enviando ? 'Reagendando…' : 'Confirmar reagendamento'}
        </button>
      </div>
    </div>
  );
};

/** O cliente não cancela direto: pede, com motivo, e o barbeiro aprova ou recusa. */
const SolicitarCancelamento = ({ agendamento, aoConcluir, aoVoltar }) => {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleEnviar = async () => {
    setErro('');
    setEnviando(true);
    try {
      await solicitarCancelamento(agendamento.id, motivo);
      aoConcluir('Pedido de cancelamento enviado. O barbeiro vai analisar; até lá, seu horário continua reservado.');
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  };

  return (
    <div className="agenda-reagendar">
      <h3>Solicitar cancelamento</h3>
      <p className="step-sub">Conte o motivo. O horário continua reservado até o barbeiro responder.</p>
      <Alerta>{erro}</Alerta>
      <div className="field">
        <label htmlFor={`motivo-${agendamento.id}`}>Motivo *</label>
        <textarea
          id={`motivo-${agendamento.id}`}
          className="agenda-motivo"
          rows={3}
          maxLength={500}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </div>
      <div className="agenda-acoes">
        <button type="button" className="btn btn-outline" onClick={aoVoltar} disabled={enviando}>
          Voltar
        </button>
        <button type="button" className="btn btn-primary" disabled={!motivo.trim() || enviando} onClick={handleEnviar}>
          {enviando ? 'Enviando…' : 'Enviar pedido'}
        </button>
      </div>
    </div>
  );
};

const StatusDoPedido = ({ solicitacao }) => {
  if (!solicitacao) return null;
  if (solicitacao.status === 'pendente') {
    return <p className="agenda-pedido">Cancelamento solicitado — aguardando resposta do barbeiro.</p>;
  }
  const decisao = solicitacao.status === 'recusada' ? 'recusado' : 'aprovado';
  return (
    <p className="agenda-pedido">
      Seu pedido de cancelamento foi {decisao}
      {solicitacao.resposta ? `: ${solicitacao.resposta}` : '.'}
    </p>
  );
};

const MeusAgendamentosPage = () => {
  const [agendamentos, setAgendamentos] = useState(null); // null = carregando
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [acao, setAcao] = useState(null); // { tipo: 'reagendar' | 'cancelar', id }
  // "Agora" só para escolher a mensagem; quem decide o que pode é o servidor (podeReagendar etc.).
  const [agora, setAgora] = useState(() => Date.now());

  const carregar = useCallback(async () => {
    try {
      const lista = await listarMeusAgendamentos();
      setAgendamentos(lista);
      setAgora(Date.now());
      setErro('');
    } catch (err) {
      setErro(err.message);
      setAgendamentos((atual) => atual ?? []);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    listarMeusAgendamentos()
      .then((lista) => !cancelado && setAgendamentos(lista))
      .catch((err) => {
        if (cancelado) return;
        setErro(err.message);
        setAgendamentos([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const concluirAcao = async (mensagem) => {
    setAcao(null);
    setSucesso(mensagem);
    await carregar();
  };

  return (
    <ContaLayout titulo="Meus agendamentos" subtitulo="Acompanhe seus horários e reagende quando precisar." largo>
      <Alerta tipo="sucesso">{sucesso}</Alerta>
      <Alerta>{erro}</Alerta>
      {agendamentos === null && <p className="conta-sub">Carregando…</p>}
      {agendamentos?.length === 0 && !erro && <p className="conta-sub">Você ainda não tem agendamentos.</p>}
      <ul className="agenda-lista">
        {(agendamentos ?? []).map((a) => {
          const passou = new Date(a.inicio).getTime() <= agora;
          const motivoBloqueio = passou
            ? 'Atendimento que já passou não pode ser reagendado.'
            : a.status !== 'agendado'
              ? 'Só agendamentos ativos podem ser reagendados.'
              : 'Reagendamento só até 2 horas antes do horário.';
          const emAcao = acao?.id === a.id ? acao.tipo : null;
          return (
            <li key={a.id} className="agenda-item">
              <div className="agenda-topo">
                <b>{a.servico.nome}</b>
                <span className={`agenda-status agenda-status-${classeStatus(a)}`}>{rotuloStatus(a)}</span>
              </div>
              <dl className="agenda-dados">
                <div>
                  <dt>Dia</dt>
                  <dd>
                    {diaDaSemana(a.data)} · {formatarDataBR(a.data)} às {a.hora} · {a.duracaoMinutos} min
                  </dd>
                </div>
                <div>
                  <dt>Pagamento</dt>
                  <dd>
                    {PAGAMENTOS[a.pagamento]} · {formatarPreco(a.preco)}
                  </dd>
                </div>
              </dl>
              {a.aguardandoPagamento && (
                <p className="agenda-pedido">
                  Este horário está reservado aguardando o pagamento. Se não for pago em poucos minutos, ele é liberado
                  automaticamente; faça um novo agendamento para pagar.
                </p>
              )}
              {a.pago && a.status === 'agendado' && (
                <p className="agenda-pago">
                  Pago online. O cancelamento com devolução do valor é possível até 24 horas antes do horário.
                </p>
              )}
              <StatusDoPedido solicitacao={a.solicitacaoCancelamento} />
              {emAcao === 'reagendar' && (
                <Reagendar agendamento={a} aoConcluir={concluirAcao} aoVoltar={() => setAcao(null)} />
              )}
              {emAcao === 'cancelar' && (
                <SolicitarCancelamento agendamento={a} aoConcluir={concluirAcao} aoVoltar={() => setAcao(null)} />
              )}
              {!emAcao && (
                <div className="agenda-acoes">
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={!a.podeReagendar}
                    onClick={() => {
                      setSucesso('');
                      setAcao({ tipo: 'reagendar', id: a.id });
                    }}
                  >
                    Reagendar
                  </button>
                  {a.status === 'agendado' && !passou && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={!a.podeSolicitarCancelamento}
                      onClick={() => {
                        setSucesso('');
                        setAcao({ tipo: 'cancelar', id: a.id });
                      }}
                    >
                      Solicitar cancelamento
                    </button>
                  )}
                  {!a.podeReagendar && !a.aguardandoPagamento && <small className="agenda-aviso">{motivoBloqueio}</small>}
                </div>
              )}
              <small className="agenda-criado">Agendado em {formatarInstante(a.criadoEm)}</small>
            </li>
          );
        })}
      </ul>
    </ContaLayout>
  );
};

export default MeusAgendamentosPage;
