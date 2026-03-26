import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search, Truck } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useProductsStore } from '@/store/productsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/context/LanguageContext';

const MIN_SEARCH_CHARS = 3;
const SEARCH_DEBOUNCE_MS = 300;
const MAX_DROPDOWN_HEIGHT = 320;

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const searchDesktopRef = useRef<HTMLDivElement>(null);
  const searchMobileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleCart, getTotalItems } = useCartStore();
  const { products, fetchProducts } = useProductsStore();
  const { logo, logoWidth, logoUpdatedAt, fetchLogo } = useSettingsStore();
  const { t } = useLanguage();

  const debouncedQuery = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const searchResults = useMemo(() => {
    if (debouncedQuery.length < MIN_SEARCH_CHARS) return [];
    const q = debouncedQuery.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, debouncedQuery]);

  const queryLength = searchInput.trim().length;
  const showDropdown = dropdownVisible && queryLength >= MIN_SEARCH_CHARS && searchResults.length > 0;

  useEffect(() => {
    fetchProducts();
    fetchLogo();
  }, [fetchProducts, fetchLogo]);

  useEffect(() => {
    if (queryLength >= MIN_SEARCH_CHARS && searchResults.length > 0) setDropdownVisible(true);
  }, [queryLength, searchResults.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        searchDesktopRef.current?.contains(target) === false &&
        searchMobileRef.current?.contains(target) === false
      ) {
        setDropdownVisible(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/services', label: t('nav.services') },
    { path: '/catalog', label: t('nav.catalog') },
    { path: '/contact', label: t('nav.contact') },
  ];

  const handleNavigation = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (query) {
      navigate(`/catalog?q=${encodeURIComponent(query)}`);
      setSearchInput('');
      setDropdownVisible(false);
      setIsMenuOpen(false);
    } else {
      navigate('/catalog');
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSearchInput('');
    setDropdownVisible(false);
    setIsMenuOpen(false);
    navigate(`/product/${productId}`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white shadow-sm" role="banner">
      <nav className="bg-white shadow-sm h-[6.25rem]" role="navigation" aria-label="Menú principal">
        <div className="container-custom h-full flex items-center justify-between">
          {/* logo JJ Construcción  */}
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              navigate('/');
            }}
            className="flex items-center shrink-0 transition-opacity hover:opacity-90 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e5631] focus-visible:ring-offset-2 bg-transparent border-0 p-0 cursor-pointer"
            aria-label="JJ Construcción - Ir a Inicio"
          >
            <img
              src={(() => {
                if (!logo) return "/logo.png";
                if (logo.startsWith('data:')) return logo;
                if (!logoUpdatedAt) return logo;
                const joiner = logo.includes('?') ? '&' : '?';
                return `${logo}${joiner}v=${encodeURIComponent(logoUpdatedAt)}`;
              })()}
              alt="JJ Construcción"
              style={logoWidth ? { width: `${logoWidth}px` } : undefined}
              className={`h-[6rem] object-contain object-left ${!logoWidth ? 'w-auto max-h-[6.25rem]' : ''}`}
            />
          </button>

          {/* Desktop Navigation: Inicio, Tienda, Contáctanos (navegación programática) */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => handleNavigation(link.path)}
                className={`nav-link inline-block rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e5631] focus-visible:ring-offset-2 min-h-[2.25rem] flex items-center bg-transparent border-0 cursor-pointer px-4 py-2 ${location.pathname === link.path ? 'active' : ''
                  }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right: Search + Login + Cart */}
          <div className="flex items-center gap-4">
            <div ref={searchDesktopRef} className="hidden md:block relative">
              <form onSubmit={handleSearchSubmit} className="flex items-center" role="search">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={t('nav.search_placeholder')}
                    className="pl-8 w-48 h-9 bg-[#f8f8f8] border-gray-200 text-sm placeholder:text-gray-400"
                    aria-label={t('nav.search_placeholder')}
                    autoComplete="off"
                  />
                  {showDropdown && (
                    <div
                      className="absolute left-0 top-full mt-1 w-80 max-h-[320px] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-[110] py-1"
                      style={{ maxHeight: MAX_DROPDOWN_HEIGHT }}
                    >
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleSelectProduct(product.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#f8f8f8] transition-colors border-0 bg-transparent cursor-pointer"
                        >
                          <img
                            src={product.image}
                            alt=""
                            className="w-10 h-10 object-cover rounded shrink-0"
                          />
                          <span className="text-sm text-[#333] truncate flex-1">{product.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" variant="ghost" size="sm" className="text-[#1e5631] ml-1">
                  {t('nav.search')}
                </Button>
              </form>
            </div>
            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className="md:hidden p-2 text-[#333] hover:text-[#1e5631] transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e5631] inline-flex items-center justify-center min-w-[2.5rem] min-h-[2.5rem] bg-transparent border-0 cursor-pointer"
              aria-label="Ir a Tienda para buscar productos"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={toggleCart}
              className="relative p-2 text-[#333] hover:text-[#1e5631] transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e5631]"
              aria-label={t('nav.cart_view')}
            >
              <ShoppingCart className="w-5 h-5" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1.5 bg-[#e85d04] text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-[#333]" />
              ) : (
                <Menu className="w-6 h-6 text-[#333]" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Barra de envío destacada */}
      <div className="bg-[#1e5631] text-white py-2 px-4 flex items-center justify-center gap-2 shadow-md">
        <Truck className="w-5 h-5 flex-shrink-0" />
        <span className="font-bold text-sm uppercase tracking-wide text-center">
          {t('nav.shipping')}
        </span>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-[calc(6.25rem+2.5rem)] left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-[100]">
          <div className="flex flex-col p-4">
            {navLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => handleNavigation(link.path)}
                className={`py-3 px-4 text-[#333] text-sm transition-colors hover:bg-[#f8f8f8] rounded text-left w-full bg-transparent border-0 cursor-pointer ${location.pathname === link.path ? 'font-semibold bg-[#f8f8f8]' : ''
                  }`}
              >
                {link.label}
              </button>
            ))}
            <div ref={searchMobileRef} className="px-4 py-2 border-t border-gray-100">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Buscar productos..."
                    className="pl-9 w-full h-10 bg-[#f8f8f8] border-gray-200"
                    autoComplete="off"
                  />
                  {showDropdown && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 max-h-[280px] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-[110] py-1"
                      style={{ maxHeight: 280 }}
                    >
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleSelectProduct(product.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f8f8f8] transition-colors border-0 bg-transparent cursor-pointer"
                        >
                          <img
                            src={product.image}
                            alt=""
                            className="w-10 h-10 object-cover rounded shrink-0"
                          />
                          <span className="text-sm text-[#333] truncate flex-1">{product.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full mt-2 bg-[#1e5631] hover:bg-[#164a28] text-white text-sm">
                  {t('nav.search')}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
