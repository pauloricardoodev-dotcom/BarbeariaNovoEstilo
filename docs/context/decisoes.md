# Decisões de produto e técnicas

Fonte da verdade. Onde conflitar com outros arquivos de `docs/context/`, vale este.

## Negócio (definido pelo dono/cliente)
- **Horário de funcionamento:** segunda a sábado, 08:00–18:00. Domingo fechado. (Footer, Configurações e calendário do site ainda mostram valores antigos.)
- **Um único profissional (o dono).** Remover tudo de multi-profissional: aba Profissionais do admin, campo profissional em agendamento/reserva, `PROS`, "3 especialistas" (Hero e About), seção "Nossa equipe" do briefing. O cliente **não escolhe** profissional.
- **Contas de cliente, login obrigatório para usar o site** (decidido em 2026-10-11, revertendo "sem contas"). Ao abrir o sistema, quem não está logado vê a tela de login; só cadastro, recuperação de senha e termos/privacidade abrem sem sessão. Hoje tudo é caderno físico.
  - Entrar com **e-mail + senha** (o navegador salva a senha) ou **conta Google**. Magic link/código por e-mail descartados.
  - Cadastro com nome, e-mail e telefone obrigatórios. **E-mail verificado por código no e-mail; telefone verificado por código no WhatsApp** (chega mais rápido e aparece nas notificações).
  - Recuperação de senha por e-mail.
  - O agendamento **não tem mais etapa de identificação**: dados vêm do perfil.
  - Termos de uso/privacidade: texto genérico provisório até o dono definir o definitivo.
  - Detalhes: [spec-clientes-e-contas.md](spec-clientes-e-contas.md).
- **Reserva manual (só o admin):** o barbeiro registra quem liga/chega sem conta informando **apenas nome, serviço (tipo de corte) e duração** que vai usar. Sem telefone/e-mail e sem criar cliente/conta.
- **Cliente não cancela, só reagenda** (decidido em 2026-10-11):
  - **Reagendar:** mover o próprio agendamento para outro horário disponível; permitido só **até 2 horas antes** do início atual. Depois disso, o cliente não reagenda. **Atendimento retroativo (que já passou) nunca é reagendado, nem para uma data ou horário no passado: o novo horário segue a janela de agendamento (de hoje, com 2 h de antecedência, até 3 meses) e só em horários livres.** **Sem limite de vezes. Só muda o horário** (serviço não muda).
  - **Solicitar cancelamento:** o cliente pede **a qualquer momento** (sem o limite de 2 h), com **motivo em texto obrigatório**; o barbeiro aprova ou recusa. Enquanto pendente, o horário continua reservado.
- **Janela de agendamento** (vale para agendar e para o novo horário de um reagendamento; decidido em 2026-10-13, revertendo o "a partir de amanhã"): a partir de **hoje** (dia de calendário em `America/Sao_Paulo`), até no máximo **3 meses** à frente, sempre só horários livres. **No dia de hoje só entram horários que começam com pelo menos 2 horas de antecedência** (mesma folga do reagendamento; constante `ANTECEDENCIA_MINIMA_AGENDAR_MS` em `backend/src/agendamentos/horarios.ts`). A reserva manual do admin continua podendo usar qualquer horário que ainda não passou.
  - **Só o admin cancela** de fato (diretamente ou aprovando uma solicitação). Cancelado nunca é apagado.
- **Acesso ao admin:** dono (role `ADMIN`) e o desenvolvedor para suporte (role `SUPPORT`). Sem perfil de profissional.
- **WhatsApp via WhatsApp Cloud API (Meta):** códigos de verificação de telefone; lembretes depois.
- **Dados reais** (endereço, telefone, fotos, textos): sem urgência; manter placeholders.

## Stack-alvo
NestJS + PostgreSQL + Prisma no back; frontend atual (React/Vite). Dono único ⇒ agenda única: sem `Professional`, sem `ProfessionalService`.

## Alinhando com cliente...
- **Duração de cada serviço:** o dono vai definir/alinhar com o desenvolvedor o tempo realista de cada serviço, para evitar cliente esperando por atendimento anterior que estourou. Até lá, as durações atuais (`duration`) são placeholders.
- **Pagamento:** verificando se **Pix estático + presencial** já atende ou se há necessidade de sinal/cobrança online (gateway, ex.: Mercado Pago). Premissa de trabalho: MVP sem gateway; remover aba "Cartão" do site se confirmado.

## Em aberto
- **Salvar cartão no perfil** (pedido do dono, 2026-10-11): depois de preencher o cartão, perguntar "Deseja cadastrar o cartão?"; se não, avisar que no próximo agendamento será preciso informar de novo e pedir confirmação. Dados de cartão **não podem** ser guardados no nosso banco (PCI-DSS; CVV nunca) — só via tokenização de um gateway (ex.: Mercado Pago), guardando token + bandeira + 4 últimos dígitos. Depende da decisão do gateway (ver "Pagamento"). **Decidido:** os alertas já estão no front (`Booking.jsx`, `ConfirmDialog`); o salvamento real entra junto com o gateway.
- Intervalo de almoço (o front hoje bloqueia 12:00–14:00) e granularidade dos slots (hoje 30 min). O backend já aplica essas **premissas** (almoço 12:00–14:00, slots de 30 min, expediente 08:00–18:00) em `backend/src/agendamentos/horarios.ts`; quando o dono confirmar, é só ajustar `EXPEDIENTE` lá.
- Catálogo de serviços: a lista atual (Corte Feminino, Escova, Hidratação, Coloração…) parece de salão, não de barbearia — confirmar com o dono.
- Termos de uso/privacidade definitivos.

## Regra de disponibilidade (a implementar no servidor)
Um agendamento ocupa o intervalo `[início, início + duração)`. A duração é gravada no próprio agendamento (do serviço, ou a informada pelo admin na reserva manual). Um novo horário — inclusive num reagendamento — é válido se seu intervalo não se sobrepõe a nenhum agendamento não cancelado, cabe no expediente e respeita bloqueios/folgas. Proteger contra dupla reserva com constraint no Postgres. Regras de horário (limite de 2 h etc.) calculadas no servidor, fuso `America/Sao_Paulo`.
