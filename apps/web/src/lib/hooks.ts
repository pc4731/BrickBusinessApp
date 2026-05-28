'use client';

import { makeCrudHooks } from './crud-hooks';
import { customersApi, factoriesApi, ownTrucksApi, driversApi, hiredTrucksApi } from './resources';
import type { Customer, Driver, Factory, HiredTruck, OwnTruck } from './entities';

export const customerHooks = makeCrudHooks<Customer>('customers', customersApi);
export const factoryHooks = makeCrudHooks<Factory>('factories', factoriesApi);
export const ownTruckHooks = makeCrudHooks<OwnTruck>('own-trucks', ownTrucksApi);
export const driverHooks = makeCrudHooks<Driver>('drivers', driversApi);
export const hiredTruckHooks = makeCrudHooks<HiredTruck>('hired-trucks', hiredTrucksApi);
