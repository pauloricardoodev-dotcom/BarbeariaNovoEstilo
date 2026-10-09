# Arquitetura

## Duas apps Vite no mesmo projeto (multi-page)
| Página | HTML | Entry | Raiz React |
|---|---|---|---|
| Site público | `frontend/index.html` | `src/main.jsx` (importa `bootstrap-grid` e `bootstrap-utilities`) | `src/App.jsx` |
| Admin | `frontend/admin.html` | `src/admin-main.jsx` (importa o Bootstrap **completo** + `admin/styles/admin.css`) | `src/admin/AdminDashboard.jsx` → `AdminPanel.jsx` |

`vite.config.js` só tem o plugin React — o `admin.html` é servido em dev, mas **não há `rollupOptions.input` multi-page**, então o `build` provavelmente só gera `index.html` (verificar). Não há login/autenticação no admin; o botão "Sair" faz `window.location.href = '/'`.

## Pastas (`frontend/src`)
```
App.jsx                 monta Header, Hero, Services, Booking, About, Footer; guarda preSelectedService
components/             site público (Header, Hero, Services, Booking, About, Footer)
data/constants.js       SERVICES, PROS, WEEKDAYS, MONTHS, TIMES_MANHA, TIMES_TARDE, STEP_LABELS, HERO_STATS
styles/globals.css      CSS do site público
admin/
  AdminPanel.jsx        layout + troca de aba por estado (agenda|dashboard|services|professionals|settings)
  components/           abas e modais; compartilhados: AdminModal (modal Bootstrap controlado por React), PageHeader, StatusBadge
  data/mockData.js      appointments (~700 linhas), stats, statusLabels, services, professionals
  styles/admin.css      só tema (variáveis Bootstrap, sidebar, calendário, gráfico); o resto é Bootstrap
frontend/public/assets/ hero.jpg, LogoNE.jpeg ; public/favicon.svg, icons.svg
```

## Dados
- **Site público**: `data/constants.js`. Serviços com `id` string (`corte-masculino`), `price`, `duration`.
- **Admin**: `admin/data/mockData.js`. Serviços/profissionais com `id` numérico, `status`, `description`. Agendamento:
  `{ id, date:'DD/MM/YYYY', time:'HH:MM', client:{name,phone,initials}, service:{name,price}, professional:{name,role}, status }`.
- Os dois conjuntos de dados são **independentes** (nomes coincidem, ids/formatos não). Nada é persistido; `localStorage` não é usado.

## Estado
Sem Context/Redux. Cada aba admin copia o mock para `useState` local (`AgendaTab`, `ServicesTab`, `ProfessionalsTab`). Consequência: `DashboardTab` lê `appointments` do mock direto e **não vê** reservas criadas/alteradas na Agenda; criar/editar serviço/profissional não afeta a Agenda nem o site.

## Código órfão (não importado por `AdminPanel`)
`components/Sidebar.jsx`, `Navbar.jsx`, `Filters.jsx`, `Pagination.jsx`, `AppointmentsTable.jsx`, `StatsCards.jsx`, `DetailsModal.jsx`, `EditModal.jsx` — restos de uma versão anterior do admin (tabela paginada com filtros). `AdminSidebar.jsx` é a sidebar em uso. Antes de apagar, confirmar com o usuário.

## Design (do site público)
Tema escuro/grafite, off-white, vermelho escuro de destaque; Playfair Display / Cormorant Garamond (títulos) + Inter (texto). Variáveis CSS em `globals.css` (ex.: `--cream`). Briefing completo em `RefatorancaoVisual.md`.
