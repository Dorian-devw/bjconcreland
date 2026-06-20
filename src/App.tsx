import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useSettingsStore } from '@/store/settingsStore';
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
import { ChatWidget } from '@/components/ChatWidget';

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname === '/jozarzc';
  const hideFooter = isAdmin;

  const { logo, tabTitle, fetchTabTitle } = useSettingsStore();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (tabTitle === null) {
      fetchTabTitle();
    }
  }, [tabTitle, fetchTabTitle]);

  useEffect(() => {
    if (tabTitle) {
      document.title = tabTitle;
    }
  }, [tabTitle]);

  useEffect(() => {
    if (logo) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = logo;
    }
  }, [logo]);

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && <Navbar />}
      {!isAdmin && <CartSidebar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/offers" element={<Ofertas />} />
          <Route path="/heavy-equipment" element={<EquipoPesado />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/jozarzc" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/politica" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/terminos" element={<TermsConditions />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
      {!isAdmin && <ChatWidget />}
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
