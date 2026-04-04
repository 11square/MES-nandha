const ApiResponse = require('../utils/ApiResponse');

/**
 * Settings controller — returns per-category defaults.
 * Until a dedicated settings table is added, GET returns defaults
 * and PUT echoes back the submitted payload.
 */

const defaults = {
  company: {
    company_name: '',
    address: '',
    phone: '',
    email: '',
    gst_number: '',
    pan_number: '',
    logo_url: '',
  },
  tax: {
    gst_enabled: true,
    default_gst_rate: 18,
    hsn_code: '',
    tax_inclusive: false,
  },
  invoice: {
    prefix: 'INV',
    next_number: 1,
    terms_and_conditions: '',
    footer_note: '',
    show_logo: true,
  },
  notification: {
    email_notifications: true,
    sms_notifications: false,
    order_alerts: true,
    payment_alerts: true,
    stock_alerts: true,
  },
  system: {
    date_format: 'DD/MM/YYYY',
    currency: 'INR',
    currency_symbol: '₹',
    timezone: 'Asia/Kolkata',
    language: 'en',
  },
  security: {
    two_factor_enabled: false,
    session_timeout: 60,
    password_policy: 'medium',
    ip_whitelist: [],
  },
};

const getCategory = (category) => async (req, res) => {
  ApiResponse.success(res, defaults[category], `${category} settings retrieved`);
};

const updateCategory = (category) => async (req, res) => {
  // Merge incoming data with defaults (no persistence yet)
  const updated = { ...defaults[category], ...req.body };
  ApiResponse.success(res, updated, `${category} settings updated`);
};

module.exports = {
  getCompany: getCategory('company'),
  updateCompany: updateCategory('company'),
  getTax: getCategory('tax'),
  updateTax: updateCategory('tax'),
  getInvoice: getCategory('invoice'),
  updateInvoice: updateCategory('invoice'),
  getNotification: getCategory('notification'),
  updateNotification: updateCategory('notification'),
  getSystem: getCategory('system'),
  updateSystem: updateCategory('system'),
  getSecurity: getCategory('security'),
  updateSecurity: updateCategory('security'),
  getAll: async (req, res) => {
    ApiResponse.success(res, defaults, 'All settings retrieved');
  },
};
