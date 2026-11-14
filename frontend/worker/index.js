// Repassa /api/* para o backend (Render), mantendo o site e a API no mesmo domínio
// (o cookie de sessão httpOnly depende disso). O resto é servido como asset estático.
const BACKEND = 'https://barbearianovoestilo.onrender.com';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const repasse = new Request(BACKEND + url.pathname + url.search, request);
    // Sem isso o backend só enxerga o IP do Cloudflare e o rate limit por IP bloqueia todos juntos.
    // Sobrescrevemos (não somamos) o X-Forwarded-For, para o cliente não poder forjá-lo.
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) repasse.headers.set('X-Forwarded-For', ip);
    return fetch(repasse);
  },
};
