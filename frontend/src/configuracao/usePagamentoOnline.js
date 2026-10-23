import { useEffect, useState } from 'react';
import { buscarConfigPagamento } from '../api/pagamentos';

// Uma consulta por carregamento da página. Enquanto não responde (ou se falhar) vale o fluxo antigo:
// só uma resposta explícita do servidor liga o pagamento online.
let promessa = null;
const carregar = () => {
  if (!promessa) {
    promessa = buscarConfigPagamento().catch(() => {
      promessa = null;
      return null;
    });
  }
  return promessa;
};

/** `{ carregado, online, chavePublica }` do pagamento online (Mercado Pago). */
export default function usePagamentoOnline() {
  const [config, setConfig] = useState({ carregado: false, online: false, chavePublica: '' });

  useEffect(() => {
    let cancelado = false;
    carregar().then((dados) => {
      if (cancelado) return;
      setConfig({
        carregado: true,
        online: Boolean(dados?.online),
        chavePublica: dados?.chavePublica ?? '',
      });
    });
    return () => {
      cancelado = true;
    };
  }, []);

  return config;
}
