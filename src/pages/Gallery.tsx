import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { API } from '@/lib/api';
import { 
  Images, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ArrowRight, 
  Filter, 
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface GalleryItem {
  id: number;
  title: string;
  category: string;
  image_url: string;
  description: string;
  sort_order: number;
  created_at?: string;
}

const CATEGORIES = ['All', 'Concrete', 'Landscaping', 'Artificial Turf', 'Hardscapes'];

export function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchGallery = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/gallery`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setItems(data);
        }
      } catch (err) {
        console.error('Failed to load gallery items:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchGallery();
    return () => { isMounted = false; };
  }, []);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return items;
    return items.filter(
      (item) => item.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [items, selectedCategory]);

  const activePhoto = activeLightboxIndex !== null ? filteredItems[activeLightboxIndex] : null;

  const handleNext = useCallback(() => {
    if (activeLightboxIndex === null || filteredItems.length === 0) return;
    setActiveLightboxIndex((prev) => ((prev! + 1) % filteredItems.length));
  }, [activeLightboxIndex, filteredItems.length]);

  const handlePrev = useCallback(() => {
    if (activeLightboxIndex === null || filteredItems.length === 0) return;
    setActiveLightboxIndex((prev) => ((prev! - 1 + filteredItems.length) % filteredItems.length));
  }, [activeLightboxIndex, filteredItems.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeLightboxIndex === null) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setActiveLightboxIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLightboxIndex, handleNext, handlePrev]);

  return (
    <div className="min-h-screen bg-[#faf8f5] pt-[6.25rem]">
      {/* ── Hero Banner ── */}
      <section className="w-full bg-[#a8876c] px-[5%] py-16 md:py-24 text-[#3a2f2a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block w-6 h-[2px] bg-[#3a2f2a]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#3a2f2a]/90">
                OUR WORK &amp; PORTFOLIO
              </span>
            </div>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.05] max-w-3xl text-[#3a2f2a]">
              Project Gallery
            </h1>
            <p className="text-sm md:text-base text-[#3a2f2a]/90 mt-5 max-w-2xl font-medium leading-relaxed">
              Explore our completed residential and commercial projects across Utah. From stamped driveways and durable foundations to modern turf and lush landscaping.
            </p>
          </div>

          <div className="flex-shrink-0">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-[#3a2f2a] hover:bg-black text-white font-bold uppercase text-xs tracking-widest px-8 py-4 transition-colors shadow-md"
            >
              <span>Get Free Estimate</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Filter Tabs & Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-6 mb-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setActiveLightboxIndex(null);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    active
                      ? 'bg-[#3a2f2a] text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:text-[#3a2f2a] hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-500 font-medium">
            Showing <strong className="text-gray-900">{filteredItems.length}</strong> {filteredItems.length === 1 ? 'project' : 'projects'}
          </p>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#a8876c] border-t-transparent mb-4" />
            <p className="text-sm font-semibold text-gray-600">Loading gallery photos...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center max-w-xl mx-auto shadow-sm">
            <Images className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-serif text-xl font-bold text-gray-800">No Projects Found</h3>
            <p className="text-xs text-gray-500 mt-1 mb-6">
              There are no photos currently listed under this category.
            </p>
            <Button
              onClick={() => setSelectedCategory('All')}
              variant="outline"
              className="text-xs font-bold uppercase tracking-wider"
            >
              View All Photos
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => setActiveLightboxIndex(idx)}
                className="group cursor-pointer bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Photo container */}
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 text-gray-900 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-md">
                      View Photo
                    </span>
                  </div>
                  {/* Category badge */}
                  <span className="absolute top-3 left-3 bg-[#3a2f2a]/85 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                    {item.category || 'Concrete'}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#3a2f2a] group-hover:text-[#a8876c] transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-[#a8876c]">
                    <span>BJ Concreland</span>
                    <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Inspect &rarr;
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Bottom Estimate CTA ── */}
        <div className="mt-16 md:mt-24 bg-gradient-to-r from-[#3a2f2a] to-[#251e1b] rounded-2xl p-8 md:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-[#a8876c] text-xs font-bold uppercase tracking-widest flex items-center justify-center md:justify-start gap-1.5">
              <Sparkles className="w-4 h-4 text-[#a8876c]" /> Like What You See?
            </span>
            <h3 className="font-serif text-2xl md:text-3xl font-bold">
              Ready to Upgrade Your Property?
            </h3>
            <p className="text-white/80 text-xs md:text-sm max-w-xl">
              Get an accurate, no-obligation estimate from Don José and the BJ Concreland team. Call us or message through our contact page today.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <a
              href="tel:+18013472165"
              className="inline-flex items-center gap-2 bg-transparent hover:bg-white/10 text-white border border-white/30 text-xs font-bold uppercase tracking-widest px-6 py-3.5 rounded transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              <span>(801) 347-2165</span>
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-[#a8876c] hover:bg-[#927359] text-white text-xs font-bold uppercase tracking-widest px-6 py-3.5 rounded transition-colors shadow-md"
            >
              <span>Contact Us</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Lightbox Modal ── */}
      {activePhoto && activeLightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in-50 duration-200"
          onClick={() => setActiveLightboxIndex(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] bg-[#1a1816] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setActiveLightboxIndex(null)}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 text-white hover:bg-black/90 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left/Prev Arrow */}
            {filteredItems.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/90 flex items-center justify-center transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Right/Next Arrow */}
            {filteredItems.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-4 md:right-[340px] top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/90 flex items-center justify-center transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Large Image Area */}
            <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px] max-h-[65vh] md:max-h-[85vh]">
              <img
                src={activePhoto.image_url}
                alt={activePhoto.title}
                className="max-h-full max-w-full object-contain select-none"
              />
            </div>

            {/* Info Sidebar */}
            <div className="w-full md:w-80 bg-[#1e1b18] p-6 text-white flex flex-col justify-between shrink-0 border-t md:border-t-0 md:border-l border-white/10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="bg-[#a8876c] text-[#1a1816] text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded">
                    {activePhoto.category}
                  </span>
                  <span className="text-white/40 text-xs">
                    {activeLightboxIndex + 1} of {filteredItems.length}
                  </span>
                </div>

                <h2 className="font-serif text-xl md:text-2xl font-bold leading-snug">
                  {activePhoto.title}
                </h2>

                {activePhoto.description && (
                  <p className="text-white/70 text-xs leading-relaxed">
                    {activePhoto.description}
                  </p>
                )}
              </div>

              <div className="pt-6 mt-6 border-t border-white/10 space-y-3">
                <Link
                  to="/contact"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#a8876c] hover:bg-[#927359] text-white text-xs font-bold uppercase tracking-widest py-3 rounded transition-colors text-center shadow-md"
                >
                  <span>Request Similar Project</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="tel:+18013472165"
                  className="w-full inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2.5 rounded transition-colors text-center"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call (801) 347-2165</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Gallery;
