import { useState } from 'react';

const Estrela = ({ cheia }) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true" focusable="false">
    <path
      d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4L2.8 9.5l6.4-.8z"
      fill={cheia ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

/** Estrelas só para exibir uma nota (1 a 5). */
export const Estrelas = ({ nota, tamanho = 18 }) => (
  <span className="estrelas" role="img" aria-label={`${nota} de 5 estrelas`} style={{ '--tam': `${tamanho}px` }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className="estrela">
        <Estrela cheia={n <= Math.round(nota)} />
      </span>
    ))}
  </span>
);

const ROTULOS = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente'];

/** Seletor de nota (acessível: grupo de opções, setas do teclado trocam a nota). */
export const SeletorEstrelas = ({ valor, onChange, disabled = false }) => {
  const [prev, setPrev] = useState(0);
  const mostrado = prev || valor;

  const aoTeclar = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, (valor || 0) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, (valor || 2) - 1));
    }
  };

  return (
    <div className="seletor-estrelas">
      <div
        className="seletor-estrelas-grupo"
        role="radiogroup"
        aria-label="Sua nota, de 1 a 5 estrelas"
        onMouseLeave={() => setPrev(0)}
        onKeyDown={aoTeclar}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valor === n}
            aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}: ${ROTULOS[n]}`}
            tabIndex={valor === n || (!valor && n === 1) ? 0 : -1}
            className={`seletor-estrela ${n <= mostrado ? 'ativa' : ''}`}
            disabled={disabled}
            onClick={() => onChange(n)}
            onMouseEnter={() => setPrev(n)}
            onFocus={() => setPrev(0)}
          >
            <Estrela cheia={n <= mostrado} />
          </button>
        ))}
      </div>
      <span className="seletor-estrelas-rotulo" aria-live="polite">
        {mostrado ? ROTULOS[mostrado] : 'Toque nas estrelas'}
      </span>
    </div>
  );
};
