import { afterEach, describe, expect, it, vi } from 'vitest';
import { FalhaEnvioError } from './mensagens.types.js';
import { WhatsAppCloudApiService } from './provedores-http.js';

const ENV = {
  WHATSAPP_TOKEN: 'token-secreto',
  WHATSAPP_PHONE_NUMBER_ID: '12345',
  WHATSAPP_TEMPLATE_VERIFICACAO: 'codigo_verificacao',
  WHATSAPP_TEMPLATE_CANCELAMENTO_APROVADO: 'cancelamento_aprovado',
  WHATSAPP_TEMPLATE_CANCELAMENTO_RECUSADO: 'cancelamento_recusado',
  WHATSAPP_TEMPLATE_REAGENDAMENTO: 'reagendamento',
  WHATSAPP_TEMPLATE_IDIOMA: 'pt_BR',
  WHATSAPP_API_VERSAO: 'v23.0',
};

const AVISO = {
  aprovado: true,
  servico: 'Corte Masculino',
  data: '15/10/2026',
  hora: '09:00',
  resposta: 'Sem problemas',
};

function simularFetch(ok = true) {
  const fetchFake = vi.fn(() =>
    Promise.resolve(
      new Response(ok ? '{}' : '{"error":"x"}', { status: ok ? 200 : 400 }),
    ),
  );
  vi.stubGlobal('fetch', fetchFake);
  return fetchFake;
}

function corpoEnviado(fetchFake: ReturnType<typeof simularFetch>) {
  const [url, opcoes] = fetchFake.mock.calls[0] as unknown as [
    string,
    RequestInit,
  ];
  return { url, opcoes, corpo: JSON.parse(opcoes.body as string) };
}

describe('WhatsAppCloudApiService.enviarAvisoCancelamento', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('usa o template de aprovado com as 4 variáveis na ordem e sem o "+" do telefone', async () => {
    const fetchFake = simularFetch();
    await new WhatsAppCloudApiService(ENV).enviarAvisoCancelamento(
      '+5541999990000',
      AVISO,
    );
    const { url, opcoes, corpo } = corpoEnviado(fetchFake);
    expect(url).toBe('https://graph.facebook.com/v23.0/12345/messages');
    expect((opcoes.headers as Record<string, string>).Authorization).toBe(
      'Bearer token-secreto',
    );
    expect(corpo).toMatchObject({
      messaging_product: 'whatsapp',
      to: '5541999990000',
      type: 'template',
      template: { name: 'cancelamento_aprovado', language: { code: 'pt_BR' } },
    });
    expect(corpo.template.components[0].parameters).toEqual([
      { type: 'text', text: 'Corte Masculino' },
      { type: 'text', text: '15/10/2026' },
      { type: 'text', text: '09:00' },
      { type: 'text', text: 'Sem problemas' },
    ]);
  });

  it('usa o template de recusado e troca a mensagem vazia por "—"', async () => {
    const fetchFake = simularFetch();
    await new WhatsAppCloudApiService(ENV).enviarAvisoCancelamento(
      '+5541999990000',
      { ...AVISO, aprovado: false, resposta: '   ' },
    );
    const { corpo } = corpoEnviado(fetchFake);
    expect(corpo.template.name).toBe('cancelamento_recusado');
    expect(corpo.template.components[0].parameters[3].text).toBe('—');
  });

  it('sem o template configurado, falha com um erro claro e nem chama a Meta', async () => {
    const fetchFake = simularFetch();
    const servico = new WhatsAppCloudApiService({
      ...ENV,
      WHATSAPP_TEMPLATE_CANCELAMENTO_APROVADO: '',
    });
    await expect(
      servico.enviarAvisoCancelamento('+5541999990000', AVISO),
    ).rejects.toBeInstanceOf(FalhaEnvioError);
    expect(fetchFake).not.toHaveBeenCalled();
  });

  it('resposta de erro da Meta vira FalhaEnvioError', async () => {
    simularFetch(false);
    await expect(
      new WhatsAppCloudApiService(ENV).enviarAvisoCancelamento(
        '+5541999990000',
        AVISO,
      ),
    ).rejects.toBeInstanceOf(FalhaEnvioError);
  });
});

describe('WhatsAppCloudApiService.enviarAvisoReagendamento', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('usa o template de reagendamento com serviço, nova data e nova hora', async () => {
    const fetchFake = simularFetch();
    await new WhatsAppCloudApiService(ENV).enviarAvisoReagendamento(
      '+5541999990000',
      { servico: 'Corte Masculino', data: '16/10/2026', hora: '14:00' },
    );
    const { corpo } = corpoEnviado(fetchFake);
    expect(corpo.to).toBe('5541999990000');
    expect(corpo.template.name).toBe('reagendamento');
    expect(corpo.template.components[0].parameters).toEqual([
      { type: 'text', text: 'Corte Masculino' },
      { type: 'text', text: '16/10/2026' },
      { type: 'text', text: '14:00' },
    ]);
  });

  it('sem o template configurado, falha com erro claro e não chama a Meta', async () => {
    const fetchFake = simularFetch();
    const servico = new WhatsAppCloudApiService({
      ...ENV,
      WHATSAPP_TEMPLATE_REAGENDAMENTO: '',
    });
    await expect(
      servico.enviarAvisoReagendamento('+5541999990000', {
        servico: 'Corte',
        data: '16/10/2026',
        hora: '14:00',
      }),
    ).rejects.toBeInstanceOf(FalhaEnvioError);
    expect(fetchFake).not.toHaveBeenCalled();
  });
});
