export interface EmailMensagem {
  para: string;
  assunto: string;
  texto: string;
}

/** Erro ao falar com o provedor; a mensagem é só para log, nunca para o usuário. */
export class FalhaEnvioError extends Error {}

/** Envio de e-mails transacionais. Implementação escolhida por EMAIL_PROVEDOR. */
export abstract class EmailService {
  abstract enviar(mensagem: EmailMensagem): Promise<void>;
}

/** Resposta do barbeiro a um pedido de cancelamento, para avisar o cliente. */
export interface AvisoCancelamento {
  /** true = cancelamento aprovado; false = recusado (o horário foi mantido). */
  aprovado: boolean;
  servico: string;
  /** Dia e hora do atendimento já formatados ('15/10/2026' e '09:00'). */
  data: string;
  hora: string;
  /** Resposta opcional escrita pelo barbeiro. */
  resposta?: string | null;
}

/** Aviso ao cliente de que o barbeiro mudou o horário do atendimento. */
export interface AvisoReagendamento {
  servico: string;
  /** Novo dia e hora já formatados ('16/10/2026' e '14:00'). */
  data: string;
  hora: string;
}

export function textoAvisoReagendamento(a: AvisoReagendamento): string {
  return `Seu horário foi reagendado pela barbearia: ${a.servico} agora é em ${a.data} às ${a.hora}.`;
}

/** Texto do aviso (usado no log de desenvolvimento; os templates da Meta têm o próprio texto aprovado). */
export function textoAvisoCancelamento(a: AvisoCancelamento): string {
  const base = a.aprovado
    ? `Seu cancelamento foi aprovado: ${a.servico} em ${a.data} às ${a.hora}.`
    : `Seu pedido de cancelamento foi recusado e o horário foi mantido: ${a.servico} em ${a.data} às ${a.hora}.`;
  return a.resposta ? `${base} Mensagem da barbearia: ${a.resposta}` : base;
}

/** Envio de mensagens por WhatsApp. Implementação escolhida por WHATSAPP_PROVEDOR. */
export abstract class WhatsAppService {
  /** `telefone` em E.164. */
  abstract enviarCodigoVerificacao(
    telefone: string,
    codigo: string,
  ): Promise<void>;

  /** Avisa o cliente de que o barbeiro reagendou o atendimento. `telefone` em E.164. */
  abstract enviarAvisoReagendamento(
    telefone: string,
    aviso: AvisoReagendamento,
  ): Promise<void>;

  /** Avisa o cliente de que o pedido de cancelamento foi aprovado ou recusado. `telefone` em E.164. */
  abstract enviarAvisoCancelamento(
    telefone: string,
    aviso: AvisoCancelamento,
  ): Promise<void>;
}
