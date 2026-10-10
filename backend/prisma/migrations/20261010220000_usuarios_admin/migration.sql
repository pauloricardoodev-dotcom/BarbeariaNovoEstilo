-- Usuários do painel admin (dono = ADMIN, desenvolvedor = SUPPORT).

CREATE TYPE "papel_admin" AS ENUM ('ADMIN', 'SUPPORT');

CREATE TABLE "usuarios_admin" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "papel" "papel_admin" NOT NULL DEFAULT 'ADMIN',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_admin_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "usuarios_admin_nome_nao_vazio" CHECK (length(trim("nome")) > 0),
    CONSTRAINT "usuarios_admin_email_minusculo" CHECK ("email" = lower(trim("email")) AND length("email") > 0),
    CONSTRAINT "usuarios_admin_senha_hash_nao_vazio" CHECK (length("senha_hash") > 0)
);

CREATE UNIQUE INDEX "usuarios_admin_email_key" ON "usuarios_admin"("email");

-- Função compartilhada de auditoria; será reutilizada pelas próximas tabelas (ex.: clientes).
CREATE OR REPLACE FUNCTION public.atualizar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_usuarios_admin_updated_at
BEFORE UPDATE ON "usuarios_admin"
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at();

-- Supabase expõe o schema public via API REST (roles anon/authenticated).
-- RLS ligado sem nenhuma policy + REVOKE bloqueia esse acesso; o backend usa a role dona da tabela.
ALTER TABLE "usuarios_admin" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE "usuarios_admin" FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE "usuarios_admin" FROM authenticated;
    END IF;
END;
$$;
