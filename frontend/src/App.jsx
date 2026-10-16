import { Navigate, Route, Routes, useLocation } from 'react-router';
import 'bootstrap/dist/css/bootstrap-grid.min.css';
import 'bootstrap/dist/css/bootstrap-utilities.min.css';
import Header from './components/Header';
import Footer from './components/Footer';
import ExigeCliente from './components/conta/ExigeCliente';
import AuthShell from './components/conta/AuthShell';
import SessaoClienteProvider from './sessao/SessaoClienteProvider';
import HomePage from './pages/HomePage';
import EntrarPage from './pages/EntrarPage';
import CadastroPage from './pages/CadastroPage';
import VerificarPage from './pages/VerificarPage';
import EsqueciSenhaPage from './pages/EsqueciSenhaPage';
import RedefinirSenhaPage from './pages/RedefinirSenhaPage';
import MinhaContaPage from './pages/MinhaContaPage';
import MeusAgendamentosPage from './pages/MeusAgendamentosPage';
import TermosPage from './pages/TermosPage';
import PrivacidadePage from './pages/PrivacidadePage';
import './styles/globals.css';
import './styles/conta.css';
import './styles/entrar.css';
import './styles/avaliacoes.css';

// Casco do site: CSS, sessão do cliente, Header/Footer e rotas.
// Login obrigatório: só entrar/cadastro/recuperação de senha/termos abrem sem sessão.
// Telas com moldura própria (cabeçalho e imagem no AuthShell): sem Header/Footer do site.
const ROTAS_COM_MOLDURA_PROPRIA = ['/entrar', '/cadastro'];

function App() {
  const { pathname } = useLocation();
  const molduraPropria = ROTAS_COM_MOLDURA_PROPRIA.includes(pathname);
  return (
    <SessaoClienteProvider>
      <div className="App">
        {!molduraPropria && <Header />}
        <main>
          <Routes>
            {/* Login obrigatório: sem sessão, a home manda para /entrar (e volta depois). */}
            <Route
              index
              element={
                <ExigeCliente>
                  <HomePage />
                </ExigeCliente>
              }
            />
            {/* Abertas: necessárias para conseguir entrar. */}
            {/* Mesma moldura nas duas: trocar de uma para a outra anima (slide). */}
            <Route element={<AuthShell />}>
              <Route path="entrar" element={<EntrarPage />} />
              <Route path="cadastro" element={<CadastroPage />} />
            </Route>
            <Route path="esqueci-senha" element={<EsqueciSenhaPage />} />
            <Route path="redefinir-senha" element={<RedefinirSenhaPage />} />
            <Route path="termos" element={<TermosPage />} />
            <Route path="privacidade" element={<PrivacidadePage />} />
            <Route
              path="verificar"
              element={
                <ExigeCliente>
                  <VerificarPage />
                </ExigeCliente>
              }
            />
            <Route
              path="minha-conta"
              element={
                <ExigeCliente>
                  <MinhaContaPage />
                </ExigeCliente>
              }
            />
            <Route
              path="meus-agendamentos"
              element={
                <ExigeCliente>
                  <MeusAgendamentosPage />
                </ExigeCliente>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        {!molduraPropria && <Footer />}
      </div>
    </SessaoClienteProvider>
  );
}

export default App;
