import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Search, Edit2, Trash2, Package, Grid, List, ChevronRight, FolderOpen, Folder, Eye, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useI18n } from '../contexts/I18nContext';
import { useSharedState } from '../contexts/SharedStateContext';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { ConfirmDialog } from './ui/confirm-dialog';

import { productsService } from '../services/products.service';
import { stockService } from '../services/stock.service';
interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  subcategory?: string;
  description: string;
  base_price: number;
  selling_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  materials: string[];
  production_time: number; // in hours
  labor_cost: number;
  overhead_cost: number;
  status: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  subcategories: string[];
}

const units = ['pcs', 'sqft', 'meter', 'kg', 'set'];

interface SharedProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  subcategory?: string;
  unit: string;
}

interface ProductManagementProps {
  productCategories?: Category[];
  onCategoriesChange?: (categories: Category[]) => void;
  sharedProducts?: SharedProduct[];
  onProductsChange?: (products: SharedProduct[]) => void;
}

export default function ProductManagement({ 
  productCategories = [], 
  onCategoriesChange,
  sharedProducts = [],
  onProductsChange
}: ProductManagementProps) {
  const { t } = useI18n();
  const { currentUser } = useSharedState();
  const navigate = useNavigate();
  const businessId = currentUser?.business_id || null;
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [categories, setCategories] = useState<Category[]>(productCategories);
  const [viewingCategory, setViewingCategory] = useState<string | null>(null);
  const [viewingSubcategory, setViewingSubcategory] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);

  // Sync categories when prop updates (from DB fetch)
  useEffect(() => {
    if (productCategories.length > 0) {
      setCategories(productCategories);
    }
  }, [productCategories]);

  const refreshProducts = useCallback(async () => {
    try {
      const [prodData, stockData] = await Promise.all([
        productsService.getProducts(),
        stockService.getAllStockItems(),
      ]);
      const prodItems = Array.isArray(prodData) ? prodData : (prodData as any)?.items || [];
      setProducts(prodItems);
      const stItems = Array.isArray(stockData) ? stockData : (stockData as any)?.items || [];
      setStockItems(stItems);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { refreshProducts(); }, [refreshProducts]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    status: 'active',
    unit: 'pcs',
    materials: [],
  });
  const [editErrors, setEditErrors] = useState<ValidationErrors>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, type: 'product'|'category'|'subcategory', id: string, parentId?: string}>({open: false, type: 'product', id: ''});
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Sync products with parent component
  useEffect(() => {
    if (onProductsChange) {
      const sharedProductsData: SharedProduct[] = products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        subcategory: p.subcategory,
        unit: p.unit,
      }));
      onProductsChange(sharedProductsData);
    }
  }, [products, onProductsChange]);

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate stats from products + stock items
  const stats = {
    total: products.length + stockItems.length,
    active: products.filter(p => p.status === 'active').length + stockItems.filter((s: any) => (Number(s.current_stock) || 0) > 0).length,
    lowStock: products.filter(p => p.stock <= p.min_stock).length + stockItems.filter((s: any) => (Number(s.current_stock) || 0) <= (Number(s.reorder_level) || 0)).length,
    totalValue: products.reduce((sum, p) => sum + ((Number(p.selling_price) || 0) * (Number(p.stock) || 0)), 0) + stockItems.reduce((sum: number, s: any) => sum + ((Number(s.unit_price) || Number(s.selling_price) || 0) * (Number(s.current_stock) || 0)), 0),
  };

  const handleAddProduct = async (data: Record<string, unknown>) => {
    try {
      await productsService.createProduct({
        name: data.name || '',
        sku: data.sku || '',
        hsn_code: data.hsnCode || '',
        category: data.category || '',
        subcategory: data.subcategory,
        description: data.description || '',
        base_price: data.base_price || 0,
        selling_price: data.selling_price || 0,
        stock: data.stock || 0,
        min_stock: data.min_stock || 0,
        unit: data.unit || 'pcs',
        materials: data.materials || [],
        production_time: data.production_time || 0,
        labor_cost: data.labor_cost || 0,
        overhead_cost: data.overhead_cost || 0,
        status: data.status || 'active',
      });
      toast.success('Product created successfully');
      await refreshProducts();
      setShowCreateProduct(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create product');
    }
  };

  const handleEditProduct = async () => {
    if (selectedProduct) {
      const errors = validateFields({
        name: formData.name || '',
        sku: formData.sku || '',
        hsn_code: formData.hsn_code || '',
        category: formData.category || '',
        base_price: formData.base_price ?? '',
        selling_price: formData.selling_price ?? '',
        stock: formData.stock ?? '',
        min_stock: formData.min_stock ?? '',
      }, {
        name: { required: true, min: 2, label: 'Product Name' },
        sku: { required: true, label: 'SKU' },
        hsn_code: { required: true, label: 'HSN Code' },
        category: { required: true, label: 'Category' },
        base_price: { required: true, numeric: true, min: 0, label: 'Base Price' },
        selling_price: { required: true, numeric: true, min: 0, label: 'Selling Price' },
        stock: { required: true, numeric: true, min: 0, label: 'Stock' },
        min_stock: { required: true, numeric: true, min: 0, label: 'Minimum Stock' },
      });
      if (Object.keys(errors).length) { setEditErrors(errors); return; }
      try {
        await productsService.updateProduct(selectedProduct.id, {
          name: formData.name,
          sku: formData.sku,
          hsn_code: formData.hsn_code,
          category: formData.category,
          subcategory: formData.subcategory,
          description: formData.description,
          base_price: formData.base_price,
          selling_price: formData.selling_price,
          stock: formData.stock,
          min_stock: formData.min_stock,
          unit: formData.unit,
          materials: formData.materials,
          production_time: formData.production_time,
          labor_cost: formData.labor_cost,
          overhead_cost: formData.overhead_cost,
          status: formData.status,
        });
        toast.success('Product updated successfully');
        await refreshProducts();
        setShowEditDialog(false);
        resetForm();
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update product');
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setDeleteConfirm({open: true, type: 'product', id});
  };

  const resetForm = () => {
    setFormData({ status: 'active', unit: 'pcs', materials: [] });
    setSelectedProduct(null);
    setEditErrors({});
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData(product);
    setEditErrors({});
    setShowEditDialog(true);
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  const getSubcategories = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.subcategories || [];
  };

  // Normalize a stock item into a Product-like shape for display
  const normalizeStockItem = (s: any): Product => {
    const currentStock = Number(s.current_stock) || 0;
    const reorderLevel = Number(s.reorder_level) || 0;
    let status: 'active' | 'inactive' | 'discontinued' = 'active';
    if (currentStock <= 0) status = 'inactive';
    return {
      id: s.id || s._id || '',
      name: s.name || '',
      sku: s.sku || '',
      category: s.category || '',
      subcategory: s.subcategory || '',
      description: s.description || '',
      base_price: Number(s.buying_price) || Number(s.unit_price) || 0,
      selling_price: Number(s.selling_price) || Number(s.unit_price) || 0,
      stock: currentStock,
      min_stock: reorderLevel,
      unit: s.unit || 'pcs',
      materials: [],
      production_time: 0,
      labor_cost: 0,
      overhead_cost: 0,
      status,
      created_at: s.created_at || '',
      updated_at: s.updated_at || '',
    } as Product;
  };

  // Match stock items by category name (stock stores name, not id)
  const getStockItemsByCategory = (categoryId: string) => {
    const catName = getCategoryName(categoryId);
    return stockItems
      .filter((s: any) => s.category === categoryId || s.category === catName)
      .map(normalizeStockItem);
  };

  const getStockItemsBySubcategory = (categoryId: string, subcategory: string) => {
    const catName = getCategoryName(categoryId);
    return stockItems
      .filter((s: any) => (s.category === categoryId || s.category === catName) && s.subcategory === subcategory)
      .map(normalizeStockItem);
  };

  const getProductsByCategory = (categoryId: string) => {
    const prods = products.filter(p => p.category === categoryId);
    const stocks = getStockItemsByCategory(categoryId);
    // Merge: if a product also has a stock entry, enrich it with stock data
    const stockMap = new Map<string, Product>();
    stocks.forEach(s => stockMap.set(`${s.name}||${s.sku}`, s));
    const merged = prods.map(p => {
      const stockMatch = stockMap.get(`${p.name}||${p.sku}`);
      if (stockMatch) {
        return {
          ...p,
          stock: (Number(p.stock) || 0) > 0 ? Number(p.stock) : Number(stockMatch.stock) || 0,
          min_stock: (Number(p.min_stock) || 0) > 0 ? Number(p.min_stock) : Number(stockMatch.min_stock) || 0,
          selling_price: (Number(p.selling_price) || 0) > 0 ? Number(p.selling_price) : Number(stockMatch.selling_price) || 0,
          base_price: (Number(p.base_price) || 0) > 0 ? Number(p.base_price) : Number(stockMatch.base_price) || 0,
          unit: p.unit || stockMatch.unit,
        };
      }
      return p;
    });
    const seen = new Set(prods.map(p => `${p.name}||${p.sku}`));
    const uniqueStocks = stocks.filter(s => !seen.has(`${s.name}||${s.sku}`));
    return [...merged, ...uniqueStocks];
  };

  const getProductsBySubcategory = (categoryId: string, subcategory: string) => {
    const prods = products.filter(p => p.category === categoryId && p.subcategory === subcategory);
    const stocks = getStockItemsBySubcategory(categoryId, subcategory);
    // Merge: if a product also has a stock entry, enrich it with stock data
    const stockMap = new Map<string, Product>();
    stocks.forEach(s => stockMap.set(`${s.name}||${s.sku}`, s));
    const merged = prods.map(p => {
      const stockMatch = stockMap.get(`${p.name}||${p.sku}`);
      if (stockMatch) {
        return {
          ...p,
          stock: (Number(p.stock) || 0) > 0 ? Number(p.stock) : Number(stockMatch.stock) || 0,
          min_stock: (Number(p.min_stock) || 0) > 0 ? Number(p.min_stock) : Number(stockMatch.min_stock) || 0,
          selling_price: (Number(p.selling_price) || 0) > 0 ? Number(p.selling_price) : Number(stockMatch.selling_price) || 0,
          base_price: (Number(p.base_price) || 0) > 0 ? Number(p.base_price) : Number(stockMatch.base_price) || 0,
          unit: p.unit || stockMatch.unit,
        };
      }
      return p;
    });
    const seen = new Set(prods.map(p => `${p.name}||${p.sku}`));
    const uniqueStocks = stocks.filter(s => !seen.has(`${s.name}||${s.sku}`));
    return [...merged, ...uniqueStocks];
  };

  const handleAddCategory = (categoryData: { name: string; subcategories: string[] }) => {
    const newCategory: Category = {
      id: categoryData.name.toLowerCase().replace(/\s+/g, '-'),
      name: categoryData.name,
      subcategories: categoryData.subcategories,
    };
    const newCategories = [...categories, newCategory];
    setCategories(newCategories);
    onCategoriesChange?.(newCategories);
    productsService.saveCategories(newCategories, businessId);
    setShowCreateCategory(false);
    toast.success('Category added successfully');
  };

  const handleDeleteCategory = (categoryId: string) => {
    const productsInCategory = products.filter(p => p.category === categoryId);
    if (productsInCategory.length > 0) {
      toast.info(`Cannot delete category. ${productsInCategory.length} products are assigned to this category.`);
      return;
    }
    setDeleteConfirm({open: true, type: 'category', id: categoryId});
  };

  const handleAddSubcategoryToCategory = (categoryId: string, subcategoryName: string) => {
    // Support comma-separated: "Sub A, Sub B, Sub C"
    const parts = subcategoryName.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const newCategories = categories.map(cat => {
      if (cat.id !== categoryId) return cat;
      const unique = parts.filter(p => !cat.subcategories.includes(p));
      return unique.length > 0
        ? { ...cat, subcategories: [...cat.subcategories, ...unique] }
        : cat;
    });
    setCategories(newCategories);
    onCategoriesChange?.(newCategories);
    productsService.saveCategories(newCategories, businessId);
    setNewSubcategoryName('');
    setShowAddSubcategory(false);
    const count = parts.length;
    toast.success(count > 1 ? `${count} subcategories added successfully` : 'Subcategory added successfully');
  };

  const handleDeleteSubcategory = (categoryId: string, subcategoryName: string) => {
    const productsInSubcategory = products.filter(p => p.category === categoryId && p.subcategory === subcategoryName);
    if (productsInSubcategory.length > 0) {
      toast.info(`Cannot delete subcategory. ${productsInSubcategory.length} products are assigned to this subcategory.`);
      return;
    }
    setDeleteConfirm({open: true, type: 'subcategory', id: subcategoryName, parentId: categoryId});
  };

  const handleConfirmDelete = async () => {
    const { type, id, parentId } = deleteConfirm;
    setDeleteConfirm(prev => ({ ...prev, open: false }));
    if (type === 'product') {
      try {
        await productsService.deleteProduct(id);
        toast.success('Product deleted successfully');
        await refreshProducts();
      } catch (err: any) {
        toast.error(err?.message || 'Failed to delete product');
      }
    } else if (type === 'category') {
      const newCategories = categories.filter(c => c.id !== id);
      setCategories(newCategories);
      onCategoriesChange?.(newCategories);
      productsService.saveCategories(newCategories, businessId);
      toast.success('Category deleted successfully');
    } else if (type === 'subcategory' && parentId) {
      const newCategories = categories.map(cat =>
        cat.id === parentId
          ? { ...cat, subcategories: cat.subcategories.filter(s => s !== id) }
          : cat
      );
      setCategories(newCategories);
      onCategoriesChange?.(newCategories);
      productsService.saveCategories(newCategories, businessId);
      toast.success('Subcategory deleted successfully');
    }
  };

  // If viewing a product's full details
  if (viewingProduct) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewingProduct(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">
            {t('productDetails')}
          </h2>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{viewingProduct.name}</CardTitle>
              <Badge className={
                viewingProduct.status === 'active' ? 'bg-green-100 text-green-700' :
                viewingProduct.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }>
                {viewingProduct.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-slate-500">Product Name</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">{viewingProduct.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">SKU</Label>
                  <p className="text-base font-medium text-slate-900 mt-1 font-mono">{viewingProduct.sku}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">{t('category')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">
                    <Badge variant="outline">{getCategoryName(viewingProduct.category)}</Badge>
                  </p>
                </div>
                {viewingProduct.subcategory && (
                  <div>
                    <Label className="text-sm text-slate-500">{t('subcategory')}</Label>
                    <p className="text-base font-medium text-slate-900 mt-1">{viewingProduct.subcategory}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm text-slate-500">{t('description')}</Label>
                  <p className="text-base text-slate-900 mt-1">{viewingProduct.description || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">{t('unit')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">{viewingProduct.unit}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-slate-500">{t('basePrice')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">₹{(viewingProduct.base_price || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">{t('sellingPrice')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">₹{(viewingProduct.selling_price || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">{t('currentStock')}</Label>
                  <p className={`text-base font-medium mt-1 ${viewingProduct.stock <= viewingProduct.min_stock ? 'text-red-600' : 'text-slate-900'}`}>
                    {viewingProduct.stock} {viewingProduct.unit}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">{t('minimumStock')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">{viewingProduct.min_stock} {viewingProduct.unit}</p>
                </div>
                {viewingProduct.production_time > 0 && (
                  <div>
                    <Label className="text-sm text-slate-500">{t('productionTime')}</Label>
                    <p className="text-base font-medium text-slate-900 mt-1">{viewingProduct.production_time} {t('hours')}</p>
                  </div>
                )}
                {(viewingProduct.labor_cost > 0) && (
                  <div>
                    <Label className="text-sm text-slate-500">{t('laborCost')}</Label>
                    <p className="text-base font-medium text-slate-900 mt-1">₹{(viewingProduct.labor_cost || 0).toLocaleString('en-IN')}</p>
                  </div>
                )}
                {(viewingProduct.overhead_cost > 0) && (
                  <div>
                    <Label className="text-sm text-slate-500">{t('overheadCost')}</Label>
                    <p className="text-base font-medium text-slate-900 mt-1">₹{(viewingProduct.overhead_cost || 0).toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setViewingProduct(null)}>
                {t('back')}
              </Button>
              <Button
                onClick={() => { setViewingProduct(null); openEditDialog(viewingProduct); }}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {t('edit')}
              </Button>
              <Button
                onClick={() => { setViewingProduct(null); handleDeleteProduct(viewingProduct.id); }}
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('delete')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If showing create product page, render it instead of the main view
  if (showCreateProduct) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => { setShowCreateProduct(false); setSelectedCategory(null); setSelectedSubcategory(null); }}
          >
            ← {t('back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('createNewProduct')}</h1>
          </div>
        </div>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <CreateProductForm 
              onClose={() => { setShowCreateProduct(false); setSelectedCategory(null); setSelectedSubcategory(null); }} 
              onSave={handleAddProduct}
              categories={categories}
              preselectedCategory={selectedCategory || undefined}
              preselectedSubcategory={selectedSubcategory || undefined}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If showing create category page
  if (showCreateCategory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setShowCreateCategory(false)}
          >
            ← {t('back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('createNewCategory')}</h1>
          </div>
        </div>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <CreateCategoryForm 
              onClose={() => setShowCreateCategory(false)} 
              onSave={handleAddCategory}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If viewing products of a subcategory
  if (viewingCategory && viewingSubcategory) {
    const category = categories.find(c => c.id === viewingCategory);
    const subcategoryProducts = getProductsBySubcategory(viewingCategory, viewingSubcategory).filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setViewingSubcategory(null)}
            >
              ← {t('back')}
            </Button>
            <div>
              <p className="text-sm text-gray-500">{category?.name}</p>
              <h1 className="text-2xl font-bold text-gray-800">{viewingSubcategory}</h1>
              <p className="text-gray-600 mt-1">
                {subcategoryProducts.length} {t('products')}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => {
              setSelectedCategory(viewingCategory);
              setSelectedSubcategory(viewingSubcategory);
              setShowCreateProduct(true);
            }} 
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addProduct')}
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Input
                  placeholder={t('searchProducts')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        {subcategoryProducts.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-8">
              <div className="text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('noProductsInThisSubcategory')}</p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => {
                    setSelectedCategory(viewingCategory);
                    setSelectedSubcategory(viewingSubcategory);
                    setShowCreateProduct(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('addProduct')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">SKU</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Product Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Price</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Stock</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subcategoryProducts.map(product => (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-800 font-mono">{product.sku}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{product.name}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className="font-semibold text-gray-800">₹{(product.selling_price || 0).toLocaleString()}</span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={product.stock <= product.min_stock ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {product.stock} {product.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={
                            product.status === 'active' ? 'bg-green-100 text-green-700' :
                            product.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {product.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingProduct(product)}
                              className="text-blue-600 hover:text-blue-700"
                              title="View Details"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(product)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subcategoryProducts.map(product => (
              <Card key={product.id} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={
                      product.status === 'active' ? 'bg-green-100 text-green-700' :
                      product.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {product.status}
                    </Badge>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewingProduct(product)} className="text-blue-600">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditDialog(product)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{product.sku}</p>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock:</span>
                      <span className={`font-medium ${product.stock <= product.min_stock ? 'text-red-600' : 'text-gray-800'}`}>
                        {product.stock} {product.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-semibold text-gray-800">₹{product.selling_price.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Product Dialog */}
        <Dialog open={showEditDialog} onOpenChange={(open: boolean) => {
          if (!open) {
            setShowEditDialog(false);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label>Product Name *</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setEditErrors(prev => ({ ...prev, name: '' })); }}
                  placeholder="Enter product name"
                />
                <FieldError message={editErrors.name} />
              </div>

              <div>
                <Label>SKU *</Label>
                <Input
                  value={formData.sku || ''}
                  onChange={(e) => { setFormData({ ...formData, sku: e.target.value }); setEditErrors(prev => ({ ...prev, sku: '' })); }}
                  placeholder="e.g., ASW-STD-001"
                />
                <FieldError message={editErrors.sku} />
              </div>

              <div>
                <Label>{t('hsnCode')} *</Label>
                <Input
                  value={formData.hsn_code || ''}
                  onChange={(e) => { setFormData({ ...formData, hsn_code: e.target.value }); setEditErrors(prev => ({ ...prev, hsn_code: '' })); }}
                  placeholder={t('enterHsnCode')}
                />
                <FieldError message={editErrors.hsn_code} />
              </div>

              <div>
                <Label>Category *</Label>
                <Select 
                  value={formData.category || ''} 
                  onValueChange={(value: string) => setFormData({ ...formData, category: value, subcategory: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.category && (
                <div className="col-span-2">
                  <Label>Subcategory</Label>
                  <Select 
                    value={formData.subcategory || ''} 
                    onValueChange={(value: string) => setFormData({ ...formData, subcategory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubcategories(formData.category).map(subcat => (
                        <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description"
                  rows={3}
                />
              </div>

              <div>
                <Label>Base Price *</Label>
                <Input
                  type="number"
                  value={formData.base_price || ''}
                  onChange={(e) => { setFormData({ ...formData, base_price: parseFloat(e.target.value) }); setEditErrors(prev => ({ ...prev, base_price: '' })); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0.00"
                />
                <FieldError message={editErrors.base_price} />
              </div>

              <div>
                <Label>Selling Price *</Label>
                <Input
                  type="number"
                  value={formData.selling_price || ''}
                  onChange={(e) => { setFormData({ ...formData, selling_price: parseFloat(e.target.value) }); setEditErrors(prev => ({ ...prev, selling_price: '' })); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0.00"
                />
                <FieldError message={editErrors.selling_price} />
              </div>

              <div>
                <Label>Current Stock *</Label>
                <Input
                  type="number"
                  value={formData.stock || ''}
                  onChange={(e) => { setFormData({ ...formData, stock: parseFloat(e.target.value) }); setEditErrors(prev => ({ ...prev, stock: '' })); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0"
                />
                <FieldError message={editErrors.stock} />
              </div>

              <div>
                <Label>Minimum Stock *</Label>
                <Input
                  type="number"
                  value={formData.min_stock || ''}
                  onChange={(e) => { setFormData({ ...formData, min_stock: parseFloat(e.target.value) }); setEditErrors(prev => ({ ...prev, min_stock: '' })); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0"
                />
                <FieldError message={editErrors.min_stock} />
              </div>

              <div>
                <Label>Unit *</Label>
                <Select value={formData.unit || 'pcs'} onValueChange={(value: string) => setFormData({ ...formData, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status || 'active'} onValueChange={(value: string) => setFormData({ ...formData, status: value as 'active' | 'inactive' | 'discontinued' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleEditProduct} className="bg-blue-500 hover:bg-blue-600">
                Update Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={deleteConfirm.open}
          title={`Delete ${deleteConfirm.type === 'product' ? 'Product' : deleteConfirm.type === 'category' ? 'Category' : 'Subcategory'}`}
          description={`Are you sure you want to delete this ${deleteConfirm.type}? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(prev => ({ ...prev, open: false }))}
        />
      </div>
    );
  }

  // If viewing subcategories of a category
  if (viewingCategory) {
    const category = categories.find(c => c.id === viewingCategory);
    const categorySubcategories = category?.subcategories || [];
    const categoryProducts = getProductsByCategory(viewingCategory);

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setViewingCategory(null)}
            >
              ← {t('back')}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{category?.name}</h1>
              <p className="text-gray-600 mt-1">
                {categorySubcategories.length} {t('subcategories')}
                {` • ${categoryProducts.length} ${t('productsTotal')}`}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowAddSubcategory(true)} 
            variant="outline"
            className="bg-blue-500 text-white hover:bg-blue-500 hover:text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addSubcategory')}
          </Button>
        </div>

        {/* Add Subcategory Dialog */}
        <Dialog open={showAddSubcategory} onOpenChange={setShowAddSubcategory}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('addNewSubcategory')}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="subcategoryName">{t('subcategoryName')} *</Label>
              <Input
                id="subcategoryName"
                value={newSubcategoryName}
                onChange={(e) => setNewSubcategoryName(e.target.value)}
                placeholder="e.g. Sub A, Sub B, Sub C"
                className="mt-2"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSubcategoryToCategory(viewingCategory!, newSubcategoryName);
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowAddSubcategory(false);
                setNewSubcategoryName('');
              }}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={() => handleAddSubcategoryToCategory(viewingCategory!, newSubcategoryName)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
                disabled={!newSubcategoryName.trim()}
              >
                {t('addSubcategory')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Subcategory Cards */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              {t('subcategories')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categorySubcategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('noSubcategoriesFound')}</p>
                <Button 
                  onClick={() => setShowAddSubcategory(true)} 
                  variant="outline" 
                  className="mt-3 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('addSubcategory')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categorySubcategories.map(subcategory => {
                  const subcategoryProducts = getProductsBySubcategory(viewingCategory, subcategory);
                  
                  return (
                    <div 
                      key={subcategory} 
                      className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors group"
                      onClick={() => setViewingSubcategory(subcategory)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-blue -100 rounded-lg flex items-center justify-center">
                          <Folder className="w-5 h-5 text-blue-600" />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleDeleteSubcategory(viewingCategory, subcategory);
                          }}
                          className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-1">{subcategory}</h3>
                      <p className="text-sm text-gray-500">
                        {subcategoryProducts.length} {t('products')}
                      </p>
                      <div className="mt-3 flex items-center text-blue-600 text-sm font-medium">
                        {t('viewProducts')}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <ConfirmDialog
          open={deleteConfirm.open}
          title={`Delete ${deleteConfirm.type === 'product' ? 'Product' : deleteConfirm.type === 'category' ? 'Category' : 'Subcategory'}`}
          description={`Are you sure you want to delete this ${deleteConfirm.type}? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(prev => ({ ...prev, open: false }))}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/stock')}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {t('productManagement')}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('manageAllProductsAndCategories')}
            </p>
          </div>
        </div>
        
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">Total Products</span>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{stats.total}</p>
          <p className="text-xs text-slate-600 mt-1">All products in catalog</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">Active Products</span>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{stats.active}</p>
          <p className="text-xs text-emerald-600 mt-1">Currently available</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">Low Stock Items</span>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{stats.lowStock}</p>
          <p className="text-xs text-amber-600 mt-1">Need reordering</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">Total Stock Value</span>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">₹{stats.totalValue.toLocaleString()}</p>
          <p className="text-xs text-slate-600 mt-1">Inventory value</p>
        </motion.div>
      </div>
      <div className="flex gap-2 items-center justify-end">
          <Button onClick={() => setShowCreateCategory(true)} variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
            <Plus className="w-4 h-4 mr-2" />
            {t('addCategory')}
          </Button>
          <Button onClick={() => setShowCreateProduct(true)} className="bg-blue-500 hover:bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            {t('addProduct')}
          </Button>
        </div>

      {/* Categories */}
      <div className="space-y-4">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              {t('categories')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('noCategoriesFound')}</p>
                <Button 
                  onClick={() => setShowCreateCategory(true)} 
                  variant="outline" 
                  className="mt-3"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('addCategory')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories.map(category => {
                  const categoryProducts = getProductsByCategory(category.id);
                  
                  return (
                    <div 
                      key={category.id} 
                      className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors group"
                      onClick={() => setViewingCategory(category.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleDeleteCategory(category.id);
                          }}
                          className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-1">{category.name}</h3>
                      <p className="text-sm text-gray-500">
                        {categoryProducts.length} {t('products')}
                      </p>
                      {category.subcategories.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {category.subcategories.length} {t('subcategories')}
                        </p>
                      )}
                      <div className="mt-3 flex items-center text-blue-600 text-sm font-medium">
                        {t('viewProducts')}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowEditDialog(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>Product Name *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setEditErrors(prev => ({ ...prev, name: '' })); }}
                placeholder="Enter product name"
              />
              <FieldError message={editErrors.name} />
            </div>

            <div>
              <Label>SKU *</Label>
              <Input
                value={formData.sku || ''}
                onChange={(e) => { setFormData({ ...formData, sku: e.target.value }); setEditErrors(prev => ({ ...prev, sku: '' })); }}
                placeholder="e.g., ASW-STD-001"
              />
              <FieldError message={editErrors.sku} />
            </div>

            <div>
              <Label>{t('hsnCode')} *</Label>
              <Input
                value={formData.hsn_code || ''}
                onChange={(e) => { setFormData({ ...formData, hsn_code: e.target.value }); setEditErrors(prev => ({ ...prev, hsn_code: '' })); }}
                placeholder={t('enterHsnCode')}
              />
              <FieldError message={editErrors.hsn_code} />
            </div>

            <div>
              <Label>Category *</Label>
              <Select 
                value={formData.category || ''} 
                onValueChange={(value: string) => setFormData({ ...formData, category: value, subcategory: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.category && (
              <div className="col-span-2">
                <Label>Subcategory</Label>
                <Select 
                  value={formData.subcategory || ''} 
                  onValueChange={(value: string) => setFormData({ ...formData, subcategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSubcategories(formData.category).map(subcat => (
                      <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description"
                rows={3}
              />
            </div>

            <div>
              <Label>Base Price *</Label>
              <Input
                type="number"
                value={formData.base_price || ''}
                onChange={(e) => { setFormData({ ...formData, base_price: parseFloat(e.target.value) }); setEditErrors(prev => ({ ...prev, base_price: '' })); }}
                onKeyDown={blockInvalidNumberKeys}
                placeholder="0.00"
              />
              <FieldError message={editErrors.base_price} />
            </div>

            <div>
              <Label>Selling Price *</Label>
              <Input
                type="number"
                value={formData.selling_price || ''}
                onChange={(e) => { setFormData({ ...formData, selling_price: parseFloat(e.target.value) }); setEditErrors(prev => ({ ...prev, selling_price: '' })); }}
                onKeyDown={blockInvalidNumberKeys}
                placeholder="0.00"
              />
              <FieldError message={editErrors.selling_price} />
            </div>

            <div>
              <Label>Current Stock *</Label>
              <Input
                type="number"
                value={formData.stock || ''}
                onChange={(e) => { setFormData({ ...formData, stock: parseFloat(e.target.value) }); setEditErrors(prev => ({ ...prev, stock: '' })); }}
                onKeyDown={blockInvalidNumberKeys}
                placeholder="0"
              />
              <FieldError message={editErrors.stock} />
            </div>

            <div>
              <Label>Minimum Stock *</Label>
              <Input
                type="number"
                value={formData.min_stock || ''}
                onChange={(e) => { setFormData({ ...formData, min_stock: parseFloat(e.target.value) }); setEditErrors(prev => ({ ...prev, min_stock: '' })); }}
                onKeyDown={blockInvalidNumberKeys}
                placeholder="0"
              />
              <FieldError message={editErrors.min_stock} />
            </div>

            <div>
              <Label>Unit *</Label>
              <Select value={formData.unit || 'pcs'} onValueChange={(value: string) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Production Time (hours)</Label>
              <Input
                type="number"
                value={formData.production_time || ''}
                onChange={(e) => setFormData({ ...formData, production_time: parseFloat(e.target.value) })}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Labor Cost</Label>
              <Input
                type="number"
                value={formData.labor_cost || ''}
                onChange={(e) => setFormData({ ...formData, labor_cost: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Overhead Cost</Label>
              <Input
                type="number"
                value={formData.overhead_cost || ''}
                onChange={(e) => setFormData({ ...formData, overhead_cost: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={formData.status || 'active'} onValueChange={(value: string) => setFormData({ ...formData, status: value as 'active' | 'inactive' | 'discontinued' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditProduct} className="bg-blue-500 hover:bg-blue-600">
              Update Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        title={`Delete ${deleteConfirm.type === 'product' ? 'Product' : deleteConfirm.type === 'category' ? 'Category' : 'Subcategory'}`}
        description={`Are you sure you want to delete this ${deleteConfirm.type}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}

// CreateProductForm Component (similar to CreateLeadForm)
function CreateProductForm({ 
  onClose, 
  onSave,
  categories: passedCategories = [],
  preselectedCategory,
  preselectedSubcategory
}: { 
  onClose: () => void; 
  onSave: (formData: Record<string, unknown>) => void;
  categories?: Category[];
  preselectedCategory?: string;
  preselectedSubcategory?: string;
}) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    hsnCode: '',
    category: preselectedCategory || '',
    subcategory: preselectedSubcategory || '',
    description: '',
    base_price: 0,
    selling_price: 0,
    stock: 0,
    min_stock: 0,
    unit: 'pcs',
    production_time: 0,
    labor_cost: 0,
    overhead_cost: 0,
    status: 'active' as 'active' | 'inactive' | 'discontinued',
    productionType: 'no' as 'yes' | 'no',
  });

  const [categories, setCategories] = useState<Array<{ id: string; name: string; subcategories: string[] }>>(passedCategories);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [units, setUnits] = useState(['pcs', 'sqft', 'meter', 'kg', 'set']);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  const getSubcategories = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.subcategories : [];
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory = {
        id: newCategoryName.toLowerCase().replace(/\s+/g, '_'),
        name: newCategoryName,
        subcategories: []
      };
      setCategories([...categories, newCategory]);
      setFormData({ ...formData, category: newCategory.id, subcategory: '' });
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const handleAddSubcategory = () => {
    if (newSubcategoryName.trim() && formData.category) {
      setCategories(categories.map(cat => 
        cat.id === formData.category 
          ? { ...cat, subcategories: [...cat.subcategories, newSubcategoryName] }
          : cat
      ));
      setFormData({ ...formData, subcategory: newSubcategoryName });
      setNewSubcategoryName('');
      setShowAddSubcategory(false);
    }
  };

  const handleAddUnit = () => {
    if (newUnitName.trim() && !units.includes(newUnitName.trim().toLowerCase())) {
      const newUnit = newUnitName.trim().toLowerCase();
      setUnits([...units, newUnit]);
      setFormData({ ...formData, unit: newUnit });
      setNewUnitName('');
      setShowAddUnit(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFields({
      name: formData.name,
      sku: formData.sku,
      hsnCode: formData.hsnCode,
      category: formData.category,
      base_price: formData.base_price ?? '',
      selling_price: formData.selling_price ?? '',
      stock: formData.stock ?? '',
      min_stock: formData.min_stock ?? '',
    }, {
      name: { required: true, min: 2, label: 'Product Name' },
      sku: { required: true, label: 'SKU' },
      hsnCode: { required: true, label: 'HSN Code' },
      category: { required: true, label: 'Category' },
      base_price: { required: true, numeric: true, min: 0, label: 'Base Price' },
      selling_price: { required: true, numeric: true, min: 0, label: 'Selling Price' },
      stock: { required: true, numeric: true, min: 0, label: 'Stock' },
      min_stock: { required: true, numeric: true, min: 0, label: 'Minimum Stock' },
    });
    if (Object.keys(errors).length) { setCreateErrors(errors); return; }
    onSave(formData);
  };

  const [createErrors, setCreateErrors] = useState<ValidationErrors>({});

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 py-2">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('productName')} *</Label>
            <Input 
              id="name" 
              value={formData.name}
              onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setCreateErrors(prev => ({ ...prev, name: '' })); }}
              placeholder={t('enterProductName')} 
              className="border border-gray-300" 
            />
            <FieldError message={createErrors.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">{t('skuCode')} *</Label>
            <Input 
              id="sku" 
              value={formData.sku}
              onChange={(e) => { setFormData({ ...formData, sku: e.target.value }); setCreateErrors(prev => ({ ...prev, sku: '' })); }}
              placeholder="e.g., ASW-STD-001" 
              className="border border-gray-300" 
            />
            <FieldError message={createErrors.sku} />
          </div>
        </div>

        {/* HSN Code */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hsnCode">{t('hsnCode')} *</Label>
            <Input 
              id="hsnCode" 
              value={formData.hsnCode}
              onChange={(e) => { setFormData({ ...formData, hsnCode: e.target.value }); setCreateErrors(prev => ({ ...prev, hsnCode: '' })); }}
              placeholder={t('enterHsnCode')}
              className="border border-gray-300" 
            />
            <FieldError message={createErrors.hsnCode} />
          </div>
        </div>

        {/* Category Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">{t('category')} *</Label>
            {!showAddCategory ? (
              <select
                id="category"
                value={formData.category}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setShowAddCategory(true);
                  } else {
                    setFormData({ ...formData, category: e.target.value, subcategory: '' });
                    setCreateErrors(prev => ({ ...prev, category: '' }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('selectCategory')}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                <option value="__add_new__" className="text-blue-600 font-medium">
                  + {t('addNewCategory')}
                </option>
              </select>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={t('newCategoryName')}
                  className="border border-gray-300"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                />
                <Button type="button" onClick={handleAddCategory} size="sm" className="bg-blue-500 hover:bg-blue-600">
                  {t('add')}
                </Button>
                <Button type="button" onClick={() => setShowAddCategory(false)} size="sm" variant="outline">
                  {t('cancel')}
                </Button>
              </div>
            )}
            <FieldError message={createErrors.category} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subcategory">{t('subcategory')}</Label>
            {!showAddSubcategory ? (
              <select
                id="subcategory"
                value={formData.subcategory}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setShowAddSubcategory(true);
                  } else {
                    setFormData({ ...formData, subcategory: e.target.value });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.category || showAddCategory}
              >
                <option value="">{t('selectSubcategory')}</option>
                {formData.category && getSubcategories(formData.category).map(subcat => (
                  <option key={subcat} value={subcat}>{subcat}</option>
                ))}
                {formData.category && (
                  <option value="__add_new__" className="text-blue-600 font-medium">
                    + {t('addNewSubcategory')}
                  </option>
                )}
              </select>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  placeholder="e.g. Sub A, Sub B, Sub C"
                  className="border border-gray-300"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubcategory())}
                />
                <Button type="button" onClick={handleAddSubcategory} size="sm" className="bg-blue-500 hover:bg-blue-600">
                  {t('add')}
                </Button>
                <Button type="button" onClick={() => setShowAddSubcategory(false)} size="sm" variant="outline">
                  {t('cancel')}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">{t('description')}</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t('productDescription')}
            rows={3}
            className="border border-gray-300"
          />
        </div>

        {/* Pricing */}
      

        {/* Stock Information */}
        <div className="grid grid-cols-2 gap-4">
         

          <div className="space-y-2">
            <Label htmlFor="unit">{t('unit')} *</Label>
            {!showAddUnit ? (
              <select
                id="unit"
                value={formData.unit}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setShowAddUnit(true);
                  } else {
                    setFormData({ ...formData, unit: e.target.value });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
                <option value="__add_new__" className="text-blue-600 font-medium">
                  + {t('addNewUnit')}
                </option>
              </select>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder={t('newUnitName')}
                  className="border border-gray-300"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUnit())}
                />
                <Button type="button" onClick={handleAddUnit} size="sm" className="bg-blue-500 hover:bg-blue-600">
                  {t('add')}
                </Button>
                <Button type="button" onClick={() => setShowAddUnit(false)} size="sm" variant="outline">
                  {t('cancel')}
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
          <Label htmlFor="status">{t('status')} *</Label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'discontinued' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">{t('active')}</option>
            <option value="inactive">{t('inactive')}</option>
            <option value="discontinued">{t('discontinued')}</option>
          </select>
        </div>
        </div>

        {/* Status */}
        

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
            {t('saveProduct')}
          </Button>
        </div>
      </div>
    </form>
  );
}

// CreateCategoryForm Component
function CreateCategoryForm({ 
  onClose, 
  onSave 
}: { 
  onClose: () => void; 
  onSave: (data: { name: string; subcategories: string[] }) => void;
}) {
  const { t } = useI18n();
  const [categoryName, setCategoryName] = useState('');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [newSubcategory, setNewSubcategory] = useState('');

  const handleAddSubcategory = () => {
    // Support comma-separated subcategories: "Men's Shoes, Women's Shoes, Sports Shoes"
    const parts = newSubcategory.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const unique = parts.filter(p => !subcategories.includes(p));
    if (unique.length > 0) {
      setSubcategories([...subcategories, ...unique]);
    }
    setNewSubcategory('');
  };

  const handleRemoveSubcategory = (index: number) => {
    setSubcategories(subcategories.filter((_, i) => i !== index));
  };

  const [catErrors, setCatErrors] = useState<ValidationErrors>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFields({ categoryName }, {
      categoryName: { required: true, min: 2, label: 'Category Name' },
    });
    if (Object.keys(errors).length) { setCatErrors(errors); return; }
    if (categoryName.trim()) {
      // Include any pending subcategories the user typed but didn't click "+" for
      const finalSubcategories = [...subcategories];
      const pending = newSubcategory.split(',').map(s => s.trim()).filter(Boolean);
      pending.forEach(p => {
        if (!finalSubcategories.includes(p)) finalSubcategories.push(p);
      });
      onSave({
        name: categoryName.trim(),
        subcategories: finalSubcategories
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 py-2">
        {/* Category Name */}
        <div className="space-y-2">
          <Label htmlFor="categoryName">{t('categoryName')} *</Label>
          <Input 
            id="categoryName" 
            value={categoryName}
            onChange={(e) => { setCategoryName(e.target.value); setCatErrors(prev => ({ ...prev, categoryName: '' })); }}
            placeholder={t('enterCategoryName')} 
            className="border border-gray-300" 
          />
          <FieldError message={catErrors.categoryName} />
        </div>

        {/* Subcategories */}
        <div className="space-y-2">
          <Label>{t('subcategories')}</Label>
          <div className="flex gap-2">
            <Input 
              value={newSubcategory}
              onChange={(e) => setNewSubcategory(e.target.value)}
              placeholder="e.g. Men's Shoes, Women's Shoes, Sports Shoes" 
              className="border border-gray-300"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubcategory();
                }
              }}
            />
            <Button type="button" onClick={handleAddSubcategory} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Subcategories List */}
          {subcategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {subcategories.map((subcat, index) => (
                <Badge 
                  key={index} 
                  className="bg-blue-100 text-blue-700 px-3 py-1 flex items-center gap-1"
                >
                  {subcat}
                  <button
                    type="button"
                    onClick={() => handleRemoveSubcategory(index)}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
            {t('saveCategory')}
          </Button>
        </div>
      </div>
    </form>
  );
}
