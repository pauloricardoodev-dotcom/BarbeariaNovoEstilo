import { useEffect, useState } from 'react';
import { buscarResumo } from '../api/dashboard';
import { MONTHS } from '../../data/constants';
import Icone from './Icones';
import PageHeader from './PageHeader';

const chaveDoMes = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const dinheiro = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const monthOptions = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: chaveDoMes(date), label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}` };
  });
};

const DashboardTab = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => chaveDoMes(new Date()));
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');

  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    let cancelado = false;
    buscarResumo(selectedMonth)
      .then((dados) => {
        if (cancelado) return;
        setResumo(dados);
        setErro('');
      })
      .catch((e) => !cancelado && setErro(e.message));
    return () => {
      cancelado = true;
    };
  }, [selectedMonth, versao]);

  // Reconsulta ao voltar para a aba/janela, para refletir o que mudou na Agenda.
  useEffect(() => {
    const aoVoltar = () => document.visibilityState === 'visible' && setVersao((v) => v + 1);
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    };
  }, []);

  // Enquanto o mês escolhido carrega, não mostra os números do mês anterior.
  const atual = resumo?.mes === selectedMonth ? resumo : null;
  const totais = atual?.totais;
  const faturamentoPorDia = atual?.faturamentoPorDia ?? [];
  const servicos = atual?.servicos ?? [];
  const maxRevenue = Math.max(...faturamentoPorDia.map((d) => d.valor), 1);

  const cards = [
    { icon: 'clientes', title: 'Clientes no Mês', value: totais?.clientes, subtitle: 'Clientes distintos com agendamento' },
    { icon: 'faturamento', title: 'Faturamento', value: totais && dinheiro(totais.faturamento), subtitle: 'Serviços concluídos' },
    { icon: 'agenda', title: 'Agendamentos', value: totais?.agendamentos, subtitle: 'Total de reservas' },
    { icon: 'cancelamentos', title: 'Cancelamentos', value: totais?.cancelados, subtitle: 'Reservas canceladas' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do seu negócio">
        <select
          className="form-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {monthOptions().map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </PageHeader>

      {erro && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span>{erro}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={recarregar}>Tentar novamente</button>
        </div>
      )}

      <div className="row g-3 mb-4">
        {cards.map(card => (
          <div key={card.title} className="col-12 col-sm-6 col-xl-3">
            <div className="card stat-card h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className="stat-icon"><Icone nome={card.icon} size={28} /></div>
                <div>
                  <div className="text-secondary small text-uppercase fw-semibold">{card.title}</div>
                  <div className="stat-value">{card.value ?? '—'}</div>
                  <div className="text-secondary small">{card.subtitle}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="h5 calendar-title mb-3">Faturamento por Dia</h3>
              {faturamentoPorDia.length > 0 ? (
                <div className="bar-chart">
                  {faturamentoPorDia.map(({ dia, valor }) => (
                    <div key={dia} className="bar-item">
                      <div className="bar-fill" style={{ height: `${(valor / maxRevenue) * 100}%` }}>
                        <div className="bar-value">{dinheiro(valor)}</div>
                      </div>
                      <div className="small text-secondary">{dia.slice(8)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-secondary fst-italic py-5">Sem dados para exibir</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="h5 calendar-title mb-3">Serviços Mais Realizados</h3>
              {servicos.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {servicos.map(({ nome, quantidade }) => (
                    <li key={nome} className="list-group-item d-flex justify-content-between align-items-center px-0">
                      <span>{nome}</span>
                      <span className="badge text-bg-primary rounded-pill">{quantidade}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-secondary fst-italic py-5">Sem dados para exibir</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
