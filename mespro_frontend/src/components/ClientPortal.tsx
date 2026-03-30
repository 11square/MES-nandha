import { toast } from 'sonner';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Package, 
  Download, 
  Clock, 
  CheckCircle2, 
  Star,
  AlertCircle,
  FileText,
  Phone,
  Mail
} from 'lucide-react';
import { Progress } from './ui/progress';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';

import { ordersService } from '../services/orders.service';

interface ClientPortalProps {
  clientId: string;
  onViewOrder?: (orderId: string) => void;
}

export default function ClientPortal({ clientId, onViewOrder }: ClientPortalProps) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showLRDialog, setShowLRDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Client orders fetched from API
  const [clientOrders, setClientOrders] = useState<any[]>([]);

  useEffect(() => {
    ordersService.getOrders().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setClientOrders(items);
    }).catch(() => {});
  }, []);

  const productionStages = [
    'Material Pasting',
    'Mica Pasting',
    'Curing/Binding',
    'Cutting',
    'Aluminium Edge',
    'Corner Pieces',
    'Hanging Rings',
    'Advertising Material',
    'PVC Cover',
    'Packing'
  ];

  const getStatusColor = (status: string) => {
    if (status === 'Delivered') return 'bg-green-100 text-green-700';
    if (status === 'In Transit') return 'bg-blue-100 text-blue-700';
    if (status === 'In Production') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const review = (form.elements.namedItem('review') as HTMLTextAreaElement)?.value || '';
    const validationErrors = validateFields({ review }, {
      review: { required: true, min: 5, label: 'Review' },
    });
    if (rating < 1) {
      validationErrors.rating = 'Please select a rating';
    }
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    toast.info('Thank you for your review! Your feedback has been submitted successfully.');
    setErrors({});
    setRating(0);
    setShowReviewDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <CardContent className="p-6">
          <h2 className="mb-2">Welcome to Your Order Dashboard</h2>
          <p>Track your orders, download shipping documents, and provide feedback</p>
        </CardContent>
      </Card>

      {/* Order Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-gray-600">In Production</p>
                <p className="text-gray-900">
                  {clientOrders.filter(o => o.status === 'In Production').length} orders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-600">In Transit</p>
                <p className="text-gray-900">
                  {clientOrders.filter(o => o.status === 'In Transit').length} orders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-gray-600">Delivered</p>
                <p className="text-gray-900">
                  {clientOrders.filter(o => o.status === 'Delivered').length} orders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientOrders.map((order) => (
              <div key={order.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-blue-600">{order.order_number}</span>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-gray-900">{order.product} - {order.size}</p>
                    <p className="text-gray-600">Quantity: {order.quantity} units</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                  >
                    {selectedOrder?.id === order.id ? 'Hide Details' : 'View Details'}
                  </Button>
                </div>

                {/* Order Timeline */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2 text-gray-600">
                    <span>Order Date: {order.order_date}</span>
                    <span>
                      {order.actual_delivery 
                        ? `Delivered: ${order.actual_delivery}` 
                        : `Expected: ${order.expected_delivery}`
                      }
                    </span>
                  </div>
                  <Progress value={order.progress} className="h-2" />
                  <p className="text-gray-600 mt-1">
                    {order.status === 'In Production' && `Stage ${order.current_stage} of ${order.total_stages}: ${productionStages[order.current_stage - 1]}`}
                    {order.status === 'In Transit' && 'Your order is on the way'}
                    {order.status === 'Delivered' && 'Order completed successfully'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t">
                  {order.has_lr && !order.lr_expired && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowLRDialog(true);
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download LR
                      </Button>
                      <span className="text-gray-600 text-xs">
                        (Expires: {order.lr_expiry_date})
                      </span>
                    </>
                  )}
                  
                  {order.has_lr && order.lr_expired && (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      LR Access Expired
                    </Badge>
                  )}

                  {order.tracking_url && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(order.tracking_url, '_blank')}
                    >
                      Track Shipment
                    </Button>
                  )}

                  {order.can_review && !order.review_submitted && (
                    <Button 
                      size="sm" 
                      className="bg-blue-600"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowReviewDialog(true);
                      }}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Write Review
                    </Button>
                  )}

                  {order.review_submitted && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Review Submitted
                    </Badge>
                  )}
                </div>

                {/* Expanded Details */}
                {selectedOrder?.id === order.id && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="mb-3">Production Timeline</h4>
                    <div className="space-y-2">
                      {productionStages.map((stage, index) => {
                        const stageNumber = index + 1;
                        const isCompleted = stageNumber < order.current_stage;
                        const isCurrent = stageNumber === order.current_stage;
                        
                        return (
                          <div 
                            key={index}
                            className={`flex items-center gap-3 p-2 rounded ${
                              isCompleted ? 'bg-green-50' : isCurrent ? 'bg-blue-50' : 'bg-gray-50'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isCompleted ? 'bg-green-500 text-white' :
                              isCurrent ? 'bg-blue-500 text-white' :
                              'bg-gray-300 text-gray-600'
                            }`}>
                              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stageNumber}
                            </div>
                            <div className="flex-1">
                              <p className={isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'}>
                                {stage}
                              </p>
                            </div>
                            {isCompleted && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Completed
                              </Badge>
                            )}
                            {isCurrent && (
                              <Badge variant="outline" className="text-blue-600 border-blue-600">
                                In Progress
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {order.review_submitted && (
                      <div className="mt-4 p-4 bg-gray-50 rounded">
                        <h4 className="mb-2">Your Review</h4>
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-5 h-5 ${star <= (order.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <p className="text-gray-900">{order.review}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-600">Call Us</p>
                <p className="text-gray-900">+91 98765 43210</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-600">Email Us</p>
                <p className="text-gray-900">support@mes.com</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LR Download Dialog */}
      {selectedOrder && (
        <Dialog open={showLRDialog} onOpenChange={setShowLRDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lorry Receipt (LR) - {selectedOrder.lr_number}</DialogTitle>
              <DialogDescription>
                Order: {selectedOrder.order_number}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-900 mb-1">Access Expires Soon</p>
                    <p className="text-yellow-700">
                      This LR will be available until {selectedOrder.lr_expiry_date}. Please download it for your records.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Order Details</Label>
                <p className="text-gray-900">{selectedOrder.product} - {selectedOrder.size}</p>
                <p className="text-gray-600">Quantity: {selectedOrder.quantity} units</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowLRDialog(false)}>
                  Close
                </Button>
                <Button 
                  className="bg-blue-600"
                  onClick={() => {
                    toast.info(`LR document downloaded!\n\nLR Number: ${selectedOrder.lr_number}\nOrder: ${selectedOrder.order_number}`);
                    setShowLRDialog(false);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download LR (PDF)
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Review Dialog */}
      {selectedOrder && (
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Write a Review</DialogTitle>
              <DialogDescription>
                Order: {selectedOrder.order_number} - {selectedOrder.product}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitReview} noValidate className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Rating *</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`w-8 h-8 cursor-pointer hover:text-yellow-500 hover:fill-yellow-500 transition-colors ${star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                      onClick={() => {
                        setRating(star);
                        setErrors(prev => ({ ...prev, rating: '' }));
                      }}
                      data-star={star}
                    />
                  ))}
                </div>
                <FieldError message={errors.rating} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="review">Your Review *</Label>
                <Textarea 
                  id="review" 
                  placeholder="Tell us about your experience with the product and service..."
                  rows={4}
                  onChange={() => setErrors(prev => ({ ...prev, review: '' }))}
                />
                <FieldError message={errors.review} />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setShowReviewDialog(false); setErrors({}); setRating(0); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600">
                  <Star className="w-4 h-4 mr-2" />
                  Submit Review
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
