import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Truck,
  CreditCard,
  Minus,
  Plus,
  Lock,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Order } from '@/types';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { generateReceipt } from '../lib/generateReceipt';
import { API } from '@/lib/api';



const stripePromise = loadStripe('pk_live_51T0bFxPhC3slcfhEW8Fl2RHKk2C6jcvx6WC7HqTJZvEXmZ1VFB1foIIs9Z2BdejdygyW3ZaCI0kVh2KUbUpv9UHI00bmztLJpk');

function PaymentForm({
  formData,
  total,
  items,
  onSuccess,
  canSubmit,
  disabledReason
}: {
  formData: any,
  total: number,
  items: any[],
  onSuccess: (orderId: string) => void,
  canSubmit: boolean,
  disabledReason?: string
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;
    if (!canSubmit) {
      setMessage(disabledReason || 'Please complete the required information');
      return;
    }

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/checkout?status=success', // Note: we handle success manually below without redirect if possible, but confirmPayment usually redirects
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'Unknown error');
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Registrar la orden en backend
      const orderId = `ORD-${Date.now()}`;
      const orderPayload = {
        id: orderId,
        customer: {
          name: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          notes: formData.email ? `Email: ${formData.email}` : undefined,
        },
        items: [...items],
        total,
        paymentMethod: 'card',
        stripePaymentId: paymentIntent.id
      };

      try {
        const res = await fetch(`${API}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        });
        if (!res.ok) throw new Error('Error registering the order');
        onSuccess(orderId);
      } catch (err: any) {
        setMessage(err.message || 'Error saving the order');
        setIsLoading(false);
      }
    } else {
      setMessage('Payment could not be confirmed.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {disabledReason && canSubmit === false && (
        <div className="text-yellow-700 bg-yellow-50 border border-yellow-200 text-sm rounded-md px-3 py-2 mt-3">
          {disabledReason}
        </div>
      )}
      {message && <div className="text-red-500 text-sm mt-2">{message}</div>}
      <Button
        type="submit"
        disabled={isLoading || !stripe || !elements || !canSubmit}
        className="w-full bg-[#1e5631] hover:bg-[#164a28] text-white font-bold h-12 flex items-center justify-center gap-2 mt-4"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Pay ${total.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}

export function Checkout() {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart, addOrder, updateQuantity, removeFromCart } =
    useCartStore();
  const [clientSecret, setClientSecret] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const subtotal = getTotalPrice();
  const shipping: number = 0; // Forced free shipping per request
  const taxEstimated = 0;
  const total = subtotal + shipping;

  const isFormValid = useMemo(() => {
    const nameOk = formData.fullName.trim().length >= 3;
    const phoneOk = /^[0-9+()\s-]{7,}$/.test(formData.phone.trim());
    const addressOk = formData.address.trim().length >= 6;
    const emailOk = !formData.email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email.trim());
    return nameOk && phoneOk && addressOk && emailOk;
  }, [formData]);

  useEffect(() => {
    if (!isFormValid) {
      setFormError('Complete shipping information (name, phone, address).');
    } else {
      setFormError(null);
    }
  }, [isFormValid]);

  // Cargar PaymentIntent cuando hay items y el formulario es válido
  useEffect(() => {
    if (items.length > 0 && isFormValid) {
      // Reset clientSecret if items o datos de cliente cambian
      setClientSecret('');

      fetch(`${API}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, customer: { name: formData.fullName, email: formData.email } }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Error initiating payment');
          return res.json();
        })
        .then((data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            console.error('No clientSecret returned');
          }
        })
        .catch((err) => {
          console.error('Error fetching payment intent:', err);
          setFormError('Could not start payment gateway. Please try again.');
        });
    } else {
      setClientSecret('');
    }
  }, [items, isFormValid, formData.fullName, formData.email]);

  // Add state for storing the last successful order
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const handleSuccess = (orderId: string) => {
    // Add simplified order to store state for UI feedback if needed
    const newOrder: Order = {
      id: orderId,
      customer: { name: formData.fullName, phone: formData.phone, address: formData.address },
      items: [...items],
      total,
      paymentMethod: 'card',
      status: 'pending', // or 'paid' if card
      createdAt: new Date(),
    };
    addOrder(newOrder);
    setLastOrder(newOrder); // Store order for display

    // Generate and download receipt
    generateReceipt(newOrder);

    clearCart();
    setShowSuccess(true);
  };

  if (items.length === 0 && !showSuccess) {
    navigate('/catalog');
    return null;
  }

  if (showSuccess && lastOrder) {
    const subtotal = lastOrder.total / 1.08; // Backward calculation for demo
    const tax = lastOrder.total - subtotal;

    return (
      <div className="min-h-screen bg-[#f8f9fa] pt-[8.75rem] pb-12 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-white p-8 text-center border-b border-gray-100">
            <div className="w-20 h-20 bg-[#1e5631]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-12 h-12 bg-[#1e5631] rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-white" strokeWidth={3} />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-[#111] mb-2">Payment Successful</h2>
            <p className="text-gray-500 text-lg">
              Thank you for your purchase, {lastOrder.customer.name.split(' ')[0]}!
            </p>
          </div>

          <div className="p-8">
            {/* Transaction Info Grid */}
            <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-100">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">TRANSACTION ID</p>
                <p className="text-base font-semibold text-[#111]">#{lastOrder.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">DATE</p>
                <p className="text-base font-semibold text-[#111]">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Purchase Details */}
            <div className="mb-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">PURCHASE DETAILS</p>
              <div className="bg-[#f8f9fa] rounded-xl p-6 space-y-4">
                {lastOrder.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-white p-2 border border-gray-100 flex-shrink-0">
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#111] truncate">{item.product.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-[#111]">${(item.product.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & Billing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-100">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">PAYMENT METHOD</p>
                <div className="flex items-center gap-2 text-gray-600 font-medium">
                  <CreditCard className="w-4 h-4" />
                  <span>Card ending in ****</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">BILLED TO</p>
                <div className="flex items-center gap-2 text-gray-600 font-medium truncate">
                  {/* Simplified email display if stored in notes or similar, otherwise generic */}
                  <span>{formData.email || 'customer@email.com'}</span>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-3 mb-8">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-4">
                <span className="text-xl font-bold text-[#111]">Total Paid</span>
                <span className="text-2xl font-bold text-[#e85d04]">${lastOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => generateReceipt(lastOrder)}
                className="h-12 bg-[#e85d04] hover:bg-[#d05304] text-white font-bold text-base shadow-lg shadow-orange-500/20"
              >
                Download PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/')}
                className="h-12 bg-gray-100 hover:bg-gray-200 text-[#333] font-bold text-base"
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-[8.75rem] pb-12">
      <div className="max-w-[80rem] mx-auto px-[5%] py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Review Your Order + Delivery Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Envío destacado */}
            <div className="bg-[#1e5631] text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 font-semibold">
              <Truck className="w-5 h-5 shrink-0" />
              <span>Fill out the form to continue with the purchase</span>
            </div>
            {/* Review Your Order */}
            <section>
              <h2 className="text-xl font-bold text-[#333] mb-4 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-[#333]" />
                Review your order
              </h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="bg-[#f8f8f8] rounded-lg border border-gray-200 p-4 flex gap-4"
                  >
                    <div className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-white">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#333]">{item.product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {item.discountPercent != null && (
                          <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-[#e85d04] text-white">
                            Offer -{item.discountPercent}%
                          </span>
                        )}
                        <p className="text-sm text-gray-500">
                          SKU: {item.product.id} • {item.product.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.product.id,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                          className="w-8 h-8 rounded border border-gray-300 bg-white flex items-center justify-center text-[#333] hover:bg-gray-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-[#333]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1)
                          }
                          className="w-8 h-8 rounded border border-gray-300 bg-white flex items-center justify-center text-[#333] hover:bg-gray-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-600 text-sm font-medium mt-2 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-[#333]">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Delivery Information */}
            <section>
              <h2 className="text-xl font-bold text-[#333] mb-4 flex items-center gap-2">
                <Truck className="w-6 h-6 text-[#333]" />
                Shipping Information
              </h2>
              <div className="bg-[#f8f8f8] rounded-lg border border-gray-200 p-6 space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-[#333] font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    required
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="mt-1.5 bg-white border-gray-200"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-[#333] font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="mt-1.5 bg-white border-gray-200"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-[#333] font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="mt-1.5 bg-white border-gray-200"
                    placeholder="Ex: 999 123 456"
                  />
                </div>
                <div>
                  <Label htmlFor="address" className="text-[#333] font-medium">
                    Shipping Address
                  </Label>
                  <Input
                    id="address"
                    required
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="mt-1.5 bg-white border-gray-200"
                    placeholder="Street, number, district, reference"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right column: Order Summary + Payment (sticky panel) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 border border-gray-200 rounded-lg bg-[#fafafa] p-6">
              {/* Order Summary */}
              <h2 className="text-lg font-bold text-[#333] mb-4">Order Summary</h2>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="text-[#333]">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className="text-[#2d9d5f] font-medium">
                    {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 mb-6">
                <span className="font-bold text-[#333]">Total</span>
                <span className="text-xl font-bold text-[#1e5631]">
                  ${total.toFixed(2)}
                </span>
              </div>

              {/* Payment Method */}
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                Secure card payment
              </h3>
              <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-gray-200 bg-white">
                <div className="w-10 h-10 rounded-full bg-[#1e5631]/10 text-[#1e5631] flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-sm text-[#333]">
                  Powered by Stripe. We accept debit/credit cards.
                  <div className="text-xs text-gray-500">Your data is encrypted (TLS/SSL).</div>
                </div>
              </div>

              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' }, locale: 'en' }}>
                  <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm space-y-3">
                    <PaymentForm
                      formData={formData}
                      total={total}
                      items={items}
                      onSuccess={handleSuccess}
                      canSubmit={isFormValid}
                      disabledReason={formError || undefined}
                    />
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Protected payment. We do not store your card data.
                    </div>
                  </div>
                </Elements>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  {!isFormValid ? (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      </div>
                      <p className="text-sm font-medium text-amber-800">
                        Fill out the form to enable the payment method.
                      </p>
                    </div>
                  ) : (
                    "Loading payment gateway..."
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
                By clicking "Pay" or "Confirm", you agree to our Terms of Service. Secure encrypted payment.
              </p>
            </div>

            {/* Secure SSL footer */}
            <div className="flex items-center justify-center gap-2 mt-6 text-gray-500 text-sm">
              <Lock className="w-4 h-4" />
              <span>SECURE SSL CONNECTION</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
