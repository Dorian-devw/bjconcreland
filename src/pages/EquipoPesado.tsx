const HERO_IMAGE = 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=2070';

export function EquipoPesado() {
  return (
    <main
      className="flex-1 flex items-center justify-center pt-[8.75rem] pb-12 px-4 relative min-h-screen z-0"
      style={{
        background: `linear-gradient(rgba(27, 77, 46, 0.85), rgba(27, 77, 46, 0.95)), url('${HERO_IMAGE}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-[#e85d04] opacity-10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-[#1e5631] opacity-20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl w-full text-center relative z-10">
        <span className="inline-block bg-[#e85d04] text-white font-bold text-xs uppercase tracking-[0.2em] px-4 py-1.5 rounded mb-6">
          ¡Próximamente!
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
          Equipo Pesado <br />
          <span className="text-[#e85d04]">Profesional</span>
        </h1>
        <p className="text-xl text-slate-200 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
          Estamos renovando nuestro catálogo con la maquinaria más potente del mercado. Excavadoras,
          retroexcavadoras y mezcladoras industriales listas para tu próximo proyecto.
        </p>
          <p className="text-8xl md:text-7xl font-bold text-white uppercase tracking-wide">¡Próximamente!</p>

      </div>
    </main>
  );
}
