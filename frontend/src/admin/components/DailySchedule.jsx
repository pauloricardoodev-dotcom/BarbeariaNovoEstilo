import { TIMES_MANHA, TIMES_TARDE, WEEKDAYS, MONTHS } from '../../data/constants';
import { statusLabels } from '../data/mockData';

const DailySchedule = ({ date, appointments, onAppointmentClick, onCreateReservation }) => {
  const parseDate = (dateStr) => {
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
  };

  const formatDate = (dateStr) => {
    const [day, month, year] = dateStr.split('/');
    const date = new Date(year, month - 1, day);
    const dayName = WEEKDAYS[date.getDay()];
    const monthName = MONTHS[date.getMonth()];
    return `${dayName}, ${day} DE ${monthName.toUpperCase()}`;
  };

  const getAppointmentForTime = (time) => {
    return appointments.find(apt => apt.date === date && apt.time === time);
  };

  const allTimes = [...TIMES_MANHA, ...TIMES_TARDE];

  return (
    <div className="daily-schedule">
      <div className="daily-header">
        <h2 className="daily-title">{formatDate(date)}</h2>
        <button className="action-btn primary-btn" onClick={onCreateReservation}>
          + Criar Reserva Manual
        </button>
      </div>

      <div className="schedule-list">
        {allTimes.map(time => {
          const appointment = getAppointmentForTime(time);
          
          return (
            <div
              key={time}
              className={`schedule-item ${appointment ? 'occupied' : 'available'}`}
              onClick={() => appointment && onAppointmentClick(appointment)}
            >
              <div className="time-slot">{time}</div>
              
              {appointment ? (
                <div className="appointment-details">
                  <div className="appointment-header">
                    <span className="client-name">{appointment.client.name}</span>
                    <span className={`status-badge status-${appointment.status}`}>
                      {statusLabels[appointment.status]}
                    </span>
                  </div>
                  <div className="appointment-info">
                    <span className="service-name">{appointment.service.name}</span>
                    <span className="service-price">R$ {appointment.service.price.toFixed(2)}</span>
                  </div>
                  <div className="appointment-footer">
                    <span className="professional-name">{appointment.professional.name}</span>
                  </div>
                </div>
              ) : (
                <div className="available-slot">
                  <span className="available-text">Disponível</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailySchedule;
