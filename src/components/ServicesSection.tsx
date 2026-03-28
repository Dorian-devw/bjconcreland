import { ArrowRight, Zap, Building2, Wrench, Hammer, Factory, HardHat } from 'lucide-react';
import { useState, useEffect } from 'react';
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
    // compatible con modal
    created_at?: string;
    content?: string;
    brandName?: string | null;
    brandTagline?: string | null;
    homeSlot?: number | null;
}

const getIconForCategory = (category: string) => {
    switch (category) {
        case 'Residencial': return Building2;
        case 'Comercial': return Zap;
        case 'Maquinaria': return Wrench;
        case 'Consultoría': return HardHat;
        case 'Industrial': return Factory;
        case 'Remodelación': return Hammer;
        default: return Building2;
    }
};

const stripBoldMarkers = (text: string) =>
    text
        .replace(/\[size=\d{1,3}\]/g, '')
        .replace(/\[\/size\]/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1');

export function ServicesSection() {
    const { t } = useLanguage();
    const [services, setServices] = useState<Service[]>([]);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    const { servicesHeader, fetchServicesHeader } = useSettingsStore();

    useEffect(() => {
        if (!servicesHeader) {
            fetchServicesHeader();
        }
    }, [servicesHeader, fetchServicesHeader]);

    useEffect(() => {
        fetch(`${API}/services`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const mapped = data.map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        description: s.description,
                        category: s.category,
                        image: s.image,
                        video: s.video,
                        content: s.content,
                        created_at: s.created_at,
                        brandName: s.brandName ?? null,
                        brandTagline: s.brandTagline ?? null,
                        homeSlot: s.homeSlot ?? null,
                        icon: getIconForCategory(s.category)
                    }));
                    setServices(mapped);
                }
            })
            .catch(err => console.error('Error fetching services:', err));
    }, []);

    //  categorias unicas
    const uniqueCategories = Array.from(new Set(services.map(s => s.category)));
    const filters = ['all', ...uniqueCategories];

    const orderedServices = (() => {
        if (services.length <= 3 && services.some(s => s.homeSlot != null)) {
            return [...services].sort((a, b) => (a.homeSlot ?? 99) - (b.homeSlot ?? 99));
        }
        return services;
    })();

    const filteredServices = activeFilter === 'all'
        ? orderedServices
        : orderedServices.filter(service => service.category === activeFilter);

    return (
        <section id="servicios" className="py-20 px-[5%] bg-white">
            <ServiceDetailModal
                service={selectedService}
                isOpen={!!selectedService}
                onClose={() => setSelectedService(null)}
            />

            <div className="max-w-[80rem] mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-[#333] mb-4">
                        {servicesHeader?.title || t('services.title')} <span className="text-[#1e5631]">{servicesHeader?.highlight || t('services.title_highlight')}</span>
                    </h2>
                    <p className="text-gray-500 max-w-2xl mx-auto mb-8 text-lg whitespace-pre-wrap">
                        {servicesHeader?.description || t('services.description')}
                    </p>

                    {/* Separator */}
                    <div className="flex items-center justify-center gap-2 mb-12">
                        <div className="h-1 w-12 bg-[#1e5631] rounded-full"></div>
                        <div className="h-1 w-4 bg-[#e85d04] rounded-full"></div>
                        <div className="h-1 w-12 bg-[#1e5631] rounded-full"></div>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex flex-wrap justify-center gap-4">
                        {filters.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 border ${activeFilter === filter
                                    ? 'bg-[#1e5631] text-white border-[#1e5631]'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e5631] hover:text-[#1e5631]'
                                    }`}
                            >
                                {filter === 'all' ? t('services.filter_all') : filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredServices.map((service) => (
                        <div
                            key={service.id}
                            className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col"
                            onClick={() => setSelectedService(service)}
                        >
                            {/* Image or Video Container */}
                            <div className="relative h-64 overflow-hidden bg-gray-100 shrink-0">
                                <div className="absolute top-4 left-4 z-10">
                                    <span className="bg-[#1e5631]/90 text-white text-xs font-bold px-3 py-1 rounded uppercase tracking-wider backdrop-blur-sm">
                                        {service.category}
                                    </span>
                                </div>
                                {service.video ? (
                                    (() => {
                                        // Simple check for YouTube URL
                                        const isYouTube = service.video.includes('youtube.com') || service.video.includes('youtu.be');
                                        if (isYouTube) {
                                            // Extract ID (basic regex, covers most standard cases)
                                            const match = service.video.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                                            const videoId = match ? match[1] : null;
                                            return videoId ? (
                                                <div className="relative w-full h-full pointer-events-none">
                                                    <iframe
                                                        src={`https://www.youtube.com/embed/${videoId}?controls=0&showinfo=0&rel=0`}
                                                        title={service.title}
                                                        className="w-full h-full object-cover"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                    <div className="absolute inset-0 bg-transparent z-10"></div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full text-gray-500 text-sm">
                                                    Video no disponible
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <video
                                                    src={service.video}
                                                    muted loop autoPlay
                                                    className="w-full h-full object-cover pointer-events-none"
                                                />
                                            );
                                        }
                                    })()
                                ) : (
                                    <>
                                        <img
                                            src={service.image}
                                            alt={service.title}
                                            onError={(e) => {
                                                e.currentTarget.src = 'https://placehold.co/600x400/e2e8f0/1e5631?text=' + encodeURIComponent(service.category);
                                            }}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-8 flex flex-col flex-1">
                                <h3 className="text-xl font-bold text-[#333] mb-3 group-hover:text-[#1e5631] transition-colors line-clamp-2 min-h-[3.5rem]">
                                    {service.title}
                                </h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-6 line-clamp-3">
                                    {stripBoldMarkers(service.description)}
                                </p>

                                <button
                                    className="inline-flex items-center text-[#1e5631] font-semibold text-sm group/link mt-auto hover:underline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedService(service);
                                    }}
                                >
                                    {t('services.view_details')}
                                    <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover/link:translate-x-1" />
                                    <service.icon className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-300 text-[#e85d04]" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
