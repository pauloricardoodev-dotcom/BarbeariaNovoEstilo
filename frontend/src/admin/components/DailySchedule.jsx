import { TIMES_MANHA, TIMES_TARDE, WEEKDAYS, MONTHS } from '../../data/constants';
import StatusBadge from './StatusBadge';

const DailySchedule = ({ date, appointments, onAppointmentClick, onCreateReservation }) => {
  const formatDate = (dateStr) => {
    const [day, month, year] = dateStr.split('/');
    const d = new Date(year, month - 1, day);
    const dayName = WEEKDAYS[d.getDay()];
    const monthName = MONTHS[d.getMonth()];
    return `${dayName}, ${day} DE ${monthName.toUpperCase()}`;
  };

  const getAppointmentForTime = (time) => {
    return appointments.find(apt => apt.date === date && apt.time === time);
  };

  const allTimes = [...TIMES_MANHA, ...TIMES_TARDE];

  return (
    <div className="card">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
        <h2 className="h5 mb-0 calendar-title">{formatDate(date)}</h2>
        <button className="btn btn-primary btn-sm" onClick={onCreateReservation}>
          + Criar Reserva Manual
        </button>
      </div>

      <div className="list-group list-group-flush">
        {allTimes.map(time => {
          const appointment = getAppointmentForTime(time);

          if (!appointment) {
            return (
              <div key={time} className="list-group-item d-flex align-items-center gap-3 text-secondary">
                <span className="time-slot fw-semibold">{time}</span>
                <span className="fst-italic">Disponível</span>
              </div>
            );
          }

          return (
            <button
              type="button"
              key={time}
              className="list-group-item list-group-item-action d-flex align-items-start gap-3"
              onClick={() => onAppointmentClick(appointment)}
            >
              <span className="time-slot fw-semibold">{time}</span>
              <div className="flex-grow-1">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <span className="fw-semibold">{appointment.client.name}</span>
                  <StatusBadge status={appointment.status} />
                </div>
                <div className="d-flex justify-content-between small">
                  <span>{appointment.service.name}</span>
                  <span className="fw-semibold">R$ {appointment.service.price.toFixed(2)}</span>
                </div>
                <div className="small text-secondary">{appointment.professional.name}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DailySchedule;
