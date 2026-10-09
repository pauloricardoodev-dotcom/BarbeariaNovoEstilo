# Pendências e inconsistências conhecidas

## Funcionalidades simuladas / incompletas
- Sem backend: agendamentos do site **não chegam** ao admin; nada persiste.
- Disponibilidade de horários no site é um hash falso (`slotUnavailable`), não consulta a agenda.
- Pagamento (Pix QR, cartão) é demonstração; cartão sem validação.
- Admin sem login; Configurações não salva; botão de notificações/Navbar não usados.
- Admin: criar/editar/remover serviço ou profissional não afeta Agenda, Dashboard nem o site.
- Conflito de horário na Agenda ignora profissional (dois profissionais não podem atender no mesmo horário).
- Dashboard usa mock estático, não o estado da Agenda; meses exibidos partem da data atual, mas o mock é de 09/2026.

## Inconsistências entre áreas
- Endereço: site = Rua das Palmeiras, 482, Batel, Curitiba; admin Configurações = "Rua Principal, 123 - Centro", telefone (44) vs. (41) no site.
- Horário: Footer "Terça a sábado 09h–19h"; Configurações "Seg–Sáb 09:00–18:00"; site bloqueia só domingos (segunda aberta).
- Ids de serviço: string no site, numérico no admin.
- `PROS` (constants.js) não usado; `Sidebar/Navbar/Filters/Pagination/AppointmentsTable/StatsCards/DetailsModal/EditModal` órfãos.
- `index.html` referencia `/favicon.svg`; `admin.html` referencia `/vite.svg` (inexistente em `public/`).
- `vite.config.js` sem entrada multi-page → verificar se `npm run build` inclui `admin.html`.
- `RefatorancaoVisual.md` cita `/referencia/hero.png` que não existe no repo.

## Refatoração visual em andamento (`RefatorancaoVisual.md`)
Hero (layout, estatísticas, bordas/decoração), Header com "Profissionais", nova seção "Nossa equipe" com cards de profissionais e imagens. Verificar o arquivo antes de mexer em UI do site.
