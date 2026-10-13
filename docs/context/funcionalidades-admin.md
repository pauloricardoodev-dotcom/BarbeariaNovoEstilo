# Funcionalidades — Painel admin (`frontend/src/admin`)

Acesso: `/admin` (abas em `/admin/agenda`, `/admin/dashboard`, `/admin/servicos`, `/admin/configuracoes`). **Exige login** (`AdminDashboard` consulta `GET /api/auth/me`; sem sessão mostra `components/LoginPage.jsx`; servidor fora do ar mostra "Tentar novamente"). Chamadas em `admin/api/auth.js`. UI feita com classes do Bootstrap 5 (grid `row/col`, `card`, `table`, `form-*`, `btn`, `badge`, `alert`, `list-group`); modais via `AdminModal` (markup `.modal` do Bootstrap, sem o JS do Bootstrap). Layout: `AdminSidebar` (fixa e sempre aberta no computador; só em tela de celular, < 768px, é recolhível com ←/→ e começa recolhida — hook `hooks/useCelular.js`) + `<main>` com a aba da rota atual (`<Routes>` em `AdminPanel`). "Sair" chama `POST /api/auth/logout` e volta à tela de login; o nome do admin aparece no rodapé da sidebar.

## Aba Agenda (`AgendaTab.jsx`) — aba inicial
Estado: `appointmentsList` (cópia do mock), `view` (`calendar`|`day`), `selectedDate`, modais.
- **Calendário mensal** (`Calendar.jsx`): navegação mês anterior/próximo; mostra agendamentos não cancelados por dia; clicar no dia abre a visão do dia.
- **Agenda do dia** (`DailySchedule.jsx`): lista de agendamentos da data, botão "← Voltar" e "criar reserva"; clicar num agendamento abre o modal.
- **Criar Reserva Manual** (`CreateReservationModal.jsx`): nome*, telefone*, serviço, profissional, data*, horário* (slots manhã/tarde livres para a data, excluindo ocupados não cancelados) + "horário extra" digitado (valida `HH:MM` e conflito). Gera `id: Date.now()`, status `agendado`, iniciais a partir do nome.
- **Modal do agendamento** (`AppointmentModal.jsx`), modos `view | edit | confirm-cancel | confirm-complete`:
  - Ver detalhes; **Editar** (nome, telefone, serviço, profissional, data, horário) com checagem de conflito de data+horário ("Este horário já está ocupado." — considera só data+hora, não o profissional);
  - **Cancelar** (confirmação → status `cancelado`); **Concluir atendimento** (confirmação → `concluido`). Cancelar/Concluir só para agendados.

## Aba Dashboard (`DashboardTab.jsx`)
Seletor dos últimos 6 meses. Cards: clientes no mês, faturamento (soma de concluídos), agendamentos, cancelamentos. Gráfico de barras "Faturamento por Dia" (CSS) e ranking "Serviços Mais Realizados" (top 4, só concluídos). Lê o mock direto (não reflete mudanças da Agenda). Datas do mock são de 09/2026.

## Aba Serviços (`ServicesTab.jsx`)
**Ligada à API** (`admin/api/servicos.js` → `GET/POST /api/admin/servicos`, `PATCH /api/admin/servicos/:id`): listar (inclusive inativos), **adicionar**, **editar** e **inativar** (não há exclusão: serviço usado em agendamentos não pode sumir; reativar = Editar → status Ativo). Campos: nome* (único, sem diferenciar maiúsculas), descrição, preço* (até 2 casas), duração (5–480 min)*, status. Erros do servidor (ex.: nome repetido) aparecem no modal. Depende das migrations `20261013120000_servicos` e `20261013130000_servicos_iniciais` (seed dos 6 serviços placeholder) aplicadas. A `AgendaTab` ainda usa os serviços do mock (Fase 6).

## Aba Profissionais — REMOVIDA do painel (menu e rota), a pedido do cliente; ele quer de volta no futuro. `ProfessionalsTab.jsx` continua no repositório, sem rota (para reativar: rota em `AdminPanel.jsx` + item em `AdminSidebar.jsx`). Descrição da tela antiga:
CRUD em memória: listar, adicionar, editar, remover (confirmação). Campos: nome*, cargo*, iniciais* (auto-sugeridas a partir do nome via `handleNameChange`), status.

## Aba Configurações (`SettingsTab.jsx`)
Formulário **apenas visual** (inputs `defaultValue`, botões Cancelar/Salvar sem ação): dados da barbearia (nome, telefone, endereço, horário), horários da manhã/tarde, política de agendamento (mín. horas / máx. dias), notificações (e-mail, lembretes).

## Dados mock (`data/mockData.js`)
`appointments` (agendados/concluídos/cancelados, set/2026), `stats`, `statusLabels`, `services` (6), `professionals` (3).
