# Decisões de produto e técnicas

Fonte da verdade. Onde conflitar com outros arquivos de `docs/context/`, vale este.

## Negócio (definido pelo dono/cliente)
- **Horário de funcionamento:** segunda a sábado, 08:00–18:00. Domingo fechado. (Footer, Configurações e calendário do site ainda mostram valores antigos.)
- **Um único profissional (o dono).** Remover tudo de multi-profissional: aba Profissionais do admin, campo profissional em agendamento/reserva, `PROS`, "3 especialistas" (Hero e About), seção "Nossa equipe" do briefing. O cliente **não escolhe** profissional.
- **Sem contas de cliente.** Hoje tudo é caderno físico. Cliente agenda como convidado (nome, telefone, e-mail); identificar `Customer` pelo telefone.
- **Acesso ao admin:** dono (role `ADMIN`) e o desenvolvedor para suporte (role `SUPPORT`). Sem perfil de profissional.
- **Lembretes:** via WhatsApp.
- **Dados reais** (endereço, telefone, fotos, textos): sem urgência; manter placeholders.

## Stack-alvo
NestJS + PostgreSQL + Prisma no back; frontend atual (React/Vite). Dono único ⇒ agenda única: sem `Professional`, sem `ProfessionalService`.

## Alinhando com cliente...
- **Duração de cada serviço:** o dono vai definir/alinhar com o desenvolvedor o tempo realista de cada serviço, para evitar cliente esperando por atendimento anterior que estourou. Até lá, as durações atuais (`duration`) são placeholders.
- **Pagamento:** verificando se **Pix estático + presencial** já atende ou se há necessidade de sinal/cobrança online (gateway, ex.: Mercado Pago). Premissa de trabalho: MVP sem gateway; remover aba "Cartão" do site se confirmado.

## Em aberto
- WhatsApp: MVP com link `wa.me` manual vs. WhatsApp Cloud API (Meta).
- Intervalo de almoço (o front hoje bloqueia 12:00–14:00) e granularidade dos slots (hoje 30 min).
- Catálogo de serviços: a lista atual (Corte Feminino, Escova, Hidratação, Coloração…) parece de salão, não de barbearia — confirmar com o dono.
- Política de cancelamento / antecedência mínima e máxima.

## Regra de disponibilidade (a implementar no servidor)
Um agendamento ocupa o intervalo `[início, início + duração do serviço)`. Um novo horário é válido se seu intervalo não se sobrepõe a nenhum agendamento não cancelado, cabe no expediente e respeita bloqueios/folgas. Proteger contra dupla reserva com transação ou constraint no Postgres.
