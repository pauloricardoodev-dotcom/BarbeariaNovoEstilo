import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import Hero from '../components/Hero';
import Services from '../components/Services';
import Booking from '../components/Booking';
import About from '../components/About';
import useServicos from '../hooks/useServicos';

function HomePage() {
  const [preSelectedService, setPreSelectedService] = useState(null);
  const { hash } = useLocation();
  const { servicos, carregando, erro } = useServicos();

  // Vindo de outra página por um link "/#secao" (Header/Footer), rola até a seção.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <>
      <Hero />
      <Services servicos={servicos} carregando={carregando} erro={erro} onBookService={setPreSelectedService} />
      <Booking servicos={servicos} preSelectedService={preSelectedService} />
      <About />
    </>
  );
}

export default HomePage;
