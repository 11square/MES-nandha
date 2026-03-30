import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ProductCategory, Product, OrderForBilling, OrderForProduction, BillForDispatch, Lead } from '../types';
import type { Module } from '../services/auth.service';
import { productsService } from '../services/products.service';
import { stockService } from '../services/stock.service';

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

    const bid = currentUser.business_id;
    const token = localStorage.getItem('token');
    if (!token) {
      const saved = productsService.getCategories(bid);
      if (saved.length) setProductCategories(saved);
      return;
    }

    // Fetch both products and stock items to derive categories from all sources
    Promise.all([
      productsService.getProducts().catch(() => []),
      stockService.getAllStockItems().catch(() => []),
    ])
      .then(([prodData, stockData]) => {
        // Handle both array and wrapped responses
        const raw = Array.isArray(prodData) ? prodData : (prodData as any)?.items || (prodData as any)?.rows || [];
        // Map selling_price/base_price → unit_price for frontend compatibility
        const items = raw.map((p: any) => ({
          ...p,
          unit_price: p.unit_price ?? p.selling_price ?? p.base_price ?? 0,
        }));
        setProducts(items);

        const stockItems = Array.isArray(stockData) ? stockData : (stockData as any)?.items || (stockData as any)?.rows || [];

        // Merge: start with saved categories from localStorage (business-scoped)
        const saved = productsService.getCategories(bid);
        const catMap = new Map<string, Set<string>>();

        // Seed from saved categories
        saved.forEach(cat => {
          catMap.set(cat.id, new Set(cat.subcategories || []));
        });

        // Derive categories from products
        items.forEach((p: Product) => {
          if (p.category) {
            const catId = p.category.toLowerCase().replace(/\s+/g, '-');
            if (!catMap.has(catId)) catMap.set(catId, new Set());
            if (p.subcategory) catMap.get(catId)!.add(p.subcategory);
          }
        });

        // Also derive categories from stock items
        stockItems.forEach((s: any) => {
          if (s.category) {
            const catId = s.category.toLowerCase().replace(/\s+/g, '-');
            if (!catMap.has(catId)) catMap.set(catId, new Set());
            if (s.subcategory) catMap.get(catId)!.add(s.subcategory);
          }
        });

        const merged: ProductCategory[] = Array.from(catMap.entries()).map(([id, subs]) => {
          const savedCat = saved.find(c => c.id === id);
          // Derive a nice display name from the id if no saved name exists
          const displayName = savedCat?.name || id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          return {
            id,
            name: displayName,
            subcategories: Array.from(subs),
          };
        });

        if (merged.length > 0) {
          setProductCategories(merged);
          productsService.saveCategories(merged, bid);
        } else if (saved.length > 0) {
          setProductCategories(saved);
        } else {
          setProductCategories([]);
        }
      })
      .catch(() => {
        // If all fetches fail, still load saved categories
        const saved = productsService.getCategories(bid);
        if (saved.length) setProductCategories(saved);
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
