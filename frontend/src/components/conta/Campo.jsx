import { useId, useState } from 'react';

/** Campo de formulário no estilo `.field` do site, com mensagem de erro acessível. */
const Campo = ({ label, erro, dica, icone, tipo = 'text', ...props }) => {
  const id = useId();
  const idMensagem = `${id}-msg`;
  const input = (
    <input
      id={id}
      type={tipo}
      aria-invalid={Boolean(erro)}
      aria-describedby={erro || dica ? idMensagem : undefined}
      {...props}
    />
  );
  return (
    <div className={`field ${erro ? 'invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {icone ? (
        <div className="field-caixa">
          <span className="field-icone">{icone}</span>
          {input}
        </div>
      ) : (
        input
      )}
      {erro ? (
        <span id={idMensagem} className="err">
          {erro}
        </span>
      ) : (
        dica && (
          <span id={idMensagem} className="field-hint">
            {dica}
          </span>
        )
      )}
    </div>
  );
};

/** Campo de senha com botão mostrar/ocultar. */
export const CampoSenha = ({ label, erro, dica, icone, ...props }) => {
  const id = useId();
  const idMensagem = `${id}-msg`;
  const [visivel, setVisivel] = useState(false);
  return (
    <div className={`field ${erro ? 'invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className={`field-senha ${icone ? 'com-icone' : ''}`}>
        {icone && <span className="field-icone">{icone}</span>}
        <input
          id={id}
          type={visivel ? 'text' : 'password'}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro || dica ? idMensagem : undefined}
          {...props}
        />
        <button
          type="button"
          className="field-senha-toggle"
          onClick={() => setVisivel(!visivel)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visivel}
        >
          {visivel ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {erro ? (
        <span id={idMensagem} className="err">
          {erro}
        </span>
      ) : (
        dica && (
          <span id={idMensagem} className="field-hint">
            {dica}
          </span>
        )
      )}
    </div>
  );
};

export default Campo;
