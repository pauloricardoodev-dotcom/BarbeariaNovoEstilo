// Ícones de traço simples (24x24, herdam a cor do texto via currentColor).
const props = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
};

const ICONES = {
  agenda: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M8 14h2M14 14h2M8 17.5h2" />
    </>
  ),
  dashboard: (
    <>
      <path d="M4 20h16" />
      <rect x="5" y="11" width="3.5" height="7" rx="1" />
      <rect x="10.25" y="5" width="3.5" height="13" rx="1" />
      <rect x="15.5" y="9" width="3.5" height="9" rx="1" />
    </>
  ),
  servicos: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
    </>
  ),
  configuracoes: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  sino: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  perfil: (
    <>
      <circle cx="12" cy="8.5" r="3.7" />
      <path d="M5 20.5c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2" />
    </>
  ),
  sair:<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  clientes: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.2.7 3.5 2.6 3.5 5.6" />
    </>
  ),
  faturamento: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M15.5 9H10a1.8 1.8 0 0 0 0 3.6h4a1.8 1.8 0 0 1 0 3.6H8.5M12 6.5v11" />
    </>
  ),
  cancelamentos: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m15 9-6 6M9 9l6 6" />
    </>
  ),
};

const Icone = ({ nome, size = 22, className }) => (
  <svg {...props} width={size} height={size} className={className}>
    {ICONES[nome]}
  </svg>
);

export default Icone;
