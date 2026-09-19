import { useState } from 'react';
import { appointments, professionals, services, statusLabels } from '../data/mockData';
import Calendar from './Calendar';
import DailySchedule from './DailySchedule';
import AppointmentModal from './AppointmentModal';
import CreateReservationModal from './CreateReservationModal';

const AgendaTab = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [view, setView] = useState('calendar'); // 'calendar' or 'day'
  const [appointmentsList, setAppointmentsList] = useState(appointments);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setView('day');
  };

  const handleBackToCalendar = () => {
    setView('calendar');
    setSelectedDate(null);
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleCloseModal = () => {
    setSelectedAppointment(null);
  };

  const handleCreateReservation = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleCreateReservationSubmit = (newAppointment) => {
    setAppointmentsList([...appointmentsList, newAppointment]);
    setShowCreateModal(false);
  };

  const handleUpdateAppointment = (updatedAppointment) => {
    setAppointmentsList(
      appointmentsList.map((apt) =>
        apt.id === updatedAppointment.id ? updatedAppointment : apt
      )
    );
    setSelectedAppointment(null);
  };

  const handleCancelAppointment = (appointmentId) => {
    setAppointmentsList(
      appointmentsList.map((apt) =>
        apt.id === appointmentId ? { ...apt, status: 'cancelado' } : apt
      )
    );
    setSelectedAppointment(null);
  };

  const handleCompleteAppointment = (appointmentId) => {
    setAppointmentsList(
      appointmentsList.map((apt) =>
        apt.id === appointmentId ? { ...apt, status: 'concluido' } : apt
      )
    );
    setSelectedAppointment(null);
  };

  return (
    <div className="admin-content">
      {view === 'calendar' ? (
        <>
          <div className="page-header">
            <div className="page-title-section">
              <h1 className="page-title">Agenda</h1>
              <p className="page-subtitle">Gerencie seus agendamentos</p>
            </div>
            <div className="page-actions">
              <button className="action-btn primary-btn" onClick={handleCreateReservation}>
                <span className="btn-icon">+</span>
                Criar Reserva Manual
              </button>
            </div>
          </div>
          <Calendar
            onDateSelect={handleDateSelect}
            appointments={appointmentsList}
          />
        </>
      ) : (
        <>
          <div className="page-header">
            <div className="page-title-section">
              <button className="action-btn secondary-btn" onClick={handleBackToCalendar}>
                ← Voltar
              </button>
            </div>
          </div>
          <DailySchedule
            date={selectedDate}
            appointments={appointmentsList}
            onAppointmentClick={handleAppointmentClick}
            onCreateReservation={handleCreateReservation}
          />
        </>
      )}

      {selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={handleCloseModal}
          onUpdate={handleUpdateAppointment}
          onCancel={handleCancelAppointment}
          onComplete={handleCompleteAppointment}
          professionals={professionals}
          services={services}
          appointments={appointmentsList}
        />
      )}

      {showCreateModal && (
        <CreateReservationModal
          onClose={handleCloseCreateModal}
          onSubmit={handleCreateReservationSubmit}
          professionals={professionals}
          services={services}
          appointments={appointmentsList}
        />
      )}
    </div>
  );
};

export default AgendaTab;
