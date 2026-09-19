import { useState } from 'react';

const Filters = ({ onFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    onFilterChange({ searchTerm: e.target.value, selectedDate, selectedStatus });
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    onFilterChange({ searchTerm, selectedDate: e.target.value, selectedStatus });
  };

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    onFilterChange({ searchTerm, selectedDate, selectedStatus: e.target.value });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedDate('');
    setSelectedStatus('');
    onFilterChange({ searchTerm: '', selectedDate: '', selectedStatus: '' });
  };

  return (
    <div className="filters-container">
      <div className="filter-group">
        <div className="filter-item search-filter">
          <span className="filter-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por cliente, telefone ou serviço..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="filter-input"
          />
        </div>

        <div className="filter-item date-filter">
          <span className="filter-icon">📅</span>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="filter-input"
          />
        </div>

        <div className="filter-item status-filter">
          <span className="filter-icon">▼</span>
          <select
            value={selectedStatus}
            onChange={handleStatusChange}
            className="filter-select"
          >
            <option value="">Status</option>
            <option value="confirmed">Confirmado</option>
            <option value="pending">Pendente</option>
            <option value="in_progress">Em andamento</option>
            <option value="completed">Concluído</option>
          </select>
        </div>

        <button className="clear-filters-button" onClick={handleClearFilters}>
          <span className="filter-icon">🔄</span>
          Limpar filtros
        </button>
      </div>
    </div>
  );
};

export default Filters;