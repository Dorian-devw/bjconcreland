import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';

export function CartSidebar() {
  const { t } = useLanguage();
  const { items, isCartOpen, setCartOpen, updateQuantity, removeFromCart, getTotalPrice, clearCart } = useCartStore();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setCartOpen(false);
    navigate('/checkout');
  };

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop - por encima del header (z-[100]) */}
      <div
        className="fixed inset-0 bg-black/50 z-[110] transition-opacity"
        onClick={() => setCartOpen(false)}
        aria-hidden
      />

      {/* Panel del carrito */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-white z-[120] shadow-2xl flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="bg-[#f8f0ed] p-6 border-b border-[#c8a48c] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-[#946545]" />
            <h2 className="text-xl font-medium text-[#333]">{t('cart.title')}</h2>
            <span className="bg-[#946545] text-white text-xs px-2 py-1 rounded-full">
              {items.length}
            </span>
          </div>
          <button
            onClick={() => setCartOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#c8a48c]/30 transition-colors"
          >
            <X className="w-5 h-5 text-[#333]" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-16 h-16 text-[#c8a48c] mb-4" />
              <p className="text-[#333] text-lg mb-2">{t('cart.empty')}</p>
              <p className="text-gray-500 text-sm">{t('cart.add_items')}</p>
              <Button
                onClick={() => {
                  setCartOpen(false);
                  navigate('/catalogo');
                }}
                className="mt-6 btn-primary"
              >
                {t('cart.view_products')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-4 p-3 bg-white border border-[#c8a48c]/30 rounded-lg"
                >
                  {/* product image*/}
                  <div className="w-20 h-20 flex-shrink-0 bg-[#f8f0ed] rounded-md overflow-hidden">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* product details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-[#333] truncate">
                      {item.product.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.discountPercent != null && (
                        <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-[#e85d04] text-white">
                          {t('cart.offer')} -{item.discountPercent}%
                        </span>
                      )}
                      <p className="text-[#946545] font-semibold">
                        S/ {item.product.price.toFixed(2)}
                      </p>
                    </div>

                    {/* quantity items */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        className="w-7 h-7 flex items-center justify-center bg-[#f8f0ed] rounded hover:bg-[#c8a48c] transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        className="w-7 h-7 flex items-center justify-center bg-[#f8f0ed] rounded hover:bg-[#c8a48c] transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* remove button */}
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* footer */}
        {items.length > 0 && (
          <div className="border-t border-[#c8a48c] p-6 bg-[#f8f0ed]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#333] font-medium">{t('cart.subtotal')}</span>
              <span className="text-xl font-semibold text-[#946545]">
                S/ {getTotalPrice().toFixed(2)}
              </span>
            </div>
            <div className="space-y-2">
              <Button
                onClick={handleCheckout}
                className="w-full btn-primary"
              >
                {t('cart.checkout')}
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCartOpen(false)}
                  variant="outline"
                  className="flex-1 border-[#946545] text-[#946545] hover:bg-[#946545] hover:text-white"
                >
                  {t('cart.continue_shopping')}
                </Button>
                <Button
                  onClick={clearCart}
                  variant="outline"
                  className="border-red-400 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
