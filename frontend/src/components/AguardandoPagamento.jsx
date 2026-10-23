import { useEffect, useRef, useState } from 'react';
import { consultarPagamento } from '../api/pagamentos';
import PixCodigo, { PixQr } from './PixCodigo';

const INTERVALO_MS = 4000;
const ENCERRADOS = ['recusado', 'cancelado', 'expirado'];

const formatarRestante = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Espera o pagamento online de uma reserva provisória: mostra o Pix (se houver), a contagem da reserva
 * e consulta o andamento até o servidor confirmar (webhook do gateway) ou a reserva vencer.
 * Quem confirma é sempre o servidor; nenhum clique do cliente conta como pagamento.
 */
const AguardandoPagamento = ({ agendamentoId, pixCopiaCola, valor, expiraEm, onPago, onEncerrado }) => {
  const [agora, setAgora] = useState(() => Date.now());
  const callbacks = useRef({ onPago, onEncerrado });
  const finalizado = useRef(false);

  useEffect(() => {
    callbacks.current = { onPago, onEncerrado };
  });

  const fim = new Date(expiraEm).getTime();
  const restante = fim - agora;

  useEffect(() => {
    finalizado.current = false;

    const verificar = async () => {
      if (finalizado.current) return;
      try {
        const p = await consultarPagamento(agendamentoId);
        if (finalizado.current) return;
        if (p.status === 'aprovado') {
          finalizado.current = true;
          callbacks.current.onPago();
        } else if (ENCERRADOS.includes(p.status) || p.agendamento.status === 'cancelado') {
          finalizado.current = true;
          callbacks.current.onEncerrado(p.status);
        }
      } catch {
        // Falha de rede passageira: tenta de novo no próximo ciclo.
      }
    };

    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    const consulta = setInterval(verificar, INTERVALO_MS);
    return () => {
      finalizado.current = true;
      clearInterval(relogio);
      clearInterval(consulta);
    };
  }, [agendamentoId]);

  // Fim do prazo: última conferência (o pagamento pode ter entrado no último segundo).
  const vencido = restante <= 0;
  useEffect(() => {
    if (!vencido) return undefined;
    let ativo = true;
    const espera = setTimeout(async () => {
      try {
        const p = await consultarPagamento(agendamentoId);
        if (!ativo) return;
        if (p.status === 'aprovado') callbacks.current.onPago();
        else callbacks.current.onEncerrado('expirado');
      } catch {
        if (ativo) callbacks.current.onEncerrado('expirado');
      }
    }, 2500);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [vencido, agendamentoId]);

  return (
    <div className="aguardando-pgto" role="status" aria-live="polite">
      <h3>{pixCopiaCola ? 'Pague com Pix' : 'Confirmando seu pagamento'}</h3>
      <p className="step-sub">
        {pixCopiaCola
          ? 'Escaneie o QR Code ou use o código copia e cola no app do seu banco. Assim que o pagamento for aprovado, esta tela confirma sozinha.'
          : 'Estamos aguardando a confirmação do seu cartão. Isso costuma levar poucos instantes.'}
      </p>
      <div className="aguardando-valor">R$ {valor.toFixed(2).replace('.', ',')}</div>
      {pixCopiaCola && (
        <div className="pix-box aguardando-pix">
          <PixQr payload={pixCopiaCola} />
          <PixCodigo payload={pixCopiaCola} />
        </div>
      )}
      <p className="aguardando-prazo">
        {vencido ? (
          'Verificando seu pagamento…'
        ) : (
          <>
            Seu horário está reservado por <b>{formatarRestante(restante)}</b>.
          </>
        )}
      </p>
    </div>
  );
};

export default AguardandoPagamento;
