// Ícones de traço fino para os campos das telas de conta (decorativos: o rótulo do campo é quem informa).
const Icone = ({ children }) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const IconeEmail = () => (
  <Icone>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </Icone>
);

export const IconeCadeado = () => (
  <Icone>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icone>
);

export const IconePessoa = () => (
  <Icone>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
  </Icone>
);

export const IconeTelefone = () => (
  <Icone>
    <rect x="7" y="3" width="10" height="18" rx="2" />
    <path d="M11 18h2" />
  </Icone>
);
