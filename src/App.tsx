import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartSidebar } from '@/components/cart/CartSidebar';
import { Home } from '@/pages/Home';
import { Catalog } from '@/pages/Catalog';
import { Checkout } from '@/pages/Checkout';
import { Admin } from '@/pages/Admin';
import { Login } from '@/pages/Login';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Contact } from '@/pages/Contact';
import { ProductDetail } from '@/pages/ProductDetail';
import { Ofertas } from '@/pages/Ofertas';
import { EquipoPesado } from '@/pages/EquipoPesado';
import { Services } from '@/pages/Services';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { TermsConditions } from '@/pages/TermsConditions';
import './App.css';
import { Toaster } from 'sonner';

function AppContent() {
  const location = useLocation();
  const hideFooter = location.pathname === '/jozarzc';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <CartSidebar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/servicios" element={<Services />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/ofertas" element={<Ofertas />} />
          <Route path="/equipo-pesado" element={<EquipoPesado />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/jozarzc" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/politica" element={<PrivacyPolicy />} />
          <Route path="/terminos" element={<TermsConditions />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}

import { LanguageProvider } from '@/context/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <AppContent />
      </Router>
    </LanguageProvider>
  );
}

export default App;
