# Component Migration Guide

## Quick Reference: Updating Components

### Pattern to Follow

Every component that currently uses `language` prop needs to be updated following this pattern:

---

## Example 1: LeadsManagement (Already Updated ✓)

### Before:
```tsx
import { translations, Language } from '../translations';
import { mockLeads } from '../data/mockLeads';

interface LeadsManagementProps {
  onNavigate: (view: string) => void;
  language?: Language;
}

export default function LeadsManagement({ onNavigate, language = 'en' }: LeadsManagementProps) {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const leads = mockLeads;
  
  return <div>{t('leads')}</div>;
}
```

### After:
```tsx
import { useI18n } from '../contexts/I18nContext';
import { leadsService } from '../services';

interface LeadsManagementProps {
  onNavigate: (view: string) => void;
  // language prop removed
}

export default function LeadsManagement({ onNavigate }: LeadsManagementProps) {
  const { t } = useI18n(); // Get translation function from context
  const [leads, setLeads] = useState([]);
  
  useEffect(() => {
    // Use service instead of direct import
    leadsService.getLeads().then(setLeads);
  }, []);
  
  return <div>{t('leads')}</div>;
}
```

---

## Example 2: ClientManagement (Not Yet Updated)

### Current State:
```tsx
import { translations, Language } from '../translations';
import { initialClientsData } from '../data/mockClients';

interface ClientManagementProps {
  language?: Language;
}

export default function ClientManagement({ language = 'en' }: ClientManagementProps) {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const clients = initialClientsData;
}
```

### How to Update:
```tsx
import { useI18n } from '../contexts/I18nContext';
import { clientsService } from '../services';

interface ClientManagementProps {
  // Remove language prop
}

export default function ClientManagement() {
  const { t } = useI18n();
  const [clients, setClients] = useState([]);
  
  useEffect(() => {
    clientsService.getClients().then(setClients);
  }, []);
}
```

---

## Example 3: ProductionBoard (Not Yet Updated)

### Current State:
```tsx
import { translations, Language } from '../translations';
import { mockProductionOrders } from '../data/mockProduction';

interface ProductionBoardProps {
  onViewOrder: (id: string) => void;
  language?: Language;
}

export default function ProductionBoard({ onViewOrder, language = 'en' }: ProductionBoardProps) {
  const t = (key) => translations[language][key] || translations.en[key];
  const orders = mockProductionOrders;
}
```

### How to Update:
```tsx
import { useI18n } from '../contexts/I18nContext';
import { productionService } from '../services';

interface ProductionBoardProps {
  onViewOrder: (id: string) => void;
  // Remove language prop
}

export default function ProductionBoard({ onViewOrder }: ProductionBoardProps) {
  const { t } = useI18n();
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    productionService.getProductionOrders().then(setOrders);
  }, []);
}
```

---

## Checklist for Each Component

- [ ] Remove `import { translations, Language } from '../translations'`
- [ ] Add `import { useI18n } from '../contexts/I18nContext'`
- [ ] Add service import if needed (e.g., `import { clientsService } from '../services'`)
- [ ] Remove `language?: Language` from props interface
- [ ] Remove `language = 'en'` from component parameters
- [ ] Replace `const t = (key) => translations[language][key]...` with `const { t } = useI18n()`
- [ ] Replace direct mock data usage with service calls
- [ ] Add state management for data loaded from services
- [ ] Add useEffect to load data on component mount

---

## Components That Need Update

Based on App.tsx, these components still have language props:

1. ✅ LeadsManagement - Already updated
2. ⬜ OrdersManagement
3. ⬜ ProductionBoard
4. ⬜ OrderDetail
5. ⬜ InventoryManagement
6. ⬜ DispatchManagement
7. ⬜ AttendanceTracking
8. ⬜ ReportsPage
9. ⬜ StaffManagement
10. ⬜ UserManagement
11. ⬜ PayrollManagement
12. ⬜ ClientManagement
13. ⬜ StockManagement
14. ⬜ FinanceManagement
15. ⬜ LibraryManagement
16. ⬜ VendorManagement
17. ⬜ SalesManagement
18. ⬜ ProductManagement
19. ⬜ PurchaseOrderManagement
20. ⬜ BillingManagement
21. ⬜ AuditModule
22. ⬜ SettingsModule
23. ⬜ AdminDashboard

---

## Services to Create

Create these service files following the pattern in `leads.service.ts`:

1. ✅ leads.service.ts - Already created
2. ✅ clients.service.ts - Already created
3. ✅ production.service.ts - Already created
4. ⬜ orders.service.ts
5. ⬜ inventory.service.ts
6. ⬜ dispatch.service.ts
7. ⬜ attendance.service.ts
8. ⬜ reports.service.ts
9. ⬜ staff.service.ts
10. ⬜ users.service.ts
11. ⬜ payroll.service.ts
12. ⬜ stock.service.ts
13. ⬜ finance.service.ts
14. ⬜ vendors.service.ts
15. ⬜ sales.service.ts
16. ⬜ products.service.ts
17. ⬜ purchaseOrders.service.ts
18. ⬜ billing.service.ts
19. ⬜ audit.service.ts

---

## Service Template

Copy this template for new services:

```typescript
/**
 * [Module Name] Service
 * Handles all [module]-related API operations
 * TODO: Replace mock data imports with actual API calls
 */

import { apiService } from './api.service';
import { mockDataImport } from '../data/mockDataFile';

class ModuleService {
  private useMockData = true;

  async getItems(): Promise<any[]> {
    if (this.useMockData) {
      return Promise.resolve(mockDataImport);
    }
    return apiService.get<any[]>('/endpoint');
  }

  async getItemById(id: string): Promise<any> {
    if (this.useMockData) {
      return Promise.resolve(
        mockDataImport.find(item => item.id === id)
      );
    }
    return apiService.get<any>(`/endpoint/${id}`);
  }

  async createItem(item: any): Promise<any> {
    if (this.useMockData) {
      return Promise.resolve(item);
    }
    return apiService.post<any>('/endpoint', item);
  }

  async updateItem(id: string, item: any): Promise<any> {
    if (this.useMockData) {
      return Promise.resolve(item);
    }
    return apiService.put<any>(`/endpoint/${id}`, item);
  }

  async deleteItem(id: string): Promise<void> {
    if (this.useMockData) {
      return Promise.resolve();
    }
    return apiService.delete<void>(`/endpoint/${id}`);
  }
}

export const moduleService = new ModuleService();
export default moduleService;
```

---

## Testing After Migration

1. **Test component renders:**
   ```bash
   npm run dev
   ```

2. **Test language switching:**
   - Add a language switcher button temporarily
   - Verify translations change properly

3. **Test data loading:**
   - Verify mock data loads correctly
   - Check browser console for errors

4. **Type checking:**
   ```bash
   npm run type-check
   ```

---

## Common Issues & Solutions

### Issue: Component breaks after removing language prop
**Solution:** Make sure you imported `useI18n` and called it inside the component

### Issue: TypeScript errors about missing types
**Solution:** Use `any` type for now, proper types can be added later

### Issue: Data not loading from services
**Solution:** Check that you're calling the service in useEffect and updating state

### Issue: Translation not found
**Solution:** Verify the translation key exists in translations.ts

---

## Need Help?

1. Refer to `LeadsManagement.tsx` as a working example
2. Check `CODE_CLEANUP_SUMMARY.md` for overview
3. Review service files in `src/services/` for patterns
4. Test incrementally - update one component at a time
