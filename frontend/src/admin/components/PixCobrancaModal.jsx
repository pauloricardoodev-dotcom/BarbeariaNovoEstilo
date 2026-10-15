import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { gerarPayloadPix } from '../../utils/pix';
import { nomeDoAgendamento } from '../api/agendamentos';
import AdminModal from './AdminModal';

/** QR Code Pix com o valor do agendamento, para quando o cliente troca o dinheiro por Pix no salão. */
const PixCobrancaModal = ({ agendamento: a, onClose }) => {
  const payload = gerarPayloadPix(a.preco);
  const [qr, setQr] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!payload) return undefined;
    let ativo = true;
    QRCode.toDataURL(payload, { margin: 1, width: 280 }).then((url) => ativo && setQr(url));
    return () => {
      ativo = false;
    };
  }, [payload]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <AdminModal title="Cobrar via Pix" onClose={onClose}>
      {!payload ? (
        <p className="mb-0">
          Chave Pix não configurada. Defina <code>VITE_PIX_CHAVE</code> (e, se quiser, <code>VITE_PIX_NOME</code> e{' '}
          <code>VITE_PIX_CIDADE</code>) no <code>.env</code> do frontend e reinicie o servidor.
        </p>
      ) : (
        <div className="text-center">
          <p className="mb-1 text-secondary">{nomeDoAgendamento(a)} · {a.servico.nome}</p>
          <p className="h4 mb-3">R$ {a.preco.toFixed(2)}</p>
          {qr ? <img src={qr} alt="QR Code Pix" width={280} height={280} /> : <p>Gerando…</p>}
          <button type="button" className="btn btn-outline-primary btn-sm d-block mx-auto mt-3" onClick={copiar}>
            {copiado ? 'Código copiado!' : 'Copiar Pix copia e cola'}
          </button>
          <p className="small text-secondary mt-3 mb-0">
            Confira o recebimento no app do banco antes de marcar como concluído.
          </p>
        </div>
      )}
    </AdminModal>
  );
};

export default PixCobrancaModal;
