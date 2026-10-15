// Pix "copia e cola" estático (BR Code / EMV) com valor, para o barbeiro cobrar no salão.
// A chave é pública (é a que se informa para receber), então pode ficar em variável VITE_.

const campo = (id, valor) => `${id}${String(valor.length).padStart(2, '0')}${valor}`;

const semAcento = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

// CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF), exigido no fim do payload.
const crc16 = (texto) => {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i += 1) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

export const pixConfigurado = () => !!import.meta.env.VITE_PIX_CHAVE;

/** Payload Pix para `valor` reais; retorna null se a chave não estiver configurada. */
export const gerarPayloadPix = (valor) => {
  const chave = import.meta.env.VITE_PIX_CHAVE;
  if (!chave) return null;
  const nome = semAcento(import.meta.env.VITE_PIX_NOME || 'Barbearia Novo Estilo').slice(0, 25);
  const cidade = semAcento(import.meta.env.VITE_PIX_CIDADE || 'CURITIBA').slice(0, 15).toUpperCase();

  const semCrc =
    campo('00', '01') +
    campo('26', campo('00', 'br.gov.bcb.pix') + campo('01', chave)) +
    campo('52', '0000') +
    campo('53', '986') +
    campo('54', valor.toFixed(2)) +
    campo('58', 'BR') +
    campo('59', nome) +
    campo('60', cidade) +
    campo('62', campo('05', '***')) +
    '6304';
  return semCrc + crc16(semCrc);
};
