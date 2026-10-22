import '../styles/carregando.css';

// Tela de carregamento: tesoura aparando e pente alisando os fios.
// Autocontida (CSS próprio) porque também é usada como fallback do Suspense,
// antes de o CSS do site ou do admin ser carregado.
const FIOS = [62, 74, 86, 98, 110, 122];

const Carregando = ({ texto = 'Carregando…', tela = true }) => (
  <div className={`carregando${tela ? ' carregando--tela' : ''}`} role="status">
    <svg className="carregando__cena" viewBox="0 0 200 130" aria-hidden="true">
      {FIOS.map((x, i) => (
        <g key={x}>
          <path className="carregando__fio" d={`M${x} 8 C${x + 5} 30 ${x - 5} 50 ${x} 80`} />
          <path
            className="carregando__ponta"
            style={{ animationDelay: `${i * 0.06}s` }}
            d={`M${x} 80 C${x + 2} 86 ${x - 2} 91 ${x} 97`}
          />
        </g>
      ))}

      <g className="carregando__pente">
        <rect x="52" y="6" width="80" height="7" rx="2" />
        {FIOS.map((x) => (
          <rect key={x} x={x - 1.5} y="13" width="3" height="10" rx="1" />
        ))}
      </g>

      <g className="carregando__tesoura">
        <g className="carregando__lamina carregando__lamina--cima">
          <path d="M150 82 L92 79 L150 78 Z" />
          <circle cx="166" cy="92" r="9" />
        </g>
        <g className="carregando__lamina carregando__lamina--baixo">
          <path d="M150 78 L92 81 L150 82 Z" />
          <circle cx="166" cy="68" r="9" />
        </g>
        <circle className="carregando__eixo" cx="150" cy="80" r="2.5" />
      </g>
    </svg>
    <p className="carregando__texto">{texto}</p>
  </div>
);

export default Carregando;
