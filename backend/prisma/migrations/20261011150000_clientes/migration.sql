-- Clientes do site (todo cliente tem conta) e seus tokens de verificação/recuperação de senha.
-- Reutiliza public.atualizar_updated_at(), criada em 20261010220000_usuarios_admin.

CREATE TABLE "clientes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT,
    "google_sub" TEXT,
    "email_verificado_em" TIMESTAMPTZ(6),
    "telefone_verificado_em" TIMESTAMPTZ(6),
    "versao_sessao" INTEGER NOT NULL DEFAULT 0,
    "termos_versao_aceita" TEXT NOT NULL,
    "termos_aceitos_em" TIMESTAMPTZ(6) NOT NULL,
    "ultimo_login_em" TIMESTAMPTZ(6),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "clientes_nome_nao_vazio" CHECK (length(trim("nome")) > 0),
    CONSTRAINT "clientes_email_minusculo" CHECK ("email" = lower(trim("email")) AND length("email") > 0),
    -- E.164. Uma barra só: com standard_conforming_strings (padrão), '\\+' casaria barras invertidas.
    CONSTRAINT "clientes_telefone_e164" CHECK ("telefone" ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT "clientes_senha_hash_nao_vazio" CHECK ("senha_hash" IS NULL OR length("senha_hash") > 0),
    CONSTRAINT "clientes_tem_credencial" CHECK ("senha_hash" IS NOT NULL OR "google_sub" IS NOT NULL),
    CONSTRAINT "clientes_versao_sessao_positiva" CHECK ("versao_sessao" >= 0),
    CONSTRAINT "clientes_termos_versao_nao_vazia" CHECK (length(trim("termos_versao_aceita")) > 0)
);

-- Garantia final contra duplicatas (inclusive cadastros concorrentes).
CREATE UNIQUE INDEX "clientes_telefone_key" ON "clientes"("telefone");
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");
CREATE UNIQUE INDEX "clientes_google_sub_key" ON "clientes"("google_sub");

CREATE TRIGGER trg_clientes_updated_at
BEFORE UPDATE ON "clientes"
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at();

CREATE TYPE "tipo_token_cliente" AS ENUM ('verificar_email', 'verificar_telefone', 'recuperar_senha');

CREATE TABLE "tokens_clientes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "tipo" "tipo_token_cliente" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "usado_em" TIMESTAMPTZ(6),
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_clientes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tokens_clientes_token_hash_nao_vazio" CHECK (length("token_hash") > 0),
    CONSTRAINT "tokens_clientes_tentativas_positivas" CHECK ("tentativas" >= 0),
    -- Sem exclusão em cascata: excluir conta = anonimizar, nunca apagar o cliente.
    CONSTRAINT "tokens_clientes_cliente_id_fkey" FOREIGN KEY ("cliente_id")
        REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "tokens_clientes_cliente_id_tipo_created_at_idx" ON "tokens_clientes"("cliente_id", "tipo", "created_at");
CREATE INDEX "tokens_clientes_tipo_token_hash_idx" ON "tokens_clientes"("tipo", "token_hash");

-- Mesmo bloqueio de usuarios_admin: nada acessível pela API REST do Supabase (anon/authenticated).
ALTER TABLE "clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tokens_clientes" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE "clientes", "tokens_clientes" FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE "clientes", "tokens_clientes" FROM authenticated;
    END IF;
END;
$$;
