import { useState, useEffect } from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import type { Product } from '@/types';
import { API } from '@/lib/api';

interface OfferItem {
  id: number;
  productId: string;
  discountPercent: number;
  validUntil?: string;
  product: Product;
}

export function Ofertas() {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API}/offers`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setOffers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const offerProductsWithMeta = offers.map((offer) => {
    const offerPrice = Math.round(offer.product.price * (1 - offer.discountPercent / 100) * 100) / 100;
    const product: Product = {
      ...offer.product,
      price: offerPrice,
      originalPrice: offer.product.price,
      tag: 'SALE' as const,
    };
    return { product, offer: { validUntil: offer.validUntil ?? null, discountPercent: offer.discountPercent } };
  });

  return (
    <div className="min-h-screen bg-white pt-[8.75rem]">
      <div className="max-w-[80rem] mx-auto px-[5%] py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#333]">Ofertas</h1>
          <p className="text-gray-600 mt-2">
            Productos con descuento. Aprovecha las mejores promociones.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-[380px]" />
            ))}
          </div>
        ) : offerProductsWithMeta.length === 0 ? (
          <div className="text-center py-16 bg-[#f8f8f8] rounded-xl">
            <p className="text-gray-500 text-lg">No hay ofertas en este momento.</p>
            <p className="text-gray-400 text-sm mt-2">Vuelve pronto para ver descuentos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {offerProductsWithMeta.map(({ product, offer }) => (
              <div key={product.id} className="animate-on-scroll">
                <ProductCard product={product} offer={offer} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
