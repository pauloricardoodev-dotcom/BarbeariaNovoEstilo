# Gateway de pagamento — briefing e plano

> Briefing para integrar cobrança online no agendamento. **Nada disto foi implementado ainda.** Antes de codar: confirmar as decisões da seção 2 e aprovar o plano da seção 4.

## 1. Situação atual (o que já existe)

- **Site (passo 3 do agendamento, `Booking.jsx`)**: abas **Pix**, **Cartão** e **Presencial**.
  - Pix: QR Code e "copia e cola" reais, mas **estáticos** (chave em `VITE_PIX_CHAVE`, `utils/pix.js`). O cliente clica "Já realizei o pagamento" e **nada confirma** que pagou.
  - Cartão: só formulário (máscaras e validação Luhn em `utils/cartao.js`). **Não cobra nada**; os dados nunca vão ao backend. O fluxo "Deseja cadastrar o cartão?" está pronto no front com `TODO(gateway)`.
  - Presencial: paga na barbearia.
- **Backend**: `agendamentos.pagamento` (`pix | cartao | presencial`, enum `FormaPagamento`) guarda só a forma escolhida. Não há status de pagamento, valor pago, transação, webhook nem estorno.
- **Decisão anterior** (`docs/context/decisoes.md`): premissa de MVP **sem gateway**; gateway só se o dono quiser sinal/cobrança online. Este briefing é o "sim, vamos integrar".

## 2. Decisões que preciso do dono (bloqueiam o código)

> **Respondidas em 2026-10-17** — ver `docs/context/decisoes.md` ("Pagamento online") e a Fase 9 de `docs/context/plano-agendamentos.md`, que substituem as sugestões abaixo: Mercado Pago; valor total; Pix + **débito** + "Pagar no salão"; reserva de **20 min** para todos; estorno automático sempre que o barbeiro autoriza o cancelamento; cartão salvo entra agora; o dono cria a conta.

1. **Qual gateway?** Sugestão: **Mercado Pago** (Pix com confirmação automática + cartão, tokenização, taxas baixas, já citado nos docs). Alternativas: Asaas, Pagar.me, Stripe.
2. **O que cobrar?** Valor **total** na hora, **sinal** (ex.: 30%) ou só garantir o horário? Define o que fica "a pagar" na barbearia.
3. **Métodos online**: só Pix, só cartão ou os dois? Débito/parcelamento? (Sugestão: Pix + cartão de crédito à vista.)
4. **Presencial continua?** (Sugestão: sim, sem cobrança online.)
5. **Cancelamento/estorno**: até quantas horas antes o cliente cancela e recebe de volta? Total ou parcial? O admin pode estornar pelo painel?
6. **Pagamento pendente**: por quanto tempo o horário fica **reservado** esperando o Pix (sugestão: 10 min) antes de liberar.
7. **Salvar cartão no perfil** ("Minha conta"): confirmar que entra agora ou numa fase seguinte.
8. **Conta do gateway**: o dono cria a conta e fornece as credenciais de **teste (sandbox)** e depois as de produção.

## 3. Princípios e segurança

- **Dados de cartão nunca passam pelo nosso backend nem banco.** Tokenização no navegador (SDK do gateway); guardamos no máximo token + bandeira + 4 últimos dígitos. CVV nunca.
- Credenciais **só em variáveis de ambiente** do backend (`.env` ignorado pelo git). Só a **chave pública** do gateway vai ao frontend. Nada de chave secreta no frontend.
- **O backend é quem decide o valor** a cobrar (preço do serviço no banco), nunca o valor vindo do navegador.
- **Webhook** do gateway: validar a **assinatura**, ser **idempotente** (mesmo evento duas vezes não duplica nada) e **reconsultar o pagamento na API do gateway** antes de confirmar. A confirmação do agendamento vem do webhook, **não** do clique do cliente.
- Tabelas novas com **RLS + REVOKE** de `anon`/`authenticated`; constraints no banco como garantia final; nenhuma rota pública que liste dados pessoais; erros internos do banco/gateway nunca expostos.
- Rate limit nas rotas de criação de pagamento. Registrar tudo que é cobrado (auditoria).
- Migration **preparada, não aplicada**: eu não tenho acesso ao Supabase e só afirmo que foi aplicada com a sua confirmação.

## 4. Plano proposto (fases curtas, cada uma com testes)

### Fase A — Banco e modelo
- Migration nova `pagamentos`: `id`, `agendamento_id` (FK RESTRICT), `gateway`, `id_externo` (UNIQUE), `metodo`, `valor_centavos`, `status` (`pendente | aprovado | recusado | cancelado | estornado | expirado`), `criado_em`, `atualizado_em`, dados mínimos da bandeira (se cartão), `payload_bruto` opcional (sem dados sensíveis).
- Tabela `eventos_gateway` (id do evento UNIQUE) para idempotência dos webhooks.
- `agendamentos` ganha status de reserva "aguardando pagamento" com **expiração** (`expira_em`), liberando o horário se não pagar.
- Índices/constraints: um pagamento aprovado por agendamento, valores > 0, transições de status válidas.

### Fase B — Backend (`backend/src/pagamentos/`)
- Interface `GatewayPagamento` abstrata (como o `VerificadorGoogle`), com implementação do gateway escolhido e uma **fake para testes** (sem rede).
- Rotas (cliente logado e verificado): criar cobrança Pix (devolve QR/copia e cola + expiração), pagar com cartão (recebe **token**), consultar status do pagamento do próprio agendamento.
- `POST /api/pagamentos/webhook` (público por necessidade, protegido por assinatura): atualiza pagamento e confirma/expira o agendamento.
- Job/consulta de expiração: libera horários de Pix não pagos.
- Admin: ver pagamento no agendamento, estornar (conforme decisão 5).
- Env novas: credenciais do gateway, `URL_WEBHOOK`, tempo de reserva; validadas em `env.validation.ts` e documentadas em `.env.example`.

### Fase C — Frontend
- Passo 3: Pix gera cobrança real e **espera a confirmação** (polling curto ou aviso ao receber), com contador de expiração; some o botão "Já realizei o pagamento".
- Cartão: campos tokenizados pelo SDK do gateway (os dados não tocam nosso código); tratar recusa com mensagens claras; "Deseja cadastrar o cartão?" passa a salvar de verdade (quando decidido).
- "Meus agendamentos": status do pagamento e, se aplicável, cancelar/estornar.
- Admin: status do pagamento na agenda e no modal do agendamento.

### Fase D — Testes, docs e entrega
- Unit/e2e com gateway **fake**: aprovação, recusa, webhook duplicado, assinatura inválida, expiração, valor adulterado no cliente, dois pedidos para o mesmo horário.
- Teste de ponta a ponta no **sandbox** do gateway (com a sua conta de teste).
- Atualizar `docs/context/` (decisões, plano, site, admin, pendências) e entregar relatório: arquivos, migration, testes reais e passos manuais.

## 5. Passos manuais (do dono/deploy)
- Criar a conta no gateway e passar as credenciais **sandbox**; depois as de produção.
- Cadastrar a URL pública do webhook no painel do gateway.
- Aplicar a migration (`npm run prisma:migrate` em `backend/`) e configurar o `.env` de produção.
- Definir política de cancelamento/estorno e textos legais (termos, reembolso).

## 6. Riscos
- Pix sem webhook funcionando = pagamentos sem confirmação (testar bem no sandbox).
- Horário "preso" por Pix não pago: precisa da expiração (decisão 6).
- Taxas do gateway: decidir se o preço do serviço as absorve.
- Backend precisa estar acessível publicamente para receber o webhook (em desenvolvimento, usar túnel).
