// Dias fechados / desbloqueados no painel. A leitura é a mesma do site (GET /api/dias-especiais);
// a escrita é só do admin (PUT /api/admin/dias-especiais/:data).
import { request } from '../../api/http';

export { buscarDiasEspeciais as listarDiasEspeciais } from '../../api/dias';

/** fechado = true fecha o dia (motivo opcional); fechado = false desbloqueia. Não mexe em agendamentos já marcados. */
export const definirDia = (data, { fechado, motivo }) =>
  request(`/admin/dias-especiais/${data}`, {
    method: 'PUT',
    body: JSON.stringify({ fechado, ...(fechado && motivo ? { motivo } : {}) }),
  });
