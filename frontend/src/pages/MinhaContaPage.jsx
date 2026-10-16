import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { atualizarPerfil, trocarSenha } from '../api/clientes';
import Campo, { CampoSenha } from '../components/conta/Campo';
import ContaLayout, { Alerta } from '../components/conta/ContaLayout';
import { contaVerificada, useSessaoCliente } from '../sessao/sessaoCliente';
import { exibirTelefone, formatarTelefone } from '../utils/telefone';

const MeusDados = ({ cliente, aoSalvar }) => {
  const [nome, setNome] = useState(cliente.nome);
  const [email, setEmail] = useState(cliente.email);
  const [telefone, setTelefone] = useState(exibirTelefone(cliente.telefone));
  const [senhaAtual, setSenhaAtual] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);

  const emailMudou = email.trim().toLowerCase() !== cliente.email;
  const telefoneMudou = telefone !== exibirTelefone(cliente.telefone);
  const nomeMudou = nome.trim() !== cliente.nome;
  const algoMudou = emailMudou || telefoneMudou || nomeMudou;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setSalvando(true);
    try {
      const atualizado = await atualizarPerfil({
        ...(nomeMudou ? { nome } : {}),
        // Conta só-Google não tem senha para confirmar.
        ...(emailMudou ? { email, ...(cliente.temSenha ? { senhaAtual } : {}) } : {}),
        ...(telefoneMudou ? { telefone } : {}),
      });
      aoSalvar(atualizado);
      setSenhaAtual('');
      setTelefone(exibirTelefone(atualizado.telefone));
      setEmail(atualizado.email);
      setNome(atualizado.nome);
      setSucesso(
        emailMudou || telefoneMudou
          ? 'Dados salvos. Enviamos um código para confirmar o novo contato.'
          : 'Dados salvos.',
      );
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="conta-secao">
      <h2>Meus dados</h2>
      <Alerta>{erro}</Alerta>
      {sucesso && (
        <Alerta tipo="sucesso">
          {sucesso}
          {!contaVerificada(cliente) && (
            <>
              {' '}
              <Link to="/verificar" className="conta-link">
                Confirmar agora
              </Link>
            </>
          )}
        </Alerta>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <Campo label="Nome completo" name="name" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} />
        <Campo
          label="E-mail"
          tipo="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dica={cliente.emailVerificado ? 'Confirmado' : 'Ainda não confirmado'}
          maxLength={254}
        />
        {emailMudou && cliente.temSenha && (
          <CampoSenha
            label="Senha atual"
            name="current-password"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            dica="Por segurança, confirme sua senha para trocar o e-mail."
          />
        )}
        <Campo
          label="Celular (WhatsApp)"
          tipo="tel"
          name="tel"
          autoComplete="tel-national"
          inputMode="tel"
          value={telefone}
          onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
          dica={cliente.telefoneVerificado ? 'Confirmado' : 'Ainda não confirmado'}
          maxLength={30}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={salvando || !algoMudou || (emailMudou && cliente.temSenha && !senhaAtual)}
        >
          {salvando ? 'Salvando…' : 'Salvar dados'}
        </button>
      </form>
    </div>
  );
};

const AlterarSenha = ({ email, temSenha, aoTrocar }) => {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    if (nova.length < 8) return setErro('A nova senha deve ter pelo menos 8 caracteres.');
    if (nova.length > 128) return setErro('A nova senha deve ter no máximo 128 caracteres.');
    if (nova !== confirmacao) return setErro('As senhas não conferem.');
    setSalvando(true);
    try {
      aoTrocar(await trocarSenha(temSenha ? atual : undefined, nova));
      setAtual('');
      setNova('');
      setConfirmacao('');
      setSucesso(
        temSenha
          ? 'Senha alterada. Outros aparelhos conectados foram desconectados.'
          : 'Senha criada. Agora você também pode entrar com e-mail e senha.',
      );
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="conta-secao">
      <h2>{temSenha ? 'Alterar senha' : 'Criar senha'}</h2>
      {!temSenha && (
        <p className="conta-sub">Você entra com o Google. Se quiser, crie uma senha para também entrar com e-mail e senha.</p>
      )}
      <Alerta>{erro}</Alerta>
      <Alerta tipo="sucesso">{sucesso}</Alerta>
      <form onSubmit={handleSubmit} noValidate>
        {/* Usuário oculto: ajuda o gerenciador de senhas a associar a nova senha à conta. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        {temSenha && (
          <CampoSenha label="Senha atual" name="current-password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
        )}
        <CampoSenha
          label="Nova senha"
          name="new-password"
          autoComplete="new-password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          dica="Mínimo de 8 caracteres."
          maxLength={128}
        />
        <CampoSenha
          label="Confirme a nova senha"
          name="confirm-password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          maxLength={128}
        />
        <button type="submit" className="btn btn-primary" disabled={salvando || (temSenha && !atual) || !nova}>
          {salvando ? 'Salvando…' : temSenha ? 'Alterar senha' : 'Criar senha'}
        </button>
      </form>
    </div>
  );
};

const MinhaContaPage = () => {
  const { cliente, definirCliente, sair } = useSessaoCliente();
  const navigate = useNavigate();
  const primeiroNome = cliente.nome.split(' ')[0];

  const handleSair = async () => {
    await sair();
    navigate('/', { replace: true });
  };

  return (
    <ContaLayout titulo={`Olá, ${primeiroNome}!`} subtitulo="Gerencie seus dados de acesso." largo>
      {!contaVerificada(cliente) && (
        <div className="conta-alerta conta-alerta-aviso" role="status">
          Confirme seu e-mail e seu WhatsApp para poder agendar.{' '}
          <Link to="/verificar" className="conta-link">
            Confirmar agora
          </Link>
        </div>
      )}
      <MeusDados cliente={cliente} aoSalvar={definirCliente} />
      <AlterarSenha email={cliente.email} temSenha={cliente.temSenha} aoTrocar={definirCliente} />
      <div className="conta-secao conta-secao-sair">
        <button type="button" className="btn btn-outline" onClick={handleSair}>
          Sair da conta
        </button>
      </div>
    </ContaLayout>
  );
};

export default MinhaContaPage;
