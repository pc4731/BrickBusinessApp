import type { BrickClass, Language, OrgSettings, UserRole } from '@brick/types';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  phoneAlt?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  creditLimitPaise: number;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;
  fullAddress: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  isDefault: boolean;
}

export interface BrickPrice {
  id: string;
  brickClass: BrickClass;
  pricePerBrickPaise: number;
  effectiveFrom: string;
  note?: string | null;
}

export type CustomerDetail = Customer & {
  addresses: CustomerAddress[];
  currentPrices: BrickPrice[];
};

export interface Factory {
  id: string;
  name: string;
  ownerName?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  creditLimitPaise: number;
  creditDays: number;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

export type FactoryDetail = Factory & { currentPrices: BrickPrice[] };

export interface OwnTruck {
  id: string;
  number: string;
  model?: string | null;
  capacityBricks?: number | null;
  insuranceExpiry?: string | null;
  permitExpiry?: string | null;
  fitnessExpiry?: string | null;
  isActive: boolean;
  notes?: string | null;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string | null;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  isActive: boolean;
}

export interface HiredTruck {
  id: string;
  number: string;
  ownerName?: string | null;
  ownerPhone?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  isActive: boolean;
}

export interface OrgSettingsResponse {
  id: string;
  name: string;
  legalName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  logoUrl?: string | null;
  settings: OrgSettings;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  language: Language;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}
