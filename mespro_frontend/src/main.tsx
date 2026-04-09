import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { I18nProvider } from "./contexts/I18nContext";
import { SharedStateProvider } from "./contexts/SharedStateContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ModuleGuard from "./components/ModuleGuard";
import NotFoundPage from "./components/NotFoundPage";
import LoginPage from "./components/LoginPage";
import {
  DashboardPage,
  LeadsPage,
  OrdersPage,
  ProductionPage,
  OrderDetailPage,
  InventoryPage,
  DispatchPage,
  AttendancePage,
  ReportsPageRoute,
  StaffPage,
  UsersPage,
  PayrollPage,
  ClientsPage,
  ClientDetailPageWrapper,
  StockPage,
  FinancePage,
  LibraryPage,
  VendorsPage,
  SalesPage,
  ProductsPage,
  PurchaseOrderPage,
  BillingPage,
  AuditPage,
  SettingsPage,
} from "./components/pages";
import SuperAdminLayout from "./components/SuperAdminLayout";

export interface AppOutletContext {
  handleAuthVerified: (user: Record<string, any>) => void;
}

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <BrowserRouter>
      <SharedStateProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* SuperAdmin — completely separate layout, no sidebar */}
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute>
                <SuperAdminLayout />
              </ProtectedRoute>
            }
          />

          {/* Protected routes — all inside the App layout shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<ModuleGuard moduleKey="dashboard"><DashboardPage /></ModuleGuard>} />
            <Route path="leads" element={<ModuleGuard moduleKey="leads"><LeadsPage /></ModuleGuard>} />
            <Route path="orders" element={<ModuleGuard moduleKey="orders"><OrdersPage /></ModuleGuard>} />
            <Route path="billing" element={<ModuleGuard moduleKey="billing"><BillingPage /></ModuleGuard>} />
            <Route path="production" element={<ModuleGuard moduleKey="production"><ProductionPage /></ModuleGuard>} />
            <Route path="sales" element={<ModuleGuard moduleKey="sales"><SalesPage /></ModuleGuard>} />
            <Route path="inventory" element={<ModuleGuard moduleKey="inventory"><InventoryPage /></ModuleGuard>} />
            <Route path="stock" element={<ModuleGuard moduleKey="stock"><StockPage /></ModuleGuard>} />
            <Route path="purchase-orders" element={<ModuleGuard moduleKey="purchase_orders"><PurchaseOrderPage /></ModuleGuard>} />
            <Route path="dispatch" element={<ModuleGuard moduleKey="dispatch"><DispatchPage /></ModuleGuard>} />
            <Route path="products" element={<ModuleGuard moduleKey="products"><ProductsPage /></ModuleGuard>} />
            <Route path="clients" element={<ModuleGuard moduleKey="clients"><ClientsPage /></ModuleGuard>} />
            <Route path="clients/:clientId" element={<ModuleGuard moduleKey="clients"><ClientDetailPageWrapper /></ModuleGuard>} />
            <Route path="finance" element={<ModuleGuard moduleKey="finance"><FinancePage /></ModuleGuard>} />
            <Route path="audit" element={<ModuleGuard moduleKey="audit"><AuditPage /></ModuleGuard>} />
            <Route path="payroll" element={<ModuleGuard moduleKey="payroll"><PayrollPage /></ModuleGuard>} />
            <Route path="staff" element={<ModuleGuard moduleKey="staff"><StaffPage /></ModuleGuard>} />
            <Route path="attendance" element={<ModuleGuard moduleKey="attendance"><AttendancePage /></ModuleGuard>} />
            <Route path="vendors" element={<ModuleGuard moduleKey="vendors"><VendorsPage /></ModuleGuard>} />
            <Route path="users" element={<ModuleGuard moduleKey="users"><UsersPage /></ModuleGuard>} />
            <Route path="reports" element={<ModuleGuard moduleKey="reports"><ReportsPageRoute /></ModuleGuard>} />
            <Route path="settings" element={<ModuleGuard moduleKey="settings"><SettingsPage /></ModuleGuard>} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="order-detail/:orderId" element={<OrderDetailPage />} />
            {/* Catch-all → 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SharedStateProvider>
    </BrowserRouter>
  </I18nProvider>
);
