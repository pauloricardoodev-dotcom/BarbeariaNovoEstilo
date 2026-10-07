import { useState, useEffect } from 'react';
import { SERVICES, WEEKDAYS, MONTHS, TIMES_MANHA, TIMES_TARDE, STEP_LABELS } from '../data/constants';

const Booking = ({ preSelectedService }) => {
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [payMethod, setPayMethod] = useState('pix');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ name: false, phone: false, email: false });

  // Handle pre-selected service from other components
  useEffect(() => {
    if (preSelectedService) {
      const foundService = SERVICES.find(s => s.id === preSelectedService);
      if (foundService) {
        setService(foundService);
      }
    }
  }, [preSelectedService]);

  const formatPrice = (price) => {
    return 'R$ ' + price.toFixed(2).replace('.', ',');
  };

  const isClosed = (d) => {
    return d.getDay() === 0;
  };

  const slotUnavailable = (dateStr, time) => {
    let h = 0;
    const str = dateStr + time;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) % 97;
    }
    return h % 5 === 0;
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
      'SUMMARY:' + service.name + ' - Barbearia Novo Estilo',
      'DESCRIPTION:Atendimento na Barbearia Novo Estilo',
      'LOCATION:Rua das Palmeiras, 482, Batel, Curitiba - PR',
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

  const validateStep4 = () => {
    let valid = true;
    const errors = { name: false, phone: false, email: false };

    if (name.length < 3) {
      errors.name = true;
      valid = false;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      errors.phone = true;
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = true;
      valid = false;
    }

    setFieldErrors(errors);
    return valid;
  };

  const resetFlow = () => {
    setStep(1);
    setService(null);
    setViewMonth({ y: new Date().getFullYear(), m: new Date().getMonth() });
    setSelectedDate(null);
    setSelectedTime(null);
    setPayMethod('pix');
    setName('');
    setPhone('');
    setEmail('');
    setFieldErrors({ name: false, phone: false, email: false });
    document.getElementById('inicio').scrollIntoView({ behavior: 'smooth' });
  };

  const handleCardPayment = () => {
    // In a real app, you would validate and process the card payment here
    // For demo purposes, we'll just show confirmation
    setStep(5);
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
          {SERVICES.map(s => (
            <div className="col-12 col-md-6" key={s.id}>
              <div
                className={`pick-card ${service && service.id === s.id ? 'selected' : ''}`}
                onClick={() => setService(s)}
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
    const isCurrentMonth = y === today.getFullYear() && m === today.getMonth();

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
      const disabled = d < today || isClosed(d);
      const selected = selectedDate === key;
      cells.push(
        <button
          key={key}
          type="button"
          disabled={disabled}
          className={`cal-day ${selected ? 'selected' : ''} ${d.getTime() === today.getTime() ? 'today' : ''}`}
          onClick={() => {
            setSelectedDate(key);
            setSelectedTime(null);
          }}
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

    const renderTimeGrid = (times) => times.map(t => {
      const unavailable = slotUnavailable(selectedDate, t);
      return (
        <button
          key={t}
          type="button"
          disabled={unavailable}
          className={`time-slot ${unavailable ? 'disabled' : ''} ${selectedTime === t ? 'selected' : ''}`}
          onClick={() => setSelectedTime(t)}
        >
          {t}
        </button>
      );
    });

    return (
      <div className="step-panel" style={{ display: step === 2 ? 'block' : 'none' }}>
        <h3>Escolha o melhor horário</h3>
        <p className="step-sub">Selecione a data e o horário disponível.</p>
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="calendar">
              <div className="cal-head">
                <button type="button" className="date-arrow" aria-label="Mês anterior" disabled={isCurrentMonth} onClick={() => changeMonth(-1)}>‹</button>
                <b>{MONTHS[m]} {y}</b>
                <button type="button" className="date-arrow" aria-label="Próximo mês" onClick={() => changeMonth(1)}>›</button>
              </div>
              <div className="cal-grid cal-weekdays">
                {WEEKDAYS.map(w => <span key={w}>{w}</span>)}
              </div>
              <div className="cal-grid">
                {cells}
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
                  <div className="time-groups">
                    <div>
                      <h5>Manhã</h5>
                      <div className="time-grid">{renderTimeGrid(TIMES_MANHA)}</div>
                    </div>
                    <div>
                      <h5>Tarde</h5>
                      <div className="time-grid">{renderTimeGrid(TIMES_TARDE)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="step-nav">
          <button className="btn btn-ghost" onClick={() => setStep(1)}>← Voltar</button>
          <button
            className="btn btn-primary"
            disabled={!selectedDate || !selectedTime}
            onClick={() => setStep(3)}
          >
            Continuar →
          </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
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
            <div className="summary-total">
              <span className="v">{formatPrice(service.price)}</span>
              <span className="k">Total</span>
            </div>
          </>
        )}
      </aside>
    );

    return (
      <div className="step-panel" style={{ display: step === 3 ? 'block' : 'none' }}>
        <h3>Quase pronto!</h3>
        <p className="step-sub">Informe seus dados para confirmarmos o agendamento.</p>
        <div className="row g-4">
          <div className="col-12 col-lg-7">
            <div className={`field ${fieldErrors.name ? 'invalid' : ''}`}>
              <label htmlFor="inpName">Nome completo</label>
              <input
                type="text"
                id="inpName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite seu nome completo"
              />
              <span className="err">Informe seu nome completo.</span>
            </div>
            <div className={`field ${fieldErrors.phone ? 'invalid' : ''}`}>
              <label htmlFor="inpPhone">Telefone</label>
              <input
                type="tel"
                id="inpPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(41) 90000-0000"
              />
              <span className="err">Informe um telefone válido.</span>
            </div>
            <div className={`field ${fieldErrors.email ? 'invalid' : ''}`}>
              <label htmlFor="inpEmail">E-mail</label>
              <input
                type="email"
                id="inpEmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
              />
              <span className="err">Informe um e-mail válido.</span>
            </div>
          </div>
          <div className="col-12 col-lg-5">
            {renderSummary()}
          </div>
        </div>
        <div className="step-nav">
          <button className="btn btn-ghost" onClick={() => setStep(2)}>← Voltar</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (validateStep4()) setStep(4);
            }}
          >
            Continuar →
          </button>
        </div>
      </div>
    );
  };

  const renderStep5 = () => {
    const amount = service ? formatPrice(service.price) : formatPrice(0);

    return (
      <div className="step-panel" style={{ display: step === 4 ? 'block' : 'none' }}>
        <h3>Como deseja pagar?</h3>
        <p className="step-sub">Escolha a forma de pagamento para concluir.</p>
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
            <svg className="qr" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: generateQRCode() }} />
            <div className="pix-info">
              <p>Escaneie o QR Code com o aplicativo do seu banco.</p>
              <div className="pix-amount">{amount}</div>
              <button className="btn btn-primary" onClick={() => setStep(5)}>
                Já realizei o pagamento
              </button>
            </div>
          </div>
        </div>

        <div className={`pay-panel ${payMethod === 'cartao' ? 'active' : ''}`} style={{ display: payMethod === 'cartao' ? 'block' : 'none' }}>
          <div className="card-form">
            <div className="field full">
              <label htmlFor="ccNumber">Número do cartão</label>
              <input type="text" id="ccNumber" placeholder="0000 0000 0000 0000" maxLength={19} />
            </div>
            <div className="field full">
              <label htmlFor="ccName">Nome no cartão</label>
              <input type="text" id="ccName" placeholder="Como está impresso no cartão" />
            </div>
            <div className="field">
              <label htmlFor="ccExp">Validade</label>
              <input type="text" id="ccExp" placeholder="MM/AA" maxLength={5} />
            </div>
            <div className="field">
              <label htmlFor="ccCvv">CVV</label>
              <input type="text" id="ccCvv" placeholder="000" maxLength={4} />
            </div>
          </div>
          <div className="pay-amount-line">
            <span>Total a pagar</span>
            <b>{amount}</b>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: '22px' }} onClick={handleCardPayment}>
            Pagar
          </button>
        </div>

        <div className={`pay-panel ${payMethod === 'presencial' ? 'active' : ''}`} style={{ display: payMethod === 'presencial' ? 'block' : 'none' }}>
          <div className="presencial-card">
            <h3 style={{ fontSize: '20px' }}>Pagamento presencial</h3>
            <p>Você poderá realizar o pagamento diretamente no salão no dia do atendimento.</p>
            <div className="amt">{amount}</div>
            <button className="btn btn-primary" onClick={() => setStep(5)}>
              Confirmar agendamento
            </button>
          </div>
        </div>

        <div className="step-nav">
          <button className="btn btn-ghost" onClick={() => setStep(3)}>← Voltar</button>
          <span></span>
        </div>
      </div>
    );
  };

  const renderConfirmation = () => {
    return (
      <div className="step-panel" style={{ display: step === 5 ? 'block' : 'none' }}>
        <div className="confirm-panel">
          <div className="check-circle">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 12.5L9.5 18L20 6" stroke="#C7CCD0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
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
          <p>Cinco passos simples e seu horário está garantido.</p>
        </div>

        <div className="booking-shell">
          {step !== 5 && renderProgress()}
          {renderStep1()}
          {renderDateStep()}
          {renderStep4()}
          {renderStep5()}
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
