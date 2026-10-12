'use strict';
const initialProducts = [
  { id: '1', name: 'Hammer Drill 750W', price: 299, image: '/product-drill.jpg', category: 'Power Tools', description: 'Professional 750W hammer drill.', stock: 15, rating: 4.8, originalPrice: null, tag: 'TOOLS' },
  { id: '2', name: 'Portland Cement 42.5kg', price: 32.5, image: '/product-cement.jpg', category: 'Construction Materials', description: 'Type I Portland cement.', stock: 100, rating: 4.9, originalPrice: null, tag: 'IN STOCK' },
  { id: '3', name: 'Screwdriver Set 6pcs', price: 12.5, image: '/product-screwdrivers.jpg', category: 'Hand Tools', description: '6-piece screwdriver set.', stock: 30, rating: 4.7, originalPrice: 15, tag: 'SALE' },
  { id: '4', name: 'Latex Paint 4L White', price: 89.9, image: '/product-paint.jpg', category: 'Paints & Finishes', description: 'High-quality latex paint.', stock: 25, rating: 4.6, originalPrice: null, tag: 'BULK PRICING' },
  { id: '5', name: 'Adjustable Wrench 10"', price: 35, image: '/product-wrench.jpg', category: 'Hand Tools', description: '10-inch adjustable wrench.', stock: 20, rating: 4.8, originalPrice: null, tag: 'TOOLS' },
  { id: '6', name: 'PVC Hose 1/2" 25m', price: 55, image: '/product-hose.jpg', category: 'Plumbing', description: '25m reinforced PVC hose.', stock: 40, rating: 4.5, originalPrice: null, tag: 'IN STOCK' },
  { id: '7', name: 'Metal Toolbox', price: 120, image: '/product-toolbox.jpg', category: 'Hand Tools', description: 'Red metal toolbox organizer.', stock: 12, rating: 4.8, originalPrice: null, tag: 'TOOLS' },
  { id: '8', name: 'LED Bulb 9W Pack 4pk', price: 28, image: '/product-led.jpg', category: 'Electrical', description: '4-pack 9W LED bulbs.', stock: 50, rating: 4.6, originalPrice: null, tag: 'IN STOCK' },
  { id: '9', name: 'Angle Grinder 4 1/2"', price: 189, image: '/product-drill.jpg', category: 'Power Tools', description: '850W angle grinder.', stock: 8, rating: 4.9, originalPrice: null, tag: 'TOOLS' },
  { id: '10', name: 'Red Clay Construction Bricks', price: 2.8, image: '/product-cement.jpg', category: 'Construction Materials', description: 'High-strength red clay bricks.', stock: 500, rating: 4.7, originalPrice: null, tag: 'BULK PRICING' },
  { id: '11', name: 'Claw Hammer 16oz', price: 28.5, image: '/product-wrench.jpg', category: 'Hand Tools', description: '16oz claw hammer.', stock: 18, rating: 4.8, originalPrice: null, tag: 'IN STOCK' },
  { id: '12', name: 'Acrylic Sealant 300ml', price: 15.9, image: '/product-paint.jpg', category: 'Paints & Finishes', description: '300ml white acrylic sealant.', stock: 35, rating: 4.5, originalPrice: null, tag: 'IN STOCK' },
];

module.exports = { initialProducts };
