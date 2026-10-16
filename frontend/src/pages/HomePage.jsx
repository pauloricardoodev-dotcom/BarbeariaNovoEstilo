import { useEffect } from 'react';
import { useLocation } from 'react-router';
import Hero from '../components/Hero';
import Booking from '../components/Booking';
import About from '../components/About';
import Reviews from '../components/Reviews';
import Mapa from '../components/Mapa';
import useServicos from '../hooks/useServicos';

function HomePage() {
  const { hash } = useLocation();
  const { servicos } = useServicos();

  // Vindo de outra página por um link "/#secao" (Header/Footer), rola até a seção.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <>
      <Hero />
      <About />
      <Booking servicos={servicos} />
      <Reviews />
      <Mapa />
    </>
  );
}

export default HomePage;
