// Modal do Bootstrap controlado por React (sem o JS do Bootstrap).
// Clicar fora fecha; `showClose` mostra o botão "x" no cabeçalho.
const AdminModal = ({ title, onClose, footer, showClose = true, size, children }) => (
  <>
    <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size ? `modal-${size}` : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            {showClose && (
              <button type="button" className="btn-close" aria-label="Fechar" onClick={onClose} />
            )}
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>
    <div className="modal-backdrop show" />
  </>
);

export default AdminModal;
