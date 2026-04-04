import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { Textarea } from './ui/textarea';
import { translations, Language } from '../translations';
import { 
  Search, 
  Truck, 
  Package,
  Download,
  Send,
  CheckCircle2,
  Clock,
  Plus,
  Eye,
  MapPin,
  Calendar,
  Box,
  Filter,
  Trash2,
  Pencil,
  Camera,
  Upload,
  X
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Dispatch, BillForDispatch } from '../types';

import { dispatchService } from '../services/dispatch.service';
import { stockService } from '../services/stock.service';
import { ordersService } from '../services/orders.service';
import { useSharedState } from '../contexts/SharedStateContext';
interface DispatchManagementProps {
  onViewOrder: (orderId: string) => void;
  language?: Language;
  billForDispatch?: BillForDispatch | null;
  onClearBillForDispatch?: () => void;
}

export default function DispatchManagement({ onViewOrder, language = 'en', billForDispatch, onClearBillForDispatch }: DispatchManagementProps) {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'stock'>('stock');
  const [showAddDispatch, setShowAddDispatch] = useState(false);
  const [isBillPrefilledDispatch, setIsBillPrefilledDispatch] = useState(false);
  const [billOrderNumber, setBillOrderNumber] = useState('');
  const [dispatchForm, setDispatchForm] = useState({
    dispatch_type: 'stock' as 'production' | 'stock',
    order_id: '',
    invoice_no: '',
    customer: '',
    product: '',
    quantity: '',
    lr_number: '',
    transporter: '',
    vehicle_no: '',
    driver_name: '',
    driver_phone: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    expected_delivery: '',
    address: ''
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  // LR Image state for create form
  const [lrImageFile, setLrImageFile] = useState<File | null>(null);
  const [lrImagePreview, setLrImagePreview] = useState<string | null>(null);
  const lrFileInputRef = useRef<HTMLInputElement>(null);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraForCreate, setCameraForCreate] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleLrImageSelect = (file: File, isCreate: boolean) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (isCreate) {
        setLrImageFile(file);
        setLrImagePreview(preview);
      } else {
        setEditLrImageFile(file);
        setEditLrImagePreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const openCamera = async (isCreate: boolean) => {
    setCameraForCreate(isCreate);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      setShowCamera(true);
      // Attach stream to video after dialog renders
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error('Camera access failed:', err);
      toast.error(language === 'en' ? 'Unable to access camera. Please check permissions.' : 'கேமராவை அணுக முடியவில்லை. அனுமதிகளை சரிபார்க்கவும்.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `lr_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const preview = canvas.toDataURL('image/jpeg', 0.9);
      if (cameraForCreate) {
        setLrImageFile(file);
        setLrImagePreview(preview);
      } else {
        setEditLrImageFile(file);
        setEditLrImagePreview(preview);
        setEditLrImageRemoved(false);
      }
      stopCamera();
      toast.success(language === 'en' ? 'Photo captured!' : 'புகைப்படம் எடுக்கப்பட்டது!');
    }, 'image/jpeg', 0.9);
  };

  const removeLrImage = (isCreate: boolean) => {
    if (isCreate) {
      setLrImageFile(null);
      setLrImagePreview(null);
      if (lrFileInputRef.current) lrFileInputRef.current.value = '';
    } else {
      setEditLrImageFile(null);
      setEditLrImagePreview(null);
      setEditLrImageRemoved(true);
      if (editLrFileInputRef.current) editLrFileInputRef.current.value = '';
    }
  };

  const [transporters, setTransporters] = useState<string[]>([]);
  const [newTransporterName, setNewTransporterName] = useState('');
  const [showAddTransporter, setShowAddTransporter] = useState(false);

  // Load transporters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dispatch_transporters');
    if (saved) {
      try { setTransporters(JSON.parse(saved)); } catch { setTransporters([]); }
    }
  }, []);

  const handleAddTransporter = async () => {
    const name = newTransporterName.trim();
    if (!name) return;
    if (transporters.includes(name)) {
      toast.error('Transporter already exists');
      return;
    }
    const updated = [...transporters, name];
    setTransporters(updated);
    localStorage.setItem('dispatch_transporters', JSON.stringify(updated));
    setDispatchForm(prev => ({ ...prev, transporter: name }));
    setNewTransporterName('');
    setShowAddTransporter(false);
    toast.success('Transporter added successfully');
  };

  const resetDispatchForm = () => {
    setDispatchForm({
      dispatch_type: 'stock',
      order_id: '',
      invoice_no: '',
      customer: '',
      product: '',
      quantity: '',
      lr_number: '',
      transporter: '',
      vehicle_no: '',
      driver_name: '',
      driver_phone: '',
      dispatch_date: new Date().toISOString().split('T')[0],
      expected_delivery: '',
      address: ''
    });
    setIsBillPrefilledDispatch(false);
    setBillOrderNumber('');
    setStockSearchQuery('');
    setShowStockDropdown(false);
    setLrImageFile(null);
    setLrImagePreview(null);
  };

  const [deleteDispatchId, setDeleteDispatchId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteDispatch = async () => {
    if (!deleteDispatchId) return;
    setIsDeleting(true);
    try {
      await dispatchService.deleteDispatch(deleteDispatchId);
      toast.success('Dispatch deleted successfully');
      await refreshDispatches();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete dispatch');
    } finally {
      setIsDeleting(false);
      setDeleteDispatchId(null);
    }
  };

  // View dispatch detail
  const [viewDispatch, setViewDispatch] = useState<any | null>(null);

  // Edit dispatch
  const [editDispatch, setEditDispatch] = useState<any | null>(null);
  const [showEditDispatch, setShowEditDispatch] = useState(false);
  const [editForm, setEditForm] = useState({
    dispatch_type: 'stock' as 'stock',
    order_id: '',
    invoice_no: '',
    customer: '',
    product: '',
    quantity: '',
    lr_number: '',
    transporter: '',
    vehicle_no: '',
    driver_name: '',
    driver_phone: '',
    dispatch_date: '',
    expected_delivery: '',
    delivered_date: '',
    address: '',
    status: 'Ready to Dispatch',
  });
  const [editErrors, setEditErrors] = useState<ValidationErrors>({});

  // LR Image state for edit form
  const [editLrImageFile, setEditLrImageFile] = useState<File | null>(null);
  const [editLrImagePreview, setEditLrImagePreview] = useState<string | null>(null);
  const [editLrImageRemoved, setEditLrImageRemoved] = useState(false);
  const editLrFileInputRef = useRef<HTMLInputElement>(null);

  const openEditDialog = (dispatch: any) => {
    setEditDispatch(dispatch);
    // Ensure transporter from dispatch is in the dropdown list
    const dispatchTransporter = dispatch.transporter || '';
    if (dispatchTransporter && !transporters.includes(dispatchTransporter)) {
      const updated = [...transporters, dispatchTransporter];
      setTransporters(updated);
      localStorage.setItem('dispatch_transporters', JSON.stringify(updated));
    }
    setEditForm({
      dispatch_type: dispatch.type || dispatch.dispatch_type || 'stock',
      order_id: String(dispatch.order_id || ''),
      invoice_no: dispatch.invoice_no || dispatch.bill_no || '',
      customer: dispatch.customer || '',
      product: dispatch.product || dispatch.items || '',
      quantity: String(dispatch.quantity || ''),
      lr_number: dispatch.lr_number || '',
      transporter: dispatch.transporter || '',
      vehicle_no: dispatch.vehicle_no || '',
      driver_name: dispatch.driver_name || '',
      driver_phone: dispatch.driver_phone || '',
      dispatch_date: dispatch.dispatch_date ? dispatch.dispatch_date.split('T')[0] : '',
      expected_delivery: dispatch.expected_delivery ? dispatch.expected_delivery.split('T')[0] : '',
      delivered_date: dispatch.delivered_date ? dispatch.delivered_date.split('T')[0] : '',
      address: dispatch.address || '',
      status: dispatch.status || 'Ready to Dispatch',
    });
    setShowEditDispatch(true);
    setEditErrors({});
    // Set existing LR image preview if available
    setEditLrImageFile(null);
    setEditLrImageRemoved(false);
    if (dispatch.lr_image) {
      const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';
      setEditLrImagePreview(`${baseUrl}${dispatch.lr_image}`);
    } else {
      setEditLrImagePreview(null);
    }
  };

  const handleUpdateDispatch = async () => {
    const validationErrors = validateFields(editForm, {
      customer: { required: true, label: 'Customer' },
      product: { required: true, label: 'Product' },
      dispatch_date: { required: true, label: 'Dispatch Date' },
      transporter: { required: true, label: 'Transporter' },
    });
    // LR number required only if no LR image
    if (!editForm.lr_number && !editLrImageFile && !editLrImagePreview) {
      validationErrors.lr_number = 'LR Number or LR Image is required';
    }
    if (Object.keys(validationErrors).length) { setEditErrors(validationErrors); return; }
    if (!editDispatch) return;
    const parsedOrderId = parseOrderIdForApi(editForm.order_id);
    if (parsedOrderId === null && editForm.order_id) {
      setEditErrors(prev => ({ ...prev, order_id: 'Valid order id is required for production dispatch' }));
      return;
    }
    try {
      await dispatchService.updateDispatch(editDispatch.id, {
        type: editForm.dispatch_type,
        dispatch_type: editForm.dispatch_type,
        order_id: parsedOrderId,
        invoice_no: editForm.invoice_no,
        customer: editForm.customer,
        product: editForm.product,
        quantity: editForm.dispatch_type === 'stock'
          ? deriveStockQuantity(editForm.product, editForm.quantity)
          : (parseInt(editForm.quantity, 10) || 0),
        lr_number: editForm.lr_number,
        transporter: editForm.transporter,
        vehicle_no: editForm.vehicle_no,
        driver_name: editForm.driver_name,
        driver_phone: editForm.driver_phone,
        dispatch_date: editForm.dispatch_date,
        expected_delivery: editForm.expected_delivery,
        delivered_date: editForm.status === 'Delivered' ? (editForm.delivered_date || new Date().toISOString().split('T')[0]) : null,
        address: editForm.address,
        status: editForm.status,
        ...(editLrImageRemoved && !editLrImageFile ? { lr_image: '' } : {}),
      }, editLrImageFile || undefined);
      toast.success('Dispatch updated successfully');
      await refreshDispatches();
      setActiveTab(editForm.dispatch_type);
      setShowEditDispatch(false);
      setEditDispatch(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update dispatch');
    }
  };

  const handleCreateDispatch = async () => {
    const validationErrors = validateFields(dispatchForm, {
      customer: { required: true, label: 'Customer' },
      product: { required: true, label: 'Product' },
      dispatch_date: { required: true, label: 'Dispatch Date' },
      transporter: { required: true, label: 'Transporter' },
    });
    // LR number required only if no LR image
    if (!dispatchForm.lr_number && !lrImageFile) {
      validationErrors.lr_number = 'LR Number or LR Image is required';
    }
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    const parsedOrderId = parseOrderIdForApi(dispatchForm.order_id);
    if (parsedOrderId === null && dispatchForm.order_id) {
      setErrors(prev => ({ ...prev, order_id: 'Valid order id is required for production dispatch' }));
      return;
    }
    try {
      await dispatchService.createDispatch({
        type: dispatchForm.dispatch_type,
        dispatch_type: dispatchForm.dispatch_type,
        order_id: parsedOrderId,
        invoice_no: dispatchForm.invoice_no,
        customer: dispatchForm.customer,
        product: dispatchForm.product,
        quantity: dispatchForm.dispatch_type === 'stock'
          ? deriveStockQuantity(dispatchForm.product, dispatchForm.quantity)
          : (parseInt(dispatchForm.quantity, 10) || 0),
        lr_number: dispatchForm.lr_number,
        transporter: dispatchForm.transporter,
        vehicle_no: dispatchForm.vehicle_no,
        driver_name: dispatchForm.driver_name,
        driver_phone: dispatchForm.driver_phone,
        dispatch_date: dispatchForm.dispatch_date,
        expected_delivery: dispatchForm.expected_delivery,
        address: dispatchForm.address,
      }, lrImageFile || undefined);
      toast.success('Dispatch created successfully');
      await refreshDispatches();
      setActiveTab(dispatchForm.dispatch_type);
      setShowAddDispatch(false);
      resetDispatchForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create dispatch');
    }
  };

  // Production Dispatches - manufactured items
  const [productionDispatches, setProductionDispatches] = useState<any[]>([]);

  // Stock Dispatches - non-manufactured items
  const [stockDispatches, setStockDispatches] = useState<any[]>([]);

  const refreshDispatches = useCallback(async () => {
    try {
      const data = await dispatchService.getDispatches();
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setProductionDispatches(items.filter((d: any) => (d.type || d.dispatch_type) === 'production'));
      setStockDispatches(items.filter((d: any) => (d.type || d.dispatch_type) === 'stock'));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { refreshDispatches(); }, [refreshDispatches]);

  // Fetch orders for dropdown
  const [ordersList, setOrdersList] = useState<any[]>([]);
  useEffect(() => {
    ordersService.getOrders()
      .then(data => setOrdersList(Array.isArray(data) ? data : (data as any)?.items || []))
      .catch(() => {});
  }, []);

  // Fetch stock items for dropdown
  const { products: sharedProducts } = useSharedState();
  const [stockItemsList, setStockItemsList] = useState<any[]>([]);
  useEffect(() => {
    stockService.getStockItems().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      // Merge stock items with shared products, enriching and deduplicating
      const stockMap = new Map<string, any>();
      items.forEach((s: any) => stockMap.set((s.name || '').toLowerCase(), s));
      const merged: any[] = sharedProducts.map(p => {
        const stockMatch = stockMap.get((p.name || '').toLowerCase());
        if (stockMatch) {
          return {
            id: p.id,
            name: p.name,
            sku: p.sku || stockMatch.sku || '',
            category: p.category || stockMatch.category || '',
            unit: p.unit || stockMatch.unit || 'pcs',
            current_stock: Number(stockMatch.current_stock) || 0,
            selling_price: (Number(p.selling_price) || 0) > 0 ? Number(p.selling_price) : (Number(stockMatch.selling_price) || Number(stockMatch.unit_price) || 0),
          };
        }
        return { ...p, current_stock: 0, selling_price: Number(p.selling_price) || Number(p.unit_price) || 0 };
      });
      const existingNames = new Set(merged.map(p => (p.name || '').toLowerCase()));
      items.forEach((s: any) => {
        if (!existingNames.has((s.name || '').toLowerCase())) {
          merged.push({
            id: `STOCK-${s.id}`,
            name: s.name,
            sku: s.sku || '',
            category: s.category || '',
            unit: s.unit || 'pcs',
            current_stock: Number(s.current_stock) || 0,
            selling_price: Number(s.selling_price) || Number(s.unit_price) || 0,
          });
          existingNames.add((s.name || '').toLowerCase());
        }
      });
      setStockItemsList(merged);
    }).catch(() => {});
  }, [sharedProducts]);

  // Stock item search for dispatch
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [editStockSearchQuery, setEditStockSearchQuery] = useState('');
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [showEditStockDropdown, setShowEditStockDropdown] = useState(false);
  const stockDropdownRef = useRef<HTMLDivElement>(null);
  const editStockDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (stockDropdownRef.current && !stockDropdownRef.current.contains(e.target as Node)) setShowStockDropdown(false);
      if (editStockDropdownRef.current && !editStockDropdownRef.current.contains(e.target as Node)) setShowEditStockDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredStockItems = stockItemsList.filter(s =>
    (s.name || '').toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
    (s.sku || '').toLowerCase().includes(stockSearchQuery.toLowerCase())
  );

  const editFilteredStockItems = stockItemsList.filter(s =>
    (s.name || '').toLowerCase().includes(editStockSearchQuery.toLowerCase()) ||
    (s.sku || '').toLowerCase().includes(editStockSearchQuery.toLowerCase())
  );

  const deriveStockQuantity = (productText: string, fallbackQty?: string): number => {
    const directQty = parseInt(String(fallbackQty || ''), 10);
    if (!Number.isNaN(directQty) && directQty > 0) return directQty;

    const qtyMatches = String(productText || '').match(/x\s*([0-9]+(?:\.[0-9]+)?)/gi) || [];
    if (qtyMatches.length > 0) {
      const sum = qtyMatches.reduce((acc, token) => acc + (parseFloat(token.replace(/[^0-9.]/g, '')) || 0), 0);
      if (sum > 0) return Math.round(sum);
    }

    const itemCount = String(productText || '').split(',').map(s => s.trim()).filter(Boolean).length;
    return itemCount > 0 ? itemCount : 0;
  };

  // Auto-fill dispatch form when bill data comes from Billing module
  const billProcessedRef = useRef(false);
  useEffect(() => {
    if (billForDispatch && !billProcessedRef.current) {
      billProcessedRef.current = true;
      setIsBillPrefilledDispatch(true);
      setBillOrderNumber(billForDispatch.order_number || '');
      setStockSearchQuery('');
      setShowStockDropdown(false);
      const sourceItems = Array.isArray(billForDispatch.items) ? billForDispatch.items : [];
      const productNames = sourceItems.map(item => `${item.name} x${item.quantity}`).join(', ');
      const totalQty = sourceItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      // Use the actual DB id for order_id (must be numeric FK), not the display reference
      const resolvedOrderId = billForDispatch.order_id ?? '';
      setDispatchForm({
        dispatch_type: 'stock',
        order_id: resolvedOrderId ? String(resolvedOrderId) : '',
        invoice_no: billForDispatch.bill_no || '',
        customer: billForDispatch.client_name,
        product: productNames,
        quantity: String(totalQty),
        lr_number: '',
        transporter: '',
        vehicle_no: '',
        driver_name: '',
        driver_phone: '',
        dispatch_date: new Date().toISOString().split('T')[0],
        expected_delivery: '',
        address: billForDispatch.client_address || '',
      });
      setShowAddDispatch(true);
      if (onClearBillForDispatch) {
       setTimeout(() => {
      onClearBillForDispatch();
    }, 5000);
  }
    }
    
    if (!billForDispatch) {
      billProcessedRef.current = false;
    }
  }, [billForDispatch]);

  // Parse order_id for API — value comes from Select dropdown as a real DB id string.
  const parseOrderIdForApi = (id: string | number): number | null => {
    if (id === '' || id === null || id === undefined) return null;
    if (typeof id === 'number' && Number.isFinite(id)) return id;
    const str = String(id).trim();
    if (!str) return null;
    if (/^\d+$/.test(str)) return parseInt(str, 10);
    return null;
  };

  // Inline status change on dispatch card
  const handleStatusChange = async (dispatch: any, newStatus: string) => {
    try {
      const deliveredDate = newStatus === 'Delivered' 
        ? new Date().toISOString().split('T')[0] 
        : null;
      await dispatchService.updateDispatch(dispatch.id, {
        status: newStatus,
        delivered_date: deliveredDate,
      });
      toast.success(`Status updated to "${newStatus}"`);
      await refreshDispatches();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-emerald-100 text-emerald-700';
      case 'In Transit': return 'bg-blue-100 text-blue-700';
      case 'Ready to Dispatch': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const handleDownloadLR = (dispatch: Dispatch) => {
    const lrContent = `
      <html>
      <head>
        <title>Lorry Receipt - ${dispatch.lr_number || 'N/A'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { margin: 0 0 4px; font-size: 24px; }
          .header p { margin: 0; color: #666; font-size: 14px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; font-size: 14px; color: #555; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
          .row { display: flex; margin-bottom: 6px; }
          .label { font-weight: 600; width: 180px; color: #555; font-size: 14px; }
          .value { font-size: 14px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>LORRY RECEIPT (LR)</h1>
          <p>LR Number: ${dispatch.lr_number || 'N/A'}</p>
        </div>
        <div class="section">
          <div class="section-title">Dispatch Information</div>
          <div class="row"><span class="label">Dispatch ID:</span><span class="value">${dispatch.id}</span></div>
          <div class="row"><span class="label">Order ID:</span><span class="value">${dispatch.order_id || '-'}</span></div>
          ${dispatch.invoice_no ? `<div class="row"><span class="label">Invoice No:</span><span class="value">${dispatch.invoice_no}</span></div>` : ''}
          <div class="row"><span class="label">Status:</span><span class="value">${dispatch.status}</span></div>
          <div class="row"><span class="label">Dispatch Date:</span><span class="value">${dispatch.dispatch_date ? new Date(dispatch.dispatch_date).toLocaleDateString() : '-'}</span></div>
          ${dispatch.expected_delivery ? `<div class="row"><span class="label">Expected Delivery:</span><span class="value">${new Date(dispatch.expected_delivery).toLocaleDateString()}</span></div>` : ''}
        </div>
        <div class="section">
          <div class="section-title">Customer Details</div>
          <div class="row"><span class="label">Customer:</span><span class="value">${dispatch.customer}</span></div>
          <div class="row"><span class="label">Delivery Address:</span><span class="value">${dispatch.address}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Consignment Details</div>
          <div class="row"><span class="label">Product / Items:</span><span class="value">${dispatch.product || dispatch.items || '-'}</span></div>
          ${dispatch.quantity ? `<div class="row"><span class="label">Quantity:</span><span class="value">${dispatch.quantity} units</span></div>` : ''}
        </div>
        <div class="section">
          <div class="section-title">Transport Details</div>
          <div class="row"><span class="label">Transporter:</span><span class="value">${dispatch.transporter || '-'}</span></div>
          <div class="row"><span class="label">Vehicle No:</span><span class="value">${dispatch.vehicle_no || '-'}</span></div>
          <div class="row"><span class="label">Driver Name:</span><span class="value">${dispatch.driver_name || '-'}</span></div>
          <div class="row"><span class="label">Driver Phone:</span><span class="value">${dispatch.driver_phone || '-'}</span></div>
        </div>
        <div class="footer">Generated on ${new Date().toLocaleString()}</div>
      </body>
      </html>
    `;
    const blob = new Blob([lrContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LR_${dispatch.lr_number || dispatch.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(language === 'en' ? 'LR downloaded successfully' : 'LR வெற்றிகரமாக பதிவிறக்கப்பட்டது');
  };

  const handleShareDispatch = async (dispatch: Dispatch) => {
    const shareText = [
      `Dispatch: ${dispatch.id}`,
      `Order: ${dispatch.order_id || '-'}`,
      dispatch.invoice_no ? `Invoice: ${dispatch.invoice_no}` : '',
      `Customer: ${dispatch.customer}`,
      `Product: ${dispatch.product || dispatch.items || '-'}`,
      dispatch.quantity ? `Quantity: ${dispatch.quantity} units` : '',
      `LR Number: ${dispatch.lr_number || '-'}`,
      `Transporter: ${dispatch.transporter || '-'}`,
      dispatch.vehicle_no ? `Vehicle: ${dispatch.vehicle_no}` : '',
      dispatch.driver_name ? `Driver: ${dispatch.driver_name}` : '',
      dispatch.driver_phone ? `Driver Phone: ${dispatch.driver_phone}` : '',
      `Status: ${dispatch.status}`,
      `Dispatch Date: ${dispatch.dispatch_date ? new Date(dispatch.dispatch_date).toLocaleDateString() : '-'}`,
      dispatch.expected_delivery ? `Expected Delivery: ${new Date(dispatch.expected_delivery).toLocaleDateString()}` : '',
      `Address: ${dispatch.address}`,
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Dispatch ${dispatch.id} - LR ${dispatch.lr_number || 'N/A'}`,
          text: shareText,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          await navigator.clipboard.writeText(shareText);
          toast.success(language === 'en' ? 'Dispatch details copied to clipboard' : 'அனுப்புதல் விவரங்கள் கிளிப்போர்டில் நகலெடுக்கப்பட்டது');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success(language === 'en' ? 'Dispatch details copied to clipboard' : 'அனுப்புதல் விவரங்கள் கிளிப்போர்டில் நகலெடுக்கப்பட்டது');
      } catch {
        toast.error(language === 'en' ? 'Failed to copy to clipboard' : 'கிளிப்போர்டில் நகலெடுக்க இயலவில்லை');
      }
    }
  };

  const renderDispatchCard = (dispatch: Dispatch, type: string) => (
    <motion.div
      key={dispatch.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-white"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-blue-600 font-semibold">{dispatch.id}</span>
              <span className="text-sm text-slate-400">•</span>
              <span 
                className="text-sm text-slate-600 hover:text-blue-600 cursor-pointer font-medium"
                onClick={() => onViewOrder(dispatch.order_id)}
              >
                {dispatch.order_id}
              </span>
              {dispatch.invoice_no && (
                <>
                  <span className="text-sm text-slate-400">•</span>
                  <span className="text-sm text-emerald-600 font-medium">{dispatch.invoice_no}</span>
                </>
              )}
            </div>
            <h3 className="text-base text-slate-900 font-semibold mb-1">{dispatch.customer}</h3>
            <p className="text-sm text-slate-600">
              {dispatch.product || dispatch.items}
            </p>
            {dispatch.quantity && (
              <p className="text-xs text-slate-500 mt-1">Quantity: {dispatch.quantity} units</p>
            )}
          </div>
        </div>
        <Select
          value={dispatch.status}
          onValueChange={(value: string) => handleStatusChange(dispatch, value)}
        >
          <SelectTrigger className={`w-auto h-7 text-xs font-medium border-0 px-2.5 py-0.5 rounded-full gap-1 ${getStatusColor(dispatch.status)}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Ready to Dispatch">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {language === 'en' ? 'Ready to Dispatch' : 'அனுப்ப தயார்'}
              </span>
            </SelectItem>
            <SelectItem value="In Transit">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {language === 'en' ? 'In Transit' : 'போக்குவரத்தில்'}
              </span>
            </SelectItem>
            <SelectItem value="Delivered">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {language === 'en' ? 'Delivered' : 'டெலிவரி'}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 mb-4">
        {dispatch.lr_number && (
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">LR Number:</span>
            <span className="text-slate-900 font-medium">{dispatch.lr_number}</span>
          </div>
        )}
        
        {dispatch.transporter && (
          <div className="flex items-center gap-2 text-sm">
            <Truck className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">Transporter:</span>
            <span className="text-slate-900 font-medium">{dispatch.transporter}</span>
            {dispatch.vehicle_no && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-slate-700">{dispatch.vehicle_no}</span>
              </>
            )}
          </div>
        )}

        {(dispatch.driver_name || dispatch.driver_phone) && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">Driver:</span>
            {dispatch.driver_name && <span className="text-slate-900 font-medium">{dispatch.driver_name}</span>}
            {dispatch.driver_phone && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-slate-700">{dispatch.driver_phone}</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700">{dispatch.address}</span>
        </div>

        {dispatch.dispatch_date && (
          <div className="flex items-center gap-4 text-xs text-slate-600 pt-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Dispatched: {new Date(dispatch.dispatch_date).toLocaleDateString()}</span>
            </div>
            {dispatch.expected_delivery && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Expected: {new Date(dispatch.expected_delivery).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        {dispatch.delivered_date && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium pt-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Delivered on {new Date(dispatch.delivered_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
        {dispatch.lr_number ? (
          <>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownloadLR(dispatch)}>
              <Download className="w-4 h-4 mr-2" />
              Download LR
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleShareDispatch(dispatch)}>
              <Send className="w-4 h-4 mr-2" />
              Share
            </Button>
          </>
        ) : (
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create LR & Dispatch
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-10 p-0"
          onClick={() => setViewDispatch(dispatch)}
          title={language === 'en' ? 'View Details' : 'விவரங்களைக் காண்க'}
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-10 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
          onClick={() => openEditDialog(dispatch)}
          title={language === 'en' ? 'Edit Dispatch' : 'அனுப்புதலை திருத்து'}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => setDeleteDispatchId(dispatch.id)}
          title={language === 'en' ? 'Delete Dispatch' : 'அனுப்புதலை நீக்கு'}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('dispatchManagement')}</h1>
          <p className="text-muted-foreground">{t('manageDispatch')}</p>
        </div>
       
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder={t('searchByCustomer')}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'en' ? 'All Status' : 'அனைத்து நிலை'}</SelectItem>
            <SelectItem value="ready">{language === 'en' ? 'Ready to Dispatch' : 'அனுப்ப தயார்'}</SelectItem>
            <SelectItem value="transit">{language === 'en' ? 'In Transit' : 'போக்குவரத்தில்'}</SelectItem>
            <SelectItem value="delivered">{language === 'en' ? 'Delivered' : 'டெலிவரி'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dispatch Content */}
      
      <div className="w-full">
        <div className='flex justify-between items-center'>
        <div></div>
         <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            setIsBillPrefilledDispatch(false);
            setShowAddDispatch(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('createNewDispatch')}
        </Button>
        </div>

        {/* Stock Dispatch Stats & Cards */}
        <div className="space-y-6 mt-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">{t('readyToDispatch')}</span>
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-3xl text-slate-900 font-bold">
                {stockDispatches.filter(d => d.status === 'Ready to Dispatch').length}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">{t('inTransit')}</span>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl text-slate-900 font-bold">
                {stockDispatches.filter(d => d.status === 'In Transit').length}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">{t('delivered')}</span>
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-3xl text-slate-900 font-bold">
                {stockDispatches.filter(d => d.status === 'Delivered').length}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">Total</span>
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Box className="w-5 h-5 text-violet-600" />
                </div>
              </div>
              <p className="text-3xl text-slate-900 font-bold">{stockDispatches.length}</p>
            </motion.div>
          </div>

          {/* Dispatch Cards */}
          {stockDispatches.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {stockDispatches.map(dispatch => renderDispatchCard(dispatch, 'stock'))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Box className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">{language === 'en' ? 'No Stock Dispatches' : 'பங்கு அனுப்புதல் இல்லை'}</h3>
              <p className="text-sm text-slate-500 mb-4">{language === 'en' ? 'Create your first stock dispatch to get started' : 'தொடங்க முதல் பங்கு அனுப்புதலை உருவாக்கவும்'}</p>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                setIsBillPrefilledDispatch(false);
                setDispatchForm(prev => ({ ...prev, dispatch_type: 'stock' }));
                setShowAddDispatch(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                {t('createNewDispatch')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create New Dispatch Dialog */}
      <Dialog open={showAddDispatch} onOpenChange={(open: boolean) => {
        setShowAddDispatch(open);
        if (!open) resetDispatchForm();
        setErrors({});
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('createNewDispatch')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('orderId')}{dispatchForm.dispatch_type === 'production' ? ' *' : ''}</Label>
                <Input
                  value={isBillPrefilledDispatch ? (billOrderNumber || dispatchForm.order_id) : dispatchForm.order_id}
                  onChange={(e) => { setDispatchForm({...dispatchForm, order_id: e.target.value}); setErrors(prev => ({...prev, order_id: ''})); }}
                  placeholder="Enter order ID"
                  readOnly={isBillPrefilledDispatch}
                  className={isBillPrefilledDispatch ? 'bg-gray-50' : ''}
                />
                <FieldError message={errors.order_id} />
              </div>
              <div className="space-y-2">
                <Label>{t('invoiceNo')}</Label>
                <Input 
                  value={dispatchForm.invoice_no}
                  onChange={(e) => setDispatchForm({...dispatchForm, invoice_no: e.target.value})}
                  placeholder="INV-2026-XXX"
                  readOnly={isBillPrefilledDispatch}
                  className={isBillPrefilledDispatch ? 'bg-gray-50' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('customer')}</Label>
                <Input 
                  value={dispatchForm.customer}
                  onChange={(e) => { setDispatchForm({...dispatchForm, customer: e.target.value}); setErrors(prev => ({...prev, customer: ''})); }}
                  placeholder={t('customerName')}
                />
                <FieldError message={errors.customer} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{dispatchForm.dispatch_type === 'production' 
                  ? (t('product')) 
                  : (t('items'))}</Label>
                {dispatchForm.dispatch_type === 'production' ? (
                  <Input 
                    value={dispatchForm.product}
                    onChange={(e) => { setDispatchForm({...dispatchForm, product: e.target.value}); setErrors(prev => ({...prev, product: ''})); }}
                    placeholder={t('productName')}
                  />
                ) : isBillPrefilledDispatch ? (
                  <div className="space-y-2">
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      Items are loaded from selected invoice.
                    </div>
                    {dispatchForm.product ? (
                      <div className="flex flex-wrap gap-1.5">
                        {dispatchForm.product.split(', ').filter(Boolean).map((item, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
                            <Package className="w-3 h-3 text-blue-500" />
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500">
                        No invoice items available.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative" ref={stockDropdownRef}>
                    <Input
                      value={stockSearchQuery}
                      onChange={(e) => { setStockSearchQuery(e.target.value); setShowStockDropdown(true); }}
                      onFocus={() => setShowStockDropdown(true)}
                      placeholder={t('searchItem')}
                      className="w-full"
                    />
                    {dispatchForm.product && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {dispatchForm.product.split(', ').filter(Boolean).map((item, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
                            <Package className="w-3 h-3 text-blue-500" />
                            {item}
                            <button type="button" className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 text-blue-500 hover:text-red-600 transition-colors" onClick={() => {
                              const items = dispatchForm.product.split(', ').filter((_, i) => i !== idx);
                              setDispatchForm({...dispatchForm, product: items.join(', ')});
                            }}>
                              <span className="text-sm leading-none">×</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {showStockDropdown && (() => {
                      const selectedNames = new Set(dispatchForm.product ? dispatchForm.product.split(', ').filter(Boolean).map(n => n.toLowerCase()) : []);
                      const available = filteredStockItems.filter(item => !selectedNames.has((item.name || '').toLowerCase()));
                      return available.length > 0 ? (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                          {available.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center gap-3 text-sm border-b border-gray-50 last:border-0 transition-colors"
                              onClick={() => {
                                const currentItems = dispatchForm.product ? dispatchForm.product.split(', ').filter(Boolean) : [];
                                const updated = [...currentItems, item.name].join(', ');
                                setDispatchForm({...dispatchForm, product: updated});
                                setStockSearchQuery('');
                                setShowStockDropdown(false);
                                setErrors(prev => ({...prev, product: ''}));
                              }}
                            >
                              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Package className="w-4 h-4 text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{item.name}</div>
                                <div className="text-xs text-gray-500">{item.sku}{item.category ? ` • ${item.category}` : ''}</div>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <div className="text-xs font-medium text-gray-700">{item.current_stock} {item.unit}</div>
                                {item.selling_price > 0 && <div className="text-xs text-green-600">₹{Number(item.selling_price).toLocaleString()}</div>}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
                <FieldError message={errors.product} />
              </div>
              {dispatchForm.dispatch_type === 'production' && (
                <div className="space-y-2">
                  <Label>{t('quantity')}</Label>
                  <Input 
                    type="number"
                    value={dispatchForm.quantity}
                    onChange={(e) => { setDispatchForm({...dispatchForm, quantity: e.target.value}); setErrors(prev => ({...prev, quantity: ''})); }}
                    onKeyDown={blockInvalidNumberKeys}
                    placeholder="0"
                  />
                  <FieldError message={errors.quantity} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('lrNumber')} <span className="text-xs text-muted-foreground font-normal">{language === 'en' ? '(or upload LR image below)' : '(அல்லது கீழே LR படம் பதிவேற்றவும்)'}</span></Label>
                <Input 
                  value={dispatchForm.lr_number}
                  onChange={(e) => { setDispatchForm({...dispatchForm, lr_number: e.target.value}); setErrors(prev => ({...prev, lr_number: ''})); }}
                  placeholder="LR-2024-XXX"
                />
                <FieldError message={errors.lr_number} />
                {/* LR Image Upload */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{language === 'en' ? 'LR Image' : 'LR படம்'}</Label>
                  {lrImagePreview ? (
                    <div className="relative inline-block">
                      <img src={lrImagePreview} alt="LR" className="w-32 h-24 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => removeLrImage(true)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        ref={lrFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLrImageSelect(file, true);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => lrFileInputRef.current?.click()}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Upload className="w-3 h-3" />
                        {language === 'en' ? 'Upload' : 'பதிவேற்று'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openCamera(true)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Camera className="w-3 h-3" />
                        {language === 'en' ? 'Camera' : 'கேமரா'}
                      </Button>
                    </div>
                  )}
                </div>
                <FieldError message={errors.lr_number} />
              </div>
              <div className="space-y-2">
                <Label>{t('transporter')} *</Label>
                {showAddTransporter ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Transporter name"
                      value={newTransporterName}
                      onChange={(e) => setNewTransporterName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTransporter(); } }}
                      autoFocus
                    />
                    <Button type="button" size="sm" onClick={handleAddTransporter} className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3">
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddTransporter(false); setNewTransporterName(''); }} className="h-9 px-3">
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select 
                      value={dispatchForm.transporter} 
                      onValueChange={(value: string) => { setDispatchForm({...dispatchForm, transporter: value}); setErrors(prev => ({...prev, transporter: ''})); }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectTransporter')} />
                      </SelectTrigger>
                      <SelectContent>
                        {transporters.map((tr) => (
                          <SelectItem key={tr} value={tr}>{tr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowAddTransporter(true)} title="Add new transporter" className="h-9 px-3">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <FieldError message={errors.transporter} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('vehicleNumber')}</Label>
                <Input 
                  value={dispatchForm.vehicle_no}
                  onChange={(e) => { setDispatchForm({...dispatchForm, vehicle_no: e.target.value}); setErrors(prev => ({...prev, vehicle_no: ''})); }}
                  placeholder="MH-01-XX-1234"
                />
                <FieldError message={errors.vehicle_no} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'en' ? 'Driver Name' : 'டிரைவர் பெயர்'}</Label>
                <Input 
                  value={dispatchForm.driver_name}
                  onChange={(e) => { setDispatchForm({...dispatchForm, driver_name: e.target.value}); setErrors(prev => ({...prev, driver_name: ''})); }}
                  placeholder={language === 'en' ? 'Driver name' : 'டிரைவர் பெயர்'}
                />
                <FieldError message={errors.driver_name} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'en' ? 'Driver Phone' : 'டிரைவர் தொலைபேசி'}</Label>
                <Input 
                  value={dispatchForm.driver_phone}
                  onChange={(e) => { setDispatchForm({...dispatchForm, driver_phone: e.target.value}); setErrors(prev => ({...prev, driver_phone: ''})); }}
                  placeholder="+91 XXXXX XXXXX"
                />
                <FieldError message={errors.driver_phone} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('dispatchDate')}</Label>
                <Input 
                  type="date"
                  value={dispatchForm.dispatch_date}
                  onChange={(e) => { setDispatchForm({...dispatchForm, dispatch_date: e.target.value}); setErrors(prev => ({...prev, dispatch_date: ''})); }}
                />
                <FieldError message={errors.dispatch_date} />
              </div>
              <div className="space-y-2">
                <Label>{t('expectedDelivery')}</Label>
                <Input 
                  type="date"
                  value={dispatchForm.expected_delivery}
                  onChange={(e) => { setDispatchForm({...dispatchForm, expected_delivery: e.target.value}); setErrors(prev => ({...prev, expected_delivery: ''})); }}
                />
                <FieldError message={errors.expected_delivery} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('deliveryAddress')}</Label>
              <Textarea 
                value={dispatchForm.address}
                onChange={(e) => { setDispatchForm({...dispatchForm, address: e.target.value}); setErrors(prev => ({...prev, address: ''})); }}
                placeholder={t('fullDeliveryAddress')}
                rows={2}
              />
              <FieldError message={errors.address} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDispatch(false);
              resetDispatchForm();
            }}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleCreateDispatch} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={
                !dispatchForm.customer
                || !dispatchForm.product
                || !dispatchForm.dispatch_date
                || !dispatchForm.address
                || (dispatchForm.dispatch_type === 'production' && (!dispatchForm.order_id || !dispatchForm.quantity))
              }
            >
              <Truck className="w-4 h-4 mr-2" />
              {t('createDispatch')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dispatch Detail Dialog */}
      <Dialog open={!!viewDispatch} onOpenChange={(open: boolean) => { if (!open) setViewDispatch(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              {language === 'en' ? 'Dispatch Details' : 'அனுப்புதல் விவரங்கள்'}
            </DialogTitle>
          </DialogHeader>
          {viewDispatch && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-blue-600">{viewDispatch.id}</span>
                <Badge className={getStatusColor(viewDispatch.status)}>{viewDispatch.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-medium">{t('orderId')}</p>
                  <p className="text-sm font-semibold text-slate-800">{viewDispatch.order_id || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-medium">{t('dispatchType')}</p>
                  <p className="text-sm font-semibold text-slate-800 capitalize">{viewDispatch.type || viewDispatch.dispatch_type || '-'}</p>
                </div>
              </div>

              {viewDispatch.invoice_no && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-medium">{t('invoiceNo')}</p>
                  <p className="text-sm font-semibold text-emerald-700">{viewDispatch.invoice_no}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase font-medium">{t('customer')}</p>
                <p className="text-sm font-semibold text-slate-800">{viewDispatch.customer}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-medium">{t('product')}/{t('items')}</p>
                  <p className="text-sm text-slate-700">{viewDispatch.product || viewDispatch.items || '-'}</p>
                </div>
                {viewDispatch.quantity && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase font-medium">{t('quantity')}</p>
                    <p className="text-sm text-slate-700">{viewDispatch.quantity} units</p>
                  </div>
                )}
              </div>

              {(viewDispatch.lr_number || viewDispatch.transporter) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase font-medium">{t('lrNumber')}</p>
                    <p className="text-sm text-slate-700">{viewDispatch.lr_number || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase font-medium">{t('transporter')}</p>
                    <p className="text-sm text-slate-700">{viewDispatch.transporter || '-'}</p>
                  </div>
                </div>
              )}

              {viewDispatch.vehicle_no && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-medium">{t('vehicleNumber')}</p>
                  <p className="text-sm text-slate-700">{viewDispatch.vehicle_no}</p>
                </div>
              )}

              {(viewDispatch.driver_name || viewDispatch.driver_phone) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase font-medium">{language === 'en' ? 'Driver Name' : 'டிரைவர் பெயர்'}</p>
                    <p className="text-sm text-slate-700">{viewDispatch.driver_name || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase font-medium">{language === 'en' ? 'Driver Phone' : 'டிரைவர் தொலைபேசி'}</p>
                    <p className="text-sm text-slate-700">{viewDispatch.driver_phone || '-'}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-medium">{t('dispatchDate')}</p>
                  <p className="text-sm text-slate-700">{viewDispatch.dispatch_date ? new Date(viewDispatch.dispatch_date).toLocaleDateString() : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-medium">{t('expectedDelivery')}</p>
                  <p className="text-sm text-slate-700">{viewDispatch.expected_delivery ? new Date(viewDispatch.expected_delivery).toLocaleDateString() : '-'}</p>
                </div>
              </div>

              {viewDispatch.delivered_date && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium bg-emerald-50 p-3 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Delivered on {new Date(viewDispatch.delivered_date).toLocaleDateString()}</span>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase font-medium">{t('deliveryAddress')}</p>
                <p className="text-sm text-slate-700">{viewDispatch.address || '-'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDispatch(null)}>{t('cancel')}</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { if (viewDispatch) { openEditDialog(viewDispatch); setViewDispatch(null); } }}>
              <Pencil className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Edit' : 'திருத்து'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dispatch Dialog */}
      <Dialog open={showEditDispatch} onOpenChange={(open: boolean) => {
        setShowEditDispatch(open);
        if (!open) { setEditDispatch(null); setEditErrors({}); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'en' ? 'Edit Dispatch' : 'அனுப்புதலை திருத்து'} — {editDispatch?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'en' ? 'Status' : 'நிலை'}</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value: string) => setEditForm({ ...editForm, status: value, delivered_date: value === 'Delivered' ? (editForm.delivered_date || new Date().toISOString().split('T')[0]) : '' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ready to Dispatch">{language === 'en' ? 'Ready to Dispatch' : 'அனுப்ப தயார்'}</SelectItem>
                    <SelectItem value="In Transit">{language === 'en' ? 'In Transit' : 'போக்குவரத்தில்'}</SelectItem>
                    <SelectItem value="Delivered">{language === 'en' ? 'Delivered' : 'டெலிவரி'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('orderId')}</Label>
                <Input
                  value={(() => {
                    const match = ordersList.find((o: any) => String(o.id) === editForm.order_id);
                    return match ? (match.order_number || match.orderNumber || `#${match.id}`) : (editDispatch?.order_number || editForm.order_id || '');
                  })()}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('invoiceNo')}</Label>
                <Input
                  value={editForm.invoice_no}
                  readOnly
                  className="bg-gray-50"
                  placeholder="INV-2026-XXX"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('customer')}</Label>
                <Input
                  value={editForm.customer}
                  onChange={(e) => { setEditForm({ ...editForm, customer: e.target.value }); setEditErrors(prev => ({ ...prev, customer: '' })); }}
                />
                <FieldError message={editErrors.customer} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{editForm.dispatch_type === 'production' ? t('product') : t('items')}</Label>
                {editForm.dispatch_type === 'production' ? (
                  <Input
                    value={editForm.product}
                    readOnly
                    className="bg-gray-50"
                  />
                ) : (
                  <div>
                    {editForm.product ? (
                      <div className="flex flex-wrap gap-1.5">
                        {editForm.product.split(', ').filter(Boolean).map((item, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
                            <Package className="w-3 h-3 text-blue-500" />
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <Input value="" readOnly className="bg-gray-50" placeholder="No items" />
                    )}
                  </div>
                )}
                <FieldError message={editErrors.product} />
              </div>
              {editForm.dispatch_type === 'production' && (
                <div className="space-y-2">
                  <Label>{t('quantity')}</Label>
                  <Input
                    type="number"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    onKeyDown={blockInvalidNumberKeys}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('lrNumber')} <span className="text-xs text-muted-foreground font-normal">{language === 'en' ? '(or upload LR image below)' : '(அல்லது கீழே LR படம் பதிவேற்றவும்)'}</span></Label>
                <Input
                  value={editForm.lr_number}
                  onChange={(e) => { setEditForm({ ...editForm, lr_number: e.target.value }); setEditErrors(prev => ({...prev, lr_number: ''})); }}
                />
                <FieldError message={editErrors.lr_number} />
                {/* LR Image Upload for Edit */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{language === 'en' ? 'LR Image' : 'LR படம்'}</Label>
                  {editLrImagePreview ? (
                    <div className="relative inline-block">
                      <img src={editLrImagePreview} alt="LR" className="w-32 h-24 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => removeLrImage(false)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        ref={editLrFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLrImageSelect(file, false);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => editLrFileInputRef.current?.click()}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Upload className="w-3 h-3" />
                        {language === 'en' ? 'Upload' : 'பதிவேற்று'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openCamera(false)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Camera className="w-3 h-3" />
                        {language === 'en' ? 'Camera' : 'கேமரா'}
                      </Button>
                    </div>
                  )}
                </div>
                <FieldError message={editErrors.lr_number} />
              </div>
              <div className="space-y-2">
                <Label>{t('transporter')} *</Label>
                <div className="flex gap-2">
                  <Select
                    value={editForm.transporter}
                    onValueChange={(value: string) => { setEditForm({ ...editForm, transporter: value }); setEditErrors(prev => ({...prev, transporter: ''})); }}
                  >
                    <SelectTrigger><SelectValue placeholder={t('selectTransporter')} /></SelectTrigger>
                    <SelectContent>
                      {transporters.map((tr) => (
                        <SelectItem key={tr} value={tr}>{tr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FieldError message={editErrors.transporter} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('vehicleNumber')}</Label>
                <Input
                  value={editForm.vehicle_no}
                  onChange={(e) => { setEditForm({ ...editForm, vehicle_no: e.target.value }); setEditErrors(prev => ({...prev, vehicle_no: ''})); }}
                />
                <FieldError message={editErrors.vehicle_no} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'en' ? 'Driver Name' : 'டிரைவர் பெயர்'}</Label>
                <Input
                  value={editForm.driver_name}
                  onChange={(e) => { setEditForm({ ...editForm, driver_name: e.target.value }); setEditErrors(prev => ({...prev, driver_name: ''})); }}
                  placeholder={language === 'en' ? 'Driver name' : 'டிரைவர் பெயர்'}
                />
                <FieldError message={editErrors.driver_name} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'en' ? 'Driver Phone' : 'டிரைவர் தொலைபேசி'}</Label>
                <Input
                  value={editForm.driver_phone}
                  onChange={(e) => { setEditForm({ ...editForm, driver_phone: e.target.value }); setEditErrors(prev => ({...prev, driver_phone: ''})); }}
                  placeholder="+91 XXXXX XXXXX"
                />
                <FieldError message={editErrors.driver_phone} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('dispatchDate')}</Label>
                <Input
                  type="date"
                  value={editForm.dispatch_date}
                  onChange={(e) => { setEditForm({ ...editForm, dispatch_date: e.target.value }); setEditErrors(prev => ({ ...prev, dispatch_date: '' })); }}
                />
                <FieldError message={editErrors.dispatch_date} />
              </div>
              <div className="space-y-2">
                <Label>{t('expectedDelivery')}</Label>
                <Input
                  type="date"
                  value={editForm.expected_delivery}
                  onChange={(e) => { setEditForm({ ...editForm, expected_delivery: e.target.value }); setEditErrors(prev => ({...prev, expected_delivery: ''})); }}
                />
                <FieldError message={editErrors.expected_delivery} />
              </div>
              {editForm.status === 'Delivered' && (
                <div className="space-y-2">
                  <Label>{language === 'en' ? 'Delivered Date' : 'டெலிவரி தேதி'}</Label>
                  <Input
                    type="date"
                    value={editForm.delivered_date}
                    onChange={(e) => setEditForm({ ...editForm, delivered_date: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('deliveryAddress')}</Label>
              <Textarea
                value={editForm.address}
                onChange={(e) => { setEditForm({ ...editForm, address: e.target.value }); setEditErrors(prev => ({ ...prev, address: '' })); }}
                rows={2}
              />
              <FieldError message={editErrors.address} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDispatch(false); setEditDispatch(null); }}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleUpdateDispatch}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Update Dispatch' : 'அனுப்புதலைப் புதுப்பி'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Capture Dialog */}
      <Dialog open={showCamera} onOpenChange={(open: boolean) => { if (!open) stopCamera(); }}>
        <DialogContent className="max-w-lg p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {language === 'en' ? 'Take LR Photo' : 'LR புகைப்படம் எடு'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={stopCamera}
                className="px-6"
              >
                {language === 'en' ? 'Cancel' : 'ரத்து'}
              </Button>
              <Button
                type="button"
                onClick={capturePhoto}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                {language === 'en' ? 'Take Photo' : 'புகைப்படம் எடு'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDispatchId} onOpenChange={(open: boolean) => { if (!open) setDeleteDispatchId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              {language === 'en' ? 'Delete Dispatch' : 'அனுப்புதலை நீக்கு'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            {language === 'en' 
              ? `Are you sure you want to delete dispatch "${deleteDispatchId}"? This action cannot be undone.`
              : `"${deleteDispatchId}" அனுப்புதலை நீக்க விரும்புகிறீர்களா? இந்த செயலை மீட்க முடியாது.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDispatchId(null)} disabled={isDeleting}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleDeleteDispatch} 
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting 
                ? (language === 'en' ? 'Deleting...' : 'நீக்குகிறது...') 
                : (language === 'en' ? 'Delete' : 'நீக்கு')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
