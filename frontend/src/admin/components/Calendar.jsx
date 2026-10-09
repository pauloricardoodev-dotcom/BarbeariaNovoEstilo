import { useState } from 'react';
import { MONTHS, WEEKDAYS } from '../../data/constants';

const Calendar = ({ onDateSelect, appointments }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getAppointmentsForDayByMonth = (day, month, year) => {
    const dateStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    return appointments.filter(apt => apt.date === dateStr && apt.status !== 'cancelado');
  };

  const getDayOccupancyLevel = (day) => {
    const dayAppointments = getAppointmentsForDayByMonth(day, currentDate.getMonth(), currentDate.getFullYear());
    const totalSlots = 12; // 6 morning + 6 afternoon slots
    const occupied = dayAppointments.length;
    
    if (occupied === 0) return 'empty';
    if (occupied < totalSlots * 0.5) return 'low';
    if (occupied < totalSlots) return 'medium';
    return 'full';
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day) => {
    const dateStr = `${String(day).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
    onDateSelect(dateStr);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const blankDays = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const LEGEND = [
    ['empty', 'Sem reservas'],
    ['low', 'Poucas reservas'],
    ['medium', 'Muitas reservas'],
    ['full', 'Dia cheio'],
  ];

  return (
    <div className="card calendar-card">
      <div className="card-body p-3 p-md-4">
        <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom">
          <button className="btn btn-outline-secondary btn-sm" onClick={handlePreviousMonth} aria-label="Mês anterior">
            ←
          </button>
          <h4 className="h5 mb-0 calendar-title">
            {MONTHS[currentDate.getMonth()].toUpperCase()} {currentDate.getFullYear()}
          </h4>
          <button className="btn btn-outline-secondary btn-sm" onClick={handleNextMonth} aria-label="Próximo mês">
            →
          </button>
        </div>

        <div className="calendar-grid mb-1">
          {WEEKDAYS.map(day => (
            <div key={day} className="calendar-weekday text-center text-secondary text-uppercase fw-semibold py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {blankDays.map((_, index) => (
            <div key={`blank-${index}`} />
          ))}
          {days.map(day => {
            const occupancy = getDayOccupancyLevel(day);
            const dayAppointments = getAppointmentsForDayByMonth(day, currentDate.getMonth(), currentDate.getFullYear());

            return (
              <button
                type="button"
                key={day}
                className={`calendar-day ${occupancy}`}
                onClick={() => handleDayClick(day)}
              >
                <span className="day-number">{day}</span>
                {dayAppointments.length > 0 && (
                  <span className="appointment-count">{dayAppointments.length}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="d-flex flex-wrap gap-3 mt-3 pt-3 border-top small">
          {LEGEND.map(([level, label]) => (
            <div key={level} className="d-flex align-items-center gap-2">
              <span className={`legend-color ${level}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
