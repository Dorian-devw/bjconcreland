import React, { createContext, useContext, useState, useEffect } from 'react';
import { API } from '@/lib/api';

type Language = 'es' | 'en';

type Translations = {
    [key: string]: {
        es: string;
        en: string;
    };
};

const translations: Translations = {
    // General
    'loading': { es: 'Cargando...', en: 'Loading...' },
    'error': { es: 'Error', en: 'Error' },
    'success': { es: 'Éxito', en: 'Success' },
    'save': { es: 'Guardar', en: 'Save' },
    'cancel': { es: 'Cancelar', en: 'Cancel' },
    'delete': { es: 'Eliminar', en: 'Delete' },
    'edit': { es: 'Editar', en: 'Edit' },
    'add': { es: 'Añadir', en: 'Add' },
    'search': { es: 'Buscar', en: 'Search' },
    'actions': { es: 'Acciones', en: 'Actions' },
    'confirm': { es: 'Confirmar', en: 'Confirm' },

    // Navbar
    'nav.home': { es: 'Inicio', en: 'Home' },
    'nav.services': { es: 'Servicios', en: 'Services' },
    'nav.catalog': { es: 'Tienda', en: 'Store' },
    'nav.offers': { es: 'Ofertas', en: 'Offers' },
    'nav.heavy_equipment': { es: 'Equipo Pesado', en: 'Heavy Equipment' },
    'nav.contact': { es: 'Contáctanos', en: 'Contact Us' },
    'nav.login': { es: 'Iniciar sesión', en: 'Login' },
    'nav.admin_panel': { es: 'Panel Admin', en: 'Admin Panel' },
    'nav.search_placeholder': { es: 'Buscar productos...', en: 'Search products...' },
    'nav.search': { es: 'Buscar', en: 'Search' },
    'nav.shipping': { es: 'Envío de 3 a 5 días a todo nivel nacional', en: 'Shipping 3-5 days nationwide' },
    'nav.cart_view': { es: 'Ver carrito', en: 'View cart' },
    'nav.menu_open': { es: 'Abrir menú', en: 'Open menu' },
    'nav.menu_close': { es: 'Cerrar menú', en: 'Close menu' },

    // Footer
    'footer.description': { es: 'Suministros de concreto y jardinería. Equipo y materiales de calidad para tus proyectos.', en: 'Concrete and gardening supplies. Quality equipment and materials for your projects.' },
    'footer.popular_categories': { es: 'Categorías Populares', en: 'Popular Categories' },
    'footer.power_tools': { es: 'Herramientas Eléctricas', en: 'Power Tools' },
    'footer.manual_tools': { es: 'Herramientas Manuales', en: 'Hand Tools' },
    'footer.construction_materials': { es: 'Materiales de Construcción', en: 'Construction Materials' },
    'footer.paints_finishes': { es: 'Pinturas y Acabados', en: 'Paints & Finishes' },
    'footer.plumbing': { es: 'Fontanería', en: 'Plumbing' },
    'footer.electricity': { es: 'Electricidad', en: 'Electrical' },
    'footer.contact_title': { es: 'Contacto', en: 'Contact' },
    'footer.follow_us': { es: 'Síguenos', en: 'Follow Us' },
    'footer.mon_fri': { es: 'Lun - Vie', en: 'Mon - Fri' },
    'footer.sat': { es: 'Sáb', en: 'Sat' },
    'footer.rights': { es: 'Todos los derechos reservados.', en: 'All rights reserved.' },

    // Admin Sidebar
    'admin.menu': { es: 'Menú principal', en: 'Main Menu' },
    'admin.dashboard': { es: 'Panel', en: 'Dashboard' },
    'admin.orders': { es: 'Compras / Pedidos', en: 'Orders' },
    'admin.products': { es: 'Productos', en: 'Products' },
    'admin.categories': { es: 'Categorías', en: 'Categories' },
    'admin.filterGroups': { es: 'Grupos de filtro', en: 'Filter Groups' },
    'admin.carousel': { es: 'Carrusel', en: 'Carousel' },
    'admin.promoBanners': { es: 'Banners promocionales', en: 'Promo Banners' },
    'admin.offers': { es: 'Ofertas', en: 'Offers' },
    'admin.actions': { es: 'Acciones', en: 'Actions' },
    'admin.services': { es: 'Servicios / Blog', en: 'Services / Blog' },
    'admin.logout': { es: 'Cerrar sesión', en: 'Logout' },
    'admin.language': { es: 'Idioma', en: 'Language' },
    'admin.switch_language': { es: 'Switch to English', en: 'Cambiar a Español' },

    // Admin Dashboard
    'admin.welcome': { es: 'Bienvenido de nuevo, aquí tienes el resumen de hoy.', en: 'Welcome back, here is your summary for today.' },
    'admin.last_30_days': { es: 'Últimos 30 días', en: 'Last 30 days' },
    'admin.total_orders': { es: 'Total Pedidos', en: 'Total Orders' },
    'admin.pending': { es: 'Pendientes', en: 'Pending' },
    'admin.shipped': { es: 'Enviados', en: 'Shipped' },
    'admin.total_sales': { es: 'Ventas Totales', en: 'Total Sales' },
    'admin.recent_orders': { es: 'Pedidos Recientes', en: 'Recent Orders' },
    'admin.recent_orders_desc': { es: 'Listado de las últimas compras realizadas en la plataforma.', en: 'List of recent purchases made on the platform.' },
    'admin.view_all': { es: 'Ver todos', en: 'View all' },
    'admin.no_recent_orders': { es: 'No hay pedidos recientes.', en: 'No recent orders.' },
    'admin.client': { es: 'Cliente', en: 'Client' },
    'admin.product': { es: 'Producto', en: 'Product' },
    'admin.date': { es: 'Fecha', en: 'Date' },
    'admin.amount': { es: 'Monto', en: 'Amount' },
    'admin.status': { es: 'Estado', en: 'Status' },

    // Admin Orders
    'admin.orders_title': { es: 'Compras / Quién compró', en: 'Purchases / Who Bought' },
    'admin.search_placeholder': { es: 'Buscar por cliente o ID...', en: 'Search by customer or ID...' },
    'admin.all_status': { es: 'Todos los estados', en: 'All statuses' },
    'admin.status_pending': { es: 'Pendiente', en: 'Pending' },
    'admin.status_paid': { es: 'Pagado', en: 'Paid' },
    'admin.status_shipped': { es: 'Enviado', en: 'Shipped' },
    'admin.status_delivered': { es: 'Entregado', en: 'Delivered' },
    'admin.status_cancelled': { es: 'Cancelado', en: 'Cancelled' },

    // Admin Products
    'admin.products_title': { es: 'Productos', en: 'Products' },
    'admin.add_product': { es: 'Añadir producto', en: 'Add Product' },
    'admin.image': { es: 'Imagen', en: 'Image' },
    'admin.name': { es: 'Nombre', en: 'Name' },
    'admin.category': { es: 'Categoría', en: 'Category' },
    'admin.price': { es: 'Precio', en: 'Price' },
    'admin.stock': { es: 'Stock', en: 'Stock' },
    'admin.tag': { es: 'Etiqueta', en: 'Tag' },
    'admin.loading_orders': { es: 'Cargando pedidos...', en: 'Loading orders...' },
    'admin.no_orders': { es: 'No hay pedidos', en: 'No orders' },
    'admin.loading_products': { es: 'Cargando productos...', en: 'Loading products...' },
    'admin.no_products': { es: 'No hay productos. Añade uno con el botón superior.', en: 'No products. Add one with the button above.' },

    // Products
    'product.add_to_cart': { es: 'Añadir al carrito', en: 'Add to cart' },
    'product.add_more': { es: 'Añadir más', en: 'Add more' },
    'product.added': { es: 'Añadido', en: 'Added' },
    'product.coming_soon': { es: 'Próximamente', en: 'Coming soon' },
    'product.out_of_stock': { es: 'Sin stock', en: 'Out of stock' },

    // Admin Services
    'admin.add_service': { es: 'Añadir servicio', en: 'Add Service' },
    'admin.video_url': { es: 'URL del video', en: 'Video URL' },
    'admin.content': { es: 'Contenido', en: 'Content' },
    'admin.loading_services': { es: 'Cargando servicios...', en: 'Loading services...' },
    'admin.no_services': { es: 'No hay servicios. Añade uno con el botón superior.', en: 'No services. Add one with the button above.' },
    'admin.delete_service_confirm': { es: '¿Estás seguro de eliminar este servicio?', en: 'Are you sure you want to delete this service?' },
    'admin.title': { es: 'Título', en: 'Title' },
    'admin.description': { es: 'Descripción', en: 'Description' },

    // Home
    'home.hero_title': { es: 'TODO LO QUE NECESITAS PARA TU', en: 'EVERYTHING YOU NEED FOR YOUR' },
    'home.hero_highlight': { es: 'CONSTRUCCIÓN', en: 'CONSTRUCTION' },
    'home.hero_desc': { es: 'Materiales de calidad, herramientas profesionales y los mejores precios para hacer realidad tus proyectos.', en: 'Quality materials, professional tools, and the best prices to make your projects a reality.' },
    'home.view_products': { es: 'VER PRODUCTOS', en: 'VIEW PRODUCTS' },
    'home.main_categories': { es: 'Categorías Principales', en: 'Main Categories' },
    'home.no_categories': { es: 'No hay categorías aún. Añádelas desde el panel de administración.', en: 'No categories yet. Add them from the admin panel.' },
    'home.featured_products': { es: 'Productos Destacados', en: 'Featured Products' },
    'home.view_all': { es: 'Ver Todo', en: 'View All' },
    'home.retry': { es: 'Reintentar', en: 'Retry' },
    'home.no_featured': { es: 'No hay productos destacados en este momento.', en: 'No featured products at the moment.' },
    'home.view_catalog': { es: 'Ver catálogo', en: 'View catalog' },

    // Catalog
    'catalog.hero_tag': { es: 'OFERTA LIMITADA', en: 'LIMITED OFFER' },
    'catalog.hero_title': { es: 'Oferta de equipo pesado', en: 'Heavy equipment offer' },
    'catalog.hero_desc': { es: 'Ahorra hasta 25% en mezcladoras de cemento y herramientas de pavimentación profesionales solo este fin de semana.', en: 'Save up to 25% on cement mixers and professional paving tools this weekend only.' },
    'catalog.hero_disclaimer': { es: '*Válido mientras haya stock', en: '*Valid while stocks last' },
    'catalog.view_equipment': { es: 'VER EQUIPO', en: 'VIEW EQUIPMENT' },
    'catalog.search_title': { es: 'BUSCAR PRODUCTOS', en: 'SEARCH PRODUCTS' },
    'catalog.search_placeholder': { es: 'Cemento, palas...', en: 'Cement, shovels...' },
    'catalog.categories_title': { es: 'CATEGORÍAS', en: 'CATEGORIES' },
    'catalog.price_range': { es: 'RANGO DE PRECIO', en: 'PRICE RANGE' },
    'catalog.showing': { es: 'Mostrando', en: 'Showing' },
    'catalog.of': { es: 'de', en: 'of' },
    'catalog.products': { es: 'productos', en: 'products' },
    'catalog.sort_by': { es: 'ORDENAR POR', en: 'SORT BY' },
    'catalog.sort_newest': { es: 'Más recientes', en: 'Newest' },
    'catalog.sort_price_asc': { es: 'Precio: menor a mayor', en: 'Price: Low to High' },
    'catalog.sort_price_desc': { es: 'Precio: mayor a menor', en: 'Price: High to Low' },
    'catalog.sort_name': { es: 'Nombre', en: 'Name' },
    'catalog.no_results_title': { es: 'No se encontraron productos', en: 'No products found' },
    'catalog.no_results_desc': { es: 'Prueba ajustando la búsqueda o los filtros.', en: 'Try adjusting your search or filters.' },
    'catalog.clear_filters': { es: 'Limpiar filtros', en: 'Clear filters' },

    // Services
    'services.title': { es: 'Nuestros Servicios', en: 'Our Specialized' },
    'services.title_highlight': { es: 'Especializados', en: 'Services' },
    'services.description': { es: 'En JJ CONSTRUCCIÓN combinamos experiencia técnica, materiales de alta calidad y un compromiso inquebrantable con la seguridad para transformar visiones en realidades estructurales duraderas.', en: 'At JJ CONSTRUCTION we combine technical expertise, high-quality materials, and an unwavering commitment to safety to transform visions into enduring structural realities.' },
    'services.filter_all': { es: 'Todos', en: 'All' },
    'services.filter_residential': { es: 'Residencial', en: 'Residential' },
    'services.filter_commercial': { es: 'Comercial', en: 'Commercial' },
    'services.filter_machinery': { es: 'Maquinaria', en: 'Machinery' },
    'services.featured_tag': { es: 'Destacado', en: 'Featured' },
    'services.read_article': { es: 'Leer artículo completo', en: 'Read full article' },
    'services.view_details': { es: 'Ver detalles', en: 'View details' },

    // Contact
    'contact.title': { es: 'Contáctanos', en: 'Contact Us' },
    'contact.description': { es: 'Estamos aquí para ayudarte a construir tus sueños. Ponte en contacto con nuestro equipo de expertos.', en: 'We are here to help you build your dreams. Get in touch with our team of experts.' },
    'contact.phone': { es: 'Teléfono', en: 'Phone' },
    'contact.phone_placeholder': { es: 'Ej. +1 801 123 4567', en: 'Ex. +1 801 123 4567' },
    'contact.email': { es: 'Correo electrónico', en: 'Email' },
    'contact.form_title': { es: 'Envíanos un mensaje', en: 'Send us a message' },
    'contact.form_desc': { es: 'Nuestro equipo responderá en menos de 24 horas hábiles.', en: 'Our team will respond within 24 business hours.' },
    'contact.name': { es: 'Nombre completo', en: 'Full Name' },
    'contact.name_placeholder': { es: 'Ej. Juan Pérez', en: 'Ex. John Doe' },
    'contact.subject': { es: 'Asunto', en: 'Subject' },
    'contact.message': { es: 'Mensaje', en: 'Message' },
    'contact.message_placeholder': { es: 'Cuéntanos en qué podemos ayudarte...', en: 'Tell us how we can help you...' },
    'contact.send': { es: 'Enviar mensaje', en: 'Send Message' },
    'contact.sending': { es: 'Enviando...', en: 'Sending...' },
    'contact.success': { es: '¡Mensaje enviado correctamente! Nos pondremos en contacto contigo pronto.', en: 'Message sent successfully! We will contact you soon.' },
    'contact.error': { es: 'Hubo un error al enviar el mensaje.', en: 'There was an error sending the message.' },
    'contact.select_subject': { es: 'Selecciona un motivo', en: 'Select a subject' },
    'contact.subject_general': { es: 'Consulta general', en: 'General inquiry' },
    'contact.subject_orders': { es: 'Pedidos', en: 'Orders' },
    'contact.subject_support': { es: 'Soporte técnico', en: 'Technical support' },
    'contact.subject_other': { es: 'Otro', en: 'Other' },

    // Login
    'login.title': { es: 'Acceso Admin', en: 'Admin Access' },
    'login.subtitle': { es: 'JJ construccion', en: 'JJ construction' },
    'login.username': { es: 'Usuario', en: 'Username' },
    'login.password': { es: 'Contraseña', en: 'Password' },
    'login.login_button': { es: 'Iniciar sesión', en: 'Login' },
    'login.logging_in': { es: 'Entrando...', en: 'Logging in...' },
    'login.default_cred': { es: 'Por defecto: usuario', en: 'Default: user' },
    'login.password_lbl': { es: 'contraseña', en: 'password' },
    'login.error': { es: 'Error al iniciar sesión', en: 'Error logging in' },

    // Cart
    'cart.title': { es: 'TU CARRITO', en: 'YOUR CART' },
    'cart.empty': { es: 'Tu carrito está vacío', en: 'Your cart is empty' },
    'cart.add_items': { es: 'Agrega productos para comenzar tu compra', en: 'Add items to start shopping' },
    'cart.view_products': { es: 'Ver Productos', en: 'View Products' },
    'cart.offer': { es: 'Oferta', en: 'Offer' },
    'cart.subtotal': { es: 'Subtotal:', en: 'Subtotal:' },
    'cart.checkout': { es: 'Continuar Compra', en: 'Checkout' },
    'cart.continue_shopping': { es: 'Seguir Comprando', en: 'Continue Shopping' },

    // Product Detail
    'product.back_to_catalog': { es: 'Volver al catálogo', en: 'Back to catalog' },
    'product.offer_ended': { es: 'Oferta terminada', en: 'Offer ended' },
    'product.ends_in': { es: 'Termina en', en: 'Ends in' },
    'product.days_short': { es: 'd', en: 'd' },
    'product.hours_short': { es: 'h', en: 'h' },
    'product.minutes_short': { es: 'min', en: 'min' },
    'product.invalid_id': { es: 'ID no válido', en: 'Invalid ID' },
    'product.server_error': { es: 'Error del servidor', en: 'Server error' },
    'product.connection_error_title': { es: 'No se pudo conectar', en: 'Connection failed' },
    'product.connection_error_desc': { es: 'El servidor no responde. Asegúrate de tener el backend en marcha.', en: 'Server not responding. Ensure backend is running.' },
    'product.not_found_title': { es: 'Producto no encontrado', en: 'Product not found' },
    'product.not_found_desc': { es: 'El producto no existe o fue eliminado.', en: 'Product does not exist or was deleted.' },
    'product.unknown_error': { es: 'Algo salió mal.', en: 'Something went wrong.' },
    'product.no_description': { es: 'Sin descripción.', en: 'No description.' },
    'product.valid_until': { es: 'válida hasta', en: 'valid until' },
    'product.offer_active': { es: 'Oferta activa', en: 'Offer active' },
    'product.out_of_stock_msg': { es: 'Agotado - Próximamente', en: 'Out of Stock - Coming Soon' },
    'product.stock_available': { es: 'Stock disponible:', en: 'Stock available:' },
    'product.units': { es: 'unidades', en: 'units' },
    'product.quantity': { es: 'Cantidad:', en: 'Quantity:' },
    'product.added_to_cart': { es: 'Añadido al carrito', en: 'Added to cart' },

    'product.add_to_cart_btn': { es: 'Añadir al carrito', en: 'Add to Cart' },
    'product.buy_now': { es: 'Comprar ahora', en: 'Buy Now' },
    'product.tag_in_stock': { es: 'EN STOCK', en: 'IN STOCK' },
    'product.tag_sale': { es: 'OFERTA', en: 'SALE' },
    'product.tag_tools': { es: 'HERRAMIENTAS', en: 'TOOLS' },
    'product.tag_bulk': { es: 'PRECIO POR MAYOR', en: 'BULK PRICING' },

};

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem('language');
        return (saved === 'en' || saved === 'es') ? saved : 'es';
    });

    useEffect(() => {
        let cancelled = false;
        const loadLanguage = async () => {
            try {
                const res = await fetch(`${API}/settings/language`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && (data.language === 'en' || data.language === 'es')) {
                    setLanguage(data.language);
                }
            } catch {
                // Ignore network errors and keep local language
            }
        };

        loadLanguage();
        const interval = setInterval(loadLanguage, 30000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    const t = (key: string) => {
        const translation = translations[key];
        if (!translation) return key;
        return translation[language];
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
