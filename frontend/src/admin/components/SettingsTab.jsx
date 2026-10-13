import { useEffect, useState } from 'react';
import { buscarConfiguracoes, salvarConfiguracoes } from '../api/configuracoes';
import PageHeader from './PageHeader';

// Dias da semana na ordem do calendário do painel; `numero`: 1 = segunda … 7 = domingo (igual ao backend).
const DIAS_SEMANA = [
  { numero: 1, curto: 'Seg', nome: 'Segunda-feira' },
  { numero: 2, curto: 'Ter', nome: 'Terça-feira' },
  { numero: 3, curto: 'Qua', nome: 'Quarta-feira' },
  { numero: 4, curto: 'Qui', nome: 'Quinta-feira' },
  { numero: 5, curto: 'Sex', nome: 'Sexta-feira' },
  { numero: 6, curto: 'Sáb', nome: 'Sábado' },
  { numero: 7, curto: 'Dom', nome: 'Domingo' },
];

const PERIODOS = [
  { id: 'manha', titulo: 'Horário da Manhã', inicio: 'manhaInicio', fim: 'manhaFim' },
  { id: 'tarde', titulo: 'Horário da Tarde', inicio: 'tardeInicio', fim: 'tardeFim' },
];

// Mesmas regras do servidor (que decide de fato); aqui só evita ida e volta à toa.
const validar = (f) => {
  if (!f.nome.trim()) return 'Informe o nome da barbearia.';
  if (!f.telefone.trim()) return 'Informe o telefone.';
  if (!f.endereco.trim()) return 'Informe o endereço.';
  if (f.diasTrabalho.length === 0) return 'Marque pelo menos um dia de trabalho.';
  if (!f.manhaInicio || !f.manhaFim || !f.tardeInicio || !f.tardeFim) return 'Preencha os quatro horários.';
  if (f.manhaInicio >= f.manhaFim) return 'O fim da manhã deve ser depois do início da manhã.';
  if (f.tardeInicio < f.manhaFim) return 'A tarde não pode começar antes do fim da manhã.';
  if (f.tardeInicio >= f.tardeFim) return 'O fim da tarde deve ser depois do início da tarde.';
  const horas = Number(f.antecedenciaHoras);
  if (f.antecedenciaHoras === '' || !Number.isInteger(horas) || horas < 0 || horas > 72) {
    return 'O tempo mínimo deve ser um número inteiro de 0 a 72 horas.';
  }
  const dias = Number(f.janelaDias);
  if (f.janelaDias === '' || !Number.isInteger(dias) || dias < 1 || dias > 365) {
    return 'O tempo máximo deve ser um número inteiro de 1 a 365 dias.';
  }
  return '';
};

const SettingsTab = () => {
  const [salvo, setSalvo] = useState(null); // último valor gravado no servidor
  const [form, setForm] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    buscarConfiguracoes()
      .then((dados) => {
        if (cancelado) return;
        setSalvo(dados);
        setForm(dados);
        setErro('');
      })
      .catch((e) => !cancelado && setErro(e.message))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [tentativa]);

  const handleChange = (campo) => (e) => {
    setSucesso(false);
    setForm((atual) => ({ ...atual, [campo]: e.target.value }));
  };

  const handleToggleDia = (numero) => {
    setSucesso(false);
    setForm((atual) => {
      const marcado = atual.diasTrabalho.includes(numero);
      const dias = marcado ? atual.diasTrabalho.filter((d) => d !== numero) : [...atual.diasTrabalho, numero];
      return { ...atual, diasTrabalho: dias.sort((a, b) => a - b) };
    });
  };

  const handleCancelar = () => {
    setForm(salvo);
    setErro('');
    setSucesso(false);
  };

  const handleSalvar = async () => {
    const problema = validar(form);
    if (problema) {
      setErro(problema);
      setSucesso(false);
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      const gravado = await salvarConfiguracoes({
        ...form,
        antecedenciaHoras: Number(form.antecedenciaHoras),
        janelaDias: Number(form.janelaDias),
      });
      setSalvo(gravado);
      setForm(gravado);
      setSucesso(true);
    } catch (e) {
      setErro(e.message);
      setSucesso(false);
    } finally {
      setSalvando(false);
    }
  };

  const alterado = form && salvo && JSON.stringify(form) !== JSON.stringify(salvo);

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Configure os parâmetros do sistema" />

      {carregando && <div className="text-secondary">Carregando…</div>}

      {!carregando && !form && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span>{erro}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => {
              setCarregando(true);
              setTentativa((t) => t + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {form && (
        <div className="card">
          <div className="card-body p-3 p-md-4">
            {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
            {sucesso && (
              <div className="alert alert-success" role="status">
                Configurações salvas. O site já usa os novos valores.
              </div>
            )}

            <div className="section-label">Informações da Barbearia</div>
            <div className="row g-3 mb-4">
              <div className="col-12">
                <label className="form-label" htmlFor="cfg-nome">Nome da Barbearia</label>
                <input id="cfg-nome" type="text" className="form-control" maxLength={80} value={form.nome} onChange={handleChange('nome')} />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="cfg-telefone">Telefone</label>
                <input id="cfg-telefone" type="text" className="form-control" maxLength={30} value={form.telefone} onChange={handleChange('telefone')} placeholder="(41) 3025-1187" />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="cfg-endereco">Endereço</label>
                <input id="cfg-endereco" type="text" className="form-control" maxLength={200} value={form.endereco} onChange={handleChange('endereco')} placeholder="Endereço completo" />
              </div>
            </div>

            <div className="section-label">Dias de Trabalho</div>
            <div className="dias-semana mb-2" role="group" aria-label="Dias de trabalho">
              {DIAS_SEMANA.map(({ numero, curto, nome }) => {
                const ativo = form.diasTrabalho.includes(numero);
                return (
                  <button
                    key={numero}
                    type="button"
                    role="switch"
                    aria-checked={ativo}
                    aria-label={nome}
                    title={`${nome}: ${ativo ? 'dia de trabalho' : 'folga'}`}
                    className={`dia-switch ${ativo ? 'ativo' : ''}`}
                    onClick={() => handleToggleDia(numero)}
                  >
                    <span className="dia-switch-trilho"><span className="dia-switch-bolinha" /></span>
                    <span className="dia-switch-nome">{curto}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-secondary small mb-4">
              <strong className="text-danger">Vermelho</strong> = dia de trabalho; <strong>cinza</strong> = folga (fechado
              para os clientes). Feriados continuam fechados; você pode abrir ou fechar dias avulsos pela Agenda.
            </p>

            <div className="section-label">Horário de Funcionamento</div>
            <div className="row g-3 mb-2">
              {PERIODOS.map(({ id, titulo, inicio, fim }) => (
                <div key={id} className="col-md-6">
                  <label className="form-label" htmlFor={`${id}-inicio`}>{titulo}</label>
                  <div className="d-flex align-items-center gap-2">
                    <input id={`${id}-inicio`} type="time" className="form-control" value={form[inicio]} onChange={handleChange(inicio)} aria-label={`${titulo}: início`} />
                    <span className="text-secondary">até</span>
                    <input id={`${id}-fim`} type="time" className="form-control" value={form[fim]} onChange={handleChange(fim)} aria-label={`${titulo}: fim`} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-secondary small mb-4">
              O intervalo entre o fim da manhã e o início da tarde é o almoço. Agendamentos já marcados fora dos novos
              dias e horários não são alterados.
            </p>

            <div className="section-label">Políticas de Agendamento</div>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label" htmlFor="cfg-antecedencia">Tempo mínimo para agendamento (horas)</label>
                <input id="cfg-antecedencia" type="number" className="form-control" min="0" max="72" step="1" value={form.antecedenciaHoras} onChange={handleChange('antecedenciaHoras')} />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="cfg-janela">Tempo máximo para agendamento (dias)</label>
                <input id="cfg-janela" type="number" className="form-control" min="1" max="365" step="1" value={form.janelaDias} onChange={handleChange('janelaDias')} />
              </div>
            </div>

            <div className="section-label">Notificações</div>
            <p className="text-secondary small mb-0">
              Em breve: e-mail de notificações e lembretes de agendamento ainda não são enviados.
            </p>
          </div>
          <div className="card-footer d-flex justify-content-end gap-2 py-3">
            <button type="button" className="btn btn-outline-secondary" onClick={handleCancelar} disabled={!alterado || salvando}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSalvar} disabled={!alterado || salvando}>
              {salvando ? 'Salvando…' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
