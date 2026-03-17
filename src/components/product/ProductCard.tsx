import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Product, ProductTag } from '@/types';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';

export interface ProductOffer {
  validUntil: string | null;
  discountPercent: number;
}

function formatCountdown(validUntil: string): string {
  const end = new Date(validUntil);
  const now = new Date();
  if (end.getTime() <= now.getTime()) return 'Oferta terminada';
  const ms = end.getTime() - now.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `Termina en ${days} d ${hours} h`;
  if (hours > 0) return `Termina en ${hours} h`;
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `Termina en ${mins} min`;
}

function formatEndDate(validUntil: string): string {
  const d = new Date(validUntil);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TAG_STYLES: Record<ProductTag, string> = {
  'IN STOCK': 'bg-[#2d9d5f] text-white',
  SALE: 'bg-[#e85d04] text-white',
  TOOLS: 'bg-[#3b82c6] text-white',
  'BULK PRICING': 'bg-[#2d9d5f] text-white',
};

const TAG_LABELS_ES: Record<ProductTag, string> = {
  'IN STOCK': 'EN STOCK',
  SALE: 'OFERTA',
  TOOLS: 'HERRAMIENTAS',
  'BULK PRICING': 'PRECIO POR MAYOR',
};

interface ProductCardProps {
  product: Product;
  offer?: ProductOffer | null;
}

export function ProductCard({ product, offer }: ProductCardProps) {
  const { addToCart } = useCartStore();
  const { t } = useLanguage();
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
    <div className="card-product group h-full flex flex-col min-h-[380px]">
      {/* Product Image - enlace al detalle; si no hay stock se muestra imagen "Próximamente" */}
      <Link to={`/producto/${product.id}`} className="block flex-shrink-0">
        <div className="relative aspect-square w-full bg-[#f8f8f8] rounded-md overflow-hidden">
          {outOfStock ? (
            <img
              src="/out-of-stock.png"
              alt={t('product.coming_soon')}
              className="w-full h-full object-contain bg-[#f8f8f8] p-2"
            />
          ) : (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
          {!outOfStock && showSaleBadge && (
            <span className="absolute top-2 left-2 bg-[#e85d04] text-white text-xs font-bold uppercase px-2 py-1 rounded">
              OFERTA
            </span>
          )}
          {outOfStock && (
            <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold uppercase px-2 py-1 rounded">
              {t('product.out_of_stock')}
            </span>
          )}
        </div>
      </Link>

      {/* Product Info - título enlaza al detalle */}
      <div className="flex-1 flex flex-col pt-4 min-h-0">
        <Link to={`/producto/${product.id}`} className="hover:underline focus:outline-none">
          <h3 className="text-[#333] font-bold line-clamp-2 min-h-[2.75rem]">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0" />
          <span>{rating}</span>
        </div>
        <p className="text-gray-500 text-sm line-clamp-2 mt-1 min-h-[2.5rem]">
          {product.description}
        </p>
        <div className="flex items-center gap-2 pt-2 flex-shrink-0">
          {showOriginalPrice && originalPrice != null && (
            <span className="text-sm text-gray-400 line-through">
              ${originalPrice.toFixed(2)}
            </span>
          )}
          <span className="text-lg font-bold text-[#333]">
            ${displayPrice.toFixed(2)}
          </span>
          {hasOffer && offer && (
            <span className="text-xs font-semibold text-[#e85d04]">-{offer.discountPercent}%</span>
          )}
        </div>

        {(hasOffer && offer) && (
          <div className="text-xs text-[#666] pt-1 flex-shrink-0">
            {offer.validUntil ? (
              <>
                <span className="font-medium text-[#333]">{countdown ?? formatCountdown(offer.validUntil)}</span>
                <span className="ml-1">(válida hasta {formatEndDate(offer.validUntil)})</span>
              </>
            ) : (
              <span className="font-medium text-[#333]">Oferta activa</span>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 flex-shrink-0">
          {product.tag && (
            <span
              className={`text-xs font-bold uppercase px-2 py-1 rounded ${TAG_STYLES[product.tag]}`}
            >
              {TAG_LABELS_ES[product.tag]}
            </span>
          )}
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={showAddedMessage || outOfStock}
          className={`w-full mt-auto pt-3 transition-all flex-shrink-0 ${outOfStock
            ? 'bg-gray-400 cursor-not-allowed text-white font-bold uppercase text-sm'
            : showAddedMessage
              ? 'bg-[#2d9d5f] hover:bg-[#2d9d5f]'
              : 'bg-[#333] hover:bg-[#444] text-white font-bold uppercase text-sm'
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
  );
}
