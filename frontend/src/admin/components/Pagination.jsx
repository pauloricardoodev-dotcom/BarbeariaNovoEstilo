import { useState } from 'react';

const Pagination = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => {
  const [itemsPerPageOptions] = useState([5, 10, 20, 50]);
  const [currentItemsPerPage, setCurrentItemsPerPage] = useState(itemsPerPage);

  const totalPages = Math.ceil(totalItems / currentItemsPerPage);
  const startItem = (currentPage - 1) * currentItemsPerPage + 1;
  const endItem = Math.min(currentPage * currentItemsPerPage, totalItems);

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value);
    setCurrentItemsPerPage(newItemsPerPage);
    onPageChange(1, newItemsPerPage);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page, currentItemsPerPage);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages.map((page, index) => (
      <button
        key={index}
        className={`page-number ${page === currentPage ? 'active' : ''} ${page === '...' ? 'ellipsis' : ''}`}
        onClick={() => typeof page === 'number' && handlePageChange(page)}
        disabled={page === '...'}
      >
        {page}
      </button>
    ));
  };

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Mostrando {startItem} a {endItem} de {totalItems} agendamentos
      </div>

      <div className="pagination-controls">
        <button
          className="pagination-button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ← Anterior
        </button>

        <div className="page-numbers">
          {renderPageNumbers()}
        </div>

        <button
          className="pagination-button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Próximo →
        </button>
      </div>

      <div className="pagination-per-page">
        <label htmlFor="itemsPerPage">Itens por página:</label>
        <select
          id="itemsPerPage"
          value={currentItemsPerPage}
          onChange={handleItemsPerPageChange}
          className="items-per-page-select"
        >
          {itemsPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Pagination;