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
- [x] Validação do ID token com `google-auth-library` (`clientes/google.ts`), vínculo por `google_sub`/e-mail. Se o e-mail do cadastro nunca foi verificado, o vínculo descarta a senha e derruba as sessões (impede que quem cadastrou o e-mail de outra pessoa continue com acesso).
- [x] Fluxo de "cadastro pendente" pedindo telefone + aceite dos termos: `POST /api/clientes/auth/google` (devolve `{status:'autenticado',cliente}` ou `{status:'cadastro_pendente',nome,email,tokenPendente}`) e `POST /api/clientes/auth/google/completar` (`tokenPendente`, `telefone`, `aceiteTermos`). Sem migration nova. `tokenPendente` = JWT de 10 min com audiência própria; nenhuma linha no banco até completar.
- [x] Testes: `clientes/google.spec.ts` (unit) e bloco `google` em `test/clientes.db-spec.ts` (14 casos, validação do token mockada). Rodados em 2026-10-16: tsc, lint, `npm test`, `test:e2e` e o bloco `google` do `test:db` passando.
- [x] Externo: OAuth Client (Web) criado no Google Cloud; `GOOGLE_CLIENT_ID` no `backend/.env` e `VITE_GOOGLE_CLIENT_ID` no `frontend/.env`. **Falta** publicar o app (Público-alvo → Em produção) e adicionar o domínio de produção às origens autorizadas antes de abrir para clientes.

## Fase 3 — Contas no frontend (feita antes da Fase 2, sem o Google)
- [x] Telas de cadastro, login, "esqueci minha senha", redefinir senha, com `autocomplete` correto para o navegador salvar a senha.
- [x] Telas de verificação: código do e-mail e código do WhatsApp (com reenviar).
- [x] Botão "Entrar com Google" (Google Identity Services) em `/entrar` e `/cadastro` + etapa "Quase lá" (telefone + termos) e "Minha conta" adaptada a conta só-Google (a API passou a expor `temSenha` em `ClienteAutenticado`). Build e lint do front ok; **falta o teste manual no navegador com uma conta Google real** (o front não tem testes automatizados).
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
  - `POST /clientes/me/agendamentos`, `GET /clientes/me/agendamentos`. Horário dentro da janela: a partir de **hoje** (dia de calendário, fuso `America/Sao_Paulo`; antecedência mínima configurável, fábrica 2 h) até `janelaDias` (configurável, fábrica 90); só horários da grade de 30 min, dentro do expediente (manhã/tarde configuráveis) e fora do almoço.
  - `POST /clientes/me/agendamentos/:id/reagendar` — recebe só o novo dia/hora (serviço/duração não mudam); permitido até 2 h antes do início atual (exatamente 2 h ainda pode); atendimento que já começou/passou nunca; novo horário disponível e dentro da mesma janela; sem limite de vezes. Transação + atualização condicional + constraint contra conflito.
  - `POST /clientes/me/agendamentos/:id/solicitar-cancelamento` (motivo obrigatório; a qualquer momento antes do atendimento). Cliente **não** cancela diretamente.
- [x] Admin: `GET /admin/agendamentos` (filtros `de`, `ate`, `status`, paginação), reserva manual `POST /admin/agendamentos` (nome, serviço, duração, data, hora; não aceita telefone/e-mail; pode usar qualquer minuto e o horário de almoço, mas dentro do expediente, fora de domingo e não no passado), `PATCH /admin/agendamentos/:id` (`concluido` só se já começou, ou `cancelado` direto — cancelar aprova qualquer pedido pendente), `GET /admin/solicitacoes-cancelamento`, `POST /admin/solicitacoes-cancelamento/:id/decidir` (aprovar ⇒ agendamento `cancelado`).
- [x] Testes: `src/agendamentos/horarios.spec.ts` (2 h exato, janela, fuso, almoço…), `test/agendamentos.e2e-spec.ts` (HTTP com banco falso), `test/agendamentos.db-spec.ts` (Postgres real: EXCLUDE, trigger, índice único parcial, corrida de pedidos simultâneos).
- Depende do dono: durações reais, intervalo de almoço, catálogo (ver `decisoes.md`, "Em aberto").

## Fase 6 — Ligar agendamento e admin
- [x] `Booking.jsx`: remover o passo de identificação (dados vêm do perfil); login obrigatório já na abertura do site; aviso se a conta não estiver verificada.
- [x] `Booking.jsx`: envia o agendamento (`POST /clientes/me/agendamentos`); calendário com disponibilidade real (`GET /disponibilidade`; `slotUnavailable` removido). Horário ocupado no meio tempo (409) volta ao passo 2 com a lista atualizada.
- [x] Calendário do site limitado à janela (de hoje até `janelaDias`, sem domingos; antecedência mínima configurável).
- [x] Dias fechados: folgas semanais (dias de trabalho escolhidos em Configurações) e feriados fecham por padrão; o dono pode bloquear/desbloquear dias na Agenda; calendários do site (bolinhas/cilindros pretos) e do admin (caixas pretas) refletem (`dias_especiais`, `GET /api/dias-especiais`, `PUT /api/admin/dias-especiais/:data`).
- [x] Configurações do painel valem no site (nome/contato, manhã e tarde, antecedência, janela): tabela `configuracoes` + `GET/PUT /api/admin/configuracoes`.
- [x] "Meus agendamentos" ligado à API: reagendar só o horário (calendário na janela, horários livres reais, desabilitado com o motivo quando o servidor não permite) e "solicitar cancelamento" com motivo obrigatório; mostra o status do pedido (aguardando/recusado/aprovado + resposta). O mock `agendamentosMock.js` foi removido.
- [x] Admin: `AgendaTab` lê a API (mês exibido + pedidos pendentes); reserva manual só com nome/serviço/duração (sem profissional, telefone ou e-mail); lista de pedidos de cancelamento com aprovar/recusar e aviso de pendentes; modal com concluir/cancelar. O modal de edição de horário/serviço foi removido (não há rota para isso).
- Validado de ponta a ponta com o backend real contra um Postgres local descartável (27 verificações: conta não verificada, agendar, horário ocupado, reagendar, pedido de cancelamento recusado/aprovado, reserva manual, isolamento admin × cliente). Falta apenas um teste visual no navegador por você.
- [x] Dashboard do admin ligado aos agendamentos reais (`GET /api/admin/dashboard`).
- [x] Aviso de pedidos pendentes no menu lateral: item "Notificações" (sino) com ponto vermelho, página própria; barbeiro reagenda um agendamento pelo modal ("Reagendamento").

## Fase 9 — Pagamento online (Mercado Pago) — **decidido em 2026-10-17, não iniciado**
Regras de negócio em [decisoes.md](decisoes.md), "Pagamento online". Valor total; Pix + débito online + "Pagar no salão"; reserva de 20 min; estorno automático quando o barbeiro cancela um agendamento pago; cartão salvo entra agora.
- [x] Alertas "Deseja cadastrar o cartão?" / confirmação sem cadastrar (front).
- [ ] **A — Banco.** Migration `pagamentos` + `cartoes_salvos` + `eventos_gateway` (RLS + REVOKE):
  - `agendamentos.status` ganha `aguardando_pagamento` e `expirado`; coluna `reserva_expira_em`. A reserva temporária **entra no `EXCLUDE`** (bloqueia o horário para todos); `expirado`, como `cancelado`, não bloqueia.
  - Como uma constraint não pode depender de `now()`, a expiração é gravada: antes de criar/reagendar, na mesma transação, reservas vencidas viram `expirado`; um job periódico (a cada minuto) faz o mesmo para liberar a disponibilidade pública.
  - No máximo **uma reserva temporária ativa por cliente** (índice único parcial) — impede alguém de prender vários horários.
  - `pagamentos`: agendamento (FK RESTRICT), `id_externo` UNIQUE, método (`pix | debito`), `valor_centavos > 0`, status (`pendente | aprovado | recusado | expirado | estornado`), datas; um aprovado por agendamento.
  - `cartoes_salvos`: cliente, id do cartão/cliente no Mercado Pago, bandeira, 4 últimos dígitos, validade. Nunca número nem CVV.
  - `eventos_gateway`: id do evento UNIQUE (webhook idempotente).
  - Enum `FormaPagamento`: `cartao` → `debito` (agendamentos antigos com `cartao` precisam de decisão na migration; hoje não há cobrança real, então nenhum foi pago de fato).
- [ ] **B — Backend `src/pagamentos/`.** Interface `GatewayPagamento` (Mercado Pago real + fake para testes, como o `VerificadorGoogle`).
  - "Reservar horário" com Pix/débito cria o agendamento `aguardando_pagamento` (expira em 20 min) e a cobrança: Pix com `date_of_expiration` = fim da reserva (QR + copia e cola); débito recebe só o **token** do cartão.
  - Webhook `POST /api/pagamentos/webhook`: valida assinatura (`x-signature`), idempotente, **reconsulta o pagamento na API** antes de confirmar. Aprovado dentro do prazo ⇒ `agendado`.
  - **Pagamento aprovado depois da expiração** (ex.: Pix pago no minuto 21) ⇒ se o horário ainda estiver livre, confirma; se outro cliente já pegou, **estorno automático** e aviso ao cliente.
  - Consulta de status pelo cliente (polling do front); retomar a reserva ativa; rota que **desiste** da reserva (libera na hora).
  - Cancelamento pelo admin (direto ou aprovando pedido) de agendamento pago ⇒ estorno total no Mercado Pago; falha no estorno fica registrada e visível no painel para nova tentativa (o cancelamento não é desfeito).
  - Reagendar um agendamento pago mantém o pagamento (o preço não muda; só o horário).
  - Cartão salvo: criar/listar/remover (`/api/clientes/me/cartoes`).
  - Env: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_PUBLIC_KEY` (só esta vai ao front), `RESERVA_PAGAMENTO_MINUTOS=20`; validadas em `env.validation.ts`.
- [ ] **C — Frontend.** Passo de pagamento: Pix real (QR + contador de 20 min + espera da confirmação, sem "Já realizei o pagamento"); débito com o Card Payment Brick do Mercado Pago (dados do cartão não passam pelo nosso código); "Pagar no salão" igual a hoje. Reserva vencida ⇒ "Sessão expirada, por favor agende novamente" e volta ao passo 1. Cartão salvo pré-selecionado (o Mercado Pago ainda pede o CVV a cada pagamento); remover em "Minha conta". "Meus agendamentos" e Agenda do admin mostram o status do pagamento e do estorno.
- [ ] **D — Testes e entrega.** Unit/e2e com gateway fake (aprovado, recusado, webhook duplicado, assinatura inválida, expiração, pago após expirar, valor adulterado, duas reservas simultâneas no mesmo horário, estorno) + teste de ponta a ponta no sandbox com a conta de teste do dono.
- **Passos manuais (dono):** criar a conta Mercado Pago, criar a aplicação em "Suas integrações", passar as credenciais **de teste**; cadastrar a URL do webhook; depois ativar as credenciais de produção. Aplicar a migration.

## Fase 7 — Galeria "Nosso trabalho" no lugar de "Nossos serviços" (site) — **substituída em 2026-10-16**
**Mudança de decisão:** a seção "Nossos serviços" foi **removida** e "Nossa história" (`About.jsx`, agora com fundo claro) ocupa o lugar dela, logo depois do hero. A galeria/vídeo abaixo **não** será feita no formato original; o espaço de fotos de cortes ficou nas **Avaliações** (Fase 8). Falta ainda trocar a ilustração SVG do Sobre por uma foto real, reescrever o texto e corrigir os números fixos ("3 especialistas", "6 serviços").
Motivo: os serviços já aparecem no passo 1 do agendamento; a seção "Nossos serviços" repete a informação.
- [ ] Substituir a seção `Services` por um **carrossel de fotos de cortes** (deslizar no celular, setas/bolinhas no computador, avança sozinho e pausa ao tocar; carrega só a foto da vez) + botão "Agendar horário". O **mini vídeo de apresentação** (capa com botão de play, sem autoplay com som, baixa o vídeo só ao dar play) é **opcional**: se o cliente não quiser gravar um vídeo profissional, ele é substituído pela seção "Sobre a barbearia" abaixo.
- [ ] Menu (Header/Footer): link "Serviços" vira "Galeria"/"Nosso trabalho" (`NAV_LINKS`, `useIrParaSecao`).
- [ ] Decidir o destino do atalho "Agendar" por serviço (hoje pré-seleciona o serviço no passo 1): manter como faixa pequena de serviços acima do agendamento ou remover.
- [ ] **Alternativa ao vídeo — seção "Sobre a barbearia"**: uma **foto à esquerda** e um **texto sobre a barbearia à direita** (no celular, foto em cima e texto embaixo). **Já existe a seção "Sobre"** (`About.jsx`, `#sobre`, fundo escuro) com esse mesmo desenho, mas com uma ilustração SVG no lugar da foto: o trabalho é **trocar a ilustração por uma foto real e reescrever o texto**, não criar uma seção nova (evita duas seções "sobre" na página). Revisar também os números fixos dela ("13 anos", "3 especialistas", "6 serviços"): o produto tem um único barbeiro (ver `decisoes.md`) e os serviços agora variam no painel, então "3 especialistas" e "6 serviços" estão errados e devem ser corrigidos ou removidos. Precisa do texto e da foto do cliente.
- [ ] Pendente de decisão: fotos e vídeo como arquivos fixos em `frontend/public/assets/` (simples; troca pelo código) ou enviados pelo painel (exige armazenamento de imagens e gestão no admin — bem maior). Vídeo: MP4 próprio curto (até ~10 MB) ou link do YouTube/Instagram. Montar primeiro com imagens provisórias.

## Fase 8 — Seção de avaliações (site) — **implementada em 2026-10-16** (com decisões diferentes das propostas abaixo)
Ordem real da página: início → sobre → agendamento → **avaliações** → rodapé.
**Decisões do dono:** publica **na hora** (o dono oculta depois, sem excluir); **qualquer cliente logado** avalia (exigimos conta **verificada**, a mesma regra de agendar — não exige atendimento concluído); fotos no **Supabase Storage**. Uma avaliação ativa por cliente.
- [x] Migration `20261016130000_avaliacoes` (`avaliacoes` + `avaliacao_fotos`; CHECK de nota 1–5 e comentário até 600; índice único parcial "uma ativa por cliente"; no máximo 3 fotos por CHECK/UNIQUE; FK RESTRICT no cliente; RLS + REVOKE). **Preparada, ainda não aplicada no Supabase** — validada num Postgres 18 local descartável (aplicada em cima de todas as migrations, constraints e concorrência testadas), não no banco real: rode `npm run prisma:migrate` em `backend/`.
- [x] Backend `src/avaliacoes/` (rotas e regras em `docs/context/funcionalidades-site-publico.md`, "Avaliações"). Armazenamento abstrato (`armazenamento.ts`): `ARMAZENAMENTO_PROVEDOR=local` (pasta `backend/uploads`, só dev) ou `supabase`. Fotos: `sharp` valida pelo conteúdo, regrava em WebP e remove EXIF/GPS.
- [x] Site: seção `Reviews.jsx`; painel: aba Avaliações (ocultar/mostrar).
- [x] **Refatoração visual da seção (2026-10-16, briefing `AvaliacaoRefatorado.md`)**: novo cabeçalho ("Sua experiência importa."), indicadores só com 3+ avaliações, painel de estado vazio com botão que leva ao formulário. Ajustes pedidos depois: a seção mostra **4 avaliações** + botão "Ver todas" que abre uma **janela** com todas; o **formulário fica à esquerda** das avaliações no desktop; containers mais largos que o texto (≥ 1240 px). Só frontend (`Reviews.jsx`, `avaliacoes.css`): backend, rotas, validações e remoção de metadados não mudaram. Conferido num Chrome real em desktop, tablet (820 px) e celular (390 px), sem estouro horizontal.
- **Passos manuais antes de usar de verdade:** (1) aplicar a migration; (2) no Supabase, criar um bucket **privado** (nome `avaliacoes`, ou outro em `SUPABASE_BUCKET_AVALIACOES`); (3) no `backend/.env` de produção: `ARMAZENAMENTO_PROVEDOR=supabase`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (chave **só no backend**, nunca no frontend nem no git).
- Testes: `test/avaliacoes.e2e-spec.ts` (25), `test/avaliacoes.db-spec.ts` (8, Postgres real), e um teste de ponta a ponta num Chrome real (enviar com foto, ampliar, apagar, ocultar no painel, celular).
- Pendente: o hero ainda mostra `HERO_STATS` fixo ("4.9 avaliação"); ligar à média real. Moderação é só "ocultar depois" (sem aprovação prévia).

### Proposta original (antes das decisões acima)
Posição na página: **depois da seção de agendamento** (ordem: início → galeria → agendamento → **avaliações** → sobre → rodapé).
- [ ] Seção "O que dizem nossos clientes": nota média + quantidade e cartões com nome (primeiro nome), nota (1–5 estrelas), comentário e data; carrossel/grade responsiva.
- [ ] Os números fixos de `HERO_STATS` (ex.: "4.9 avaliação") passam a vir das avaliações reais, ou saem do hero até existirem avaliações.
- [ ] Backend (proposta): tabela `avaliacoes` (agendamento_id único, cliente_id, nota 1–5 por CHECK, comentário, `publicada`, created_at; RLS + `REVOKE`), `GET /avaliacoes` público (só publicadas, sem dado pessoal além do primeiro nome) e criação só por cliente logado, **só para agendamento próprio com status concluído**, uma avaliação por agendamento.
- [ ] Cliente: convite para avaliar em "Meus agendamentos" depois do atendimento concluído (o lembrete por WhatsApp fica para "Depois do MVP").
- [ ] Admin: nova aba para **moderar** (publicar/ocultar; sem excluir, para manter o histórico) e ver a média.
- [ ] Pendente de decisão: publicar na hora ou só após aprovação do dono; permitir resposta do dono; se haverá avaliações iniciais cadastradas à mão enquanto não há clientes avaliando (devem ser identificadas como reais; nada de depoimento inventado).

## Depois do MVP
- ~~Avisar o cliente quando a solicitação de cancelamento for decidida~~ e ~~quando o barbeiro reagenda~~ — **feitos** (WhatsApp; dependem dos templates da Meta). Reagendamento do cliente notifica o barbeiro em Notificações (migration `20261013150000_reagendamentos_notificacao`, sem aprovação). Falta: avisar quando o barbeiro cancela direto um agendamento sem pedido; avisos por e-mail.
- Lembretes de agendamento via WhatsApp.
