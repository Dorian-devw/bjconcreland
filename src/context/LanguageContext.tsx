import React, { createContext, useContext, useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

type Language = 'es' | 'en';

type Translations = {
    [key: string]: {
        es: string;
        en: string;
    };
};

export const translations: Translations = {
    // General
    'loading': { es: 'Loading...', en: 'Loading...' },
    'error': { es: 'Error', en: 'Error' },
    'success': { es: 'Success', en: 'Success' },
    'save': { es: 'Save', en: 'Save' },
    'cancel': { es: 'Cancel', en: 'Cancel' },
    'delete': { es: 'Delete', en: 'Delete' },
    'edit': { es: 'Edit', en: 'Edit' },
    'add': { es: 'Add', en: 'Add' },
    'search': { es: 'Search', en: 'Search' },
    'actions': { es: 'Actions', en: 'Actions' },
    'confirm': { es: 'Confirm', en: 'Confirm' },

    // Navbar
    'nav.home': { es: 'Home', en: 'Home' },
    'nav.services': { es: 'Services', en: 'Services' },
    'nav.catalog': { es: 'Store', en: 'Store' },
    'nav.offers': { es: 'Offers', en: 'Offers' },
    'nav.heavy_equipment': { es: 'Heavy Equipment', en: 'Heavy Equipment' },
    'nav.contact': { es: 'Contact Us', en: 'Contact Us' },
    'nav.login': { es: 'Login', en: 'Login' },
    'nav.admin_panel': { es: 'Admin Panel', en: 'Admin Panel' },
    'nav.search_placeholder': { es: 'Search products...', en: 'Search products...' },
    'nav.search': { es: 'Search', en: 'Search' },
    'nav.shipping': { es: 'Shipping 3-5 days nationwide', en: 'Shipping 3-5 days nationwide' },
    'nav.cart_view': { es: 'View cart', en: 'View cart' },
    'nav.menu_open': { es: 'Open menu', en: 'Open menu' },
    'nav.menu_close': { es: 'Close menu', en: 'Close menu' },

    // Footer
    'footer.description': { es: 'Concrete and gardening supplies. Quality equipment and materials for your projects.', en: 'Concrete and gardening supplies. Quality equipment and materials for your projects.' },
    'footer.popular_categories': { es: 'Popular Categories', en: 'Popular Categories' },
    'footer.power_tools': { es: 'Power Tools', en: 'Power Tools' },
    'footer.manual_tools': { es: 'Hand Tools', en: 'Hand Tools' },
    'footer.construction_materials': { es: 'Construction Materials', en: 'Construction Materials' },
    'footer.paints_finishes': { es: 'Paints & Finishes', en: 'Paints & Finishes' },
    'footer.plumbing': { es: 'Plumbing', en: 'Plumbing' },
    'footer.electricity': { es: 'Electrical', en: 'Electrical' },
    'footer.contact_title': { es: 'Contact', en: 'Contact' },
    'footer.follow_us': { es: 'Follow Us', en: 'Follow Us' },
    'footer.mon_fri': { es: 'Mon - Fri', en: 'Mon - Fri' },
    'footer.sat': { es: 'Sat', en: 'Sat' },
    'footer.rights': { es: 'All rights reserved.', en: 'All rights reserved.' },

    // Admin Sidebar
    'admin.menu': { es: 'Main Menu', en: 'Main Menu' },
    'admin.dashboard': { es: 'Dashboard', en: 'Dashboard' },
    'admin.orders': { es: 'Orders', en: 'Orders' },
    'admin.products': { es: 'Products', en: 'Products' },
    'admin.categories': { es: 'Home Categories', en: 'Home Categories' },
    'admin.filterGroups': { es: 'Store Filters', en: 'Store Filters' },
    'admin.carousel': { es: 'Carousel', en: 'Carousel' },
    'admin.promoBanners': { es: 'Promo Banners', en: 'Promo Banners' },
    'admin.offers': { es: 'Offers', en: 'Offers' },
    'admin.actions': { es: 'Actions', en: 'Actions' },
    'admin.services': { es: 'Services / Blog', en: 'Services / Blog' },
    'admin.logout': { es: 'Logout', en: 'Logout' },
    'admin.language': { es: 'Language', en: 'Language' },
    'admin.switch_language': { es: 'Switch to English', en: 'Switch to English' },

    // Admin Dashboard
    'admin.welcome': { es: 'Welcome back, here is your summary for today.', en: 'Welcome back, here is your summary for today.' },
    'admin.last_30_days': { es: 'Last 30 days', en: 'Last 30 days' },
    'admin.total_orders': { es: 'Total Orders', en: 'Total Orders' },
    'admin.pending': { es: 'Pending', en: 'Pending' },
    'admin.shipped': { es: 'Shipped', en: 'Shipped' },
    'admin.total_sales': { es: 'Total Sales', en: 'Total Sales' },
    'admin.recent_orders': { es: 'Recent Orders', en: 'Recent Orders' },
    'admin.recent_orders_desc': { es: 'List of recent purchases made on the platform.', en: 'List of recent purchases made on the platform.' },
    'admin.view_all': { es: 'View all', en: 'View all' },
    'admin.no_recent_orders': { es: 'No recent orders.', en: 'No recent orders.' },
    'admin.client': { es: 'Client', en: 'Client' },
    'admin.product': { es: 'Product', en: 'Product' },
    'admin.date': { es: 'Date', en: 'Date' },
    'admin.amount': { es: 'Amount', en: 'Amount' },
    'admin.status': { es: 'Status', en: 'Status' },

    // Admin Orders
    'admin.orders_title': { es: 'Purchases / Who Bought', en: 'Purchases / Who Bought' },
    'admin.search_placeholder': { es: 'Search by customer or ID...', en: 'Search by customer or ID...' },
    'admin.all_status': { es: 'All statuses', en: 'All statuses' },
    'admin.status_pending': { es: 'Pending', en: 'Pending' },
    'admin.status_paid': { es: 'Paid', en: 'Paid' },
    'admin.status_shipped': { es: 'Shipped', en: 'Shipped' },
    'admin.status_delivered': { es: 'Delivered', en: 'Delivered' },
    'admin.status_cancelled': { es: 'Cancelled', en: 'Cancelled' },

    // Admin Products
    'admin.products_title': { es: 'Products', en: 'Products' },
    'admin.add_product': { es: 'Add Product', en: 'Add Product' },
    'admin.image': { es: 'Image', en: 'Image' },
    'admin.name': { es: 'Name', en: 'Name' },
    'admin.category': { es: 'Category', en: 'Category' },
    'admin.price': { es: 'Price', en: 'Price' },
    'admin.stock': { es: 'Stock', en: 'Stock' },
    'admin.tag': { es: 'Tag', en: 'Tag' },
    'admin.loading_orders': { es: 'Loading orders...', en: 'Loading orders...' },
    'admin.no_orders': { es: 'No orders', en: 'No orders' },
    'admin.loading_products': { es: 'Loading products...', en: 'Loading products...' },
    'admin.no_products': { es: 'No products. Add one with the button above.', en: 'No products. Add one with the button above.' },

    // Products
    'product.add_to_cart': { es: 'Add to cart', en: 'Add to cart' },
    'product.add_more': { es: 'Add more', en: 'Add more' },
    'product.added': { es: 'Added', en: 'Added' },
    'product.coming_soon': { es: 'Coming soon', en: 'Coming soon' },
    'product.out_of_stock': { es: 'Out of stock', en: 'Out of stock' },

    // Admin Services
    'admin.add_service': { es: 'Add Service', en: 'Add Service' },
    'admin.video_url': { es: 'Video URL', en: 'Video URL' },
    'admin.content': { es: 'Content', en: 'Content' },
    'admin.loading_services': { es: 'Loading services...', en: 'Loading services...' },
    'admin.no_services': { es: 'No services. Add one with the button above.', en: 'No services. Add one with the button above.' },
    'admin.delete_service_confirm': { es: 'Are you sure you want to delete this service?', en: 'Are you sure you want to delete this service?' },
    'admin.title': { es: 'Title', en: 'Title' },
    'admin.description': { es: 'Description', en: 'Description' },

    // Home
    'home.hero_title': { es: 'EVERYTHING YOU NEED FOR YOUR', en: 'EVERYTHING YOU NEED FOR YOUR' },
    'home.hero_highlight': { es: 'CONSTRUCTION', en: 'CONSTRUCTION' },
    'home.hero_desc': { es: 'Quality materials, professional tools, and the best prices to make your projects a reality.', en: 'Quality materials, professional tools, and the best prices to make your projects a reality.' },
    'home.view_products': { es: 'VIEW PRODUCTS', en: 'VIEW PRODUCTS' },
    'home.main_categories': { es: 'Main Categories', en: 'Main Categories' },
    'home.no_categories': { es: 'No categories yet. Add them from the admin panel.', en: 'No categories yet. Add them from the admin panel.' },
    'home.featured_products': { es: 'Featured Products', en: 'Featured Products' },
    'home.view_all': { es: 'View All', en: 'View All' },
    'home.retry': { es: 'Retry', en: 'Retry' },
    'home.no_featured': { es: 'No featured products at the moment.', en: 'No featured products at the moment.' },
    'home.view_catalog': { es: 'View catalog', en: 'View catalog' },

    // Catalog
    'catalog.hero_tag': { es: 'LIMITED OFFER', en: 'LIMITED OFFER' },
    'catalog.hero_title': { es: 'Heavy equipment offer', en: 'Heavy equipment offer' },
    'catalog.hero_desc': { es: 'Save up to 25% on cement mixers and professional paving tools this weekend only.', en: 'Save up to 25% on cement mixers and professional paving tools this weekend only.' },
    'catalog.hero_disclaimer': { es: '*Valid while stocks last', en: '*Valid while stocks last' },
    'catalog.view_equipment': { es: 'VIEW EQUIPMENT', en: 'VIEW EQUIPMENT' },
    'catalog.search_title': { es: 'SEARCH PRODUCTS', en: 'SEARCH PRODUCTS' },
    'catalog.search_placeholder': { es: 'Cement, shovels...', en: 'Cement, shovels...' },
    'catalog.categories_title': { es: 'FILTROS DE TIENDA', en: 'STORE FILTERS' },
    'catalog.price_range': { es: 'PRICE RANGE', en: 'PRICE RANGE' },
    'catalog.showing': { es: 'Showing', en: 'Showing' },
    'catalog.of': { es: 'of', en: 'of' },
    'catalog.products': { es: 'products', en: 'products' },
    'catalog.sort_by': { es: 'SORT BY', en: 'SORT BY' },
    'catalog.sort_newest': { es: 'Newest', en: 'Newest' },
    'catalog.sort_price_asc': { es: 'Price: Low to High', en: 'Price: Low to High' },
    'catalog.sort_price_desc': { es: 'Price: High to Low', en: 'Price: High to Low' },
    'catalog.sort_name': { es: 'Name', en: 'Name' },
    'catalog.no_results_title': { es: 'No products found', en: 'No products found' },
    'catalog.no_results_desc': { es: 'Try adjusting your search or filters.', en: 'Try adjusting your search or filters.' },
    'catalog.clear_filters': { es: 'Clear filters', en: 'Clear filters' },

    // Services
    'services.title': { es: 'Our Specialized', en: 'Our Specialized' },
    'services.title_highlight': { es: 'Services', en: 'Services' },
    'services.description': { es: 'At JJ CONSTRUCTION we combine technical expertise, high-quality materials, and an unwavering commitment to safety to transform visions into enduring structural realities.', en: 'At JJ CONSTRUCTION we combine technical expertise, high-quality materials, and an unwavering commitment to safety to transform visions into enduring structural realities.' },
    'services.filter_all': { es: 'All', en: 'All' },
    'services.filter_residential': { es: 'Residential', en: 'Residential' },
    'services.filter_commercial': { es: 'Commercial', en: 'Commercial' },
    'services.filter_machinery': { es: 'Machinery', en: 'Machinery' },
    'services.featured_tag': { es: 'Featured', en: 'Featured' },
    'services.read_article': { es: 'Read full article', en: 'Read full article' },
    'services.view_details': { es: 'View details', en: 'View details' },

    // Contact
    'contact.title': { es: 'Contact Us', en: 'Contact Us' },
    'contact.description': { es: 'We are here to help you build your dreams. Get in touch with our team of experts.', en: 'We are here to help you build your dreams. Get in touch with our team of experts.' },
    'contact.phone': { es: 'Phone', en: 'Phone' },
    'contact.phone_placeholder': { es: 'Ex. +1 801 123 4567', en: 'Ex. +1 801 123 4567' },
    'contact.email': { es: 'Email', en: 'Email' },
    'contact.form_title': { es: 'Send us a message', en: 'Send us a message' },
    'contact.form_desc': { es: 'Our team will respond within 24 business hours.', en: 'Our team will respond within 24 business hours.' },
    'contact.name': { es: 'Full Name', en: 'Full Name' },
    'contact.name_placeholder': { es: 'Ex. John Doe', en: 'Ex. John Doe' },
    'contact.subject': { es: 'Subject', en: 'Subject' },
    'contact.message': { es: 'Message', en: 'Message' },
    'contact.message_placeholder': { es: 'Tell us how we can help you...', en: 'Tell us how we can help you...' },
    'contact.send': { es: 'Send Message', en: 'Send Message' },
    'contact.sending': { es: 'Sending...', en: 'Sending...' },
    'contact.success': { es: 'Message sent successfully! We will contact you soon.', en: 'Message sent successfully! We will contact you soon.' },
    'contact.error': { es: 'There was an error sending the message.', en: 'There was an error sending the message.' },
    'contact.select_subject': { es: 'Select a subject', en: 'Select a subject' },
    'contact.subject_general': { es: 'General inquiry', en: 'General inquiry' },
    'contact.subject_orders': { es: 'Orders', en: 'Orders' },
    'contact.subject_support': { es: 'Technical support', en: 'Technical support' },
    'contact.subject_other': { es: 'Other', en: 'Other' },

    // Login
    'login.title': { es: 'Admin Access', en: 'Admin Access' },
    'login.subtitle': { es: 'JJ construction', en: 'JJ construction' },
    'login.username': { es: 'Username', en: 'Username' },
    'login.password': { es: 'Password', en: 'Password' },
    'login.login_button': { es: 'Login', en: 'Login' },
    'login.logging_in': { es: 'Logging in...', en: 'Logging in...' },
    'login.default_cred': { es: 'Default: user', en: 'Default: user' },
    'login.password_lbl': { es: 'password', en: 'password' },
    'login.error': { es: 'Error logging in', en: 'Error logging in' },

    // Cart
    'cart.title': { es: 'YOUR CART', en: 'YOUR CART' },
    'cart.empty': { es: 'Your cart is empty', en: 'Your cart is empty' },
    'cart.add_items': { es: 'Add items to start shopping', en: 'Add items to start shopping' },
    'cart.view_products': { es: 'View Products', en: 'View Products' },
    'cart.offer': { es: 'Offer', en: 'Offer' },
    'cart.subtotal': { es: 'Subtotal:', en: 'Subtotal:' },
    'cart.checkout': { es: 'Checkout', en: 'Checkout' },
    'cart.continue_shopping': { es: 'Continue Shopping', en: 'Continue Shopping' },

    // Product Detail
    'product.back_to_catalog': { es: 'Back to catalog', en: 'Back to catalog' },
    'product.offer_ended': { es: 'Offer ended', en: 'Offer ended' },
    'product.ends_in': { es: 'Ends in', en: 'Ends in' },
    'product.days_short': { es: 'd', en: 'd' },
    'product.hours_short': { es: 'h', en: 'h' },
    'product.minutes_short': { es: 'min', en: 'min' },
    'product.invalid_id': { es: 'Invalid ID', en: 'Invalid ID' },
    'product.server_error': { es: 'Server error', en: 'Server error' },
    'product.connection_error_title': { es: 'Connection failed', en: 'Connection failed' },
    'product.connection_error_desc': { es: 'Server not responding. Ensure backend is running.', en: 'Server not responding. Ensure backend is running.' },
    'product.not_found_title': { es: 'Product not found', en: 'Product not found' },
    'product.not_found_desc': { es: 'Product does not exist or was deleted.', en: 'Product does not exist or was deleted.' },
    'product.unknown_error': { es: 'Something went wrong.', en: 'Something went wrong.' },
    'product.no_description': { es: 'No description.', en: 'No description.' },
    'product.valid_until': { es: 'valid until', en: 'valid until' },
    'product.offer_active': { es: 'Offer active', en: 'Offer active' },
    'product.out_of_stock_msg': { es: 'Out of Stock - Coming Soon', en: 'Out of Stock - Coming Soon' },
    'product.stock_available': { es: 'Stock available:', en: 'Stock available:' },
    'product.units': { es: 'units', en: 'units' },
    'product.quantity': { es: 'Quantity:', en: 'Quantity:' },
    'product.added_to_cart': { es: 'Added to cart', en: 'Added to cart' },

    'product.add_to_cart_btn': { es: 'Add to Cart', en: 'Add to Cart' },
    'product.buy_now': { es: 'Buy Now', en: 'Buy Now' },
    'product.tag_in_stock': { es: 'IN STOCK', en: 'IN STOCK' },
    'product.tag_sale': { es: 'SALE', en: 'SALE' },
    'product.tag_tools': { es: 'TOOLS', en: 'TOOLS' },
    'product.tag_bulk': { es: 'BULK PRICING', en: 'BULK PRICING' },

};

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const language: Language = 'en';
    const setLanguage = () => {};
    
    const { siteTexts, fetchSiteTexts } = useSettingsStore();

    useEffect(() => {
        fetchSiteTexts();
    }, [fetchSiteTexts]);

    const t = (key: string) => {
        if (siteTexts && siteTexts[key]) {
            return siteTexts[key];
        }

        const translation = translations[key];
        if (!translation) return key;
        return translation['en'];
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
