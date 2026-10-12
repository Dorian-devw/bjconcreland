import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search, Phone } from 'lucide-react';
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
  const { logo, logoWidth, logoUpdatedAt, fetchLogo, footer, fetchFooter } = useSettingsStore();
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
    fetchFooter();
  }, [fetchProducts, fetchLogo, fetchFooter]);

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
      <nav className="bg-white h-[6.25rem]" role="navigation" aria-label="Menú principal">
        <div className="container-custom h-full flex items-center justify-between px-4 md:px-8">
          {/* logo JJ Construcción  */}
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              navigate('/');
            }}
            className="flex items-center shrink-0 transition-opacity hover:opacity-90 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2b5c9c] focus-visible:ring-offset-2 bg-transparent border-0 p-0 cursor-pointer"
            aria-label="Ir a Inicio"
          >
            <img
              src={(() => {
                if (!logo) return "/logo.png";
                if (logo.startsWith('data:')) return logo;
                if (!logoUpdatedAt) return logo;
                const joiner = logo.includes('?') ? '&' : '?';
                return `${logo}${joiner}v=${encodeURIComponent(logoUpdatedAt)}`;
              })()}
              alt="Logo"
              style={logoWidth ? { width: `${logoWidth}px` } : undefined}
              className={`h-[4.5rem] object-contain object-left ${!logoWidth ? 'w-auto max-h-[4.5rem]' : ''}`}
            />
          </button>

          {/* Desktop Navigation: Centered */}
          <div className="hidden lg:flex items-center gap-8 font-semibold text-[#4a5568]">
            {navLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => handleNavigation(link.path)}
                className={`transition-colors hover:text-[#2b5c9c] text-sm uppercase tracking-wide focus:outline-none flex items-center bg-transparent border-0 cursor-pointer ${
                  location.pathname === link.path ? 'text-[#2b5c9c] border-b-2 border-[#2b5c9c] pb-1' : 'pb-1 border-b-2 border-transparent'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right: Phone, Request Quote + Icons */}
          <div className="flex items-center gap-4">
            <a
              href={`tel:${footer?.phone ? footer.phone.replace(/[^0-9+]/g, '') : '+18013472165'}`}
              className="hidden xl:flex items-center gap-2 text-gray-700 hover:text-[#2b5c9c] font-semibold mr-4 transition-colors"
            >
              <Phone className="w-4 h-4 text-[#a8876c]" />
              <span className="text-[14px] tracking-wide">{footer?.phone || '+1 (801) 347-2165'}</span>
            </a>

            <Button onClick={() => navigate('/contact')} className="hidden md:flex bg-[#2b5c9c] hover:bg-[#1f4577] text-white px-6 py-2 rounded-md font-semibold text-sm transition-colors">
               Get an Estimate
            </Button>

            <div ref={searchDesktopRef} className="hidden md:block relative">
              <form onSubmit={handleSearchSubmit} className="flex items-center" role="search">
                <div className="relative group">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-[#2b5c9c] transition-colors" />
                  <Input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={t('nav.search_placeholder')}
                    className="pl-8 w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 border-transparent focus:w-48 transition-all duration-300 focus:bg-white focus:border-gray-300 text-sm placeholder:text-transparent focus:placeholder:text-gray-400 cursor-pointer focus:cursor-text"
                    aria-label={t('nav.search_placeholder')}
                    autoComplete="off"
                  />
                  {showDropdown && (
                    <div
                      className="absolute right-0 top-full mt-2 w-80 max-h-[320px] overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl z-[110] py-2"
                      style={{ maxHeight: MAX_DROPDOWN_HEIGHT }}
                    >
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleSelectProduct(product.id)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-blue-50 transition-colors border-0 bg-transparent cursor-pointer"
                        >
                          <img
                            src={product.image}
                            alt=""
                            className="w-10 h-10 object-cover rounded shrink-0"
                          />
                          <span className="text-sm text-gray-700 font-medium truncate flex-1">{product.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>
            
            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className="md:hidden p-2 text-gray-600 hover:text-[#2b5c9c] transition-colors rounded focus:outline-none bg-transparent border-0 cursor-pointer"
              aria-label="Ir a Tienda para buscar productos"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={toggleCart}
              className="relative p-2 text-gray-600 hover:text-[#2b5c9c] transition-colors rounded focus:outline-none"
              aria-label={t('nav.cart_view')}
            >
              <ShoppingCart className="w-5 h-5" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1.5 bg-[#e85d04] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {getTotalItems()}
                </span>
              )}
            </button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-[6.25rem] left-0 right-0 bg-white shadow-xl border-t border-gray-100 z-[100]">
          <div className="flex flex-col p-4 space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => handleNavigation(link.path)}
                className={`py-3 px-4 text-gray-700 font-semibold text-sm transition-colors hover:bg-blue-50 rounded-lg text-left w-full bg-transparent border-0 cursor-pointer ${
                  location.pathname === link.path ? 'bg-blue-50 text-[#2b5c9c]' : ''
                }`}
              >
                {link.label}
              </button>
            ))}
            
            <div className="pt-4 mt-2 border-t border-gray-100">
                <Button onClick={() => handleNavigation('/contact')} className="w-full bg-[#2b5c9c] hover:bg-[#1f4577] text-white font-semibold mb-4">
                  Get an Estimate
                </Button>
            </div>

            <div ref={searchMobileRef} className="px-1 py-2">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Buscar productos..."
                    className="pl-9 w-full h-11 bg-gray-50 border-gray-200 rounded-lg focus:ring-[#2b5c9c]"
                    autoComplete="off"
                  />
                  {showDropdown && (
                    <div
                      className="absolute left-0 right-0 top-full mt-2 max-h-[280px] overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl z-[110] py-2"
                      style={{ maxHeight: 280 }}
                    >
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleSelectProduct(product.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors border-0 bg-transparent cursor-pointer"
                        >
                          <img
                            src={product.image}
                            alt=""
                            className="w-10 h-10 object-cover rounded shrink-0"
                          />
                          <span className="text-sm text-gray-700 font-medium truncate flex-1">{product.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

