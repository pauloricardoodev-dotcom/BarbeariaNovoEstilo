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
- [ ] Tabela `agendamentos`:
  - Ou `cliente_id` (FK, agendamento pelo site) ou `nome_avulso` (reserva manual do admin) — `CHECK` de exatamente um.
  - `servico_id` (FK), `inicio`, `duracao_minutos` e `preco` gravados no agendamento (reserva manual informa a duração), `status` (`agendado | concluido | cancelado`), `cancelado_em`, `cancelado_por`.
  - FKs `ON DELETE RESTRICT`.
  - Anti-dupla-reserva via `EXCLUDE USING gist` no intervalo `[inicio, inicio + duracao)` para status não cancelado.
- [ ] Tabela `reagendamentos` (histórico: agendamento, início anterior, início novo, quando).
- [ ] Tabela `solicitacoes_cancelamento`: agendamento, `motivo` (texto obrigatório, não vazio), `status` (`pendente | aprovada | recusada`), resposta opcional do admin, decidido em/por; no máximo uma pendente por agendamento (índice único parcial).
- [ ] `GET /disponibilidade?data=` (público, só horários livres).
- [ ] Cliente logado e verificado:
  - `POST /me/agendamentos`, `GET /me/agendamentos`. Horário dentro da janela: a partir do dia seguinte (dia de calendário, fuso `America/Sao_Paulo`) até 3 meses.
  - `POST /me/agendamentos/:id/reagendar` — recebe só o novo início (serviço/duração não mudam); permitido até 2 h antes do início atual; novo horário disponível e dentro da mesma janela; sem limite de vezes. Regras no servidor, fuso `America/Sao_Paulo`; transação + constraint contra conflito.
  - `POST /me/agendamentos/:id/solicitar-cancelamento` (motivo obrigatório; a qualquer momento antes do atendimento). Cliente **não** cancela diretamente.
- [ ] Admin: `GET/PATCH /admin/agendamentos`, reserva manual (nome, serviço, duração), cancelar diretamente, listar/aprovar/recusar solicitações de cancelamento (aprovar ⇒ agendamento `cancelado`).
- [ ] Testes das regras de tempo: 2 h antes (limite exato), janela (hoje recusado, amanhã 08:00 aceito mesmo à noite; limite de 3 meses), reagendar para horário ocupado, reagendamentos concorrentes, segunda solicitação pendente recusada.
- Depende do dono: durações reais, intervalo de almoço, catálogo (ver `decisoes.md`, "Em aberto").

## Fase 6 — Ligar agendamento e admin
- [x] `Booking.jsx`: remover o passo de identificação (dados vêm do perfil); login obrigatório já na abertura do site; aviso se a conta não estiver verificada.
- [ ] `Booking.jsx`: enviar o agendamento; calendário com disponibilidade real (remove `slotUnavailable`).
- [ ] Calendário do site limitado à janela (a partir de amanhã, até 3 meses).
- [ ] "Meus agendamentos" em Minha conta: reagendar só o horário, mesmo calendário limitado (oculto/desabilitado a menos de 2 h) e "solicitar cancelamento" com campo de motivo; mostrar status da solicitação.
- [ ] Admin: `AgendaTab` troca `mockData` pela API; reserva manual só com nome/serviço/duração (sem profissional, telefone, e-mail); lista de solicitações de cancelamento com aprovar/recusar e aviso de pendentes.

## Pagamento com cartão (quando houver gateway)
- [x] Alertas "Deseja cadastrar o cartão?" / confirmação sem cadastrar (front).
- [ ] Integrar gateway (ex.: Mercado Pago): tokenização no navegador; salvar no perfil só token + bandeira + 4 últimos dígitos; cartão salvo pré-selecionado nos próximos agendamentos; remover cartão em "Minha conta".

## Depois do MVP
- Avisar o cliente (WhatsApp/e-mail) quando a solicitação de cancelamento for decidida e quando o admin cancelar.
- Lembretes de agendamento via WhatsApp.
