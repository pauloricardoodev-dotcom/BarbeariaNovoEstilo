# Especificação: clientes e contas de cliente

Substitui a antiga especificação "Implementação da tabela `clientes`" que ficava no `CLAUDE.md` (aquela previa clientes **sem** login; decisão revertida em 2026-10-11). Decisões de produto em [decisoes.md](decisoes.md); plano e checklist em [plano-agendamentos.md](plano-agendamentos.md).

## Stack real
Backend **NestJS 12 + Prisma 7 + Supabase PostgreSQL** (não Express). Seguir o padrão do módulo `backend/src/auth` (admin): DTOs com `class-validator`, guard JWT, `@Throttle` em rotas sensíveis, hash de senha em `auth/senha.ts` (scrypt), migrations SQL em `backend/prisma/migrations` com RLS ligado + `REVOKE` de `anon`/`authenticated`.

## Regras de produto
- **Login obrigatório para usar o site.** Ao abrir o sistema, sem sessão, aparece o login (`/entrar?voltar=…`, volta ao destino depois). Abertas sem sessão: cadastro, esqueci/redefinir senha, termos e privacidade.
- **Todo cliente tem conta.** Quem liga/chega sem conta não vira cliente: o admin faz uma reserva manual só com nome, serviço e duração (fica no próprio agendamento — ver fase de agendamentos).
- **Formas de entrar:** e-mail + senha, ou **conta Google**.
- **Sem etapa de identificação no agendamento:** nome, telefone e e-mail vêm do perfil; o resumo mostra "Agendando como Fulano · telefone · e-mail" com link para editar o perfil.
- **Verificação obrigatória antes do primeiro agendamento:**
  - E-mail: código enviado por e-mail.
  - Telefone: código enviado por **WhatsApp** (WhatsApp Cloud API).
- **Recuperação de senha por e-mail.**
- **Termos de uso e política de privacidade:** texto genérico provisório (páginas `/termos` e `/privacidade`), aceite obrigatório no cadastro; guardar a versão aceita para pedir novo aceite quando o texto definitivo entrar.
- Formulários de login/cadastro com `autocomplete` correto (`username`/`email`, `current-password`, `new-password`) para o navegador salvar e preencher a senha.

## Banco

### `clientes` — perfil + credenciais (todo cliente tem conta)
```sql
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,                  -- E.164
    email TEXT NOT NULL,                     -- minúsculo
    senha_hash TEXT,                         -- NULL em conta só-Google
    google_sub TEXT,                         -- id estável do Google
    email_verificado_em TIMESTAMPTZ,
    telefone_verificado_em TIMESTAMPTZ,
    versao_sessao INTEGER NOT NULL DEFAULT 0, -- vai no JWT; incrementar derruba sessões antigas
    termos_versao_aceita TEXT NOT NULL,
    termos_aceitos_em TIMESTAMPTZ NOT NULL,
    ultimo_login_em TIMESTAMPTZ,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT clientes_nome_nao_vazio CHECK (length(trim(nome)) > 0),
    CONSTRAINT clientes_email_minusculo CHECK (email = lower(trim(email)) AND length(email) > 0),
    -- Uma barra só: com standard_conforming_strings (padrão), '\\+' casaria barras invertidas.
    CONSTRAINT clientes_telefone_e164 CHECK (telefone ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT clientes_tem_credencial CHECK (senha_hash IS NOT NULL OR google_sub IS NOT NULL),
    CONSTRAINT clientes_telefone_unique UNIQUE (telefone),
    CONSTRAINT clientes_email_unique UNIQUE (email),
    CONSTRAINT clientes_google_sub_unique UNIQUE (google_sub)
);
-- Trigger: reutilizar public.atualizar_updated_at() (já criada na migration usuarios_admin).
```
Respostas da API e consultas do admin **nunca** selecionam `senha_hash`/`google_sub` (usar `select` explícito no Prisma).

### `tokens_clientes` — códigos de verificação e recuperação de senha
- `id`, `cliente_id` (FK `ON DELETE RESTRICT`), `tipo` (`verificar_email | verificar_telefone | recuperar_senha`), `token_hash` (nunca o valor puro), `expira_em`, `usado_em`, `tentativas`, `created_at`.
- Uso único; expiração curta (códigos ~10 min, recuperação ~30 min); limite de tentativas e de reenvios (códigos de 6 dígitos são adivinháveis sem isso).

Ambas com RLS ligado sem policies + `REVOKE` de `anon`/`authenticated`. Nenhuma exclusão física que quebre histórico: excluir conta = anonimizar dados pessoais e desativar.

## Normalização de telefone
`libphonenumber-js`, país padrão `BR`, saída E.164; aceitar só números válidos (no BR, celular — precisa receber WhatsApp). Validar sempre no backend; o frontend pode formatar, mas nunca é a fonte da verdade. Não normalizar só com `replace(/\D/g, '')`.

## Autenticação (backend)
- **JWT de cliente separado do de admin:** audiências distintas (`aud: 'cliente'` vs `aud: 'admin'`). O guard do admin **rejeita** token de cliente e vice-versa — teste e2e obrigatório.
- **Cadastro e-mail+senha:** nome, e-mail, telefone, senha (mín. 8, máx. 128 caracteres), aceite dos termos. Envia os dois códigos (e-mail e WhatsApp). Conta não verificada pode logar e editar o perfil, mas não agendar.
- **Login:** mensagem genérica em falha ("e-mail ou senha incorretos"); `@Throttle` agressivo.
- **Recuperação de senha:** resposta sempre genérica ("se o e-mail existir, enviamos instruções"); token de uso único; ao concluir, incrementa `versao_sessao`.
- **Google:** frontend usa Google Identity Services e manda o ID token; backend valida com `google-auth-library` (`aud` = `GOOGLE_CLIENT_ID`, `email_verified = true`).
  - Achou `google_sub` → login.
  - Não achou, mas existe cliente com o mesmo e-mail → vincula `google_sub` (o Google comprovou o e-mail). **Se o e-mail desse cliente não estava verificado**, zera `senha_hash`, incrementa `versao_sessao` e invalida tokens de recuperação: quem cadastrou o e-mail sem ser o dono perde o acesso. Cadastro já ligado a outro `google_sub`, ou conta inativa → 401 genérico.
  - Sem `GOOGLE_CLIENT_ID` o login com Google responde 503. Rotas: `POST /clientes/auth/google` e `POST /clientes/auth/google/completar` (ver plano, Fase 2).
  - Conta nova → `email_verificado_em` preenchido; como o Google não fornece telefone, devolve um token curto de "cadastro pendente" e o frontend pede telefone + aceite dos termos (verificação por WhatsApp em seguida).
- **Telefone ou e-mail já cadastrados** → recusar.
- **Rotas do cliente:** `GET/PATCH /me` (alteração explícita; trocar e-mail ou telefone zera a verificação correspondente e envia novo código), `POST /me/senha`, reenvio de códigos. Rotas de agendamento do cliente entram na fase de agendamentos.
- **Rotas admin** (JWT admin + papéis): listar clientes com paginação, buscar por id, atualizar.

## Envio de mensagens
- `EmailService` e `WhatsAppService` abstratos, provedor via env. Em dev/teste, implementações que só registram em log (o código aparece no console).
- **WhatsApp Cloud API:** mensagens iniciadas pela empresa exigem **template aprovado pela Meta** (categoria "Autenticação" para códigos) e um número de WhatsApp Business verificado. Cobrança por mensagem (conferir preço atual na Meta). Passos manuais em "Configuração externa".

## Configuração externa (manual, dono/dev)
- **Google Cloud:** criar OAuth Client (Web) com as origens do site.
- **Meta (WhatsApp Cloud API):** conta Meta Business, app no Meta for Developers, número da barbearia registrado no WhatsApp Business Platform, template de autenticação aprovado, token permanente (usuário de sistema).
- **E-mail:** conta no provedor escolhido (ex.: Resend/Brevo) e domínio verificado (SPF/DKIM) para não cair no spam.

## Variáveis de ambiente
Backend: `GOOGLE_CLIENT_ID`, `FRONTEND_URL`, credenciais do provedor de e-mail, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_VERIFICACAO`, `WHATSAPP_TEMPLATE_CANCELAMENTO_APROVADO`, `WHATSAPP_TEMPLATE_CANCELAMENTO_RECUSADO`, `WHATSAPP_TEMPLATE_REAGENDAMENTO`, `SESSAO_CLIENTE_DURACAO_SEGUNDOS`. Frontend: `VITE_GOOGLE_CLIENT_ID`, `VITE_API_URL`. Nada de `service_role` do Supabase no frontend.

## Erros
Tratar nome/e-mail/telefone/senha inválidos, e-mail ou telefone já cadastrados, código errado/expirado/usado/tentativas esgotadas, cliente inexistente, conta não verificada tentando agendar, falha do banco ou dos provedores de e-mail/WhatsApp, acesso não autorizado. Nunca expor mensagens do banco, stack traces ou credenciais.

## Testes mínimos
1. Cadastro válido; telefone salvo em E.164; formatos diferentes do mesmo telefone normalizam igual.
2. Telefone, e-mail e senha inválidos recusados.
3. E-mail/telefone duplicados recusados — inclusive em cadastros concorrentes (garantia final: `UNIQUE` do banco).
4. Login correto/incorreto; mensagem genérica; rate limit.
5. Códigos de e-mail e WhatsApp: válido, errado, expirado, reutilizado, tentativas esgotadas (provedores mockados).
6. Recuperação e troca de senha invalidam JWT antigo (`versao_sessao`).
7. Token de cliente não acessa rota admin, e vice-versa; respostas nunca contêm `senha_hash`.
8. Google: login, vínculo por e-mail, cadastro pendente exigindo telefone (validação do ID token mockada).
9. `updated_at` atualizado pelo trigger.

Sem credenciais do Supabase: preparar migration e dizer o que validar manualmente; nunca afirmar que foi aplicada sem confirmação.

## Pendências
- Duração da sessão do cliente (sugestão: 30 dias, renovada ao usar).
- Texto definitivo dos termos de uso / política de privacidade (LGPD).
