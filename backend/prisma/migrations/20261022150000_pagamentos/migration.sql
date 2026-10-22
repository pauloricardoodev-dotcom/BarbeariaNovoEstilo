-- Pagamento online (gateway): cobranças, eventos de webhook e reserva provisória de horário.
-- Ver GatewayPagamento.md (fase A). Reutiliza public.atualizar_updated_at().
-- Decisão: cobra-se o valor TOTAL do serviço (sem sinal); forma "presencial" não gera registro aqui.
-- Nada é apagado: FK com ON DELETE RESTRICT; estorno = status 'estornado' (o registro permanece).

CREATE TYPE "status_pagamento" AS ENUM (
    'pendente', 'aprovado', 'recusado', 'cancelado', 'estornado', 'expirado'
);

-- Reserva provisória: enquanto "expira_em" estiver preenchido, o agendamento (status 'agendado') segura
-- o horário esperando o pagamento online. Pago -> o backend zera o campo; vencido sem pagar -> o backend
-- cancela o agendamento (libera o horário). O EXCLUDE de sobreposição já cobre o horário reservado.
ALTER TABLE "agendamentos" ADD COLUMN "expira_em" TIMESTAMPTZ(6);
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_expira_em_coerente" CHECK (
    "expira_em" IS NULL OR ("status" = 'agendado' AND "cliente_id" IS NOT NULL)
);
CREATE INDEX "agendamentos_reserva_expira_em_idx" ON "agendamentos"("expira_em")
    WHERE "expira_em" IS NOT NULL;

CREATE TABLE "pagamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agendamento_id" UUID NOT NULL,
    "gateway" TEXT NOT NULL,
    -- Id da cobrança no gateway. Nulo só entre a criação do registro local e a resposta do gateway
    -- (o registro é gravado ANTES de cobrar, para nunca existir cobrança sem rastro local).
    "id_externo" TEXT,
    "metodo" "forma_pagamento" NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "status" "status_pagamento" NOT NULL DEFAULT 'pendente',
    -- Pix: "copia e cola" e validade da cobrança (o QR é gerado a partir do código).
    "pix_copia_cola" TEXT,
    "expira_em" TIMESTAMPTZ(6),
    -- Cartão: só bandeira e 4 últimos dígitos. Número completo e CVV nunca chegam ao backend.
    "cartao_bandeira" TEXT,
    "cartao_ultimos_quatro" TEXT,
    "aprovado_em" TIMESTAMPTZ(6),
    "estornado_em" TIMESTAMPTZ(6),
    -- Resposta do gateway para auditoria; nunca guardar dados sensíveis aqui.
    "payload_bruto" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pagamentos_agendamento_id_fkey" FOREIGN KEY ("agendamento_id")
        REFERENCES "agendamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pagamentos_gateway_valido" CHECK (length(trim("gateway")) > 0),
    CONSTRAINT "pagamentos_id_externo_valido" CHECK ("id_externo" IS NULL OR length(trim("id_externo")) > 0),
    CONSTRAINT "pagamentos_metodo_online" CHECK ("metodo" IN ('pix', 'cartao')),
    CONSTRAINT "pagamentos_valor_valido" CHECK ("valor_centavos" > 0),
    CONSTRAINT "pagamentos_pix_coerente" CHECK ("metodo" = 'pix' OR "pix_copia_cola" IS NULL),
    CONSTRAINT "pagamentos_pix_expira" CHECK ("metodo" <> 'pix' OR "expira_em" IS NOT NULL),
    CONSTRAINT "pagamentos_cartao_coerente" CHECK (
        "metodo" = 'cartao' OR ("cartao_bandeira" IS NULL AND "cartao_ultimos_quatro" IS NULL)
    ),
    CONSTRAINT "pagamentos_cartao_ultimos_quatro_valido" CHECK (
        "cartao_ultimos_quatro" IS NULL OR "cartao_ultimos_quatro" ~ '^[0-9]{4}$'
    ),
    CONSTRAINT "pagamentos_aprovado_em_coerente" CHECK (
        ("status" IN ('aprovado', 'estornado')) = ("aprovado_em" IS NOT NULL)
    ),
    CONSTRAINT "pagamentos_estornado_em_coerente" CHECK (
        ("status" = 'estornado') = ("estornado_em" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "pagamentos_gateway_id_externo_key" ON "pagamentos"("gateway", "id_externo");
-- Garantia final: no máximo um pagamento aprovado e uma tentativa em aberto por agendamento,
-- inclusive em requisições/webhooks simultâneos.
CREATE UNIQUE INDEX "pagamentos_um_aprovado_por_agendamento" ON "pagamentos"("agendamento_id")
    WHERE "status" = 'aprovado';
CREATE UNIQUE INDEX "pagamentos_um_pendente_por_agendamento" ON "pagamentos"("agendamento_id")
    WHERE "status" = 'pendente';
CREATE INDEX "pagamentos_agendamento_id_idx" ON "pagamentos"("agendamento_id");
CREATE INDEX "pagamentos_pendentes_expira_em_idx" ON "pagamentos"("expira_em")
    WHERE "status" = 'pendente';

-- Regras que o banco impõe mesmo se o backend errar:
--  * novo pagamento nasce 'pendente' e com o valor exato do agendamento (preço gravado nele);
--  * agendamento, gateway, método e valor nunca mudam; id_externo, depois de definido, também não;
--  * transições válidas: pendente -> aprovado | recusado | cancelado | expirado; aprovado -> estornado.
CREATE FUNCTION public.pagamentos_validar() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
    preco_agendamento NUMERIC(10,2);
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW."status" <> 'pendente' THEN
            RAISE EXCEPTION 'pagamento deve ser criado como pendente' USING ERRCODE = 'check_violation';
        END IF;
        SELECT "preco" INTO preco_agendamento FROM "agendamentos" WHERE "id" = NEW."agendamento_id";
        IF NEW."valor_centavos" <> round(preco_agendamento * 100) THEN
            RAISE EXCEPTION 'valor do pagamento difere do preco do agendamento' USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW."agendamento_id" <> OLD."agendamento_id"
       OR NEW."metodo" <> OLD."metodo"
       OR NEW."valor_centavos" <> OLD."valor_centavos"
       OR NEW."gateway" <> OLD."gateway" THEN
        RAISE EXCEPTION 'agendamento, gateway, metodo e valor do pagamento sao imutaveis' USING ERRCODE = 'check_violation';
    END IF;
    IF OLD."id_externo" IS NOT NULL AND NEW."id_externo" IS DISTINCT FROM OLD."id_externo" THEN
        RAISE EXCEPTION 'id_externo do pagamento e imutavel' USING ERRCODE = 'check_violation';
    END IF;

    IF NEW."status" <> OLD."status" AND NOT (
        (OLD."status" = 'pendente' AND NEW."status" IN ('aprovado', 'recusado', 'cancelado', 'expirado'))
        OR (OLD."status" = 'aprovado' AND NEW."status" = 'estornado')
    ) THEN
        RAISE EXCEPTION 'transicao de status invalida: % -> %', OLD."status", NEW."status"
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_pagamentos_validar
BEFORE INSERT OR UPDATE ON "pagamentos"
FOR EACH ROW
EXECUTE FUNCTION public.pagamentos_validar();

CREATE TRIGGER trg_pagamentos_updated_at
BEFORE UPDATE ON "pagamentos"
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at();

-- Webhooks recebidos: o id do evento é único por gateway, então o mesmo evento entregue duas vezes
-- não é processado duas vezes (idempotência garantida pelo banco).
CREATE TABLE "eventos_gateway" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gateway" TEXT NOT NULL,
    "id_evento" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB,
    "recebido_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processado_em" TIMESTAMPTZ(6),

    CONSTRAINT "eventos_gateway_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "eventos_gateway_valido" CHECK (
        length(trim("gateway")) > 0 AND length(trim("id_evento")) > 0 AND length(trim("tipo")) > 0
    )
);

CREATE UNIQUE INDEX "eventos_gateway_gateway_id_evento_key" ON "eventos_gateway"("gateway", "id_evento");

-- Nada acessível pela API REST do Supabase (anon/authenticated); só o backend lê e grava.
ALTER TABLE "pagamentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "eventos_gateway" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE "pagamentos", "eventos_gateway" FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE "pagamentos", "eventos_gateway" FROM authenticated;
    END IF;
END;
$$;
