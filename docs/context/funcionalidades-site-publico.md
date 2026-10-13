# Funcionalidades — Site público (`frontend/src/components`)

Home (`pages/HomePage.jsx`) com âncoras: `#inicio`, `#servicos`, `#agendamento`, `#sobre`. Rolagem suave via `scrollIntoView`; vindo de outra página (`/#secao`), a home rola ao montar. Telas de conta: ver "Conta do cliente" abaixo.

## Header (`Header.jsx`)
- Logo (emblema SVG) + "Barbearia Novo Estilo" / "BARBEARIA CLÁSSICA".
- Nav: Início, Serviços, Sobre, Agendar (desktop; `d-none d-lg-flex`). *(O briefing pede também "Profissionais" — não existe ainda.)*
- Botão CTA "Agendar horário" (desktop) e botão hambúrguer com menu mobile (`mobileNavOpen`, fecha ao navegar).
- "Entrar" (anônimo) ou "Olá, Nome" → `/minha-conta` (logado); nada enquanto a sessão carrega.

## Hero (`Hero.jsx`)
- Título/subtítulo, CTAs "Agendar" (→ `#agendamento`) e "Serviços" (→ `#servicos`).
- Estatísticas `HERO_STATS`: 13+ anos, 3 especialistas, 4.9 avaliação. Imagem `public/assets/hero.jpg`.

## Serviços (`Services.jsx`)
- Cards numerados (01…) para cada serviço ativo vindo de `GET /api/servicos` (carregado uma vez em `HomePage` via `hooks/useServicos` e repassado a `Services` e `Booking`): nome, preço (`R$ 80,00`), duração. Mostra "Carregando…", erro ou "Nenhum serviço disponível" conforme o caso. Ids são UUID.
- Botão "Agendar" por card → `onBookService(id)` sobe para `App`, que passa `preSelectedService` ao `Booking` e rola até `#agendamento`.

## Agendamento (`Booking.jsx`) — 3 passos + confirmação
Barra de progresso com `STEP_LABELS` (Serviço, Data e horário, Pagamento) + passo 4 de confirmação. Sem etapa de dados: nome/celular/e-mail vêm do perfil (login obrigatório).
1. **Serviço** — escolher entre os 6 serviços (pré-seleciona se veio do card). "Continuar" desabilitado sem seleção.
2. **Data e horário** — calendário mensal com navegação de mês; desabilita dias passados e **domingos** (fechado). Horários manhã (09:00–11:30) e tarde (14:00–16:30) em slots de 30 min; indisponibilidade **simulada** por hash determinístico (`slotUnavailable`). Troca de data zera o horário. Card-resumo lateral (serviço, data, hora, preço).
   Ao continuar, se o e-mail ou o WhatsApp não estiverem confirmados, mostra aviso com link para `/verificar` e não avança.
3. **Pagamento** — "Agendando como Fulano" + link "Alterar meus dados"; card-resumo lateral (serviço, data/hora, cliente, total). Abas: **Pix** (QR code fake gerado em SVG por hash + valor), **Cartão** (formulário sem processamento real; máscaras em `utils/cartao.js`: número em grupos de 4, nome em maiúsculas, validade MM/AA, CVV 3–4 dígitos; ao pagar valida Luhn, vencimento e CVV. Ao "Pagar", pergunta "Deseja cadastrar o cartão?" — Sim conclui (salvamento real só com gateway; `TODO(gateway)`); Não abre o aviso "no próximo agendamento será necessário informar os dados novamente" com "Confirmar pagamento"/"Voltar". Os dados do cartão são apagados do estado ao concluir e nunca vão ao backend), **Presencial**.
4. **Confirmação** — resumo, botão **baixar .ics** (evento de calendário com duração do serviço e endereço), botão de recomeçar (`resetFlow`, volta ao topo). Toast temporário de feedback (`showToastMessage`, 2,6 s).

## Sobre (`About.jsx`)
Arte SVG + texto "Nossa história" + marcos: 13 anos, 3 especialistas, 6 serviços.

## Footer (`Footer.jsx`)
Marca, descrição, links de navegação, contato (Rua das Palmeiras, 482, Batel — Curitiba/PR; `tel:+554130251187`; Instagram `@barbearianovoestilo`), funcionamento "Terça a sábado, 09h às 19h". Rodapé com links para `/termos` e `/privacidade`.

## Não implementado no site (do briefing `RefatorancaoVisual.md`)
Seção "Nossa equipe / Profissionais" com cards e imagens; `PROS` existe em `constants.js` mas **nenhum componente o usa**; item "Profissionais" no menu.

## Conta do cliente (`pages/`, Fase 3)
Backend: `/api/clientes/*` (ver `arquitetura.md`). Sessão em cookie httpOnly; o front só pergunta `GET /clientes/me`.
- **Entrar** (`/entrar`): e-mail + senha (`autocomplete` username/current-password, para o navegador salvar), "Esqueci minha senha", link para cadastro. Aceita `?voltar=/caminho` (só caminhos internos). Conta não verificada vai antes para `/verificar`.
- **Cadastro** (`/cadastro`): nome, e-mail, celular (máscara `(41) 99999-0000`), senha + confirmação (mín. 8, mostrar/ocultar), aceite de termos/privacidade (links abrem em nova aba). Validação básica no front; erros do backend (409 e-mail/telefone duplicado, 400) aparecem no campo correspondente.
- **Verificar** (`/verificar`): um bloco para o e-mail e outro para o WhatsApp, código de 6 dígitos (`one-time-code`), "Reenviar" com contagem de 60 s. Em dev, os códigos aparecem no console do backend (`*_PROVEDOR=log`).
- **Esqueci / redefinir senha**: resposta sempre genérica; o link do e-mail (`/redefinir-senha#token=…`) tem o token lido do fragmento e apagado da barra de endereço; ao redefinir, todas as sessões caem.
- **Minha conta** (`/minha-conta`): aviso se falta verificar; editar nome/e-mail/celular (trocar e-mail pede a senha atual; trocar contato exige nova verificação); alterar senha (desconecta outros aparelhos); sair.
- **Termos / Privacidade**: texto genérico **provisório**; ao trocar pelo definitivo, atualizar `TERMOS_VERSAO_ATUAL` no backend.
- **Login obrigatório**: a home exige sessão (`ExigeCliente`); sem sessão, o Header mostra só a marca e "Entrar".
- Ainda não: botão "Entrar com Google" (Fase 2) e "Meus agendamentos" (Fase 6). O agendamento ainda não é gravado no backend.


## Meus agendamentos (`/meus-agendamentos`)
Página protegida (`ExigeCliente`), link no Header (desktop e menu mobile). Lista cada agendamento com serviço, dia/hora do atendimento, forma de pagamento (+ preço) e quando foi agendado; botão **Reagendar** (só muda data/hora, janela amanhã → 3 meses, sem domingo, desabilitado a menos de 2 h do início; botão aparece desabilitado, com aviso, se o atendimento já passou). **MOCK**: dados de `src/data/agendamentosMock.js` em estado local, sem persistência, até a Fase 5 do backend. "Solicitar cancelamento" ainda não existe.
