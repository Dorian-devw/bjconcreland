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
}

interface SettingsState {
  logo: string | null;
  footer: FooterSettings | null;
  terms: string | null;
  privacyPolicy: string | null;
  loading: boolean;
  fetchLogo: () => Promise<void>;
  setLogo: (logo: string) => void;
  fetchFooter: () => Promise<void>;
  setFooter: (footer: FooterSettings) => void;
  fetchTerms: () => Promise<void>;
  setTerms: (terms: string) => void;
  fetchPrivacyPolicy: () => Promise<void>;
  setPrivacyPolicy: (policy: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  logo: null,
  footer: null,
  terms: null,
  privacyPolicy: null,
  loading: false,
  fetchLogo: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API}/settings/logo`);
      if (res.ok) {
        const data = await res.json();
        if (data.logo) {
          set({ logo: data.logo });
        }
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    } finally {
      set({ loading: false });
    }
  },
  setLogo: (logo) => set({ logo }),

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
}));
