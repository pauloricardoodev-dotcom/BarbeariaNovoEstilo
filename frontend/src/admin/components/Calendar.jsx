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

  return (
    <div className="calendar-wrapper">
      <div className="calendar-header">
        <button className="calendar-nav" onClick={handlePreviousMonth}>
          ←
        </button>
        <h4>
          {MONTHS[currentDate.getMonth()].toUpperCase()} {currentDate.getFullYear()}
        </h4>
        <button className="calendar-nav" onClick={handleNextMonth}>
          →
        </button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map(day => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {blankDays.map((_, index) => (
          <div key={`blank-${index}`} className="calendar-day empty" />
        ))}
        {days.map(day => {
          const occupancy = getDayOccupancyLevel(day);
          const dayAppointments = getAppointmentsForDayByMonth(day, currentDate.getMonth(), currentDate.getFullYear());
          
          return (
            <div
              key={day}
              className={`calendar-day ${occupancy}`}
              onClick={() => handleDayClick(day)}
            >
              <span className="day-number">{day}</span>
              {dayAppointments.length > 0 && (
                <span className="appointment-count">{dayAppointments.length}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color empty"></div>
          <span>Sem reservas</span>
        </div>
        <div className="legend-item">
          <div className="legend-color low"></div>
          <span>Poucas reservas</span>
        </div>
        <div className="legend-item">
          <div className="legend-color medium"></div>
          <span>Muitas reservas</span>
        </div>
        <div className="legend-item">
          <div className="legend-color full"></div>
          <span>Dia cheio</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
