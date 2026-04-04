import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { Badge } from './ui/badge';
import { translations, Language } from '../translations';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  Search, 
  Filter, 
  Eye,
  AlertCircle,
  Clock,
  CheckCircle2,
  Plus,
  Package
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { OrderForProduction } from '../types';

import { productionService } from '../services/production.service';

const productionStages = [
  { id: 1, name: 'Material Pasting', description: 'Apply glue to MDF' },
  { id: 2, name: 'Mica Pasting', description: 'Apply mica on both sides' },
  { id: 3, name: 'Curing/Binding', description: 'Wait for binding' },
  { id: 4, name: 'Cutting', description: 'Cut to required size' },
  { id: 5, name: 'Aluminium Edge', description: 'Insert aluminium edge & screw' },
  { id: 6, name: 'Corner Pieces', description: 'Place corner pieces & screw' },
  { id: 7, name: 'Hanging Rings', description: 'Attach hanging rings' },
  { id: 8, name: 'Advertising Material', description: 'Place advertising materials' },
  { id: 9, name: 'PVC Cover', description: 'Cover with PVC sheet' },
  { id: 10, name: 'Packing', description: 'Pack & mark ready for dispatch' },
];
interface ProductionBoardProps {
  onViewOrder: (orderId: string) => void;
  language?: Language;
  orderForProduction?: OrderForProduction | null;
  onClearOrderForProduction?: () => void;
}

export default function ProductionBoard({ onViewOrder, language = 'en', orderForProduction, onClearOrderForProduction }: ProductionBoardProps) {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [showAddProduction, setShowAddProduction] = useState(false);
  const [productionForm, setProductionForm] = useState({
    order_id: '',
    customer: '',
    product: '',
    size: '',
    quantity: 1,
    priority: 'Medium',
    required_date: '',
    gst_number: '',
    notes: ''
  });
  const [gstError, setGstError] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateGstNumber = (value: string): string => {
    if (!value) return '';
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (value.length < 15) return t('gstNumber') + ' must be 15 characters';
    if (!gstRegex.test(value)) return 'Invalid GST Number format';
    return '';
  };

  // Handle order sent from OrdersManagement
  useEffect(() => {
    if (orderForProduction) {
      setProductionForm({
        order_id: orderForProduction.order_id || '',
        customer: orderForProduction.customer || '',
        product: orderForProduction.product || '',
        size: orderForProduction.size || '',
        quantity: orderForProduction.quantity || 1,
        priority: orderForProduction.priority || 'Medium',
        required_date: orderForProduction.required_date || '',
        gst_number: '',
        notes: orderForProduction.notes || ''
      });
      setShowAddProduction(true);
      if (onClearOrderForProduction) {
        onClearOrderForProduction();
      }
    }
  }, [orderForProduction]);

  const resetProductionForm = () => {
    setProductionForm({
      order_id: '',
      customer: '',
      product: '',
      size: '',
      quantity: 1,
      priority: 'Medium',
      required_date: '',
      gst_number: '',
      notes: ''
    });
  };

  const handleAddProduction = async () => {
    const validationErrors = validateFields(productionForm, {
      order_id: { required: true, numeric: true, min: 1, label: 'Order ID' },
      customer: { required: true, min: 2, label: 'Customer' },
      product: { required: true },
      size: { required: true },
      quantity: { required: true, numeric: true, min: 1 },
      priority: { required: true },
    });
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    try {
      await productionService.createProductionOrder({
        order_id: Number(productionForm.order_id),
        customer: productionForm.customer,
        product: productionForm.product,
        size: productionForm.size,
        quantity: Number(productionForm.quantity),
        priority: productionForm.priority,
        required_date: productionForm.required_date || undefined,
        gst_number: productionForm.gst_number || undefined,
        notes: productionForm.notes || undefined,
      });
      toast.success('Production order created successfully');
      await refreshProduction();
      setShowAddProduction(false);
      resetProductionForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create production order');
    }
  };

  // Production stages matching the requirements
  

  // Production orders
  const [productionOrders, setProductionOrders] = useState<any[]>([]);

  const refreshProduction = useCallback(async () => {
    try {
      const data = await productionService.getProductionOrders();
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setProductionOrders(items);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { refreshProduction(); }, [refreshProduction]);

  const filteredOrders = productionOrders.filter(order => {
    const matchesSearch = order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.order_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = filterStage === 'all' || order.current_stage.toString() === filterStage;
    return matchesSearch && matchesStage;
  });

  const getStageColor = (stage: number) => {
    if (stage <= 3) return 'bg-red-500';
    if (stage <= 6) return 'bg-yellow-500';
    if (stage <= 9) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return 'destructive';
    if (priority === 'Medium') return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('productionBoard')}
        </h1>
        <p className="text-gray-500 mt-1">
          {t('manageTrackProductionOrders')}
        </p>
      </div>

      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input 
              placeholder={t('searchOrders')} 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {productionStages.map(stage => (
                <SelectItem key={stage.id} value={stage.id.toString()}>
                  Stage {stage.id}: {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowAddProduction(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addProduction')}
          </Button>
        </div>
      </div>

      {/* Add Production Dialog */}
      <Dialog open={showAddProduction} onOpenChange={(open: boolean) => {
        setShowAddProduction(open);
        if (!open) resetProductionForm();
        setErrors({});
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('addNewProduction')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Order Info if from Orders */}
            {productionForm.order_id && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
                <div className="font-semibold text-blue-900 mb-1">Order: {productionForm.order_id}</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-gray-600">Customer:</span> {productionForm.customer}</div>
                  <div><span className="text-gray-600">Product:</span> {productionForm.product} ({productionForm.size})</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('orderId')} *</Label>
                <Input
                  value={productionForm.order_id}
                  onChange={(e) => { setProductionForm({...productionForm, order_id: e.target.value}); setErrors(prev => ({...prev, order_id: ''})); }}
                  placeholder="e.g. 1001"
                />
                <FieldError message={errors.order_id} />
              </div>
              <div className="space-y-2">
                <Label>{t('customer')} *</Label>
                <Input
                  value={productionForm.customer}
                  onChange={(e) => { setProductionForm({...productionForm, customer: e.target.value}); setErrors(prev => ({...prev, customer: ''})); }}
                  placeholder="Customer name"
                />
                <FieldError message={errors.customer} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('product')} *</Label>
                <Select
                  value={productionForm.product}
                  onValueChange={(value) => { setProductionForm({...productionForm, product: value}); setErrors(prev => ({...prev, product: ''})); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="White Board">White Board</SelectItem>
                    <SelectItem value="Black Board">Black Board</SelectItem>
                    <SelectItem value="Green Board">Green Board</SelectItem>
                    <SelectItem value="Custom Board">Custom Board</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={errors.product} />
              </div>
              <div className="space-y-2">
                <Label>{t('size')} *</Label>
                <Select
                  value={productionForm.size}
                  onValueChange={(value) => { setProductionForm({...productionForm, size: value}); setErrors(prev => ({...prev, size: ''})); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3x4 ft">3x4 ft</SelectItem>
                    <SelectItem value="4x5 ft">4x5 ft</SelectItem>
                    <SelectItem value="4x6 ft">4x6 ft</SelectItem>
                    <SelectItem value="5x8 ft">5x8 ft</SelectItem>
                    <SelectItem value="6x10 ft">6x10 ft</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={errors.size} />
              </div>
              <div className="space-y-2">
                <Label>{t('quantity')} *</Label>
                <Input
                  type="number"
                  value={productionForm.quantity}
                  onChange={(e) => { setProductionForm({...productionForm, quantity: Number(e.target.value)}); setErrors(prev => ({...prev, quantity: ''})); }}
                  onKeyDown={blockInvalidNumberKeys}
                  min="1"
                />
                <FieldError message={errors.quantity} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('priority')} *</Label>
                <select
                  value={productionForm.priority}
                  onChange={(e) => { setProductionForm({...productionForm, priority: e.target.value}); setErrors(prev => ({...prev, priority: ''})); }}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('requiredDate')}</Label>
                <Input
                  type="date"
                  value={productionForm.required_date}
                  onChange={(e) => setProductionForm({...productionForm, required_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('gstNumber')}</Label>
                <Input
                  value={productionForm.gst_number}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setProductionForm({...productionForm, gst_number: val});
                    setGstError(val ? validateGstNumber(val) : '');
                  }}
                  placeholder={t('enterGstNumber')}
                  maxLength={15}
                  className={`border border-gray-300${gstError ? ' border-red-500' : ''}`}
                />
                {gstError && <p className="text-xs text-red-500">{gstError}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('notes')}</Label>
              <Input
                value={productionForm.notes}
                onChange={(e) => setProductionForm({...productionForm, notes: e.target.value})}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddProduction(false);
              resetProductionForm();
            }}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddProduction} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('addToProduction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { range: '1-2', label: 'Early Stage', count: productionOrders.filter(o => o.current_stage <= 2).length, color: 'bg-red-100 text-red-700' },
          { range: '3-4', label: 'Initial Process', count: productionOrders.filter(o => o.current_stage >= 3 && o.current_stage <= 4).length, color: 'bg-orange-100 text-orange-700' },
          { range: '5-7', label: 'Assembly', count: productionOrders.filter(o => o.current_stage >= 5 && o.current_stage <= 7).length, color: 'bg-yellow-100 text-yellow-700' },
          { range: '8-9', label: 'Finishing', count: productionOrders.filter(o => o.current_stage >= 8 && o.current_stage <= 9).length, color: 'bg-blue-100 text-blue-700' },
          { range: '10', label: 'Ready to Pack', count: productionOrders.filter(o => o.current_stage === 10).length, color: 'bg-green-100 text-green-700' },
        ].map(stat => (
          <Card key={stat.range}>
            <CardContent className="p-4">
              <Badge className={stat.color}>{stat.label}</Badge>
              <p className="text-gray-900 mt-2">{stat.count} orders</p>
              <p className="text-gray-600">Stage {stat.range}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Production Timeline Legend */}
      <Card>
        <CardHeader>
          <CardTitle>{t('productionProcess')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {productionStages.map((stage) => (
              <div key={stage.id} className="flex items-start gap-2">
                <div className={`w-8 h-8 rounded-full ${getStageColor(stage.id)} text-white flex items-center justify-center flex-shrink-0`}>
                  {stage.id}
                </div>
                <div>
                  <p className="text-gray-900">{stage.name}</p>
                  <p className="text-gray-600">{stage.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('productionOrders')} ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div 
                key={order.id}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => onViewOrder(order.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-blue-600">{order.order_number}</span>
                      <Badge variant={getPriorityColor(order.priority)}>
                        {order.priority} Priority
                      </Badge>
                      {order.delay_risk && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          At Risk
                        </Badge>
                      )}
                      {order.gst_number && <Badge variant="outline" className="font-mono">{order.gst_number}</Badge>}
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-gray-600">Customer</p>
                        <p className="text-gray-900">{order.customer}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Product</p>
                        <p className="text-gray-900">{order.product} - {order.size}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Quantity</p>
                        <p className="text-gray-900">{order.quantity} units</p>
                      </div>
                    </div>

                    {/* Current Stage */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full ${getStageColor(order.current_stage)} text-white flex items-center justify-center`}>
                            {order.current_stage}
                          </div>
                          <span className="text-gray-900">
                            Stage {order.current_stage}: {order.stage_name}
                          </span>
                        </div>
                        <span className="text-gray-600">{order.progress}% Complete</span>
                      </div>
                      <Progress value={order.progress} className="h-3" />
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-6 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Started: {order.started_at}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Due: {order.target_date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Est. Complete: {order.estimated_completion}</span>
                      </div>
                    </div>

                    {/* Stage Progress Bar */}
                    <div className="mt-3 flex items-center gap-1">
                      {productionStages.map((stage) => (
                        <div 
                          key={stage.id}
                          className={`h-2 flex-1 rounded ${
                            stage.id < order.current_stage 
                              ? 'bg-green-500' 
                              : stage.id === order.current_stage 
                              ? getStageColor(order.current_stage)
                              : 'bg-gray-200'
                          }`}
                          title={`Stage ${stage.id}: ${stage.name}`}
                        />
                      ))}
                    </div>
                  </div>

                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-600">Total Orders</p>
            <p className="text-gray-900">{productionOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-600">At Risk</p>
            <p className="text-red-600">{productionOrders.filter(o => o.delay_risk).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-600">High Priority</p>
            <p className="text-orange-600">{productionOrders.filter(o => o.priority === 'High').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-600">Avg. Progress</p>
            <p className="text-blue-600">
              {productionOrders.length > 0 ? Math.round(productionOrders.reduce((acc, o) => acc + o.progress, 0) / productionOrders.length) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
