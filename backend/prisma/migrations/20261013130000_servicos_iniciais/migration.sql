-- Serviços iniciais (placeholders) para o catálogo não começar vazio. O barbeiro edita, inativa ou
-- adiciona pelo painel. Preços e durações são provisórios até o dono definir os reais (ver decisoes.md).
-- Idempotente: não duplica nem sobrescreve se um serviço com o mesmo nome já existir.
INSERT INTO "servicos" ("nome", "descricao", "preco", "duracao_minutos") VALUES
    ('Corte Feminino',  'Corte feminino com lavagem e finalização', 80.00,  60),
    ('Corte Masculino', 'Corte masculino tradicional',              50.00,  45),
    ('Corte Infantil',  'Corte para crianças até 12 anos',          40.00,  40),
    ('Escova',          'Escova progressiva ou modeladora',         60.00,  45),
    ('Hidratação',      'Hidratação profunda dos fios',             70.00,  60),
    ('Coloração',       'Coloração completa dos fios',              150.00, 120)
ON CONFLICT (lower(trim("nome"))) DO NOTHING;
