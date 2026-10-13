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
2. **Data e horário** — calendário mensal limitado à janela de agendamento (**de hoje até 3 meses**; domingos e dias fora da janela desabilitados; setas de mês param nos limites). Ao escolher o dia, busca os **horários livres reais** em `GET /api/disponibilidade?data=&servicoId=` (considera a duração do serviço, o expediente 08:00–18:00, o almoço, os agendamentos já feitos e, **para hoje, a antecedência mínima de 2 h**), agrupados em Manhã/Tarde, com estados "Carregando…", erro e "Não há horários livres neste dia". Trocar de serviço ou de data zera o horário.
   Ao continuar, se o e-mail ou o WhatsApp não estiverem confirmados, mostra aviso com link para `/verificar` e não avança.
3. **Pagamento** — "Agendando como Fulano" + link "Alterar meus dados"; card-resumo lateral (serviço, data/hora, cliente, total). Abas: **Pix** (QR code fake gerado em SVG por hash + valor), **Cartão** (formulário sem processamento real; máscaras em `utils/cartao.js`: número em grupos de 4, nome em maiúsculas, validade MM/AA, CVV 3–4 dígitos; ao pagar valida Luhn, vencimento e CVV. Ao "Pagar", pergunta "Deseja cadastrar o cartão?" — Sim conclui (salvamento real só com gateway; `TODO(gateway)`); Não abre o aviso "no próximo agendamento será necessário informar os dados novamente" com "Confirmar pagamento"/"Voltar". Os dados do cartão são apagados do estado ao concluir e nunca vão ao backend), **Presencial**. **Cada botão de confirmação (Pix "Já realizei o pagamento", cartão "Pagar" e presencial "Confirmar agendamento") grava o agendamento de verdade** (`POST /api/clientes/me/agendamentos`, só com a forma de pagamento escolhida — Pix e cartão seguem de demonstração, sem cobrança). Se o horário foi ocupado no meio tempo (409) ou ficou inválido (400), volta ao passo 2 com o aviso e a lista atualizada; sessão expirada e conta não verificada mostram mensagem clara.
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
- Ainda não: botão "Entrar com Google" (Fase 2).


## Meus agendamentos (`/meus-agendamentos`)
Página protegida (`ExigeCliente`), link no Header (desktop e menu mobile). **Ligada à API** (`api/agendamentos.js`): lista os agendamentos do cliente (serviço, dia/hora, duração, forma de pagamento + preço e, em cinza no canto, quando foi agendado), com estados de carregando/erro/vazio.
- **Reagendar** (só muda dia/hora; o serviço fica): painel com data (janela hoje → 3 meses, sem domingo; hoje só com 2 h de antecedência) e horários livres reais do dia para aquele serviço. O botão fica desabilitado, com o motivo ao lado, quando o servidor diz que não pode (`podeReagendar`): atendimento que já passou, agendamento não ativo ou menos de 2 h do início (exatamente 2 h ainda pode). Se o horário for tomado por outra pessoa (409), a lista de horários é atualizada.
- **Solicitar cancelamento**: o cliente não cancela direto; envia um motivo obrigatório (até 500 caracteres) e o horário continua reservado até o barbeiro decidir. A tela mostra o estado do pedido: aguardando, recusado ou aprovado (com a resposta do barbeiro, se houver). Um pedido pendente por vez.
- Mensagens e regras vêm do servidor; o front só espelha para guiar (`utils/datas.js`).