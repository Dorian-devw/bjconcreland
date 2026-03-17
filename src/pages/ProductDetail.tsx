import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Star, Check, Minus, Plus } from 'lucide-react';
import type { Product, ProductTag } from '@/types';
import { useCartStore } from '@/store/cartStore';
import { useProductsStore } from '@/store/productsStore';
import { Button } from '@/components/ui/button';
import { API } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';



function formatCountdown(validUntil: string, t: (key: string) => string): string {
  const end = new Date(validUntil);
  const now = new Date();
  if (end.getTime() <= now.getTime()) return t('product.offer_ended');
  const ms = end.getTime() - now.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${t('product.ends_in')} ${days} ${t('product.days_short')} ${hours} ${t('product.hours_short')}`;
  if (hours > 0) return `${t('product.ends_in')} ${hours} ${t('product.hours_short')}`;
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${t('product.ends_in')} ${mins} ${t('product.minutes_short')}`;
}

function formatEndDate(validUntil: string, language: string): string {
  return new Date(validUntil).toLocaleDateString(language === 'es' ? 'es-PE' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TAG_STYLES: Record<ProductTag, string> = {
  'IN STOCK': 'bg-[#2d9d5f] text-white',
  SALE: 'bg-[#e85d04] text-white',
  TOOLS: 'bg-[#3b82c6] text-white',
  'BULK PRICING': 'bg-[#2d9d5f] text-white',
};

// TAG_LABELS_ES removed, will use t()


export function ProductDetail() {
  const { t, language } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, items } = useCartStore();
  const { products } = useProductsStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showAddedMessage, setShowAddedMessage] = useState(false);
  const [offer, setOffer] = useState<{ validUntil: string | null; discountPercent: number } | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('invalid_id');
      setProduct(null);
      return;
    }
    setLoading(true);
    setError(null);
    setProduct(null);
    const fromStore = products.find((p) => p.id === id);
    if (fromStore) {
      setProduct(fromStore);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`${API}/products/${id}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('not_found');
          throw new Error('server_error');
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setProduct(data);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : '';
          if (msg === 'not_found') setError('not_found');
          else if (msg.includes('fetch') || msg.includes('Network')) setError('network');
          else setError(msg || 'unknown_error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    fetch(`${API}/offers`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const o = data.find((x: { productId: string | number }) => String(x.productId) === String(product.id));
        if (o) setOffer({ validUntil: o.validUntil ?? null, discountPercent: o.discountPercent });
        else setOffer(null);
      })
      .catch(() => setOffer(null));
    return () => { cancelled = true; };
  }, [product?.id]);

  useEffect(() => {
    if (!offer?.validUntil) return;
    const tick = () => setCountdown(formatCountdown(offer.validUntil!, t));
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, [offer?.validUntil]);

  const isInCart = product ? items.some((item) => item.product.id === product.id) : false;
  const rating = product?.rating ?? 4.5;
  const maxQty = product ? Math.max(1, product.stock) : 1;
  const outOfStock = product ? product.stock <= 0 : false;

  const getQty = () => Math.min(Math.max(1, quantity), product?.stock ?? 1);

  const hasOffer = offer != null;
  const basePrice = Number(product?.price) ?? 0;
  const displayPrice = hasOffer && product
    ? Math.round(basePrice * (1 - (Number(offer.discountPercent) || 0) / 100) * 100) / 100
    : basePrice;
  const productToAdd = hasOffer && product
    ? { ...product, price: displayPrice }
    : product!;

  const handleAddToCart = () => {
    if (!product) return;
    const qty = getQty();
    const opts = hasOffer && offer ? { discountPercent: offer.discountPercent } : undefined;
    for (let i = 0; i < qty; i++) addToCart(productToAdd, opts);
    setShowAddedMessage(true);
    setTimeout(() => setShowAddedMessage(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    const qty = getQty();
    const opts = hasOffer && offer ? { discountPercent: offer.discountPercent } : undefined;
    for (let i = 0; i < qty; i++) addToCart(productToAdd, opts);
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] pt-[8.75rem] pb-12">
        <div className="max-w-[80rem] mx-auto px-[5%] py-12">
          <div className="animate-pulse bg-white rounded-xl p-8 flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/2 h-80 bg-gray-200 rounded-lg" />
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-20 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    const isNotFound = error === 'not_found';
    const isNetwork = error === 'network';
    const title = isNetwork
      ? t('product.connection_error_title')
      : t('product.not_found_title');
    const description = isNetwork
      ? t('product.connection_error_desc')
      : isNotFound
        ? t('product.not_found_desc')
        : t(error ?? 'product.unknown_error');
    return (
      <div className="min-h-screen bg-[#f8f8f8] pt-[8.75rem] pb-12 flex items-center justify-center">
        <div className="text-center px-4 max-w-md">
          <h1 className="text-xl font-bold text-[#333] mb-2">{title}</h1>
          <p className="text-gray-500 mb-6">{description}</p>
          <Link to="/catalogo">
            <Button className="bg-[#1e5631] hover:bg-[#164a28] text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('product.back_to_catalog')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] pt-[8.75rem] pb-12">
      <div className="max-w-[80rem] mx-auto px-[5%] py-8">
        <Link
          to="/catalogo"
          className="inline-flex items-center text-sm text-[#1e5631] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('product.back_to_catalog')}
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
          {/* Imagen - si no hay stock se muestra "Próximamente" */}
          <div className="w-full md:w-1/2 lg:w-2/5 flex-shrink-0 bg-[#f8f8f8] p-6 md:p-10">
            <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden bg-[#f8f8f8] flex items-center justify-center">
              {outOfStock ? (
                <img
                  src="/out-of-stock.png"
                  alt={t('product.add_more').replace('Añadir más', 'Próximamente')} // Hack or just use t('product.coming_soon')
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              )}
              {!outOfStock && hasOffer && (
                <span className="absolute top-3 left-3 bg-[#e85d04] text-white text-xs font-bold uppercase px-2 py-1 rounded">
                  {t('product.tag_sale')}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 p-6 md:p-10 flex flex-col">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {hasOffer && (
                <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-[#e85d04] text-white">
                  OFERTA -{offer!.discountPercent}%
                </span>
              )}
              {product.tag && (
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${TAG_STYLES[product.tag]}`}>
                  {product.tag === 'IN STOCK' ? t('product.tag_in_stock') :
                    product.tag === 'SALE' ? t('product.tag_sale') :
                      product.tag === 'TOOLS' ? t('product.tag_tools') :
                        product.tag === 'BULK PRICING' ? t('product.tag_bulk') : product.tag}
                </span>
              )}
              <span className="text-sm text-gray-500">{product.category}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#333] mb-3">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{rating}</span>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {product.description || t('product.no_description')}
            </p>

            <div className="flex flex-wrap items-baseline gap-2 mb-4">
              {(hasOffer || product.originalPrice != null) && (
                <span className="text-lg text-gray-400 line-through">
                  ${(hasOffer ? product.price : product.originalPrice!).toFixed(2)}
                </span>
              )}
              <span className="text-2xl font-bold text-[#333]">
                ${displayPrice.toFixed(2)}
              </span>
              {hasOffer && <span className="text-sm font-semibold text-[#e85d04]">-{offer!.discountPercent}%</span>}
            </div>
            {hasOffer && offer && (
              <div className="text-sm text-[#666] mb-4">
                {offer.validUntil ? (
                  <>
                    <span className="font-medium text-[#333]">{countdown ?? formatCountdown(offer.validUntil, t)}</span>
                    <span className="ml-1">({t('product.valid_until')} {formatEndDate(offer.validUntil, language)})</span>
                  </>
                ) : (
                  <span className="font-medium text-[#333]">{t('product.offer_active')}</span>
                )}
              </div>
            )}
            <p className="text-sm text-gray-500 mb-6">
              {outOfStock ? (
                <span className="inline-block px-3 py-1.5 bg-red-100 text-red-800 font-medium rounded">{t('product.out_of_stock_msg')}</span>
              ) : (
                <>{t('product.stock_available')} <span className="font-medium text-[#333]">{product.stock}</span> {t('product.units')}</>
              )}
            </p>

            {/* Cantidad */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-[#333]">{t('product.quantity')}</span>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="p-2 bg-[#f8f8f8] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[#333]"
                  aria-label="Reducir cantidad"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="min-w-[3rem] text-center font-medium py-2">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                  className="p-2 bg-[#f8f8f8] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-[#333]"
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-wrap gap-3 mt-auto">
              <Button
                onClick={handleAddToCart}
                disabled={showAddedMessage || product.stock < 1}
                className={`flex-1 min-w-[140px] ${outOfStock
                  ? 'bg-gray-400 cursor-not-allowed'
                  : showAddedMessage
                    ? 'bg-[#2d9d5f] hover:bg-[#2d9d5f]'
                    : 'bg-[#333] hover:bg-[#444]'
                  } text-white font-bold uppercase disabled:opacity-80`}
              >
                {outOfStock ? (
                  t('product.coming_soon') // Reuse coming soon or add distinct
                ) : showAddedMessage ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t('product.added_to_cart')}
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {isInCart ? t('product.add_more') : t('product.add_to_cart_btn')}
                  </>
                )}
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={product.stock < 1}
                className="flex-1 min-w-[140px] bg-[#1e5631] hover:bg-[#164a28] text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {outOfStock ? t('product.coming_soon') : t('product.buy_now')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
