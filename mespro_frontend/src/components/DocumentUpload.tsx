import { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { documentsService } from '../services';

interface ExtractedData {
  customer_name?: string;
  po_number?: string;
  order_date?: string;
  delivery_date?: string;
  product_type?: string;
  dimensions?: string;
  quantity?: number;
  price?: number;
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  special_instructions?: string;
}

interface DocumentUploadProps {
  onDataExtracted: (data: ExtractedData) => void;
  onClose: () => void;
}

export default function DocumentUpload({ onDataExtracted, onClose }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<number | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (uploadedFile: File) => {
    setFile(uploadedFile);
    setUploadError(null);
    processDocument(uploadedFile);
  };

  // Upload document to backend and extract data
  const processDocument = async (uploadedFile: File) => {
    setProcessing(true);
    setUploadError(null);
    
    try {
      const response = await documentsService.upload(uploadedFile, {
        category: 'purchase_order',
        description: 'Invoice/PO document upload for order extraction',
      });
      
      setDocumentId(response.id);
      
      // If backend returned extracted_data (future AI processing), use it
      if (response.extracted_data && Object.keys(response.extracted_data).length > 0) {
        setExtractedData(response.extracted_data as ExtractedData);
      } else {
        // Document uploaded successfully but no AI extraction yet — show empty form for manual entry
        setExtractedData({
          customer_name: '',
          po_number: '',
          order_date: new Date().toISOString().split('T')[0],
          delivery_date: '',
          product_type: 'White Board',
          dimensions: '',
          quantity: 1,
          price: 0,
          address: '',
          contact_person: '',
          phone: '',
          email: '',
          special_instructions: '',
        });
      }
    } catch (error: any) {
      console.error('Document upload failed:', error);
      setUploadError(error?.message || 'Failed to upload document. Please try again.');
      setFile(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg text-gray-900 font-medium">Upload Invoice / PO Document</h2>
              <p className="text-sm text-gray-600">AI will extract order details automatically</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!file ? (
            // Upload Area
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                dragActive 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-600" />
                </div>
                <div>
                  <p className="text-gray-900 mb-1">Drag and drop your document here</p>
                  <p className="text-sm text-gray-600">or</p>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileInput}
                  />
                  <span className="inline-flex h-10 items-center px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Browse Files
                  </span>
                </label>
                <p className="text-xs text-gray-500">Supports: PDF, JPG, PNG, DOC, DOCX</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* File Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                {processing ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>

              {/* Processing Status */}
              {processing && (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-900 mb-1">Uploading & analyzing document...</p>
                  <p className="text-sm text-gray-600">Uploading to server and extracting order details</p>
                </div>
              )}

              {/* Upload Error */}
              {uploadError && !processing && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800 font-medium">Upload Failed</p>
                    <p className="text-sm text-red-600 mt-1">{uploadError}</p>
                  </div>
                </div>
              )}

              {/* Extracted Data */}
              {extractedData && !processing && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="text-gray-900 font-medium">Extracted Information</h3>
                    <span className="text-xs text-gray-600">(Review and confirm)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Customer Details */}
                    <div className="col-span-2">
                      <h4 className="text-sm text-gray-700 font-medium mb-3">Customer Information</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600">Customer Name</label>
                          <input 
                            type="text" 
                            value={extractedData.customer_name}
                            onChange={(e) => setExtractedData({...extractedData, customer_name: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Contact Person</label>
                          <input 
                            type="text" 
                            value={extractedData.contact_person}
                            onChange={(e) => setExtractedData({...extractedData, contact_person: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Phone</label>
                          <input 
                            type="text" 
                            value={extractedData.phone}
                            onChange={(e) => setExtractedData({...extractedData, phone: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Email</label>
                          <input 
                            type="text" 
                            value={extractedData.email}
                            onChange={(e) => setExtractedData({...extractedData, email: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-600">Delivery Address</label>
                          <input 
                            type="text" 
                            value={extractedData.address}
                            onChange={(e) => setExtractedData({...extractedData, address: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="col-span-2">
                      <h4 className="text-sm text-gray-700 font-medium mb-3 mt-2">Order Details</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600">PO Number</label>
                          <input 
                            type="text" 
                            value={extractedData.po_number}
                            onChange={(e) => setExtractedData({...extractedData, po_number: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Order Date</label>
                          <input 
                            type="date" 
                            value={extractedData.order_date}
                            onChange={(e) => setExtractedData({...extractedData, order_date: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Delivery Date</label>
                          <input 
                            type="date" 
                            value={extractedData.delivery_date}
                            onChange={(e) => setExtractedData({...extractedData, delivery_date: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Product Type</label>
                          <select 
                            value={extractedData.product_type}
                            onChange={(e) => setExtractedData({...extractedData, product_type: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                          >
                            <option value="White Board">White Board</option>
                            <option value="Black Board">Black Board</option>
                            <option value="Mica White">Mica White</option>
                            <option value="Mica Black">Mica Black</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Dimensions</label>
                          <input 
                            type="text" 
                            value={extractedData.dimensions}
                            onChange={(e) => setExtractedData({...extractedData, dimensions: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Quantity</label>
                          <input 
                            type="number" 
                            value={extractedData.quantity}
                            onChange={(e) => setExtractedData({...extractedData, quantity: parseInt(e.target.value)})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Price (₹)</label>
                          <input 
                            type="number" 
                            value={extractedData.price}
                            onChange={(e) => setExtractedData({...extractedData, price: parseInt(e.target.value)})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-600">Special Instructions</label>
                          <textarea 
                            value={extractedData.special_instructions}
                            onChange={(e) => setExtractedData({...extractedData, special_instructions: e.target.value})}
                            rows={2}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {extractedData && !processing && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <button
              onClick={() => {
                setFile(null);
                setExtractedData(null);
                setUploadError(null);
                setDocumentId(null);
              }}
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              Upload different document
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}