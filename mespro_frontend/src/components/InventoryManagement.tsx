import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { translations, Language } from '../translations';
import { inventoryService } from '../services/inventory.service';
import { 
  Search, 
  Plus, 
  AlertTriangle, 
  Package, 
  TrendingDown,
  TrendingUp,
  Download,
  Upload,
  FileText
} from 'lucide-react';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';

interface InventoryManagementProps {
  userRole: string;
  language?: Language;
}

export default function InventoryManagement({ userRole, language = 'en' }: InventoryManagementProps) {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');

  // Inventory data from API
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);

  const [finishedGoods, setFinishedGoods] = useState<any[]>([]);

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const [pendingRequisitions, setPendingRequisitions] = useState<any[]>([]);

  useEffect(() => {
    inventoryService.getRawMaterials().then(data => { const items = Array.isArray(data) ? data : (data as any)?.items || []; setRawMaterials(items); }).catch(() => {});
    inventoryService.getFinishedGoods().then(data => { const items = Array.isArray(data) ? data : (data as any)?.items || []; setFinishedGoods(items); }).catch(() => {});
    inventoryService.getTransactions().then(data => { const items = Array.isArray(data) ? data : (data as any)?.items || []; setRecentTransactions(items); }).catch(() => {});
    inventoryService.getRequisitions().then(data => { const items = Array.isArray(data) ? data : (data as any)?.items || []; setPendingRequisitions(items); }).catch(() => {});
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'critical') return 'destructive';
    if (status === 'low') return 'default';
    return 'secondary';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'critical') return 'Critical - Reorder Now';
    if (status === 'low') return 'Low Stock';
    return 'Sufficient';
  };

  const filteredMaterials = rawMaterials.filter(material => 
    material.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canManageStock = userRole === 'Storekeeper' || userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Production Manager';

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder={t('searchMaterials')} 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {canManageStock && (
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  {t('stockInGrn')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('goodsReceiptNote')}</DialogTitle>
                  <DialogDescription>{t('recordIncomingStock')}</DialogDescription>
                </DialogHeader>
                <StockInForm />
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  {t('stockOut')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('stockConsumption')}</DialogTitle>
                  <DialogDescription>{t('recordMaterialUsage')}</DialogDescription>
                </DialogHeader>
                <StockOutForm />
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('purchaseRequisition')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('createPurchaseRequisition')}</DialogTitle>
                  <DialogDescription>{t('requestMaterials')}</DialogDescription>
                </DialogHeader>
                <PurchaseRequisitionForm />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-gray-600">{t('criticalStock')}</p>
                <p className="text-gray-900">
                  {rawMaterials.filter(m => m.status === 'critical').length} {t('items')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-gray-600">{t('lowStock')}</p>
                <p className="text-gray-900">
                  {rawMaterials.filter(m => m.status === 'low').length} {t('items')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-gray-600">{t('totalMaterials')}</p>
                <p className="text-gray-900">{rawMaterials.length} {t('items')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-gray-600">{t('pendingPrs')}</p>
                <p className="text-gray-900">{pendingRequisitions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="raw-materials">
        <TabsList>
          <TabsTrigger value="raw-materials">{t('rawMaterials')}</TabsTrigger>
          <TabsTrigger value="finished-goods">{t('finishedGoods')}</TabsTrigger>
          <TabsTrigger value="transactions">{t('transactions')}</TabsTrigger>
          <TabsTrigger value="requisitions">{t('purchaseRequisitions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="raw-materials">
          <Card>
            <CardHeader>
              <CardTitle>{t('rawMaterialInventory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredMaterials.map((material) => (
                  <div key={material.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Package className="w-5 h-5 text-gray-400" />
                          <h4 className="text-gray-900">{material.name}</h4>
                          <Badge variant={getStatusColor(material.status)}>
                            {getStatusLabel(material.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-8">
                          <div>
                            <p className="text-gray-600">Current Stock</p>
                            <p className={material.stock < material.reorder_point ? 'text-red-600' : 'text-gray-900'}>
                              {material.stock} {material.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Reorder Point</p>
                            <p className="text-gray-900">{material.reorder_point} {material.unit}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Last Received</p>
                            <p className="text-gray-900">{material.last_received}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Supplier</p>
                            <p className="text-gray-900">{material.supplier}</p>
                          </div>
                        </div>

                        {material.stock < material.reorder_point && (
                          <div className="mt-3 ml-8 p-3 bg-red-50 border border-red-200 rounded flex items-center justify-between">
                            <div className="flex items-center gap-2 text-red-700">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Stock below reorder point. Need {material.reorder_point - material.stock} more {material.unit}</span>
                            </div>
                            {canManageStock && (
                              <Button size="sm" variant="outline" className="text-red-700 border-red-300">
                                Create PR
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {canManageStock && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Adjust</Button>
                          <Button size="sm" variant="outline">History</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finished-goods">
          <Card>
            <CardHeader>
              <CardTitle>Finished Goods Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {finishedGoods.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-gray-900">{item.product}</p>
                        <p className="text-gray-600">{item.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900">{item.stock} {item.unit}</p>
                      <p className="text-gray-600">Available</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {transaction.type === 'in' ? (
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        </div>
                      )}
                      <div>
                        <p className="text-gray-900">{transaction.material}</p>
                        <p className="text-gray-600">
                          {transaction.type === 'in' ? 'Received' : 'Consumed'}: {transaction.quantity} units
                        </p>
                        <p className="text-gray-600">
                          Ref: {transaction.reference} • By {transaction.user}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600">{transaction.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requisitions">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Requisitions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingRequisitions.map((pr) => (
                  <div key={pr.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-blue-600">{pr.id}</span>
                          <Badge>{pr.status}</Badge>
                          <Badge variant={pr.priority === 'High' ? 'destructive' : 'secondary'}>
                            {pr.priority} Priority
                          </Badge>
                        </div>
                        <p className="text-gray-900 mb-1">{pr.material}</p>
                        <p className="text-gray-600">Quantity: {pr.quantity} units</p>
                        <p className="text-gray-600">Requested by: {pr.requested_by} on {pr.date}</p>
                      </div>
                      {canManageStock && (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600">Approve</Button>
                          <Button size="sm" variant="outline">Reject</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StockInForm() {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = {
      material: (form.elements.namedItem('material') as HTMLInputElement)?.value || '',
      quantity: (form.elements.namedItem('quantity') as HTMLInputElement)?.value || '',
      poNumber: (form.elements.namedItem('poNumber') as HTMLInputElement)?.value || '',
    };
    const validationErrors = validateFields(formData, {
      material: { required: true },
      quantity: { required: true, numeric: true, min: 1 },
      poNumber: { required: true, label: 'PO Number' },
    });
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    try {
      await inventoryService.createTransaction({
        type: 'stock_in',
        material: (form.elements.namedItem('material') as HTMLInputElement)?.value,
        quantity: parseInt((form.elements.namedItem('quantity') as HTMLInputElement)?.value) || 0,
        po_number: (form.elements.namedItem('poNumber') as HTMLInputElement)?.value,
        supplier: (form.elements.namedItem('supplier') as HTMLInputElement)?.value,
        notes: (form.elements.namedItem('notes') as HTMLTextAreaElement)?.value,
      });
      toast.success('Stock received and GRN generated successfully!');
      setErrors({});
      form.reset();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record stock in');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="material">Material *</Label>
        <Input id="material" placeholder="Select or enter material" list="materials" onChange={() => setErrors(prev => ({ ...prev, material: '' }))} />
        <FieldError message={errors.material} />
        <datalist id="materials">
          <option value="9.5mm MDF Sheet" />
          <option value="White Mica Sheet" />
          <option value="Black Mica Sheet" />
        </datalist>
      </div>
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity *</Label>
        <Input id="quantity" type="number" placeholder="Enter quantity" onKeyDown={blockInvalidNumberKeys} onChange={() => setErrors(prev => ({ ...prev, quantity: '' }))} />
        <FieldError message={errors.quantity} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="poNumber">PO Number *</Label>
        <Input id="poNumber" placeholder="PO-2024-XXX" onChange={() => setErrors(prev => ({ ...prev, poNumber: '' }))} />
        <FieldError message={errors.poNumber} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="supplier">Supplier</Label>
        <Input id="supplier" placeholder="Enter supplier name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Any notes about the receipt" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" className="bg-green-600">Receive Stock</Button>
      </div>
    </form>
  );
}

function StockOutForm() {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = {
      material: (form.elements.namedItem('material') as HTMLInputElement)?.value || '',
      quantity: (form.elements.namedItem('quantity') as HTMLInputElement)?.value || '',
      orderRef: (form.elements.namedItem('orderRef') as HTMLInputElement)?.value || '',
    };
    const validationErrors = validateFields(formData, {
      material: { required: true },
      quantity: { required: true, numeric: true, min: 1 },
      orderRef: { required: true, label: 'Order Reference' },
    });
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    try {
      await inventoryService.createTransaction({
        type: 'stock_out',
        material: (form.elements.namedItem('material') as HTMLInputElement)?.value,
        quantity: parseInt((form.elements.namedItem('quantity') as HTMLInputElement)?.value) || 0,
        order_ref: (form.elements.namedItem('orderRef') as HTMLInputElement)?.value,
        purpose: (form.elements.namedItem('purpose') as HTMLTextAreaElement)?.value,
      });
      toast.success('Stock consumption recorded successfully!');
      setErrors({});
      form.reset();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record stock out');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="material">Material *</Label>
        <Input id="material" placeholder="Select material" list="materials" onChange={() => setErrors(prev => ({ ...prev, material: '' }))} />
        <FieldError message={errors.material} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity *</Label>
        <Input id="quantity" type="number" placeholder="Enter quantity" onKeyDown={blockInvalidNumberKeys} onChange={() => setErrors(prev => ({ ...prev, quantity: '' }))} />
        <FieldError message={errors.quantity} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="orderRef">Order Reference *</Label>
        <Input id="orderRef" placeholder="ORD-2024-XXX" onChange={() => setErrors(prev => ({ ...prev, orderRef: '' }))} />
        <FieldError message={errors.orderRef} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="purpose">Purpose</Label>
        <Textarea id="purpose" placeholder="Purpose of consumption" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" className="bg-red-600">Record Consumption</Button>
      </div>
    </form>
  );
}

function PurchaseRequisitionForm() {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = {
      material: (form.elements.namedItem('material') as HTMLInputElement)?.value || '',
      quantity: (form.elements.namedItem('quantity') as HTMLInputElement)?.value || '',
      priority: (form.elements.namedItem('priority') as HTMLSelectElement)?.value || '',
      reason: (form.elements.namedItem('reason') as HTMLTextAreaElement)?.value || '',
    };
    const validationErrors = validateFields(formData, {
      material: { required: true },
      quantity: { required: true, numeric: true, min: 1 },
      priority: { required: true },
      reason: { required: true },
    });
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    try {
      await inventoryService.createRequisition({
        material: (form.elements.namedItem('material') as HTMLInputElement)?.value,
        quantity: parseInt((form.elements.namedItem('quantity') as HTMLInputElement)?.value) || 0,
        priority: (form.elements.namedItem('priority') as HTMLSelectElement)?.value,
        reason: (form.elements.namedItem('reason') as HTMLTextAreaElement)?.value,
      });
      toast.success('Purchase Requisition created successfully!');
      setErrors({});
      form.reset();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create purchase requisition');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="material">Material *</Label>
        <Input id="material" placeholder="Enter material name" list="materials" onChange={() => setErrors(prev => ({ ...prev, material: '' }))} />
        <FieldError message={errors.material} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity *</Label>
        <Input id="quantity" type="number" placeholder="Enter quantity" onKeyDown={blockInvalidNumberKeys} onChange={() => setErrors(prev => ({ ...prev, quantity: '' }))} />
        <FieldError message={errors.quantity} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="priority">Priority *</Label>
        <select id="priority" className="w-full border rounded p-2" onChange={() => setErrors(prev => ({ ...prev, priority: '' }))}>
          <option value="">Select priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <FieldError message={errors.priority} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reason">Reason *</Label>
        <Textarea id="reason" placeholder="Why is this material needed?" onChange={() => setErrors(prev => ({ ...prev, reason: '' }))} />
        <FieldError message={errors.reason} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" className="bg-blue-600">Create PR</Button>
      </div>
    </form>
  );
}
