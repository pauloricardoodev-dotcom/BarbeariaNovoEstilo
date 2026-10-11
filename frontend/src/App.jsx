import { Navigate, Route, Routes } from 'react-router';
import 'bootstrap/dist/css/bootstrap-grid.min.css';
import 'bootstrap/dist/css/bootstrap-utilities.min.css';
import Header from './components/Header';
import Footer from './components/Footer';
import ExigeCliente from './components/conta/ExigeCliente';
import SessaoClienteProvider from './sessao/SessaoClienteProvider';
import HomePage from './pages/HomePage';
import EntrarPage from './pages/EntrarPage';
import CadastroPage from './pages/CadastroPage';
import VerificarPage from './pages/VerificarPage';
import EsqueciSenhaPage from './pages/EsqueciSenhaPage';
import RedefinirSenhaPage from './pages/RedefinirSenhaPage';
import MinhaContaPage from './pages/MinhaContaPage';
import TermosPage from './pages/TermosPage';
import PrivacidadePage from './pages/PrivacidadePage';
import './styles/globals.css';
import './styles/conta.css';

// Casco do site: CSS, sessão do cliente, Header/Footer e rotas.
// Login obrigatório: só entrar/cadastro/recuperação de senha/termos abrem sem sessão.
function App() {
  return (
    <SessaoClienteProvider>
      <div className="App">
        <Header />
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
            <Route path="entrar" element={<EntrarPage />} />
            <Route path="cadastro" element={<CadastroPage />} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </SessaoClienteProvider>
  );
}

export default App;
