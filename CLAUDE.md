# Barbearia Novo Estilo

Site de agendamento + painel admin de uma barbearia (Curitiba/PR). Frontend React em `frontend/`; backend NestJS + Prisma + Supabase PostgreSQL em `backend/` (em construção: hoje só login do admin — o resto do frontend ainda é mock/estado local).

## Stack
Frontend: React 19 + Vite 8 (JS/JSX, sem TypeScript), Bootstrap 5 (só grid/utilities), CSS próprio, oxlint, React Router 7 (`/` site, `/admin/*` painel). Sem testes no frontend.
Backend: NestJS 12 + Prisma 7 (TypeScript, ESM), migrations SQL em `backend/prisma/migrations`, Vitest (unit + e2e).

## Comandos
- `frontend/`: `npm run dev` (site em `/`, admin em `/admin`), `npm run build`, `npm run preview`, `npm run lint`
- `backend/`: `npm run start:dev`, `npm test`, `npm run test:e2e`, `npm run test:db` (integração contra o banco do `.env`), `npm run lint`, `npm run prisma:migrate`

## Mapa rápido
- `frontend/index.html` → `src/main.jsx` (`BrowserRouter`) → `src/AppRoutes.jsx` (entrada única)
- Rotas (React Router, `src/AppRoutes.jsx`): `/admin/*` → `admin/AdminDashboard` → `AdminPanel` (abas em `/admin/agenda`, `/admin/servicos`…); `/*` → `App.jsx` (site: `/` home, `/entrar`, `/cadastro`, `/verificar`, `/minha-conta`…)
- `backend/src/auth` — login do admin (JWT, papéis `ADMIN`/`SUPPORT`, hash scrypt em `senha.ts`); padrão a seguir nos novos módulos
- `barbearia-novo-estilo.html` (raiz) — protótipo HTML único antigo, referência histórica
- `RefatorancaoVisual.md` — briefing de refatoração visual citado nos docs, mas **não existe no repositório**; o visual de referência é o próprio `frontend/src/styles/globals.css` e as imagens em `Referencia/`

## Contexto detalhado (leia conforme a tarefa)
- [docs/context/decisoes.md](docs/context/decisoes.md) — **decisões de produto (um único barbeiro, seg–sáb 08–18h, login obrigatório de cliente com e-mail/senha ou Google, WhatsApp) — ler primeiro**; prevalece sobre os demais
- [docs/context/plano-agendamentos.md](docs/context/plano-agendamentos.md) — plano em fases (clientes/contas → Google → telas de conta → serviços → agendamentos → integração), com checklist
- [docs/context/spec-clientes-e-contas.md](docs/context/spec-clientes-e-contas.md) — **especificação de banco, auth, segurança e testes de clientes/contas — ler antes de implementar as fases 1–3**
- [docs/context/arquitetura.md](docs/context/arquitetura.md) — estrutura de pastas, entrypoints, dados, estilos, código órfão
- [docs/context/funcionalidades-site-publico.md](docs/context/funcionalidades-site-publico.md) — tudo do site do cliente (fluxo de agendamento em 5 passos etc.)
- [docs/context/funcionalidades-admin.md](docs/context/funcionalidades-admin.md) — tudo do painel admin
- [docs/context/pendencias-e-inconsistencias.md](docs/context/pendencias-e-inconsistencias.md) — o que é fake/incompleto e divergências entre as duas áreas

## Convenções observadas
- Idioma da UI e dos dados: pt-BR. Datas no admin: `DD/MM/YYYY`; no site público: `YYYY-MM-DD`.
- Status de agendamento: `agendado | concluido | cancelado`; status de serviço/profissional: `ativo | inativo`.
- Componentes funcionais com hooks, `export default`, estado local com `useState`; handlers nomeados `handleX`.
- **Mantenha estes arquivos de contexto atualizados ao adicionar/alterar funcionalidades.**

## Ao implementar uma fase do backend
- Analise a estrutura e as dependências existentes antes de criar arquivos; não recrie o que já existe nem crie camadas desnecessárias.
- Implemente só o escopo da fase (ver plano); preserve o funcionamento atual e evite refatorações não relacionadas.
- Segurança: credenciais só em variáveis de ambiente; nunca `service_role` do Supabase no frontend; tabelas com RLS + `REVOKE` de `anon`/`authenticated`; nenhuma rota pública que liste/consulte dados pessoais; nunca expor erros internos do banco, stack traces ou credenciais.
- Integridade: constraints no banco são a garantia final (não só consultas prévias); sem exclusões que quebrem o histórico de agendamentos.
- Sem acesso ao Supabase: prepare a migration e explique o que validar manualmente. Nunca afirme que uma migration foi aplicada sem confirmação.
- Entrega: arquivos criados/modificados e a responsabilidade de cada um, migration SQL, testes executados com resultados reais, passos manuais necessários, e problemas encontrados na estrutura existente (apontados antes de contorná-los).
