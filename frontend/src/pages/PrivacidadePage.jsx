import ContaLayout from '../components/conta/ContaLayout';

// Texto genérico PROVISÓRIO — o dono vai definir o definitivo (LGPD).
// Ao trocar, atualize também TERMOS_VERSAO_ATUAL no backend (src/clientes/clientes.types.ts).
const PrivacidadePage = () => (
  <ContaLayout titulo="Política de privacidade" subtitulo="Versão provisória — outubro de 2026." largo>
    <div className="texto-legal">
      <p className="texto-legal-aviso">
        Este é um texto provisório, que será substituído pela versão definitiva da Barbearia Novo Estilo.
      </p>
      <h2>1. Quais dados coletamos</h2>
      <p>
        Nome, e-mail, número de celular e senha (guardada de forma criptografada, sem que ninguém consiga lê-la),
        além do histórico dos seus agendamentos.
      </p>
      <h2>2. Para que usamos</h2>
      <p>
        Para identificar você, confirmar e organizar seus agendamentos, enviar códigos de confirmação e avisos
        sobre seus horários por e-mail e WhatsApp.
      </p>
      <h2>3. Compartilhamento</h2>
      <p>
        Não vendemos seus dados. Eles são tratados apenas pela barbearia e pelos serviços técnicos necessários para
        o funcionamento do site (hospedagem, envio de e-mails e de mensagens de WhatsApp).
      </p>
      <h2>4. Seus direitos</h2>
      <p>
        Você pode consultar e corrigir seus dados em "Minha conta" e pedir a exclusão da sua conta pelos canais de
        contato da barbearia. O histórico de agendamentos pode ser mantido de forma anonimizada.
      </p>
      <h2>5. Segurança</h2>
      <p>Adotamos medidas técnicas para proteger seus dados contra acessos não autorizados.</p>
    </div>
  </ContaLayout>
);

export default PrivacidadePage;
