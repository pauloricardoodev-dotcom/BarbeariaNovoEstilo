# Funcionalidades — Painel admin (`frontend/src/admin`)

Acesso: `/admin` (abas em `/admin/agenda`, `/admin/dashboard`, `/admin/servicos`, `/admin/configuracoes`). **Exige login** (`AdminDashboard` consulta `GET /api/auth/me`; sem sessão mostra `components/LoginPage.jsx`; servidor fora do ar mostra "Tentar novamente"). Chamadas em `admin/api/auth.js`. UI feita com classes do Bootstrap 5 (grid `row/col`, `card`, `table`, `form-*`, `btn`, `badge`, `alert`, `list-group`); modais via `AdminModal` (markup `.modal` do Bootstrap, sem o JS do Bootstrap). Layout: `AdminSidebar` (fixa e sempre aberta no computador; só em tela de celular, < 768px, é recolhível com ←/→ e começa recolhida — hook `hooks/useCelular.js`) + `<main>` com a aba da rota atual (`<Routes>` em `AdminPanel`). "Sair" chama `POST /api/auth/logout` e volta à tela de login; o nome do admin aparece no rodapé da sidebar.

## Aba Agenda (`AgendaTab.jsx`) — aba inicial
**Ligada à API** (`admin/api/agendamentos.js`): busca os agendamentos do mês exibido (`GET /api/admin/agendamentos?de=&ate=`, todas as páginas) e os pedidos de cancelamento pendentes; recarrega ao trocar de mês e após qualquer alteração. Nada é apagado: cancelar deixa o registro com status `cancelado`.
- **Pedidos de cancelamento** (`SolicitacoesCancelamento.jsx`): quando há pendentes, aparece um aviso amarelo no topo da Agenda ("N pedidos de cancelamento aguardando resposta") com cliente, serviço, dia/hora, motivo, campo de resposta opcional e botões **Aprovar cancelamento** (cancela o agendamento e libera o horário) e **Recusar** (mantém). O cliente vê a decisão e a resposta em "Meus agendamentos".
- **Calendário mensal** (`Calendar.jsx`, mês controlado pela Agenda): quantidade de agendamentos não cancelados por dia e cor de ocupação; clicar no dia abre a visão do dia.
- **Agenda do dia** (`DailySchedule.jsx`): agendamentos do dia em ordem de horário, cada um com botão verde **Marcar como concluído** (conclui o atendimento direto da linha; habilitado só depois que o atendimento começa) — o concluído fica **riscado** e esmaecido, o cancelado só esmaecido; com intervalo (início–fim), serviço, valor e um selo colorido: enquanto **agendado**, mostra a **forma de pagamento** (Pix azul, Crédito roxo, Dinheiro verde — "no salão" aparece como Dinheiro); concluído e cancelado mostram o status; selo "reserva manual" e selo "Cancelamento solicitado"; clicar abre o modal. Dia vazio: "Nenhum agendamento neste dia."
- **Criar Reserva Manual** (`CreateReservationModal.jsx`): **só nome, serviço (ativos), duração (sugerida pelo serviço, editável), dia e hora** — sem telefone, e-mail ou conta. O servidor recusa horário ocupado (409), passado, domingo e fora do expediente 08:00–18:00; aceita qualquer minuto e o horário de almoço.
- **Modal do agendamento** (`AgendamentoModal.jsx`): detalhes (cliente com link para o WhatsApp, serviço, dia, duração, valor, pagamento, status, quando foi registrado) e ação: **Cancelar agendamento** (com confirmação; aprova automaticamente um pedido pendente). Concluir fica só no botão da linha da Agenda do dia. A edição de horário/serviço pelo barbeiro foi removida: ainda não existe rota para isso.

## Aba Dashboard (`DashboardTab.jsx`)
Seletor dos últimos 6 meses. Cards: clientes no mês, faturamento (soma de concluídos), agendamentos, cancelamentos. Gráfico de barras "Faturamento por Dia" (CSS) e ranking "Serviços Mais Realizados" (top 4, só concluídos). Lê o mock direto (não reflete mudanças da Agenda). Datas do mock são de 09/2026.

## Aba Serviços (`ServicesTab.jsx`)
**Ligada à API** (`admin/api/servicos.js` → `GET/POST /api/admin/servicos`, `PATCH /api/admin/servicos/:id`): listar (inclusive inativos), **adicionar**, **editar** e **inativar** (não há exclusão: serviço usado em agendamentos não pode sumir; reativar = Editar → status Ativo). Campos: nome* (único, sem diferenciar maiúsculas), descrição, preço* (até 2 casas), duração (5–480 min)*, status. Erros do servidor (ex.: nome repetido) aparecem no modal. Depende das migrations `20261013120000_servicos` e `20261013130000_servicos_iniciais` (seed dos 6 serviços placeholder) aplicadas. A `AgendaTab` ainda usa os serviços do mock (Fase 6).

## Aba Profissionais — REMOVIDA do painel (menu e rota), a pedido do cliente; ele quer de volta no futuro. `ProfessionalsTab.jsx` continua no repositório, sem rota (para reativar: rota em `AdminPanel.jsx` + item em `AdminSidebar.jsx`). Descrição da tela antiga:
CRUD em memória: listar, adicionar, editar, remover (confirmação). Campos: nome*, cargo*, iniciais* (auto-sugeridas a partir do nome via `handleNameChange`), status.

## Aba Configurações (`SettingsTab.jsx`)
Formulário **apenas visual** (inputs `defaultValue`, botões Cancelar/Salvar sem ação): dados da barbearia (nome, telefone, endereço, horário), horários da manhã/tarde, política de agendamento (mín. horas / máx. dias), notificações (e-mail, lembretes).

## Dados mock (`data/mockData.js`)
Usado só pelo Dashboard e pela aba Profissionais (sem rota): `appointments` (set/2026), `stats`, `statusLabels`, `professionals` (3). `services` não é mais usado (serviços vêm da API).
