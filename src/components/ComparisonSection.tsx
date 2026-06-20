import { useState } from 'react';
import { Check, X, Star, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Data ─────────────────────────────────────────────────────────────────────

type FeatureValue = boolean | string;

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  badge: string | null;
  highlight: boolean;
  accentColor: string;
  features: Record<string, FeatureValue>;
}

interface FeatureDef {
  key: string;
  label: string;
  tooltip?: string;
}

const PLANS: Plan[] = [
  {
    id: 'basico',
    name: 'Básico',
    price: 'Desde $50.000',
    period: 'por proyecto',
    description: 'Para trabajos puntuales y reparaciones menores sin complicaciones.',
    badge: null,
    highlight: false,
    accentColor: '#6b7280',
    features: {
      presupuesto: true,
      visita: false,
      materiales: false,
      garantia: '3 meses',
      seguimiento: false,
      prioridad: false,
      financiamiento: false,
      plazo: 'Estándar',
    },
  },
  {
    id: 'estandar',
    name: 'Estándar',
    price: 'Desde $120.000',
    period: 'por proyecto',
    description: 'Mayor cobertura, materiales incluidos y soporte extendido.',
    badge: 'Más elegido',
    highlight: true,
    accentColor: '#1e5631',
    features: {
      presupuesto: true,
      visita: true,
      materiales: true,
      garantia: '6 meses',
      seguimiento: false,
      prioridad: false,
      financiamiento: true,
      plazo: 'Reducido',
    },
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'Desde $280.000',
    period: 'por proyecto',
    description: 'Solución integral con todos los beneficios y atención prioritaria.',
    badge: null,
    highlight: false,
    accentColor: '#e85d04',
    features: {
      presupuesto: true,
      visita: true,
      materiales: true,
      garantia: '12 meses',
      seguimiento: true,
      prioridad: true,
      financiamiento: true,
      plazo: 'Prioritario',
    },
  },
];

const FEATURES: FeatureDef[] = [
  { key: 'presupuesto', label: 'Presupuesto sin costo', tooltip: 'Evaluamos tu proyecto sin cargo.' },
  { key: 'visita', label: 'Visita técnica inicial' },
  { key: 'materiales', label: 'Materiales incluidos' },
  { key: 'garantia', label: 'Garantía de trabajo' },
  { key: 'seguimiento', label: 'Seguimiento post-obra' },
  { key: 'prioridad', label: 'Atención prioritaria' },
  { key: 'financiamiento', label: 'Opciones de financiamiento' },
  { key: 'plazo', label: 'Plazo de ejecución' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FeatureCell({ value, highlight }: { value: FeatureValue; highlight: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check
        className="w-5 h-5 mx-auto"
        style={{ color: highlight ? '#1e5631' : '#1e5631' }}
        strokeWidth={2.5}
      />
    ) : (
      <X className="w-4 h-4 mx-auto text-gray-300" strokeWidth={2} />
    );
  }
  return (
    <span
      className="text-sm font-semibold"
      style={{ color: highlight ? '#1e5631' : '#374151' }}
    >
      {value}
    </span>
  );
}

// ─── Desktop table ─────────────────────────────────────────────────────────────

function DesktopTable() {
  return (
    <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
      {/* Plan headers */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr]">
        {/* empty top-left cell */}
        <div className="bg-[#f8f0ed] p-6 flex items-end">
          <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
            Características
          </span>
        </div>

        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className="relative p-6 flex flex-col items-center text-center border-l border-gray-100"
            style={{
              background: plan.highlight ? '#1e5631' : '#ffffff',
            }}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#e85d04] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 whitespace-nowrap shadow">
                <Star className="w-2.5 h-2.5 fill-white" /> {plan.badge}
              </span>
            )}
            <h3
              className="text-lg font-bold mb-1"
              style={{ color: plan.highlight ? '#ffffff' : '#1e5631' }}
            >
              {plan.name}
            </h3>
            <p
              className="text-2xl font-extrabold mb-0.5"
              style={{ color: plan.highlight ? '#ffffff' : '#111827' }}
            >
              {plan.price}
            </p>
            <p
              className="text-xs mb-3"
              style={{ color: plan.highlight ? '#a7f3d0' : '#9ca3af' }}
            >
              {plan.period}
            </p>
            <p
              className="text-xs leading-relaxed mb-5 min-h-[2.5rem]"
              style={{ color: plan.highlight ? '#d1fae5' : '#6b7280' }}
            >
              {plan.description}
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-lg transition-colors duration-200"
              style={
                plan.highlight
                  ? { background: '#ffffff', color: '#1e5631' }
                  : { background: '#1e5631', color: '#ffffff' }
              }
            >
              Consultar <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>

      {/* Feature rows */}
      {FEATURES.map((feat, rowIdx) => (
        <div
          key={feat.key}
          className="grid grid-cols-[2fr_1fr_1fr_1fr] border-t border-gray-100"
          style={{ background: rowIdx % 2 === 0 ? '#ffffff' : '#fafafa' }}
        >
          {/* Label */}
          <div className="px-6 py-4 flex items-center gap-2">
            <span className="text-sm text-gray-700">{feat.label}</span>
          </div>

          {/* Values */}
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="px-6 py-4 flex items-center justify-center border-l border-gray-100"
              style={
                plan.highlight
                  ? { background: rowIdx % 2 === 0 ? '#f0fdf4' : '#ecfdf5' }
                  : {}
              }
            >
              <FeatureCell value={plan.features[feat.key]} highlight={plan.highlight} />
            </div>
          ))}
        </div>
      ))}

      {/* Bottom CTA row */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-t border-gray-100 bg-[#f8f0ed]">
        <div className="px-6 py-5" />
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className="px-6 py-5 flex items-center justify-center border-l border-gray-100"
          >
            <Link
              to="/contact"
              className="text-xs font-semibold text-[#1e5631] hover:underline flex items-center gap-1"
            >
              Empezar con {plan.name} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mobile cards ──────────────────────────────────────────────────────────────

function MobileCards() {
  const [active, setActive] = useState(1); // default to Estándar
  const [expanded, setExpanded] = useState(false);
  const plan = PLANS[active];
  const visibleFeatures = expanded ? FEATURES : FEATURES.slice(0, 4);

  return (
    <div className="md:hidden flex flex-col gap-4">
      {/* Tab switcher */}
      <div className="flex rounded-xl bg-white border border-gray-100 overflow-hidden shadow-sm">
        {PLANS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setActive(i)}
            className="flex-1 py-3 text-sm font-semibold transition-colors duration-200 relative"
            style={
              i === active
                ? { background: '#1e5631', color: '#ffffff' }
                : { color: '#6b7280' }
            }
          >
            {p.badge && i === active && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#e85d04] rounded-full" />
            )}
            {p.name}
          </button>
        ))}
      </div>

      {/* Active plan card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Plan header */}
        <div
          className="p-6 text-center relative"
          style={{ background: plan.highlight ? '#1e5631' : '#f8f0ed' }}
        >
          {plan.badge && (
            <span className="inline-flex items-center gap-1 bg-[#e85d04] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
              <Star className="w-2.5 h-2.5 fill-white" /> {plan.badge}
            </span>
          )}
          <h3
            className="text-xl font-bold mb-1"
            style={{ color: plan.highlight ? '#ffffff' : '#1e5631' }}
          >
            {plan.name}
          </h3>
          <p
            className="text-3xl font-extrabold mb-0.5"
            style={{ color: plan.highlight ? '#ffffff' : '#111827' }}
          >
            {plan.price}
          </p>
          <p
            className="text-xs mb-3"
            style={{ color: plan.highlight ? '#a7f3d0' : '#9ca3af' }}
          >
            {plan.period}
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: plan.highlight ? '#d1fae5' : '#6b7280' }}
          >
            {plan.description}
          </p>
        </div>

        {/* Features */}
        <ul className="divide-y divide-gray-50">
          {visibleFeatures.map((feat) => {
            const val = plan.features[feat.key];
            return (
              <li key={feat.key} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-gray-700">{feat.label}</span>
                <span className="ml-4 flex-shrink-0">
                  <FeatureCell value={val} highlight={plan.highlight} />
                </span>
              </li>
            );
          })}
        </ul>

        {/* Expand toggle */}
        {FEATURES.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#1e5631] py-3 border-t border-gray-100 bg-gray-50"
          >
            {expanded ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> Ver más características</>
            )}
          </button>
        )}

        {/* CTA */}
        <div className="p-5 border-t border-gray-100">
          <Link
            to="/contact"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-colors duration-200"
            style={{ background: '#1e5631', color: '#ffffff' }}
          >
            Consultar plan {plan.name} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Other plans quick links */}
      <div className="flex gap-3">
        {PLANS.filter((_, i) => i !== active).map((p, i) => (
          <button
            key={p.id}
            onClick={() => setActive(PLANS.findIndex((pl) => pl.id === p.id))}
            className="flex-1 text-xs font-semibold text-[#1e5631] hover:underline py-2 bg-white rounded-lg border border-gray-100 shadow-sm"
          >
            Ver {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main section ──────────────────────────────────────────────────────────────

export function ComparisonSection() {
  return (
    <section className="py-20 px-[5%] bg-[#f8f0ed]">
      <div className="max-w-[80rem] mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block bg-[#1e5631]/10 text-[#1e5631] text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
            Elegí tu plan
          </span>
          <h2 className="text-3xl md:text-4xl text-[#333] mb-4">
            Compará nuestros{' '}
            <span className="text-[#1e5631]">planes de servicio</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Todos los planes incluyen presupuesto sin cargo. Elegí el que mejor se adapta a tu proyecto.
          </p>
        </div>

        {/* Desktop table / Mobile cards */}
        <DesktopTable />
        <MobileCards />

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Los precios son orientativos y varían según el alcance del proyecto. Contactanos para un presupuesto personalizado.{' '}
          <Link to="/contact" className="text-[#1e5631] underline underline-offset-2 hover:text-[#17452a]">
            Hablar con un asesor →
          </Link>
        </p>
      </div>
    </section>
  );
}
