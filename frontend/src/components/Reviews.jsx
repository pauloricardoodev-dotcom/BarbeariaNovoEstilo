import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { apagarMinhaAvaliacao, enviarAvaliacao, listarAvaliacoes, minhaAvaliacao } from '../api/avaliacoes';
import { contaVerificada, useSessaoCliente } from '../sessao/sessaoCliente';
import { GOOGLE_AVALIACAO_URL } from '../data/constants';
import { reduzirFoto } from '../utils/reduzirFoto';
import { Estrelas, SeletorEstrelas } from './Estrelas';

/** Quantas avaliações aparecem na seção; as demais ficam em "Ver todas as avaliações". */
const POR_PAGINA = 4;
const POR_PAGINA_MODAL = 12;
const MAX_FOTOS = 3;
const MAX_COMENTARIO = 600;
const MSG_LIMITE = 'Muitas tentativas. Aguarde um minuto e tente novamente.';
/** A média só aparece com avaliações suficientes: com 1 ou 2 notas ela engana. */
const MIN_INDICADORES = 3;

const IconeComentario = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z" />
    <path d="m12 7.2.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" />
  </svg>
);

/** Painel que aparece enquanto não há avaliações publicadas. */
const EstadoVazio = ({ onEscrever }) => (
  <div className="avaliacoes-vazio">
    <span className="avaliacoes-vazio-icone">
      <IconeComentario />
    </span>
    <h3>Seja o primeiro a avaliar</h3>
    <p>Sua opinião ajuda outros clientes a conhecerem a experiência da Novo Estilo.</p>
    <button type="button" className="btn btn-primary" onClick={onEscrever}>
      Escrever avaliação
    </button>
  </div>
);

const formatarMedia = (media) => media.toFixed(1).replace('.', ',');
const formatarData = (iso) => {
  const texto = new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1); // "outubro de 2026" -> "Outubro de 2026"
};

/** Pedido para avaliar também no Google, mostrado logo depois que o cliente envia a avaliação no site. */
const PedidoGoogle = ({ aberto, onFechar }) => {
  const ref = useRef(null);
  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className="avaliacao-google"
      aria-labelledby="avaliacao-google-titulo"
      onClose={() => !ref.current?.open && onFechar()}
      onClick={(e) => e.target === ref.current && onFechar()}
    >
      <div className="avaliacao-google-corpo">
        <span className="avaliacao-google-icone" aria-hidden="true">★</span>
        <h3 id="avaliacao-google-titulo">Obrigado pela sua avaliação!</h3>
        <p>Quer nos avaliar também no Google? Leva menos de um minuto e ajuda muito a barbearia.</p>
        <div className="avaliacao-google-acoes">
          <a
            className="btn btn-primary"
            href={GOOGLE_AVALIACAO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onFechar}
          >
            Sim, avaliar no Google
          </a>
          <button type="button" className="btn btn-outline" onClick={onFechar}>
            Agora não
          </button>
        </div>
      </div>
    </dialog>
  );
};

/** Foto ampliada (dialog nativo: Esc e clique fora fecham, o foco volta para quem abriu). */
const FotoAmpliada = ({ url, onFechar }) => {
  const ref = useRef(null);
  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (url && !dialogo.open) dialogo.showModal();
    if (!url && dialogo.open) dialogo.close();
  }, [url]);

  return (
    <dialog
      ref={ref}
      className="avaliacao-zoom"
      aria-label="Foto ampliada"
      onClose={() => !ref.current?.open && onFechar()}
      onClick={(e) => e.target === ref.current && onFechar()}
    >
      {url && <img src={url} alt="Foto do corte enviada pelo cliente" />}
      <button type="button" className="avaliacao-zoom-fechar" onClick={onFechar} aria-label="Fechar foto">
        ×
      </button>
    </dialog>
  );
};

const Fotos = ({ fotos, onAbrir }) =>
  fotos.length > 0 && (
    <div className="avaliacao-fotos">
      {fotos.map((foto) => (
        <button
          key={foto.id}
          type="button"
          className="avaliacao-foto"
          onClick={() => onAbrir(foto.url)}
          aria-label="Ampliar foto"
        >
          <img src={foto.url} alt="Foto do corte" loading="lazy" decoding="async" />
        </button>
      ))}
    </div>
  );

const Cartao = ({ avaliacao, onAbrirFoto }) => (
  <article className="avaliacao-card">
    <div className="avaliacao-card-topo">
      <Estrelas nota={avaliacao.nota} />
      <time dateTime={avaliacao.criadaEm}>{formatarData(avaliacao.criadaEm)}</time>
    </div>
    <p className="avaliacao-texto">{avaliacao.comentario}</p>
    <Fotos fotos={avaliacao.fotos} onAbrir={onAbrirFoto} />
    <div className="avaliacao-autor">
      <span className="avaliacao-avatar" aria-hidden="true">
        {avaliacao.nome.charAt(0).toUpperCase()}
      </span>
      <b>{avaliacao.nome}</b>
    </div>
  </article>
);

const FormAvaliacao = ({ onEnviada }) => {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [fotos, setFotos] = useState([]); // { id, arquivo, url }
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const entradaRef = useRef(null);
  const fotosRef = useRef(fotos);
  useEffect(() => {
    fotosRef.current = fotos;
  }, [fotos]);

  // Libera as prévias (object URLs) ao sair.
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  const adicionar = (e) => {
    const novas = [...e.target.files].filter((a) => a.type.startsWith('image/'));
    e.target.value = '';
    if (novas.length === 0) return;
    setErro('');
    setFotos((atuais) =>
      [...atuais, ...novas.map((arquivo) => ({ id: crypto.randomUUID(), arquivo, url: URL.createObjectURL(arquivo) }))].slice(
        0,
        MAX_FOTOS,
      ),
    );
  };

  const remover = (id) => {
    setFotos((atuais) => {
      atuais.filter((f) => f.id === id).forEach((f) => URL.revokeObjectURL(f.url));
      return atuais.filter((f) => f.id !== id);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nota) return setErro('Escolha uma nota de 1 a 5 estrelas.');
    if (!comentario.trim()) return setErro('Escreva um comentário sobre o atendimento.');
    setErro('');
    setEnviando(true);
    try {
      const reduzidas = await Promise.all(fotos.map((f) => reduzirFoto(f.arquivo)));
      const criada = await enviarAvaliacao({ nota, comentario: comentario.trim(), fotos: reduzidas });
      onEnviada(criada);
    } catch (err) {
      setErro(err.status === 429 ? MSG_LIMITE : err.status === 413 ? 'Uma das fotos é grande demais.' : err.message);
      setEnviando(false);
    }
  };

  return (
    <form className="avaliacao-form avaliacao-form-grade" onSubmit={handleSubmit} noValidate>
      <div className="avaliacao-form-cabeca">
        <h3>Conte como foi sua experiência</h3>
        <p className="avaliacao-form-sub">Sua avaliação aparece aqui no site assim que for enviada.</p>
      </div>

      {erro && (
        <div className="conta-alerta conta-alerta-erro avaliacao-form-erro" role="alert">
          {erro}
        </div>
      )}

      <div className="avaliacao-form-esq">
      <div className="field">
        <label>Sua nota</label>
        <SeletorEstrelas valor={nota} onChange={setNota} disabled={enviando} />
      </div>

      <div className="field">
        <label htmlFor="avaliacao-comentario">Seu comentário</label>
        <textarea
          id="avaliacao-comentario"
          className="avaliacao-textarea"
          rows={4}
          maxLength={MAX_COMENTARIO}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="O que você achou do corte, do atendimento, do ambiente…"
          disabled={enviando}
        />
        <span className="field-hint avaliacao-contador">
          {comentario.length}/{MAX_COMENTARIO}
        </span>
      </div>
      </div>

      <div className="avaliacao-form-dir">
      <div className="field">
        <label>Fotos do corte (opcional)</label>
        <div className="avaliacao-previas">
          {fotos.map((f) => (
            <div key={f.id} className="avaliacao-previa">
              <img src={f.url} alt="Prévia da foto escolhida" />
              <button type="button" onClick={() => remover(f.id)} aria-label="Remover foto" disabled={enviando}>
                ×
              </button>
            </div>
          ))}
          {fotos.length < MAX_FOTOS && (
            <button
              type="button"
              className="avaliacao-adicionar"
              onClick={() => entradaRef.current?.click()}
              disabled={enviando}
            >
              <span aria-hidden="true">＋</span>
              <span>Adicionar foto</span>
            </button>
          )}
        </div>
        <input
          ref={entradaRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={adicionar}
          aria-label="Escolher fotos do corte"
        />
        <span className="field-hint">Até {MAX_FOTOS} fotos, nos formatos JPG, PNG ou WebP.</span>
        <span className="field-hint avaliacao-privacidade">
          Os metadados de localização das fotos são removidos automaticamente.
        </span>
      </div>

      <button type="submit" className="btn btn-primary" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Publicar avaliação'}
      </button>
      </div>
    </form>
  );
};

const MinhaAvaliacao = ({ avaliacao, onApagada, onAbrirFoto }) => {
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState('');

  const apagar = async () => {
    setApagando(true);
    setErro('');
    try {
      await apagarMinhaAvaliacao();
      onApagada();
    } catch (err) {
      setErro(err.message);
      setApagando(false);
    }
  };

  return (
    <div className="avaliacao-form avaliacao-minha">
      <h3>Sua avaliação</h3>
      {!avaliacao.publicada && (
        <div className="conta-alerta conta-alerta-aviso" role="status">
          Esta avaliação foi ocultada pela barbearia e não aparece no site.
        </div>
      )}
      <div className="avaliacao-card-topo">
        <Estrelas nota={avaliacao.nota} />
        <time dateTime={avaliacao.criadaEm}>{formatarData(avaliacao.criadaEm)}</time>
      </div>
      <p className="avaliacao-texto">{avaliacao.comentario}</p>
      <Fotos fotos={avaliacao.fotos} onAbrir={onAbrirFoto} />
      {erro && (
        <div className="conta-alerta conta-alerta-erro" role="alert">
          {erro}
        </div>
      )}
      {confirmando ? (
        <div className="avaliacao-confirma">
          <span>Apagar sua avaliação e as fotos? Isso não pode ser desfeito.</span>
          <button type="button" className="btn btn-primary" onClick={apagar} disabled={apagando}>
            {apagando ? 'Apagando…' : 'Sim, apagar'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setConfirmando(false)} disabled={apagando}>
            Cancelar
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-outline" onClick={() => setConfirmando(true)}>
          Apagar minha avaliação
        </button>
      )}
    </div>
  );
};

/** Janela (dialog nativo) com todas as avaliações: fundo escurecido, rolagem só dentro dela, Esc e clique fora fecham. */
const TodasAvaliacoes = ({ aberto, onFechar, total, media, onAbrirFoto }) => {
  const ref = useRef(null);
  const [itens, setItens] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalAtual, setTotalAtual] = useState(total);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState('');

  // Abre/fecha o dialog e trava a rolagem da página atrás enquanto ele estiver aberto.
  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return undefined;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
    if (!aberto) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  // A cada abertura busca a primeira página de novo (pega o que foi publicado desde a última vez).
  useEffect(() => {
    if (!aberto) return undefined;
    let cancelado = false;
    listarAvaliacoes(1, POR_PAGINA_MODAL)
      .then((dados) => {
        if (cancelado) return;
        setItens(dados.itens);
        setPagina(1);
        setTotalAtual(dados.total);
        setErro('');
      })
      .catch((err) => !cancelado && setErro(err.message));
    return () => {
      cancelado = true;
    };
  }, [aberto]);

  const carregarMais = async () => {
    setCarregandoMais(true);
    try {
      const proxima = await listarAvaliacoes(pagina + 1, POR_PAGINA_MODAL);
      setItens((atuais) => [...atuais, ...proxima.itens.filter((n) => !atuais.some((i) => i.id === n.id))]);
      setPagina(proxima.pagina);
      setTotalAtual(proxima.total);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregandoMais(false);
    }
  };

  const carregando = aberto && itens.length === 0 && !erro;

  return (
    <dialog
      ref={ref}
      className="avaliacoes-modal"
      aria-labelledby="avaliacoes-modal-titulo"
      onClose={() => !ref.current?.open && onFechar()}
      onClick={(e) => e.target === ref.current && onFechar()}
    >
      {aberto && (
        <div className="avaliacoes-modal-caixa">
          <div className="avaliacoes-modal-topo">
            <div>
              <h3 id="avaliacoes-modal-titulo">Todas as avaliações</h3>
              <p className="avaliacoes-modal-resumo">
                {total >= MIN_INDICADORES && media !== null && (
                  <>
                    <Estrelas nota={media} tamanho={16} /> <b>{formatarMedia(media)}</b> ·{' '}
                  </>
                )}
                {totalAtual} {totalAtual === 1 ? 'avaliação' : 'avaliações'}
              </p>
            </div>
            <button type="button" className="avaliacoes-modal-fechar" onClick={onFechar} aria-label="Fechar">
              ×
            </button>
          </div>
          <div className="avaliacoes-modal-corpo">
                {carregando && <p className="text-center">Carregando avaliações…</p>}
            {erro && <p className="text-center">{erro}</p>}
            {itens.length > 0 && (
              <div className="avaliacoes-grid avaliacoes-grid-modal">
                {itens.map((a) => (
                  <Cartao key={a.id} avaliacao={a} onAbrirFoto={onAbrirFoto} />
                ))}
              </div>
            )}
            {itens.length > 0 && itens.length < totalAtual && (
              <div className="avaliacoes-mais">
                <button type="button" className="btn btn-outline" onClick={carregarMais} disabled={carregandoMais}>
                  {carregandoMais ? 'Carregando…' : 'Carregar mais'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
};

const Reviews = () => {
  const { status, cliente } = useSessaoCliente();
  const [lista, setLista] = useState({ media: null, total: 0, pagina: 1, itens: [] });
  const [carregando, setCarregando] = useState(true);
  const [todasAbertas, setTodasAbertas] = useState(false);
  const [erroLista, setErroLista] = useState('');
  const [minha, setMinha] = useState(undefined); // undefined = ainda não sabemos; null = não avaliou
  const [fotoAberta, setFotoAberta] = useState(null);
  const [pedidoGoogle, setPedidoGoogle] = useState(false);
  const areaRef = useRef(null);

  const carregarPrimeira = useCallback(
    () =>
      listarAvaliacoes(1, POR_PAGINA)
        .then((dados) => {
          setLista(dados);
          setErroLista('');
        })
        .catch((err) => setErroLista(err.message))
        .finally(() => setCarregando(false)),
    [],
  );

  useEffect(() => {
    carregarPrimeira();
  }, [carregarPrimeira]);

  useEffect(() => {
    if (status !== 'logado') return undefined;
    let cancelado = false;
    minhaAvaliacao()
      .then((m) => !cancelado && setMinha(m))
      .catch(() => !cancelado && setMinha(null));
    return () => {
      cancelado = true;
    };
  }, [status]);

  const aoEnviar = (criada) => {
    setMinha(criada);
    setPedidoGoogle(true);
    carregarPrimeira();
  };

  const aoApagar = () => {
    setMinha(null);
    carregarPrimeira();
  };

  const temMais = lista.total > POR_PAGINA;

  /** Leva a pessoa até o formulário (ou ao aviso de login/verificação) e coloca o foco no primeiro controle. */
  const irParaFormulario = () => {
    const area = areaRef.current;
    if (!area) return;
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    area.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'center' });
    area.querySelector('.seletor-estrela[tabindex="0"], a, button:not(:disabled)')?.focus({ preventScroll: true });
  };

  return (
    <section className="section section-white" id="avaliacoes">
      <div className="wrap">
        <div className="avaliacoes-topo">
          <div className="section-head">
            <div className="kicker-line">
              <div className="rule"></div>
              <span>Avaliações</span>
            </div>
            <h2>Sua experiência importa.</h2>
            <p>Cada visita conta uma história. Compartilhe a sua com a gente.</p>
          </div>
          {lista.total >= MIN_INDICADORES && (
            <div className="avaliacoes-resumo" aria-label={`Nota média ${formatarMedia(lista.media)} de 5`}>
              <b>{formatarMedia(lista.media)}</b>
              <div>
                <Estrelas nota={lista.media} tamanho={22} />
                <span>
                  {lista.total} {lista.total === 1 ? 'avaliação' : 'avaliações'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="avaliacoes-layout">
        <div className="avaliacoes-lista">
        {carregando && <p className="text-center">Carregando avaliações…</p>}
        {!carregando && erroLista && <p className="text-center">{erroLista}</p>}
        {!carregando && !erroLista && lista.itens.length === 0 && (
          <EstadoVazio onEscrever={irParaFormulario} />
        )}

        {lista.itens.length > 0 && (
          <div className="avaliacoes-grid">
            {lista.itens.map((a) => (
              <Cartao key={a.id} avaliacao={a} onAbrirFoto={setFotoAberta} />
            ))}
          </div>
        )}
        {temMais && (
          <div className="avaliacoes-mais">
            <button type="button" className="btn btn-outline" onClick={() => setTodasAbertas(true)} aria-haspopup="dialog">
              Ver todas as avaliações ({lista.total})
            </button>
          </div>
        )}

        </div>

        <div className="avaliacao-area" ref={areaRef}>
          {status !== 'logado' && (
            <div className="avaliacao-form">
              <h3>Conte como foi sua experiência</h3>
              <p className="avaliacao-form-sub">Entre na sua conta para avaliar e enviar fotos do seu corte.</p>
              <Link to="/entrar?voltar=%2F%23avaliacoes" className="btn btn-primary">
                Entrar para avaliar
              </Link>
            </div>
          )}
          {status === 'logado' && !contaVerificada(cliente) && (
            <div className="avaliacao-form">
              <h3>Conte como foi sua experiência</h3>
              <p className="avaliacao-form-sub">Confirme seu e-mail e seu WhatsApp para poder avaliar.</p>
              <Link to="/verificar?voltar=%2F%23avaliacoes" className="btn btn-primary">
                Confirmar agora
              </Link>
            </div>
          )}
          {status === 'logado' && contaVerificada(cliente) && minha === null && <FormAvaliacao onEnviada={aoEnviar} />}
          {status === 'logado' && contaVerificada(cliente) && minha && (
            <MinhaAvaliacao avaliacao={minha} onApagada={aoApagar} onAbrirFoto={setFotoAberta} />
          )}
        </div>
        </div>
      </div>
      <TodasAvaliacoes
        aberto={todasAbertas}
        onFechar={() => setTodasAbertas(false)}
        total={lista.total}
        media={lista.media}
        onAbrirFoto={setFotoAberta}
      />
      <FotoAmpliada url={fotoAberta} onFechar={() => setFotoAberta(null)} />
      <PedidoGoogle aberto={pedidoGoogle} onFechar={() => setPedidoGoogle(false)} />
    </section>
  );
};

export default Reviews;
