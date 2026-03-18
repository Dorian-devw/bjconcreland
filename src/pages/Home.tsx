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
    <div className="min-h-screen pt-[8.75rem]">
      {/* Hero Section - Carrusel (imágenes gestionadas en Admin) */}
      <section className="relative h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
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
        <div className="relative z-10 text-center text-white px-4 animate-fadeIn">
          <h1 className="text-4xl md:text-6xl font-medium mb-4 leading-tight">
            {slides[heroIndex].title || slides[heroIndex].highlight ? (
              <>
                {slides[heroIndex].title}
                <br />
                <span className="text-[#c8a48c]">{slides[heroIndex].highlight}</span>
              </>
            ) : (
              <>
                {t('home.hero_title')}
                <br />
                <span className="text-[#c8a48c]">{t('home.hero_highlight')}</span>
              </>
            )}
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-200">
            {slides[heroIndex].description || t('home.hero_desc')}
          </p>
          <Link to="/catalog">
            <Button className="btn-primary text-lg px-8 py-4">
              {t('home.view_products')}
              <ArrowRight className="w-5 h-5 ml-2" />
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
      <section className="py-20 px-[5%] bg-[#f8f0ed]">
        <div className="max-w-[80rem] mx-auto">
          <h2 className="text-3xl md:text-4xl text-center text-[#333] mb-12">
            {t('home.main_categories')}
          </h2>
          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse bg-white rounded-lg p-6 h-36" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-[#666] py-8">
              {t('home.no_categories')}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((category, index) => (
                <Link
                  key={category.id}
                  to="/catalog"
                  className="animate-on-scroll bg-white rounded-lg p-6 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#f8f0ed] rounded-full flex items-center justify-center text-[#946545] transition-all group-hover:bg-[#946545] group-hover:text-white">
                    {getIcon(category.icon)}
                  </div>
                  <h3 className="text-sm font-medium text-[#333]">{category.name}</h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Services Section */}
      <ServicesSection />

      {/* Featured Products Section */}
      <section className="py-20 px-[5%] bg-white">
        <div className="max-w-[80rem] mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl md:text-4xl text-[#333]">{t('home.featured_products')}</h2>
            <Link to="/catalog">
              <Button variant="outline" className="btn-secondary">
                {t('home.view_all')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          {loading && featuredProducts.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch" aria-busy="true">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse rounded-lg bg-[#f8f0ed] h-80" />
              ))}
            </div>
          ) : error && featuredProducts.length === 0 ? (
            <div className="text-center py-16 bg-[#f8f0ed] rounded-lg">
              <p className="text-[#333] mb-4">{error}</p>
              <Button onClick={() => fetchProducts()} className="bg-[#946545] hover:bg-[#7a5337] text-white">
                {t('home.retry')}
              </Button>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-16 bg-[#f8f0ed] rounded-lg text-[#333]">
              <p>{t('home.no_featured')}</p>
              <Link to="/catalog" className="inline-block mt-4">
                <Button variant="outline" className="btn-secondary">{t('home.view_catalog')}</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              {featuredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="animate-on-scroll"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <ProductCard product={product} offer={offersByProductId[String(product.id)]} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
