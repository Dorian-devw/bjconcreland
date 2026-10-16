import { ArrowRight, ChevronRight, Phone, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { ServiceDetailModal } from '@/components/ServiceDetailModal';
import { API } from '@/lib/api';

interface Service {
    id: number;
    title: string;
    description: string;
    category: string;
    image: string;
    video?: string;
    content?: string;
    created_at?: string;
    brandName?: string | null;
    brandTagline?: string | null;
    imageBefore?: string | null;
    imageAfter?: string | null;
    images?: string[] | string | null;
}

const strip = (t: string) =>
    t.replace(/\[size=\d{1,3}\]/g, '').replace(/\[\/size\]/g, '').replace(/\*\*([^*]+)\*\*/g, '$1');

export function Services() {
    const { t } = useLanguage();
    const [activeFilter, setActiveFilter] = useState('all');
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    useEffect(() => {
        fetch(`${API}/services`)
            .then(r => r.json())
            .then(d => { setServices(Array.isArray(d) ? d : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const categories = Array.from(new Set(services.map(s => s.category)));
    const filters = ['all', ...categories];

    const allVisible = activeFilter === 'all' ? services : services.filter(s => s.category === activeFilter);
    const featured = !loading && allVisible.length > 0 ? allVisible[0] : null;
    const grid = allVisible.slice(1);

    return (
        <div className="min-h-screen bg-white">
            <ServiceDetailModal service={selectedService} isOpen={!!selectedService} onClose={() => setSelectedService(null)} />

            {/* ─── HERO ─── */}
            <section className="relative bg-[#07140d] pt-[8.75rem] pb-24 px-[5%] overflow-hidden">
                {/* Radial glow */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse 80% 60% at 60% 50%, rgba(30,86,49,0.35) 0%, transparent 70%)' }} />
                {/* Giant watermark */}
                <div className="absolute right-[-2rem] top-1/2 -translate-y-1/2 text-[22vw] font-black leading-none select-none pointer-events-none text-white/[0.025] hidden lg:block tracking-tighter">
                    WORKS
                </div>

                <div className="max-w-[80rem] mx-auto relative z-10">
                    {/* Eyebrow */}
                    <div className="flex items-center gap-3 mb-8">
                        <span className="inline-block w-8 h-[2px] bg-[#e85d04]" />
                        <span className="text-[#e85d04] text-[11px] font-black uppercase tracking-[0.3em]">
                            {!loading && services.length > 0 ? `${services.length} Services` : 'What We Do'}
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="font-black text-white leading-[0.92] mb-10"
                        style={{ fontSize: 'clamp(3rem, 8vw, 6.5rem)' }}>
                        {t('services.title')}{' '}
                        <span className="relative inline-block text-[#1e5631]">
                            {t('services.title_highlight')}
                            <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-[#e85d04] rounded-full" />
                        </span>
                    </h1>

                    {/* Description */}
                    <p className="text-white/40 max-w-md text-base leading-relaxed mb-12">
                        {t('services.description')}
                    </p>

                    {/* Filters */}
                    {!loading && filters.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                            {filters.map(f => (
                                <button key={f} onClick={() => setActiveFilter(f)}
                                    className={`px-5 py-2 text-sm font-bold rounded-full border transition-all duration-200 ${
                                        activeFilter === f
                                            ? 'bg-[#e85d04] text-white border-[#e85d04] shadow-lg shadow-[#e85d04]/30'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/25'
                                    }`}>
                                    {f === 'all' ? t('services.filter_all') : f}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bottom divider */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-white"
                    style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
                    <svg viewBox="0 0 1440 48" className="w-full block" preserveAspectRatio="none">
                        <path d="M0,48 L0,24 Q360,0 720,24 Q1080,48 1440,16 L1440,48 Z" fill="white" />
                    </svg>
                </div>
            </section>

            {/* ─── CONTENT ─── */}
            <div className="max-w-[80rem] mx-auto px-[5%] pt-6 pb-20">

                {/* Skeleton */}
                {loading && (
                    <div className="space-y-6 mt-4">
                        <div className="rounded-3xl bg-gray-100 animate-pulse h-[400px]" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="rounded-2xl bg-gray-100 animate-pulse" style={{ aspectRatio: '3/4' }} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Featured card ── */}
                {featured && (
                    <div onClick={() => setSelectedService(featured)}
                        className="group cursor-pointer rounded-3xl overflow-hidden shadow-2xl mb-10 mt-2 hover:shadow-[0_32px_64px_rgba(0,0,0,0.18)] transition-shadow duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] min-h-[420px]">

                            {/* Image */}
                            <div className="relative overflow-hidden h-64 lg:h-auto">
                                {/* "01" watermark */}
                                <span className="absolute bottom-2 right-4 z-10 text-[9rem] font-black leading-none text-white/10 select-none pointer-events-none">
                                    01
                                </span>
                                {/* Badges */}
                                <div className="absolute top-5 left-5 z-20 flex gap-2">
                                    <span className="bg-[#e85d04] text-white text-[10px] font-black px-3 py-1.5 rounded uppercase tracking-widest shadow-md">
                                        {t('services.featured_tag')}
                                    </span>
                                    <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded uppercase tracking-wide">
                                        {featured.category}
                                    </span>
                                </div>
                                <img src={featured.image} alt={featured.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    onError={e => { e.currentTarget.src = 'https://placehold.co/900x600/1e5631/ffffff?text=Service'; }} />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a1f10]/40 hidden lg:block" />
                            </div>

                            {/* Content */}
                            <div className="bg-[#0f2d1a] flex flex-col justify-between p-9 lg:p-12">
                                <div>
                                    <p className="text-[#4ade80] text-[10px] font-black uppercase tracking-[0.25em] mb-5">
                                        {featured.category}
                                    </p>
                                    <h2 className="text-2xl xl:text-[1.85rem] font-black text-white leading-snug mb-5">
                                        {featured.title}
                                    </h2>
                                    <p className="text-white/45 text-sm leading-relaxed line-clamp-5">
                                        {strip(featured.description)}
                                    </p>
                                </div>
                                <div className="mt-10">
                                    <span className="flex items-center justify-center gap-3 w-full bg-white/10 group-hover:bg-[#1e5631] border border-white/10 group-hover:border-[#1e5631] text-white font-bold text-sm py-3.5 px-6 rounded-xl transition-all duration-300">
                                        {t('services.view_details')}
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Grid ── */}
                {!loading && grid.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {grid.map((service, i) => (
                            <div key={service.id} onClick={() => setSelectedService(service)}
                                className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gray-900"
                                style={{ aspectRatio: '3/4' }}>

                                {/* Bg image */}
                                <img src={service.image} alt={service.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    onError={e => { e.currentTarget.src = `https://placehold.co/600x800/1e5631/fff?text=${encodeURIComponent(service.category)}`; }} />

                                {/* Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#07140d]/95 via-[#07140d]/25 to-transparent" />
                                {/* Hover tint */}
                                <div className="absolute inset-0 bg-[#1e5631]/0 group-hover:bg-[#1e5631]/15 transition-colors duration-500" />

                                {/* Number watermark */}
                                <span className="absolute top-3 right-4 text-[5.5rem] font-black leading-none text-white/[0.07] select-none pointer-events-none z-10">
                                    {String(i + 2).padStart(2, '0')}
                                </span>

                                {/* Category badge */}
                                <div className="absolute top-4 left-4 z-20">
                                    <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-widest border border-white/15">
                                        {service.category}
                                    </span>
                                </div>

                                {/* Bottom content */}
                                <div className="absolute inset-x-0 bottom-0 p-5 z-20">
                                    {/* Orange accent bar */}
                                    <div className="h-[2px] bg-[#e85d04] w-0 group-hover:w-10 transition-all duration-500 mb-3 rounded-full" />

                                    <h3 className="text-[1.05rem] font-black text-white leading-snug mb-2 line-clamp-2">
                                        {service.title}
                                    </h3>

                                    {/* Description reveal */}
                                    <div className="overflow-hidden max-h-0 group-hover:max-h-14 transition-all duration-500">
                                        <p className="text-white/45 text-xs leading-relaxed line-clamp-2 pb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
                                            {strip(service.description)}
                                        </p>
                                    </div>

                                    {/* CTA */}
                                    <div className="flex items-center gap-1.5 text-[#e85d04] text-xs font-black uppercase tracking-wide opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 delay-100 mt-1">
                                        {t('services.view_details')}
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty */}
                {!loading && allVisible.length === 0 && (
                    <div className="text-center py-32">
                        <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium">{t('services.no_category')}</p>
                    </div>
                )}
            </div>

            {/* ─── CTA ─── */}
            {!loading && services.length > 0 && (
                <section className="relative bg-[#07140d] py-20 px-[5%] overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse 60% 80% at 30% 50%, rgba(30,86,49,0.4) 0%, transparent 70%)' }} />
                    <div className="absolute right-0 bottom-0 text-[18vw] font-black text-white/[0.025] leading-none select-none pointer-events-none hidden lg:block">
                        START
                    </div>
                    <div className="max-w-[80rem] mx-auto relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
                        <div>
                            <span className="text-[#e85d04] text-[10px] font-black uppercase tracking-[0.3em] block mb-4">
                                ── Get Started
                            </span>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-3">
                                Ready to start<br />your project?
                            </h2>
                            <p className="text-white/35 text-sm">
                                Get a free personalized quote today.
                            </p>
                        </div>
                        <Link to="/contact" onClick={() => window.scrollTo(0, 0)}
                            className="shrink-0 inline-flex items-center gap-3 bg-[#e85d04] hover:bg-[#c94e00] text-white font-black text-sm px-9 py-4 rounded-full transition-all duration-300 hover:scale-105 active:scale-100 shadow-2xl shadow-[#e85d04]/30 uppercase tracking-wide">
                            <Phone className="w-4 h-4" />
                            Contact Us
                        </Link>
                    </div>
                </section>
            )}
        </div>
    );
}
