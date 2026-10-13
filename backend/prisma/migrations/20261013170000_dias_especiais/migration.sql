-- Exceções do dono ao calendário de funcionamento. Por padrão a barbearia fecha aos domingos e nos feriados
-- (calculados no backend, não ficam no banco); esta tabela guarda só o que foge disso:
--   aberto = false -> dia comum que o dono FECHOU (motivo opcional);
--   aberto = true  -> domingo/feriado que o dono DESBLOQUEOU para abrir.
-- Linhas redundantes (que repetem o padrão) são apagadas pelo backend. Nada aqui apaga agendamentos.
-- Reutiliza public.atualizar_updated_at(), criada em 20261010220000_usuarios_admin.

CREATE TABLE "dias_especiais" (
    "data" DATE NOT NULL,
    "aberto" BOOLEAN NOT NULL,
    "motivo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dias_especiais_pkey" PRIMARY KEY ("data"),
    CONSTRAINT "dias_especiais_motivo_valido" CHECK ("motivo" IS NULL OR (length(trim("motivo")) > 0 AND length("motivo") <= 120))
);

CREATE TRIGGER trg_dias_especiais_updated_at
BEFORE UPDATE ON "dias_especiais"
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at();

-- Nada acessível pela API REST do Supabase (anon/authenticated); só o backend lê e grava.
ALTER TABLE "dias_especiais" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE "dias_especiais" FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE "dias_especiais" FROM authenticated;
    END IF;
END;
$$;
