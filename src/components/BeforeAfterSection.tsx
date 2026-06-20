import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Metric {
  label: string;
  value: string;
  positive?: boolean;
}

interface Project {
  title: string;
  description: string;
  category: string;
  before: string;
  after: string;
  metrics: Metric[];
}

const PROJECTS: Project[] = [
  {
    title: 'Renovación de instalación eléctrica',
    description:
      'Actualización completa del tablero principal y cableado en edificio comercial de 3 pisos. Incluyó 48 puntos eléctricos nuevos y sistema de protección diferencial.',
    category: 'Electricidad',
    before: 'https://placehold.co/800x520/7a6a5a/ffffff?text=ANTES',
    after: 'https://placehold.co/800x520/1e5631/ffffff?text=DESPU%C3%89S',
    metrics: [
      { label: 'Reducción de consumo', value: '35%', positive: true },
      { label: 'Tiempo de obra', value: '5 días' },
      { label: 'Puntos eléctricos', value: '48' },
    ],
  },
  {
    title: 'Revestimiento y pintura de fachada',
    description:
      'Impermeabilización, revoque y pintura exterior de edificio residencial de 8 departamentos. Sellado de grietas con sistema bicapa de alto rendimiento.',
    category: 'Pintura',
    before: 'https://placehold.co/800x520/8B7455/ffffff?text=ANTES',
    after: 'https://placehold.co/800x520/2d7a4f/ffffff?text=DESPU%C3%89S',
    metrics: [
      { label: 'Superficie cubierta', value: '420 m²' },
      { label: 'Ahorro en calefacción', value: '20%', positive: true },
      { label: 'Garantía', value: '10 años' },
    ],
  },
  {
    title: 'Remodelación sanitaria',
    description:
      'Sustitución total de cañerías y modernización de baños en local gastronómico. Eliminación de pérdidas y actualización a normas vigentes.',
    category: 'Fontanería',
    before: 'https://placehold.co/800x520/706050/ffffff?text=ANTES',
    after: 'https://placehold.co/800x520/1a5428/ffffff?text=DESPU%C3%89S',
    metrics: [
      { label: 'Pérdidas eliminadas', value: '100%', positive: true },
      { label: 'Cañerías renovadas', value: '85 m' },
      { label: 'Tiempo de ejecución', value: '3 días' },
    ],
  },
];

function Slider({
  before,
  after,
  title,
}: {
  before: string;
  after: string;
  title: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const applyPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    setPosition(Math.min(Math.max(((clientX - left) / width) * 100, 2), 98));
  }, []);

  // Non-passive touch listener so we can preventDefault and block page scroll while dragging
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      applyPosition(e.touches[0].clientX);
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [applyPosition]);

  return (
    <div
      ref={containerRef}
      className="relative h-64 md:h-80 select-none overflow-hidden rounded-2xl cursor-col-resize shadow-lg"
      onMouseMove={(e) => { if (dragging.current) applyPosition(e.clientX); }}
      onMouseDown={(e) => { dragging.current = true; applyPosition(e.clientX); }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onTouchStart={(e) => applyPosition(e.touches[0].clientX)}
    >
      {/* After image — base layer */}
      <img
        src={after}
        alt={`${title} — Después`}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Before image — clipped on the left */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={before}
          alt={`${title} — Antes`}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] pointer-events-none"
        style={{ left: `calc(${position}% - 1px)` }}
      />

      {/* Handle button */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center pointer-events-none z-10"
        style={{ left: `calc(${position}% - 20px)` }}
      >
        <ChevronLeft className="w-3 h-3 text-[#1e5631] -mr-px" />
        <ChevronRight className="w-3 h-3 text-[#1e5631] -ml-px" />
      </div>

      {/* Corner labels */}
      <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none uppercase tracking-wider">
        Antes
      </span>
      <span className="absolute top-3 right-3 bg-[#1e5631]/85 text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none uppercase tracking-wider">
        Después
      </span>

      {/* Hint (fades after first interaction) */}
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-[10px] bg-black/50 px-3 py-1 rounded-full pointer-events-none whitespace-nowrap">
        ← Arrastrá para comparar →
      </p>
    </div>
  );
}

export function BeforeAfterSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const project = PROJECTS[activeIndex];

  return (
    <section className="py-20 px-[5%] bg-white">
      <div className="max-w-[80rem] mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block bg-[#1e5631]/10 text-[#1e5631] text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
            Resultados reales
          </span>
          <h2 className="text-3xl md:text-4xl text-[#333] mb-4">
            Proyectos:{' '}
            <span className="text-[#1e5631]">Antes y Después</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Arrastrá el divisor para comparar el estado inicial con el resultado final de cada obra.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Left — Slider */}
          <div className="flex flex-col gap-6">
            <Slider before={project.before} after={project.after} title={project.title} />

            {/* Project selector */}
            <div className="flex flex-col gap-2">
              {PROJECTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 border ${
                    i === activeIndex
                      ? 'bg-[#f8f0ed] border-[#1e5631]'
                      : 'bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                      i === activeIndex ? 'bg-[#1e5631]' : 'bg-gray-300'
                    }`}
                  />
                  <span>
                    <span
                      className={`block text-sm font-semibold ${
                        i === activeIndex ? 'text-[#1e5631]' : 'text-gray-500'
                      }`}
                    >
                      {p.title}
                    </span>
                    <span className="block text-xs text-gray-400">{p.category}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right — Details */}
          <div className="flex flex-col justify-start pt-1">
            <span className="text-xs font-bold text-[#e85d04] uppercase tracking-widest mb-2">
              {project.category}
            </span>
            <h3 className="text-2xl font-bold text-[#333] mb-3 leading-snug">
              {project.title}
            </h3>
            <p className="text-gray-500 text-base leading-relaxed mb-8">
              {project.description}
            </p>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-3 mb-10">
              {project.metrics.map((m) => (
                <div
                  key={m.label}
                  className="bg-[#f8f0ed] rounded-xl p-4 text-center"
                >
                  <div className="flex items-center justify-center gap-1 text-xl font-bold text-[#1e5631]">
                    {m.positive && (
                      <TrendingUp className="w-4 h-4 text-[#e85d04]" />
                    )}
                    {m.value}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 leading-tight">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="border-t border-gray-100 pt-8">
              <p className="text-sm text-gray-500 mb-4">
                ¿Tenés un proyecto similar? Consultanos sin compromiso.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 bg-[#1e5631] hover:bg-[#17452a] text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
              >
                Solicitar presupuesto
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
