import { useEffect, useRef, useState } from 'react';
import { carregarMercadoPago } from '../utils/mercadopago';

const CONTAINER_ID = 'cartao-mercadopago';

/**
 * Formulário de cartão do Mercado Pago (Card Payment Brick). Os campos do cartão são iframes do próprio
 * Mercado Pago: número, validade e CVV nunca passam pelo nosso código nem pelo nosso servidor. Ao enviar,
 * o Brick devolve um token de uso único, que `onPagar` repassa ao backend (que decide o valor cobrado).
 */
const CartaoMercadoPago = ({ chavePublica, valor, email, onPagar }) => {
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);
  // O Brick guarda o callback da montagem; a ref garante que ele chame sempre o onPagar atual.
  const onPagarRef = useRef(onPagar);
  useEffect(() => {
    onPagarRef.current = onPagar;
  });

  useEffect(() => {
    let controle = null;
    let desmontado = false;

    carregarMercadoPago(chavePublica)
      .then((mp) =>
        mp.bricks().create('cardPayment', CONTAINER_ID, {
          initialization: { amount: valor, payer: { email } },
          customization: {
            paymentMethods: { maxInstallments: 1, types: { excluded: ['debit_card'] } },
            visual: {
              hidePaymentButton: false,
              style: { theme: 'default', customVariables: { baseColor: '#B08D57' } },
            },
          },
          callbacks: {
            onReady: () => !desmontado && setPronto(true),
            // Resolve sempre: recusa e erros são mostrados por quem chamou, fora do Brick.
            onSubmit: async (dados) => {
              await onPagarRef.current(dados).catch(() => {});
            },
            onError: () => !desmontado && setErro('Não foi possível carregar o formulário do cartão. Tente novamente.'),
          },
        }),
      )
      .then((c) => {
        controle = c;
        if (desmontado) c.unmount();
      })
      .catch((e) => !desmontado && setErro(e.message));

    return () => {
      desmontado = true;
      controle?.unmount();
    };
  }, [chavePublica, valor, email]);

  return (
    <div className="cartao-mp">
      {!pronto && !erro && <p className="times-empty">Carregando pagamento com cartão…</p>}
      {erro && (
        <div className="conta-alerta conta-alerta-erro" role="alert">
          {erro}
        </div>
      )}
      <div id={CONTAINER_ID} />
    </div>
  );
};

export default CartaoMercadoPago;
