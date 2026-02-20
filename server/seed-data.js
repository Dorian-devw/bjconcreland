'use strict';
const initialProducts = [
  { id: '1', name: 'Taladro Percutor 750W', price: 299, image: '/product-drill.jpg', category: 'Herramientas Eléctricas', description: 'Taladro percutor profesional de 750W.', stock: 15, rating: 4.8, originalPrice: null, tag: 'TOOLS' },
  { id: '2', name: 'Cemento Portland 42.5kg', price: 32.5, image: '/product-cement.jpg', category: 'Materiales de Construcción', description: 'Cemento Portland tipo I.', stock: 100, rating: 4.9, originalPrice: null, tag: 'IN STOCK' },
  { id: '3', name: 'Set de Destornilladores 6pzs', price: 12.5, image: '/product-screwdrivers.jpg', category: 'Herramientas Manuales', description: 'Set 6 destornilladores.', stock: 30, rating: 4.7, originalPrice: 15, tag: 'SALE' },
  { id: '4', name: 'Pintura Látex 4L Blanco', price: 89.9, image: '/product-paint.jpg', category: 'Pinturas y Acabados', description: 'Pintura látex alta calidad.', stock: 25, rating: 4.6, originalPrice: null, tag: 'BULK PRICING' },
  { id: '5', name: 'Llave Ajustable 10"', price: 35, image: '/product-wrench.jpg', category: 'Herramientas Manuales', description: 'Llave ajustable 10 pulgadas.', stock: 20, rating: 4.8, originalPrice: null, tag: 'TOOLS' },
  { id: '6', name: 'Manguera PVC 1/2" 25m', price: 55, image: '/product-hose.jpg', category: 'Fontanería', description: 'Manguera PVC 25m.', stock: 40, rating: 4.5, originalPrice: null, tag: 'IN STOCK' },
  { id: '7', name: 'Caja de Herramientas Metálica', price: 120, image: '/product-toolbox.jpg', category: 'Herramientas Manuales', description: 'Caja metálica organizadores.', stock: 12, rating: 4.8, originalPrice: null, tag: 'TOOLS' },
  { id: '8', name: 'Foco LED 9W Pack 4un', price: 28, image: '/product-led.jpg', category: 'Electricidad', description: 'Pack 4 focos LED 9W.', stock: 50, rating: 4.6, originalPrice: null, tag: 'IN STOCK' },
  { id: '9', name: 'Amoladora Angular 4 1/2"', price: 189, image: '/product-drill.jpg', category: 'Herramientas Eléctricas', description: 'Amoladora 850W.', stock: 8, rating: 4.9, originalPrice: null, tag: 'TOOLS' },
  { id: '10', name: 'Ladrillo King Kong', price: 2.8, image: '/product-cement.jpg', category: 'Materiales de Construcción', description: 'Ladrillo arcilla roja.', stock: 500, rating: 4.7, originalPrice: null, tag: 'BULK PRICING' },
  { id: '11', name: 'Martillo de Uña 16oz', price: 28.5, image: '/product-wrench.jpg', category: 'Herramientas Manuales', description: 'Martillo 16 onzas.', stock: 18, rating: 4.8, originalPrice: null, tag: 'IN STOCK' },
  { id: '12', name: 'Sellador Acrílico 300ml', price: 15.9, image: '/product-paint.jpg', category: 'Pinturas y Acabados', description: 'Sellador acrílico 300ml.', stock: 35, rating: 4.5, originalPrice: null, tag: 'IN STOCK' },
];

module.exports = { initialProducts };
