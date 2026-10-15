import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** QR Code de um payload Pix (BR Code). */
export const PixQr = ({ payload }) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let ativo = true;
    QRCode.toDataURL(payload, { margin: 1, width: 320 }).then((u) => ativo && setUrl(u));
    return () => {
      ativo = false;
    };
  }, [payload]);

  return url ? <img className="qr" src={url} alt="QR Code Pix" width={160} height={160} /> : <div className="qr" />;
};

/** Código "copia e cola" do Pix com botão de copiar. */
const PixCodigo = ({ payload }) => {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // Sem permissão de área de transferência: seleciona o texto para copiar à mão.
      document.getElementById('pix-copia-cola')?.select();
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="pix-copia">
      <label htmlFor="pix-copia-cola">Ou use o Pix copia e cola</label>
      <textarea id="pix-copia-cola" readOnly rows={3} value={payload} onFocus={(e) => e.target.select()} />
      <button type="button" className="btn btn-outline" onClick={copiar}>
        {copiado ? 'Código copiado ✓' : 'Copiar código'}
      </button>
    </div>
  );
};

export default PixCodigo;
