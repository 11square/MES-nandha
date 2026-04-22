/**
 * Route page wrappers
 * Thin components that pull shared state from context and pass
 * to the actual page components as props. This keeps the page
 * components themselves free of routing concerns.
 */
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSharedState } from '../contexts/SharedStateContext';
import { viewToPath } from '../lib/routes';

import AdminDashboard from './AdminDashboard';
import LeadsManagement from './LeadsManagement';
import OrdersManagement from './OrdersManagement';
import OrderDetail from './OrderDetail';
import ProductionBoard from './ProductionBoard';
import InventoryManagement from './InventoryManagement';
import DispatchManagement from './DispatchManagement';
import AttendanceTracking from './AttendanceTracking';
import ReportsPage from './ReportsPage';
import StaffManagement from './StaffManagement';
import UserManagement from './UserManagement';
import PayrollManagement from './PayrollManagement';
import ClientManagement from './ClientManagement';
import ClientDetailPageComponent from './ClientDetailPage';
import StockManagement from './StockManagement';
import FinanceManagement from './FinanceManagement';
import LibraryManagement from './LibraryManagement';
import SalesManagement from './SalesManagement';
import PurchaseOrderManagement from './PurchaseOrderManagement';
import BillingManagement from './BillingManagement';
import ProductManagement from './ProductManagement';
import AuditModule from './AuditModule';
import SettingsModule from './SettingsModule';
import VendorManagement from './VendorManagement';
import VendorDetailPageComponent from './VendorDetailPage';
import SuperAdminManagement from './SuperAdminManagement';

/* ---------- helper ---------- */
function useAppNav() {
  const navigate = useNavigate();
  return (view: string) => navigate(viewToPath[view] || '/dashboard');
}

function useViewOrder() {
  const navigate = useNavigate();
  return (orderId: string) => navigate(`/order-detail/${orderId}`);
}

/* ---------- page wrappers ---------- */

export function DashboardPage() {
  return <AdminDashboard onNavigate={useAppNav()} onViewOrder={useViewOrder()} />;
}

export function LeadsPage() {
  const { productCategories, products, setLeadForOrder } = useSharedState();
  const navigate = useNavigate();
  return (
    <LeadsManagement
      onNavigate={useAppNav()}
      productCategories={productCategories}
      products={products}
      onConvertToOrder={(leadData) => {
        setLeadForOrder(leadData);
        navigate('/orders');
      }}
    />
  );
}

export function OrdersPage() {
  const { productCategories, products, setOrderForBilling, setOrderForProduction, leadForOrder, setLeadForOrder } = useSharedState();
  const navigate = useNavigate();
  return (
    <OrdersManagement
      onNavigate={useAppNav()}
      onSendToBill={(data, billType) => {
        let resolvedBillType = billType;
        if (!resolvedBillType) {
          const choice = window.prompt('Select bill type: 1 for Invoice, 2 for Quotation Bill', '1');
          if (choice === null) return;
          resolvedBillType = choice.trim() === '2' ? 'quotation' : 'invoice';
        }
        setOrderForBilling(data);
        navigate('/billing', { state: { openBillForm: true, billType: resolvedBillType } });
      }}
      onSendToProduction={(data: any) => { setOrderForProduction(data); navigate('/production'); }}
      productCategories={productCategories}
      products={products}
      leadForOrder={leadForOrder}
      onClearLeadForOrder={() => setLeadForOrder(null)}
    />
  );
}

export function ProductionPage() {
  const { orderForProduction, setOrderForProduction } = useSharedState();
  return (
    <ProductionBoard
      onViewOrder={useViewOrder()}
      orderForProduction={orderForProduction}
      onClearOrderForProduction={() => setOrderForProduction(null)}
    />
  );
}

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { currentUser } = useSharedState();
  const navigate = useNavigate();
  return <OrderDetail orderId={orderId || null} userRole={currentUser?.role || 'Admin'} onBack={() => navigate('/production')} />;
}

export function InventoryPage() {
  const { currentUser } = useSharedState();
  return <InventoryManagement userRole={currentUser?.role || 'Admin'} />;
}

export function DispatchPage() {
  const { billForDispatch, setBillForDispatch } = useSharedState();
  return (
    <DispatchManagement
      onViewOrder={useViewOrder()}
      billForDispatch={billForDispatch}
      onClearBillForDispatch={() => setBillForDispatch(null)}
    />
  );
}

export function AttendancePage() {
  const { currentUser } = useSharedState();
  return <AttendanceTracking userRole={currentUser?.role || 'Admin'} />;
}

export function ReportsPageRoute() {
  const { currentUser } = useSharedState();
  return <ReportsPage userRole={currentUser?.role || 'Admin'} />;
}

export function StaffPage() {
  return <StaffManagement />;
}

export function UsersPage() {
  return <UserManagement />;
}

export function PayrollPage() {
  return <PayrollManagement />;
}

export function ClientsPage() {
  return <ClientManagement />;
}

export function ClientDetailPageWrapper() {
  return <ClientDetailPageComponent />;
}

export function VendorDetailPageWrapper() {
  return <VendorDetailPageComponent />;
}

export function StockPage() {
  return <StockManagement />;
}

export function FinancePage() {
  return <FinanceManagement />;
}

export function LibraryPage() {
  return <LibraryManagement />;
}

export function VendorsPage() {
  return <VendorManagement />;
}

export function SalesPage() {
  return <SalesManagement />;
}

export function ProductsPage() {
  const { productCategories, setProductCategories, products, setProducts } = useSharedState();
  return (
    <ProductManagement
      productCategories={productCategories}
      onCategoriesChange={setProductCategories}
      sharedProducts={products}
      onProductsChange={setProducts}
    />
  );
}

export function PurchaseOrderPage() {
  return <PurchaseOrderManagement />;
}

export function BillingPage() {
  const { orderForBilling, setOrderForBilling, setBillForDispatch } = useSharedState();
  const location = useLocation();
  const navigate = useNavigate();
  const openBillForm = !!(location.state as any)?.openBillForm;
  const preferredBillType = (location.state as any)?.billType as 'invoice' | 'quotation' | undefined;
  return (
    <BillingManagement
      orderForBilling={orderForBilling}
      onClearOrderForBilling={() => setOrderForBilling(null)}
      openBillForm={openBillForm}
      preferredBillType={preferredBillType}
      onSendToDispatch={(data) => {
        setBillForDispatch(data);
        navigate('/dispatch');
      }}
    />
  );
}

export function AuditPage() {
  return <AuditModule />;
}

export function SettingsPage() {
  return <SettingsModule />;
}

export function SuperAdminPage() {
  return <SuperAdminManagement />;
}
