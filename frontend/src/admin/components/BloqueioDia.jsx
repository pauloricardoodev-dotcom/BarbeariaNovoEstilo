import { useState } from 'react';
import { definirDia } from '../api/dias';

const pad = (n) => String(n).padStart(2, '0');
const hojeChave = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Faixa preta no topo do card com o motivo do fechamento (os botões ficam em BloqueioDia, abaixo do card). */
export const FaixaDiaFechado = ({ dia, ativos }) => (
  <div className="dia-fechado-aviso px-3 py-2">
    <strong>Dia fechado</strong> — {dia.motivo}. Os clientes não conseguem marcar neste dia.
    {ativos > 0 &&
      (ativos === 1
        ? ' O agendamento já marcado neste dia continua valendo.'
        : ` Os ${ativos} agendamentos já marcados neste dia continuam valendo.`)}
  </div>
);

/**
 * Controles de um dia da Agenda, mostrados abaixo do card: "Desbloquear dia" quando está fechado (domingo, feriado ou fechado pelo dono)
 * e "Bloquear dia" quando está aberto. Agendamentos já marcados no dia nunca são cancelados por isso.
 * `dia` é o estado vindo do servidor (undefined = dia comum aberto); `ativos` = agendamentos ainda marcados.
 */
const BloqueioDia = ({ data, dia, ativos, onChanged }) => {
  const [confirmando, setConfirmando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const fechado = !!dia?.fechado;
  const passado = data < hojeChave();

  const salvar = async (fechar) => {
    setSalvando(true);
    setErro('');
    try {
      await definirDia(data, { fechado: fechar, motivo: motivo.trim() });
      setConfirmando(false);
      setMotivo('');
      onChanged(
        fechar
          ? 'Dia fechado. Os clientes não conseguem mais marcar nele.'
          : 'Dia desbloqueado. Os clientes já podem marcar nele.',
      );
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const aviso = ativos > 0 && (
    <span>
      {' '}
      {ativos === 1 ? 'O agendamento já marcado neste dia continua valendo.' : `Os ${ativos} agendamentos já marcados neste dia continuam valendo.`}
    </span>
  );

  // Dia fechado: botão vermelho e grande, abaixo do card da agenda do dia.
  if (fechado) {
    if (passado) return null;
    return (
      <div className="mt-3">
        <button type="button" className="btn btn-danger btn-lg w-100 fw-semibold" disabled={salvando} onClick={() => salvar(false)}>
          {salvando ? 'Desbloqueando…' : 'Desbloquear dia'}
        </button>
        <div className="small text-secondary mt-2 text-center">
          Ao desbloquear, os clientes voltam a poder marcar horário neste dia.
        </div>
        {erro && <div className="alert alert-danger mt-2 mb-0" role="alert">{erro}</div>}
      </div>
    );
  }

  if (passado) return null;

  return (
    <div className="mt-3">
      {dia?.desbloqueado && (
        <div className="small text-secondary mb-2">Dia desbloqueado (normalmente fechado: {dia.motivo}).</div>
      )}
      {!confirmando ? (
        <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => setConfirmando(true)}>
          Bloquear dia
        </button>
      ) : (
        <div>
          <label className="form-label small mb-1" htmlFor="motivo-bloqueio">Motivo (opcional)</label>
          <div className="d-flex flex-wrap gap-2">
            <input
              id="motivo-bloqueio"
              type="text"
              className="form-control form-control-sm"
              style={{ maxWidth: '22rem' }}
              maxLength={120}
              placeholder="Ex.: curso, viagem, manutenção"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <button type="button" className="btn btn-dark btn-sm" disabled={salvando} onClick={() => salvar(true)}>
              {salvando ? 'Fechando…' : 'Fechar este dia'}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={salvando} onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </div>
          <div className="small text-secondary mt-1">
            Os clientes deixam de poder marcar neste dia.
            {aviso}
          </div>
        </div>
      )}
      {erro && <div className="small mt-2 text-danger">{erro}</div>}
    </div>
  );
};

export default BloqueioDia;
