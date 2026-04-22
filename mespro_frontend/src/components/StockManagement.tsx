import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { translations, Language } from '../translations';

interface StockManagementProps {
  language?: Language;
}
import { 
  Boxes, 
  Search, 
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { Badge } from './ui/badge';

import { stockService } from '../services/stock.service';
import { productsService } from '../services/products.service';
import { vendorsService } from '../services/vendors.service';
import { useSharedState } from '../contexts/SharedStateContext';
export default function StockManagement({ language = 'en' }: StockManagementProps) {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddStock, setShowAddStock] = useState(false);
  const [showEditStock, setShowEditStock] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [stockForm, setStockForm] = useState({
    name: '',
    category: '',
    subcategory: '',
    sku: '',
    hsn_sac: '',
    gst_rate: '18',
    current_stock: '',
    reorder_level: '',
    unit: 'pieces',
    buying_price: '',
    selling_price: '',
    supplier: '',
    description: '',
    brand: '',
    location: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Get categories from shared state (DB-backed)
  const { productCategories } = useSharedState();
  const subcategoriesByCategory: Record<string, string[]> = {};
  productCategories.forEach(cat => {
    subcategoriesByCategory[cat.name] = cat.subcategories || [];
  });

  const baseUnits = ['pieces', 'kits', 'rolls', 'bottles', 'boxes', 'sets', 'meters', 'kg', 'pcs', 'sqft', 'meter', 'set'];
  // Map product units to stock-friendly units
  const unitMapping: Record<string, string> = {
    'pcs': 'pcs',
    'pieces': 'pieces',
    'sqft': 'sqft',
    'meter': 'meter',
    'meters': 'meters',
    'kg': 'kg',
    'set': 'set',
    'sets': 'sets',
    'kits': 'kits',
    'rolls': 'rolls',
    'bottles': 'bottles',
    'boxes': 'boxes',
  };
  const mapUnit = (u: string) => unitMapping[u?.toLowerCase()] || u || 'pieces';
  // Build dynamic units list that always includes the selected unit
  const units = [...new Set([...baseUnits, stockForm.unit].filter(Boolean))];
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isFromProduct, setIsFromProduct] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [stockItemSearchOpen, setStockItemSearchOpen] = useState(false);

  const resetStockForm = () => {
    setStockForm({
      name: '',
      category: '',
      subcategory: '',
      sku: '',
      hsn_sac: '',
      gst_rate: '18',
      current_stock: '',
      reorder_level: '',
      unit: 'pieces',
      buying_price: '',
      selling_price: '',
      supplier: '',
      description: '',
      brand: '',
      location: '',
    });
    setIsFromProduct(false);
    setSelectedItemId('');
  };

  const generateSKU = () => {
    if (stockForm.category && stockForm.name) {
      const catCode = stockForm.category.substring(0, 3).toUpperCase();
      const nameCode = stockForm.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 3);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${catCode}-${nameCode}-${random}`;
    }
    return '';
  };

  const handleAddStock = async () => {
    const validationErrors = validateFields(stockForm, {
      name: { required: true, min: 2 },
      sku: { required: true },
      category: { required: true },
      current_stock: { required: true, numeric: true, min: 0 },
      reorder_level: { required: true, numeric: true, min: 0 },
      unit: { required: true },
      buying_price: { numeric: true, min: 0 },
      selling_price: { required: true, numeric: true, min: 0 },
    });
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    try {
      const currentStock = Number(stockForm.current_stock) || 0;
      const reorderLevel = Number(stockForm.reorder_level) || 0;
      await stockService.createStockItem({
        name: stockForm.name,
        category: stockForm.category,
        subcategory: stockForm.subcategory,
        sku: stockForm.sku || generateSKU(),
        hsn_sac: stockForm.hsn_sac,
        gst_rate: Number(stockForm.gst_rate) || 0,
        current_stock: currentStock,
        reorder_level: reorderLevel,
        unit: stockForm.unit,
        unit_price: Number(stockForm.selling_price) || 0,
        buying_price: Number(stockForm.buying_price) || 0,
        selling_price: Number(stockForm.selling_price) || 0,
        supplier: stockForm.supplier,
        status: computeStatus(currentStock, reorderLevel),
      });
      toast.success('Stock item added successfully!');
      refreshStock();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add stock item');
    }
    setShowAddStock(false);
    resetStockForm();
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setStockForm({
      name: item.name || '',
      category: item.category || '',
      subcategory: item.subcategory || '',
      sku: item.sku || '',
      hsn_sac: item.hsn_sac || '',
      gst_rate: String(item.gst_rate ?? '18'),
      current_stock: String(item.current_stock || ''),
      reorder_level: String(item.reorder_level || ''),
      unit: item.unit || 'pieces',
      buying_price: String(item.buying_price || item.unit_price || ''),
      selling_price: String(item.selling_price || item.unit_price || ''),
      supplier: item.supplier || '',
      description: item.description || '',
      brand: item.brand || '',
      location: item.location || '',
    });
    setErrors({});
    setShowEditStock(true);
  };

  const handleUpdateStock = async () => {
    const validationErrors = validateFields(stockForm, {
      name: { required: true, min: 2 },
      sku: { required: true },
      category: { required: true },
      current_stock: { required: true, numeric: true, min: 0 },
      reorder_level: { required: true, numeric: true, min: 0 },
      unit: { required: true },
      buying_price: { numeric: true, min: 0 },
      selling_price: { required: true, numeric: true, min: 0 },
    });
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    try {
      const currentStock = Number(stockForm.current_stock) || 0;
      const reorderLevel = Number(stockForm.reorder_level) || 0;
      await stockService.updateStockItem(editingItem.id || editingItem._id, {
        name: stockForm.name,
        category: stockForm.category,
        subcategory: stockForm.subcategory,
        sku: stockForm.sku,
        hsn_sac: stockForm.hsn_sac,
        gst_rate: Number(stockForm.gst_rate) || 0,
        current_stock: currentStock,
        reorder_level: reorderLevel,
        unit: stockForm.unit,
        unit_price: Number(stockForm.selling_price) || 0,
        buying_price: Number(stockForm.buying_price) || 0,
        selling_price: Number(stockForm.selling_price) || 0,
        supplier: stockForm.supplier,
        status: computeStatus(currentStock, reorderLevel),
      });
      toast.success(t('stockItemUpdated'));
      refreshStock();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stock item');
    }
    setShowEditStock(false);
    setEditingItem(null);
    resetStockForm();
  };

  const handleDeleteClick = (item: any) => {
    setDeletingItem(item);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      await stockService.deleteStockItem(deletingItem.id || deletingItem._id);
      toast.success(t('stockItemDeleted'));
      refreshStock();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete stock item');
    }
    setShowDeleteConfirm(false);
    setDeletingItem(null);
  };

  const handleViewClick = (item: any) => {
    setViewingItem(item);
  };

  const computeStatus = (currentStock: number, reorderLevel: number): string => {
    if (currentStock <= 0) return 'Out of Stock';
    if (currentStock <= reorderLevel * 0.5) return 'Critical';
    if (currentStock <= reorderLevel) return 'Low Stock';
    return 'In Stock';
  };

  const [stockItems, setStockItems] = useState<any[]>([]);

  const refreshStock = () => {
    stockService.getStockItems().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      const itemsWithStatus = items.map((item: any) => ({
        ...item,
        status: item.status || computeStatus(Number(item.current_stock), Number(item.reorder_level)),
      }));
      setStockItems(itemsWithStatus);
    }).catch(() => {});
    // Also refresh dropdown items
    refreshDropdownItems();
  };

  const refreshDropdownItems = () => {
    Promise.all([
      productsService.getProducts().catch(() => []),
      stockService.getAllStockItems().catch(() => []),
    ]).then(([prodData, stockData]) => {
      const prods = Array.isArray(prodData) ? prodData : (prodData as any)?.items || [];
      const stocks = Array.isArray(stockData) ? stockData : (stockData as any)?.items || [];
      const normalizedStocks = stocks.map((s: any) => ({
        id: s.id || s._id,
        name: s.name || '',
        sku: s.sku || '',
        hsn_sac: s.hsn_sac || '',
        category: s.category || '',
        subcategory: s.subcategory || '',
        unit: s.unit || 'pieces',
        base_price: Number(s.buying_price) || Number(s.unit_price) || 0,
        selling_price: Number(s.selling_price) || Number(s.unit_price) || 0,
        _src: 'stock',
      }));
      const normalizedProds = prods.map((p: any) => ({
        id: p.id || p._id,
        name: p.name || '',
        sku: p.sku || '',
        hsn_code: p.hsn_code || '',
        category: p.category || '',
        subcategory: p.subcategory || '',
        unit: p.unit || 'pcs',
        base_price: Number(p.base_price) || 0,
        selling_price: Number(p.selling_price) || 0,
        _src: 'product',
      }));
      const seen = new Set(normalizedProds.map((p: any) => `${p.name}||${p.sku}`));
      const uniqueStocks = normalizedStocks.filter((s: any) => !seen.has(`${s.name}||${s.sku}`));
      setAllProducts([...normalizedProds, ...uniqueStocks]);
    });
  };

  useEffect(() => {
    refreshStock();
    // Fetch suppliers/vendors from DB
    vendorsService.getVendors()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        const names = list.map((v: any) => v.company_name || v.name || '').filter(Boolean);
        setSuppliers([...new Set(names)] as string[]);
      })
      .catch(() => {});
  }, []);

  // Derive categories from shared state + any categories already on stock items
  const dbCategoryNames = productCategories.map(c => c.name);
  const stockCategoryNames = [...new Set(stockItems.map(i => i.category).filter(Boolean))];
  const allCategoryNames = [...new Set([...dbCategoryNames, ...stockCategoryNames])];
  const categories = ['all', ...allCategoryNames];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'bg-emerald-100 text-emerald-700';
      case 'Low Stock': return 'bg-amber-100 text-amber-700';
      case 'Critical': return 'bg-red-100 text-red-700';
      case 'Out of Stock': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const normalizeCategoryToken = (value: string) =>
    String(value || '').trim().toLowerCase().replace(/\s+/g, '-');

  const getCategoryDisplayName = (value: string) =>
    productCategories.find(c => c.id === value || c.name === value)?.name || value;

  const makeItemKey = (item: any) =>
    `${String(item?.name || '').trim().toLowerCase()}||${String(item?.sku || '').trim().toLowerCase()}`;

  const stockListItems = useMemo(() => {
    const normalizedStockRows = stockItems.map((item: any) => {
      const currentStock = Number(item.current_stock) || 0;
      const reorderLevel = Number(item.reorder_level) || 0;
      return {
        ...item,
        id: item.id || item._id,
        current_stock: currentStock,
        reorder_level: reorderLevel,
        unit: item.unit || 'pieces',
        unit_price: Number(item.unit_price) || Number(item.selling_price) || 0,
        buying_price: Number(item.buying_price) || Number(item.unit_price) || 0,
        selling_price: Number(item.selling_price) || Number(item.unit_price) || 0,
        status: item.status || computeStatus(currentStock, reorderLevel),
        _src: 'stock',
      };
    });

    const stockMap = new Map<string, any>();
    normalizedStockRows.forEach((row: any) => stockMap.set(makeItemKey(row), row));

    const merged: any[] = [];
    const consumed = new Set<string>();

    allProducts.forEach((p: any) => {
      const key = makeItemKey(p);
      const stockRow = stockMap.get(key);
      if (stockRow) {
        merged.push({
          ...stockRow,
          category: getCategoryDisplayName(stockRow.category || p.category || ''),
          subcategory: stockRow.subcategory || p.subcategory || '',
          unit: stockRow.unit || p.unit || 'pieces',
          unit_price: Number(stockRow.unit_price) || Number(p.selling_price) || Number(p.unit_price) || 0,
          selling_price: Number(stockRow.selling_price) || Number(p.selling_price) || Number(p.unit_price) || 0,
          buying_price: Number(stockRow.buying_price) || Number(p.base_price) || 0,
          _src: 'stock',
        });
        consumed.add(key);
      } else {
        merged.push({
          id: `PRODUCT-${p.id || p._id || key}`,
          name: p.name || '',
          sku: p.sku || '',
          category: getCategoryDisplayName(p.category || ''),
          subcategory: p.subcategory || '',
          current_stock: 0,
          reorder_level: 0,
          unit: p.unit || 'pieces',
          unit_price: Number(p.selling_price) || Number(p.unit_price) || 0,
          buying_price: Number(p.base_price) || 0,
          selling_price: Number(p.selling_price) || Number(p.unit_price) || 0,
          supplier: '',
          status: 'Not Added',
          _src: 'product',
        });
      }
    });

    normalizedStockRows.forEach((row: any) => {
      const key = makeItemKey(row);
      if (!consumed.has(key)) merged.push(row);
    });

    return merged.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [stockItems, allProducts, productCategories]);

  const openAddStockPrefilled = (item: any) => {
    setShowAddStock(true);
    setErrors({});
    setIsFromProduct(false);
    setSelectedItemId('');
    setStockForm({
      name: item.name || '',
      category: item.category || '',
      subcategory: item.subcategory || '',
      sku: item.sku || '',
      hsn_sac: item.hsn_sac || '',
      gst_rate: String(item.gst_rate ?? '18'),
      current_stock: '',
      reorder_level: '',
      unit: mapUnit(item.unit || 'pieces'),
      buying_price: String(item.buying_price || item.unit_price || ''),
      selling_price: String(item.selling_price || item.unit_price || ''),
      supplier: item.supplier || '',
      description: item.description || '',
      brand: item.brand || '',
      location: item.location || '',
    });
  };

  const filteredStock = stockListItems.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.supplier || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' ||
      normalizeCategoryToken(item.category) === normalizeCategoryToken(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const totalValue = stockListItems.reduce((sum, item) => sum + (Number(item.current_stock) * Number(item.unit_price)), 0);
  const lowStockCount = stockListItems.filter(item => item.status === 'Low Stock' || item.status === 'Critical').length;
  const totalItems = stockListItems.reduce((sum, item) => sum + Number(item.current_stock), 0);

  // Full-screen Add Stock Form - Billing-style compact layout
  if (showAddStock) {
    const margin = Number(stockForm.selling_price || 0) - Number(stockForm.buying_price || 0);
    const marginPct = Number(stockForm.buying_price) > 0 ? ((margin / Number(stockForm.buying_price)) * 100).toFixed(1) : '0';
    const stockValue = Number(stockForm.current_stock || 0) * Number(stockForm.selling_price || 0);

    return (
      <div className="p-4 space-y-4 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setShowAddStock(false); resetStockForm(); setErrors({}); }}>
            ← {t('back')}
          </Button>
          <h1 className="text-xl font-bold">{t('addNewStockItem')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Item Details + Classification */}
          <div className="lg:col-span-2 space-y-4">
            {/* Item Details Card */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <Package className="w-4 h-4" /> Item Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {/* Item Name */}
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">{t('itemName')} *</Label>
                    {allProducts.length > 0 && !isFromProduct ? (
                      <div className="relative">
                        <Input
                          type="text"
                          value={stockForm.name}
                          onChange={(e) => { setStockForm({...stockForm, name: e.target.value}); setErrors(prev => ({...prev, name: ''})); }}
                          onFocus={() => setStockItemSearchOpen(true)}
                          onBlur={() => setTimeout(() => setStockItemSearchOpen(false), 200)}
                          placeholder="Search or type item name..."
                          className="h-8 text-sm"
                        />
                        {stockItemSearchOpen && stockForm.name && (
                          <div className="absolute z-50 w-full mt-0.5 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {allProducts.filter(p => p.name.toLowerCase().includes(stockForm.name.toLowerCase())).map((p, idx) => (
                              <div key={idx} className="px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 border-b border-gray-50" onMouseDown={() => {
                                const catObj = productCategories.find(c => c.id === p.category || c.name === p.category);
                                const categoryName = catObj?.name || p.category || '';
                                setStockForm({...stockForm, name: p.name, category: categoryName, subcategory: p.subcategory || '', sku: p.sku || '', hsn_sac: p.hsn_code || p.hsn_sac || '', unit: mapUnit(p.unit), selling_price: String(p.selling_price || ''), buying_price: String(p.base_price || '')});
                                setIsFromProduct(true);
                                setSelectedItemId(String(idx));
                                setErrors(prev => ({...prev, name: '', category: ''}));
                              }}>
                                <div className="font-medium">{p.name}</div>
                                <div className="text-[10px] text-gray-500">{p.sku ? `SKU: ${p.sku}` : ''} {p.category ? `• ${p.category}` : ''}</div>
                              </div>
                            ))}
                            {allProducts.filter(p => p.name.toLowerCase().includes(stockForm.name.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-xs text-gray-500 text-center">No matching products - will add as new item</div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <Input value={stockForm.name} readOnly={isFromProduct} onChange={(e) => { setStockForm({...stockForm, name: e.target.value}); setErrors(prev => ({...prev, name: ''})); }} placeholder="Enter item name" className={`h-8 text-sm ${isFromProduct ? 'bg-gray-50' : ''}`} />
                        {isFromProduct && <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-blue-600" onClick={() => { setIsFromProduct(false); setSelectedItemId(''); }}>Change</Button>}
                      </div>
                    )}
                    {isFromProduct && <p className="text-[10px] text-emerald-600 mt-0.5">✓ Auto-filled from existing product</p>}
                    <FieldError message={errors.name} />
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">Description</Label>
                    <Input value={stockForm.description} onChange={(e) => setStockForm({...stockForm, description: e.target.value})} placeholder="Brief item description..." className="h-8 text-sm" />
                  </div>

                  {/* SKU */}
                  <div>
                    <Label className="text-xs text-gray-500">{t('skuCode')} *</Label>
                    <div className="flex gap-1">
                      <Input value={stockForm.sku} onChange={(e) => { setStockForm({...stockForm, sku: e.target.value}); setErrors(prev => ({...prev, sku: ''})); }} placeholder="ACC-MRK-001" className={`h-8 text-sm font-mono ${isFromProduct ? 'bg-gray-50' : ''}`} readOnly={isFromProduct} />
                      {!isFromProduct && <Button type="button" variant="outline" size="sm" className="h-8 text-xs px-2" onClick={() => setStockForm({...stockForm, sku: generateSKU()})}>Auto</Button>}
                    </div>
                    <FieldError message={errors.sku} />
                  </div>

                  {/* Brand */}
                  <div>
                    <Label className="text-xs text-gray-500">Brand</Label>
                    <Input value={stockForm.brand} onChange={(e) => setStockForm({...stockForm, brand: e.target.value})} placeholder="Brand name" className="h-8 text-sm" />
                  </div>

                  {/* HSN/SAC */}
                  <div>
                    <Label className="text-xs text-gray-500">HSN/SAC Code</Label>
                    <Input value={stockForm.hsn_sac} onChange={(e) => setStockForm({...stockForm, hsn_sac: e.target.value})} placeholder="e.g. 39261019" className="h-8 text-sm font-mono" maxLength={20} />
                  </div>

                  {/* GST Rate */}
                  <div>
                    <Label className="text-xs text-gray-500">GST Rate (%)</Label>
                    <select value={stockForm.gst_rate} onChange={(e) => setStockForm({...stockForm, gst_rate: e.target.value})} className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm">
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Classification Card */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <Boxes className="w-4 h-4" /> Classification
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {/* Category */}
                  <div>
                    <Label className="text-xs text-gray-500">{t('category')} *</Label>
                    {isFromProduct ? (
                      <Input value={stockForm.category} readOnly className="h-8 text-sm bg-gray-50" />
                    ) : (
                      <select value={stockForm.category} onChange={(e) => { setStockForm({...stockForm, category: e.target.value, subcategory: ''}); setErrors(prev => ({...prev, category: ''})); }} className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm">
                        <option value="">Select category</option>
                        {categories.filter(c => c !== 'all').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    )}
                    <FieldError message={errors.category} />
                  </div>

                  {/* Subcategory */}
                  <div>
                    <Label className="text-xs text-gray-500">{t('subcategory')}</Label>
                    {isFromProduct ? (
                      <Input value={stockForm.subcategory} readOnly className="h-8 text-sm bg-gray-50" />
                    ) : (
                      <select value={stockForm.subcategory} onChange={(e) => setStockForm({...stockForm, subcategory: e.target.value})} disabled={!stockForm.category} className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50">
                        <option value="">Select subcategory</option>
                        {(subcategoriesByCategory[stockForm.category] || []).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Supplier */}
                  <div>
                    <Label className="text-xs text-gray-500">{t('supplier')}</Label>
                    <select value={stockForm.supplier} onChange={(e) => setStockForm({...stockForm, supplier: e.target.value})} className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm">
                      <option value="">Select supplier</option>
                      {suppliers.map(sup => <option key={sup} value={sup}>{sup}</option>)}
                    </select>
                  </div>

                  {/* Storage Location */}
                  <div>
                    <Label className="text-xs text-gray-500">Storage Location</Label>
                    <Input value={stockForm.location} onChange={(e) => setStockForm({...stockForm, location: e.target.value})} placeholder="e.g. Warehouse A, Rack 3" className="h-8 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock & Pricing Card */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Stock & Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                  {/* Current Stock */}
                  <div>
                    <Label className="text-xs text-gray-500">{t('currentStock')} *</Label>
                    <Input type="number" value={stockForm.current_stock} onChange={(e) => { setStockForm({...stockForm, current_stock: e.target.value}); setErrors(prev => ({...prev, current_stock: ''})); }} onKeyDown={blockInvalidNumberKeys} placeholder="0" className="h-8 text-sm" />
                    <FieldError message={errors.current_stock} />
                  </div>

                  {/* Reorder Level */}
                  <div>
                    <Label className="text-xs text-gray-500">{t('reorderLevel')} *</Label>
                    <Input type="number" value={stockForm.reorder_level} onChange={(e) => { setStockForm({...stockForm, reorder_level: e.target.value}); setErrors(prev => ({...prev, reorder_level: ''})); }} onKeyDown={blockInvalidNumberKeys} placeholder="0" className="h-8 text-sm" />
                    <FieldError message={errors.reorder_level} />
                  </div>

                  {/* Unit */}
                  <div>
                    <Label className="text-xs text-gray-500">{t('unit')} *</Label>
                    <select value={stockForm.unit} onChange={(e) => { setStockForm({...stockForm, unit: e.target.value}); setErrors(prev => ({...prev, unit: ''})); }} disabled={isFromProduct} className={`w-full h-8 px-2 border border-gray-300 rounded-md text-sm ${isFromProduct ? 'bg-gray-50' : ''}`}>
                      {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                    <FieldError message={errors.unit} />
                  </div>

                  {/* Buying Price */}
                  <div>
                    <Label className="text-xs text-gray-500">{t('buyingPrice')}</Label>
                    <Input type="number" value={stockForm.buying_price} onChange={(e) => { setStockForm({...stockForm, buying_price: e.target.value}); setErrors(prev => ({...prev, buying_price: ''})); }} onKeyDown={blockInvalidNumberKeys} placeholder="0.00" className="h-8 text-sm" />
                    <FieldError message={errors.buying_price} />
                  </div>

                  {/* Selling Price */}
                  <div>
                    <Label className="text-xs text-gray-500">{t('sellingPrice')} *</Label>
                    <Input type="number" value={stockForm.selling_price} onChange={(e) => { setStockForm({...stockForm, selling_price: e.target.value}); setErrors(prev => ({...prev, selling_price: ''})); }} onKeyDown={blockInvalidNumberKeys} placeholder="0.00" className="h-8 text-sm" />
                    <FieldError message={errors.selling_price} />
                  </div>

                  {/* Margin Display */}
                  <div>
                    <Label className="text-xs text-gray-500">Margin</Label>
                    <div className={`h-8 flex items-center px-2 border rounded-md text-sm font-medium ${margin >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      ₹{margin.toLocaleString('en-IN')} ({marginPct}%)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Summary */}
          <div className="space-y-4">
            {/* Quick Summary */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Summary</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Item</span>
                    <span className="font-medium truncate ml-2">{stockForm.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SKU</span>
                    <span className="font-mono text-xs">{stockForm.sku || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category</span>
                    <span>{stockForm.category || '-'}</span>
                  </div>
                  {stockForm.subcategory && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subcategory</span>
                      <span>{stockForm.subcategory}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock Qty</span>
                      <span className="font-medium">{stockForm.current_stock || '0'} {stockForm.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">HSN/SAC</span>
                      <span className="font-mono text-xs">{stockForm.hsn_sac || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">GST</span>
                      <span>{stockForm.gst_rate}%</span>
                    </div>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Buying Price</span>
                      <span>₹{Number(stockForm.buying_price || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selling Price</span>
                      <span>₹{Number(stockForm.selling_price || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-2 mt-2">
                      <span>Stock Value</span>
                      <span className="text-blue-700">₹{stockValue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Preview */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Status Preview</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                {(() => {
                  const cs = Number(stockForm.current_stock || 0);
                  const rl = Number(stockForm.reorder_level || 0);
                  const status = computeStatus(cs, rl);
                  return (
                    <div className="text-center py-2">
                      <Badge className={`${getStatusColor(status)} text-sm px-3 py-1`}>{status}</Badge>
                      {status === 'Low Stock' && <p className="text-xs text-amber-600 mt-2">Stock is below reorder level</p>}
                      {status === 'Critical' && <p className="text-xs text-red-600 mt-2">Stock is critically low!</p>}
                      {status === 'Out of Stock' && <p className="text-xs text-gray-600 mt-2">No stock available</p>}
                      {status === 'In Stock' && <p className="text-xs text-emerald-600 mt-2">Stock is healthy</p>}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowAddStock(false); resetStockForm(); setErrors({}); }}>
            {t('cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleAddStock}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!stockForm.name || !stockForm.category || !stockForm.current_stock || !stockForm.reorder_level || !stockForm.selling_price}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('addStockItem')}
          </Button>
        </div>
      </div>
    );
  }

  // Full-screen View Stock Item Detail
  if (viewingItem) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewingItem(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">
            {t('viewStockItem')}
          </h2>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{viewingItem.name}</CardTitle>
              <Badge className={getStatusColor(viewingItem.status)}>{viewingItem.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-slate-500">{t('itemName')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">{viewingItem.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">{t('skuCode')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">{viewingItem.sku}</p>
                </div>
                {viewingItem.hsn_sac && (
                  <div>
                    <Label className="text-sm text-slate-500">HSN/SAC</Label>
                    <p className="text-base font-medium text-slate-900 mt-1">{viewingItem.hsn_sac}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm text-slate-500">GST Rate</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">{viewingItem.gst_rate ?? 18}%</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">{t('category')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">
                    <Badge variant="outline">{viewingItem.category}</Badge>
                  </p>
                </div>
                {viewingItem.subcategory && (
                  <div>
                    <Label className="text-sm text-slate-500">{t('subcategory')}</Label>
                    <p className="text-base font-medium text-slate-900 mt-1">{viewingItem.subcategory}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm text-slate-500">{t('supplier')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">{viewingItem.supplier || '-'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-slate-500">{t('currentStock')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">{viewingItem.current_stock} {viewingItem.unit}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">{t('reorderLevel')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">{viewingItem.reorder_level} {viewingItem.unit}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">{t('buyingPrice')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">{formatCurrency(viewingItem.buying_price || viewingItem.unit_price || 0)}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">{t('sellingPrice')}</Label>
                  <p className="text-base font-medium text-slate-900 mt-1">{formatCurrency(viewingItem.selling_price || viewingItem.unit_price || 0)}</p>
                </div>
                {viewingItem.last_restocked && (
                  <div>
                    <Label className="text-sm text-slate-500">{t('lastRestocked')}</Label>
                    <p className="text-base font-medium text-slate-900 mt-1">{viewingItem.last_restocked}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setViewingItem(null)}>
                {t('back')}
              </Button>
              <Button 
                onClick={() => { setViewingItem(null); handleEditClick(viewingItem); }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('edit')}
              </Button>
              <Button 
                onClick={() => { setViewingItem(null); handleDeleteClick(viewingItem); }}
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

  // Full-screen Edit Stock Form - Billing-style compact layout
  if (showEditStock && editingItem) {
    const margin = Number(stockForm.selling_price || 0) - Number(stockForm.buying_price || 0);
    const marginPct = Number(stockForm.buying_price) > 0 ? ((margin / Number(stockForm.buying_price)) * 100).toFixed(1) : '0';
    const stockValue = Number(stockForm.current_stock || 0) * Number(stockForm.selling_price || 0);

    return (
      <div className="p-4 space-y-4 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setShowEditStock(false); setEditingItem(null); resetStockForm(); setErrors({}); }}>
            ← {t('back')}
          </Button>
          <h1 className="text-xl font-bold">{t('editStockItem')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Item Details Card */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <Package className="w-4 h-4" /> Item Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">{t('itemName')} *</Label>
                    <Input value={stockForm.name} onChange={(e) => { setStockForm({...stockForm, name: e.target.value}); setErrors(prev => ({...prev, name: ''})); }} placeholder="Enter item name" className="h-8 text-sm" />
                    <FieldError message={errors.name} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">Description</Label>
                    <Input value={stockForm.description} onChange={(e) => setStockForm({...stockForm, description: e.target.value})} placeholder="Brief item description..." className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('skuCode')} *</Label>
                    <div className="flex gap-1">
                      <Input value={stockForm.sku} onChange={(e) => { setStockForm({...stockForm, sku: e.target.value}); setErrors(prev => ({...prev, sku: ''})); }} placeholder="ACC-MRK-001" className="h-8 text-sm font-mono" />
                      <Button type="button" variant="outline" size="sm" className="h-8 text-xs px-2" onClick={() => setStockForm({...stockForm, sku: generateSKU()})}>Auto</Button>
                    </div>
                    <FieldError message={errors.sku} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Brand</Label>
                    <Input value={stockForm.brand} onChange={(e) => setStockForm({...stockForm, brand: e.target.value})} placeholder="Brand name" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">HSN/SAC Code</Label>
                    <Input value={stockForm.hsn_sac} onChange={(e) => setStockForm({...stockForm, hsn_sac: e.target.value})} placeholder="e.g. 39261019" className="h-8 text-sm font-mono" maxLength={20} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">GST Rate (%)</Label>
                    <select value={stockForm.gst_rate} onChange={(e) => setStockForm({...stockForm, gst_rate: e.target.value})} className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm">
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Classification Card */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <Boxes className="w-4 h-4" /> Classification
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div>
                    <Label className="text-xs text-gray-500">{t('category')} *</Label>
                    <select value={stockForm.category} onChange={(e) => { setStockForm({...stockForm, category: e.target.value, subcategory: ''}); setErrors(prev => ({...prev, category: ''})); }} className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm">
                      <option value="">Select category</option>
                      {categories.filter(c => c !== 'all').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <FieldError message={errors.category} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('subcategory')}</Label>
                    <select value={stockForm.subcategory} onChange={(e) => setStockForm({...stockForm, subcategory: e.target.value})} disabled={!stockForm.category} className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50">
                      <option value="">Select subcategory</option>
                      {(subcategoriesByCategory[stockForm.category] || []).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('supplier')}</Label>
                    <select value={stockForm.supplier} onChange={(e) => setStockForm({...stockForm, supplier: e.target.value})} className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm">
                      <option value="">Select supplier</option>
                      {suppliers.map(sup => <option key={sup} value={sup}>{sup}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Storage Location</Label>
                    <Input value={stockForm.location} onChange={(e) => setStockForm({...stockForm, location: e.target.value})} placeholder="e.g. Warehouse A, Rack 3" className="h-8 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock & Pricing Card */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Stock & Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                  <div>
                    <Label className="text-xs text-gray-500">{t('currentStock')} *</Label>
                    <Input type="number" value={stockForm.current_stock} onChange={(e) => { setStockForm({...stockForm, current_stock: e.target.value}); setErrors(prev => ({...prev, current_stock: ''})); }} onKeyDown={blockInvalidNumberKeys} placeholder="0" className="h-8 text-sm" />
                    <FieldError message={errors.current_stock} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('reorderLevel')} *</Label>
                    <Input type="number" value={stockForm.reorder_level} onChange={(e) => { setStockForm({...stockForm, reorder_level: e.target.value}); setErrors(prev => ({...prev, reorder_level: ''})); }} onKeyDown={blockInvalidNumberKeys} placeholder="0" className="h-8 text-sm" />
                    <FieldError message={errors.reorder_level} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('unit')} *</Label>
                    <select value={stockForm.unit} onChange={(e) => { setStockForm({...stockForm, unit: e.target.value}); setErrors(prev => ({...prev, unit: ''})); }} className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm">
                      {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                    <FieldError message={errors.unit} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('buyingPrice')}</Label>
                    <Input type="number" value={stockForm.buying_price} onChange={(e) => { setStockForm({...stockForm, buying_price: e.target.value}); setErrors(prev => ({...prev, buying_price: ''})); }} onKeyDown={blockInvalidNumberKeys} placeholder="0.00" className="h-8 text-sm" />
                    <FieldError message={errors.buying_price} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('sellingPrice')} *</Label>
                    <Input type="number" value={stockForm.selling_price} onChange={(e) => { setStockForm({...stockForm, selling_price: e.target.value}); setErrors(prev => ({...prev, selling_price: ''})); }} onKeyDown={blockInvalidNumberKeys} placeholder="0.00" className="h-8 text-sm" />
                    <FieldError message={errors.selling_price} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Margin</Label>
                    <div className={`h-8 flex items-center px-2 border rounded-md text-sm font-medium ${margin >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      ₹{margin.toLocaleString('en-IN')} ({marginPct}%)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Summary */}
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Summary</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Item</span><span className="font-medium truncate ml-2">{stockForm.name || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">SKU</span><span className="font-mono text-xs">{stockForm.sku || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Category</span><span>{stockForm.category || '-'}</span></div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between"><span className="text-gray-600">Stock Qty</span><span className="font-medium">{stockForm.current_stock || '0'} {stockForm.unit}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">GST</span><span>{stockForm.gst_rate}%</span></div>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between"><span className="text-gray-600">Buying Price</span><span>₹{Number(stockForm.buying_price || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Selling Price</span><span>₹{Number(stockForm.selling_price || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-2 mt-2">
                      <span>Stock Value</span><span className="text-blue-700">₹{stockValue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Status Preview</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                {(() => {
                  const cs = Number(stockForm.current_stock || 0);
                  const rl = Number(stockForm.reorder_level || 0);
                  const status = computeStatus(cs, rl);
                  return (
                    <div className="text-center py-2">
                      <Badge className={`${getStatusColor(status)} text-sm px-3 py-1`}>{status}</Badge>
                      {status === 'Low Stock' && <p className="text-xs text-amber-600 mt-2">Stock is below reorder level</p>}
                      {status === 'Critical' && <p className="text-xs text-red-600 mt-2">Stock is critically low!</p>}
                      {status === 'Out of Stock' && <p className="text-xs text-gray-600 mt-2">No stock available</p>}
                      {status === 'In Stock' && <p className="text-xs text-emerald-600 mt-2">Stock is healthy</p>}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowEditStock(false); setEditingItem(null); resetStockForm(); setErrors({}); }}>
            {t('cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleUpdateStock}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!stockForm.name || !stockForm.category || !stockForm.current_stock || !stockForm.reorder_level || !stockForm.buying_price || !stockForm.selling_price}
          >
            <Edit className="w-4 h-4 mr-1" />
            {t('updateStockItem')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-2 pb-4 flex flex-col gap-3 overflow-hidden" style={{ height: 'calc(100dvh - 72px)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl text-slate-900 font-bold leading-tight">{t('stockManagement')}</h2>
          <p className="text-sm text-slate-600">{t('manageStock')}</p>
        </div>
       
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-600 font-medium">{t('totalStockValue')}</span>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl text-slate-900 font-bold">{formatCurrency(totalValue)}</p>
          {totalValue > 0 && (
            <p className="text-xs text-slate-500">{t('totalStockValue')}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-600 font-medium">{t('totalItems')}</span>
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Boxes className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl text-slate-900 font-bold">{totalItems}</p>
          <p className="text-xs text-slate-600">{stockListItems.length} SKUs</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-600 font-medium">{t('lowStockAlerts')}</span>
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl text-slate-900 font-bold">{lowStockCount}</p>
          <p className="text-xs text-amber-600">{t('needReordering')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-600 font-medium">{t('category')}</span>
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl text-slate-900 font-bold">{categories.length - 1}</p>
          <p className="text-xs text-slate-600">{t('stockCategories')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-600 font-medium">{t('totalProducts')}</span>
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl text-slate-900 font-bold">{stockListItems.length}</p>
          <p className="text-xs text-slate-600">{t('productsInStock')}</p>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <div className='flex items-center justify-between flex-shrink-0'>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder={t('searchByNameSku')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat === 'all' ? (t('allCategories')) : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-3">
        <Button 
          variant="outline"
          className="shadow-sm"
          onClick={() => navigate('/products')}
        >
          <Boxes className="w-4 h-4 mr-2" />
          Categories
        </Button>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
          onClick={() => setShowAddStock(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('addStockItem')}
        </Button>
      </div>
      </div>

      {/* Scrollable data area */}
      <div className="flex-1 min-h-0 overflow-auto space-y-6 pr-1">
      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Item Details</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Category</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Subcategory</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-slate-900">Current Stock</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-slate-900">Reorder Level</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-slate-900">Unit Price</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Status</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStock.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-sm text-slate-900 font-semibold">{item.name}</p>
                      <p className="text-xs text-slate-600">SKU: {item.sku}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant="outline">{item.category}</Badge>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-slate-700">{item.subcategory}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <p className="text-sm text-slate-900 font-semibold">{item.current_stock}</p>
                    <p className="text-xs text-slate-600">{item.unit}</p>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <p className="text-sm text-slate-700">{item.reorder_level}</p>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <p className="text-sm text-slate-900 font-medium">{formatCurrency(item.unit_price)}</p>
                  </td>
                  <td className="py-4 px-6">
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleViewClick(item)} title={t('view')}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {item._src === 'stock' ? (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditClick(item)} title={t('edit')}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteClick(item)} title={t('delete')}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => openAddStockPrefilled(item)} title={t('addStockItem')}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock Items Alert */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3 className="text-base text-slate-900 font-semibold">Items Requiring Reorder</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stockListItems.filter(item => item.status === 'Low Stock' || item.status === 'Critical').map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-lg border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-sm text-slate-900 font-semibold mb-1">{item.name}</h4>
                    <p className="text-xs text-slate-600">{item.sku}</p>
                  </div>
                  <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Current</span>
                    <span className={`font-semibold ${item.status === 'Critical' ? 'text-red-600' : 'text-amber-600'}`}>
                      {item.current_stock} {item.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Reorder at</span>
                    <span className="font-medium text-slate-700">{item.reorder_level} {item.unit}</span>
                  </div>
                  <Button size="sm" className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => navigate('/purchase-order', { state: { fromStock: true, item: { name: item.name, sku: item.sku, category: item.category, subcategory: item.subcategory, current_stock: item.current_stock, reorder_level: item.reorder_level, unit: item.unit, unit_price: item.unit_price, supplier: item.supplier } } })}>
                    Create Purchase Order
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Showing <span className="font-medium">{filteredStock.length}</span> of <span className="font-medium">{stockListItems.length}</span> items
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('deleteStockItem')}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-2">{t('confirmDeleteStock')}</p>
            <p className="text-sm font-medium text-slate-900 mb-6">
              {deletingItem.name} ({deletingItem.sku})
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeletingItem(null); }}>
                {t('cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('delete')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
