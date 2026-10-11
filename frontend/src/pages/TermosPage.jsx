import ContaLayout from '../components/conta/ContaLayout';

// Texto genérico PROVISÓRIO — o dono vai definir o definitivo.
// Ao trocar, atualize também TERMOS_VERSAO_ATUAL no backend (src/clientes/clientes.types.ts).
const TermosPage = () => (
  <ContaLayout titulo="Termos de uso" subtitulo="Versão provisória — outubro de 2026." largo>
    <div className="texto-legal">
      <p className="texto-legal-aviso">
        Este é um texto provisório, que será substituído pela versão definitiva da Barbearia Novo Estilo.
      </p>
      <h2>1. Sobre o serviço</h2>
      <p>
        Este site permite que você crie uma conta e agende horários na Barbearia Novo Estilo. Ao criar a conta,
        você concorda com estes termos.
      </p>
      <h2>2. Sua conta</h2>
      <p>
        Você é responsável por manter seus dados corretos e sua senha em sigilo. Para agendar, é preciso confirmar
        seu e-mail e seu WhatsApp.
      </p>
      <h2>3. Agendamentos</h2>
      <p>
        Os horários dependem de disponibilidade. Você pode reagendar até 2 horas antes do horário marcado. O
        cancelamento é feito por solicitação, que pode ser aprovada ou recusada pela barbearia.
      </p>
      <h2>4. Uso adequado</h2>
      <p>
        Não é permitido usar o site para fins ilícitos, criar contas com dados de terceiros ou tentar acessar áreas
        restritas.
      </p>
      <h2>5. Alterações</h2>
      <p>
        Estes termos podem ser atualizados. Quando isso acontecer, poderemos pedir que você os aceite novamente.
      </p>
      <h2>6. Contato</h2>
      <p>Em caso de dúvidas, fale com a barbearia pelos canais informados no rodapé do site.</p>
    </div>
  </ContaLayout>
);

export default TermosPage;
