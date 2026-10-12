import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Star, Scale } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Product, ProductTag } from '@/types';
import { useCartStore } from '@/store/cartStore';
import { useCompareStore } from '@/store/compareStore';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';

export interface ProductOffer {
  validUntil: string | null;
  discountPercent: number;
}

function formatCountdown(validUntil: string): string {
  const end = new Date(validUntil);
  const now = new Date();
  if (end.getTime() <= now.getTime()) return 'Offer ended';
  const ms = end.getTime() - now.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `Ends in ${days} d ${hours} h`;
  if (hours > 0) return `Ends in ${hours} h`;
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `Ends in ${mins} min`;
}


const TAG_LABELS_EN: Record<ProductTag, string> = {
  'IN STOCK': 'IN STOCK',
  SALE: 'SALE',
  TOOLS: 'TOOLS',
  'BULK PRICING': 'BULK PRICING',
};

interface ProductCardProps {
  product: Product;
  offer?: ProductOffer | null;
}

export function ProductCard({ product, offer }: ProductCardProps) {
  const { addToCart } = useCartStore();
  const { toggle, isSelected, isFull } = useCompareStore();
  const { t } = useLanguage();
  const selected = isSelected(product.id);
  const full = isFull() && !selected;
  const [showAddedMessage, setShowAddedMessage] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(offer?.validUntil ? formatCountdown(offer.validUntil) : null);

  useEffect(() => {
    if (!offer?.validUntil) return;
    const tick = () => setCountdown(formatCountdown(offer.validUntil!));
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, [offer?.validUntil]);

  const hasOffer = offer != null;
  const showSaleBadge = hasOffer || product.tag === 'SALE' || product.originalPrice != null;
  const rating = product.rating ?? 4.5;
  const outOfStock = product.stock <= 0;
  const basePrice = Number(product.price) || 0;
  const productOriginalPrice = product.originalPrice != null ? Number(product.originalPrice) : null;
  const alreadyDiscounted = productOriginalPrice != null && productOriginalPrice > 0 && hasOffer && basePrice < productOriginalPrice;
  const displayPrice =
    hasOffer && offer
      ? alreadyDiscounted
        ? basePrice
        : Math.round(basePrice * (1 - (Number(offer.discountPercent) || 0) / 100) * 100) / 100
      : basePrice;
  const showOriginalPrice = hasOffer && offer ? true : productOriginalPrice != null;
  const originalPrice =
    hasOffer && offer
      ? alreadyDiscounted
        ? productOriginalPrice ?? basePrice
        : basePrice
      : productOriginalPrice;

  const productToAdd = hasOffer && offer ? { ...product, price: displayPrice } : product;

  const handleAddToCart = () => {
    if (outOfStock) return;
    addToCart(
      productToAdd,
      hasOffer && offer ? { discountPercent: offer.discountPercent } : undefined
    );
    setShowAddedMessage(true);
    setTimeout(() => setShowAddedMessage(false), 2000);
  };

  return (
    <div className="group h-full flex flex-col bg-white border border-gray-100 hover:border-[#a8876c]/40 transition-all duration-300 hover:shadow-lg">
      {/* Product Image */}
      <Link to={`/product/${product.id}`} className="block flex-shrink-0 relative overflow-hidden bg-[#fdfbf9]">
        <div className="relative aspect-square w-full overflow-hidden">
          {outOfStock ? (
            <img
              src="/out-of-stock.png"
              alt={t('product.coming_soon')}
              className="w-full h-full object-contain p-4 opacity-70"
            />
          ) : (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          )}

          {/* Quick tag / badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {!outOfStock && showSaleBadge && (
              <span className="bg-[#a8876c] text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1">
                SALE
              </span>
            )}
            {outOfStock && (
              <span className="bg-[#3a2f2a] text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1">
                {t('product.out_of_stock')}
              </span>
            )}
            {product.tag && (
              <span className="bg-white/95 text-[#3a2f2a] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 border border-gray-200">
                {TAG_LABELS_EN[product.tag]}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Product Info */}
      <div className="flex-1 flex flex-col p-6 min-h-0 bg-white">
        <div className="flex items-center justify-between gap-2 mb-2">
          {product.category && (
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#a8876c]">
              {product.category}
            </span>
          )}
          <div className="flex items-center gap-1 text-gray-400 text-xs ml-auto">
            <Star className="w-3.5 h-3.5 fill-[#a8876c] text-[#a8876c]" />
            <span className="font-semibold text-gray-700">{rating}</span>
          </div>
        </div>

        <Link to={`/product/${product.id}`} className="group-hover:text-[#a8876c] transition-colors focus:outline-none">
          <h3 className="font-serif text-lg font-bold text-[#3a2f2a] line-clamp-2 leading-snug mb-2">
            {product.name}
          </h3>
        </Link>

        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-4 font-normal">
          {product.description}
        </p>

        {/* Pricing */}
        <div className="flex items-baseline gap-2.5 mt-auto pt-3 border-t border-gray-100">
          <span className="text-xl font-bold text-[#3a2f2a]">
            ${displayPrice.toFixed(2)}
          </span>
          {showOriginalPrice && originalPrice != null && (
            <span className="text-xs text-gray-400 line-through">
              ${originalPrice.toFixed(2)}
            </span>
          )}
          {hasOffer && offer && (
            <span className="text-[11px] font-bold text-white bg-[#a8876c] px-2 py-0.5 rounded-sm">
              -{offer.discountPercent}%
            </span>
          )}
        </div>

        {(hasOffer && offer) && (
          <div className="text-[11px] text-[#8f7158] pt-1.5">
            {offer.validUntil ? (
              <span>⏳ {countdown ?? formatCountdown(offer.validUntil)}</span>
            ) : (
              <span>Active special offer</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-4 pt-2">
          <button
            onClick={() => toggle(product)}
            disabled={full}
            title={full ? 'Max 4 products' : selected ? 'Remove from comparison' : 'Add to comparison'}
            className={`w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border ${
              selected
                ? 'bg-[#3a2f2a] border-[#3a2f2a] text-white'
                : full
                ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                : 'border-gray-200 text-gray-500 hover:border-[#a8876c] hover:text-[#a8876c] bg-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            {selected ? 'Comparing ✓' : full ? 'Max reached' : 'Compare'}
          </button>

          <Button
            onClick={handleAddToCart}
            disabled={showAddedMessage || outOfStock}
            className={`w-full py-5 rounded-none font-bold uppercase text-xs tracking-widest transition-all duration-300 ${
              outOfStock
                ? 'bg-gray-200 cursor-not-allowed text-gray-400'
                : showAddedMessage
                ? 'bg-[#2d9d5f] text-white'
                : 'bg-[#a8876c] hover:bg-[#3a2f2a] text-white'
            }`}
          >
            {outOfStock ? (
              <>{t('product.coming_soon')}</>
            ) : showAddedMessage ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                {t('product.added')}
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                {t('product.add_to_cart')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
