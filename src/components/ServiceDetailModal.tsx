import { X, Calendar, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';

interface Service {
    id: string | number;
    title: string;
    description: string;
    category: string;
    image: string;
    video?: string;
    content?: string;
    created_at?: string;
    brandName?: string | null;
    brandTagline?: string | null;
}

interface ServiceDetailModalProps {
    service: Service | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ServiceDetailModal({ service, isOpen, onClose }: ServiceDetailModalProps) {
    const { t } = useLanguage();
    const [currentSlide, setCurrentSlide] = useState(0);

    // prevent body scroll 
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setCurrentSlide(0); // Reset slide on open
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        }

        //  paddingRight to avoid layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (isOpen && scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        };
    }, [isOpen]);

    if (!isOpen || !service) return null;

    // media list
    const mediaItems = [
        { type: 'image', url: service.image },
        ...(service.video ? [{ type: 'video', url: service.video }] : [])
    ];

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1));
    };

    const renderMediaItem = (item: { type: string, url: string }) => {
        if (item.type === 'video') {
            const isYouTube = item.url.includes('youtube.com') || item.url.includes('youtu.be');
            if (isYouTube) {
                const match = item.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                const videoId = match ? match[1] : null;
                return videoId ? (
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={service.title}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : null;
            } else {
                return (
                    <video
                        src={item.url}
                        controls
                        className="absolute inset-0 w-full h-full object-contain bg-black"
                    />
                );
            }
        } else {
            return (
                <img
                    src={item.url}
                    alt={service.title}
                    className="absolute inset-0 w-full h-full object-contain bg-gray-100"
                    onError={(e) => {
                        e.currentTarget.src = 'https://placehold.co/800x600/e2e8f0/1e5631?text=' + encodeURIComponent(service.category);
                    }}
                />
            );
        }
    };

    const stripSizeTokens = (text: string) =>
        text.replace(/\[\/?size(?:=\d{1,3})?\]/g, '');

    const renderBoldParts = (text: string, keyPrefix: string) => {
        const safeText = stripSizeTokens(text);
        const parts = safeText.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, idx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                const content = part.slice(2, -2);
                return (
                    <strong key={`${keyPrefix}-b-${idx}`} className="font-semibold text-[#333]">
                        {content}
                    </strong>
                );
            }
            return <span key={`${keyPrefix}-t-${idx}`}>{part}</span>;
        });
    };

    const renderWithFormatting = (text: string, keyPrefix: string): React.ReactNode[] => {
        const sizeRegex = /\[size=(\d{1,3})\]([\s\S]*?)\[\/size\]/g;
        sizeRegex.lastIndex = 0;
        if (!sizeRegex.test(text)) {
            return renderBoldParts(text, keyPrefix);
        }
        sizeRegex.lastIndex = 0;
        const nodes: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        let seg = 0;
        while ((match = sizeRegex.exec(text)) !== null) {
            const [full, sizeStr, content] = match;
            const start = match.index;
            if (start > lastIndex) {
                const before = text.slice(lastIndex, start);
                nodes.push(
                    <span key={`${keyPrefix}-n-${seg++}`}>
                        {renderBoldParts(before, `${keyPrefix}-n-${seg}`)}
                    </span>
                );
            }
            const size = Math.min(Math.max(parseInt(sizeStr, 10) || 16, 10), 48);
            nodes.push(
                <span key={`${keyPrefix}-s-${seg++}`} style={{ fontSize: `${size}px` }}>
                    {renderWithFormatting(content, `${keyPrefix}-s-${seg}`)}
                </span>
            );
            lastIndex = start + full.length;
        }
        if (lastIndex < text.length) {
            const rest = text.slice(lastIndex);
            nodes.push(
                <span key={`${keyPrefix}-r-${seg++}`}>
                    {renderBoldParts(rest, `${keyPrefix}-r-${seg}`)}
                </span>
            );
        }
        return nodes;
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
                onClick={onClose}
                aria-hidden="true"
            ></div>

            {/* Modal Container */}
            <div
                className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row h-full max-h-[90vh] animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-lg transition-all duration-200 hover:scale-105 border border-gray-100"
                    aria-label="Cerrar modal"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Left Side */}
                <div className="w-full lg:w-[65%] bg-black flex flex-col relative group">
                    <div className="flex-1 relative w-full h-full flex items-center justify-center overflow-hidden">
                        {/* Current Slide */}
                        <div className="w-full h-full relative">
                            {renderMediaItem(mediaItems[currentSlide])}
                        </div>

                        {/* Navigation Arrows */}
                        {mediaItems.length > 1 && (
                            <>
                                <button
                                    onClick={prevSlide}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/30 text-white backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                                    aria-label="Anterior elemento"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={nextSlide}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/30 text-white backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                                    aria-label="Siguiente elemento"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}

                        {/* pagination dots */}
                        {mediaItems.length > 1 && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                                {mediaItems.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSlide(idx)}
                                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'
                                            }`}
                                        aria-label={`Ir a diapositiva ${idx + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side */}
                <div className="w-full lg:w-[35%] flex flex-col bg-white border-l border-gray-100 h-full">
                    {/* Header Fixed */}
                    <div className="px-6 lg:px-8 py-6 border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-[#1e5631] flex items-center justify-center text-white text-xs font-bold">
                                JJ
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900 leading-none">
                                    {service.brandName || t('brand.name')}
                                </span>
                                <span className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                                    {service.brandTagline || t('brand.tagline')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 lg:px-8 py-6">
                        <h2 className="text-2xl font-bold text-[#333] mb-4 leading-tight">
                            {service.title}
                        </h2>

                        <div className="prose prose-sm prose-slate max-w-none text-gray-600 break-words break-all">
                            <p className="font-medium text-gray-700 leading-relaxed mb-6">
                                {renderWithFormatting(service.description, 'desc')}
                            </p>

                            {/* Rich Content Render */}
                            {service.content ? (
                                <div className="space-y-4 text-justify">
                                    {service.content.split('\n').filter(Boolean).map((paragraph, idx) => (
                                        <p key={idx} className="leading-relaxed">
                                            {renderWithFormatting(paragraph, `p-${idx}`)}
                                        </p>
                                    ))}
                                </div>
                            ) : (
                                <p className="italic text-gray-400 text-center py-8">
                                    {t ? t('services.no_content') : '...'}
                                </p>
                            )}
                        </div>

                        {/* Metadata */}
                        {service.created_at && (
                            <div className="mt-8 pt-6 border-t border-gray-50 flex items-center text-gray-400 text-xs font-medium">
                                <Calendar className="w-3 h-3 mr-1.5" />
                                {new Date(service.created_at).toLocaleDateString()}
                            </div>
                        )}
                    </div>

                    {/* Footer Fixed Actions */}
                    <div className="p-4 lg:p-6 border-t border-gray-100 bg-gray-50/30 shrink-0">
                        <Link
                            to="/contact"
                            className="flex items-center justify-center w-full bg-[#1e5631] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#164a28] transition-colors duration-300 group shadow-lg shadow-[#1e5631]/10 hover:shadow-[#1e5631]/20 transform active:scale-[0.99]"
                            onClick={() => {
                                onClose();
                                window.scrollTo(0, 0);
                            }}
                        >
                            <span>Request a Quote</span>
                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
