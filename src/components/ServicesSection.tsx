import { ArrowRight, ChevronRight, Building2, Zap, Wrench, HardHat, Factory, Hammer, SplitSquareHorizontal } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { ServiceDetailModal } from '@/components/ServiceDetailModal';
import { useSettingsStore } from '@/store/settingsStore';
import { API } from '@/lib/api';

interface Service {
    id: string;
    title: string;
    description: string;
    category: string;
    image: string;
    video?: string;
    icon: React.ElementType;
    created_at?: string;
    content?: string;
    brandName?: string | null;
    brandTagline?: string | null;
    homeSlot?: number | null;
    imageBefore?: string | null;
    imageAfter?: string | null;
}

const iconFor = (cat: string) => {
    const map: Record<string, React.ElementType> = {
        Residencial: Building2, Comercial: Zap, Maquinaria: Wrench,
        Consultoría: HardHat, Industrial: Factory, Remodelación: Hammer,
    };
    return map[cat] ?? Building2;
};

const strip = (t: string) =>
    t.replace(/\[size=\d{1,3}\]/g, '').replace(/\[\/size\]/g, '').replace(/\*\*([^*]+)\*\*/g, '$1');

export function ServicesSection() {
    const { t } = useLanguage();
    const [services, setServices] = useState<Service[]>([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [selected, setSelected] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);
    const { servicesHeader, fetchServicesHeader } = useSettingsStore();

    useEffect(() => { if (!servicesHeader) fetchServicesHeader(); }, [servicesHeader, fetchServicesHeader]);

    useEffect(() => {
        fetch(`${API}/services`)
            .then(r => r.json())
            .then(d => {
                if (Array.isArray(d)) {
                    setServices(d.map((s: any) => ({ ...s, icon: iconFor(s.category), imageBefore: s.imageBefore ?? null, imageAfter: s.imageAfter ?? null })));
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const cats = Array.from(new Set(services.map(s => s.category)));
    const filters = ['all', ...cats];

    const ordered = (() => {
        if (services.some(s => s.homeSlot != null))
            return [...services].sort((a, b) => (a.homeSlot ?? 99) - (b.homeSlot ?? 99));
        return services;
    })();

    const filtered = activeFilter === 'all' ? ordered : ordered.filter(s => s.category === activeFilter);
    const featured = filtered[0] ?? null;
    const rest = filtered.slice(1);

    return (
        <section id="servicios" className="py-24 px-[5%] bg-white overflow-hidden">
            <ServiceDetailModal service={selected} isOpen={!!selected} onClose={() => setSelected(null)} />

            <div className="max-w-[80rem] mx-auto">

                {/* ── Header ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-14 items-end">
                    {/* Left */}
                    <div>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex gap-1">
                                <div className="h-[3px] w-8 bg-[#1e5631] rounded-full" />
                                <div className="h-[3px] w-3 bg-[#e85d04] rounded-full" />
                            </div>
                            <span className="text-[#1e5631] text-[11px] font-black uppercase tracking-[0.2em]">
                                What We Offer
                            </span>
                        </div>
                        <h2 className="font-black text-[#07140d] leading-[0.95]"
                            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
                            {servicesHeader?.title || t('services.title')}{' '}
                            <span className="text-[#1e5631]">
                                {servicesHeader?.highlight || t('services.title_highlight')}
                            </span>
                        </h2>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col gap-5 lg:pb-1">
                        <p className="text-gray-500 text-[15px] leading-relaxed">
                            {servicesHeader?.description || t('services.description')}
                        </p>
                        <Link to="/services" onClick={() => window.scrollTo(0, 0)}
                            className="group inline-flex items-center gap-2 text-[#1e5631] font-bold text-sm w-fit hover:text-[#e85d04] transition-colors duration-200">
                            View all services
                            <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center transition-all group-hover:bg-[#e85d04] group-hover:border-[#e85d04] group-hover:text-white">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                        </Link>
                    </div>
                </div>

                {/* ── Filter chips ── */}
                {!loading && cats.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-10">
                        {filters.map(f => (
                            <button key={f} onClick={() => setActiveFilter(f)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${
                                    activeFilter === f
                                        ? 'bg-[#07140d] text-white border-[#07140d]'
                                        : 'bg-transparent text-gray-500 border-gray-200 hover:border-[#07140d] hover:text-[#07140d]'
                                }`}>
                                {f === 'all' ? t('services.filter_all') : f}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Skeleton ── */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="rounded-2xl bg-gray-100 animate-pulse" style={{ aspectRatio: '4/5' }} />
                        ))}
                    </div>
                )}

                {/* ── Asymmetric grid ── */}
                {!loading && filtered.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                        style={{ gridAutoRows: '1fr' }}>

                        {/* Featured — spans 2 cols + 2 rows */}
                        {featured && (
                            <div onClick={() => setSelected(featured)}
                                className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 bg-gray-900 md:col-span-2 lg:col-span-2 lg:row-span-2"
                                style={{ minHeight: '300px' }}>

                                <img src={featured.image} alt={featured.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    onError={e => { e.currentTarget.src = `https://placehold.co/900x900/07140d/fff?text=${encodeURIComponent(featured.category)}`; }} />

                                {/* Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#07140d]/95 via-[#07140d]/30 to-[#07140d]/5" />

                                {/* Number */}
                                <span className="absolute top-4 right-5 text-[6rem] font-black leading-none text-white/[0.07] select-none pointer-events-none z-10">
                                    01
                                </span>

                                {/* Badges */}
                                <div className="absolute top-5 left-5 z-20 flex gap-2 flex-wrap">
                                    <span className="bg-[#e85d04] text-white text-[10px] font-black px-3 py-1.5 rounded uppercase tracking-widest">
                                        Featured
                                    </span>
                                    <span className="bg-black/45 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded uppercase border border-white/15">
                                        {featured.category}
                                    </span>
                                    {featured.imageBefore && featured.imageAfter && (
                                        <span className="hidden sm:inline-flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1.5 rounded border border-white/15">
                                            <SplitSquareHorizontal className="w-3 h-3" />
                                            Before &amp; After
                                        </span>
                                    )}
                                </div>

                                {/* Bottom */}
                                <div className="absolute inset-x-0 bottom-0 p-7 z-20">
                                    <div className="h-[2px] bg-[#e85d04] w-0 group-hover:w-12 transition-all duration-500 mb-4 rounded-full" />
                                    <h3 className="text-2xl lg:text-3xl font-black text-white leading-snug mb-3 line-clamp-2">
                                        {featured.title}
                                    </h3>
                                    <p className="text-white/50 text-sm leading-relaxed mb-5 line-clamp-2 max-w-lg">
                                        {strip(featured.description)}
                                    </p>
                                    <span className="inline-flex items-center gap-2 bg-white text-[#07140d] font-black text-sm px-5 py-2.5 rounded-full group-hover:bg-[#e85d04] group-hover:text-white transition-all duration-300 shadow-lg">
                                        {t('services.view_details')}
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Rest cards */}
                        {rest.map((s, i) => (
                            <div key={s.id} onClick={() => setSelected(s)}
                                className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1.5 bg-gray-900"
                                style={{ minHeight: '260px' }}>

                                <img src={s.image} alt={s.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    onError={e => { e.currentTarget.src = `https://placehold.co/600x600/1e5631/fff?text=${encodeURIComponent(s.category)}`; }} />

                                <div className="absolute inset-0 bg-gradient-to-t from-[#07140d]/92 via-[#07140d]/20 to-transparent" />
                                <div className="absolute inset-0 bg-[#1e5631]/0 group-hover:bg-[#1e5631]/10 transition-colors duration-500" />

                                {/* Number */}
                                <span className="absolute top-3 right-4 text-[4.5rem] font-black leading-none text-white/[0.07] select-none pointer-events-none z-10">
                                    {String(i + 2).padStart(2, '0')}
                                </span>

                                {/* Badge */}
                                <div className="absolute top-4 left-4 z-20">
                                    <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-widest border border-white/15">
                                        {s.category}
                                    </span>
                                </div>

                                {/* Bottom */}
                                <div className="absolute inset-x-0 bottom-0 p-5 z-20">
                                    <div className="h-[2px] bg-[#e85d04] w-0 group-hover:w-8 transition-all duration-400 mb-3 rounded-full" />
                                    <h3 className="text-base font-black text-white leading-snug line-clamp-2 mb-2">
                                        {s.title}
                                    </h3>
                                    <div className="overflow-hidden max-h-0 group-hover:max-h-10 transition-all duration-500">
                                        <p className="text-white/40 text-xs leading-relaxed line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 pb-0.5">
                                            {strip(s.description)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 text-[#e85d04] text-[11px] font-black uppercase tracking-wide opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 delay-100 mt-1.5">
                                        {t('services.view_details')} <ChevronRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty */}
                {!loading && filtered.length === 0 && (
                    <div className="text-center py-20">
                        <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No hay servicios disponibles.</p>
                    </div>
                )}

                {/* ── Bottom CTA row ── */}
                {!loading && services.length > 0 && (
                    <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-5 px-7 py-6 rounded-2xl bg-[#07140d] relative overflow-hidden">
                        {/* Subtle glow */}
                        <div className="absolute inset-0 pointer-events-none"
                            style={{ background: 'radial-gradient(ellipse 50% 100% at 20% 50%, rgba(30,86,49,0.35) 0%, transparent 70%)' }} />
                        <div className="relative z-10">
                            <p className="font-black text-white text-base mb-0.5">¿Te interesa alguno de nuestros servicios?</p>
                            <p className="text-white/40 text-sm">Contáctanos y recibe una cotización sin compromiso.</p>
                        </div>
                        <div className="relative z-10 flex items-center gap-3 shrink-0">
                            <Link to="/services" onClick={() => window.scrollTo(0, 0)}
                                className="text-white/60 hover:text-white font-bold text-sm transition-colors px-5 py-2.5 rounded-full border border-white/10 hover:border-white/30">
                                Ver todos
                            </Link>
                            <Link to="/contact" onClick={() => window.scrollTo(0, 0)}
                                className="inline-flex items-center gap-2 bg-[#e85d04] hover:bg-[#c94e00] text-white font-black text-sm px-6 py-2.5 rounded-full transition-all duration-200 shadow-lg shadow-[#e85d04]/20">
                                Cotizar
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
