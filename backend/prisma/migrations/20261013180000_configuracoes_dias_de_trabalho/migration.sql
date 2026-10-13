-- Dias de trabalho da semana, escolhidos em Configurações com uma fileira de interruptores (um por dia).
-- Numeração: 1 = segunda … 6 = sábado, 7 = domingo. Os dias que não estão na lista são folga semanal
-- (fecham por padrão, como o domingo fechava antes; o dono ainda pode desbloquear um dia específico).
-- O padrão (segunda a sábado) mantém o comportamento anterior.

ALTER TABLE "configuracoes"
    ADD COLUMN "dias_trabalho" INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5, 6];

-- Pelo menos um dia, só valores de 1 a 7. (O backend remove repetidos e ordena antes de gravar.)
ALTER TABLE "configuracoes"
    ADD CONSTRAINT "configuracoes_dias_trabalho_validos" CHECK (
        cardinality("dias_trabalho") BETWEEN 1 AND 7
        AND "dias_trabalho" <@ ARRAY[1, 2, 3, 4, 5, 6, 7]
    );
