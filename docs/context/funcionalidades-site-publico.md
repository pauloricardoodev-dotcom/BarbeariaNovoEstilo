# Funcionalidades — Site público (`frontend/src/components`)

Página única com âncoras: `#inicio`, `#servicos`, `#agendamento`, `#sobre`. Rolagem suave via `scrollIntoView`.

## Header (`Header.jsx`)
- Logo (emblema SVG) + "Barbearia Novo Estilo" / "BARBEARIA CLÁSSICA".
- Nav: Início, Serviços, Sobre, Agendar (desktop; `d-none d-lg-flex`). *(O briefing pede também "Profissionais" — não existe ainda.)*
- Botão CTA "Agendar horário" (desktop) e botão hambúrguer com menu mobile (`mobileNavOpen`, fecha ao navegar).

## Hero (`Hero.jsx`)
- Título/subtítulo, CTAs "Agendar" (→ `#agendamento`) e "Serviços" (→ `#servicos`).
- Estatísticas `HERO_STATS`: 13+ anos, 3 especialistas, 4.9 avaliação. Imagem `public/assets/hero.jpg`.

## Serviços (`Services.jsx`)
- Cards numerados (01…) para cada item de `SERVICES`: nome, preço (`R$ 80,00`), duração.
- Botão "Agendar" por card → `onBookService(id)` sobe para `App`, que passa `preSelectedService` ao `Booking` e rola até `#agendamento`.

## Agendamento (`Booking.jsx`, ~555 linhas) — fluxo em 5 passos
Barra de progresso com `STEP_LABELS` (Serviço, Data e horário, Dados, Pagamento) + passo 5 de confirmação.
1. **Serviço** — escolher entre os 6 serviços (pré-seleciona se veio do card). "Continuar" desabilitado sem seleção.
2. **Data e horário** — calendário mensal com navegação de mês; desabilita dias passados e **domingos** (fechado). Horários manhã (09:00–11:30) e tarde (14:00–16:30) em slots de 30 min; indisponibilidade **simulada** por hash determinístico (`slotUnavailable`). Troca de data zera o horário. Card-resumo lateral (serviço, data, hora, preço).
3. **Dados** ("Quase pronto!") — nome (≥3 chars), telefone (≥10 dígitos), e-mail (regex); erros por campo (`fieldErrors`).
4. **Pagamento** — abas: **Pix** (QR code fake gerado em SVG por hash + valor), **Cartão** (formulário, sem validação/processamento real — `handleCardPayment` só avança), **Presencial**.
5. **Confirmação** — resumo, botão **baixar .ics** (evento de calendário com duração do serviço e endereço), botão de recomeçar (`resetFlow`, volta ao topo). Toast temporário de feedback (`showToastMessage`, 2,6 s).

## Sobre (`About.jsx`)
Arte SVG + texto "Nossa história" + marcos: 13 anos, 3 especialistas, 6 serviços.

## Footer (`Footer.jsx`)
Marca, descrição, links de navegação, contato (Rua das Palmeiras, 482, Batel — Curitiba/PR; `tel:+554130251187`; Instagram `@barbearianovoestilo`), funcionamento "Terça a sábado, 09h às 19h".

## Não implementado no site (do briefing `RefatorancaoVisual.md`)
Seção "Nossa equipe / Profissionais" com cards e imagens; `PROS` existe em `constants.js` mas **nenhum componente o usa**; item "Profissionais" no menu.
