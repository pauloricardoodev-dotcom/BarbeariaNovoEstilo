# Barbearia Novo Estilo

Site de agendamento + painel admin de uma barbearia (Curitiba/PR). **Somente frontend**, sem backend: todos os dados são mock/estado local (perdem-se ao recarregar).

## Stack
React 19 + Vite 8 (JS/JSX, sem TypeScript), Bootstrap 5 (só grid/utilities), CSS próprio, oxlint, React Router 7 (`/` site, `/admin/*` painel). Sem testes no frontend.

## Comandos (rodar em `frontend/`)
- `npm run dev` — dev server (site em `/`, admin em `/admin`)
- `npm run build` / `npm run preview` / `npm run lint`

## Mapa rápido
- `frontend/index.html` → `src/main.jsx` (`BrowserRouter`) → `src/AppRoutes.jsx` (entrada única)
- Rotas (React Router, `src/AppRoutes.jsx`): `/` → `App.jsx`; `/admin/*` → `admin/AdminDashboard` → `AdminPanel` (abas em `/admin/agenda`, `/admin/servicos`…)
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


## Banco de dados e suas Relações
# Implementação da tabela `clientes` — Projeto Novo Estilo

## Contexto do projeto

Estamos desenvolvendo o sistema da barbearia **Novo Estilo**, utilizando:

- Frontend: React + Vite.
- Backend: Node.js + Express.
- Banco de dados: Supabase PostgreSQL.

Neste momento, implemente somente a estrutura e a integração da entidade `clientes`. Não implemente ainda as demais entidades do sistema.

Antes de modificar qualquer arquivo, analise a estrutura atual do projeto, identifique como o backend está organizado, verifique as dependências existentes e respeite os padrões já utilizados. Não recrie arquivos ou estruturas que já existam sem necessidade.

## 1. Objetivo da entidade

A tabela `clientes` armazenará os dados de contato das pessoas que realizam agendamentos.

Os clientes **não terão login ou cadastro com senha no MVP**. O cadastro será criado pelo próprio fluxo de agendamento, por meio do backend.

Os dados também serão utilizados futuramente nos relatórios e no histórico de agendamentos.

## 2. Estrutura da tabela PostgreSQL

Implemente a seguinte estrutura no Supabase PostgreSQL:

```sql
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT clientes_nome_nao_vazio
        CHECK (length(trim(nome)) > 0),

    CONSTRAINT clientes_email_nao_vazio
        CHECK (
            email IS NULL
            OR length(trim(email)) > 0
        ),

    CONSTRAINT clientes_telefone_e164
        CHECK (
            telefone ~ '^\\+[1-9][0-9]{7,14}$'
        ),

    CONSTRAINT clientes_telefone_unique
        UNIQUE (telefone)
);
```

Crie também um trigger para atualizar automaticamente o campo `updated_at` em toda alteração de um registro:

```sql
CREATE OR REPLACE FUNCTION public.atualizar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at();
```

Caso já exista uma função compartilhada equivalente no projeto, avalie se ela pode ser reutilizada sem duplicação.

Se a tabela já existir, crie uma migration incremental em vez de tentar criá-la novamente. Verifique registros existentes, possíveis duplicatas e incompatibilidades antes de adicionar restrições.

## 3. Normalização de telefones

O telefone deve ser armazenado em formato internacional E.164.

Exemplo:

- Entrada: `(44) 99999-9999`
- Armazenamento: `+5544999999999`

Utilize a biblioteca `libphonenumber-js`, caso seja compatível com a estrutura atual do backend. Instale-a somente se ainda não estiver disponível.

Crie uma função reutilizável para:

1. Receber o telefone informado pelo usuário.
2. Interpretá-lo utilizando `BR` como país padrão para entradas sem código internacional.
3. Validar se o número é válido.
4. Retornar o número normalizado em E.164.
5. Rejeitar entradas inválidas com um erro apropriado.

Não normalize telefones apenas no frontend. Toda validação precisa acontecer também no backend.

Não utilize apenas expressões como `replace(/\D/g, '')` como estratégia de normalização, pois elas removem o sinal de `+` e não resolvem corretamente o código do país.

## 4. Regra de identificação dos clientes

Cada telefone normalizado deverá corresponder a, no máximo, um registro na tabela `clientes`.

A restrição `UNIQUE (telefone)` no banco é obrigatória.

O fluxo de criação deverá funcionar da seguinte forma:

1. Receber nome, telefone e e-mail opcional.
2. Validar os dados recebidos.
3. Normalizar o telefone.
4. Procurar um cliente existente pelo telefone normalizado.
5. Se existir, reutilizar seu `id`.
6. Se não existir, tentar criar o registro.
7. Caso outra requisição crie o mesmo telefone simultaneamente, tratar a violação de unicidade e recuperar o cliente existente de maneira segura.

Não dependa exclusivamente de uma consulta prévia para impedir duplicatas. A garantia final deve ser a restrição do banco.

Não atualize automaticamente o nome ou o e-mail de um cliente existente apenas porque ele fez um novo agendamento com o mesmo telefone. A atualização dos dados pessoais deverá ser uma operação explícita.

## 5. Campos de auditoria

- `created_at`: data de criação do registro.
- `updated_at`: data da última atualização, modificada automaticamente pelo trigger.

Não remova esses campos. Eles serão importantes para relatórios e manutenção futura.

## 6. Segurança

- Não exponha a `service_role` do Supabase no frontend.
- Não permita acesso público irrestrito à tabela `clientes`.
- O frontend deverá acessar os dados por meio das rotas autorizadas do backend.
- Utilize variáveis de ambiente para as credenciais do Supabase.
- Se o backend utilizar uma credencial administrativa do Supabase, implemente as verificações de autorização apropriadas nas rotas.
- Não crie campos de senha ou de autenticação para os clientes.
- Não permita exclusões que possam comprometer o histórico de agendamentos futuros. Quando a tabela de agendamentos for implementada, as FKs deverão preservar essa integridade.

## 7. Integração com o backend

Implemente a entidade seguindo a arquitetura existente no projeto.

Se ainda não houver uma estrutura definida, utilize uma separação coerente entre:

- Rotas HTTP.
- Controller.
- Service com as regras de negócio.
- Acesso ao banco de dados.
- Validação dos dados recebidos.

Não crie camadas desnecessárias se o projeto já adotar outro padrão simples e consistente.

Implemente somente as operações necessárias nesta etapa, como:

- Criar ou recuperar um cliente durante o fluxo de agendamento.
- Consultar um cliente por ID.
- Consultar clientes para uso administrativo, com paginação e autorização.
- Atualizar dados de um cliente por uma operação explícita.

Não implemente uma API pública que permita a qualquer visitante listar ou consultar dados pessoais de todos os clientes.

## 8. Tratamento de erros

Trate adequadamente:

- Nome vazio ou inválido.
- Telefone inválido.
- E-mail em formato inválido, quando informado.
- Telefone duplicado.
- Cliente inexistente.
- Erros de conexão com o banco.
- Falhas de autorização.

Não exponha mensagens internas do banco, credenciais ou stack traces ao usuário final.

## 9. Testes e critérios de conclusão

Implemente ou atualize os testes adequados à estrutura do projeto.

Verifique, no mínimo:

1. Criação de um cliente com dados válidos.
2. Criação sem e-mail.
3. Rejeição de telefone inválido.
4. Normalização de diferentes formatos de um mesmo telefone.
5. Reutilização do mesmo cliente ao receber novamente seu telefone normalizado.
6. Ausência de duplicatas mesmo em requisições concorrentes.
7. Atualização automática de `updated_at`.
8. Tratamento seguro de erros e acessos não autorizados.

Se não houver acesso às credenciais ou ao ambiente do Supabase, prepare a migration e explique o que precisa ser executado ou validado manualmente. Não afirme que uma migration foi aplicada se isso não tiver sido confirmado.

## 10. Limites desta tarefa

Não implemente agora:

- Tabela de barbeiros.
- Tabela de serviços.
- Tabela de agendamentos.
- Tabela de pagamentos.
- Integração com gateways de pagamento.
- Login de clientes.
- Novos recursos visuais não relacionados à tarefa.

Preserve o funcionamento atual do projeto e evite refatorações não relacionadas à entidade `clientes`.

## 11. Entrega esperada

Ao finalizar:

1. Informe quais arquivos foram criados ou modificados.
2. Explique resumidamente a responsabilidade de cada arquivo.
3. Apresente a migration SQL criada.
4. Informe quais testes foram executados e seus resultados reais.
5. Liste eventuais configurações ou passos manuais necessários no Supabase.
6. Aponte problemas encontrados na estrutura existente antes de tentar contorná-los.

Implemente a solução no código do projeto, não apenas uma explicação ou exemplo isolado. Antes de finalizar, revise a implementação para verificar se todas as regras de integridade e segurança foram respeitadas.