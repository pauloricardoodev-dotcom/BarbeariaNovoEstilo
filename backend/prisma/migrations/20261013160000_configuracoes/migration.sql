-- Configurações da barbearia (linha única): dados de contato exibidos no site, expediente (manhã e tarde) e
-- política de agendamento. Quem lê é o backend; o site recebe só a parte pública por GET /api/configuracoes.
-- Reutiliza public.atualizar_updated_at(), criada em 20261010220000_usuarios_admin.
-- Os valores iniciais repetem o comportamento anterior (08–12 e 14–18, 2 h de antecedência, ~3 meses = 90 dias).

CREATE TABLE "configuracoes" (
    -- Chave fixa: só pode existir uma linha (id = true).
    "id" BOOLEAN NOT NULL DEFAULT true,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "manha_inicio" TEXT NOT NULL,
    "manha_fim" TEXT NOT NULL,
    "tarde_inicio" TEXT NOT NULL,
    "tarde_fim" TEXT NOT NULL,
    "antecedencia_horas" INTEGER NOT NULL DEFAULT 2,
    "janela_dias" INTEGER NOT NULL DEFAULT 90,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "configuracoes_linha_unica" CHECK ("id"),
    CONSTRAINT "configuracoes_nome_valido" CHECK (length(trim("nome")) > 0 AND length("nome") <= 80),
    CONSTRAINT "configuracoes_telefone_valido" CHECK (length(trim("telefone")) > 0 AND length("telefone") <= 30),
    CONSTRAINT "configuracoes_endereco_valido" CHECK (length(trim("endereco")) > 0 AND length("endereco") <= 200),
    CONSTRAINT "configuracoes_horas_formato" CHECK (
        "manha_inicio" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        AND "manha_fim" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        AND "tarde_inicio" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        AND "tarde_fim" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    ),
    -- 'HH:mm' compara certo como texto: manhã começa antes de acabar, a tarde só começa depois do fim da manhã (pode encostar).
    CONSTRAINT "configuracoes_horas_em_ordem" CHECK (
        "manha_inicio" < "manha_fim" AND "manha_fim" <= "tarde_inicio" AND "tarde_inicio" < "tarde_fim"
    ),
    CONSTRAINT "configuracoes_antecedencia_valida" CHECK ("antecedencia_horas" BETWEEN 0 AND 72),
    CONSTRAINT "configuracoes_janela_valida" CHECK ("janela_dias" BETWEEN 1 AND 365)
);

CREATE TRIGGER trg_configuracoes_updated_at
BEFORE UPDATE ON "configuracoes"
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at();

INSERT INTO "configuracoes" ("nome", "telefone", "endereco", "manha_inicio", "manha_fim", "tarde_inicio", "tarde_fim")
VALUES ('Barbearia Novo Estilo', '(41) 3025-1187', 'Rua das Palmeiras, 482 — Batel, Curitiba - PR', '08:00', '12:00', '14:00', '18:00');

-- Nada acessível pela API REST do Supabase (anon/authenticated); só o backend lê e grava.
ALTER TABLE "configuracoes" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE "configuracoes" FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE "configuracoes" FROM authenticated;
    END IF;
END;
$$;
