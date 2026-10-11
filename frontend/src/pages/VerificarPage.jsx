import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { reenviarCodigo, verificarCodigo } from '../api/clientes';
import Campo from '../components/conta/Campo';
import ContaLayout, { Alerta } from '../components/conta/ContaLayout';
import { contaVerificada, destinoSeguro, useSessaoCliente } from '../sessao/sessaoCliente';
import { exibirTelefone } from '../utils/telefone';

const ESPERA_REENVIO_S = 60;

const CANAIS = {
  email: {
    titulo: 'E-mail',
    chave: 'emailVerificado',
    destino: (c) => c.email,
    onde: 'no seu e-mail',
  },
  telefone: {
    titulo: 'WhatsApp',
    chave: 'telefoneVerificado',
    destino: (c) => exibirTelefone(c.telefone),
    onde: 'no seu WhatsApp',
  },
};

const BlocoVerificacao = ({ canal, cliente, aoVerificar }) => {
  const info = CANAIS[canal];
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = setTimeout(() => setEspera(espera - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  if (cliente[info.chave]) {
    return (
      <div className="verif-bloco verif-ok">
        <span className="verif-check" aria-hidden="true">✓</span>
        <div>
          <b>{info.titulo} confirmado</b>
          <small>{info.destino(cliente)}</small>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setAviso('');
    setEnviando(true);
    try {
      aoVerificar(await verificarCodigo(canal, codigo));
    } catch (err) {
      setErro(err.message);
      setCodigo('');
    } finally {
      setEnviando(false);
    }
  };

  const handleReenviar = async () => {
    setErro('');
    setAviso('');
    try {
      await reenviarCodigo(canal);
      setAviso(`Enviamos um novo código ${info.onde}.`);
      setEspera(ESPERA_REENVIO_S);
    } catch (err) {
      setErro(err.message);
      if (err.status === 429) setEspera(ESPERA_REENVIO_S);
    }
  };

  return (
    <div className="verif-bloco">
      <h2>{info.titulo}</h2>
      <p className="verif-destino">
        Digite o código de 6 dígitos enviado para <b>{info.destino(cliente)}</b>.
      </p>
      <Alerta>{erro}</Alerta>
      <Alerta tipo="sucesso">{aviso}</Alerta>
      <form onSubmit={handleSubmit} className="verif-form" noValidate>
        <Campo
          label={`Código do ${info.titulo}`}
          name={`codigo-${canal}`}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          className="verif-codigo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <button type="submit" className="btn btn-primary" disabled={enviando || codigo.length !== 6}>
          {enviando ? 'Confirmando…' : 'Confirmar'}
        </button>
      </form>
      <button type="button" className="btn btn-ghost verif-reenviar" onClick={handleReenviar} disabled={espera > 0}>
        {espera > 0 ? `Reenviar código em ${espera}s` : 'Não recebeu? Reenviar código'}
      </button>
    </div>
  );
};

const VerificarPage = () => {
  const { cliente, definirCliente } = useSessaoCliente();
  const [params] = useSearchParams();
  const voltar = destinoSeguro(params.get('voltar'));
  const pronto = contaVerificada(cliente);

  return (
    <ContaLayout
      titulo={pronto ? 'Conta confirmada!' : 'Confirme seus contatos'}
      subtitulo={
        pronto
          ? 'Tudo certo. Agora você já pode agendar seus horários.'
          : 'Para agendar, precisamos confirmar seu e-mail e seu WhatsApp.'
      }
    >
      <BlocoVerificacao canal="email" cliente={cliente} aoVerificar={definirCliente} />
      <BlocoVerificacao canal="telefone" cliente={cliente} aoVerificar={definirCliente} />
      {pronto ? (
        <Link to={voltar} className="btn btn-primary btn-block">
          Continuar
        </Link>
      ) : (
        <p className="conta-rodape">
          Dados errados?{' '}
          <Link to="/minha-conta" className="conta-link">
            Corrija em Minha conta
          </Link>
        </p>
      )}
    </ContaLayout>
  );
};

export default VerificarPage;
