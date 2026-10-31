// Repassa /api/* para o backend (Render), mantendo o site e a API no mesmo domínio
// (o cookie de sessão httpOnly depende disso). O resto é servido como asset estático.
const BACKEND = 'https://barbearianovoestilo.onrender.com';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    return fetch(new Request(BACKEND + url.pathname + url.search, request));
  },
};
