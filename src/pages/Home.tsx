import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowRight, Zap, Wrench, Building2, Paintbrush, Droplets, Lightbulb } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import { useProductsStore } from '@/store/productsStore';
import { Button } from '@/components/ui/button';
import { ServicesSection } from '@/components/ServicesSection';

interface HeroSlide {
  src: string;
  alt: string;
  title?: string;
  highlight?: string;
  description?: string;
}

const HERO_SLIDES_FALLBACK: HeroSlide[] = [
  { src: '/hero-banner.jpg', alt: 'Construction Site' },
  { src: '/promo-tools.jpg', alt: 'Tools' },
  { src: '/promo-materials.jpg', alt: 'Materials' },
  { src: '/promo-shipping.jpg', alt: 'Shipping' },
];
const HERO_INTERVAL_MS = 5000;
const PROMO_CAROUSEL_INTERVAL_MS = 6000;
import { API } from '@/lib/api';

interface PromoBannerItem {
  id: number;
  image: string;
  title: string;
  description: string;
  sortOrder: number;
}

interface CatalogOffer {
  validUntil: string | null;
  discountPercent: number;
}

export function Home() {
  const { t } = useLanguage();
  const { products, loading, error, fetchProducts } = useProductsStore();
  const featuredProducts = Array.isArray(products) ? products.slice(0, 8) : [];
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [promoBanners, setPromoBanners] = useState<PromoBannerItem[]>([]);
  const [promoIndex, setPromoIndex] = useState(0);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const categoriesEffectId = useRef(0);
  const [offersByProductId, setOffersByProductId] = useState<Record<string, CatalogOffer>>({});

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/carousel`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: HeroSlide[]) => {
        if (cancelled) return;
        const slides = Array.isArray(data) && data.length > 0
          ? data.map((s: any) => ({
            src: s.src || '',
            alt: s.alt || '',
            title: s.title || '',
            highlight: s.highlight || '',
            description: s.description || ''
          }))
          : HERO_SLIDES_FALLBACK;
        setHeroSlides(slides);
      })
      .catch(() => {
        if (!cancelled) setHeroSlides(HERO_SLIDES_FALLBACK);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/promo-banners`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PromoBannerItem[]) => {
        if (cancelled || !Array.isArray(data)) return;
        setPromoBanners(data);
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const id = ++categoriesEffectId.current;
    setCategoriesLoading(true);
    fetch(`${API}/categories`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (categoriesEffectId.current !== id) return;
        const list = Array.isArray(data)
          ? data.map((c: { id?: unknown; name?: unknown; icon?: unknown }) => ({
            id: String(c?.id ?? ''),
            name: String(c?.name ?? ''),
            icon: String(c?.icon ?? 'Wrench'),
          })).filter((c) => c.id && c.name)
          : [];
        setCategories(list);
      })
      .catch(() => {
        if (categoriesEffectId.current !== id) return;
        setCategories([]);
      })
      .finally(() => {
        if (categoriesEffectId.current === id) setCategoriesLoading(false);
      });
    return () => { categoriesEffectId.current = -1; };
  }, []);

  useEffect(() => {
    if (promoBanners.length === 0) return;
    const timer = setInterval(() => {
      setPromoIndex((i) => (i + 1) % Math.max(promoBanners.length, 1));
    }, PROMO_CAROUSEL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [promoBanners.length]);

  const slides = heroSlides.length > 0 ? heroSlides : HERO_SLIDES_FALLBACK;

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((i) => (i + 1) % slides.length);
    }, HERO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-slideInBottom');
            entry.target.classList.remove('opacity-0');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => {
      el.classList.add('opacity-0');
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [featuredProducts.length, categories.length]);

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ElementType> = {
      Zap,
      Wrench,
      Building2,
      Paintbrush,
      Droplets,
      Lightbulb,
    };
    const Icon = icons[iconName] || Wrench;
    return <Icon className="w-8 h-8" />;
  };

  return (
    <div className="min-h-screen pt-[6.25rem]">
      {/* Hero Section - Full Screen */}
      <section className="relative min-h-[calc(100vh-6.25rem)] flex items-center justify-center overflow-hidden">
        {/* Carrusel de fondos */}
        {slides.map((slide, i) => (
          <div
            key={slide.src + i}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-in-out"
            style={{
              backgroundImage: `url(${slide.src})`,
              opacity: i === heroIndex ? 1 : 0,
              zIndex: i === heroIndex ? 0 : -1,
            }}
            aria-hidden={i !== heroIndex}
          />
        ))}
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50 z-[1]" />

        {/* Indicadores del carrusel */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setHeroIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${i === heroIndex ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'
                }`}
              aria-label={`Ir a imagen ${i + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center text-white px-4 animate-fadeIn w-full max-w-7xl mx-auto">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-light mb-6 leading-[1.1] tracking-tight">
            {slides[heroIndex].title || slides[heroIndex].highlight ? (
              <>
                {slides[heroIndex].title}
                <br />
                <span className="font-semibold text-white">{slides[heroIndex].highlight}</span>
              </>
            ) : (
              <>
                Bringing Your <br />
                <span className="font-semibold text-white">Concrete Visions</span><br />
                to Reality
              </>
            )}
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-gray-200 font-light">
            {slides[heroIndex].description || 'Serving the area with premium quality concrete and landscaping for over 40 Years'}
          </p>
          <Link to="/catalog">
            <Button className="bg-[#2b5c9c] hover:bg-[#1f4577] text-white text-lg px-10 py-6 rounded-md font-semibold transition-colors">
              {t('home.view_products')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Tres banners en fila (como la imagen): rotan cada 6 s (3º→2º→1º→3º…) */}
      {promoBanners.length > 0 && (
        <section className="py-12 px-[5%] bg-white" aria-label="Banners promocionales">
          <div className="max-w-[80rem] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((slotIndex) => {
                const n = promoBanners.length;
                const bannerIndex = (promoIndex + (slotIndex === 0 ? 1 : slotIndex === 1 ? 2 : 0)) % n;
                const banner = promoBanners[bannerIndex];
                const accentColors = ['text-[#c8a48c]', 'text-orange-400', 'text-green-400'];
                const accent = accentColors[slotIndex % 3];
                return (
                  <div
                    key={`slot-${slotIndex}-${banner.id}`}
                    className="relative overflow-hidden rounded-xl h-64 md:h-72 group transition-opacity duration-500"
                  >
                    <img
                      src={banner.image}
                      alt={banner.title || 'Promoción'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                      {banner.title && (
                        <span className={`${accent} text-sm font-bold uppercase tracking-wide mb-1 block`}>
                          {banner.title}
                        </span>
                      )}
                      {banner.description && (
                        <p className="text-white text-sm">{banner.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {promoBanners.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {promoBanners.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPromoIndex(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${i === promoIndex % promoBanners.length ? 'w-8 bg-[#1e5631]' : 'w-2 bg-gray-300 hover:bg-gray-400'
                      }`}
                    aria-label={`Ir a paso ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Categories Section - siempre visible */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-[5%]">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-[#3a2f2a] mb-4">
              {t('home.main_categories')}
            </h2>
            <div className="w-16 h-[1px] bg-[#a8876c] mx-auto"></div>
          </div>
          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-sm p-6 h-32" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {t('home.no_categories')}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
              {categories.map((category, index) => (
                <Link
                  key={category.id}
                  to="/catalog"
                  className="animate-on-scroll group flex flex-col items-center text-center transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-16 h-16 mb-4 text-[#a8876c] group-hover:text-[#3a2f2a] transition-colors flex items-center justify-center">
                    {getIcon(category.icon)}
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 group-hover:text-[#a8876c] transition-colors">{category.name}</h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Services Section */}
      <ServicesSection />

      {/* Featured Products Section */}
      <section className="w-full bg-white">
        <div className="w-full bg-[#a8876c] px-[5%] py-16 md:py-24 flex items-center">
            <div className="max-w-7xl mx-auto w-full">
                <span className="text-[#3a2f2a] text-xs font-bold uppercase tracking-widest mb-4 block">
                    FEATURED PROJECTS
                </span>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <h2 className="font-serif text-4xl md:text-6xl text-[#3a2f2a] leading-[1.1] max-w-2xl">
                        Rest assured your project is done right
                    </h2>
                    <Link to="/catalog" className="inline-block border-b border-[#3a2f2a] text-[#3a2f2a] font-bold text-sm uppercase tracking-widest pb-1 hover:opacity-70 transition-opacity mb-2">
                        {t('home.view_all')}
                    </Link>
                </div>
            </div>
        </div>

        <div className="w-full max-w-none">
          {loading && featuredProducts.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 w-full" aria-busy="true">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-gray-200 aspect-square w-full" />
              ))}
            </div>
          ) : error && featuredProducts.length === 0 ? (
            <div className="text-center py-16 bg-gray-50">
              <p className="text-gray-900 mb-4">{error}</p>
              <Button onClick={() => fetchProducts()} className="bg-[#a8876c] hover:bg-[#8f7158] text-white">
                {t('home.retry')}
              </Button>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 text-gray-900">
              <p>{t('home.no_featured')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 w-full">
              {featuredProducts.slice(0, 3).map((product, index) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="animate-on-scroll relative group block aspect-square md:aspect-[4/5] overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                     <span className="bg-white text-[#3a2f2a] font-bold text-xs uppercase tracking-widest px-6 py-3">View Details</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
