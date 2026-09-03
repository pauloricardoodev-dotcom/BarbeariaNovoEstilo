import { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import Team from './components/Team';
import Booking from './components/Booking';
import About from './components/About';
import Footer from './components/Footer';
import './styles/globals.css';

function App() {
  const [preSelectedService, setPreSelectedService] = useState(null);
  const [preSelectedPro, setPreSelectedPro] = useState(null);

  const handleBookService = (serviceId) => {
    setPreSelectedService(serviceId);
  };

  const handleBookPro = (proId) => {
    setPreSelectedPro(proId);
  };

  return (
    <div className="App">
      <Header />
      <Hero />
      <Services onBookService={handleBookService} />
      <Team onBookPro={handleBookPro} />
      <Booking 
        preSelectedService={preSelectedService} 
        preSelectedPro={preSelectedPro}
      />
      <About />
      <Footer />
    </div>
  );
}

export default App;
