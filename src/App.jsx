import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Products from './pages/Products';
import Career from './pages/Career';
import Apply from './pages/Apply';
import Admin from './pages/Admin';
import ProjectRequest from './pages/ProjectRequest';
// 1. Import your new pages
import Privacy from './pages/Privacy'; 
import Terms from './pages/Terms';
import CeoManager from './pages/CeoManager';
import HrManager from './pages/HrManager';
import AccountsManager from './pages/AccountsManager';
import SalesManager from './pages/SalesManager';
import SecretaryManager from './pages/SecretaryManager';
import WorkerLog from './pages/WorkerLog';


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
            <Route path="/start-project" element={<ProjectRequest />} />
            <Route path="/ceo-manager" element={<CeoManager />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/hr-manager" element={<HrManager />} />
            <Route path="/sales-manager" element={<SalesManager />} />
            <Route path="/accounts-manager" element={<AccountsManager />} />
            <Route path="/secretary-manager" element={<SecretaryManager/>} />
            <Route path="/worker-log" element={<WorkerLog />} />
            
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;