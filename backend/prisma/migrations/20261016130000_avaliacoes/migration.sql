-- Avaliações dos clientes (nota 1–5, comentário e até 3 fotos).
-- Aparecem no site assim que enviadas; o dono pode ocultar ("publicada" = false) pelo painel.
-- O cliente pode apagar a própria avaliação ("removida_em"; as fotos e seus registros são apagados).
-- Reutiliza public.atualizar_updated_at(), criada em 20261010220000_usuarios_admin.

CREATE TABLE "avaliacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "nota" SMALLINT NOT NULL,
    "comentario" TEXT NOT NULL,
    "publicada" BOOLEAN NOT NULL DEFAULT true,
    "removida_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacoes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "avaliacoes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "avaliacoes_nota_valida" CHECK ("nota" BETWEEN 1 AND 5),
    CONSTRAINT "avaliacoes_comentario_valido" CHECK (length(trim("comentario")) > 0 AND length("comentario") <= 600)
);

-- Garantia final: no máximo uma avaliação ativa por cliente, inclusive em envios simultâneos.
CREATE UNIQUE INDEX "avaliacoes_uma_ativa_por_cliente" ON "avaliacoes"("cliente_id") WHERE "removida_em" IS NULL;

-- Listagem pública (mais recentes primeiro, só visíveis).
CREATE INDEX "avaliacoes_visiveis_idx" ON "avaliacoes"("created_at" DESC) WHERE "publicada" AND "removida_em" IS NULL;

CREATE TRIGGER trg_avaliacoes_updated_at
BEFORE UPDATE ON "avaliacoes"
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_updated_at();

CREATE TABLE "avaliacao_fotos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "avaliacao_id" UUID NOT NULL,
    "posicao" SMALLINT NOT NULL,
    "caminho" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacao_fotos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "avaliacao_fotos_avaliacao_id_fkey" FOREIGN KEY ("avaliacao_id") REFERENCES "avaliacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    -- No máximo 3 fotos por avaliação, sem posição repetida (garantido pelo banco).
    CONSTRAINT "avaliacao_fotos_posicao_valida" CHECK ("posicao" BETWEEN 1 AND 3),
    CONSTRAINT "avaliacao_fotos_caminho_valido" CHECK (length(trim("caminho")) > 0)
);

CREATE UNIQUE INDEX "avaliacao_fotos_caminho_key" ON "avaliacao_fotos"("caminho");
CREATE UNIQUE INDEX "avaliacao_fotos_avaliacao_id_posicao_key" ON "avaliacao_fotos"("avaliacao_id", "posicao");

-- Nada acessível pela API REST do Supabase (anon/authenticated); só o backend lê e grava.
ALTER TABLE "avaliacoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "avaliacao_fotos" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE "avaliacoes" FROM anon;
        REVOKE ALL ON TABLE "avaliacao_fotos" FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE "avaliacoes" FROM authenticated;
        REVOKE ALL ON TABLE "avaliacao_fotos" FROM authenticated;
    END IF;
END;
$$;
