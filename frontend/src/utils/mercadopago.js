// SDK do Mercado Pago no navegador (MercadoPago.js v2): gera o token do cartão.
// O número, a validade e o CVV vão direto para o Mercado Pago; ao nosso backend chega só o token.

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

const digitos = (valor) => valor.replace(/\D/g, '');

/**
 * Tokeniza o cartão. Retorna `{ token, metodoId, emissorId }`.
 * `cartao`: { numero, nome, validade 'MM/AA', cvv, cpf }.
 */
export const criarTokenCartao = async (chavePublica, cartao) => {
  await carregarSdk();
  const mp = new window.MercadoPago(chavePublica, { locale: 'pt-BR' });
  const numero = digitos(cartao.numero);
  const [mes, ano] = cartao.validade.split('/');

  try {
    // Bandeira e emissor a partir do BIN (primeiros dígitos do cartão).
    const { results } = await mp.getPaymentMethods({ bin: numero.slice(0, 8) });
    const metodo = results?.[0];
    if (!metodo) throw new Error('bandeira');

    const resposta = await mp.createCardToken({
      cardNumber: numero,
      cardholderName: cartao.nome,
      cardExpirationMonth: mes,
      cardExpirationYear: `20${ano}`,
      securityCode: digitos(cartao.cvv),
      identificationType: 'CPF',
      identificationNumber: digitos(cartao.cpf),
    });
    if (!resposta?.id) throw new Error('token');
    return {
      token: resposta.id,
      metodoId: metodo.id,
      ...(metodo.issuer?.id ? { emissorId: String(metodo.issuer.id) } : {}),
    };
  } catch {
    throw new Error('Não foi possível validar o cartão. Confira os dados e tente novamente.');
  }
};
