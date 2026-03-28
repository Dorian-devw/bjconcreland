import { ArrowRight, Zap, Building2, Wrench, HardHat, Factory, Hammer } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { ServiceDetailModal } from '@/components/ServiceDetailModal';

interface Service {
    id: number;
    title: string;
    description: string;
    category: string;
    image: string;
    video?: string;
    content?: string;
    created_at?: string;
}

import { API } from '@/lib/api';

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

const formatServiceDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
};

export function Services() {
    const { t } = useLanguage();
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    useEffect(() => {
        fetch(`${API}/services`)
            .then(res => res.json())
            .then(data => {
                setServices(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    // Extract unique categories from fetched services
    const uniqueCategories = Array.from(new Set(services.map(s => s.category)));
    const filters = ['all', ...uniqueCategories];

    // We can assume the first service or a specific one is featured, or just the first one.
    const featuredService = services.length > 0 ? services[0] : null;
    const gridServices = services.length > 0 ? services.slice(1) : [];

    const visibleGridServices = activeFilter === 'all'
        ? gridServices
        : gridServices.filter(s => s.category === activeFilter);

    const showFeatured = (activeFilter === 'all' || activeFilter === featuredService?.category) && !loading;

    return (
        <div className="min-h-screen pt-[8.75rem] pb-20 bg-white">
            <ServiceDetailModal
                service={selectedService}
                isOpen={!!selectedService}
                onClose={() => setSelectedService(null)}
            />
            <div className="max-w-[80rem] mx-auto px-[5%]">

                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-[#333] mb-4">
                        {t('services.title')} <span className="text-[#1e5631]">{t('services.title_highlight')}</span>
                    </h1>
                    <p className="text-gray-500 max-w-2xl mx-auto mb-8 text-lg">
                        {t('services.description')}
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

                {/* Featured Service */}
                {showFeatured && featuredService && (
                    <div className="mb-12 animate-fadeIn">
                        {/* Desktop Layout: Horizontal card */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300">
                            <div className="relative h-64 lg:h-auto min-h-[400px] overflow-hidden order-1 lg:order-1">
                                <div className="absolute top-6 left-6 z-10">
                                    <span className="bg-[#e85d04] text-white text-xs font-bold px-3 py-1 rounded uppercase tracking-wider">
                                        {t('services.featured_tag')}
                                    </span>
                                </div>
                                {featuredService.video ? (
                                    (() => {
                                        const isYouTube = featuredService.video.includes('youtube.com') || featuredService.video.includes('youtu.be');
                                        if (isYouTube) {
                                            const match = featuredService.video.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                                            const videoId = match ? match[1] : null;
                                            return videoId ? (
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${videoId}`}
                                                    title={featuredService.title}
                                                    className="w-full h-full object-cover"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full text-gray-500 text-sm">Video no disponible</div>
                                            );
                                        } else {
                                            return <video src={featuredService.video} controls className="w-full h-full object-cover" />;
                                        }
                                    })()
                                ) : (
                                    <img
                                        src={featuredService.image}
                                        alt={featuredService.title}
                                        onError={(e) => {
                                            e.currentTarget.src = 'https://placehold.co/800x600/e2e8f0/1e5631?text=Residencial';
                                        }}
                                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                                    />
                                )}
                            </div>
                            <div className="p-8 lg:p-12 flex flex-col justify-center order-2 lg:order-2">
                                <div className="flex items-center gap-4 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                                    {featuredService.created_at && (
                                        <span>{formatServiceDate(featuredService.created_at)}</span>
                                    )}
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>5 Min Lectura</span>
                                </div>
                                <h2 className="text-3xl md:text-3xl font-bold text-[#333] mb-6 leading-tight">
                                    {featuredService.title}
                                </h2>
                                <p className="text-gray-500 text-base leading-relaxed mb-8">
                                    {stripBoldMarkers(featuredService.description)}
                                </p>
                                <button
                                    onClick={() => setSelectedService(featuredService)}
                                    className="inline-flex items-center text-[#1e5631] font-bold text-sm uppercase tracking-wide group relative w-fit"
                                >
                                    {t('services.read_article')}
                                    <div className="h-[1px] w-0 bg-[#1e5631] absolute bottom-0 left-0 transition-all duration-300 group-hover:w-full"></div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Services Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {visibleGridServices.map((service) => (
                        <div
                            key={service.id}
                            className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col"
                        >
                            {/* Image Container */}
                            <div className="relative h-56 overflow-hidden shrink-0">
                                <div className="absolute top-4 left-4 z-10">
                                    <span className="bg-[#1e5631]/90 text-white text-xs font-bold px-3 py-1 rounded uppercase tracking-wider backdrop-blur-sm">
                                        {service.category}
                                    </span>
                                </div>
                                {service.video ? (
                                    (() => {
                                        const isYouTube = service.video.includes('youtube.com') || service.video.includes('youtu.be');
                                        if (isYouTube) {
                                            const match = service.video.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                                            const videoId = match ? match[1] : null;
                                            return videoId ? (
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${videoId}`}
                                                    title={service.title}
                                                    className="w-full h-full object-cover"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full text-gray-500 text-sm">Video no disponible</div>
                                            );
                                        } else {
                                            return <video src={service.video} controls className="w-full h-full object-cover" />;
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
                                <h3 className="text-lg font-bold text-[#333] mb-3 group-hover:text-[#1e5631] transition-colors line-clamp-2 min-h-[3.5rem]">
                                    {service.title}
                                </h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-6 line-clamp-3 flex-1">
                                    {stripBoldMarkers(service.description)}
                                </p>

                                <button
                                    onClick={() => setSelectedService(service)}
                                    className="inline-flex items-center text-[#1e5631] font-semibold text-sm group/link mt-auto"
                                >
                                    {t('services.view_details')}
                                    <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover/link:translate-x-1" />
                                    {(() => {
                                        const Icon = getIconForCategory(service.category);
                                        return <Icon className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-300 text-[#e85d04]" />;
                                    })()}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
