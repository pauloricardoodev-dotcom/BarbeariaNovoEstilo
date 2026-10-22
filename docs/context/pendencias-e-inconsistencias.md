# Pendências e inconsistências conhecidas

## Funcionalidades simuladas / incompletas
- Backend tem login do admin e contas de cliente (Fases 1 e 3: cadastro, login, verificação, minha conta), mas o agendamento ainda não exige login e **não chega** ao admin; o resto não persiste.
- `RefatorancaoVisual.md` citado nos docs não existe no repositório.
- Pagamento online (Mercado Pago) implementado nas fases A–C, **testado só com gateway fake**: falta validar no sandbox (assinatura do webhook, resposta do Pix/cartão, CPF no token, estorno). Com `PAGAMENTO_PROVEDOR=desligado` o site volta ao fluxo antigo (Pix estático e cartão de demonstração, sem cobrança). Pedidos de cancelamento: o "botão de estorno" é aprovar a solicitação.
- Configurações salva (nome, contato, expediente, antecedência e janela); a seção de notificações/lembretes não existe ainda. Botão de notificações/Navbar legados não usados.
- Aba Profissionais removida do painel (o cliente quer de volta no futuro); `ProfessionalsTab.jsx` segue no repositório, sem rota e com dados de mock.

## Inconsistências entre áreas
- `PROS` (constants.js) não usado; `Sidebar/Navbar/Filters/Pagination/AppointmentsTable/StatsCards/DetailsModal/EditModal` órfãos.
- `RefatorancaoVisual.md` cita `/referencia/hero.png` que não existe no repo.

## Refatoração visual em andamento (`RefatorancaoVisual.md`)
Hero (layout, estatísticas, bordas/decoração), Header com "Profissionais", nova seção "Nossa equipe" com cards de profissionais e imagens. Verificar o arquivo antes de mexer em UI do site.

- Cancelamento direto pelo barbeiro **sem pedido do cliente** ainda não avisa o cliente (decisão de pedido de cancelamento e reagendamento pelo barbeiro avisam por WhatsApp). Em produção os 3 templates de aviso precisam ser aprovados pela Meta.