import useConfiguracoes from '../configuracao/useConfiguracoes';

const Mapa = () => {
  const { nome, endereco } = useConfiguracoes();
  const consulta = encodeURIComponent(endereco);

  return (
    <section className="section section-navy" id="mapa">
      <div className="wrap">
        <div className="section-head">
          <div className="kicker-line on-dark"><div className="rule"></div><span>Localização</span></div>
          <h2>Venha nos visitar.</h2>
          <p>Estamos no coração de Curitiba. Veja como chegar.</p>
        </div>
        <div className="mapa-caixa">
          <iframe
            title={`Localização da ${nome} no Google Maps`}
            src={`https://www.google.com/maps?q=${consulta}&hl=pt-BR&z=16&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <div className="mapa-rodape">
          <p className="mapa-endereco">{endereco}</p>
          <a
            className="btn btn-outline"
            href={`https://www.google.com/maps/search/?api=1&query=${consulta}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir no Google Maps
          </a>
        </div>
      </div>
    </section>
  );
};

export default Mapa;
