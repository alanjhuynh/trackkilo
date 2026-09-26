import Modal from 'react-bootstrap/Modal';

export default function ConfirmModal({ show, title, children, confirmLabel = 'Confirm', busy, onConfirm, onHide }) {
  return (
    <Modal show={show} onHide={busy ? undefined : onHide} centered size="sm" contentClassName="tk-modal">
      <Modal.Body className="tk-confirm-body">
        <h2 className="tk-confirm-title">{title}</h2>
        <div className="tk-confirm-text">{children}</div>
      </Modal.Body>
      <Modal.Footer className="tk-modal-footer">
        <div className="tk-modal-actions">
          <button type="button" className="tk-btn tk-btn-secondary" onClick={onHide} disabled={busy}>Cancel</button>
          <button type="button" className="tk-btn tk-btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spinner-border spinner-border-sm" role="status" aria-label="Working" /> : confirmLabel}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
