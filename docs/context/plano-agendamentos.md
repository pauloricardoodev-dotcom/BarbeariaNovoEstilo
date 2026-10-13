# Plano: agendamentos do site chegando ao admin

Implementação em fases, cada uma testável sozinha. Marque `[x]` ao concluir.
Regras de clientes/contas: [spec-clientes-e-contas.md](spec-clientes-e-contas.md). Regras de negócio: [decisoes.md](decisoes.md).

## Fase 1 — Clientes e contas (backend, e-mail + senha)
- [x] Migration: `clientes` (perfil + credenciais) e `tokens_clientes` (reutilizar `public.atualizar_updated_at()`; RLS + `REVOKE`).
- [x] Normalização de telefone com `libphonenumber-js` (`BR`, E.164, celular).
- [x] `EmailService` e `WhatsAppService` com provedor configurável (log em dev/teste).
- [x] Cadastro, login, verificação de e-mail (código por e-mail) e de telefone (código por WhatsApp), recuperação de senha, `GET/PATCH /me`, troca de senha.
- [x] JWT de cliente separado do admin (audiências distintas; guards não se aceitam).
- [x] Rotas admin de clientes (paginação, por id, atualização).
- [x] Testes unitários + e2e (lista em spec, "Testes mínimos"). Integração contra o banco: `npm run test:db`.
- Migration `20261011150000_clientes` aplicada no Supabase em 2026-10-11.
- Externo (pendente, pode correr em paralelo): conta Meta Business + template de autenticação aprovado; provedor de e-mail com domínio verificado.

## Fase 2 — Login com Google (backend)
- [ ] Validação do ID token com `google-auth-library`, vínculo por `google_sub`/e-mail verificado.
- [ ] Fluxo de "cadastro pendente" pedindo telefone + aceite dos termos.
- Externo: OAuth Client no Google Cloud.

## Fase 3 — Contas no frontend (feita antes da Fase 2, sem o Google)
- [x] Telas de cadastro, login, "esqueci minha senha", redefinir senha, com `autocomplete` correto para o navegador salvar a senha.
- [x] Telas de verificação: código do e-mail e código do WhatsApp (com reenviar).
- [ ] (aguarda Fase 2) Botão "Entrar com Google" (Google Identity Services) + tela de completar cadastro (telefone).
- [x] Páginas `/termos` e `/privacidade` com texto genérico provisório; checkbox de aceite no cadastro.
- [x] Contexto de sessão do cliente; "Minha conta" (editar perfil); Header com Entrar / Minha conta.

## Fase 4 — Serviços
- [x] Tabela `servicos` (nome, descrição, preço, duração, ativo) + `GET /servicos` público (só ativos); `GET/POST /admin/servicos` e `PATCH /admin/servicos/:id` (sem DELETE: "remover" = inativar). Migrations `20261013120000_servicos` e `20261013130000_servicos_iniciais` (6 serviços placeholder, idempotente) **preparadas, ainda não aplicadas no Supabase**.
- [x] Site e aba Serviços do admin leem do banco. (A `AgendaTab` troca o mock na Fase 6.)

## Fase 5 — Agendamentos (backend)
**Implementada em 2026-10-13.** Migration `20261013140000_agendamentos` **preparada, ainda não aplicada no Supabase** (validada num Postgres local descartável, não no banco real). Regras de tempo em `backend/src/agendamentos/horarios.ts`; premissas (almoço 12:00–14:00 bloqueado, slots de 30 min, expediente 08:00–18:00) estão nesse arquivo e mudam num lugar só.
Rotas: `GET /api/disponibilidade?data=&servicoId=` (público); cliente em `/api/clientes/me/agendamentos` (`GET`, `POST`, `POST :id/reagendar`, `POST :id/solicitar-cancelamento`); admin em `/api/admin/agendamentos` (`GET`, `POST` reserva manual, `PATCH :id` concluir/cancelar) e `/api/admin/solicitacoes-cancelamento` (`GET`, `POST :id/decidir`).
- [x] Tabela `agendamentos`:
  - Ou `cliente_id` (FK, agendamento pelo site) ou `nome_avulso` (reserva manual do admin) — `CHECK` de exatamente um.
  - `servico_id` (FK), `inicio`, `fim` (calculado por trigger), `duracao_minutos` e `preco` gravados no agendamento (reserva manual informa a duração), `pagamento` (`pix | cartao | presencial`), `status` (`agendado | concluido | cancelado`), `cancelado_em`, `cancelado_por`.
  - FKs `ON DELETE RESTRICT`.
  - Anti-dupla-reserva via `EXCLUDE USING gist` no intervalo `[inicio, fim)` para status não cancelado (a coluna `fim` existe porque `timestamptz + interval` não é IMMUTABLE e não pode entrar no índice).
- [x] Tabela `reagendamentos` (histórico: agendamento, início anterior, início novo, quando).
- [x] Tabela `solicitacoes_cancelamento`: agendamento, `motivo` (texto obrigatório, não vazio), `status` (`pendente | aprovada | recusada`), resposta opcional do admin, decidido em/por; no máximo uma pendente por agendamento (índice único parcial).
- [x] `GET /disponibilidade?data=&servicoId=` (público, só horários livres; recusa datas fora da janela).
- [x] Cliente logado e verificado (conta não verificada recebe 403; listar não exige verificação):
  - `POST /clientes/me/agendamentos`, `GET /clientes/me/agendamentos`. Horário dentro da janela: a partir de **hoje** (dia de calendário, fuso `America/Sao_Paulo`; hoje só com 2 h de antecedência) até 3 meses; só horários da grade de 30 min, dentro do expediente e fora do almoço.
  - `POST /clientes/me/agendamentos/:id/reagendar` — recebe só o novo dia/hora (serviço/duração não mudam); permitido até 2 h antes do início atual (exatamente 2 h ainda pode); atendimento que já começou/passou nunca; novo horário disponível e dentro da mesma janela; sem limite de vezes. Transação + atualização condicional + constraint contra conflito.
  - `POST /clientes/me/agendamentos/:id/solicitar-cancelamento` (motivo obrigatório; a qualquer momento antes do atendimento). Cliente **não** cancela diretamente.
- [x] Admin: `GET /admin/agendamentos` (filtros `de`, `ate`, `status`, paginação), reserva manual `POST /admin/agendamentos` (nome, serviço, duração, data, hora; não aceita telefone/e-mail; pode usar qualquer minuto e o horário de almoço, mas dentro do expediente, fora de domingo e não no passado), `PATCH /admin/agendamentos/:id` (`concluido` só se já começou, ou `cancelado` direto — cancelar aprova qualquer pedido pendente), `GET /admin/solicitacoes-cancelamento`, `POST /admin/solicitacoes-cancelamento/:id/decidir` (aprovar ⇒ agendamento `cancelado`).
- [x] Testes: `src/agendamentos/horarios.spec.ts` (2 h exato, janela, fuso, almoço…), `test/agendamentos.e2e-spec.ts` (HTTP com banco falso), `test/agendamentos.db-spec.ts` (Postgres real: EXCLUDE, trigger, índice único parcial, corrida de pedidos simultâneos).
- Depende do dono: durações reais, intervalo de almoço, catálogo (ver `decisoes.md`, "Em aberto").

## Fase 6 — Ligar agendamento e admin
- [x] `Booking.jsx`: remover o passo de identificação (dados vêm do perfil); login obrigatório já na abertura do site; aviso se a conta não estiver verificada.
- [x] `Booking.jsx`: envia o agendamento (`POST /clientes/me/agendamentos`); calendário com disponibilidade real (`GET /disponibilidade`; `slotUnavailable` removido). Horário ocupado no meio tempo (409) volta ao passo 2 com a lista atualizada.
- [x] Calendário do site limitado à janela (de hoje até 3 meses, sem domingos; hoje só com 2 h de antecedência).
- [x] "Meus agendamentos" ligado à API: reagendar só o horário (calendário na janela, horários livres reais, desabilitado com o motivo quando o servidor não permite) e "solicitar cancelamento" com motivo obrigatório; mostra o status do pedido (aguardando/recusado/aprovado + resposta). O mock `agendamentosMock.js` foi removido.
- [x] Admin: `AgendaTab` lê a API (mês exibido + pedidos pendentes); reserva manual só com nome/serviço/duração (sem profissional, telefone ou e-mail); lista de pedidos de cancelamento com aprovar/recusar e aviso de pendentes; modal com concluir/cancelar. O modal de edição de horário/serviço foi removido (não há rota para isso).
- Validado de ponta a ponta com o backend real contra um Postgres local descartável (27 verificações: conta não verificada, agendar, horário ocupado, reagendar, pedido de cancelamento recusado/aprovado, reserva manual, isolamento admin × cliente). Falta apenas um teste visual no navegador por você.
- [ ] Dashboard do admin ainda lê o mock (`mockData.appointments`): ligar aos agendamentos reais.
- [ ] Aviso de pedidos pendentes também no menu lateral do admin (hoje só aparece dentro da Agenda).

## Pagamento com cartão (quando houver gateway)
- [x] Alertas "Deseja cadastrar o cartão?" / confirmação sem cadastrar (front).
- [ ] Integrar gateway (ex.: Mercado Pago): tokenização no navegador; salvar no perfil só token + bandeira + 4 últimos dígitos; cartão salvo pré-selecionado nos próximos agendamentos; remover cartão em "Minha conta".

## Depois do MVP
- Avisar o cliente (WhatsApp/e-mail) quando a solicitação de cancelamento for decidida e quando o admin cancelar.
- Lembretes de agendamento via WhatsApp.
