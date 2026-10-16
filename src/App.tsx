import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useSettingsStore } from '@/store/settingsStore';
import { CompareBar } from '@/components/product/CompareBar';
import { CompareModal } from '@/components/product/CompareModal';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartSidebar } from '@/components/cart/CartSidebar';
import { Home } from '@/pages/Home';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import './App.css';
import { Toaster } from 'sonner';
import { ChatWidget } from '@/components/ChatWidget';
import { ScrollToTop } from '@/components/ScrollToTop';

// Code-splitting con lazy loading para aislar librerías pesadas (Stripe, jsPDF, Recharts)
const Catalog = lazy(() => import('@/pages/Catalog').then(m => ({ default: m.Catalog })));
const Checkout = lazy(() => import('@/pages/Checkout').then(m => ({ default: m.Checkout })));
const Admin = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })));
const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const Contact = lazy(() => import('@/pages/Contact').then(m => ({ default: m.Contact })));
const ProductDetail = lazy(() => import('@/pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const Ofertas = lazy(() => import('@/pages/Ofertas').then(m => ({ default: m.Ofertas })));
const EquipoPesado = lazy(() => import('@/pages/EquipoPesado').then(m => ({ default: m.EquipoPesado })));
const Services = lazy(() => import('@/pages/Services').then(m => ({ default: m.Services })));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsConditions = lazy(() => import('@/pages/TermsConditions').then(m => ({ default: m.TermsConditions })));

function AppContent() {
  const [compareOpen, setCompareOpen] = useState(false);
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
        <Suspense fallback={<div className="min-h-screen" />}>
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
        </Suspense>
      </main>
      {!hideFooter && <Footer />}
      {!isAdmin && <ChatWidget />}
      {!isAdmin && <CompareBar onCompare={() => setCompareOpen(true)} />}
      {!isAdmin && <CompareModal isOpen={compareOpen} onClose={() => setCompareOpen(false)} />}
      <ScrollToTop />
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
