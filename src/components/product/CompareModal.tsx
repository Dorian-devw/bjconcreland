import { X, Star, Check, ShoppingCart, ExternalLink, Crown, TrendingDown, Package, Tag, FileText, GitCompareArrows } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCompareStore } from '@/store/compareStore';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';
import type { CatalogOffer } from '@/pages/Catalog';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  offersByProductId: Record<string, CatalogOffer>;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-100'}`}
        />
      ))}
      <span className="ml-1.5 text-xs font-semibold text-gray-500">{rating.toFixed(1)}</span>
    </div>
  );
}

const ROW_DEFS = [
  { key: 'price',       label: 'Precio',         Icon: TrendingDown },
  { key: 'category',    label: 'Category',     Icon: Tag },
  { key: 'rating',      label: 'Rating',       Icon: Star },
  { key: 'stock',       label: 'Availability', Icon: Package },
  { key: 'description', label: 'Description',  Icon: FileText },
] as const;

type RowKey = typeof ROW_DEFS[number]['key'];

function CellContent({
  rowKey, product, offer, isBestPrice, isBestRating,
}: {
  rowKey: RowKey;
  product: Product;
  offer: CatalogOffer | null;
  isBestPrice: boolean;
  isBestRating: boolean;
}) {
  const base = Number(product.price) || 0;
  const displayPrice = offer
    ? Math.round(base * (1 - (Number(offer.discountPercent) || 0) / 100) * 100) / 100
    : base;
  const inStock = product.stock > 0;
  const rating = product.rating ?? 4.5;

  switch (rowKey) {
    case 'price':
      return (
        <div className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${isBestPrice ? 'bg-green-50/80' : ''}`}>
          {offer && <span className="text-xs text-gray-400 line-through">${base.toFixed(2)}</span>}
          <span className={`text-2xl font-extrabold tracking-tight ${isBestPrice ? 'text-green-700' : 'text-[#111]'}`}>
            ${displayPrice.toFixed(2)}
          </span>
          {offer && (
            <span className="bg-[#e85d04] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{offer.discountPercent}% OFF
            </span>
          )}
          {isBestPrice && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600 mt-0.5">
              <TrendingDown className="w-3 h-3" /> Best price
            </span>
          )}
        </div>
      );

    case 'category':
      return (
        <div className="flex flex-col items-center gap-1.5">
          <span className="bg-[#1e5631]/10 text-[#1e5631] text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
            {product.category}
          </span>
          {product.subcategory && (
            <span className="text-[10px] text-gray-400">{product.subcategory}</span>
          )}
        </div>
      );

    case 'rating':
      return (
        <div className="flex flex-col items-center gap-1">
          <Stars rating={rating} />
          {isBestRating && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
              <Crown className="w-3 h-3" /> Best rated
            </span>
          )}
        </div>
      );

    case 'stock':
      return inStock ? (
        <span className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
          <Check className="w-3.5 h-3.5" /> In stock ({product.stock})
        </span>
      ) : (
        <span className="flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full">
          <X className="w-3.5 h-3.5" /> Out of stock
        </span>
      );

    case 'description':
      return (
        <p className="text-xs text-gray-500 leading-relaxed text-center line-clamp-3 max-w-[180px]">
          {product.description || '—'}
        </p>
      );

    default:
      return null;
  }
}

export function CompareModal({ isOpen, onClose, offersByProductId }: CompareModalProps) {
  const { items, remove } = useCompareStore();
  const { addToCart } = useCartStore();

  if (!isOpen || items.length < 2) return null;

  const n = items.length;

  const effectivePrices = items.map((p) => {
    const base = Number(p.price) || 0;
    const offer = offersByProductId[String(p.id)];
    return offer
      ? Math.round(base * (1 - (Number(offer.discountPercent) || 0) / 100) * 100) / 100
      : base;
  });
  const minPrice = Math.min(...effectivePrices);

  const ratings = items.map((p) => p.rating ?? 4.5);
  const maxRating = Math.max(...ratings);

  // Tailwind grid template can't use dynamic values — use inline style
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `160px repeat(${n}, minmax(0, 1fr))`,
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden />

      {/* Modal */}
      <div
        className="relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        style={{ maxWidth: `${Math.min(n * 220 + 180, 900)}px` }}
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#1e5631] to-[#27723f] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <GitCompareArrows className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-none">Compare Products</h2>
              <p className="text-white/60 text-xs mt-0.5">{n} selected · up to 4 products</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close comparison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable table ── */}
        <div className="overflow-y-auto flex-1 overflow-x-auto">
          <div style={{ minWidth: `${Math.min(n * 200 + 160, 900)}px` }}>

            {/* ── Product header cards ── */}
            <div style={gridStyle} className="border-b-2 border-[#1e5631]/10">
              {/* Label cell */}
              <div className="bg-[#f8f8f8] border-r border-gray-100 flex items-end p-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Features</span>
              </div>

              {/* Product header cells */}
              {items.map((product) => {
                const offer = offersByProductId[String(product.id)] ?? null;
                const base = Number(product.price) || 0;
                const displayPrice = offer
                  ? Math.round(base * (1 - (Number(offer.discountPercent) || 0) / 100) * 100) / 100
                  : base;

                return (
                  <div key={product.id} className="flex flex-col items-center p-5 border-r border-gray-100 last:border-r-0 relative group bg-white">
                    {/* Remove */}
                    <button
                      onClick={() => remove(product.id)}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 text-gray-300 hover:text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      aria-label={`Quitar ${product.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Image */}
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#f8f8f8] mb-3 ring-2 ring-gray-100 shrink-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = 'https://placehold.co/96x96/f8f8f8/999?text=?'; }}
                      />
                    </div>

                    {/* Name */}
                    <Link
                      to={`/product/${product.id}`}
                      onClick={onClose}
                      className="text-sm font-bold text-[#222] hover:text-[#1e5631] transition-colors text-center line-clamp-2 leading-snug min-h-[2.5rem]"
                    >
                      {product.name}
                    </Link>

                    {/* Price */}
                    <div className="mt-2 text-center">
                      {offer && (
                        <span className="text-xs text-gray-400 line-through block">${base.toFixed(2)}</span>
                      )}
                      <span className="text-lg font-extrabold text-[#1e5631]">${displayPrice.toFixed(2)}</span>
                      {offer && (
                        <span className="ml-1.5 text-[10px] bg-[#e85d04] text-white font-bold px-1.5 py-0.5 rounded">
                          -{offer.discountPercent}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Attribute rows ── */}
            {ROW_DEFS.map((row, rowIdx) => {
              const { Icon } = row;
              const isEven = rowIdx % 2 === 0;
              return (
                <div
                  key={row.key}
                  style={{ ...gridStyle, background: isEven ? '#ffffff' : '#fafafa' }}
                  className="border-b border-gray-50 last:border-b-0"
                >
                  {/* Label */}
                  <div className="flex items-center gap-2 px-4 py-5 border-r border-gray-100 bg-[#f8f8f8] sticky left-0 z-10">
                    <div className="w-6 h-6 rounded-lg bg-[#1e5631]/10 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-[#1e5631]" />
                    </div>
                    <span className="text-xs font-bold text-gray-600 leading-tight">{row.label}</span>
                  </div>

                  {/* Values per product */}
                  {items.map((product, colIdx) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-center py-5 px-3 border-r border-gray-100 last:border-r-0"
                    >
                      <CellContent
                        rowKey={row.key}
                        product={product}
                        offer={offersByProductId[String(product.id)] ?? null}
                        isBestPrice={effectivePrices[colIdx] === minPrice}
                        isBestRating={ratings[colIdx] === maxRating}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer CTA row ── */}
        <div className="shrink-0 border-t-2 border-[#1e5631]/10 bg-gray-50/70">
          <div style={gridStyle}>
            {/* Label */}
            <div className="flex items-center px-4 py-4 border-r border-gray-100 bg-[#f8f8f8]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</span>
            </div>

            {/* Action buttons per product */}
            {items.map((product) => {
              const inStock = product.stock > 0;
              return (
                <div key={product.id} className="flex flex-col gap-2 p-4 border-r border-gray-100 last:border-r-0">
                  <button
                    onClick={() => { if (!inStock) return; addToCart(product); onClose(); }}
                    disabled={!inStock}
                    className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      inStock
                        ? 'bg-[#333] hover:bg-[#444] text-white active:scale-95 shadow-sm hover:shadow'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {inStock ? 'Add to cart' : 'Out of stock'}
                  </button>
                  <Link
                    to={`/product/${product.id}`}
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-[#1e5631] hover:bg-[#1e5631]/5 transition-colors border border-[#1e5631]/20 hover:border-[#1e5631]/50"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View details
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
