import { test, expect } from '../fixtures';

const vendors = [
  {
    name: 'Sri Balaji Paper Mills',
    contact_person: 'Rajesh Kumar',
    email: 'rajesh@balajipaper.in',
    phone: '9876543210',
    category: 'Raw Materials',
    gst_number: '33AABCS1234B1Z5',
    address: '12, Industrial Estate, Sivakasi, Tamil Nadu',
    opening_balance: '15000',
  },
  {
    name: 'Lakshmi Ink Suppliers',
    contact_person: 'Meena Devi',
    email: 'meena@lakshmiink.com',
    phone: '9123456780',
    category: 'Raw Materials',
    gst_number: '33BBCDE5678F1Z9',
    address: '45, Anna Nagar, Madurai, Tamil Nadu',
    opening_balance: '8500',
  },
  {
    name: 'KPR Machinery Works',
    contact_person: 'Senthil Murugan',
    email: 'senthil@kprmachinery.in',
    phone: '9988776655',
    category: 'Equipment',
    gst_number: '33CDEFG9012H1Z3',
    address: '78, SIDCO Industrial Park, Coimbatore, Tamil Nadu',
    opening_balance: '50000',
  },
  {
    name: 'VKS Packaging Solutions',
    contact_person: 'Arun Prakash',
    email: 'arun@vkspack.com',
    phone: '9445566778',
    category: 'Services',
    gst_number: '33DEFGH3456I1Z7',
    address: '23, Ambattur OT, Chennai, Tamil Nadu',
    opening_balance: '0',
  },
  {
    name: 'Devi Traders',
    contact_person: 'Karthik Rajan',
    email: 'karthik@devitraders.in',
    phone: '9334455667',
    category: 'Raw Materials',
    gst_number: '33EFGHI7890J1Z1',
    address: '56, Gandhi Road, Erode, Tamil Nadu',
    opening_balance: '12000',
  },
];

test.describe.serial('Seed 5 Vendors', () => {
  for (const vendor of vendors) {
    test(`Add vendor: ${vendor.name}`, async ({ authenticatedPage: page }) => {
      await page.goto('/vendors');
      await page.waitForLoadState('networkidle');

      // Click Add Vendor button
      await page.getByRole('button', { name: /add vendor/i }).click();

      // Wait for the dialog to appear
      await expect(page.getByText('Add New Vendor')).toBeVisible();

      // Fill the form using stable id selectors
      await page.locator('#vendor-name').fill(vendor.name);
      await page.locator('#vendor-contact').fill(vendor.contact_person);
      await page.locator('#vendor-email').fill(vendor.email);
      await page.locator('#vendor-phone').fill(vendor.phone);
      await page.locator('#vendor-category').fill(vendor.category);
      await page.locator('#vendor-gst').fill(vendor.gst_number);
      await page.locator('#vendor-address').fill(vendor.address);

      if (vendor.opening_balance && vendor.opening_balance !== '0') {
        await page.locator('#vendor-opening-balance').fill(vendor.opening_balance);
      }

      // Submit the form - click Add button inside the dialog
      const dialog = page.locator('[role="dialog"]');
      await dialog.getByRole('button', { name: /^add$/i }).click();

      // Wait for dialog to close (indicates success)
      await expect(dialog).toBeHidden({ timeout: 10000 });

      // Verify vendor appears in the table
      await expect(page.getByText(vendor.name).first()).toBeVisible({ timeout: 10000 });
    });
  }
});
