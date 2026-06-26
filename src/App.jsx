import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Products from './pages/Products';
import Career from './pages/Career';
import Apply from './pages/Apply';
import Admin from './pages/Admin';
// 1. Import your new pages
import Privacy from './pages/Privacy'; 
import Terms from './pages/Terms';

function App() {
  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/products" element={<Products />} />
            <Route path="/career" element={<Career />} />
            <Route path="/apply" element={<Apply />} />
            <Route path="/admin" element={<Admin />} />
            {/* 2. Add the routes for the new pages */}
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;