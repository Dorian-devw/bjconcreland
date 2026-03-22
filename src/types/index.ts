export type ProductTag = 'IN STOCK' | 'SALE' | 'TOOLS' | 'BULK PRICING';

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  storeFilterKey?: string;
  subcategory?: string;
  description: string;
  stock: number;
  rating?: number;
  originalPrice?: number;
  tag?: ProductTag;
}

export interface CartItem {
  product: Product;
  quantity: number;
  /** Descuento aplicado (oferta) en %; si existe, el product.price ya es el precio con descuento */
  discountPercent?: number;
}

export interface Order {
  id: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    notes?: string;
  };
  items: CartItem[];
  total: number;
  paymentMethod: 'yape' | 'plin' | 'card' | 'transfer';
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface CarouselSlide {
  id: number;
  src: string;
  alt: string;
  title?: string;
  highlight?: string;
  description?: string;
  sortOrder: number;
}
