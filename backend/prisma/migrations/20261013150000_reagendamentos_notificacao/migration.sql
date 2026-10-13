-- Notificação de reagendamento para o barbeiro: o cliente reagenda sozinho (sem aprovação), e o barbeiro
-- só precisa "ver". Guardamos quem reagendou (cliente ou o próprio admin) e quando o barbeiro viu.

CREATE TYPE "origem_reagendamento" AS ENUM ('cliente', 'admin');

ALTER TABLE "reagendamentos"
    ADD COLUMN "origem" "origem_reagendamento" NOT NULL DEFAULT 'cliente',
    ADD COLUMN "visto_em" TIMESTAMPTZ(6),
    ADD COLUMN "visto_por" UUID;

-- O histórico que já existia não vira notificação.
UPDATE "reagendamentos" SET "visto_em" = "created_at";

ALTER TABLE "reagendamentos"
    ADD CONSTRAINT "reagendamentos_visto_por_fkey" FOREIGN KEY ("visto_por")
        REFERENCES "usuarios_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    -- Reagendamento feito pelo admin nunca é notificação: já nasce "visto".
    ADD CONSTRAINT "reagendamentos_origem_admin_ja_visto" CHECK ("origem" = 'cliente' OR "visto_em" IS NOT NULL);

-- Só as notificações pendentes (cliente reagendou e o barbeiro ainda não viu).
CREATE INDEX "reagendamentos_nao_vistos_idx" ON "reagendamentos"("created_at") WHERE "visto_em" IS NULL;
