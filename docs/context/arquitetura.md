# Arquitetura

## Um app Vite com React Router
Entrada única: `frontend/index.html` → `src/main.jsx` (`BrowserRouter`) → `src/AppRoutes.jsx`.
| Rota | Componente (lazy) | CSS que carrega |
|---|---|---|
| `/*` | `src/App.jsx` (site público: home + telas de conta, rotas internas) | `bootstrap-grid` + `bootstrap-utilities` + `styles/globals.css` + `styles/conta.css` |
| `/admin/*` | `src/admin/AdminDashboard.jsx` → `AdminPanel.jsx` | Bootstrap **completo** + `admin/styles/admin.css` |
| `/admin.html` | redireciona para `/admin` (endereço antigo) | — |
| rota desconhecida do site | `App.jsx` redireciona para `/` | — |

Rotas do site (`App.jsx`): `/` (HomePage), `/entrar`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha` (token no `#token=`), `/termos`, `/privacidade`; com sessão de cliente (`ExigeCliente`, senão vai a `/entrar?voltar=…`): `/verificar`, `/minha-conta`. Header/Footer aparecem em todas; links de seção usam `useIrParaSecao` (na home rola, fora dela navega para `/#secao`).

Cada área é carregada sob demanda (`React.lazy`) e traz o próprio CSS; os dois CSS **conflitam** (ambos definem `:root`, ex. `--cream`, e builds diferentes do Bootstrap). Por isso, entre site e admin navegue com `<a href>` (recarrega a página), **nunca** com `<Link>`. Dentro do admin as abas são rotas (`/admin/agenda`, `/admin/dashboard`, `/admin/servicos`, `/admin/profissionais`, `/admin/configuracoes`; `/admin` → `agenda`), com `NavLink` na `AdminSidebar`.

`vite.config.js` tem o plugin React e o proxy `/api` → `http://localhost:3000` (backend). Em produção, o servidor precisa devolver `index.html` para qualquer rota não encontrada (fallback de SPA), senão abrir `/admin` direto dá 404.

## Pastas (`frontend/src`)
```
AppRoutes.jsx           rotas (/admin/*, /*) com lazy loading
App.jsx                 casco do site: CSS, SessaoClienteProvider, Header/Footer e rotas
pages/                  HomePage (Hero, Services, Booking, About; guarda preSelectedService) e telas de conta
components/             site público (Header, Hero, Services, Booking, About, Footer)
components/conta/       Campo/CampoSenha, ContaLayout/Alerta, ExigeCliente
api/http.js             fetch para /api + ApiError (usado pelo site e pelo admin)
api/clientes.js         chamadas de /api/clientes/*
sessao/                 contexto da sessão do cliente (useSessaoCliente, destinoSeguro, destinoAposLogin)
utils/                  telefone.js (máscara de exibição), useIrParaSecao.js
data/constants.js       SERVICES, PROS, WEEKDAYS, MONTHS, TIMES_MANHA, TIMES_TARDE, STEP_LABELS, HERO_STATS
styles/globals.css      CSS do site público
styles/conta.css        CSS das telas de conta (reaproveita .field/.btn)
admin/
  AdminDashboard.jsx    portão de login (sessão via /api/auth/me)
  AdminPanel.jsx        layout + rotas das abas (agenda|dashboard|servicos|profissionais|configuracoes)
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
Site: um Context só, a sessão do cliente (`sessao/`), carregada de `GET /api/clientes/me`. Admin: sem Context/Redux. Cada aba admin copia o mock para `useState` local (`AgendaTab`, `ServicesTab`, `ProfessionalsTab`). Consequência: `DashboardTab` lê `appointments` do mock direto e **não vê** reservas criadas/alteradas na Agenda; criar/editar serviço/profissional não afeta a Agenda nem o site.

## Código órfão (não importado por `AdminPanel`)
`components/Sidebar.jsx`, `Navbar.jsx`, `Filters.jsx`, `Pagination.jsx`, `AppointmentsTable.jsx`, `StatsCards.jsx`, `DetailsModal.jsx`, `EditModal.jsx` — restos de uma versão anterior do admin (tabela paginada com filtros). `AdminSidebar.jsx` é a sidebar em uso. Antes de apagar, confirmar com o usuário.

## Design (do site público)
Tema escuro/grafite, off-white, vermelho escuro de destaque; Playfair Display / Cormorant Garamond (títulos) + Inter (texto). Variáveis CSS em `globals.css` (ex.: `--cream`). Briefing completo em `RefatorancaoVisual.md`.

## Backend (`backend/`)
NestJS 12 (TS, ESM) + Prisma 7 (`@prisma/adapter-pg`) sobre Supabase PostgreSQL. Testes com Vitest (`npm test` unitários em `src/**/*.spec.ts`; `npm run test:e2e` em `test/*.e2e-spec.ts`, com Prisma fake; `npm run test:db` em `test/*.db-spec.ts`, **contra o banco do `.env`** — cria dados com prefixo `teste-…` e apaga no final). Prefixo global `/api`; helmet, cookie-parser e `ValidationPipe` (whitelist) em `src/configurar-app.ts`.
```
prisma/schema.prisma        modelos (CHECKs, triggers e RLS ficam nas migrations SQL)
prisma/migrations/          SQL versionado; aplicar com `npm run prisma:migrate`
prisma.config.ts            DIRECT_URL para migrations; carrega .env
src/config/env.validation   valida/normaliza o env (ver .env.example): banco, JWT, sessões, FRONTEND_URL, provedores de e-mail/WhatsApp
src/prisma/                 PrismaService global (DATABASE_URL)
src/auth/                   login do admin (ver abaixo)
src/clientes/               contas de cliente (ver abaixo)
src/mensagens/              EmailService/WhatsAppService globais: `log` (dev, imprime no console) | Resend | WhatsApp Cloud API
src/scripts/criar-admin.ts  `npm run admin:criar -- --email … --nome … [--papel SUPPORT] [--redefinir-senha]`
src/generated/prisma        client gerado (gitignored; `postinstall` roda `prisma generate`)
```
**Autenticação do admin** (`src/auth`): tabela `usuarios_admin` (papéis `ADMIN` | `SUPPORT`, `ativo`, e-mail minúsculo único). `POST /api/auth/login` valida a senha (scrypt nativo, `auth/senha.ts`) e grava JWT HS256 num cookie `ne_admin_sessao` (httpOnly, SameSite=Strict, Path=/api, Secure em produção). `GET /api/auth/me` retorna o admin; `POST /api/auth/logout` apaga o cookie. **Toda rota exige sessão por padrão** (guard global); use `@Publico()` para liberar, `@RotaCliente()` para exigir sessão de cliente em vez da de admin, e `@Papeis('ADMIN')` para restringir por papel. O JWT do admin tem `aud: "admin"`. A cada requisição o usuário é recarregado do banco — desativar (`ativo=false`) derruba sessões existentes. Login limitado a 5 tentativas/min por IP; resposta genérica para e-mail inexistente ou senha errada.
Função SQL compartilhada `public.atualizar_updated_at()` (criada na migration de `usuarios_admin`) — reutilizar nos triggers das próximas tabelas.

**Contas de cliente** (`src/clientes`, regras em [spec-clientes-e-contas.md](spec-clientes-e-contas.md)): tabelas `clientes` (perfil + credenciais, telefone E.164 único, e-mail minúsculo único) e `tokens_clientes` (HMAC de códigos/tokens). Sessão em cookie próprio `ne_cliente_sessao` (mesmas flags do admin), JWT com `aud: "cliente"` e `ver` = `versao_sessao` (trocar/redefinir senha ou desativar derruba as sessões). Telefone normalizado em `clientes/telefone.ts` (`libphonenumber-js/max`, BR padrão, só celular) via `@CampoTelefone()` nos DTOs.
- `/api/clientes/auth`: `POST cadastro` (abre sessão e envia códigos por e-mail e WhatsApp), `POST login`, `POST logout`, `POST esqueci-senha` (resposta sempre genérica; link `FRONTEND_URL/redefinir-senha#token=…`, 30 min), `POST redefinir-senha`.
- `/api/clientes/me` (`@RotaCliente`): `GET`, `PATCH` (trocar e-mail exige `senhaAtual`; trocar e-mail/telefone zera a verificação), `POST senha`, `POST verificar-email`, `POST verificar-telefone`, `POST reenviar-codigo`.
- `/api/admin/clientes` (sessão de admin): `GET` (paginação `pagina`/`porPagina` ≤100, `busca`), `GET :id`, `PATCH :id` (inclui `ativo`).
- Códigos: 6 dígitos, 10 min, 5 tentativas (contadas atomicamente), reenvio após 60 s e no máx. 5/h por tipo.
