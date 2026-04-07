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
    current_stock: '',
    reorder_level: '',
    unit: 'pieces',
    buying_price: '',
    selling_price: '',
    supplier: ''
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

  const resetStockForm = () => {
    setStockForm({
      name: '',
      category: '',
      subcategory: '',
      sku: '',
      hsn_sac: '',
      current_stock: '',
      reorder_level: '',
      unit: 'pieces',
      buying_price: '',
      selling_price: '',
      supplier: ''
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
      buying_price: { required: true, numeric: true, min: 0 },
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
      current_stock: String(item.current_stock || ''),
      reorder_level: String(item.reorder_level || ''),
      unit: item.unit || 'pieces',
      buying_price: String(item.buying_price || item.unit_price || ''),
      selling_price: String(item.selling_price || item.unit_price || ''),
      supplier: item.supplier || ''
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
      buying_price: { required: true, numeric: true, min: 0 },
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
      current_stock: '',
      reorder_level: '',
      unit: mapUnit(item.unit || 'pieces'),
      buying_price: String(item.buying_price || item.unit_price || ''),
      selling_price: String(item.selling_price || item.unit_price || ''),
      supplier: item.supplier || ''
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

  // Full-screen Add Stock Form
  if (showAddStock) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowAddStock(false);
              resetStockForm();
              setErrors({});
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">
            {t('addNewStockItem')}
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('stockDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Item Name - Dropdown from products or manual entry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('itemName')} *</Label>
                {allProducts.length > 0 ? (
                  <>
                    <select
                      value={isFromProduct ? selectedItemId : '__manual__'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__manual__') {
                          setIsFromProduct(false);
                          setSelectedItemId('');
                          setStockForm({ ...stockForm, name: '', category: '', subcategory: '', sku: '', unit: 'pieces', buying_price: '', selling_price: '' });
                          setErrors(prev => ({ ...prev, name: '' }));
                          return;
                        }
                        const idx = Number(val);
                        const product = allProducts[idx];
                        if (product) {
                          setIsFromProduct(true);
                          setSelectedItemId(val);
                          const catObj = productCategories.find(c => c.id === product.category || c.name === product.category);
                          const categoryName = catObj?.name || product.category || '';
                          const mappedUnit = mapUnit(product.unit);
                          setStockForm({
                            ...stockForm,
                            name: product.name,
                            category: categoryName,
                            subcategory: product.subcategory || '',
                            sku: product.sku || '',
                            hsn_sac: product.hsn_code || product.hsn_sac || '',
                            unit: mappedUnit,
                            selling_price: String(product.selling_price || product.base_price || ''),
                            buying_price: String(product.base_price || ''),
                          });
                          setErrors(prev => ({ ...prev, name: '', category: '' }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="__manual__">{t('orEnterManually')}</option>
                      {allProducts.map((p: any, idx: number) => (
                        <option key={idx} value={String(idx)}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>
                      ))}
                    </select>
                    {!isFromProduct && (
                      <Input 
                        value={stockForm.name}
                        onChange={(e) => { setStockForm({...stockForm, name: e.target.value}); setErrors(prev => ({...prev, name: ''})); }}
                        placeholder={t('enterItemName')}
                        className="mt-2"
                      />
                    )}
                    {isFromProduct && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                        ✓ {t('autoFilledFromProduct')}
                      </p>
                    )}
                  </>
                ) : (
                  <Input 
                    value={stockForm.name}
                    onChange={(e) => { setStockForm({...stockForm, name: e.target.value}); setErrors(prev => ({...prev, name: ''})); }}
                    placeholder={t('enterItemName')}
                  />
                )}
                <FieldError message={errors.name} />
              </div>
              <div className="space-y-2">
                <Label>{t('skuCode')} *</Label>
                <div className="flex gap-2">
                  <Input 
                    value={stockForm.sku}
                    onChange={(e) => { setStockForm({...stockForm, sku: e.target.value}); setErrors(prev => ({...prev, sku: ''})); }}
                    placeholder="ACC-MRK-001"
                    readOnly={isFromProduct}
                    className={isFromProduct ? 'bg-gray-50' : ''}
                  />
                  {!isFromProduct && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setStockForm({...stockForm, sku: generateSKU()})}
                    >
                      {t('generate')}
                    </Button>
                  )}
                </div>
                {isFromProduct && <p className="text-xs text-slate-500">Auto-filled from product</p>}
                <FieldError message={errors.sku} />
              </div>
            </div>

            {/* HSN/SAC Code */}
            <div className="space-y-2">
              <Label>HSN/SAC Code</Label>
              <Input
                value={stockForm.hsn_sac}
                onChange={(e) => setStockForm({...stockForm, hsn_sac: e.target.value})}
                placeholder="e.g. 39261019"
                maxLength={20}
              />
            </div>

            {/* Category & Subcategory - auto-filled when product selected */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('category')} *</Label>
                {isFromProduct ? (
                  <>
                    <Input value={stockForm.category} readOnly className="bg-gray-50" />
                    <p className="text-xs text-slate-500">Auto-filled from product</p>
                  </>
                ) : (
                  <Select 
                    value={stockForm.category} 
                    onValueChange={(value: string) => { setStockForm({...stockForm, category: value, subcategory: ''}); setErrors(prev => ({...prev, category: ''})); }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c !== 'all').map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FieldError message={errors.category} />
              </div>
              <div className="space-y-2">
                <Label>{t('subcategory')}</Label>
                {isFromProduct ? (
                  <>
                    <Input value={stockForm.subcategory} readOnly className="bg-gray-50" />
                    <p className="text-xs text-slate-500">Auto-filled from product</p>
                  </>
                ) : (
                  <Select 
                    value={stockForm.subcategory} 
                    onValueChange={(value: string) => setStockForm({...stockForm, subcategory: value})}
                    disabled={!stockForm.category}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectSubcategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(subcategoriesByCategory[stockForm.category] || []).map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('currentStock')} *</Label>
                <Input 
                  type="number"
                  value={stockForm.current_stock}
                  onChange={(e) => { setStockForm({...stockForm, current_stock: e.target.value}); setErrors(prev => ({...prev, current_stock: ''})); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0"
                />
                <FieldError message={errors.current_stock} />
              </div>
              <div className="space-y-2">
                <Label>{t('reorderLevel')} *</Label>
                <Input 
                  type="number"
                  value={stockForm.reorder_level}
                  onChange={(e) => { setStockForm({...stockForm, reorder_level: e.target.value}); setErrors(prev => ({...prev, reorder_level: ''})); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0"
                />
                <FieldError message={errors.reorder_level} />
              </div>
              <div className="space-y-2">
                <Label>{t('unit')} *</Label>
                <Select 
                  value={stockForm.unit} 
                  onValueChange={(value: string) => { setStockForm({...stockForm, unit: value}); setErrors(prev => ({...prev, unit: ''})); }}
                  disabled={isFromProduct}
                >
                  <SelectTrigger className={isFromProduct ? 'bg-gray-50' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isFromProduct && <p className="text-xs text-slate-500">Auto-filled from product</p>}
                {errors.unit && <FieldError message={errors.unit} />}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('buyingPrice')} *</Label>
                <Input 
                  type="number"
                  value={stockForm.buying_price}
                  onChange={(e) => { setStockForm({...stockForm, buying_price: e.target.value}); setErrors(prev => ({...prev, buying_price: ''})); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0.00"
                />
                {isFromProduct && stockForm.buying_price && <p className="text-xs text-slate-500">Pre-filled from product base price</p>}
                <FieldError message={errors.buying_price} />
              </div>
              <div className="space-y-2">
                <Label>{t('sellingPrice')} *</Label>
                <Input 
                  type="number"
                  value={stockForm.selling_price}
                  onChange={(e) => { setStockForm({...stockForm, selling_price: e.target.value}); setErrors(prev => ({...prev, selling_price: ''})); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0.00"
                />
                {isFromProduct && stockForm.selling_price && <p className="text-xs text-slate-500">Pre-filled from product selling price</p>}
                <FieldError message={errors.selling_price} />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowAddStock(false);
                resetStockForm();
                setErrors({});
              }}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleAddStock} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!stockForm.name || !stockForm.category || !stockForm.current_stock || !stockForm.reorder_level || !stockForm.buying_price || !stockForm.selling_price}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('addStockItem')}
              </Button>
            </div>
          </CardContent>
        </Card>
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

  // Full-screen Edit Stock Form
  if (showEditStock && editingItem) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowEditStock(false);
              setEditingItem(null);
              resetStockForm();
              setErrors({});
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">
            {t('editStockItem')}
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('stockDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('itemName')} *</Label>
                <Input 
                  value={stockForm.name}
                  onChange={(e) => { setStockForm({...stockForm, name: e.target.value}); setErrors(prev => ({...prev, name: ''})); }}
                  placeholder={t('enterItemName')}
                />
                <FieldError message={errors.name} />
              </div>
              <div className="space-y-2">
                <Label>{t('skuCode')} *</Label>
                <div className="flex gap-2">
                  <Input 
                    value={stockForm.sku}
                    onChange={(e) => { setStockForm({...stockForm, sku: e.target.value}); setErrors(prev => ({...prev, sku: ''})); }}
                    placeholder="ACC-MRK-001"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setStockForm({...stockForm, sku: generateSKU()})}
                  >
                    {t('generate')}
                  </Button>
                </div>
                <FieldError message={errors.sku} />
              </div>
            </div>

            {/* HSN/SAC Code */}
            <div className="space-y-2">
              <Label>HSN/SAC Code</Label>
              <Input
                value={stockForm.hsn_sac}
                onChange={(e) => setStockForm({...stockForm, hsn_sac: e.target.value})}
                placeholder="e.g. 39261019"
                maxLength={20}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('category')} *</Label>
                <Select 
                  value={stockForm.category} 
                  onValueChange={(value: string) => { setStockForm({...stockForm, category: value, subcategory: ''}); setErrors(prev => ({...prev, category: ''})); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c !== 'all').map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.category} />
              </div>
              <div className="space-y-2">
                <Label>{t('subcategory')}</Label>
                <Select 
                  value={stockForm.subcategory} 
                  onValueChange={(value: string) => setStockForm({...stockForm, subcategory: value})}
                  disabled={!stockForm.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectSubcategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(subcategoriesByCategory[stockForm.category] || []).map((sub) => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('currentStock')} *</Label>
                <Input 
                  type="number"
                  value={stockForm.current_stock}
                  onChange={(e) => { setStockForm({...stockForm, current_stock: e.target.value}); setErrors(prev => ({...prev, current_stock: ''})); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0"
                />
                <FieldError message={errors.current_stock} />
              </div>
              <div className="space-y-2">
                <Label>{t('reorderLevel')} *</Label>
                <Input 
                  type="number"
                  value={stockForm.reorder_level}
                  onChange={(e) => { setStockForm({...stockForm, reorder_level: e.target.value}); setErrors(prev => ({...prev, reorder_level: ''})); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0"
                />
                <FieldError message={errors.reorder_level} />
              </div>
              <div className="space-y-2">
                <Label>{t('unit')} *</Label>
                <Select 
                  value={stockForm.unit} 
                  onValueChange={(value: string) => { setStockForm({...stockForm, unit: value}); setErrors(prev => ({...prev, unit: ''})); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && <FieldError message={errors.unit} />}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('buyingPrice')} *</Label>
                <Input 
                  type="number"
                  value={stockForm.buying_price}
                  onChange={(e) => { setStockForm({...stockForm, buying_price: e.target.value}); setErrors(prev => ({...prev, buying_price: ''})); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0.00"
                />
                <FieldError message={errors.buying_price} />
              </div>
              <div className="space-y-2">
                <Label>{t('sellingPrice')} *</Label>
                <Input 
                  type="number"
                  value={stockForm.selling_price}
                  onChange={(e) => { setStockForm({...stockForm, selling_price: e.target.value}); setErrors(prev => ({...prev, selling_price: ''})); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0.00"
                />
                <FieldError message={errors.selling_price} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('supplier')}</Label>
                <Select 
                  value={stockForm.supplier} 
                  onValueChange={(value: string) => setStockForm({...stockForm, supplier: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectSupplier')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((sup) => (
                      <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowEditStock(false);
                setEditingItem(null);
                resetStockForm();
                setErrors({});
              }}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleUpdateStock} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!stockForm.name || !stockForm.category || !stockForm.current_stock || !stockForm.reorder_level || !stockForm.buying_price || !stockForm.selling_price}
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('updateStockItem')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 font-bold">{t('stockManagement')}</h2>
          <p className="text-sm text-slate-600 mt-1">{t('manageStock')}</p>
        </div>
       
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('totalStockValue')}</span>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{formatCurrency(totalValue)}</p>
          {totalValue > 0 && (
            <p className="text-xs text-slate-500 mt-1">{t('totalStockValue')}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('totalItems')}</span>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Boxes className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{totalItems}</p>
          <p className="text-xs text-slate-600 mt-1">{stockListItems.length} SKUs</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('lowStockAlerts')}</span>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{lowStockCount}</p>
          <p className="text-xs text-amber-600 mt-1">{t('needReordering')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('category')}</span>
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-violet-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{categories.length - 1}</p>
          <p className="text-xs text-slate-600 mt-1">{t('stockCategories')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('totalProducts')}</span>
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{stockListItems.length}</p>
          <p className="text-xs text-slate-600 mt-1">{t('productsInStock')}</p>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <div className='flex items-center justify-between'>
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
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
          onClick={() => navigate('/products')}
        >
          <Package className="w-4 h-4 mr-2" />
          {t('products')}
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
