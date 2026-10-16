import { useCallback, useEffect, useState } from 'react';
import { definirPublicacao, listarAvaliacoes } from '../api/avaliacoes';
import PageHeader from './PageHeader';
import Pagination from './Pagination';
import StatusBadge from './StatusBadge';

const SITUACOES = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'visiveis', rotulo: 'Visíveis no site' },
  { valor: 'ocultas', rotulo: 'Ocultas' },
];

const estrelas = (nota) => '★'.repeat(nota) + '☆'.repeat(5 - nota);
const formatarData = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const AvaliacoesTab = () => {
  const [situacao, setSituacao] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [dados, setDados] = useState({ total: 0, itens: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [alterando, setAlterando] = useState(null); // id em andamento

  const carregar = useCallback(
    () =>
      listarAvaliacoes({ pagina, limite, situacao })
        .then((r) => {
          setDados(r);
          setErro('');
        })
        .catch((err) => setErro(err.message))
        .finally(() => setCarregando(false)),
    [pagina, limite, situacao],
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  const alternar = async (avaliacao) => {
    setAlterando(avaliacao.id);
    setErro('');
    try {
      await definirPublicacao(avaliacao.id, !avaliacao.publicada);
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setAlterando(null);
    }
  };

  const mudarSituacao = (valor) => {
    setSituacao(valor);
    setPagina(1);
    setCarregando(true);
  };

  return (
    <div>
      <PageHeader
        title="Avaliações"
        subtitle="As avaliações aparecem no site assim que o cliente envia. Oculte as que não devem ficar à mostra."
      />

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Filtrar avaliações">
        {SITUACOES.map((s) => (
          <button
            key={s.valor}
            type="button"
            className={`btn btn-sm ${situacao === s.valor ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => mudarSituacao(s.valor)}
            aria-pressed={situacao === s.valor}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      {carregando && <p className="text-secondary">Carregando avaliações…</p>}
      {!carregando && !erro && dados.itens.length === 0 && (
        <p className="text-secondary">Nenhuma avaliação {situacao === 'todas' ? 'ainda' : 'neste filtro'}.</p>
      )}

      <div className="d-flex flex-column gap-3">
        {dados.itens.map((a) => (
          <div key={a.id} className={`card ${a.publicada ? '' : 'border-warning'}`}>
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                <div>
                  <span className="text-warning fs-5" role="img" aria-label={`${a.nota} de 5 estrelas`}>
                    {estrelas(a.nota)}
                  </span>
                  <div className="small text-secondary">
                    <b className="text-body">{a.clienteNome}</b> · {a.clienteEmail} · {formatarData(a.criadaEm)}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <StatusBadge
                    status={a.publicada ? 'agendado' : 'cancelado'}
                    label={a.publicada ? 'Visível no site' : 'Oculta'}
                  />
                  <button
                    type="button"
                    className={`btn btn-sm ${a.publicada ? 'btn-outline-danger' : 'btn-outline-success'}`}
                    onClick={() => alternar(a)}
                    disabled={alterando === a.id}
                  >
                    {alterando === a.id ? 'Salvando…' : a.publicada ? 'Ocultar' : 'Mostrar de novo'}
                  </button>
                </div>
              </div>
              <p className="mb-2" style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                {a.comentario}
              </p>
              {a.fotos.length > 0 && (
                <div className="d-flex flex-wrap gap-2">
                  {a.fotos.map((f) => (
                    <a key={f.id} href={f.url} target="_blank" rel="noreferrer" aria-label="Abrir foto em tamanho real">
                      <img
                        src={f.url}
                        alt="Foto enviada pelo cliente"
                        loading="lazy"
                        style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 8 }}
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {dados.total > limite && (
        <div className="mt-3">
          <Pagination
            totalItems={dados.total}
            itemsPerPage={limite}
            currentPage={pagina}
            onPageChange={(p, porPagina) => {
              setPagina(p);
              if (porPagina && porPagina !== limite) setLimite(porPagina);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AvaliacoesTab;
