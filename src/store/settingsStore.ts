import { create } from 'zustand';
import { API } from '@/lib/api';

export interface FooterSettings {
  description: string;
  phone: string;
  email: string;
  scheduleWeekdays: string;
  scheduleWeekends: string;
  mapUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  popularCategories?: string;
}

export interface ServicesHeaderSettings {
  title: string;
  highlight: string;
  description: string;
}

export interface ContactInfoSettings {
  title: string;
  description: string;
  phone: string;
  email: string;
}

export interface HeavyEquipmentSettings {
  badge: string;
  title: string;
  highlight: string;
  description: string;
  bottomText: string;
}

interface SettingsState {
  logo: string | null;
  logoWidth: number | null;
  footer: FooterSettings | null;
  terms: string | null;
  privacyPolicy: string | null;
  loading: boolean;
  fetchLogo: () => Promise<void>;
  setLogo: (logo: string, width?: number) => void;
  fetchFooter: () => Promise<void>;
  setFooter: (footer: FooterSettings) => void;
  fetchTerms: () => Promise<void>;
  setTerms: (terms: string) => void;
  fetchPrivacyPolicy: () => Promise<void>;
  setPrivacyPolicy: (policy: string) => void;
  servicesHeader: ServicesHeaderSettings | null;
  fetchServicesHeader: () => Promise<void>;
  setServicesHeader: (header: ServicesHeaderSettings) => void;
  contactInfo: ContactInfoSettings | null;
  fetchContactInfo: () => Promise<void>;
  setContactInfo: (info: ContactInfoSettings) => void;
  heavyEquipment: HeavyEquipmentSettings | null;
  fetchHeavyEquipment: () => Promise<void>;
  setHeavyEquipment: (eq: HeavyEquipmentSettings) => void;
  siteTexts: Record<string, string> | null;
  fetchSiteTexts: () => Promise<void>;
  setSiteTexts: (texts: Record<string, string>) => void;
  tabTitle: string | null;
  fetchTabTitle: () => Promise<void>;
  setTabTitle: (title: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  logo: null,
  logoWidth: null,
  footer: null,
  terms: null,
  privacyPolicy: null,
  servicesHeader: null,
  contactInfo: null,
  heavyEquipment: null,
  siteTexts: null,
  tabTitle: null,
  loading: false,
  fetchLogo: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API}/settings/logo`);
      if (res.ok) {
        const data = await res.json();
        if (data.logo) {
          set({ logo: data.logo, logoWidth: data.width || null });
        }
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    } finally {
      set({ loading: false });
    }
  },
  setLogo: (logo, width) => set({ logo, logoWidth: width || null }),

  fetchFooter: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API}/settings/footer`);
      if (res.ok) {
        const data = await res.json();
        if (data.footer) {
          set({ footer: data.footer });
        }
      }
    } catch (error) {
      console.error('Error fetching footer:', error);
    } finally {
      set({ loading: false });
    }
  },
  setFooter: (footer) => set({ footer }),

  fetchTerms: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API}/settings/terms`);
      if (res.ok) {
        const data = await res.json();
        if (data.terms !== undefined) {
          set({ terms: data.terms });
        }
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
    } finally {
      set({ loading: false });
    }
  },
  setTerms: (terms) => set({ terms }),

  fetchPrivacyPolicy: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API}/settings/privacy`);
      if (res.ok) {
        const data = await res.json();
        if (data.privacyPolicy !== undefined) {
          set({ privacyPolicy: data.privacyPolicy });
        }
      }
    } catch (error) {
      console.error('Error fetching privacy policy:', error);
    } finally {
      set({ loading: false });
    }
  },
  setPrivacyPolicy: (privacyPolicy) => set({ privacyPolicy }),

  fetchServicesHeader: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API}/settings/services_header`);
      if (res.ok) {
        const data = await res.json();
        if (data) set({ servicesHeader: data });
      }
    } catch (error) {
      console.error('Error fetching services header:', error);
    } finally {
      set({ loading: false });
    }
  },
  setServicesHeader: (servicesHeader) => set({ servicesHeader }),

  fetchContactInfo: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API}/settings/contact_info`);
      if (res.ok) {
        const data = await res.json();
        if (data) set({ contactInfo: data });
      }
    } catch (error) {
      console.error('Error fetching contact info:', error);
    } finally {
      set({ loading: false });
    }
  },
  setContactInfo: (contactInfo) => set({ contactInfo }),

  fetchHeavyEquipment: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API}/settings/heavy_equipment`);
      if (res.ok) {
        const data = await res.json();
        if (data) set({ heavyEquipment: data });
      }
    } catch (error) {
      console.error('Error fetching heavy equipment:', error);
    } finally {
      set({ loading: false });
    }
  },
  setHeavyEquipment: (heavyEquipment) => set({ heavyEquipment }),

  fetchSiteTexts: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API}/settings/texts`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.texts) {
          set({ siteTexts: data.texts });
        }
      }
    } catch (error) {
      console.error('Error fetching site texts:', error);
    } finally {
      set({ loading: false });
    }
  },
  setSiteTexts: (siteTexts) => set({ siteTexts }),

  fetchTabTitle: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API}/settings/tab_title`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.tabTitle) {
          set({ tabTitle: data.tabTitle });
        }
      }
    } catch (error) {
      console.error('Error fetching tab title:', error);
    } finally {
      set({ loading: false });
    }
  },
  setTabTitle: (tabTitle) => set({ tabTitle }),
}));
