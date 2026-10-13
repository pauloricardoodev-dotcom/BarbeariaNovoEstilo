// Números do Dashboard (GET /api/admin/dashboard). `mes` em 'AAAA-MM'.
import { request } from '../../api/http';

export const buscarResumo = (mes) => request(`/admin/dashboard?mes=${mes}`);
