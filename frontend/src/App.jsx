import { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import Booking from './components/Booking';
import About from './components/About';
import Footer from './components/Footer';
import './styles/globals.css';

function App() {
  const [preSelectedService, setPreSelectedService] = useState(null);

  return (
    <div className="App">
      <Header />
      <Hero />
      <Services onBookService={setPreSelectedService} />
      <Booking preSelectedService={preSelectedService} />
      <About />
      <Footer />
    </div>
  );
}

export default App;
