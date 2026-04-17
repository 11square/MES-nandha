import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ProductCategory, Product, OrderForBilling, OrderForProduction, BillForDispatch, Lead } from '../types';
import type { Module } from '../services/auth.service';
import { productsService } from '../services/products.service';

interface SharedState {
  productCategories: ProductCategory[];
  setProductCategories: React.Dispatch<React.SetStateAction<ProductCategory[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orderForBilling: OrderForBilling | null;
  setOrderForBilling: React.Dispatch<React.SetStateAction<OrderForBilling | null>>;
  orderForProduction: OrderForProduction | null;
  setOrderForProduction: React.Dispatch<React.SetStateAction<OrderForProduction | null>>;
  billForDispatch: BillForDispatch | null;
  setBillForDispatch: React.Dispatch<React.SetStateAction<BillForDispatch | null>>;
  leadForOrder: Record<string, any> | null;
  setLeadForOrder: React.Dispatch<React.SetStateAction<Record<string, any> | null>>;
  currentUser: Record<string, any> | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<Record<string, any> | null>>;
  modules: Module[];
  setModules: React.Dispatch<React.SetStateAction<Module[]>>;
}

const SharedStateContext = createContext<SharedState | null>(null);

export function useSharedState() {
  const ctx = useContext(SharedStateContext);
  if (!ctx) throw new Error('useSharedState must be used within SharedStateProvider');
  return ctx;
}

export function SharedStateProvider({ children }: { children: ReactNode }) {
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderForBilling, setOrderForBilling] = useState<OrderForBilling | null>(null);
  const [orderForProduction, setOrderForProduction] = useState<OrderForProduction | null>(null);
  const [billForDispatch, setBillForDispatch] = useState<BillForDispatch | null>(null);
  const [leadForOrder, setLeadForOrder] = useState<Record<string, any> | null>(null);
  const [currentUser, setCurrentUser] = useState<Record<string, any> | null>(null);
  const [modules, setModules] = useState<Module[]>([]);

  // Derive the current user's business_id for scoped localStorage access
  const businessId = currentUser?.business_id || null;

  // When user changes (login / switch), reset products & categories so stale data doesn't leak
  useEffect(() => {
    if (!currentUser) {
      setProducts([]);
      setProductCategories([]);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    // Fetch products and categories from API in parallel
    Promise.all([
      productsService.getProducts().catch(() => []),
      productsService.getCategories().catch(() => []),
    ])
      .then(([prodData, categoryData]) => {
        // Handle both array and wrapped responses
        const raw = Array.isArray(prodData) ? prodData : (prodData as any)?.items || (prodData as any)?.rows || [];
        const items = raw.map((p: any) => ({
          ...p,
          unit_price: p.unit_price ?? p.selling_price ?? p.base_price ?? 0,
        }));
        setProducts(items);

        // Map DB-backed categories to the ProductCategory shape
        const merged: ProductCategory[] = categoryData.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          subcategories: cat.subcategories || [],
          dbId: cat.dbId,
          subDbIds: cat.subDbIds,
        }));

        setProductCategories(merged);

        // Clean up legacy localStorage data if present
        const bid = currentUser.business_id;
        productsService.clearLegacyCategories(bid);
      })
      .catch(() => {
        // If fetches fail, categories stay empty
      });
  }, [currentUser]);

  return (
    <SharedStateContext.Provider
      value={{
        productCategories, setProductCategories,
        products, setProducts,
        orderForBilling, setOrderForBilling,
        orderForProduction, setOrderForProduction,
        billForDispatch, setBillForDispatch,
        leadForOrder, setLeadForOrder,
        currentUser, setCurrentUser,
        modules, setModules,
      }}
    >
      {children}
    </SharedStateContext.Provider>
  );
}
