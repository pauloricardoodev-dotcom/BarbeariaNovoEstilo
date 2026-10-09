# Funcionalidades — Painel admin (`frontend/src/admin`)

Acesso: `/admin.html`. Sem autenticação. UI feita com classes do Bootstrap 5 (grid `row/col`, `card`, `table`, `form-*`, `btn`, `badge`, `alert`, `list-group`); modais via `AdminModal` (markup `.modal` do Bootstrap, sem o JS do Bootstrap). Layout: `AdminSidebar` (colapsável, ←/→) + `<main>` com a aba ativa (`activeTab` em `AdminPanel`). "Sair" redireciona para `/`.

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
CRUD em memória: listar, **adicionar**, **editar**, **remover** (modal de confirmação). Campos: nome*, descrição, preço*, duração (min)*, status (ativo/inativo).

## Aba Profissionais (`ProfessionalsTab.jsx`)
CRUD em memória: listar, adicionar, editar, remover (confirmação). Campos: nome*, cargo*, iniciais* (auto-sugeridas a partir do nome via `handleNameChange`), status.

## Aba Configurações (`SettingsTab.jsx`)
Formulário **apenas visual** (inputs `defaultValue`, botões Cancelar/Salvar sem ação): dados da barbearia (nome, telefone, endereço, horário), horários da manhã/tarde, política de agendamento (mín. horas / máx. dias), notificações (e-mail, lembretes).

## Dados mock (`data/mockData.js`)
`appointments` (agendados/concluídos/cancelados, set/2026), `stats`, `statusLabels`, `services` (6), `professionals` (3).
