'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@brick/types';

// Content-driven translations (Hinglish is a content style, not a locale).
// Bundled in the client so they work offline. Missing keys fall back to EN,
// then to the key itself — so untranslated strings degrade gracefully.
type Dict = Record<string, string>;

const en: Dict = {
  'nav.dashboard': 'Dashboard',
  'nav.orders': 'Orders',
  'nav.stock': 'Stock',
  'nav.finance': 'Finance',
  'nav.reports': 'Reports',
  'nav.expenses': 'Expenses',
  'nav.customers': 'Customers',
  'nav.factories': 'Factories',
  'nav.trucks': 'Own Trucks',
  'nav.hiredTrucks': 'Hired Trucks',
  'nav.rentals': 'Truck Rentals',
  'nav.drivers': 'Drivers',
  'nav.users': 'Users',
  'nav.audit': 'Audit Log',
  'nav.settings': 'Settings',
  'common.logout': 'Logout',
  'common.add': 'Add',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.search': 'Search',
  'common.loading': 'Loading…',
  'common.language': 'Language',
  'dashboard.welcome': 'Welcome',
  'dashboard.subtitle': 'Master data is ready. Orders & finance come next.',
  'login.title': 'Brick ERP',
  'login.subtitle': 'Sign in to manage orders, finance and stock.',
  'login.email': 'Email',
  'login.password': 'Password',
  'login.signin': 'Sign in',
  'login.signingIn': 'Signing in…',
  'tile.orders': 'Create & track deliveries',
  'tile.stock': 'Yard inventory & batches',
  'tile.finance': 'Profit, dues, cash position',
  'tile.expenses': 'Truck & general expenses',
  'tile.customers': 'Manage buyers, rates, sites',
  'tile.factories': 'Bhattas & purchase rates',
  'tile.trucks': 'Fleet & document expiry',
  'tile.drivers': 'Driver directory',
  'tile.users': 'Staff & roles',
  'tile.settings': 'Business & GST config',
};

const hi: Dict = {
  'nav.dashboard': 'डैशबोर्ड',
  'nav.orders': 'ऑर्डर',
  'nav.stock': 'स्टॉक',
  'nav.finance': 'वित्त',
  'nav.reports': 'रिपोर्ट',
  'nav.expenses': 'खर्च',
  'nav.customers': 'ग्राहक',
  'nav.factories': 'फैक्ट्री',
  'nav.trucks': 'अपने ट्रक',
  'nav.hiredTrucks': 'किराए के ट्रक',
  'nav.rentals': 'ट्रक किराया (देना)',
  'nav.drivers': 'ड्राइवर',
  'nav.users': 'उपयोगकर्ता',
  'nav.audit': 'ऑडिट लॉग',
  'nav.settings': 'सेटिंग्स',
  'common.logout': 'लॉग आउट',
  'common.add': 'जोड़ें',
  'common.save': 'सेव करें',
  'common.cancel': 'रद्द करें',
  'common.delete': 'हटाएं',
  'common.edit': 'बदलें',
  'common.search': 'खोजें',
  'common.loading': 'लोड हो रहा है…',
  'common.language': 'भाषा',
  'dashboard.welcome': 'स्वागत है',
  'dashboard.subtitle': 'मास्टर डेटा तैयार है। ऑर्डर और वित्त आगे आते हैं।',
  'login.title': 'ब्रिक ईआरपी',
  'login.subtitle': 'ऑर्डर, वित्त और स्टॉक प्रबंधित करने के लिए साइन इन करें।',
  'login.email': 'ईमेल',
  'login.password': 'पासवर्ड',
  'login.signin': 'साइन इन करें',
  'login.signingIn': 'साइन इन हो रहा है…',
  'tile.orders': 'डिलीवरी बनाएं और ट्रैक करें',
  'tile.stock': 'यार्ड इन्वेंट्री और बैच',
  'tile.finance': 'मुनाफ़ा, बकाया, नकद',
  'tile.expenses': 'ट्रक और सामान्य खर्च',
  'tile.customers': 'ग्राहक, रेट, साइट',
  'tile.factories': 'भट्टा और खरीद रेट',
  'tile.trucks': 'गाड़ियां और दस्तावेज़',
  'tile.drivers': 'ड्राइवर सूची',
  'tile.users': 'स्टाफ़ और भूमिकाएं',
  'tile.settings': 'व्यापार और जीएसटी सेटिंग',
};

// Hinglish: Hindi grammar in Roman script, English nouns kept (how staff speak).
const hinglish: Dict = {
  'nav.users': 'Users',
  'common.logout': 'Logout',
  'common.add': 'Add karein',
  'common.save': 'Save karein',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete karein',
  'common.edit': 'Edit karein',
  'common.search': 'Search karein',
  'common.loading': 'Load ho raha hai…',
  'common.language': 'Bhasha',
  'dashboard.welcome': 'Welcome',
  'dashboard.subtitle': 'Master data ready hai. Orders aur finance aage aate hain.',
  'login.subtitle': 'Orders, finance aur stock manage karne ke liye sign in karein.',
  'login.signin': 'Sign in karein',
  'login.signingIn': 'Sign in ho raha hai…',
  'tile.orders': 'Delivery banayein aur track karein',
  'tile.stock': 'Yard inventory aur batches',
  'tile.finance': 'Profit, dues, cash',
  'tile.expenses': 'Truck aur general kharch',
  'tile.customers': 'Customers, rates, sites',
  'tile.factories': 'Bhatta aur purchase rates',
  'tile.trucks': 'Apne trucks aur documents',
  'tile.drivers': 'Driver list',
  'tile.users': 'Staff aur roles',
  'tile.settings': 'Business aur GST settings',
};

const DICTS: Record<Language, Dict> = { EN: en, HI: hi, HINGLISH: hinglish };

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'EN', label: 'English' },
  { value: 'HI', label: 'हिंदी' },
  { value: 'HINGLISH', label: 'Hinglish' },
];

interface LangState {
  lang: Language;
  setLang: (lang: Language) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'EN',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'brick-lang' },
  ),
);

/** Returns a translate function bound to the current language. */
export function useT() {
  const lang = useLangStore((s) => s.lang);
  return useMemo(() => {
    return (key: string, fallback?: string): string =>
      DICTS[lang][key] ?? DICTS.EN[key] ?? fallback ?? key;
  }, [lang]);
}
