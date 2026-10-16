import { Building2, Zap, Wrench, HardHat, Factory, Hammer, Trees, Sparkles, Home as HomeIcon } from 'lucide-react';
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
    images?: string[] | string | null;
}

const iconFor = (cat: string) => {
    const map: Record<string, React.ElementType> = {
        Landscape: Trees,
        Landscaping: Trees,
        Jardinería: Trees,
        Residencial: HomeIcon,
        Residential: HomeIcon,
        Comercial: Zap,
        Commercial: Zap,
        Maquinaria: Wrench,
        Machinery: Wrench,
        Equipment: Wrench,
        Consultoría: HardHat,
        Consulting: HardHat,
        Industrial: Factory,
        Remodelación: Hammer,
        Remodeling: Hammer,
        Concrete: Sparkles,
    };
    return map[cat] ?? Building2;
};

const strip = (t: string) =>
    t.replace(/\[size=\d{1,3}\]/g, '').replace(/\[\/size\]/g, '').replace(/\*\*([^*]+)\*\*/g, '$1');

export function ServicesSection() {
    const { t } = useLanguage();
    const [services, setServices] = useState<Service[]>([]);
    const [selected, setSelected] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);
    const { servicesHeader, fetchServicesHeader } = useSettingsStore();

    useEffect(() => { if (!servicesHeader) fetchServicesHeader(); }, [servicesHeader, fetchServicesHeader]);

    useEffect(() => {
        fetch(`${API}/services`)
            .then(r => r.json())
            .then(d => {
                if (Array.isArray(d)) {
                    setServices(d.map((s: any) => ({ ...s, icon: iconFor(s.category), imageBefore: s.imageBefore ?? null, imageAfter: s.imageAfter ?? null, images: s.images ?? null })));
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = (() => {
        if (services.some(s => s.homeSlot != null))
            return [...services].sort((a, b) => (a.homeSlot ?? 99) - (b.homeSlot ?? 99));
        return services;
    })();


    return (
        <section id="servicios" className="w-full overflow-hidden flex flex-col md:flex-row">
            <ServiceDetailModal service={selected} isOpen={!!selected} onClose={() => setSelected(null)} />

            {/* Left Side - Solid Color Block */}
            <div className="w-full md:w-[35%] bg-[#a8876c] p-12 md:p-20 flex items-center justify-center relative">
                <div className="max-w-md w-full relative z-10">
                    <h2 className="font-serif text-5xl md:text-7xl text-[#3a2f2a] leading-[0.9] mb-6">
                        {servicesHeader?.title || t('services.title')}
                    </h2>
                    {servicesHeader?.highlight && (
                        <h2 className="font-serif text-5xl md:text-7xl text-[#3a2f2a] leading-[0.9] mb-8">
                            {servicesHeader.highlight}
                        </h2>
                    )}
                    <p className="text-[#3a2f2a]/80 text-lg mt-6 font-medium">
                        {servicesHeader?.description || t('services.description')}
                    </p>
                    <div className="mt-12">
                        <Link to="/services" onClick={() => window.scrollTo(0, 0)}
                            className="inline-block border-b border-[#3a2f2a] text-[#3a2f2a] font-bold text-sm uppercase tracking-widest pb-1 hover:opacity-70 transition-opacity">
                            View all services
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Side - Services Grid */}
            <div className="w-full md:w-[65%] bg-white p-8 md:p-16 flex items-center">
                
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-16 w-full">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="animate-pulse flex flex-col gap-4">
                                <div className="w-8 h-8 bg-gray-200 rounded-sm" />
                                <div className="h-4 bg-gray-200 w-2/3 rounded-sm" />
                                <div className="h-16 bg-gray-100 w-full rounded-sm" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center w-full py-20">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">{t('services.no_available')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-16 w-full max-w-4xl mx-auto">
                        {filtered.map((s, idx) => {
                            const Icon = s.icon || Building2;
                            return (
                                <div key={s.id} onClick={() => setSelected(s)}
                                    className={`group cursor-pointer flex flex-col relative ${
                                        idx % 2 === 0 ? 'sm:border-r border-gray-100 sm:pr-12' : ''
                                    }`}>
                                    
                                    <div className="text-[#a8876c] mb-5 group-hover:scale-110 transition-transform origin-left">
                                        <Icon strokeWidth={1} className="w-10 h-10" />
                                    </div>
                                    
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-3 group-hover:text-[#a8876c] transition-colors">
                                        {s.title}
                                    </h3>
                                    
                                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 mb-4">
                                        {strip(s.description)}
                                    </p>

                                    {s.image && (
                                        <div className="mt-auto w-full aspect-[16/10] overflow-hidden rounded-xl bg-gray-100 relative shadow-sm group-hover:shadow-md transition-shadow">
                                            <img
                                                src={s.image}
                                                alt={s.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
