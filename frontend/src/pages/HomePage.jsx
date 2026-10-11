import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import Hero from '../components/Hero';
import Services from '../components/Services';
import Booking from '../components/Booking';
import About from '../components/About';

function HomePage() {
  const [preSelectedService, setPreSelectedService] = useState(null);
  const { hash } = useLocation();

  // Vindo de outra página por um link "/#secao" (Header/Footer), rola até a seção.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <>
      <Hero />
      <Services onBookService={setPreSelectedService} />
      <Booking preSelectedService={preSelectedService} />
      <About />
    </>
  );
}

export default HomePage;
