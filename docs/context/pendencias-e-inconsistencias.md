# Pendências e inconsistências conhecidas

## Funcionalidades simuladas / incompletas
- Backend tem login do admin e contas de cliente (Fases 1 e 3: cadastro, login, verificação, minha conta), mas o agendamento ainda não exige login e **não chega** ao admin; o resto não persiste.
- `RefatorancaoVisual.md` citado nos docs não existe no repositório.
- Pagamento online (Mercado Pago) implementado nas fases A–C, **testado só com gateway fake**: falta validar no sandbox (assinatura do webhook, resposta do Pix/cartão pelo Card Payment Brick, estorno). Sem `MERCADOPAGO_WEBHOOK_SECRET` todo webhook é recusado e a confirmação depende da tela de pagamento aberta (ou do job ao vencer a reserva); sem `MERCADOPAGO_PUBLIC_KEY` o cartão fica indisponível.
- **Temporário (2026-10-24):** a exigência de e-mail + WhatsApp confirmados para agendar/avaliar pode ser desligada com `EXIGIR_CONTA_VERIFICADA=false` (backend) e `VITE_EXIGIR_CONTA_VERIFICADA=false` (frontend; esconde também o aviso de pendências); padrão `true`. Religar antes de produção. Com `PAGAMENTO_PROVEDOR=desligado` o site volta ao fluxo antigo (Pix estático e cartão de demonstração, sem cobrança). Pedidos de cancelamento: o "botão de estorno" é aprovar a solicitação.
- Configurações salva (nome, contato, expediente, antecedência e janela); a seção de notificações/lembretes não existe ainda. Botão de notificações/Navbar legados não usados.
- Aba Profissionais removida do painel (o cliente quer de volta no futuro); `ProfessionalsTab.jsx` segue no repositório, sem rota e com dados de mock.

## Inconsistências entre áreas
- `PROS` (constants.js) não usado; `Sidebar/Navbar/Filters/Pagination/AppointmentsTable/StatsCards/DetailsModal/EditModal` órfãos.
- `RefatorancaoVisual.md` cita `/referencia/hero.png` que não existe no repo.

## Refatoração visual em andamento (`RefatorancaoVisual.md`)
Hero (layout, estatísticas, bordas/decoração), Header com "Profissionais", nova seção "Nossa equipe" com cards de profissionais e imagens. Verificar o arquivo antes de mexer em UI do site.

- Cancelamento direto pelo barbeiro **sem pedido do cliente** ainda não avisa o cliente (decisão de pedido de cancelamento e reagendamento pelo barbeiro avisam por WhatsApp). Em produção os 3 templates de aviso precisam ser aprovados pela Meta.