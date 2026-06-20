import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { Search } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import { CompareBar } from '@/components/product/CompareBar';
import { CompareModal } from '@/components/product/CompareModal';
import { useProductsStore } from '@/store/productsStore';
import { useCompareStore } from '@/store/compareStore';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { API } from '@/lib/api';

export interface CatalogOffer {
  validUntil: string | null;
  discountPercent: number;
}

type CategoryFromApi = { id: string; name: string; icon: string; sortOrder: number; filterKey: string | null };
type FilterGroupFromApi = { id: string; name: string; key: string; sortOrder: number };

export function Catalog() {
  const { t } = useLanguage();
  const { products, loading, error, fetchProducts } = useProductsStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offersByProductId, setOffersByProductId] = useState<Record<string, CatalogOffer>>({});
  const [compareOpen, setCompareOpen] = useState(false);
  const { items: compareItems } = useCompareStore();
  const [categories, setCategories] = useState<CategoryFromApi[]>([]);
  const [filterGroups, setFilterGroups] = useState<FilterGroupFromApi[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/categories`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CategoryFromApi[]) => {
        if (cancelled || !Array.isArray(data)) return;
        setCategories(data);
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/filter-groups`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: FilterGroupFromApi[]) => {
        if (cancelled || !Array.isArray(data)) return;
        setFilterGroups(data);
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, []);

  const categoryToSidebar: Record<string, string> = {};
  categories.forEach((c) => {
    if (c.filterKey) categoryToSidebar[c.name] = c.filterKey;
  });

  const sidebarCategories = filterGroups.map((fg) => ({ value: fg.key, label: fg.name }));

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/offers`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const map: Record<string, CatalogOffer> = {};
        data.forEach((o: { productId: string | number; validUntil?: string; discountPercent: number }) => {
          map[String(o.productId)] = { validUntil: o.validUntil ?? null, discountPercent: o.discountPercent };
        });
        setOffersByProductId(map);
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, []);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // Sincronizar búsqueda con la URL (p. ej. al llegar desde el buscador del Navbar)
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchQuery(q);
  }, [searchParams]);
  const [selectedSidebarCats, setSelectedSidebarCats] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'name'>('newest');

  const productList = Array.isArray(products) ? products : [];
  const filteredProducts = productList
    .filter((product) => product && typeof product === 'object' && product.id != null)
    .filter((product) => {
      const q = searchQuery.toLowerCase().trim();
      const name = product.name != null ? String(product.name) : '';
      const desc = product.description != null ? String(product.description) : '';
      const cat = product.category != null ? String(product.category) : '';
      const matchesSearch =
        !q ||
        name.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q);
      const sidebarCat = product.storeFilterKey || categoryToSidebar[cat];
      const matchesCategory =
        selectedSidebarCats.length === 0 || (sidebarCat && selectedSidebarCats.includes(sidebarCat));
      const maxPrice = priceRange[1] >= 1000 ? Infinity : priceRange[1];
      const price = Number(product.price);
      const matchesPrice = !Number.isNaN(price) && price >= priceRange[0] && price <= maxPrice;
      return matchesSearch && matchesCategory && matchesPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return (Number(a.price) || 0) - (Number(b.price) || 0);
        case 'price-desc':
          return (Number(b.price) || 0) - (Number(a.price) || 0);
        case 'name':
          return String(a.name || '').localeCompare(String(b.name || ''));
        default:
          return 0;
      }
    });

  const handleSidebarCatToggle = (value: string) => {
    setSelectedSidebarCats((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const totalFiltered = filteredProducts.length;
  const from = totalFiltered === 0 ? 0 : 1;
  const to = totalFiltered;
  const showingText = `${t('catalog.showing')} ${from}-${to} ${t('catalog.of')} ${totalFiltered} ${t('catalog.products')}`;

  return (
    <div className={`min-h-screen bg-white pt-[8.75rem] ${compareItems.length > 0 ? 'pb-24' : ''}`}>
      {/* Hero Banner - Dark green */}
      <div className="max-w-[80rem] mx-auto px-[5%] mt-6 mb-6">
        <div className="bg-[#1e5631] rounded-xl py-10 px-6 md:py-12 md:px-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="inline-block bg-[#e85d04] text-white text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-md mb-4">
              {t('catalog.hero_tag')}
            </span>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
              {t('catalog.hero_title')}
            </h1>
            <p className="text-white text-sm md:text-base max-w-xl">
              {t('catalog.hero_desc')}
            </p>
            <p className="text-white/90 text-xs italic mt-2">{t('catalog.hero_disclaimer')}</p>
          </div>
          <div className="flex-shrink-0">
            <Button
              asChild
              className="bg-[#333] hover:bg-[#444] text-white font-bold uppercase text-sm tracking-widest px-6 py-3 rounded-lg"
            >
              <Link to="/heavy-equipment">{t('catalog.view_equipment')}</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content - light gray background */}
      <div className="bg-[#f8f8f8] py-8">
        <div className="max-w-[80rem] mx-auto px-[5%] flex flex-col lg:flex-row gap-8">
          {/* Sidebar - SEARCH PRODUCTS, CATEGORIES, PRICE RANGE */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-[#f8f8f8] space-y-8">
              <div>
                <h3 className="font-bold text-[#333] text-sm uppercase tracking-wide mb-3">
                  {t('catalog.search_title')}
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('catalog.search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value) setSearchParams({ q: e.target.value });
                      else setSearchParams({});
                    }}
                    className="pl-10 bg-[#f8f8f8] border border-gray-200 rounded-lg h-11 text-[#333] placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-[#333] text-sm uppercase tracking-wide mb-4">
                  {t('catalog.categories_title')}
                </h3>
                <div className="space-y-3">
                  {sidebarCategories.map((cat) => (
                    <label
                      key={cat.value}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedSidebarCats.includes(cat.value)}
                        onCheckedChange={() => handleSidebarCatToggle(cat.value)}
                        className="border-[#333] data-[state=checked]:bg-[#1e5631] data-[state=checked]:border-[#1e5631]"
                      />
                      <span className="text-sm text-[#333]">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-[#333] text-sm uppercase tracking-wide mb-4">
                  {t('catalog.price_range')}
                </h3>
                <Slider
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  max={1000}
                  step={10}
                  className="mb-4"
                />
                <div className="flex justify-between text-sm text-[#333]">
                  <span>$0</span>
                  <span>${priceRange[1] === 1000 ? '1000+' : priceRange[1]}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Product grid area */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <p className="text-sm text-[#333]">{showingText}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-normal text-[#333]">{t('catalog.sort_by')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold text-[#333] focus:outline-none focus:ring-2 focus:ring-[#1e5631]"
                >
                  <option value="newest">{t('catalog.sort_newest')}</option>
                  <option value="price-asc">{t('catalog.sort_price_asc')}</option>
                  <option value="price-desc">{t('catalog.sort_price_desc')}</option>
                  <option value="name">{t('catalog.sort_name')}</option>
                </select>
              </div>
            </div>

            {loading && productList.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch" aria-busy="true">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse rounded-lg bg-gray-200 border border-gray-300 h-80" />
                ))}
              </div>
            ) : error && productList.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <p className="text-[#333] mb-4">{error}</p>
                <Button onClick={() => fetchProducts()} className="bg-[#1e5631] hover:bg-[#164a28] text-white">
                  {t('home.retry')}
                </Button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#333] mb-2">{t('catalog.no_results_title')}</h3>
                <p className="text-gray-500 mb-4">{t('catalog.no_results_desc')}</p>
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSidebarCats([]);
                    setPriceRange([0, 1000]);
                    setSearchParams({});
                    fetchProducts();
                  }}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  {t('catalog.clear_filters')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {filteredProducts.map((product) => (
                  <div key={product.id}>
                    <ProductCard product={product} offer={offersByProductId[String(product.id)]} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compare floating bar + modal */}
      <CompareBar onCompare={() => setCompareOpen(true)} />
      <CompareModal
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        offersByProductId={offersByProductId}
      />
    </div>
  );
}
