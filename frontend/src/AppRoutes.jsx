import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';

// Site e admin são carregados sob demanda: cada um traz o próprio CSS
// (Bootstrap parcial + globals.css vs. Bootstrap completo + admin.css), que conflitam
// se carregados juntos. Por isso, entre as duas áreas navegue com <a href> (recarrega
// a página), nunca com <Link>.
const App = lazy(() => import('./App.jsx'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard.jsx'));

const AppRoutes = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/admin/*" element={<AdminDashboard />} />
      {/* Endereço antigo do admin */}
      <Route path="/admin.html" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
