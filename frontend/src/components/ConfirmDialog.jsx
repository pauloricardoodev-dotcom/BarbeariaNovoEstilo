import { useEffect, useId, useRef } from 'react';

/**
 * Pergunta em <dialog> nativo (modal: prende o foco e fecha com Esc).
 * Dois botões com ações próprias; Esc ou clique no fundo chamam `onFechar`.
 */
const ConfirmDialog = ({
  aberto,
  titulo,
  children,
  textoPrimario,
  onPrimario,
  textoSecundario,
  onSecundario,
  onFechar,
}) => {
  const ref = useRef(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault(); // quem fecha é o estado do pai
        onFechar();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onFechar(); // clique no fundo
      }}
    >
      <h3 id={idTitulo}>{titulo}</h3>
      <div className="confirm-dialog-texto">{children}</div>
      <div className="confirm-dialog-acoes">
        <button type="button" className="btn btn-outline" onClick={onSecundario}>
          {textoSecundario}
        </button>
        <button type="button" className="btn btn-primary" onClick={onPrimario}>
          {textoPrimario}
        </button>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;
