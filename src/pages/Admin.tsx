import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  LayoutGrid,
  Layers,
  ShoppingBag,
  Package,
  Eye,
  CheckCircle,
  Truck,
  Home as HomeIcon,
  XCircle,
  Clock,
  Search,
  Plus,
  Pencil,
  Trash2,
  LogOut,
  ExternalLink,
  ImageIcon,
  ChevronUp,
  ChevronDown,
  Calendar,
  MoreVertical,
  CreditCard,
  Info,
  Percent,
  Upload,
  Filter,
  Settings,
  Loader,

  BookOpen,
  Download,
} from 'lucide-react';
import { generateReceipt } from '@/lib/generateReceipt';
import { useLanguage } from '@/context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { useProductsStore, type ProductFormData } from '@/store/productsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { fetchWithAuth, API } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Order, Product, ProductTag } from '@/types';
import { translations } from '@/context/LanguageContext';

type AdminSection = 'dashboard' | 'orders' | 'products' | 'categories' | 'filterGroups' | 'carousel' | 'promoBanners' | 'offers' | 'services' | 'settings';

export interface Offer {
  id: number;
  productId: string;
  discountPercent: number;
  validUntil?: string;
  product: Product;
}

function formatOrderDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return 'Less than 1 hour ago';
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return `Yesterday, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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

export interface PromoBanner {
  id: number;
  image: string;
  title: string;
  description: string;
  sortOrder: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  filterKey: string | null;
}

export interface FilterGroup {
  id: string;
  name: string;
  key: string;
  sortOrder: number;
}

export interface FilterItem {
  id: string;
  filterGroupKey: string;
  name: string;
  sortOrder: number;
}

export interface ServiceItem {
  id: number;
  title: string;
  category: string;
  description: string;
  image: string;
  video: string;
  content: string;
  created_at: string;
}

const PRODUCT_TAGS: ProductTag[] = ['IN STOCK', 'SALE', 'TOOLS', 'BULK PRICING'];

const emptyProductForm: ProductFormData = {
  name: '',
  price: 0,
  image: '',
  category: '',
  storeFilterKey: undefined,
  subcategory: undefined,
  description: '',
  stock: 0,
  rating: undefined,
  originalPrice: undefined,
  tag: undefined,
};

export function Admin() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { fetchProducts } = useProductsStore();
  const { t } = useLanguage();

  const [section, setSection] = useState<AdminSection>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>(emptyProductForm);
  const [productFormFilterGroupKey, setProductFormFilterGroupKey] = useState('');
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productDeleteInProgress, setProductDeleteInProgress] = useState(false);
  const [productDeleteError, setProductDeleteError] = useState<string | null>(null);

  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(false);
  const [slideDialogOpen, setSlideDialogOpen] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<number | null>(null);
  const [slideForm, setSlideForm] = useState({ image: '', alt: '', title: '', highlight: '', description: '' });
  const [slideSaving, setSlideSaving] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<CarouselSlide | null>(null);

  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
  const [promoBannersLoading, setPromoBannersLoading] = useState(false);
  const [promoBannerDialogOpen, setPromoBannerDialogOpen] = useState(false);
  const [editingPromoBannerId, setEditingPromoBannerId] = useState<number | null>(null);
  const [promoBannerForm, setPromoBannerForm] = useState({ image: '', title: '', description: '' });
  const [promoBannerSaving, setPromoBannerSaving] = useState(false);
  const [promoBannerError, setPromoBannerError] = useState<string | null>(null);
  const [promoBannerToDelete, setPromoBannerToDelete] = useState<PromoBanner | null>(null);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [offerForm, setOfferForm] = useState({ productId: '', discountPercent: 10, validUntil: '' });
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: 'Wrench', filterKey: '' });
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<AdminCategory | null>(null);

  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [filterGroupsLoading, setFilterGroupsLoading] = useState(false);
  const [filterGroupDialogOpen, setFilterGroupDialogOpen] = useState(false);
  const [editingFilterGroupId, setEditingFilterGroupId] = useState<string | null>(null);
  const [filterGroupForm, setFilterGroupForm] = useState({ name: '', key: '' });
  const [filterGroupSaving, setFilterGroupSaving] = useState(false);
  const [filterGroupToDelete, setFilterGroupToDelete] = useState<FilterGroup | null>(null);

  // Filter items state
  const [filterItemsByGroup, setFilterItemsByGroup] = useState<Record<string, FilterItem[]>>({});
  const [filterItemsLoading, setFilterItemsLoading] = useState<Record<string, boolean>>({});
  const [addingItemToGroup, setAddingItemToGroup] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemSaving, setNewItemSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState('');
  const [editingItemSaving, setEditingItemSaving] = useState(false);
  const [productFormFilterItems, setProductFormFilterItems] = useState<FilterItem[]>([]);
  const [productFormFilterItemsLoading, setProductFormFilterItemsLoading] = useState(false);

  // Upload state per entity
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [uploadProductImageError, setUploadProductImageError] = useState<string | null>(null);
  const [uploadingSlideImage, setUploadingSlideImage] = useState(false);
  const [uploadSlideImageError, setUploadSlideImageError] = useState<string | null>(null);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const [uploadBannerImageError, setUploadBannerImageError] = useState<string | null>(null);
  const [uploadingServiceImage, setUploadingServiceImage] = useState(false);
  const [uploadServiceImageError, setUploadServiceImageError] = useState<string | null>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadLogoError, setUploadLogoError] = useState<string | null>(null);
  const { 
    logo, logoWidth, setLogo, 
    footer, setFooter, fetchFooter,
    terms, setTerms, fetchTerms,
    privacyPolicy, setPrivacyPolicy, fetchPrivacyPolicy,
    servicesHeader, setServicesHeader, fetchServicesHeader,
    contactInfo, setContactInfo, fetchContactInfo,
    heavyEquipment, setHeavyEquipment, fetchHeavyEquipment,
    siteTexts, setSiteTexts, fetchSiteTexts,
    tabTitle, setTabTitle, fetchTabTitle
  } = useSettingsStore();

  const [siteTextsForm, setSiteTextsForm] = useState<Record<string, string>>(siteTexts || {});
  const [siteTextsSaving, setSiteTextsSaving] = useState(false);
  const [siteTextsError, setSiteTextsError] = useState<string | null>(null);

  const [tabTitleForm, setTabTitleForm] = useState(tabTitle || '');
  const [tabTitleSaving, setTabTitleSaving] = useState(false);
  const [tabTitleError, setTabTitleError] = useState<string | null>(null);

  const [termsForm, setTermsForm] = useState(terms || '');
  const [termsSaving, setTermsSaving] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const termsTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [privacyForm, setPrivacyForm] = useState(privacyPolicy || '');
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const privacyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [logoScale, setLogoScale] = useState<number>(logoWidth || 100);
  const [savingLogoScale, setSavingLogoScale] = useState(false);

  useEffect(() => {
    if (siteTexts === null) {
      fetchSiteTexts();
    } else {
      setSiteTextsForm(siteTexts);
    }
  }, [siteTexts, fetchSiteTexts]);

  useEffect(() => {
    if (tabTitle === null) {
      fetchTabTitle();
    } else {
      setTabTitleForm(tabTitle);
    }
  }, [tabTitle, fetchTabTitle]);

  useEffect(() => {
    if (logoWidth) {
      setLogoScale(logoWidth);
    }
  }, [logoWidth]);

  useEffect(() => {
    if (terms === null) {
      fetchTerms();
    } else {
      setTermsForm(terms);
    }
  }, [terms, fetchTerms]);

  useEffect(() => {
    if (privacyPolicy === null) {
      fetchPrivacyPolicy();
    } else {
      setPrivacyForm(privacyPolicy);
    }
  }, [privacyPolicy, fetchPrivacyPolicy]);

  const [servicesHeaderForm, setServicesHeaderForm] = useState({ title: '', highlight: '', description: '' });
  const [servicesHeaderSaving, setServicesHeaderSaving] = useState(false);
  const [servicesHeaderError, setServicesHeaderError] = useState<string | null>(null);

  useEffect(() => {
    if (servicesHeader === null) fetchServicesHeader();
    else setServicesHeaderForm({
      title: servicesHeader.title || '',
      highlight: servicesHeader.highlight || '',
      description: servicesHeader.description || ''
    });
  }, [servicesHeader, fetchServicesHeader]);

  const [contactInfoForm, setContactInfoForm] = useState({ title: '', description: '', phone: '', email: '' });
  const [contactInfoSaving, setContactInfoSaving] = useState(false);
  const [contactInfoError, setContactInfoError] = useState<string | null>(null);

  useEffect(() => {
    if (contactInfo === null) fetchContactInfo();
    else setContactInfoForm({
      title: contactInfo.title || '',
      description: contactInfo.description || '',
      phone: contactInfo.phone || '',
      email: contactInfo.email || ''
    });
  }, [contactInfo, fetchContactInfo]);

  const [heavyEqForm, setHeavyEqForm] = useState({ badge: '', title: '', highlight: '', description: '', bottomText: '' });
  const [heavyEqSaving, setHeavyEqSaving] = useState(false);
  const [heavyEqError, setHeavyEqError] = useState<string | null>(null);

  useEffect(() => {
    if (heavyEquipment === null) fetchHeavyEquipment();
    else setHeavyEqForm({
      badge: heavyEquipment.badge || '',
      title: heavyEquipment.title || '',
      highlight: heavyEquipment.highlight || '',
      description: heavyEquipment.description || '',
      bottomText: heavyEquipment.bottomText || ''
    });
  }, [heavyEquipment, fetchHeavyEquipment]);

  const [footerForm, setFooterForm] = useState({
    description: '',
    phone: '',
    email: '',
    scheduleWeekdays: '',
    scheduleWeekends: '',
    mapUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    popularCategories: ''
  });
  const [footerSaving, setFooterSaving] = useState(false);
  const [footerError, setFooterError] = useState<string | null>(null);

  useEffect(() => {
    if (footer === null) {
      fetchFooter();
    } else {
      setFooterForm({
        description: footer.description || '',
        phone: footer.phone || '',
        email: footer.email || '',
        scheduleWeekdays: footer.scheduleWeekdays || '',
        scheduleWeekends: footer.scheduleWeekends || '',
        mapUrl: footer.mapUrl || '',
        facebookUrl: footer.facebookUrl || '',
        instagramUrl: footer.instagramUrl || '',
        twitterUrl: footer.twitterUrl || '',
        popularCategories: footer.popularCategories || ''
      });
    }
  }, [footer, fetchFooter]);

  const handleSaveTabTitle = async () => {
    setTabTitleSaving(true);
    setTabTitleError(null);
    try {
      const res = await fetchWithAuth(`${API}/settings/tab_title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabTitle: tabTitleForm })
      });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error al guardar título de pestaña');
      setTabTitle(tabTitleForm);
      toast.success('Título de pestaña actualizado');
    } catch (e) {
      setTabTitleError(e instanceof Error ? e.message : 'Error al guardar título de pestaña');
    } finally {
      setTabTitleSaving(false);
    }
  };

  const handleSaveFooter = async () => {
    setFooterSaving(true);
    setFooterError(null);
    try {
      const res = await fetchWithAuth(`${API}/settings/footer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ footer: footerForm })
      });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error saving footer');
      setFooter(footerForm);
      toast.success('Footer updated correctly');
    } catch (e) {
      setFooterError(e instanceof Error ? e.message : 'Error changing footer');
    } finally {
      setFooterSaving(false);
    }
  };

  const handleSaveTerms = async () => {
    setTermsSaving(true);
    setTermsError(null);
    try {
      const res = await fetchWithAuth(`${API}/settings/terms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms: termsForm })
      });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error saving terms and conditions');
      setTerms(termsForm);
      toast.success('Terms and conditions updated');
    } catch (e) {
      setTermsError(e instanceof Error ? e.message : 'Error saving terms');
    } finally {
      setTermsSaving(false);
    }
  };

  const handleTermsBold = () => {
    const textarea = termsTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const before = termsForm.slice(0, start);
    const selected = termsForm.slice(start, end);
    const after = termsForm.slice(end);
    const nextValue = `${before}**${selected || 'texto'}**${after}`;
    setTermsForm(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      if (selected) {
        textarea.setSelectionRange(start + 2, end + 2);
      } else {
        textarea.setSelectionRange(start + 2, start + 2 + 'texto'.length);
      }
    });
  };

  const handleSavePrivacy = async () => {
    setPrivacySaving(true);
    setPrivacyError(null);
    try {
      const res = await fetchWithAuth(`${API}/settings/privacy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacyPolicy: privacyForm })
      });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error saving privacy policy');
      setPrivacyPolicy(privacyForm);
      toast.success('Privacy policy updated');
    } catch (e) {
      setPrivacyError(e instanceof Error ? e.message : 'Error saving privacy policy');
    } finally {
      setPrivacySaving(false);
    }
  };

  const handlePrivacyBold = () => {
    const textarea = privacyTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const before = privacyForm.slice(0, start);
    const selected = privacyForm.slice(start, end);
    const after = privacyForm.slice(end);
    const nextValue = `${before}**${selected || 'texto'}**${after}`;
    setPrivacyForm(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      if (selected) {
        textarea.setSelectionRange(start + 2, end + 2);
      } else {
        textarea.setSelectionRange(start + 2, start + 2 + 'texto'.length);
      }
    });
  };

  const handleSaveServicesHeader = async () => {
    setServicesHeaderSaving(true);
    setServicesHeaderError(null);
    try {
      const res = await fetchWithAuth(`${API}/settings/services_header`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servicesHeader: servicesHeaderForm })
      });
      if (res.status === 401) return logoutAndRedirect();
      if (!res.ok) throw new Error('Error saving services header');
      setServicesHeader(servicesHeaderForm);
      toast.success('Services header updated');
    } catch (e) {
      setServicesHeaderError(e instanceof Error ? e.message : 'Error saving');
    } finally {
      setServicesHeaderSaving(false);
    }
  };

  const handleSaveContactInfo = async () => {
    setContactInfoSaving(true);
    setContactInfoError(null);
    try {
      const res = await fetchWithAuth(`${API}/settings/contact_info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactInfo: contactInfoForm })
      });
      if (res.status === 401) return logoutAndRedirect();
      if (!res.ok) throw new Error('Error saving contact info');
      setContactInfo(contactInfoForm);
      toast.success('Contact info updated');
    } catch (e) {
      setContactInfoError(e instanceof Error ? e.message : 'Error saving');
    } finally {
      setContactInfoSaving(false);
    }
  };

  const handleSaveHeavyEq = async () => {
    setHeavyEqSaving(true);
    setHeavyEqError(null);
    try {
      const res = await fetchWithAuth(`${API}/settings/heavy_equipment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heavyEquipment: heavyEqForm })
      });
      if (res.status === 401) return logoutAndRedirect();
      if (!res.ok) throw new Error('Error saving heavy equipment info');
      setHeavyEquipment(heavyEqForm);
      toast.success('Heavy equipment info updated');
    } catch (e) {
      setHeavyEqError(e instanceof Error ? e.message : 'Error saving');
    } finally {
      setHeavyEqSaving(false);
    }
  };

  const logoutAndRedirect = () => {
    logout();
    navigate('/login');
  };

  const handleSaveSiteTexts = async () => {
    setSiteTextsSaving(true);
    setSiteTextsError(null);
    try {
      const res = await fetchWithAuth(`${API}/settings/texts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: siteTextsForm })
      });
      if (res.status === 401) return logoutAndRedirect();
      if (!res.ok) throw new Error('Error saving site texts');
      setSiteTexts(siteTextsForm);
      toast.success('Global texts updated');
    } catch (e) {
      setSiteTextsError(e instanceof Error ? e.message : 'Error saving texts');
    } finally {
      setSiteTextsSaving(false);
    }
  };

  const handleSaveLogo = async (newLogoUrl: string) => {
    try {
      setUploadLogoError(null);
      const res = await fetchWithAuth(`${API}/settings/logo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: newLogoUrl, width: logoScale })
      });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error saving logo');
      setLogo(newLogoUrl, logoScale);
      toast.success('Logo updated correctly');
    } catch (e) {
      setUploadLogoError(e instanceof Error ? e.message : 'Error saving logo');
    }
  };


  const handleUpdateLogoScale = async () => {
    if (!logo) return;
    try {
       setSavingLogoScale(true);
       const res = await fetchWithAuth(`${API}/settings/logo`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ logo: logo, width: logoScale })
       });
       if (res.status === 401) return logoutAndRedirect();
       if (!res.ok) throw new Error('Error saving logo scale');
       setLogo(logo, logoScale);
       toast.success('Logo scale updated correctly');
    } catch(e) {
       toast.error('Error saving scale');
    } finally {
       setSavingLogoScale(false);
    }
  };

  // Imagen al server via Multer ----
  const uploadImageToServer = async (
    file: File,
    type: 'products' | 'carousel' | 'banners' | 'services' | 'settings',
    setUploading: (v: boolean) => void,
    setError: (v: string | null) => void,
    onSuccess: (url: string) => void,
  ) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetchWithAuth(`${API}/upload/${type}`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Error uploading image (${res.status})`);
      }
      const data = await res.json();
      if (!data.url) throw new Error('The server did not return image URL');
      onSuccess(data.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [serviceForm, setServiceForm] = useState({ title: '', category: '', description: '', image: '', video: '', content: '' });
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetchWithAuth(`${API}/orders`);
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error loading orders');
      const data = await res.json();
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [logout, navigate]);

  const updateOrderStatusInApi = useCallback(
    async (orderId: string, status: Order['status']) => {
      // Confirmaciones para acciones sensibles
      if (status === 'delivered') {
        const ok = window.confirm('¿Marcar como entregado?');
        if (!ok) return;
      }
      if (status === 'cancelled') {
        const ok = window.confirm('Cancel this order?');
        if (!ok) return;
      }
      try {
        setStatusUpdatingId(orderId);
        // El backend expone PATCH /api/orders/:id/status
        const res = await fetchWithAuth(`${API}/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error('Error updating status');
        await loadOrders();
        toast.success('Estado actualizado');
      } catch {
        toast.error('No se pudo actualizar el estado');
        // fallback: recargar lista por si el backend sí actualizó
        await loadOrders();
      } finally {
        setStatusUpdatingId(null);
      }
    },
    [loadOrders, logout, navigate]
  );

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await fetch(`${API}/products`);
      if (!res.ok) throw new Error('Error loading products');
      const data = await res.json();
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (section === 'dashboard' || section === 'orders') loadOrders();
  }, [section, loadOrders]);

  useEffect(() => {
    if (section === 'products') loadProducts();
  }, [section, loadProducts]);

  const loadCarousel = useCallback(async () => {
    setCarouselLoading(true);
    try {
      const res = await fetch(`${API}/carousel`);
      if (!res.ok) throw new Error('Error loading carousel');
      const data = await res.json();
      setCarouselSlides(data);
    } catch {
      setCarouselSlides([]);
    } finally {
      setCarouselLoading(false);
    }
  }, []);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const res = await fetch(`${API}/services`);
      if (!res.ok) throw new Error('Error loading services');
      const data = await res.json();
      setServices(data);
    } catch {
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const openAddService = () => {
    setEditingServiceId(null);
    setServiceForm({ title: '', category: 'Residencial', description: '', image: '', video: '', content: '' });
    setServiceError(null);
    setServiceDialogOpen(true);
  };

  const openEditService = (service: ServiceItem) => {
    setEditingServiceId(service.id);
    setServiceForm({
      title: service.title,
      category: service.category,
      description: service.description,
      image: service.image,
      video: service.video || '',
      content: service.content || '',
    });
    setServiceError(null);
    setServiceDialogOpen(true);
  };

  const handleSaveService = async () => {
    if (!serviceForm.title.trim() || !serviceForm.description.trim() || !serviceForm.category) {
      setServiceError('Completa título, descripción y categoría.');
      return;
    }
    setServiceSaving(true);
    setServiceError(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      const body = JSON.stringify(serviceForm);
      if (editingServiceId) {
        const res = await fetchWithAuth(`${API}/services/${editingServiceId}`, {
          method: 'PUT',
          headers,
          body,
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Error updating');
        }
      } else {
        const res = await fetchWithAuth(`${API}/services`, {
          method: 'POST',
          headers,
          body,
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Error creating');
        }
      }
      setServiceDialogOpen(false);
      setServiceForm({ title: '', category: 'Residencial', description: '', image: '', video: '', content: '' });
      setEditingServiceId(null);
      await loadServices();
    } catch (e) {
      setServiceError(e instanceof Error ? e.message : 'Error saving');
    } finally {
      setServiceSaving(false);
    }
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;
    try {
      const res = await fetchWithAuth(`${API}/services/${serviceToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error deleting');
      setServiceToDelete(null);
      await loadServices();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (section === 'carousel') loadCarousel();
    if (section === 'services') loadServices();
  }, [section, loadCarousel, loadServices]);

  const loadPromoBanners = useCallback(async () => {
    setPromoBannersLoading(true);
    try {
      const res = await fetch(`${API}/promo-banners`);
      if (!res.ok) throw new Error('Error loading banners');
      const data = await res.json();
      setPromoBanners(data);
    } catch {
      setPromoBanners([]);
    } finally {
      setPromoBannersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'promoBanners') loadPromoBanners();
  }, [section, loadPromoBanners]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch(`${API}/categories`);
      if (!res.ok) throw new Error('Error loading categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const loadFilterGroups = useCallback(async () => {
    setFilterGroupsLoading(true);
    try {
      const res = await fetch(`${API}/filter-groups`);
      if (!res.ok) throw new Error('Error loading groups');
      const data = await res.json();
      const groups = Array.isArray(data) ? data : [];
      setFilterGroups(groups);
      if (section === 'filterGroups') {
        await loadFilterItemsForAllGroups(groups);
      }
    } catch {
      setFilterGroups([]);
    } finally {
      setFilterGroupsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);



  useEffect(() => {
    if (section === 'categories' || section === 'products') loadCategories();
  }, [section, loadCategories]);

  useEffect(() => {
    if (section === 'filterGroups' || section === 'categories' || section === 'products') loadFilterGroups();
  }, [section, loadFilterGroups]);

  // Load filter items for a specific group key (used in product form)
  const loadFilterItemsForGroup = async (groupKey: string) => {
    if (!groupKey) {
      setProductFormFilterItems([]);
      return;
    }
    setProductFormFilterItemsLoading(true);
    try {
      const res = await fetch(`${API}/filter-items?groupKey=${encodeURIComponent(groupKey)}`);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setProductFormFilterItems(Array.isArray(data) ? data : []);
    } catch {
      setProductFormFilterItems([]);
    } finally {
      setProductFormFilterItemsLoading(false);
    }
  };

  // Load filter items for all groups in Store Filters section
  const loadFilterItemsForAllGroups = async (groups: FilterGroup[]) => {
    for (const fg of groups) {
      setFilterItemsLoading((prev) => ({ ...prev, [fg.key]: true }));
      try {
        const res = await fetch(`${API}/filter-items?groupKey=${encodeURIComponent(fg.key)}`);
        if (!res.ok) throw new Error('Error');
        const data = await res.json();
        setFilterItemsByGroup((prev) => ({ ...prev, [fg.key]: Array.isArray(data) ? data : [] }));
      } catch {
        setFilterItemsByGroup((prev) => ({ ...prev, [fg.key]: [] }));
      } finally {
        setFilterItemsLoading((prev) => ({ ...prev, [fg.key]: false }));
      }
    }
  };

  const loadOffers = useCallback(async () => {
    setOffersLoading(true);
    try {
      const res = await fetchWithAuth(`${API}/offers/all`);
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error loading offers');
      const data = await res.json();
      setOffers(data);
    } catch {
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    if (section === 'offers') {
      loadOffers();
      loadProducts();
    }
  }, [section, loadOffers, loadProducts]);

  const filteredOrders = orders
    .filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesSearch =
        order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusBadge = (status: Order['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      paid: 'bg-blue-100 text-blue-800 border-blue-300',
      shipped: 'bg-purple-100 text-purple-800 border-purple-300',
      delivered: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
    };
    const labels = {
      pending: 'Pending',
      paid: 'Paid',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    const icons = {
      pending: Clock,
      paid: CheckCircle,
      shipped: Truck,
      delivered: HomeIcon,
      cancelled: XCircle,
    };
    const Icon = icons[status];
    return (
      <Badge variant="outline" className={`${styles[status]} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {labels[status]}
      </Badge>
    );
  };

  const getPaymentMethodLabel = (method: Order['paymentMethod']) => {
    const labels = { yape: 'Yape', plin: 'Plin', card: 'Card', transfer: 'Transfer' };
    const colors = {
      yape: 'bg-purple-100 text-purple-800 border-purple-200',
      plin: 'bg-blue-100 text-blue-800 border-blue-200',
      card: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      transfer: 'bg-gray-100 text-gray-800 border-gray-200',
    } as const;
    const Icon = method === 'card' ? CreditCard : method === 'transfer' ? Truck : Percent;
    return (
      <Badge variant="outline" className={`${colors[method]} inline-flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {labels[method]}
      </Badge>
    );
  };

  const now = Date.now();
  const ms30 = 30 * 24 * 60 * 60 * 1000;
  const last30Start = now - ms30;
  const prev30Start = now - 2 * ms30;
  const inLast30 = (o: Order) => new Date(o.createdAt).getTime() >= last30Start;
  const inPrev30 = (o: Order) => {
    const t = new Date(o.createdAt).getTime();
    return t >= prev30Start && t < last30Start;
  };

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    paid: orders.filter((o) => o.status === 'paid').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    totalRevenue: orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0),
  };

  const last30 = {
    total: orders.filter(inLast30).length,
    pending: orders.filter((o) => inLast30(o) && o.status === 'pending').length,
    shippedDelivered: orders.filter((o) => inLast30(o) && (o.status === 'shipped' || o.status === 'delivered')).length,
    revenue: orders
      .filter((o) => inLast30(o) && o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0),
  };
  const prev30 = {
    total: orders.filter(inPrev30).length,
    pending: orders.filter((o) => inPrev30(o) && o.status === 'pending').length,
    shippedDelivered: orders.filter((o) => inPrev30(o) && (o.status === 'shipped' || o.status === 'delivered')).length,
    revenue: orders
      .filter((o) => inPrev30(o) && o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0),
  };

  const pct = (curr: number, prev: number) => {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return Math.round(((curr - prev) / prev) * 100);
  };
  const pctTotal = pct(last30.total, prev30.total);
  const pctPending = pct(last30.pending, prev30.pending);
  const pctShipped = pct(last30.shippedDelivered, prev30.shippedDelivered);
  const pctRevenue = pct(last30.revenue, prev30.revenue);

  const fmtPct = (n: number) => (n === 0 ? '0%' : n > 0 ? `+${n}%` : `${n}%`);

  const openAddProduct = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm);
    setProductFormFilterGroupKey('');
    setProductFormFilterItems([]);
    setProductError(null);
    setProductDialogOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductError(null);
    const cat = categories.find(c => c.name === product.category);
    const filterKey = product.storeFilterKey || cat?.filterKey || '';
    setProductForm({
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      storeFilterKey: filterKey || undefined,
      subcategory: product.subcategory,
      description: product.description,
      stock: product.stock,
      rating: product.rating,
      originalPrice: product.originalPrice,
      tag: product.tag,
    });
    setProductFormFilterGroupKey(filterKey);
    if (filterKey) {
      loadFilterItemsForGroup(filterKey);
    } else {
      setProductFormFilterItems([]);
    }
    setProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim() || productForm.price < 0 || productForm.stock < 0) {
      setProductError('Completa nombre, precio y stock.');
      return;
    }
    if (!productForm.category.trim()) {
      setProductError('Selecciona una categoría.');
      return;
    }
    setProductError(null);
    setProductSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      const payload: ProductFormData = {
        ...productForm,
        storeFilterKey: productFormFilterGroupKey || undefined,
      };
      if (editingProductId) {
        const res = await fetchWithAuth(`${API}/products/${editingProductId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          if (text.includes('Cannot POST') || text.includes('Cannot PUT')) {
            throw new Error('El servidor no tiene la ruta. ¿Está corriendo el backend? (carpeta server → npm run start)');
          }
          let data: { error?: string } = {};
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(text || `Error ${res.status}`);
          }
          throw new Error((data as { error?: string }).error || 'Error updating');
        }
      } else {
        const res = await fetchWithAuth(`${API}/products`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          if (text.includes('Cannot POST') || text.includes('Cannot PUT')) {
            throw new Error('El servidor no tiene la ruta. ¿Está corriendo el backend? (carpeta server → npm run start)');
          }
          let data: { error?: string } = {};
          try {
            data = JSON.parse(text);
          } catch {
            if (res.status === 413) throw new Error('La imagen es demasiado grande. Prueba con una imagen más pequeña.');
            throw new Error(text || `Error ${res.status}`);
          }
          const msg = (data as { error?: string }).error;
          if (res.status === 400 && !msg) throw new Error('Faltan campos requeridos: nombre, precio, categoría y stock.');
          throw new Error(msg || 'Error creating product');
        }
      }
      setProductDialogOpen(false);
      setProductForm(emptyProductForm);
      setProductFormFilterGroupKey('');
      setEditingProductId(null);
      await loadProducts();
      fetchProducts();
    } catch (e) {
      setProductError(e instanceof Error ? e.message : 'Error saving');
    } finally {
      setProductSaving(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductDeleteError(null);
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!productToDelete) return;
    setProductDeleteInProgress(true);
    setProductDeleteError(null);
    try {
      const res = await fetchWithAuth(`${API}/products/${productToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        let msg = 'Error deleting';
        try {
          const json = JSON.parse(text);
          if (json?.error) msg = json.error;
        } catch {
          if (text) msg = text;
        }
        throw new Error(msg);
      }
      setProductToDelete(null);
      await loadProducts();
      fetchProducts();
    } catch (err) {
      console.error(err);
      setProductDeleteError(err instanceof Error ? err.message : 'Error deleting');
    } finally {
      setProductDeleteInProgress(false);
    }
  };

  const openAddSlide = () => {
    setEditingSlideId(null);
    setSlideForm({ image: '', alt: '', title: '', highlight: '', description: '' });
    setSlideDialogOpen(true);
  };

  const openEditSlide = (slide: CarouselSlide) => {
    setEditingSlideId(slide.id);
    setSlideForm({ image: slide.src, alt: slide.alt, title: slide.title || '', highlight: slide.highlight || '', description: slide.description || '' });
    setSlideDialogOpen(true);
  };

  const handleSaveSlide = async () => {
    if (!slideForm.image.trim()) return;
    setSlideSaving(true);
    try {
      const body = JSON.stringify({
        image: slideForm.image.trim(),
        alt: slideForm.alt.trim(),
        title: slideForm.title.trim(),
        highlight: slideForm.highlight.trim(),
        description: slideForm.description.trim()
      });
      if (editingSlideId != null) {
        const res = await fetchWithAuth(`${API}/carousel/${editingSlideId}`, {
          method: 'PUT',
          body,
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error('Error updating');
      } else {
        const res = await fetchWithAuth(`${API}/carousel`, {
          method: 'POST',
          body,
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error('Error creating');
      }
      setSlideDialogOpen(false);
      setSlideForm({ image: '', alt: '', title: '', highlight: '', description: '' });
      setEditingSlideId(null);
      await loadCarousel();
    } catch (e) {
      console.error(e);
    } finally {
      setSlideSaving(false);
    }
  };

  const moveSlide = async (index: number, direction: 'up' | 'down') => {
    const newOrder = [...carouselSlides];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    const orderIds = newOrder.map((s) => s.id);
    try {
      const res = await fetchWithAuth(`${API}/carousel/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ order: orderIds }),
      });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error reordering');
      const data = await res.json();
      setCarouselSlides(data);
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDeleteSlide = async () => {
    if (!slideToDelete) return;
    try {
      const res = await fetchWithAuth(`${API}/carousel/${slideToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error deleting');
      setSlideToDelete(null);
      await loadCarousel();
    } catch (e) {
      console.error(e);
    }
  };

  const openAddPromoBanner = () => {
    setEditingPromoBannerId(null);
    setPromoBannerForm({ image: '', title: '', description: '' });
    setPromoBannerError(null);
    setPromoBannerDialogOpen(true);
  };

  const openEditPromoBanner = (banner: PromoBanner) => {
    setEditingPromoBannerId(banner.id);
    setPromoBannerForm({ image: banner.image, title: banner.title, description: banner.description });
    setPromoBannerError(null);
    setPromoBannerDialogOpen(true);
  };

  const handleSavePromoBanner = async (e?: React.MouseEvent) => {
    e?.preventDefault?.();
    if (!promoBannerForm.image.trim()) return;
    setPromoBannerSaving(true);
    setPromoBannerError(null);
    try {
      if (editingPromoBannerId != null) {
        const res = await fetchWithAuth(`${API}/promo-banners/${editingPromoBannerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: promoBannerForm.image.trim(),
            title: promoBannerForm.title.trim(),
            description: promoBannerForm.description.trim(),
          }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          let msg = `Error updating (${res.status})`;
          try {
            const err = JSON.parse(text);
            if (err && typeof err.error === 'string') msg = err.error;
          } catch {
            if (text && text.length < 200) msg = text;
          }
          throw new Error(msg);
        }
      } else {
        const res = await fetchWithAuth(`${API}/promo-banners`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: promoBannerForm.image.trim(),
            title: promoBannerForm.title.trim(),
            description: promoBannerForm.description.trim(),
          }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          if (text.trimStart().startsWith('<!') || text.includes('Cannot POST') || text.includes('Cannot GET')) {
            throw new Error('El servidor no tiene la ruta de banners. Para el servidor (Ctrl+C) y vuelve a ejecutar en la carpeta server: npm start o node index.js');
          }
          let msg = `Error creating (${res.status})`;
          try {
            const err = JSON.parse(text);
            if (err && typeof err.error === 'string') msg = err.error;
          } catch {
            if (text && text.length < 200) msg = text;
          }
          if (typeof msg === 'string' && (msg.includes('no such table') || msg.includes('promo_banners'))) {
            throw new Error('La base de datos no tiene la tabla de banners. Reinicia el servidor (carpeta server).');
          }
          throw new Error(msg);
        }
      }
      setPromoBannerDialogOpen(false);
      setPromoBannerForm({ image: '', title: '', description: '' });
      setEditingPromoBannerId(null);
      await loadPromoBanners();
    } catch (err) {
      console.error(err);
      setPromoBannerError(err instanceof Error ? err.message : 'Error saving');
    } finally {
      setPromoBannerSaving(false);
    }
  };

  const movePromoBanner = async (index: number, direction: 'up' | 'down') => {
    const newOrder = [...promoBanners];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    const orderIds = newOrder.map((b) => b.id);
    try {
      const res = await fetchWithAuth(`${API}/promo-banners/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderIds }),
      });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error reordering');
      const data = await res.json();
      setPromoBanners(data);
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDeletePromoBanner = async () => {
    if (!promoBannerToDelete) return;
    try {
      const res = await fetchWithAuth(`${API}/promo-banners/${promoBannerToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error deleting');
      setPromoBannerToDelete(null);
      await loadPromoBanners();
    } catch (e) {
      console.error(e);
    }
  };

  const openAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({ name: '', icon: 'Wrench', filterKey: '' });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: AdminCategory) => {
    setEditingCategoryId(cat.id);
    setCategoryForm({ name: cat.name, icon: cat.icon || 'Wrench', filterKey: cat.filterKey || '' });
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    setCategorySaving(true);
    try {
      if (editingCategoryId != null) {
        const res = await fetchWithAuth(`${API}/categories/${editingCategoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryForm.name.trim(),
            icon: categoryForm.icon.trim() || 'Wrench',
            filterKey: categoryForm.filterKey.trim() || null,
          }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Error updating');
        }
      } else {
        const res = await fetchWithAuth(`${API}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryForm.name.trim(),
            icon: categoryForm.icon.trim() || 'Wrench',
            filterKey: categoryForm.filterKey.trim() || null,
          }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Error creating');
        }
      }
      setCategoryDialogOpen(false);
      setCategoryForm({ name: '', icon: 'Wrench', filterKey: '' });
      setEditingCategoryId(null);
      await loadCategories();
    } catch (e) {
      console.error(e);
    } finally {
      setCategorySaving(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      const res = await fetchWithAuth(`${API}/categories/${categoryToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error deleting');
      setCategoryToDelete(null);
      await loadCategories();
    } catch (e) {
      console.error(e);
    }
  };

  const openAddFilterGroup = () => {
    setEditingFilterGroupId(null);
    setFilterGroupForm({ name: '', key: '' });
    setFilterGroupDialogOpen(true);
  };

  const openEditFilterGroup = (fg: FilterGroup) => {
    setEditingFilterGroupId(fg.id);
    setFilterGroupForm({ name: fg.name, key: fg.key });
    setFilterGroupDialogOpen(true);
  };

  const handleSaveFilterGroup = async () => {
    if (!filterGroupForm.name.trim()) return;
    setFilterGroupSaving(true);
    try {
      const keyVal = filterGroupForm.key.trim()
        ? filterGroupForm.key.trim().toLowerCase().replace(/\s+/g, '-')
        : filterGroupForm.name.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32);
      if (editingFilterGroupId != null) {
        const res = await fetchWithAuth(`${API}/filter-groups/${editingFilterGroupId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: filterGroupForm.name.trim(), key: keyVal }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Error updating');
        }
      } else {
        const res = await fetchWithAuth(`${API}/filter-groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: filterGroupForm.name.trim(), key: keyVal }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Error creating');
        }
      }
      setFilterGroupDialogOpen(false);
      setFilterGroupForm({ name: '', key: '' });
      setEditingFilterGroupId(null);
      await loadFilterGroups();
    } catch (e) {
      console.error(e);
    } finally {
      setFilterGroupSaving(false);
    }
  };

  const confirmDeleteFilterGroup = async () => {
    if (!filterGroupToDelete) return;
    try {
      const res = await fetchWithAuth(`${API}/filter-groups/${filterGroupToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error deleting');
      setFilterGroupToDelete(null);
      await loadFilterGroups();
      await loadCategories();
    } catch (e) {
      console.error(e);
    }
  };

  const openAddOffer = async () => {
    setEditingOfferId(null);
    setOfferForm({ productId: '', discountPercent: 10, validUntil: '' });
    setOfferError(null);
    if (products.length === 0) await loadProducts();
    setOfferDialogOpen(true);
  };

  const openEditOffer = (offer: Offer) => {
    setEditingOfferId(offer.id);
    setOfferForm({
      productId: offer.productId,
      discountPercent: offer.discountPercent,
      validUntil: offer.validUntil || '',
    });
    setOfferError(null);
    setOfferDialogOpen(true);
  };

  const handleSaveOffer = async () => {
    if (!offerForm.productId.trim() || offerForm.discountPercent < 0 || offerForm.discountPercent > 100) return;
    setOfferSaving(true);
    setOfferError(null);
    try {
      if (editingOfferId != null) {
        const res = await fetchWithAuth(`${API}/offers/${editingOfferId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discountPercent: offerForm.discountPercent, validUntil: offerForm.validUntil.trim() || null }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Error updating');
        }
      } else {
        const res = await fetchWithAuth(`${API}/offers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: offerForm.productId.trim(),
            discountPercent: Number(offerForm.discountPercent),
            validUntil: offerForm.validUntil.trim() ? offerForm.validUntil.trim() : null,
          }),
        });
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          if (text.includes('Cannot POST') || text.includes('Cannot GET')) {
            throw new Error('La ruta /api/offers no existe en el servidor. Ejecuta el backend de este proyecto: en la carpeta "server" ejecuta "npm run start" (puerto 3001).');
          }
          let data: { error?: string } = {};
          try {
            data = JSON.parse(text);
          } catch {
            if (res.status >= 500 || res.status === 502) throw new Error('Servidor no disponible. ¿Está corriendo el backend? (carpeta server → npm run start)');
            throw new Error(text || `Error ${res.status}`);
          }
          throw new Error(typeof data.error === 'string' ? data.error : `Error ${res.status}`);
        }
      }
      setOfferDialogOpen(false);
      setOfferForm({ productId: '', discountPercent: 10, validUntil: '' });
      setEditingOfferId(null);
      setOfferError(null);
      await loadOffers();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error saving';
      setOfferError(message);
    } finally {
      setOfferSaving(false);
    }
  };

  const confirmDeleteOffer = async () => {
    if (!offerToDelete) return;
    try {
      const res = await fetchWithAuth(`${API}/offers/${offerToDelete.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Error deleting');
      setOfferToDelete(null);
      await loadOffers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] pt-[8.75rem]">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-[8.75rem] left-0 right-0 z-50 bg-[#1e5631] text-white flex items-center px-4 py-3 shadow-md">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors mr-3"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileSidebarOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
        <span className="font-semibold text-sm">Admin Panel</span>
      </div>

      <div className="flex">
        {/* Mobile overlay */}
        {mobileSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            style={{ top: 'calc(8.75rem + 2.75rem)' }}
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        {/* Sidebar - Main menu */}
        <aside
          className={`w-64 bg-[#1e5631] text-white fixed left-0 bottom-0 flex flex-col z-40 transition-transform duration-300
            ${ mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full' }
            lg:translate-x-0
          `}
          style={{ top: 'calc(8.75rem)' }}
        >
          <div className="flex flex-col flex-1 min-h-0 p-5 overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-4 px-3 shrink-0">MENU</p>
            <nav className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-1 pb-2">
              <button
                onClick={() => setSection('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${section === 'dashboard' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
              >
                <span className={`w-2 h-2 rounded-sm shrink-0 ${section === 'dashboard' ? 'bg-[#e85d04]' : 'bg-transparent'}`} />
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">{t('admin.dashboard')}</span>
              </button>
              <button
                onClick={() => setSection('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${section === 'orders' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <ShoppingBag className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">{t('admin.orders')}</span>
              </button>
              <button
                onClick={() => setSection('products')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${section === 'products' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <Package className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">{t('admin.products')}</span>
              </button>
              <button
                onClick={() => setSection('categories')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${section === 'categories' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <Layers className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">{t('admin.categories')}</span>
              </button>
              <button
                onClick={() => setSection('filterGroups')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${section === 'filterGroups' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <Filter className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">{t('admin.filterGroups')}</span>
              </button>
              <button
                onClick={() => setSection('carousel')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${section === 'carousel' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <ImageIcon className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">{t('admin.carousel')}</span>
              </button>
              <button
                onClick={() => setSection('promoBanners')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${section === 'promoBanners' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <LayoutGrid className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">{t('admin.promoBanners')}</span>
              </button>
              <button
                onClick={() => setSection('offers')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${section === 'offers' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <Percent className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">{t('admin.offers')}</span>
              </button>
              <button
                onClick={() => setSection('services')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${section === 'services' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <BookOpen className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">{t('admin.services')}</span>
              </button>
              <button
                onClick={() => setSection('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${section === 'settings' ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0 bg-transparent" />
                <Settings className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">Settings</span>
              </button>
            </nav>
            <div className="shrink-0 mt-4 pt-4 border-t border-white/20">

              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-white/90 text-left"
              >
                <span className="w-2 h-2 shrink-0 bg-transparent" aria-hidden />
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="min-w-0 flex-1">{t('admin.logout')}</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 lg:ml-64 p-4 pt-16 lg:pt-6">
          {/* ========== PANEL DE CONTROL ========== */}
          {section === 'dashboard' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-[#333]">{t('admin.dashboard')}</h1>
                  <p className="text-gray-500 text-sm mt-1">{t('admin.welcome')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="border-gray-200 text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    Last 30 days
                  </Button>
                  <Button
                    onClick={openAddProduct}
                    className="bg-[#e85d04] hover:bg-[#d35400] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('admin.add_product')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">{t('admin.total_orders')}</p>
                      <p className="text-2xl font-bold text-[#333]">{stats.total}</p>
                      <p className={`text-xs font-medium mt-2 ${pctTotal >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmtPct(pctTotal)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">{t('admin.pending')}</p>
                      <p className="text-2xl font-bold text-[#333]">{stats.pending}</p>
                      <p className={`text-xs font-medium mt-2 ${pctPending >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{fmtPct(pctPending)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">{t('admin.shipped')}</p>
                      <p className="text-2xl font-bold text-[#333]">{stats.shipped + stats.delivered}</p>
                      <p className={`text-xs font-medium mt-2 ${pctShipped >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtPct(pctShipped)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">{t('admin.total_sales')}</p>
                      <p className="text-2xl font-bold text-[#333]">
                        ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className={`text-xs font-medium mt-2 ${pctRevenue >= 0 ? 'text-purple-600' : 'text-red-600'}`}>{fmtPct(pctRevenue)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#333]">{t('admin.recent_orders')}</h2>
                    <p className="text-gray-500 text-sm mt-0.5">{t('admin.recent_orders_desc')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('orders')}
                    className="text-[#1e5631] font-medium hover:underline text-sm shrink-0"
                  >
                    {t('admin.view_all')}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#f8f8f8]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.client')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.product')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.date')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.amount')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.status')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                            {t('admin.no_recent_orders')}
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.slice(0, 5).map((order) => {
                          const productLabel = order.items.length > 0
                            ? order.items.length === 1
                              ? `${order.items[0].product.name} (${order.items[0].quantity} und)`
                              : `${order.items[0].product.name} +${order.items.length - 1} más`
                            : '—';
                          const statusLabel = order.status === 'pending' ? 'PENDING' : order.status === 'paid' ? 'IN PROCESS' : order.status === 'shipped' ? 'SHIPPED' : order.status === 'delivered' ? 'DELIVERED' : order.status === 'cancelled' ? 'CANCELLED' : order.status;
                          const statusClass = order.status === 'pending' ? 'bg-amber-100 text-amber-800' : order.status === 'paid' ? 'bg-blue-100 text-blue-800' : order.status === 'shipped' || order.status === 'delivered' ? 'bg-green-100 text-green-800' : order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
                          return (
                            <tr key={order.id} className="hover:bg-gray-50/50">
                              <td className="px-6 py-4 text-sm font-medium text-[#333]">{order.customer.name}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{productLabel}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{formatOrderDate(order.createdAt)}</td>
                              <td className="px-6 py-4 text-sm font-medium text-[#333]">${order.total.toFixed(2)}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex text-xs font-semibold px-2 py-1 rounded ${statusClass}`}>{statusLabel}</span>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrder(order)}
                                  className="p-1.5 text-gray-400 hover:text-[#333] rounded"
                                  aria-label="Ver detalle"
                                  title="Ver detalle"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => generateReceipt(order)}
                                  className="p-1.5 text-gray-400 hover:text-[#e85d04] rounded"
                                  aria-label="Descargar recibo"
                                  title="Descargar recibo"
                                >
                                  <Download className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#e85d04] text-white rounded-xl p-5 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="text-sm leading-relaxed">
                  <p>
                    Select <strong>Orders</strong> to see who bought and manage orders.
                    <strong> Products</strong> to add, edit or delete stock.
                    <strong> Carousel</strong> to manage the images for the main banner.
                  </p>
                </div>
              </div>
            </>
          )}


          {/* ========== PEDIDOS / QUIENES COMPRARON ========== */}
          {section === 'orders' && (
            <>
              <h1 className="text-2xl font-bold text-[#333] mb-6">{t('admin.orders_title')}</h1>
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-[#333]">Orders</h2>
                    <div className="flex gap-3">
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder={t('admin.search_placeholder')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-64 pr-10 bg-[#f8f8f8] border-gray-200"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) =>
                          setStatusFilter(e.target.value as Order['status'] | 'all')
                        }
                        className="px-4 py-2 bg-[#f8f8f8] rounded-lg border border-gray-200 text-sm"
                      >
                        <option value="all">{t('admin.all_status')}</option>
                        <option value="pending">{t('admin.status_pending')}</option>
                        <option value="paid">{t('admin.status_paid')}</option>
                        <option value="shipped">{t('admin.status_shipped')}</option>
                        <option value="delivered">{t('admin.status_delivered')}</option>
                        <option value="cancelled">{t('admin.status_cancelled')}</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#f8f8f8]">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.recent_orders').replace('Pedidos Recientes', 'Pedido')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.client')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.products_title')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Total
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Payment
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.status')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.date')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ordersLoading ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-6 py-12 text-center text-gray-500"
                          >
                            {t('admin.loading_orders')}
                          </td>
                        </tr>
                      ) : filteredOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-6 py-12 text-center text-gray-500"
                          >
                            {t('admin.no_orders')}
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-[#333]">
                              {order.id}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-medium text-[#333]">
                                  {order.customer.name}
                                </p>
                                <p className="text-xs text-gray-500">{order.customer.phone}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {order.items.length} item(s)
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-[#1e5631]">
                              ${order.total.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {getPaymentMethodLabel(order.paymentMethod)}
                            </td>
                            <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleDateString('es', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedOrder(order)}
                                  className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white"
                                  title="View order detail"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <select
                                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1e5631] bg-white"
                                  value={order.status}
                                  onChange={(e) => updateOrderStatusInApi(order.id, e.target.value as Order['status'])}
                                  disabled={statusUpdatingId === order.id}
                                  title="Update status"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="paid">Paid</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => generateReceipt(order)}
                                  className="text-gray-500 hover:text-[#e85d04]"
                                  title="Download receipt"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}


          {/* ========== SERVICIOS / BLOG ========== */}
          {section === 'services' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#333]">{t('admin.services')}</h1>
                  <p className="text-gray-500 text-sm mt-1">Manage articles and services</p>
                </div>
                <Button
                  onClick={openAddService}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('admin.add_service')}
                </Button>
              </div>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#f8f8f8]">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.image')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.title')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.category')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          Video
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {servicesLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            {t('admin.loading_services')}
                          </td>
                        </tr>
                      ) : services.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            {t('admin.no_services')}
                          </td>
                        </tr>
                      ) : (
                        services.map((service) => (
                          <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                {service.image ? (
                                  <img src={service.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-medium text-[#333]">{service.title}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {service.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {service.video ? <CheckCircle className="w-4 h-4 text-green-500" /> : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditService(service)}
                                  className="text-gray-500 hover:text-[#333]"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setServiceToDelete(service)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ========== PRODUCTOS (CRUD) ========== */}
          {section === 'products' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-[#333]">{t('admin.products_title')}</h1>
                <Button
                  onClick={openAddProduct}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('admin.add_product')}
                </Button>
              </div>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#f8f8f8]">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.image')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.name')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.category')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.price')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.stock')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.tag')}
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                          {t('admin.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {productsLoading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                            {t('admin.loading_products')}
                          </td>
                        </tr>
                      ) : products.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                            {t('admin.no_products')}
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-md"
                              />
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-[#333]">
                              {product.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {product.category}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-[#333]">
                              ${product.price.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {product.stock}
                            </td>
                            <td className="px-6 py-4">
                              {product.tag && (
                                <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-700">
                                  {product.tag}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2 items-center">
                                <Link
                                  to={`/product/${product.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-[#1e5631] hover:underline"
                                  title="Ver en tienda (misma vista que el cliente)"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Ver en tienda
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditProduct(product)}
                                  className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteProduct(product)}
                                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ========== HOME CATEGORIES ========== */}
          {section === 'categories' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#333]">Home Categories</h1>
                  <p className="text-gray-500 text-sm mt-1">Icon categories shown on the homepage grid</p>
                </div>
                <Button
                  onClick={openAddCategory}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New category
                </Button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
                <strong>ℹ️ Home Categories vs Store Filters:</strong> These are the icon-based category tiles displayed on the homepage (e.g. "Concrete tools", "Hand tools"). They are assigned to products and can optionally link to a <em>Store Filter</em> group (see &ldquo;Filter Groups&rdquo; in the sidebar) which controls the left sidebar checkboxes on the Store page.
              </div>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {categoriesLoading ? (
                  <div className="p-12 text-center text-gray-500">Loading categories...</div>
                ) : categories.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No categories yet. Add one with the button above.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {categories.map((cat) => (
                      <li key={cat.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#333]">{cat.name}</p>
                          <p className="text-xs text-gray-500">
                            Icon: {cat.icon} {cat.filterKey ? ` • Store filter: ${cat.filterKey}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditCategory(cat)}
                            className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCategoryToDelete(cat)}
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* ========== STORE FILTERS (sidebar tienda) ========== */}
          {section === 'filterGroups' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#333]">Store Filters</h1>
                  <p className="text-gray-500 text-sm mt-1">Sidebar checkbox filters on the Store page</p>
                </div>
                <Button
                  onClick={openAddFilterGroup}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New filter group
                </Button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
                <strong>ℹ️ Store Filters:</strong> These are the checkbox options shown in the left sidebar of the Store page. Each filter group can have multiple subcategory items (e.g., group "Concrete" → items: "Concrete brooms", "Concrete sprayers"). After creating a filter group here, go to <strong>Home Categories</strong> and assign each category to one of these groups so it appears in the Store sidebar. Products can then be assigned a subcategory from the product form.
              </div>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {filterGroupsLoading ? (
                  <div className="p-12 text-center text-gray-500">Loading filter groups...</div>
                ) : filterGroups.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No filter groups yet. Add one with the button above.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {filterGroups.map((fg) => (
                      <li key={fg.id} className="p-4 hover:bg-gray-50">
                        {/* Filter group header */}
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#333]">{fg.name}</p>
                            <p className="text-xs text-gray-500">Key: {fg.key}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditFilterGroup(fg)}
                              className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setFilterGroupToDelete(fg)}
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Filter items for this group */}
                        <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-100">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Subcategory items:</p>
                          {filterItemsLoading[fg.key] ? (
                            <p className="text-xs text-gray-400">Loading items...</p>
                          ) : (
                            <>
                              {(filterItemsByGroup[fg.key] || []).length === 0 && (
                                <p className="text-xs text-gray-400 italic mb-2">No items yet. Add one below.</p>
                              )}
                              <ul className="space-y-1 mb-2">
                                {(filterItemsByGroup[fg.key] || []).map((item) => (
                                  <li key={item.id} className="flex items-center gap-2">
                                    {editingItemId === item.id ? (
                                      <>
                                        <input
                                          type="text"
                                          value={editingItemName}
                                          onChange={(e) => setEditingItemName(e.target.value)}
                                          className="flex-1 h-7 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#1e5631]"
                                          onKeyDown={async (e) => {
                                            if (e.key === 'Enter') {
                                              if (!editingItemName.trim()) return;
                                              setEditingItemSaving(true);
                                              try {
                                                const res = await fetchWithAuth(`${API}/filter-items/${item.id}`, {
                                                  method: 'PUT',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ name: editingItemName.trim() }),
                                                });
                                                if (res.status === 401) { logout(); navigate('/login'); return; }
                                                if (!res.ok) throw new Error('Error');
                                                const updated = await res.json() as FilterItem;
                                                setFilterItemsByGroup((prev) => ({
                                                  ...prev,
                                                  [fg.key]: (prev[fg.key] || []).map(it => it.id === item.id ? updated : it)
                                                }));
                                                setEditingItemId(null);
                                              } catch { toast.error('Error saving item'); }
                                              finally { setEditingItemSaving(false); }
                                            } else if (e.key === 'Escape') {
                                              setEditingItemId(null);
                                            }
                                          }}
                                          autoFocus
                                        />
                                        <Button size="sm" variant="ghost" disabled={editingItemSaving}
                                          onClick={async () => {
                                            if (!editingItemName.trim()) return;
                                            setEditingItemSaving(true);
                                            try {
                                              const res = await fetchWithAuth(`${API}/filter-items/${item.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ name: editingItemName.trim() }),
                                              });
                                              if (res.status === 401) { logout(); navigate('/login'); return; }
                                              if (!res.ok) throw new Error('Error');
                                              const updated = await res.json() as FilterItem;
                                              setFilterItemsByGroup((prev) => ({
                                                ...prev,
                                                [fg.key]: (prev[fg.key] || []).map(it => it.id === item.id ? updated : it)
                                              }));
                                              setEditingItemId(null);
                                            } catch { toast.error('Error saving item'); }
                                            finally { setEditingItemSaving(false); }
                                          }}
                                          className="text-[#1e5631] px-2"
                                        >
                                          {editingItemSaving ? '...' : '✓'}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingItemId(null)} className="text-gray-400 px-2">✕</Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-sm text-[#333] flex items-center gap-1">
                                          <span className="text-gray-400">•</span> {item.name}
                                        </span>
                                        <Button
                                          size="sm" variant="ghost"
                                          onClick={() => { setEditingItemId(item.id); setEditingItemName(item.name); }}
                                          className="text-gray-400 hover:text-[#1e5631] p-1 h-auto"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="sm" variant="ghost"
                                          onClick={async () => {
                                            if (!window.confirm(`Delete "${item.name}"?`)) return;
                                            try {
                                              const res = await fetchWithAuth(`${API}/filter-items/${item.id}`, { method: 'DELETE' });
                                              if (res.status === 401) { logout(); navigate('/login'); return; }
                                              if (!res.ok) throw new Error('Error');
                                              setFilterItemsByGroup((prev) => ({
                                                ...prev,
                                                [fg.key]: (prev[fg.key] || []).filter(it => it.id !== item.id)
                                              }));
                                            } catch { toast.error('Error deleting item'); }
                                          }}
                                          className="text-gray-400 hover:text-red-500 p-1 h-auto"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </>
                                    )}
                                  </li>
                                ))}
                              </ul>

                              {/* Add new item inline */}
                              {addingItemToGroup === fg.key ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="text"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder="e.g. Concrete brooms"
                                    className="flex-1 h-7 px-2 text-sm border border-[#1e5631] rounded-md focus:outline-none"
                                    onKeyDown={async (e) => {
                                      if (e.key === 'Enter') {
                                        if (!newItemName.trim()) return;
                                        setNewItemSaving(true);
                                        try {
                                          const res = await fetchWithAuth(`${API}/filter-items`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ filterGroupKey: fg.key, name: newItemName.trim() }),
                                          });
                                          if (res.status === 401) { logout(); navigate('/login'); return; }
                                          if (!res.ok) {
                                            const err = await res.json().catch(() => ({}));
                                            throw new Error(err?.error || 'Error');
                                          }
                                          const created = await res.json() as FilterItem;
                                          setFilterItemsByGroup((prev) => ({
                                            ...prev,
                                            [fg.key]: [...(prev[fg.key] || []), created]
                                          }));
                                          setNewItemName('');
                                          setAddingItemToGroup(null);
                                        } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
                                        finally { setNewItemSaving(false); }
                                      } else if (e.key === 'Escape') {
                                        setAddingItemToGroup(null); setNewItemName('');
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <Button size="sm" variant="ghost" disabled={newItemSaving}
                                    onClick={async () => {
                                      if (!newItemName.trim()) return;
                                      setNewItemSaving(true);
                                      try {
                                        const res = await fetchWithAuth(`${API}/filter-items`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ filterGroupKey: fg.key, name: newItemName.trim() }),
                                        });
                                        if (res.status === 401) { logout(); navigate('/login'); return; }
                                        if (!res.ok) {
                                          const err = await res.json().catch(() => ({}));
                                          throw new Error(err?.error || 'Error');
                                        }
                                        const created = await res.json() as FilterItem;
                                        setFilterItemsByGroup((prev) => ({
                                          ...prev,
                                          [fg.key]: [...(prev[fg.key] || []), created]
                                        }));
                                        setNewItemName('');
                                        setAddingItemToGroup(null);
                                      } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
                                      finally { setNewItemSaving(false); }
                                    }}
                                    className="text-[#1e5631] px-2"
                                  >
                                    {newItemSaving ? '...' : '✓'}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => { setAddingItemToGroup(null); setNewItemName(''); }} className="text-gray-400 px-2">✕</Button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setAddingItemToGroup(fg.key); setNewItemName(''); setEditingItemId(null); }}
                                  className="flex items-center gap-1 text-xs text-[#1e5631] hover:underline mt-1"
                                >
                                  <Plus className="w-3 h-3" /> Add item
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* ========== CAROUSEL (Homepage hero) ========== */}
          {section === 'carousel' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-[#333]">Homepage Carousel</h1>
                <Button
                  onClick={openAddSlide}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add image
                </Button>
              </div>
              <p className="text-gray-600 mb-6">
                Carousel images are displayed on the homepage and rotate every 5 seconds. Order: top to bottom.
              </p>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {carouselLoading ? (
                  <div className="p-12 text-center text-gray-500">Loading carousel...</div>
                ) : carouselSlides.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No images yet. Add one with the button above.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {carouselSlides.map((slide, index) => (
                      <li key={slide.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveSlide(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-[#333] disabled:opacity-30"
                            aria-label="Move up"
                          >
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSlide(index, 'down')}
                            disabled={index === carouselSlides.length - 1}
                            className="p-1 text-gray-400 hover:text-[#333] disabled:opacity-30"
                            aria-label="Move down"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                        </div>
                        <img
                          src={slide.src}
                          alt={slide.alt}
                          className="w-24 h-16 object-cover rounded border border-gray-200 bg-gray-100"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64"><rect fill="%23eee" width="96" height="64"/><text x="50%" y="50%" fill="%23999" text-anchor="middle" dy=".3em" font-size="10">No image</text></svg>'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#333] truncate" title={slide.src.startsWith('data:') ? undefined : slide.src}>
                            {slide.src.startsWith('data:') ? 'Uploaded image (base64)' : slide.src.length > 50 ? `${slide.src.slice(0, 50)}…` : slide.src}
                          </p>
                          {slide.alt && <p className="text-xs text-gray-500 truncate">{slide.alt}</p>}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditSlide(slide)}
                            className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSlideToDelete(slide)}
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* ========== PROMO BANNERS (carousel below hero) ========== */}
          {section === 'promoBanners' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-[#333]">Promo Banners</h1>
                <Button
                  onClick={openAddPromoBanner}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add banner
                </Button>
              </div>
              <p className="text-gray-600 mb-6">
                These banners appear on the homepage below the main carousel and rotate every 6 seconds. Each has a title and description (e.g. &quot;Free Shipping&quot; / &quot;On orders over $500&quot;).
              </p>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {promoBannersLoading ? (
                  <div className="p-12 text-center text-gray-500">Loading banners...</div>
                ) : promoBanners.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No banners yet. Add one with the button above.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {promoBanners.map((banner, index) => (
                      <li key={banner.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => movePromoBanner(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-[#333] disabled:opacity-30"
                            aria-label="Move up"
                          >
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => movePromoBanner(index, 'down')}
                            disabled={index === promoBanners.length - 1}
                            className="p-1 text-gray-400 hover:text-[#333] disabled:opacity-30"
                            aria-label="Move down"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                        </div>
                        <img
                          src={banner.image}
                          alt={banner.title}
                          className="w-24 h-16 object-cover rounded border border-gray-200 bg-gray-100"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64"><rect fill="%23eee" width="96" height="64"/><text x="50%" y="50%" fill="%23999" text-anchor="middle" dy=".3em" font-size="10">No image</text></svg>'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#333] truncate">{banner.title || 'No title'}</p>
                          <p className="text-xs text-gray-500 truncate">{banner.description || 'No description'}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPromoBanner(banner)}
                            className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPromoBannerToDelete(banner)}
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* ========== OFFERS ========== */}
          {section === 'offers' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-[#333]">Offers</h1>
                <Button
                  onClick={openAddOffer}
                  className="bg-[#1e5631] hover:bg-[#164a28] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New offer
                </Button>
              </div>
              <p className="text-gray-600 mb-6">
                Offers are displayed in the store under the Offers section. Each product can only have one active offer.
              </p>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {offersLoading ? (
                  <div className="p-12 text-center text-gray-500">Loading offers...</div>
                ) : offers.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No offers yet. Add one with the button above.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#f8f8f8]">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Product</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Discount</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Offer price</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Valid until</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {offers.map((offer) => {
                          const offerPrice = offer.product.price * (1 - offer.discountPercent / 100);
                          return (
                            <tr key={offer.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <img src={offer.product.image} alt="" className="w-12 h-12 object-cover rounded-md" />
                                  <span className="font-medium text-[#333]">{offer.product.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-bold text-[#e85d04]">-{offer.discountPercent}%</span>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <span className="text-gray-400 line-through">${offer.product.price.toFixed(2)}</span>
                                <span className="ml-2 font-semibold text-[#1e5631]">${offerPrice.toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {offer.validUntil ? new Date(offer.validUntil).toLocaleDateString('en-US') : 'No date'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => openEditOffer(offer)} className="border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631] hover:text-white">
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setOfferToDelete(offer)} className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ========== SETTINGS ========== */}
          {section === 'settings' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#333]">Settings</h1>
                  <p className="text-gray-500 text-sm mt-1">General site configuration</p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
                <h3 className="text-lg font-semibold text-[#333] mb-4">Browser Tab Title</h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <Label>Text shown in the browser tab</Label>
                    <Input 
                      className="mt-1" 
                      value={tabTitleForm} 
                      onChange={(e) => setTabTitleForm(e.target.value)} 
                      placeholder="E.g. JJ Construction" 
                    />
                    {tabTitleError && <p className="text-sm text-red-500 mt-2">{tabTitleError}</p>}
                  </div>
                  <Button
                    onClick={handleSaveTabTitle}
                    disabled={tabTitleSaving}
                    className="bg-[#1e5631] hover:bg-[#164a28] text-white self-start"
                  >
                    {tabTitleSaving ? 'Saving...' : 'Save title'}
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-[#333] mb-4">Site Logo</h3>
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="w-32 h-32 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden shrink-0">
                    {logo ? (
                      <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                         <img src={logo} alt="Logo preview" style={{ width: `${logoScale}px` }} className="object-contain transition-all duration-200" />
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <span className="text-xs text-gray-400">Sin logo</span>
                      </div>
                    )}
                    {uploadingLogo && (
                      <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
                        <Loader className="w-6 h-6 text-[#1e5631] animate-spin mb-1" />
                        <span className="text-xs font-medium text-[#1e5631]">Subiendo...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-4">
                      Upload an image to update the logo shown in the navigation bar and footer. PNG or SVG with transparent background recommended.
                    </p>
                    <div className="flex flex-col gap-2">
                      <Label
                        htmlFor="logo-upload"
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors text-white ${uploadingLogo ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1e5631] hover:bg-[#164a28] cursor-pointer shadow-sm'}`}
                      >
                        <Upload className="w-4 h-4" />
                        Upload new logo
                      </Label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingLogo}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          e.target.value = ''; // Reset
                          uploadImageToServer(
                            file,
                            'settings',
                            setUploadingLogo,
                            setUploadLogoError,
                            async (url) => {
                              await handleSaveLogo(url);
                            }
                          );
                        }}
                      />
                      {uploadLogoError && (
                        <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-100">
                          {uploadLogoError}
                        </p>
                      )}
                    </div>
                    {logo && (
                      <div className="mt-8 border-t border-gray-100 pt-4">
                        <Label className="block text-sm font-medium text-gray-700 mb-2">
                          Logo Size (Zoom)
                        </Label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="range" 
                            min="50" 
                            max="300" 
                            value={logoScale} 
                            onChange={(e) => setLogoScale(Number(e.target.value))}
                            className="flex-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1e5631]"
                          />
                          <span className="text-sm text-gray-500 font-medium w-12">{logoScale}px</span>
                        </div>
                        <Button 
                          onClick={handleUpdateLogoScale} 
                          disabled={savingLogoScale || logoScale === logoWidth}
                          className="mt-4 bg-[#1e5631] hover:bg-[#164a28] text-white"
                          size="sm"
                        >
                          {savingLogoScale ? 'Saving...' : 'Save Size'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ========== FOOTER SETTINGS ========== */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-w-4xl mt-6">
                <h3 className="text-lg font-semibold text-[#333] mb-4">Pie de página (Footer)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label>Descripción corta</Label>
                    <textarea 
                      className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1e5631] focus:ring-1 focus:ring-[#1e5631]"
                      rows={3}
                      value={footerForm.description}
                      onChange={(e) => setFooterForm({ ...footerForm, description: e.target.value })}
                      placeholder="Texto descriptivo de la empresa..."
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input 
                      className="mt-1" 
                      value={footerForm.phone} 
                      onChange={(e) => setFooterForm({ ...footerForm, phone: e.target.value })} 
                      placeholder="+1 (801) 347-2165" 
                    />
                  </div>
                  <div>
                    <Label>Correo electrónico</Label>
                    <Input 
                      className="mt-1" 
                      type="email" 
                      value={footerForm.email} 
                      onChange={(e) => setFooterForm({ ...footerForm, email: e.target.value })} 
                      placeholder="josarzc@hotmail.com" 
                    />
                  </div>
                  <div>
                    <Label>Horario (Lunes a Viernes)</Label>
                    <Input 
                      className="mt-1" 
                      value={footerForm.scheduleWeekdays} 
                      onChange={(e) => setFooterForm({ ...footerForm, scheduleWeekdays: e.target.value })} 
                      placeholder="8:00 - 18:00" 
                    />
                  </div>
                  <div>
                    <Label>Horario (Sábados)</Label>
                    <Input 
                      className="mt-1" 
                      value={footerForm.scheduleWeekends} 
                      onChange={(e) => setFooterForm({ ...footerForm, scheduleWeekends: e.target.value })} 
                      placeholder="8:00 - 13:00" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>URL de Google Maps (Iframe SRC)</Label>
                    <Input 
                      className="mt-1" 
                      value={footerForm.mapUrl} 
                      onChange={(e) => setFooterForm({ ...footerForm, mapUrl: e.target.value })} 
                      placeholder="https://maps.google.com/maps?q=..." 
                    />
                    <p className="text-xs text-gray-400 mt-1">Ingresa el enlace que va dentro del atributo src="..." del iframe de Google Maps.</p>
                  </div>
                  <div>
                    <Label>Facebook URL</Label>
                    <Input 
                      className="mt-1" 
                      value={footerForm.facebookUrl} 
                      onChange={(e) => setFooterForm({ ...footerForm, facebookUrl: e.target.value })} 
                      placeholder="https://facebook.com/..." 
                    />
                  </div>
                  <div>
                    <Label>Instagram URL</Label>
                    <Input 
                      className="mt-1" 
                      value={footerForm.instagramUrl} 
                      onChange={(e) => setFooterForm({ ...footerForm, instagramUrl: e.target.value })} 
                      placeholder="https://instagram.com/..." 
                    />
                  </div>
                  <div>
                    <Label>Twitter (X) URL</Label>
                    <Input 
                      className="mt-1" 
                      value={footerForm.twitterUrl} 
                      onChange={(e) => setFooterForm({ ...footerForm, twitterUrl: e.target.value })} 
                      placeholder="https://twitter.com/..." 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Popular Categories (comma separated)</Label>
                    <textarea 
                      className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1e5631] focus:ring-1 focus:ring-[#1e5631] min-h-[80px]"
                      value={footerForm.popularCategories}
                      onChange={(e) => setFooterForm({ ...footerForm, popularCategories: e.target.value })}
                      placeholder="Power Tools, Hand Tools, Plumbing, Electricity"
                    />
                    <p className="text-xs text-gray-400 mt-1">E.g: Concrete Mixers, Hand Saws, Electrical Cables.</p>
                  </div>
                </div>

                {footerError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm">
                    {footerError}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handleSaveFooter} 
                    disabled={footerSaving}
                    className="bg-[#1e5631] hover:bg-[#164a28]"
                  >
                    {footerSaving && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                    Save Footer
                  </Button>
                </div>
              </div>

              {/* ========== T&C SETTINGS ========== */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-w-4xl mt-6">
                <h3 className="text-lg font-semibold text-[#333] mb-4">Términos y Condiciones</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Edita el texto público que los usuarios ven en la página de Términos y Condiciones. Puedes agregar espacios y saltos de línea y se respetarán en el sitio.
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    onClick={handleTermsBold}
                  >
                    Negrita
                  </Button>
                  <span className="text-xs text-gray-400">Tip: selecciona texto y presiona Negrita, o usa **texto**.</span>
                </div>
                <div className="grid grid-cols-1">
                  <div className="md:col-span-1">
                    <textarea 
                      className="w-full mt-1 p-3 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1e5631] focus:ring-1 focus:ring-[#1e5631] min-h-[300px]"
                      ref={termsTextareaRef}
                      value={termsForm}
                      onChange={(e) => setTermsForm(e.target.value)}
                      placeholder="Escribe aquí las políticas, términos de servicio y condiciones..."
                    />
                  </div>
                </div>

                {termsError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm">
                    {termsError}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handleSaveTerms} 
                    disabled={termsSaving}
                    className="bg-[#1e5631] hover:bg-[#164a28]"
                  >
                    {termsSaving && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                    Save Terms
                  </Button>
                </div>
              </div>

              {/* ========== PRIVACY POLICY SETTINGS ========== */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-w-4xl mt-6">
                <h3 className="text-lg font-semibold text-[#333] mb-4">Política de Privacidad</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Edita el texto público que los usuarios ven en la página de Política de Privacidad. Puedes agregar espacios y saltos de línea y se respetarán en el sitio.
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    onClick={handlePrivacyBold}
                  >
                    Negrita
                  </Button>
                  <span className="text-xs text-gray-400">Tip: selecciona texto y presiona Negrita, o usa **texto**.</span>
                </div>
                <div className="grid grid-cols-1">
                  <div className="md:col-span-1">
                    <textarea 
                      className="w-full mt-1 p-3 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1e5631] focus:ring-1 focus:ring-[#1e5631] min-h-[300px]"
                      ref={privacyTextareaRef}
                      value={privacyForm}
                      onChange={(e) => setPrivacyForm(e.target.value)}
                      placeholder="Escribe aquí la política de privacidad..."
                    />
                  </div>
                </div>

                {privacyError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm">
                    {privacyError}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handleSavePrivacy} 
                    disabled={privacySaving}
                    className="bg-[#1e5631] hover:bg-[#164a28]"
                  >
                    {privacySaving && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                    Save Policy
                  </Button>
                </div>
              </div>

              {/* ========== GLOBAL TEXT SETTINGS ========== */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-w-4xl mt-6">
                <h3 className="text-lg font-semibold text-[#333] mb-4">Textos Globales y Navegación</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Modifica los textos de los botones, menús de navegación y pequeños subtítulos de toda la página pública.
                </p>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {Object.keys(translations).filter(key => !key.startsWith('admin.')).map((key) => {
                    // Grouping trick for labels
                    const defaultText = translations[key]['en'];
                    return (
                      <div key={key} className="flex flex-col md:flex-row md:items-center gap-2 border-b border-gray-50 pb-3">
                        <Label className="md:w-1/3 text-sm text-gray-600 truncate" title={key}>
                          <span className="font-mono text-xs text-gray-400 mr-2">{key.split('.')[0]}</span>
                          {defaultText}
                        </Label>
                        <Input
                          value={siteTextsForm[key] !== undefined ? siteTextsForm[key] : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSiteTextsForm(prev => {
                              const next = { ...prev };
                              if (val.trim() === '') {
                                delete next[key];
                              } else {
                                next[key] = val;
                              }
                              return next;
                            });
                          }}
                          placeholder={defaultText}
                          className="md:w-2/3"
                        />
                      </div>
                    );
                  })}
                </div>

                {siteTextsError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm">
                    {siteTextsError}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handleSaveSiteTexts} 
                    disabled={siteTextsSaving}
                    className="bg-[#1e5631] hover:bg-[#164a28]"
                  >
                    {siteTextsSaving && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                    Save Texts
                  </Button>
                </div>
              </div>

              {/* header settings*/}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-w-4xl mt-6">
                <h3 className="text-lg font-semibold text-[#333] mb-4">Encabezado de Servicios (Home)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Título Principal</Label>
                    <Input 
                      className="mt-1" 
                      value={servicesHeaderForm.title} 
                      onChange={(e) => setServicesHeaderForm({ ...servicesHeaderForm, title: e.target.value })} 
                      placeholder="Our Specialized Services" 
                    />
                  </div>
                  <div>
                    <Label>Texto Destacado (Verde)</Label>
                    <Input 
                      className="mt-1" 
                      value={servicesHeaderForm.highlight} 
                      onChange={(e) => setServicesHeaderForm({ ...servicesHeaderForm, highlight: e.target.value })} 
                      placeholder="" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Descripción</Label>
                    <textarea 
                      className="w-full mt-1 p-3 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1e5631] focus:ring-1 focus:ring-[#1e5631] min-h-[100px]"
                      value={servicesHeaderForm.description}
                      onChange={(e) => setServicesHeaderForm({ ...servicesHeaderForm, description: e.target.value })}
                      placeholder=""
                    />
                  </div>
                </div>
                {servicesHeaderError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm">
                    {servicesHeaderError}
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveServicesHeader} disabled={servicesHeaderSaving} className="bg-[#1e5631] hover:bg-[#164a28]">
                    {servicesHeaderSaving && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                    Save Services
                  </Button>
                </div>
              </div>

              {/* contact settings*/}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-w-4xl mt-6">
                <h3 className="text-lg font-semibold text-[#333] mb-4">Página de Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Título</Label>
                    <Input 
                      className="mt-1" 
                      value={contactInfoForm.title} 
                      onChange={(e) => setContactInfoForm({ ...contactInfoForm, title: e.target.value })} 
                      placeholder="Contact Us" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Descripción</Label>
                    <textarea 
                      className="w-full mt-1 p-3 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1e5631] focus:ring-1 focus:ring-[#1e5631] min-h-[100px]"
                      value={contactInfoForm.description}
                      onChange={(e) => setContactInfoForm({ ...contactInfoForm, description: e.target.value })}
                      placeholder="We are here to help you build your dreams. Get in touch with our team of experts."
                    />
                  </div>
                  <div>
                    <Label>Teléfono de Contacto</Label>
                    <Input 
                      className="mt-1" 
                      value={contactInfoForm.phone} 
                      onChange={(e) => setContactInfoForm({ ...contactInfoForm, phone: e.target.value })} 
                      placeholder="+1 (801) 347-2165" 
                    />
                  </div>
                  <div>
                    <Label>Email de Contacto</Label>
                    <Input 
                      className="mt-1" 
                      type="email"
                      value={contactInfoForm.email} 
                      onChange={(e) => setContactInfoForm({ ...contactInfoForm, email: e.target.value })} 
                      placeholder="josarzc@hotmail.com" 
                    />
                  </div>
                </div>
                {contactInfoError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm">
                    {contactInfoError}
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveContactInfo} disabled={contactInfoSaving} className="bg-[#1e5631] hover:bg-[#164a28]">
                    {contactInfoSaving && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                    Save Contact
                  </Button>
                </div>
              </div>

              {/* heavy equipment settings */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-w-4xl mt-6">
                <h3 className="text-lg font-semibold text-[#333] mb-4">Página Equipo Pesado (Banner)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Etiqueta / Badge superior</Label>
                    <Input 
                      className="mt-1" 
                      value={heavyEqForm.badge} 
                      onChange={(e) => setHeavyEqForm({ ...heavyEqForm, badge: e.target.value })} 
                      placeholder="Coming Soon!" 
                    />
                  </div>
                  <div>
                    <Label>Título Principal</Label>
                    <Input 
                      className="mt-1" 
                      value={heavyEqForm.title} 
                      onChange={(e) => setHeavyEqForm({ ...heavyEqForm, title: e.target.value })} 
                      placeholder="Heavy Equipment" 
                    />
                  </div>
                  <div>
                    <Label>Texto Destacado (Naranja)</Label>
                    <Input 
                      className="mt-1" 
                      value={heavyEqForm.highlight} 
                      onChange={(e) => setHeavyEqForm({ ...heavyEqForm, highlight: e.target.value })} 
                      placeholder="Professional" 
                    />
                  </div>
                  <div>
                    <Label>Texto Inferior Gigante</Label>
                    <Input 
                      className="mt-1" 
                      value={heavyEqForm.bottomText} 
                      onChange={(e) => setHeavyEqForm({ ...heavyEqForm, bottomText: e.target.value })} 
                      placeholder="Coming Soon!" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Descripción Central</Label>
                    <textarea 
                      className="w-full mt-1 p-3 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1e5631] focus:ring-1 focus:ring-[#1e5631] min-h-[100px]"
                      value={heavyEqForm.description}
                      onChange={(e) => setHeavyEqForm({ ...heavyEqForm, description: e.target.value })}
                      placeholder="We are renewing our catalog with the most powerful machinery on the market. Excavators, backhoes, and industrial mixers ready for your next project."
                    />
                  </div>
                </div>
                {heavyEqError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm">
                    {heavyEqError}
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveHeavyEq} disabled={heavyEqSaving} className="bg-[#1e5631] hover:bg-[#164a28]">
                    {heavyEqSaving && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                    Save Heavy Equipment
                  </Button>
                </div>
              </div>

            </>
          )}
        </main>
      </div>

      {/* Modal detalle pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#333]">
                Pedido {selectedOrder.id}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Cliente</h4>
                <div className="bg-[#f8f8f8] rounded-lg p-4">
                  <p><span className="text-gray-500">Nombre:</span> {selectedOrder.customer.name}</p>
                  <p><span className="text-gray-500">Teléfono:</span> {selectedOrder.customer.phone}</p>
                  <p><span className="text-gray-500">Dirección:</span> {selectedOrder.customer.address}</p>
                  {selectedOrder.customer.notes && (
                    <p className="mt-2"><span className="text-gray-500">Notas:</span> {selectedOrder.customer.notes}</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Productos</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-4 bg-[#f8f8f8] rounded-lg p-3"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-[#333]">{item.product.name}</p>
                        <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-[#1e5631]">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                <span className="text-lg font-medium text-[#333]">Total</span>
                <span className="text-2xl font-bold text-[#1e5631]">
                  ${selectedOrder.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal añadir/editar producto */}
      <Dialog open={productDialogOpen} onOpenChange={(open) => { setProductDialogOpen(open); if (!open) setProductError(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProductId ? `${t('edit')} ${t('admin.product')}` : t('admin.add_product')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {productError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{productError}</p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="name">{t('admin.name')} *</Label>
              <Input
                id="name"
                value={productForm.name}
                onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del producto"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">{t('admin.price')} ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={productForm.price || ''}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stock">{t('admin.stock')} *</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  value={productForm.stock}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, stock: parseInt(e.target.value, 10) || 0 }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">{t('admin.category')} *</Label>
              <select
                id="category"
                value={productForm.category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  const cat = categories.find(c => c.name === newCat);
                  const filterKey = cat?.filterKey || '';
                  setProductForm((f) => ({
                    ...f,
                    category: newCat,
                    storeFilterKey: filterKey || undefined,
                    subcategory: undefined
                  }));
                  setProductFormFilterGroupKey(filterKey);
                  if (filterKey) loadFilterItemsForGroup(filterKey);
                  else setProductFormFilterItems([]);
                }}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Seleccionar...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filterGroup">Store Filters (grupo)</Label>
              <select
                id="filterGroup"
                value={productFormFilterGroupKey}
                onChange={(e) => {
                  const key = e.target.value;
                  setProductFormFilterGroupKey(key);
                  setProductForm((f) => ({ ...f, storeFilterKey: key || undefined, subcategory: undefined }));
                  if (key) loadFilterItemsForGroup(key);
                  else setProductFormFilterItems([]);
                }}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Seleccionar...</option>
                {filterGroups.map((fg) => (
                  <option key={fg.id} value={fg.key}>
                    {fg.name}
                  </option>
                ))}
              </select>
              {filterGroupsLoading && (
                <p className="text-xs text-gray-400">Cargando grupos...</p>
              )}
            </div>
            {/* Subcategory - shown dynamically when selected category has filter items */}
            {(() => {
              const filterKey = productFormFilterGroupKey;
              if (!filterKey) return null;
              const groupName = filterGroups.find((fg) => fg.key === filterKey)?.name || filterKey;
              return (
                <div className="grid gap-2">
                  <Label htmlFor="subcategory">
                    Subcategory
                    {productFormFilterItemsLoading && (
                      <span className="ml-2 text-xs text-gray-400">Loading...</span>
                    )}
                  </Label>
                  {productFormFilterItems.length === 0 && !productFormFilterItemsLoading ? (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      No subcategories found for this group. Go to <strong>Store Filters</strong> to add items to &ldquo;{groupName}&rdquo;.
                    </p>
                  ) : (
                    <select
                      id="subcategory"
                      value={productForm.subcategory ?? ''}
                      onChange={(e) => setProductForm((f) => ({ ...f, subcategory: e.target.value || undefined }))}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      disabled={productFormFilterItemsLoading}
                    >
                      <option value="">-- None (optional) --</option>
                      {productFormFilterItems.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })()}
            <div className="grid gap-2">
              <Label htmlFor="image">{t('admin.image')}</Label>
              <Input
                id="image"
                value={productForm.image}
                onChange={(e) => setProductForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="/product-drill.jpg o sube una foto"
              />
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1e5631] text-[#1e5631] hover:bg-[#1e5631]/10 text-sm font-medium">
                  <Upload className="w-4 h-4" />
                  Subir desde PC o celular
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      e.target.value = '';
                      uploadImageToServer(
                        file,
                        'products',
                        setUploadingProductImage,
                        setUploadProductImageError,
                        (url) => setProductForm((f) => ({ ...f, image: url })),
                      );
                    }}
                  />
                </label>
                {uploadingProductImage && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-gray-300 border-t-[#1e5631] rounded-full animate-spin inline-block" />
                    Uploading...
                  </span>
                )}
                {uploadProductImageError && (
                  <span className="text-xs text-red-500">{uploadProductImageError}</span>
                )}
                {productForm.image && !uploadingProductImage && (
                  <div className="w-16 h-16 rounded border border-gray-200 overflow-hidden bg-[#f8f8f8] flex-shrink-0">
                    <img
                      src={productForm.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t('admin.description')}</Label>
              <textarea
                id="description"
                value={productForm.description}
                onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Product description"
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rating">Rating (0-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={productForm.rating ?? ''}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      rating: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="originalPrice">Original Price ($) - optional</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={productForm.originalPrice ?? ''}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      originalPrice: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tag">{t('admin.tag')}</Label>
              <select
                id="tag"
                value={productForm.tag ?? ''}
                onChange={(e) =>
                  setProductForm((f) => ({
                    ...f,
                    tag: (e.target.value as ProductTag) || undefined,
                  }))
                }
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">None</option>
                {PRODUCT_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2 sm:gap-0">
            {editingProductId && (
              <Link
                to={`/product/${editingProductId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#1e5631] hover:underline order-first w-full sm:w-auto"
              >
                <ExternalLink className="w-4 h-4" />
                View in store (how the client sees it)
              </Link>
            )}
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={productSaving || !productForm.name.trim() || productForm.price < 0 || productForm.stock < 0 || !productForm.category.trim()}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {productSaving ? t('loading') : editingProductId ? t('save') : t('admin.add_product')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal añadir/editar slide del carrusel */}
      <Dialog open={slideDialogOpen} onOpenChange={setSlideDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSlideId ? `${t('edit')} ${t('admin.image')}` : `${t('add')} ${t('admin.image')}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="slide-image">URL de la imagen *</Label>
              <Input
                id="slide-image"
                value={slideForm.image}
                onChange={(e) => setSlideForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="/hero-banner.jpg o https://..."
              />
            </div>
            <div className="relative flex items-center gap-2">
              <span className="text-sm text-gray-500">o</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="grid gap-2">
              <Label>Subir desde tu equipo</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="slide-file-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    e.target.value = '';
                    uploadImageToServer(
                      file,
                      'carousel',
                      setUploadingSlideImage,
                      setUploadSlideImageError,
                      (url) => setSlideForm((f) => ({ ...f, image: url })),
                    );
                  }}
                />
                <Label
                  htmlFor="slide-file-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#1e5631] bg-[#1e5631]/5 px-4 py-2 text-sm font-medium text-[#1e5631] hover:bg-[#1e5631]/10"
                >
                  <Upload className="w-4 h-4" />
                  Elegir archivo
                </Label>
                {uploadingSlideImage && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-gray-300 border-t-[#1e5631] rounded-full animate-spin inline-block" />
                    Subiendo...
                  </span>
                )}
                {uploadSlideImageError && (
                  <span className="text-xs text-red-500">{uploadSlideImageError}</span>
                )}
                {slideForm.image && !slideForm.image.startsWith('data:') && !uploadingSlideImage && (
                  <span className="text-xs text-green-600">✓ Imagen subida</span>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slide-title">Título (opcional)</Label>
              <Input
                id="slide-title"
                value={slideForm.title}
                onChange={(e) => setSlideForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Título principal del slide"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slide-highlight">Texto destacado (opcional)</Label>
              <Input
                id="slide-highlight"
                value={slideForm.highlight}
                onChange={(e) => setSlideForm((f) => ({ ...f, highlight: e.target.value }))}
                placeholder="Texto en color diferente (ej. CONSTRUCCIÓN)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slide-desc">Descripción (opcional)</Label>
              <Input
                id="slide-desc"
                value={slideForm.description}
                onChange={(e) => setSlideForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción corta"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slide-alt">Texto alternativo (opcional)</Label>
              <Input
                id="slide-alt"
                value={slideForm.alt}
                onChange={(e) => setSlideForm((f) => ({ ...f, alt: e.target.value }))}
                placeholder="Descripción de la imagen"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlideDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveSlide}
              disabled={slideSaving || !slideForm.image.trim()}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {slideSaving ? t('loading') : editingSlideId ? t('save') : t('add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal añadir/editar categoría */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCategoryId ? `${t('edit')} ${t('admin.category')}` : `${t('add')} ${t('admin.category')}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Nombre *</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Herramientas Eléctricas"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-icon">Icono</Label>
              <select
                id="category-icon"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm((f) => ({ ...f, icon: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="Zap">Zap (rayo)</option>
                <option value="Wrench">Wrench (llave)</option>
                <option value="Building2">Building2 (edificio)</option>
                <option value="Paintbrush">Paintbrush (pincel)</option>
                <option value="Droplets">Droplets (gotas)</option>
                <option value="Lightbulb">Lightbulb (bombilla)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-filter">Grupo en tienda (filtro lateral)</Label>
              <select
                id="category-filter"
                value={categoryForm.filterKey}
                onChange={(e) => setCategoryForm((f) => ({ ...f, filterKey: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">Ninguno</option>
                {filterGroups.map((fg) => (
                  <option key={fg.id} value={fg.key}>{fg.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>{t('cancel')}</Button>
            <Button
              type="button"
              onClick={handleSaveCategory}
              disabled={categorySaving || !categoryForm.name.trim()}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {categorySaving ? t('loading') : editingCategoryId ? t('save') : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar categoría */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              Los productos que usen esta categoría seguirán mostrándola como texto. Solo se quita de la lista de categorías para nuevos productos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} className="bg-red-600 hover:bg-red-700">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal nuevo/editar grupo de filtro */}
      <Dialog open={filterGroupDialogOpen} onOpenChange={setFilterGroupDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFilterGroupId ? 'Editar grupo de filtro' : 'Nuevo grupo de filtro'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fg-name">Nombre (ej. Herramientas, Materias primas)</Label>
              <Input
                id="fg-name"
                value={filterGroupForm.name}
                onChange={(e) => setFilterGroupForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Herramientas"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fg-key">Clave (para filtros, ej. tools)</Label>
              <Input
                id="fg-key"
                value={filterGroupForm.key}
                onChange={(e) => setFilterGroupForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="tools"
              />
              <p className="text-xs text-gray-500">Si la dejas vacía se genera del nombre.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFilterGroupDialogOpen(false)}>{t('cancel')}</Button>
            <Button
              type="button"
              onClick={handleSaveFilterGroup}
              disabled={filterGroupSaving || !filterGroupForm.name.trim()}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {filterGroupSaving ? t('loading') : editingFilterGroupId ? t('save') : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar grupo de filtro */}
      <AlertDialog open={!!filterGroupToDelete} onOpenChange={() => setFilterGroupToDelete(null)}>
        <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this filter group?</AlertDialogTitle>
            <AlertDialogDescription>
              Las categorías que usen este grupo quedarán sin grupo asignado. El grupo dejará de aparecer en el filtro de la tienda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFilterGroup} className="bg-red-600 hover:bg-red-700">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal añadir/editar banner promocional */}
      <Dialog open={promoBannerDialogOpen} onOpenChange={(open) => { setPromoBannerDialogOpen(open); if (!open) setPromoBannerError(null); }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPromoBannerId ? 'Editar banner promocional' : 'Añadir banner promocional'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {promoBannerError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{promoBannerError}</p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="promo-image">URL de la imagen *</Label>
              <Input
                id="promo-image"
                value={promoBannerForm.image}
                onChange={(e) => setPromoBannerForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="/promo-tools.jpg o https://..."
              />
            </div>
            <div className="relative flex items-center gap-2">
              <span className="text-sm text-gray-500">o</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="grid gap-2">
              <Label>Subir desde tu equipo</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="promo-banner-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    e.target.value = '';
                    uploadImageToServer(
                      file,
                      'banners',
                      setUploadingBannerImage,
                      setUploadBannerImageError,
                      (url) => setPromoBannerForm((f) => ({ ...f, image: url })),
                    );
                  }}
                />
                <Label
                  htmlFor="promo-banner-file"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#1e5631] bg-[#1e5631]/5 px-4 py-2 text-sm font-medium text-[#1e5631] hover:bg-[#1e5631]/10"
                >
                  <Upload className="w-4 h-4" />
                  Choose file
                </Label>
                {uploadingBannerImage && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-gray-300 border-t-[#1e5631] rounded-full animate-spin inline-block" />
                    Uploading...
                  </span>
                )}
                {uploadBannerImageError && (
                  <span className="text-xs text-red-500">{uploadBannerImageError}</span>
                )}
                {promoBannerForm.image && !promoBannerForm.image.startsWith('data:') && !uploadingBannerImage && (
                  <span className="text-xs text-green-600">✓ Image uploaded</span>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promo-title">Title *</Label>
              <Input
                id="promo-title"
                value={promoBannerForm.title}
                onChange={(e) => setPromoBannerForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="E.g. Free Shipping"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promo-desc">Description</Label>
              <Input
                id="promo-desc"
                value={promoBannerForm.description}
                onChange={(e) => setPromoBannerForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ej. En compras mayores a $500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPromoBannerDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSavePromoBanner(e)}
              disabled={promoBannerSaving || !promoBannerForm.image.trim()}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {promoBannerSaving ? t('loading') : editingPromoBannerId ? t('save') : t('add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar banner promocional */}
      <AlertDialog open={!!promoBannerToDelete} onOpenChange={() => setPromoBannerToDelete(null)}>
        <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this promo banner?</AlertDialogTitle>
            <AlertDialogDescription>
              The banner will be removed from the promotional section on the homepage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePromoBanner} className="bg-red-600 hover:bg-red-700">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar eliminar slide */}
      <AlertDialog open={!!slideToDelete} onOpenChange={() => setSlideToDelete(null)}>
        <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this image from the carousel?</AlertDialogTitle>
            <AlertDialogDescription>
              The image will be removed from the homepage carousel. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSlide} className="bg-red-600 hover:bg-red-700">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal añadir/editar oferta */}
      <Dialog open={offerDialogOpen} onOpenChange={(open) => { setOfferDialogOpen(open); if (!open) setOfferError(null); }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOfferId ? 'Edit offer' : 'New offer'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {offerError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{offerError}</p>
            )}
            <div className="grid gap-2">
              <Label>Product</Label>
              <select
                value={offerForm.productId}
                onChange={(e) => setOfferForm((f) => ({ ...f, productId: e.target.value }))}
                disabled={!!editingOfferId}
                className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">Select a product...</option>
                {(editingOfferId ? products : products.filter((p) => !offers.some((o) => o.productId === p.id))).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — ${p.price.toFixed(2)}</option>
                ))}
              </select>
              {editingOfferId && <p className="text-xs text-gray-500">Product cannot be changed when editing.</p>}
            </div>
            <div className="grid gap-2">
              <Label>Discount (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={offerForm.discountPercent}
                onChange={(e) => setOfferForm((f) => ({ ...f, discountPercent: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Valid until (optional)</Label>
              <Input
                type="date"
                value={offerForm.validUntil}
                onChange={(e) => setOfferForm((f) => ({ ...f, validUntil: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferDialogOpen(false)}>{t('cancel')}</Button>
            <Button
              onClick={handleSaveOffer}
              disabled={offerSaving || !offerForm.productId.trim() || offerForm.discountPercent < 0 || offerForm.discountPercent > 100}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {offerSaving ? t('loading') : editingOfferId ? t('save') : 'Create offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar oferta */}
      <AlertDialog open={!!offerToDelete} onOpenChange={() => setOfferToDelete(null)}>
        <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this offer?</AlertDialogTitle>
            <AlertDialogDescription>
              The offer for &quot;{offerToDelete?.product.name}&quot; will no longer be shown in the store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteOffer} className="bg-red-600 hover:bg-red-700">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar eliminar producto */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => { if (!open) { setProductToDelete(null); setProductDeleteError(null); } }}>
        <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              Will be deleted &quot;{productToDelete?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {productDeleteError && (
            <p className="text-sm text-red-600 px-6" role="alert">{productDeleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={productDeleteInProgress}>{t('cancel')}</AlertDialogCancel>
            <Button
              type="button"
              onClick={(e) => confirmDeleteProduct(e)}
              disabled={productDeleteInProgress}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {productDeleteInProgress ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Modal añadir/editar servicio */}
      <Dialog open={serviceDialogOpen} onOpenChange={(open) => { setServiceDialogOpen(open); if (!open) setServiceError(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingServiceId ? `${t('edit')} ${t('admin.services')}` : t('admin.add_service')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {serviceError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{serviceError}</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="service-title">{t('admin.title')} *</Label>
                <Input
                  id="service-title"
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ej. Construcción Residencial"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="service-category">{t('admin.category')} *</Label>
                <Input
                  id="service-category"
                  value={serviceForm.category}
                  onChange={(e) => setServiceForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Ej. Residencial, Comercial..."
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="service-image">{t('admin.image')} (URL or Upload)</Label>
              <Input
                id="service-image"
                value={serviceForm.image}
                onChange={(e) => setServiceForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="https://..."
              />
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="service-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    e.target.value = '';
                    uploadImageToServer(
                      file,
                      'services',
                      setUploadingServiceImage,
                      setUploadServiceImageError,
                      (url) => setServiceForm((f) => ({ ...f, image: url })),
                    );
                  }}
                />
                <Label
                  htmlFor="service-file"
                  className="cursor-pointer text-xs text-[#1e5631] hover:underline"
                >
                  Upload image
                </Label>
                {uploadingServiceImage && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-gray-300 border-t-[#1e5631] rounded-full animate-spin inline-block" />
                    Uploading...
                  </span>
                )}
                {uploadServiceImageError && (
                  <span className="text-xs text-red-500">{uploadServiceImageError}</span>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="service-video">{t('admin.video_url')} (Optional)</Label>
              <Input
                id="service-video"
                value={serviceForm.video}
                onChange={(e) => setServiceForm((f) => ({ ...f, video: e.target.value }))}
                placeholder="https://youtube.com/..."
              />
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  id="service-video-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      alert("The video is too large (max 10MB). Please use a YouTube URL instead.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result;
                      if (typeof result === 'string') setServiceForm((f) => ({ ...f, video: result }));
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <Label
                  htmlFor="service-video-file"
                  className="cursor-pointer text-xs text-[#1e5631] hover:underline"
                >
                  Upload video (max 10MB)
                </Label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="service-desc">{t('admin.description')} *</Label>
              <textarea
                id="service-desc"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={serviceForm.description}
                onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief service description..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="service-content">{t('admin.content')} (Detailed)</Label>
              <textarea
                id="service-content"
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={serviceForm.content}
                onChange={(e) => setServiceForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Full article or service content..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>{t('cancel')}</Button>
            <Button
              onClick={handleSaveService}
              disabled={serviceSaving || !serviceForm.title.trim()}
              className="bg-[#1e5631] hover:bg-[#164a28]"
            >
              {serviceSaving ? t('loading') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar servicio */}
      <AlertDialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
        <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.delete_service_confirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <DialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteService} className="bg-red-600 hover:bg-red-700">
              {t('delete')}
            </AlertDialogAction>
          </DialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
