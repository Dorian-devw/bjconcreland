import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { Search } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
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
    <div className={`min-h-screen bg-[#faf8f5] pt-[6.25rem] ${compareItems.length > 0 ? 'pb-24' : ''}`}>
      {/* Hero Banner - Solid Brand Header Style (matching Home Featured Projects & Services) */}
      <section className="w-full bg-[#a8876c] px-[5%] py-16 md:py-20 text-[#3a2f2a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block text-[#3a2f2a]/80">
              {t('catalog.hero_tag') || 'OFFICIAL STORE'}
            </span>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.05] max-w-2xl text-[#3a2f2a]">
              {t('catalog.hero_title') || 'Premium Materials & Quality Products'}
            </h1>
            <p className="text-sm md:text-base text-[#3a2f2a]/90 mt-4 max-w-xl font-medium">
              {t('catalog.hero_desc')}
            </p>
          </div>

          <div className="flex-shrink-0">
            <Link
              to="/heavy-equipment"
              className="inline-block bg-[#3a2f2a] hover:bg-black text-white font-bold uppercase text-xs tracking-widest px-8 py-4 transition-colors"
            >
              {t('catalog.view_equipment')}
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="w-full py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col lg:flex-row gap-12">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white p-6 border border-gray-100 space-y-8 sticky top-32">
              <div>
                <h3 className="font-bold text-[#3a2f2a] text-xs uppercase tracking-widest mb-3 pb-2 border-b border-gray-100">
                  {t('catalog.search_title')}
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('catalog.search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value) setSearchParams({ q: e.target.value });
                      else setSearchParams({});
                    }}
                    className="pl-9 bg-[#fdfbf9] border-gray-200 text-xs rounded-none h-10 text-[#3a2f2a] placeholder:text-gray-400 focus:border-[#a8876c]"
                  />
                </div>
              </div>

              {sidebarCategories.length > 0 && (
                <div>
                  <h3 className="font-bold text-[#3a2f2a] text-xs uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
                    {t('catalog.categories_title')}
                  </h3>
                  <div className="space-y-3">
                    {sidebarCategories.map((cat) => (
                      <label
                        key={cat.value}
                        className="flex items-center gap-3 cursor-pointer group text-xs text-gray-600 hover:text-[#3a2f2a]"
                      >
                        <Checkbox
                          checked={selectedSidebarCats.includes(cat.value)}
                          onCheckedChange={() => handleSidebarCatToggle(cat.value)}
                          className="border-gray-300 data-[state=checked]:bg-[#a8876c] data-[state=checked]:border-[#a8876c] rounded-none"
                        />
                        <span className="group-hover:translate-x-0.5 transition-transform font-medium">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold text-[#3a2f2a] text-xs uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
                  {t('catalog.price_range')}
                </h3>
                <Slider
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  max={1000}
                  step={10}
                  className="mb-4"
                />
                <div className="flex justify-between text-xs font-semibold text-gray-500">
                  <span>$0</span>
                  <span>${priceRange[1] === 1000 ? '1000+' : priceRange[1]}</span>
                </div>
              </div>

              {(searchQuery || selectedSidebarCats.length > 0 || priceRange[0] > 0 || priceRange[1] < 1000) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSidebarCats([]);
                    setPriceRange([0, 1000]);
                    setSearchParams({});
                  }}
                  className="w-full text-center text-xs uppercase tracking-wider text-[#a8876c] hover:underline font-bold pt-2 block"
                >
                  {t('catalog.clear_filters')}
                </button>
              )}
            </div>
          </aside>

          {/* Product grid area */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-4 border-b border-gray-200">
              <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">{showingText}</p>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider font-bold text-[#3a2f2a]">{t('catalog.sort_by')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-white border border-gray-200 px-4 py-2 text-xs font-semibold text-[#3a2f2a] focus:outline-none focus:border-[#a8876c]"
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
                  <div key={i} className="animate-pulse bg-white border border-gray-100 h-96" />
                ))}
              </div>
            ) : error && productList.length === 0 ? (
              <div className="text-center py-20 bg-white border border-gray-100">
                <p className="text-gray-900 mb-4">{error}</p>
                <Button onClick={() => fetchProducts()} className="bg-[#a8876c] hover:bg-[#8f7158] text-white rounded-none uppercase text-xs tracking-widest">
                  {t('home.retry')}
                </Button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white border border-gray-100">
                <Search className="w-12 h-12 text-[#a8876c]/40 mx-auto mb-4" />
                <h3 className="font-serif text-2xl font-bold text-[#3a2f2a] mb-2">{t('catalog.no_results_title')}</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">{t('catalog.no_results_desc')}</p>
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSidebarCats([]);
                    setPriceRange([0, 1000]);
                    setSearchParams({});
                    fetchProducts();
                  }}
                  className="bg-[#a8876c] hover:bg-[#3a2f2a] text-white rounded-none uppercase text-xs tracking-widest px-8 py-4"
                >
                  {t('catalog.clear_filters')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
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

    </div>
  );
}
