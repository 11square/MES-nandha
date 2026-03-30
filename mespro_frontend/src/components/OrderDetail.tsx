import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ArrowLeft, 
  User, 
  Package, 
  Clock, 
  CheckCircle2, 
  PlayCircle,
  Upload,
  Download,
  Calendar,
  AlertCircle,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { StageInfo } from '../types';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';

import { ordersService } from '../services/orders.service';
import { productionService } from '../services/production.service';
interface OrderDetailProps {
  orderId: string | null;
  userRole: string;
  onBack: () => void;
}

export default function OrderDetail({ orderId, userRole, onBack }: OrderDetailProps) {
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  // Order data fetched from API
  const [order, setOrder] = useState<any>(null);

  // BOM (Bill of Materials)
  const [bom, setBom] = useState<any[]>([]);

  // Production stages with detailed logs
  const [productionStages, setProductionStages] = useState<any[]>([]);

  useEffect(() => {
    if (orderId) {
      ordersService.getOrderById(orderId).then(data => {
        if (data) setOrder(data);
      }).catch(() => {});
    }
  }, [orderId]);

  const getStageStatusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'in-progress') return 'bg-blue-500';
    return 'bg-gray-300';
  };

  const getStageStatusBadge = (status: string) => {
    if (status === 'completed') return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
    if (status === 'in-progress') return <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  };

  const canUpdateProduction = userRole === 'Production Manager' || userRole === 'Super Admin' || userRole === 'Admin';

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Production
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="default">High Priority</Badge>
          <Badge className="bg-blue-100 text-blue-700">In Production</Badge>
        </div>
      </div>

      {/* Order Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{order.orderNumber}</CardTitle>
              <p className="text-gray-600 mt-1">{order.customer}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600">Due Date</p>
              <p className="text-gray-900">{order.dueDate}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <Label>Product</Label>
              <p className="mt-1">{order.product}</p>
              <p className="text-gray-600">{order.size}</p>
            </div>
            <div>
              <Label>Quantity</Label>
              <p className="mt-1">{order.quantity} units</p>
            </div>
            <div>
              <Label>GST Number</Label>
              <p className="mt-1">{order.productionManager}</p>
              <p className="text-gray-600 font-mono">{order.gstNumber || '-'}</p>
            </div>
            <div>
              <Label>Progress</Label>
              <p className="mt-1">{order.progress}% Complete</p>
              <Progress value={order.progress} className="mt-2" />
            </div>
          </div>

          {/* Stage Progress Visual */}
          <div className="mt-6">
            <Label>Production Stages</Label>
            <div className="flex items-center gap-1 mt-2">
              {productionStages.map((stage) => (
                <div 
                  key={stage.id}
                  className={`h-3 flex-1 rounded ${getStageStatusColor(stage.status)} cursor-pointer hover:opacity-80`}
                  title={`Stage ${stage.id}: ${stage.name} - ${stage.status}`}
                  onClick={() => setSelectedStage(stage.id)}
                />
              ))}
            </div>
            <div className="flex items-center justify-between mt-2 text-gray-600">
              <span>Stage 1</span>
              <span>Current: Stage {order.currentStage}</span>
              <span>Stage 10</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="stages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stages">Production Stages</TabsTrigger>
          <TabsTrigger value="bom">BOM & Materials</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Production Stages Tab */}
        <TabsContent value="stages" className="space-y-4">
          {productionStages.map((stage, index) => (
            <Card key={stage.id} className={stage.status === 'in-progress' ? 'border-blue-500 border-2' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-full ${getStageStatusColor(stage.status)} text-white flex items-center justify-center flex-shrink-0`}>
                      {stage.status === 'completed' ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : stage.status === 'in-progress' ? (
                        <PlayCircle className="w-6 h-6" />
                      ) : (
                        <span>{stage.id}</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3>Stage {stage.id}: {stage.name}</h3>
                        {getStageStatusBadge(stage.status)}
                      </div>
                      <p className="text-gray-600 mb-3">{stage.description}</p>

                      {stage.status !== 'pending' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <Label>Operator</Label>
                            <p className="text-gray-900">{stage.operator}</p>
                          </div>
                          <div>
                            <Label>Started At</Label>
                            <p className="text-gray-900">{stage.startedAt}</p>
                          </div>
                          {stage.completedAt && (
                            <div>
                              <Label>Completed At</Label>
                              <p className="text-gray-900">{stage.completedAt}</p>
                            </div>
                          )}
                          {stage.qcPassed !== null && (
                            <div>
                              <Label>QC Status</Label>
                              <Badge className={stage.qcPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {stage.qcPassed ? 'Passed' : 'Failed'}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}

                      {stage.notes && (
                        <div className="mb-3">
                          <Label>Notes</Label>
                          <p className="text-gray-900 mt-1">{stage.notes}</p>
                        </div>
                      )}

                      {stage.materialsUsed && stage.materialsUsed.length > 0 && (
                        <div className="mb-3">
                          <Label>Materials Consumed</Label>
                          <div className="mt-2 space-y-1">
                            {stage.materialsUsed.map((material, i) => (
                              <div key={i} className="flex items-center gap-2 text-gray-600">
                                <Package className="w-4 h-4" />
                                <span>{material.material}: {material.quantity} units</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {stage.photos > 0 && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <ImageIcon className="w-4 h-4" />
                          <span>{stage.photos} photos attached</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {canUpdateProduction && (
                    <div className="flex flex-col gap-2">
                      {stage.status === 'pending' && index > 0 && productionStages[index - 1].status === 'completed' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-blue-600">
                              <PlayCircle className="w-4 h-4 mr-2" />
                              Start Stage
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Start Stage {stage.id}: {stage.name}</DialogTitle>
                              <DialogDescription>Log the start of this production stage</DialogDescription>
                            </DialogHeader>
                            <StageStartForm stage={stage} />
                          </DialogContent>
                        </Dialog>
                      )}
                      {stage.status === 'in-progress' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-green-600">
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Complete Stage
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Complete Stage {stage.id}: {stage.name}</DialogTitle>
                              <DialogDescription>Log the completion and QC results</DialogDescription>
                            </DialogHeader>
                            <StageCompleteForm stage={stage} />
                          </DialogContent>
                        </Dialog>
                      )}
                      {stage.status === 'completed' && (
                        <Button size="sm" variant="outline">
                          <ImageIcon className="w-4 h-4 mr-2" />
                          View Photos
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* BOM Tab */}
        <TabsContent value="bom">
          <Card>
            <CardHeader>
              <CardTitle>Bill of Materials (BOM)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bom.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <Package className="w-5 h-5 text-gray-400" />
                        <p className="text-gray-900">{item.material}</p>
                      </div>
                      <p className="text-gray-600 ml-8">
                        Required: {item.totalRequired} {item.unit} ({item.quantityPerUnit} per unit × {order.quantity})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600">In Stock</p>
                      <p className={item.inStock >= item.totalRequired ? 'text-green-600' : 'text-red-600'}>
                        {item.inStock} {item.unit}
                      </p>
                      {item.inStock < item.totalRequired && (
                        <Badge variant="destructive" className="mt-1">
                          Short by {item.totalRequired - item.inStock}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Company/Name</Label>
                  <p className="mt-1">{order.customer}</p>
                </div>
                <div>
                  <Label>Contact Person</Label>
                  <p className="mt-1">{order.contactPerson}</p>
                </div>
                <div>
                  <Label>Mobile</Label>
                  <p className="mt-1">{order.mobile}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="mt-1">{order.email}</p>
                </div>
                <div>
                  <Label>Delivery Address</Label>
                  <p className="mt-1">{order.address}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Board Type</Label>
                  <p className="mt-1">{order.specifications.micaType}</p>
                </div>
                <div>
                  <Label>Edge Type</Label>
                  <p className="mt-1">{order.specifications.edgeType}</p>
                </div>
                <div>
                  <Label>Corner Type</Label>
                  <p className="mt-1">{order.specifications.cornerType}</p>
                </div>
                <div>
                  <Label>Hanging Rings</Label>
                  <p className="mt-1">{order.specifications.hangingRings ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <Label>Advertising Spot</Label>
                  <p className="mt-1">{order.specifications.advertisingSpot}</p>
                </div>
                <div>
                  <Label>PVC Cover</Label>
                  <p className="mt-1">{order.specifications.pvcCover ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <Label>Packing Type</Label>
                  <p className="mt-1">{order.specifications.packingType}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Order Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-gray-900">Production Order (PDF)</p>
                      <p className="text-gray-600">Generated on {order.startedAt}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-gray-900">Bill of Materials (PDF)</p>
                      <p className="text-gray-600">Material list and quantities</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-gray-900">Production Photos</p>
                      <p className="text-gray-600">12 photos from various stages</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    View Album
                  </Button>
                </div>

                {canUpdateProduction && (
                  <div className="pt-4 border-t">
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StageStartForm({ stage }: { stage: StageInfo }) {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = {
      operator: (form.elements.namedItem('operator') as HTMLInputElement)?.value || '',
      startTime: (form.elements.namedItem('startTime') as HTMLInputElement)?.value || '',
    };
    const validationErrors = validateFields(formData, {
      operator: { required: true, label: 'Operator Name' },
      startTime: { required: true, label: 'Start Time' },
    });
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    toast.info(`Stage ${stage.id} started successfully!`);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="operator">Operator Name *</Label>
        <Input id="operator" placeholder="Enter operator name" onChange={() => setErrors(prev => ({ ...prev, operator: '' }))} />
        <FieldError message={errors.operator} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="startTime">Start Time *</Label>
        <Input id="startTime" type="datetime-local" onChange={() => setErrors(prev => ({ ...prev, startTime: '' }))} />
        <FieldError message={errors.startTime} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Any initial observations or notes" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" className="bg-blue-600">Start Stage</Button>
      </div>
    </form>
  );
}

function StageCompleteForm({ stage }: { stage: StageInfo }) {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = {
      completionTime: (form.elements.namedItem('completionTime') as HTMLInputElement)?.value || '',
      qcStatus: (form.elements.namedItem('qcStatus') as HTMLSelectElement)?.value || '',
      completionNotes: (form.elements.namedItem('completionNotes') as HTMLTextAreaElement)?.value || '',
    };
    const validationErrors = validateFields(formData, {
      completionTime: { required: true, label: 'Completion Time' },
      qcStatus: { required: true, label: 'QC Status' },
      completionNotes: { required: true, label: 'Completion Notes' },
    });
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    toast.info(`Stage ${stage.id} completed successfully!`);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="completionTime">Completion Time *</Label>
        <Input id="completionTime" type="datetime-local" onChange={() => setErrors(prev => ({ ...prev, completionTime: '' }))} />
        <FieldError message={errors.completionTime} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="qcStatus">QC Status *</Label>
        <select id="qcStatus" className="w-full border rounded p-2" onChange={() => setErrors(prev => ({ ...prev, qcStatus: '' }))}>
          <option value="">Select status</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </select>
        <FieldError message={errors.qcStatus} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="completionNotes">Completion Notes *</Label>
        <Textarea id="completionNotes" placeholder="Describe the work completed and quality" onChange={() => setErrors(prev => ({ ...prev, completionNotes: '' }))} />
        <FieldError message={errors.completionNotes} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="photos">Upload Photos</Label>
        <Input id="photos" type="file" multiple accept="image/*" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" className="bg-green-600">Complete Stage</Button>
      </div>
    </form>
  );
}
