import { X, Calendar, ArrowRight, ChevronLeft, ChevronRight, Images, SplitSquareHorizontal } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';

interface Service {
    id: string | number;
    title: string;
    description: string;
    category: string;
    image: string;
    images?: string[] | string | null;
    video?: string;
    content?: string;
    created_at?: string;
    brandName?: string | null;
    brandTagline?: string | null;
    imageBefore?: string | null;
    imageAfter?: string | null;
}

interface ServiceDetailModalProps {
    service: Service | null;
    isOpen: boolean;
    onClose: () => void;
}

// ─── Before/After Comparison Slider ───────────────────────────────────────────

function BeforeAfterSlider({ before, after, title }: { before: string; after: string; title: string }) {
    const [position, setPosition] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);

    const updatePosition = useCallback((clientX: number) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        setPosition(pct);
    }, []);

    const onMouseDown = (e: React.MouseEvent) => {
        dragging.current = true;
        e.preventDefault();
    };

    useEffect(() => {
        const onMove = (e: MouseEvent) => { if (dragging.current) updatePosition(e.clientX); };
        const onUp = () => { dragging.current = false; };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, [updatePosition]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            if (e.touches[0]) updatePosition(e.touches[0].clientX);
        };
        const onTouchEnd = () => { dragging.current = false; };
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd);
        return () => {
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, [updatePosition]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full select-none overflow-hidden cursor-col-resize"
            onMouseDown={(e) => { dragging.current = true; updatePosition(e.clientX); e.preventDefault(); }}
            onTouchStart={(e) => { dragging.current = true; if (e.touches[0]) updatePosition(e.touches[0].clientX); }}
        >
            {/* Before — base layer */}
            <img
                src={before}
                alt={`Before — ${title}`}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
            />

            {/* After — clipped layer */}
            <img
                src={after}
                alt={`After — ${title}`}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
                draggable={false}
            />

            {/* Divider line */}
            <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)]"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            />

            {/* Handle knob */}
            <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center z-10 ring-2 ring-white/60"
                style={{ left: `${position}%` }}
                onMouseDown={onMouseDown}
            >
                <SplitSquareHorizontal className="w-5 h-5 text-[#1e5631]" />
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 pointer-events-none">
                <span className="bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                    BEFORE
                </span>
            </div>
            <div className="absolute top-4 right-4 pointer-events-none">
                <span className="bg-[#1e5631]/90 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                    AFTER
                </span>
            </div>
        </div>
    );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

export function ServiceDetailModal({ service, isOpen, onClose }: ServiceDetailModalProps) {
    const { t } = useLanguage();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [activeTab, setActiveTab] = useState<'gallery' | 'beforeafter'>('gallery');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setCurrentSlide(0);
            setActiveTab('gallery');
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        };
    }, [isOpen]);

    if (!isOpen || !service) return null;

    const extraImages: string[] = (() => {
        if (!service.images) return [];
        if (Array.isArray(service.images)) return service.images;
        try {
            const parsed = JSON.parse(service.images);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return String(service.images).split(',').map(s => s.trim()).filter(Boolean);
        }
    })();

    const allImageUrls = extraImages.length > 0 
        ? extraImages 
        : (service.image ? [service.image] : []);
    const mediaItems = [
        ...allImageUrls.map(url => ({ type: 'image', url })),
        ...(service.video ? [{ type: 'video', url: service.video }] : [])
    ];

    const hasBeforeAfter = !!(service.imageBefore && service.imageAfter);

    const nextSlide = () => setCurrentSlide((p) => (p === mediaItems.length - 1 ? 0 : p + 1));
    const prevSlide = () => setCurrentSlide((p) => (p === 0 ? mediaItems.length - 1 : p - 1));

    const renderMediaItem = (item: { type: string; url: string }) => {
        if (item.type === 'video') {
            const isYouTube = item.url.includes('youtube.com') || item.url.includes('youtu.be');
            if (isYouTube) {
                const match = item.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                const videoId = match?.[1];
                return videoId ? (
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={service.title}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : null;
            }
            return (
                <video
                    src={item.url}
                    controls
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                />
            );
        }
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
    };

    const stripSizeTokens = (text: string) => text.replace(/\[\/?size(?:=\d{1,3})?\]/g, '');

    const renderBoldParts = (text: string, keyPrefix: string) => {
        const parts = stripSizeTokens(text).split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, idx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={`${keyPrefix}-b-${idx}`} className="font-semibold text-[#333]">{part.slice(2, -2)}</strong>;
            }
            return <span key={`${keyPrefix}-t-${idx}`}>{part}</span>;
        });
    };

    const renderWithFormatting = (text: string, keyPrefix: string): React.ReactNode[] => {
        const sizeRegex = /\[size=(\d{1,3})\]([\s\S]*?)\[\/size\]/g;
        sizeRegex.lastIndex = 0;
        if (!sizeRegex.test(text)) return renderBoldParts(text, keyPrefix);
        sizeRegex.lastIndex = 0;
        const nodes: React.ReactNode[] = [];
        let lastIndex = 0;
        let seg = 0;
        let match: RegExpExecArray | null;
        while ((match = sizeRegex.exec(text)) !== null) {
            const [full, sizeStr, content] = match;
            if (match.index > lastIndex) {
                nodes.push(<span key={`${keyPrefix}-n-${seg++}`}>{renderBoldParts(text.slice(lastIndex, match.index), `${keyPrefix}-n-${seg}`)}</span>);
            }
            const size = Math.min(Math.max(parseInt(sizeStr, 10) || 16, 10), 48);
            nodes.push(<span key={`${keyPrefix}-s-${seg++}`} style={{ fontSize: `${size}px` }}>{renderWithFormatting(content, `${keyPrefix}-s-${seg}`)}</span>);
            lastIndex = match.index + full.length;
        }
        if (lastIndex < text.length) {
            nodes.push(<span key={`${keyPrefix}-r-${seg++}`}>{renderBoldParts(text.slice(lastIndex), `${keyPrefix}-r-${seg}`)}</span>);
        }
        return nodes;
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row h-full max-h-[90vh] animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-lg transition-all hover:scale-105 border border-gray-100"
                    aria-label="Cerrar"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* ── Left: Media panel ── */}
                <div className="w-full lg:w-[65%] bg-black flex flex-col relative">

                    {/* Tab bar — only shown when before/after exists */}
                    {hasBeforeAfter && (
                        <div className="flex shrink-0 z-20 bg-black/70 backdrop-blur-sm">
                            <button
                                onClick={() => setActiveTab('gallery')}
                                className={`flex items-center gap-2 flex-1 justify-center py-3 text-sm font-semibold transition-colors ${activeTab === 'gallery' ? 'text-white border-b-2 border-white' : 'text-white/50 hover:text-white/80'}`}
                            >
                                <Images className="w-4 h-4" />
                                Gallery
                            </button>
                            <button
                                onClick={() => setActiveTab('beforeafter')}
                                className={`flex items-center gap-2 flex-1 justify-center py-3 text-sm font-semibold transition-colors ${activeTab === 'beforeafter' ? 'text-white border-b-2 border-[#4ade80]' : 'text-white/50 hover:text-white/80'}`}
                            >
                                <SplitSquareHorizontal className="w-4 h-4" />
                                Before &amp; After
                            </button>
                        </div>
                    )}

                    {/* Gallery */}
                    {activeTab === 'gallery' && (
                        <div className="flex-1 relative group overflow-hidden">
                            <div className="w-full h-full relative">
                                {renderMediaItem(mediaItems[currentSlide])}
                            </div>
                            {mediaItems.length > 1 && (
                                <>
                                    <button
                                        onClick={prevSlide}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/30 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                                        aria-label="Previous"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={nextSlide}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/30 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                                        aria-label="Next"
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                                        {mediaItems.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentSlide(idx)}
                                                className={`h-2.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-6 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'}`}
                                                aria-label={`Slide ${idx + 1}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Before & After slider */}
                    {activeTab === 'beforeafter' && hasBeforeAfter && (
                        <div className="flex-1 relative overflow-hidden">
                            <BeforeAfterSlider
                                before={service.imageBefore!}
                                after={service.imageAfter!}
                                title={service.title}
                            />
                            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs pointer-events-none select-none bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                                Drag to compare
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Right: Text panel ── */}
                <div className="w-full lg:w-[35%] flex flex-col bg-white border-l border-gray-100 h-full">
                    {/* Header */}
                    <div className="px-6 lg:px-8 py-6 border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-[#1e5631] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                JJ
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-gray-900 leading-none truncate">
                                    {service.brandName || t('brand.name')}
                                </span>
                                <span className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                                    {service.brandTagline || t('brand.tagline')}
                                </span>
                            </div>
                        </div>
                        <span className="inline-block bg-[#1e5631]/10 text-[#1e5631] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest mt-1">
                            {service.category}
                        </span>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 lg:px-8 py-6">
                        <h2 className="text-2xl font-bold text-[#333] mb-4 leading-tight">
                            {service.title}
                        </h2>

                        <div className="prose prose-sm prose-slate max-w-none text-gray-600 break-words">
                            <p className="font-medium text-gray-700 leading-relaxed mb-6">
                                {renderWithFormatting(service.description, 'desc')}
                            </p>

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

                        {/* Before/After teaser if visible on gallery tab */}
                        {hasBeforeAfter && activeTab === 'gallery' && (
                            <button
                                onClick={() => setActiveTab('beforeafter')}
                                className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-[#1e5631]/30 text-[#1e5631] text-sm font-semibold hover:bg-[#1e5631]/5 transition-colors"
                            >
                                <SplitSquareHorizontal className="w-4 h-4" />
                                View Before &amp; After transformation
                            </button>
                        )}

                        {service.created_at && (
                            <div className="mt-8 pt-6 border-t border-gray-50 flex items-center text-gray-400 text-xs font-medium">
                                <Calendar className="w-3 h-3 mr-1.5" />
                                {new Date(service.created_at).toLocaleDateString()}
                            </div>
                        )}
                    </div>

                    {/* Footer CTA */}
                    <div className="p-4 lg:p-6 border-t border-gray-100 bg-gray-50/30 shrink-0">
                        <Link
                            to="/contact"
                            className="flex items-center justify-center w-full bg-[#1e5631] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#164a28] transition-colors group shadow-lg shadow-[#1e5631]/10 hover:shadow-[#1e5631]/20 active:scale-[0.99]"
                            onClick={() => { onClose(); window.scrollTo(0, 0); }}
                        >
                            <span>Request a quote</span>
                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
