import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { WEEKDAYS, MONTHS, STEP_LABELS } from '../data/constants';
import { consultarDisponibilidade, criarAgendamento } from '../api/agendamentos';
import { diaAgendavel, janelaDeAgendamento, separarPeriodos } from '../utils/datas';
import ConfirmDialog from './ConfirmDialog';
import PixCodigo, { PixQr } from './PixCodigo';
import { gerarPayloadPix } from '../utils/pix';
import { contaVerificada, useSessaoCliente } from '../sessao/sessaoCliente';
import { exibirTelefone } from '../utils/telefone';
import useConfiguracoes from '../configuracao/useConfiguracoes';
import useDiasFechados from '../configuracao/useDiasFechados';
import {
  formatarCvv,
  formatarNomeCartao,
  formatarNumeroCartao,
  formatarValidade,
  validarCartao,
} from '../utils/cartao';

const CARTAO_VAZIO = { numero: '', nome: '', validade: '', cvv: '' };
const MASCARAS_CARTAO = {
  numero: formatarNumeroCartao,
  nome: formatarNomeCartao,
  validade: formatarValidade,
  cvv: formatarCvv,
};

// Passos: 1 Serviço · 2 Data e horário · 3 Pagamento · 4 Confirmação.
// Os dados do cliente vêm do perfil (login obrigatório), sem etapa de identificação.
const Booking = ({ servicos, preSelectedService }) => {
  const { cliente } = useSessaoCliente();
  const configuracoes = useConfiguracoes();
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  // Agenda-se a partir de hoje (com a antecedência mínima) e em até `janelaDias` (Configurações do painel);
  // o servidor confere a mesma regra.
  const janela = janelaDeAgendamento(configuracoes.janelaDias);
  // Domingos, feriados e dias fechados pelo dono (null enquanto carrega): o calendário os mostra em preto.
  const diasFechados = useDiasFechados(janela);
  const mesInicial = () => {
    const [y, m] = janela.min.split('-').map(Number);
    return { y, m: m - 1 };
  };
  const [viewMonth, setViewMonth] = useState(mesInicial);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  // Horários livres do dia escolhido, vindos de GET /api/disponibilidade.
  const [horarios, setHorarios] = useState([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [erroHorarios, setErroHorarios] = useState('');
  const consultaAtual = useRef(0);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');
  const [payMethod, setPayMethod] = useState('pix');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [avisoVerificacao, setAvisoVerificacao] = useState(false);
  const [cartao, setCartao] = useState(CARTAO_VAZIO);
  const [erroCartao, setErroCartao] = useState('');
  // Pergunta sobre salvar o cartão: null | 'salvar' | 'confirmarSemSalvar'
  const [dialogoCartao, setDialogoCartao] = useState(null);

  // Handle pre-selected service from other components
  useEffect(() => {
    if (preSelectedService) {
      const foundService = servicos.find(s => s.id === preSelectedService);
      if (foundService) {
        setService(foundService);
      }
    }
  }, [preSelectedService, servicos]);

  const formatPrice = (price) => {
    return 'R$ ' + price.toFixed(2).replace('.', ',');
  };

  // Busca os horários livres (descartando respostas de consultas antigas, se o cliente clicar rápido).
  const carregarHorarios = async (data, servico) => {
    const consulta = ++consultaAtual.current;
    setHorarios([]);
    setErroHorarios('');
    setCarregandoHorarios(true);
    try {
      const resposta = await consultarDisponibilidade({ data, servicoId: servico.id });
      if (consulta === consultaAtual.current) setHorarios(resposta.horarios);
    } catch (err) {
      if (consulta === consultaAtual.current) setErroHorarios(err.message);
    } finally {
      if (consulta === consultaAtual.current) setCarregandoHorarios(false);
    }
  };

  const escolherData = (data) => {
    setSelectedDate(data);
    setSelectedTime(null);
    setErroEnvio('');
    carregarHorarios(data, service);
  };

  // A disponibilidade depende da duração do serviço: trocar de serviço zera data e horário.
  const escolherServico = (s) => {
    if (service && service.id !== s.id) {
      consultaAtual.current++;
      setSelectedDate(null);
      setSelectedTime(null);
      setHorarios([]);
    }
    setService(s);
  };

  const formatSelectedDateLong = () => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    return `${String(d).padStart(2, '0')} de ${MONTHS[m - 1]} de ${y}`;
  };

  const formatSelectedDateShort = () => {
    if (!selectedDate) return '';
    const [, m, d] = selectedDate.split('-').map(Number);
    return `${String(d).padStart(2, '0')} ${MONTHS[m - 1].slice(0, 3).toUpperCase()}`;
  };

  const generateQRCode = () => {
    const seed = (service ? service.id : 'x') + (selectedDate || '') + (selectedTime || '');
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    let cells = '';
    const size = 11;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        h = (h * 1103515245 + 12345) >>> 0;
        const on = (r < 3 && c < 3) || (r < 3 && c > size - 4) || (r > size - 4 && c < 3) ? true : (h % 3 === 0);
        if (on) cells += `<rect x="${c * 100 / size}" y="${r * 100 / size}" width="${100 / size}" height="${100 / size}" fill="#121214"/>`;
      }
    }
    return `<rect width="100" height="100" fill="#FFFFFF"/>${cells}`;
  };

  const showToastMessage = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2600);
  };

  const downloadICS = () => {
    if (!selectedDate || !selectedTime || !service) return;
    
    const [y, m, d] = selectedDate.split('-').map(Number);
    const [hh, mm] = selectedTime.split(':').map(Number);
    const start = new Date(y, m - 1, d, hh, mm);
    const end = new Date(start.getTime() + service.duration * 60000);
    const fmt = (dt) => {
      return dt.getFullYear() + String(dt.getMonth() + 1).padStart(2, '0') + String(dt.getDate()).padStart(2, '0') + 'T' + String(dt.getHours()).padStart(2, '0') + String(dt.getMinutes()).padStart(2, '0') + '00';
    };
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      'SUMMARY:' + service.name + ' - ' + configuracoes.nome,
      'DESCRIPTION:Atendimento na ' + configuracoes.nome,
      'LOCATION:' + configuracoes.endereco,
      'DTSTART:' + fmt(start), 'DTEND:' + fmt(end),
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agendamento-barbearia-novo-estilo.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFlow = () => {
    consultaAtual.current++;
    setStep(1);
    setService(null);
    setViewMonth(mesInicial());
    setSelectedDate(null);
    setSelectedTime(null);
    setHorarios([]);
    setPayMethod('pix');
    setAvisoVerificacao(false);
    setErroEnvio('');
    document.getElementById('inicio').scrollIntoView({ behavior: 'smooth' });
  };

  const alterarCartao = (campo) => (e) => {
    setCartao({ ...cartao, [campo]: MASCARAS_CARTAO[campo](e.target.value) });
    setErroCartao('');
  };

  // "Pagar": com os dados válidos, pergunta se o cliente quer cadastrar o cartão.
  const handleCardPayment = () => {
    const erro = validarCartao(cartao);
    if (erro) {
      setErroCartao(erro);
      return;
    }
    setDialogoCartao('salvar');
  };

  // Pagamento com cartão ainda é demonstração (sem gateway). Os dados do cartão
  // NUNCA vão para o nosso backend: quando o gateway entrar (ex.: Mercado Pago),
  // ele tokeniza o cartão; para "cadastrar o cartão" guardamos só token + bandeira + 4 últimos dígitos.
  const concluirPagamentoCartao = () => {
    setDialogoCartao(null);
    setCartao(CARTAO_VAZIO); // não mantém número/CVV na memória da página
    confirmarAgendamento('cartao');
  };

  // Grava o agendamento no servidor (que confere janela, 2 h, expediente e disponibilidade).
  // Pix e cartão ainda são demonstração: só a forma de pagamento escolhida é registrada.
  const confirmarAgendamento = async (pagamento) => {
    if (enviando) return;
    setErroEnvio('');
    setEnviando(true);
    try {
      await criarAgendamento({
        servicoId: service.id,
        data: selectedDate,
        hora: selectedTime,
        pagamento,
      });
      setStep(4);
    } catch (err) {
      if (err.status === 401) {
        setErroEnvio('Sua sessão expirou. Entre novamente para agendar.');
      } else {
        setErroEnvio(err.message);
        // Horário ocupado no meio tempo (409) ou inválido (400): volta para escolher outro.
        if (err.status === 409 || err.status === 400) {
          setSelectedTime(null);
          setStep(2);
          carregarHorarios(selectedDate, service);
        }
      }
    } finally {
      setEnviando(false);
    }
  };

  // Agendar exige e-mail e WhatsApp confirmados.
  const handleIrParaPagamento = () => {
    if (!contaVerificada(cliente)) {
      setAvisoVerificacao(true);
      return;
    }
    setStep(3);
  };

  // Render functions for each step
  const renderProgress = () => {
    return (
      <div className="progress-bar" role="list">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          let cls = '';
          if (n < step) cls = 'done';
          if (n === step) cls = 'active';
          const inner = n < step ? '✓' : n;
          return (
            <div key={i} role="listitem" aria-current={n === step ? 'step' : undefined} className={`progress-step ${cls}`}>
              <div className="circ">{inner}</div>
              <span className="label">{label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStep1 = () => {
    return (
      <div className="step-panel" style={{ display: step === 1 ? 'block' : 'none' }}>
        <h3>O que você deseja fazer?</h3>
        <p className="step-sub">Escolha o serviço para este agendamento.</p>
        <div className="row g-3">
          {servicos.map(s => (
            <div className="col-12 col-md-6" key={s.id}>
              <div
                className={`pick-card ${service && service.id === s.id ? 'selected' : ''}`}
                onClick={() => escolherServico(s)}
              >
                <div>
                  <div className="pc-title">{s.name}</div>
                  <div className="pc-meta">{s.duration} min</div>
                </div>
                <div className="pc-right">
                  <div className="pc-price">{formatPrice(s.price)}</div>
                  <div className="pick-check"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="step-nav">
          <span></span>
          <button className="btn btn-primary" disabled={!service} onClick={() => setStep(2)}>
            Continuar →
          </button>
        </div>
      </div>
    );
  };

  const renderDateStep = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { y, m } = viewMonth;
    const firstWeekday = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    // Navegação limitada aos meses da janela de agendamento (hoje … +janelaDias).
    const mesDe = (chave) => {
      const [a, mes] = chave.split('-').map(Number);
      return a * 12 + (mes - 1);
    };
    const mesAtual = y * 12 + m;
    const isFirstMonth = mesAtual <= mesDe(janela.min);
    const isLastMonth = mesAtual >= mesDe(janela.max);

    const keyOf = (day) => `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const changeMonth = (delta) => {
      const d = new Date(y, m + delta, 1);
      setViewMonth({ y: d.getFullYear(), m: d.getMonth() });
    };

    const cells = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push(<span key={`b${i}`} className="cal-blank"></span>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(y, m, day);
      const key = keyOf(day);
      const disabled = !diaAgendavel(key, janela, diasFechados);
      const selected = selectedDate === key;
      // Dia fechado = bolinha preta; vizinhos fechados na mesma semana se unem (bolinha → cilindro).
      const fechado = !!diasFechados?.has(key);
      const coluna = (firstWeekday + day - 1) % 7;
      const juntaEsq = fechado && coluna > 0 && day > 1 && diasFechados.has(keyOf(day - 1));
      const juntaDir = fechado && coluna < 6 && day < daysInMonth && diasFechados.has(keyOf(day + 1));
      const classes = [
        'cal-day',
        selected && 'selected',
        d.getTime() === today.getTime() && 'today',
        fechado && 'fechado',
        juntaEsq && 'junta-esq',
        juntaDir && 'junta-dir',
      ].filter(Boolean).join(' ');
      cells.push(
        <button
          key={key}
          type="button"
          disabled={disabled}
          className={classes}
          title={fechado ? diasFechados.get(key).motivo : undefined}
          onClick={() => escolherData(key)}
        >
          {day}
        </button>
      );
    }

    const selectedLong = () => {
      if (!selectedDate) return '';
      const [sy, sm, sd] = selectedDate.split('-').map(Number);
      const wd = new Date(sy, sm - 1, sd).getDay();
      return `${WEEKDAYS[wd]} · ${String(sd).padStart(2, '0')} de ${MONTHS[sm - 1]}`;
    };

    const renderTimeGrid = (times) => times.map(t => (
      <button
        key={t}
        type="button"
        className={`time-slot ${selectedTime === t ? 'selected' : ''}`}
        onClick={() => setSelectedTime(t)}
      >
        {t}
      </button>
    ));
    const { manha, tarde } = separarPeriodos(horarios, configuracoes.manhaFim);

    return (
      <div className="step-panel" style={{ display: step === 2 ? 'block' : 'none' }}>
        <h3>Escolha o melhor horário</h3>
        <p className="step-sub">Selecione a data e o horário disponível.</p>
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="calendar">
              <div className="cal-head">
                <button type="button" className="date-arrow" aria-label="Mês anterior" disabled={isFirstMonth} onClick={() => changeMonth(-1)}>‹</button>
                <b>{MONTHS[m]} {y}</b>
                <button type="button" className="date-arrow" aria-label="Próximo mês" disabled={isLastMonth} onClick={() => changeMonth(1)}>›</button>
              </div>
              <div className="cal-grid cal-weekdays">
                {WEEKDAYS.map(w => <span key={w}>{w}</span>)}
              </div>
              <div className="cal-grid">
                {cells}
              </div>
              <div className="cal-legenda">
                <span className="cal-legenda-bolinha" aria-hidden="true" /> Fechado (domingos, feriados e dias sem atendimento)
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="times-panel">
              {!selectedDate ? (
                <p className="times-empty">Escolha uma data no calendário para ver os horários disponíveis.</p>
              ) : (
                <>
                  <div className="times-date">{selectedLong()}</div>
                  {carregandoHorarios && <p className="times-empty">Carregando horários…</p>}
                  {!carregandoHorarios && erroHorarios && (
                    <p className="times-empty">{erroHorarios}</p>
                  )}
                  {!carregandoHorarios && !erroHorarios && horarios.length === 0 && (
                    <p className="times-empty">Não há horários livres neste dia. Escolha outra data.</p>
                  )}
                  {!carregandoHorarios && horarios.length > 0 && (
                    <div className="time-groups">
                      {manha.length > 0 && (
                        <div>
                          <h5>Manhã</h5>
                          <div className="time-grid">{renderTimeGrid(manha)}</div>
                        </div>
                      )}
                      {tarde.length > 0 && (
                        <div>
                          <h5>Tarde</h5>
                          <div className="time-grid">{renderTimeGrid(tarde)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {erroEnvio && step === 2 && (
          <div className="conta-alerta conta-alerta-erro booking-aviso" role="alert">
            {erroEnvio}
          </div>
        )}
        {avisoVerificacao && (
          <div className="conta-alerta conta-alerta-aviso booking-aviso" role="alert">
            Para agendar, confirme seu e-mail e seu WhatsApp.{' '}
            <Link to="/verificar?voltar=%2F%23agendamento" className="conta-link">
              Confirmar agora
            </Link>
          </div>
        )}
        <div className="step-nav">
          <button className="btn btn-ghost" onClick={() => setStep(1)}>← Voltar</button>
          <button
            className="btn btn-primary"
            disabled={!selectedDate || !selectedTime}
            onClick={handleIrParaPagamento}
          >
            Continuar →
          </button>
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <aside className="summary-card">
      <h4>Seu agendamento</h4>
      {!service ? (
        <p className="summary-empty">Escolha um serviço para começar.</p>
      ) : (
        <>
          <div className="summary-item">
            <div className="si-main">{service.name}</div>
            <div className="si-sub">{service.duration} min</div>
          </div>
          {selectedDate && selectedTime && (
            <div className="summary-item">
              <div className="si-main">{formatSelectedDateShort()} · {selectedTime}</div>
              <div className="si-sub">Data e horário</div>
            </div>
          )}
          {cliente && (
            <div className="summary-item">
              <div className="si-main">{cliente.nome}</div>
              <div className="si-sub">
                {exibirTelefone(cliente.telefone)} · {cliente.email}
              </div>
            </div>
          )}
          <div className="summary-total">
            <span className="v">{formatPrice(service.price)}</span>
            <span className="k">Total</span>
          </div>
        </>
      )}
    </aside>
  );

  const renderPayment = () => {
    const amount = service ? formatPrice(service.price) : formatPrice(0);
    // Pix real (BR Code com o valor) quando a chave do salão está configurada; senão, o QR ilustrativo.
    const pixPayload = service ? gerarPayloadPix(service.price) : null;

    return (
      <div className="step-panel" style={{ display: step === 3 ? 'block' : 'none' }}>
        <h3>Como deseja pagar?</h3>
        <p className="step-sub">
          Agendando como <b>{cliente?.nome}</b>.{' '}
          <Link to="/minha-conta" className="conta-link">
            Alterar meus dados
          </Link>
        </p>
        {erroEnvio && step === 3 && (
          <div className="conta-alerta conta-alerta-erro" role="alert">
            {erroEnvio}
          </div>
        )}
        <div className="row g-4">
          <div className="col-12 col-lg-7">
            <div className="pay-tabs">
              <button
                className={`pay-tab ${payMethod === 'pix' ? 'active' : ''}`}
                onClick={() => setPayMethod('pix')}
              >
                Pix
              </button>
              <button
                className={`pay-tab ${payMethod === 'cartao' ? 'active' : ''}`}
                onClick={() => setPayMethod('cartao')}
              >
                Cartão
              </button>
              <button
                className={`pay-tab ${payMethod === 'presencial' ? 'active' : ''}`}
                onClick={() => setPayMethod('presencial')}
              >
                Pagar no salão
              </button>
            </div>

            <div className={`pay-panel ${payMethod === 'pix' ? 'active' : ''}`} style={{ display: payMethod === 'pix' ? 'block' : 'none' }}>
              <div className="pix-box">
                {pixPayload ? (
                  <PixQr payload={pixPayload} />
                ) : (
                  <svg className="qr" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: generateQRCode() }} />
                )}
                <div className="pix-info">
                  <p>Escaneie o QR Code com o aplicativo do seu banco.</p>
                  <div className="pix-amount">{amount}</div>
                  <button className="btn btn-primary pay-btn-card" disabled={enviando} onClick={() => confirmarAgendamento('pix')}>
                    {enviando ? 'Confirmando…' : 'Já realizei o pagamento'}
                  </button>
                </div>
                {pixPayload ? (
                  <PixCodigo payload={pixPayload} />
                ) : (
                  <p className="pix-copia-indisponivel">Pix copia e cola indisponível no momento. Escolha outra forma de pagamento.</p>
                )}
              </div>
            </div>

            <div className={`pay-panel ${payMethod === 'cartao' ? 'active' : ''}`} style={{ display: payMethod === 'cartao' ? 'block' : 'none' }}>
              <div className="card-form">
                <div className="field full">
                  <label htmlFor="ccNumber">Número do cartão</label>
                  <input type="text" id="ccNumber" placeholder="0000 0000 0000 0000" maxLength={23} inputMode="numeric" autoComplete="cc-number" value={cartao.numero} onChange={alterarCartao('numero')} />
                </div>
                <div className="field full">
                  <label htmlFor="ccName">Nome no cartão</label>
                  <input type="text" id="ccName" placeholder="Como está impresso no cartão" maxLength={26} autoComplete="cc-name" value={cartao.nome} onChange={alterarCartao('nome')} />
                </div>
                <div className="field">
                  <label htmlFor="ccExp">Validade</label>
                  <input type="text" id="ccExp" placeholder="MM/AA" maxLength={5} inputMode="numeric" autoComplete="cc-exp" value={cartao.validade} onChange={alterarCartao('validade')} />
                </div>
                <div className="field">
                  <label htmlFor="ccCvv">CVV</label>
                  <input type="text" id="ccCvv" placeholder="000" maxLength={4} inputMode="numeric" autoComplete="cc-csc" value={cartao.cvv} onChange={alterarCartao('cvv')} />
                </div>
              </div>
              {erroCartao && (
                <div className="conta-alerta conta-alerta-erro" role="alert">
                  {erroCartao}
                </div>
              )}
              <div className="pay-amount-line">
                <span>Total a pagar</span>
                <b>{amount}</b>
              </div>
              <button className="btn btn-primary btn-block pay-btn-card" style={{ marginTop: '22px' }} disabled={enviando} onClick={handleCardPayment}>
                {enviando ? 'Confirmando…' : 'Pagar'}
              </button>

              <ConfirmDialog
                aberto={dialogoCartao === 'salvar'}
                titulo="Deseja cadastrar o cartão?"
                textoPrimario="Sim, cadastrar"
                // TODO(gateway): tokenizar e salvar o cartão no perfil antes de concluir.
                onPrimario={concluirPagamentoCartao}
                textoSecundario="Não"
                onSecundario={() => setDialogoCartao('confirmarSemSalvar')}
                onFechar={() => setDialogoCartao(null)}
              >
                <p>Com o cartão cadastrado no seu perfil, você não precisa informar os dados nos próximos agendamentos.</p>
              </ConfirmDialog>
              <ConfirmDialog
                aberto={dialogoCartao === 'confirmarSemSalvar'}
                titulo="Continuar sem cadastrar o cartão?"
                textoPrimario="Confirmar pagamento"
                onPrimario={concluirPagamentoCartao}
                textoSecundario="Voltar"
                onSecundario={() => setDialogoCartao('salvar')}
                onFechar={() => setDialogoCartao(null)}
              >
                <p>
                  O pagamento será realizado normalmente, mas no próximo agendamento será necessário informar os dados
                  do cartão novamente.
                </p>
              </ConfirmDialog>
            </div>

            <div className={`pay-panel ${payMethod === 'presencial' ? 'active' : ''}`} style={{ display: payMethod === 'presencial' ? 'block' : 'none' }}>
              <div className="presencial-card">
                <h3 style={{ fontSize: '20px' }}>Pagamento presencial</h3>
                <p>Você poderá realizar o pagamento diretamente no salão no dia do atendimento.</p>
                <div className="amt">{amount}</div>
                <button className="btn btn-primary pay-btn-card" disabled={enviando} onClick={() => confirmarAgendamento('presencial')}>
                  {enviando ? 'Confirmando…' : 'Confirmar agendamento'}
                </button>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-5">
            {renderSummary()}
          </div>
        </div>
        <div className="step-nav">
          <button className="btn btn-ghost" onClick={() => setStep(2)}>← Voltar</button>
          {/* Celular: a ação do método escolhido flutua na barra do rodapé (os botões dentro dos cards ficam ocultos). */}
          <button
            className="btn btn-primary step-nav-confirmar"
            disabled={enviando}
            onClick={() => (payMethod === 'cartao' ? handleCardPayment() : confirmarAgendamento(payMethod))}
          >
            {enviando
              ? 'Confirmando…'
              : { pix: 'Já realizei o pagamento', cartao: 'Pagar', presencial: 'Confirmar agendamento' }[payMethod]}
          </button>
        </div>
      </div>
    );
  };

  const renderConfirmation = () => {
    return (
      <div className="step-panel" style={{ display: step === 4 ? 'block' : 'none' }}>
        <div className="confirm-panel">
          <div className="check-circle">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 12.5L9.5 18L20 6" stroke="#B08D57" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Agendamento confirmado!</h3>
          <p className="lead">Seu horário foi reservado com sucesso.</p>
          <div className="confirm-summary">
            <div className="cs-date">{formatSelectedDateLong()}</div>
            <div className="cs-time">{selectedTime}</div>
            <div className="cs-line"><b>{service?.name}</b></div>
            <div className="cs-total">{formatPrice(service?.price || 0)}</div>
          </div>
          <div className="confirm-actions">
            <button className="btn btn-outline" onClick={downloadICS}>
              Adicionar ao calendário
            </button>
            <button className="btn btn-primary" onClick={resetFlow}>
              Voltar para o início
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="section section-white" id="agendamento">
      <div className="wrap">
        <div className="section-head">
          <div className="kicker-line"><div className="rule"></div><span>Reserve seu horário</span></div>
          <h2>Agendar atendimento</h2>
          <p>Três passos simples e seu horário está garantido.</p>
        </div>

        <div className="booking-shell">
          {step !== 4 && renderProgress()}
          {renderStep1()}
          {renderDateStep()}
          {renderPayment()}
          {renderConfirmation()}
        </div>
      </div>

      {showToast && (
        <div id="toast" className="show">
          {toastMessage}
        </div>
      )}
    </section>
  );
};

export default Booking;
