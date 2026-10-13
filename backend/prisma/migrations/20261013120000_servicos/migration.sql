-- Catálogo de serviços da barbearia. Nunca é apagado (agendamentos vão referenciar por FK): "remover" = ativo = false.
-- Reutiliza public.atualizar_updated_at(), criada em 20261010220000_usuarios_admin.

CREATE TABLE "servicos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "duracao_minutos" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "servicos_nome_valido" CHECK (length(trim("nome")) > 0 AND length("nome") <= 80),
    CONSTRAINT "servicos_descricao_valida" CHECK ("descricao" IS NULL OR (length(trim("descricao")) > 0 AND length("descricao") <= 300)),
    CONSTRAINT "servicos_preco_valido" CHECK ("preco" >= 0 AND "preco" <= 99999.99),
    CONSTRAINT "servicos_duracao_valida" CHECK ("duracao_minutos" BETWEEN 5 AND 480)
);

-- Garantia final contra nomes repetidos (ignora maiúsculas/minúsculas e espaços nas pontas), inclusive em requisições simultâneas.
CREATE UNIQUE INDEX "servicos_nome_key" ON "servicos"(lower(trim("nome")));

CREATE TRIGGER trg_servicos_updated_at
BEFORE UPDATE ON "servicos"
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at();

-- Nada acessível pela API REST do Supabase (anon/authenticated); só o backend lê e grava.
ALTER TABLE "servicos" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE "servicos" FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE "servicos" FROM authenticated;
    END IF;
END;
$$;
