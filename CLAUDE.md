# Barbearia Novo Estilo

Site de agendamento + painel admin de uma barbearia (Curitiba/PR). **Somente frontend**, sem backend: todos os dados são mock/estado local (perdem-se ao recarregar).

## Stack
React 19 + Vite 8 (JS/JSX, sem TypeScript), Bootstrap 5 (só grid/utilities), CSS próprio, oxlint. Sem roteador, sem testes.

## Comandos (rodar em `frontend/`)
- `npm run dev` — dev server (site em `/`, admin em `/admin.html`)
- `npm run build` / `npm run preview` / `npm run lint`

## Mapa rápido
- `frontend/index.html` → `src/main.jsx` → `App.jsx` (site público)
- `frontend/admin.html` → `src/admin-main.jsx` → `admin/AdminDashboard` → `AdminPanel` (admin)
- `barbearia-novo-estilo.html` (raiz) — protótipo HTML único antigo, referência histórica
- `RefatorancaoVisual.md` (raiz) — briefing de refatoração visual (Hero, Header, seção Profissionais); referencia `/referencia/hero.png`, que não existe no repo

## Contexto detalhado (leia conforme a tarefa)
- [docs/context/decisoes.md](docs/context/decisoes.md) — **decisões de produto (um único barbeiro, seg–sáb 08–18h, sem contas de cliente, WhatsApp) — ler primeiro**; prevalece sobre os demais
- [docs/context/arquitetura.md](docs/context/arquitetura.md) — estrutura de pastas, entrypoints, dados, estilos, código órfão
- [docs/context/funcionalidades-site-publico.md](docs/context/funcionalidades-site-publico.md) — tudo do site do cliente (fluxo de agendamento em 5 passos etc.)
- [docs/context/funcionalidades-admin.md](docs/context/funcionalidades-admin.md) — tudo do painel admin
- [docs/context/pendencias-e-inconsistencias.md](docs/context/pendencias-e-inconsistencias.md) — o que é fake/incompleto e divergências entre as duas áreas

## Convenções observadas
- Idioma da UI e dos dados: pt-BR. Datas no admin: `DD/MM/YYYY`; no site público: `YYYY-MM-DD`.
- Status de agendamento: `agendado | concluido | cancelado`; status de serviço/profissional: `ativo | inativo`.
- Componentes funcionais com hooks, `export default`, estado local com `useState`; handlers nomeados `handleX`.
- **Mantenha estes arquivos de contexto atualizados ao adicionar/alterar funcionalidades.**
