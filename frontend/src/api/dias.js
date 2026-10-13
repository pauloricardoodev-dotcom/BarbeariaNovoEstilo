// Dias que fogem do "dia comum aberto" (GET /api/dias-especiais): domingos, feriados, dias fechados ou
// desbloqueados pelo dono. Cada item: { data, fechado, origem, motivo, desbloqueado }. Sem dado pessoal.
import { request } from './http';

export const buscarDiasEspeciais = (de, ate) => request(`/dias-especiais?de=${de}&ate=${ate}`);
