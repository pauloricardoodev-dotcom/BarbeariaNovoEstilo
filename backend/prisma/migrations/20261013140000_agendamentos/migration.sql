-- Agendamentos, histórico de reagendamentos e solicitações de cancelamento.
-- Reutiliza public.atualizar_updated_at(), criada em 20261010220000_usuarios_admin.
-- Nada é apagado: FKs com ON DELETE RESTRICT; cancelar = status 'cancelado' (o registro permanece).

CREATE TYPE "status_agendamento" AS ENUM ('agendado', 'concluido', 'cancelado');
CREATE TYPE "forma_pagamento" AS ENUM ('pix', 'cartao', 'presencial');
CREATE TYPE "status_solicitacao_cancelamento" AS ENUM ('pendente', 'aprovada', 'recusada');

CREATE TABLE "agendamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    -- Agendamento feito pelo cliente no site: cliente_id. Reserva manual do admin: nome_avulso (sem conta).
    "cliente_id" UUID,
    "nome_avulso" TEXT,
    "servico_id" UUID NOT NULL,
    "inicio" TIMESTAMPTZ(6) NOT NULL,
    -- Fim do atendimento. Sempre calculado pelo trigger trg_agendamentos_calcular_fim (inicio + duração);
    -- existe porque índices/EXCLUDE só aceitam expressões IMMUTABLE e "timestamptz + interval" não é.
    "fim" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Duração e preço são gravados no agendamento: mudar o serviço depois não altera o histórico.
    "duracao_minutos" INTEGER NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "pagamento" "forma_pagamento" NOT NULL DEFAULT 'presencial',
    "status" "status_agendamento" NOT NULL DEFAULT 'agendado',
    "cancelado_em" TIMESTAMPTZ(6),
    "cancelado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agendamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id")
        REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "agendamentos_servico_id_fkey" FOREIGN KEY ("servico_id")
        REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "agendamentos_cancelado_por_fkey" FOREIGN KEY ("cancelado_por")
        REFERENCES "usuarios_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    -- Exatamente um: cliente com conta OU nome avulso (reserva manual).
    CONSTRAINT "agendamentos_origem_unica" CHECK (
        ("cliente_id" IS NOT NULL AND "nome_avulso" IS NULL)
        OR ("cliente_id" IS NULL AND "nome_avulso" IS NOT NULL)
    ),
    CONSTRAINT "agendamentos_nome_avulso_valido" CHECK (
        "nome_avulso" IS NULL OR (length(trim("nome_avulso")) > 0 AND length("nome_avulso") <= 120)
    ),
    CONSTRAINT "agendamentos_duracao_valida" CHECK ("duracao_minutos" BETWEEN 5 AND 480),
    CONSTRAINT "agendamentos_preco_valido" CHECK ("preco" >= 0),
    CONSTRAINT "agendamentos_fim_coerente" CHECK ("fim" = "inicio" + make_interval(mins => "duracao_minutos")),
    CONSTRAINT "agendamentos_cancelamento_coerente" CHECK (
        ("status" = 'cancelado') = ("cancelado_em" IS NOT NULL)
    ),
    CONSTRAINT "agendamentos_cancelado_por_coerente" CHECK (
        "cancelado_por" IS NULL OR "status" = 'cancelado'
    ),
    -- Garantia final contra dupla reserva (inclusive requisições simultâneas): dois agendamentos não
    -- cancelados não podem ter intervalos [inicio, fim) sobrepostos. Encostar (fim = início do outro) pode.
    CONSTRAINT "agendamentos_sem_sobreposicao" EXCLUDE USING gist (
        tstzrange("inicio", "fim", '[)') WITH &&
    ) WHERE ("status" <> 'cancelado')
);

CREATE FUNCTION public.agendamentos_calcular_fim() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    NEW."fim" := NEW."inicio" + make_interval(mins => NEW."duracao_minutos");
    RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_agendamentos_calcular_fim
BEFORE INSERT OR UPDATE OF "inicio", "duracao_minutos" ON "agendamentos"
FOR EACH ROW
EXECUTE FUNCTION public.agendamentos_calcular_fim();

CREATE INDEX "agendamentos_inicio_idx" ON "agendamentos"("inicio");
CREATE INDEX "agendamentos_cliente_id_inicio_idx" ON "agendamentos"("cliente_id", "inicio");
CREATE INDEX "agendamentos_servico_id_idx" ON "agendamentos"("servico_id");

CREATE TRIGGER trg_agendamentos_updated_at
BEFORE UPDATE ON "agendamentos"
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at();

-- Histórico: um registro por reagendamento.
CREATE TABLE "reagendamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agendamento_id" UUID NOT NULL,
    "inicio_anterior" TIMESTAMPTZ(6) NOT NULL,
    "inicio_novo" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reagendamentos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reagendamentos_agendamento_id_fkey" FOREIGN KEY ("agendamento_id")
        REFERENCES "agendamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reagendamentos_mudou" CHECK ("inicio_anterior" <> "inicio_novo")
);

CREATE INDEX "reagendamentos_agendamento_id_created_at_idx" ON "reagendamentos"("agendamento_id", "created_at");

-- O cliente não cancela direto: ele pede (com motivo) e o admin aprova ou recusa.
CREATE TABLE "solicitacoes_cancelamento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agendamento_id" UUID NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" "status_solicitacao_cancelamento" NOT NULL DEFAULT 'pendente',
    "resposta" TEXT,
    "decidido_em" TIMESTAMPTZ(6),
    "decidido_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitacoes_cancelamento_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "solicitacoes_cancelamento_agendamento_id_fkey" FOREIGN KEY ("agendamento_id")
        REFERENCES "agendamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "solicitacoes_cancelamento_decidido_por_fkey" FOREIGN KEY ("decidido_por")
        REFERENCES "usuarios_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "solicitacoes_cancelamento_motivo_valido" CHECK (
        length(trim("motivo")) > 0 AND length("motivo") <= 500
    ),
    CONSTRAINT "solicitacoes_cancelamento_resposta_valida" CHECK (
        "resposta" IS NULL OR (length(trim("resposta")) > 0 AND length("resposta") <= 500)
    ),
    -- Pendente = ainda sem decisão; decidida = com data da decisão.
    CONSTRAINT "solicitacoes_cancelamento_decisao_coerente" CHECK (
        ("status" = 'pendente') = ("decidido_em" IS NULL)
    )
);

-- No máximo uma solicitação pendente por agendamento.
CREATE UNIQUE INDEX "solicitacoes_cancelamento_pendente_key"
    ON "solicitacoes_cancelamento"("agendamento_id") WHERE "status" = 'pendente';
CREATE INDEX "solicitacoes_cancelamento_status_created_at_idx" ON "solicitacoes_cancelamento"("status", "created_at");
CREATE INDEX "solicitacoes_cancelamento_agendamento_id_idx" ON "solicitacoes_cancelamento"("agendamento_id");

CREATE TRIGGER trg_solicitacoes_cancelamento_updated_at
BEFORE UPDATE ON "solicitacoes_cancelamento"
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at();

-- Nada acessível pela API REST do Supabase (anon/authenticated); só o backend lê e grava.
ALTER TABLE "agendamentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reagendamentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "solicitacoes_cancelamento" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE "agendamentos", "reagendamentos", "solicitacoes_cancelamento" FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE "agendamentos", "reagendamentos", "solicitacoes_cancelamento" FROM authenticated;
    END IF;
END;
$$;
