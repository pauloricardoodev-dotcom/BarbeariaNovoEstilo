// SDK do Mercado Pago no navegador (MercadoPago.js v2), usado pelo formulário de cartão (Card Payment Brick).
// Os campos do cartão são iframes do Mercado Pago: número, validade e CVV não passam nem pelo nosso
// JavaScript; ao nosso backend chega só o token.

const URL_SDK = 'https://sdk.mercadopago.com/js/v2';

let carregamento = null;
const carregarSdk = () => {
  if (window.MercadoPago) return Promise.resolve();
  if (!carregamento) {
    carregamento = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = URL_SDK;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        carregamento = null;
        script.remove();
        reject(new Error('Não foi possível carregar o pagamento por cartão. Tente novamente.'));
      };
      document.head.appendChild(script);
    });
  }
  return carregamento;
};

/** Instância do SDK com a chave pública da aplicação (vem do backend: GET /api/pagamentos/config). */
export const carregarMercadoPago = async (chavePublica) => {
  if (!chavePublica) throw new Error('Pagamento com cartão indisponível no momento.');
  await carregarSdk();
  return new window.MercadoPago(chavePublica, { locale: 'pt-BR' });
};
