import { statusLabels } from '../data/mockData';

const BADGE_CLASS = {
  agendado: 'text-bg-primary',
  concluido: 'text-bg-success',
  cancelado: 'text-bg-secondary',
};

const StatusBadge = ({ status, label }) => (
  <span className={`badge rounded-pill ${BADGE_CLASS[status] || 'text-bg-light'}`}>
    {label ?? statusLabels[status]}
  </span>
);

export default StatusBadge;
