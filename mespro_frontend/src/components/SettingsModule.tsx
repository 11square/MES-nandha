import React, { useState, useEffect } from 'react';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { translations, Language } from '../translations';
import { settingsService } from '../services/settings.service';
import { 
  Settings,
  Building2,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Printer,
  Mail,
  Globe,
  Save,
  RefreshCw,
  Upload,
  Download,
  Key,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info,
  Server,
  HardDrive,
  Wifi,
  Clock,
  Calendar,
  IndianRupee,
  Percent,
  FileText,
  Image
} from 'lucide-react';

interface SettingsModuleProps {
  language?: Language;
}

const SettingsModule: React.FC<SettingsModuleProps> = ({ language = 'en' }) => {
  // Translation helper
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];

  // Company Settings — initialized empty, fetched from DB
  const [companySettings, setCompanySettings] = useState({
    companyName: '',
    tagline: '',
    gstNo: '',
    panNo: '',
    cinNo: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
    phone: '',
    mobile: '',
    email: '',
    website: '',
    logo: null as File | null,
  });

  // Tax Settings — initialized empty, fetched from DB
  const [taxSettings, setTaxSettings] = useState({
    defaultGstRate: 0,
    enableCgstSgst: false,
    enableIgst: false,
    gstRegistered: false,
    hsnCodeRequired: false,
    roundOffTotal: false,
    showTaxBreakup: false,
  });

  // Invoice Settings — initialized empty, fetched from DB
  const [invoiceSettings, setInvoiceSettings] = useState({
    invoicePrefix: '',
    invoiceStartNo: 0,
    poPrefix: '',
    poStartNo: 0,
    grnPrefix: '',
    grnStartNo: 0,
    quotationPrefix: '',
    quotationStartNo: 0,
    showLogo: false,
    showTerms: false,
    defaultTerms: '',
    defaultNotes: '',
    paperSize: '',
    duplicateCopies: 0,
  });

  // Notification Settings — initialized empty, fetched from DB
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: false,
    smsNotifications: false,
    lowStockAlert: false,
    lowStockThreshold: 0,
    paymentReminder: false,
    reminderDaysBefore: 0,
    orderStatusUpdates: false,
    dailyReportEmail: false,
    weeklyReportEmail: false,
  });

  // System Settings — initialized empty, fetched from DB
  const [systemSettings, setSystemSettings] = useState({
    dateFormat: '',
    timeFormat: '',
    currency: '',
    currencySymbol: '',
    timezone: '',
    language: '',
    autoBackup: false,
    backupFrequency: '',
    sessionTimeout: 0,
    maxLoginAttempts: 0,
  });

  // Security Settings — initialized empty, fetched from DB
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    passwordExpiry: 0,
    minPasswordLength: 0,
    requireSpecialChar: false,
    requireNumbers: false,
    requireUppercase: false,
    ipWhitelist: '',
    auditLog: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [companyErrors, setCompanyErrors] = useState<ValidationErrors>({});

  // Fetch all settings from DB on mount
  useEffect(() => {
    settingsService.getCompanySettings()
      .then(data => { if (data) setCompanySettings(prev => ({ ...prev, ...data })); })
      .catch(() => {});
    settingsService.getTaxSettings()
      .then(data => { if (data) setTaxSettings(prev => ({ ...prev, ...data })); })
      .catch(() => {});
    settingsService.getInvoiceSettings()
      .then(data => { if (data) setInvoiceSettings(prev => ({ ...prev, ...data })); })
      .catch(() => {});
    settingsService.getNotificationSettings()
      .then(data => { if (data) setNotificationSettings(prev => ({ ...prev, ...data })); })
      .catch(() => {});
    settingsService.getSystemSettings()
      .then(data => { if (data) setSystemSettings(prev => ({ ...prev, ...data })); })
      .catch(() => {});
    settingsService.getSecuritySettings()
      .then(data => { if (data) setSecuritySettings(prev => ({ ...prev, ...data })); })
      .catch(() => {});
  }, []);

  const handleSave = (section: string) => {
    if (section === 'company') {
      const errors = validateFields(companySettings, {
        companyName: { required: true, min: 2, label: 'Company Name' },
        gstNo: { required: true, label: 'GSTIN' },
        panNo: { required: true, label: 'PAN' },
        address: { required: true, label: 'Address' },
        city: { required: true, label: 'City' },
        state: { required: true, label: 'State' },
        pincode: { required: true, label: 'Pin Code' },
        mobile: { required: true, phone: true, label: 'Mobile' },
        phone: { phone: true },
        email: { required: true, email: true },
      });
      if (Object.keys(errors).length) { setCompanyErrors(errors); return; }
      setCompanyErrors({});
    }
    setSaveStatus('saving');

    // Save to DB via API
    const saveMap: Record<string, () => Promise<any>> = {
      company: () => settingsService.updateCompanySettings(companySettings),
      tax: () => settingsService.updateTaxSettings(taxSettings),
      invoice: () => settingsService.updateInvoiceSettings(invoiceSettings),
      notification: () => settingsService.updateNotificationSettings(notificationSettings),
      system: () => settingsService.updateSystemSettings(systemSettings),
      security: () => settingsService.updateSecuritySettings(securitySettings),
    };

    const saveFn = saveMap[section];
    if (saveFn) {
      saveFn()
        .then(() => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        })
        .catch(() => {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 2000);
        });
    }
  };

  const handleExportSettings = () => {
    const allSettings = {
      company: companySettings,
      tax: taxSettings,
      invoice: invoiceSettings,
      notification: notificationSettings,
      system: systemSettings,
      security: securitySettings,
    };
    const blob = new Blob([JSON.stringify(allSettings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mes-pro-settings.json';
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('settings')}</h1>
          <p className="text-muted-foreground">{t('configureApplicationSettings')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportSettings}>
            <Download className="mr-2 h-4 w-4" />
            {t('export')}
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            {t('import')}
          </Button>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus !== 'idle' && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          saveStatus === 'saving' ? 'bg-blue-50 text-blue-700' :
          saveStatus === 'saved' ? 'bg-green-50 text-green-700' :
          'bg-red-50 text-red-700'
        }`}>
          {saveStatus === 'saving' && <RefreshCw className="h-4 w-4 animate-spin" />}
          {saveStatus === 'saved' && <CheckCircle className="h-4 w-4" />}
          {saveStatus === 'error' && <AlertCircle className="h-4 w-4" />}
          <span>
            {saveStatus === 'saving' && (t('saving'))}
            {saveStatus === 'saved' && (t('settingsSavedSuccessfully'))}
            {saveStatus === 'error' && (t('errorSavingSettings'))}
          </span>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="company" className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-gray-100 rounded-lg w-fit">
          <TabsTrigger value="company" className="flex items-center gap-2 px-4 py-2">
            <Building2 className="h-4 w-4" />
            {t('company')}
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-2 px-4 py-2">
            <Percent className="h-4 w-4" />
            {t('tax')}
          </TabsTrigger>
          <TabsTrigger value="invoice" className="flex items-center gap-2 px-4 py-2">
            <FileText className="h-4 w-4" />
            {t('invoice')}
          </TabsTrigger>
          <TabsTrigger value="notification" className="flex items-center gap-2 px-4 py-2">
            <Bell className="h-4 w-4" />
            {t('alerts')}
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2 px-4 py-2">
            <Settings className="h-4 w-4" />
            {t('system')}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 px-4 py-2">
            <Shield className="h-4 w-4" />
            {t('security')}
          </TabsTrigger>
        </TabsList>

        {/* Company Settings Tab */}
        <TabsContent value="company" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('companyDetails')}
              </CardTitle>
              <CardDescription>
                {t('manageYourCompanyInformation')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                  {companySettings.logo ? (
                    <img src={URL.createObjectURL(companySettings.logo)} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Image className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <Label>{t('companyLogo')}</Label>
                  <p className="text-sm text-gray-500 mb-2">{t('pngOrJpgMax2mb')}</p>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    {t('upload')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('companyName')} *</Label>
                  <Input
                    value={companySettings.companyName}
                    onChange={(e) => { setCompanySettings({ ...companySettings, companyName: e.target.value }); setCompanyErrors((prev) => { const { companyName, ...rest } = prev; return rest; }); }}
                  />
                  <FieldError message={companyErrors.companyName} />
                </div>
                <div className="space-y-2">
                  <Label>{t('tagline')}</Label>
                  <Input
                    value={companySettings.tagline}
                    onChange={(e) => setCompanySettings({ ...companySettings, tagline: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>GSTIN *</Label>
                  <Input
                    value={companySettings.gstNo}
                    onChange={(e) => { setCompanySettings({ ...companySettings, gstNo: e.target.value }); setCompanyErrors((prev) => { const { gstNo, ...rest } = prev; return rest; }); }}
                    placeholder="07AABCM1234D1ZD"
                  />
                  <FieldError message={companyErrors.gstNo} />
                </div>
                <div className="space-y-2">
                  <Label>PAN *</Label>
                  <Input
                    value={companySettings.panNo}
                    onChange={(e) => { setCompanySettings({ ...companySettings, panNo: e.target.value }); setCompanyErrors((prev) => { const { panNo, ...rest } = prev; return rest; }); }}
                    placeholder="AABCM1234D"
                  />
                  <FieldError message={companyErrors.panNo} />
                </div>
                <div className="space-y-2">
                  <Label>CIN</Label>
                  <Input
                    value={companySettings.cinNo}
                    onChange={(e) => setCompanySettings({ ...companySettings, cinNo: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('address')} *</Label>
                <Input
                  value={companySettings.address}
                  onChange={(e) => { setCompanySettings({ ...companySettings, address: e.target.value }); setCompanyErrors((prev) => { const { address, ...rest } = prev; return rest; }); }}
                />
                <FieldError message={companyErrors.address} />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{t('city')} *</Label>
                  <Input
                    value={companySettings.city}
                    onChange={(e) => { setCompanySettings({ ...companySettings, city: e.target.value }); setCompanyErrors((prev) => { const { city, ...rest } = prev; return rest; }); }}
                  />
                  <FieldError message={companyErrors.city} />
                </div>
                <div className="space-y-2">
                  <Label>{t('state')} *</Label>
                  <Input
                    value={companySettings.state}
                    onChange={(e) => { setCompanySettings({ ...companySettings, state: e.target.value }); setCompanyErrors((prev) => { const { state, ...rest } = prev; return rest; }); }}
                  />
                  <FieldError message={companyErrors.state} />
                </div>
                <div className="space-y-2">
                  <Label>{t('pinCode')} *</Label>
                  <Input
                    value={companySettings.pincode}
                    onChange={(e) => { setCompanySettings({ ...companySettings, pincode: e.target.value }); setCompanyErrors((prev) => { const { pincode, ...rest } = prev; return rest; }); }}
                  />
                  <FieldError message={companyErrors.pincode} />
                </div>
                <div className="space-y-2">
                  <Label>{t('country')}</Label>
                  <Input
                    value={companySettings.country}
                    onChange={(e) => setCompanySettings({ ...companySettings, country: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('phone')}</Label>
                  <Input
                    value={companySettings.phone}
                    onChange={(e) => { setCompanySettings({ ...companySettings, phone: e.target.value }); setCompanyErrors((prev) => { const { phone, ...rest } = prev; return rest; }); }}
                  />
                  <FieldError message={companyErrors.phone} />
                </div>
                <div className="space-y-2">
                  <Label>{t('mobile')} *</Label>
                  <Input
                    value={companySettings.mobile}
                    onChange={(e) => { setCompanySettings({ ...companySettings, mobile: e.target.value }); setCompanyErrors((prev) => { const { mobile, ...rest } = prev; return rest; }); }}
                  />
                  <FieldError message={companyErrors.mobile} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('email')} *</Label>
                  <Input
                    type="email"
                    value={companySettings.email}
                    onChange={(e) => { setCompanySettings({ ...companySettings, email: e.target.value }); setCompanyErrors((prev) => { const { email, ...rest } = prev; return rest; }); }}
                  />
                  <FieldError message={companyErrors.email} />
                </div>
                <div className="space-y-2">
                  <Label>{t('website')}</Label>
                  <Input
                    value={companySettings.website}
                    onChange={(e) => setCompanySettings({ ...companySettings, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('company')}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Settings Tab */}
        <TabsContent value="tax" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                {t('taxSettings')}
              </CardTitle>
              <CardDescription>
                {t('configureGstAndTaxCalculationSettings')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('defaultGstRate')} (%)</Label>
                    <select
                      value={taxSettings.defaultGstRate}
                      onChange={(e) => setTaxSettings({ ...taxSettings, defaultGstRate: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>{t('gstRegistered')}</Label>
                      <p className="text-sm text-gray-500">{t('companyIsGstRegistered')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={taxSettings.gstRegistered}
                      onChange={(e) => setTaxSettings({ ...taxSettings, gstRegistered: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>CGST/SGST</Label>
                      <p className="text-sm text-gray-500">{t('forIntrastateSales')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={taxSettings.enableCgstSgst}
                      onChange={(e) => setTaxSettings({ ...taxSettings, enableCgstSgst: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>IGST</Label>
                      <p className="text-sm text-gray-500">{t('forInterstateSales')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={taxSettings.enableIgst}
                      onChange={(e) => setTaxSettings({ ...taxSettings, enableIgst: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>{t('hsnCodeRequired')}</Label>
                      <p className="text-sm text-gray-500">{t('mandatoryHsnCodeForItems')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={taxSettings.hsnCodeRequired}
                      onChange={(e) => setTaxSettings({ ...taxSettings, hsnCodeRequired: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>{t('roundOffTotal')}</Label>
                      <p className="text-sm text-gray-500">{t('roundOffInvoiceTotal')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={taxSettings.roundOffTotal}
                      onChange={(e) => setTaxSettings({ ...taxSettings, roundOffTotal: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>{t('showTaxBreakup')}</Label>
                      <p className="text-sm text-gray-500">{t('showCgstSgstSeparately')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={taxSettings.showTaxBreakup}
                      onChange={(e) => setTaxSettings({ ...taxSettings, showTaxBreakup: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('tax')}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Settings Tab */}
        <TabsContent value="invoice" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('invoiceSettings')}
              </CardTitle>
              <CardDescription>
                {t('configureInvoiceFormatAndNumbering')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{t('invoicePrefix')}</Label>
                  <Input
                    value={invoiceSettings.invoicePrefix}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoicePrefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('startNumber')}</Label>
                  <Input
                    type="number"
                    value={invoiceSettings.invoiceStartNo}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoiceStartNo: Number(e.target.value) })}
                    onKeyDown={blockInvalidNumberKeys}
                  />
                </div>
                <div className="space-y-2">
                  <Label>PO {t('prefix')}</Label>
                  <Input
                    value={invoiceSettings.poPrefix}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, poPrefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>PO {t('startNo')}</Label>
                  <Input
                    type="number"
                    value={invoiceSettings.poStartNo}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, poStartNo: Number(e.target.value) })}
                    onKeyDown={blockInvalidNumberKeys}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>GRN {t('prefix')}</Label>
                  <Input
                    value={invoiceSettings.grnPrefix}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, grnPrefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>GRN {t('startNo')}</Label>
                  <Input
                    type="number"
                    value={invoiceSettings.grnStartNo}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, grnStartNo: Number(e.target.value) })}
                    onKeyDown={blockInvalidNumberKeys}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('quotationPrefix')}</Label>
                  <Input
                    value={invoiceSettings.quotationPrefix}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, quotationPrefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('quotationStartNo')}</Label>
                  <Input
                    type="number"
                    value={invoiceSettings.quotationStartNo}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, quotationStartNo: Number(e.target.value) })}
                    onKeyDown={blockInvalidNumberKeys}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('paperSize')}</Label>
                  <select
                    value={invoiceSettings.paperSize}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, paperSize: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t('duplicateCopies')}</Label>
                  <Input
                    type="number"
                    value={invoiceSettings.duplicateCopies}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, duplicateCopies: Number(e.target.value) })}
                    onKeyDown={blockInvalidNumberKeys}
                    min="1"
                    max="5"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={invoiceSettings.showLogo}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showLogo: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <Label>{t('showLogoOnInvoice')}</Label>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={invoiceSettings.showTerms}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showTerms: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <Label>{t('showTermsConditions')}</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('defaultTermsConditions')}</Label>
                <textarea
                  value={invoiceSettings.defaultTerms}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, defaultTerms: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('defaultNotes')}</Label>
                <textarea
                  value={invoiceSettings.defaultNotes}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, defaultNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('invoice')}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value="notification" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('notificationSettings')}
              </CardTitle>
              <CardDescription>
                {t('configureAlertsAndReminders')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t('notificationChannels')}
                  </h3>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>{t('emailNotifications')}</Label>
                      <p className="text-sm text-gray-500">{t('receiveAlertsViaEmail')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailNotifications}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>{t('smsNotifications')}</Label>
                      <p className="text-sm text-gray-500">{t('receiveAlertsViaSms')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.smsNotifications}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, smsNotifications: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {t('alertTypes')}
                  </h3>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>{t('lowStockAlert')}</Label>
                      <p className="text-sm text-gray-500">{t('whenStockIsRunningLow')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.lowStockAlert}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, lowStockAlert: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>

                  {notificationSettings.lowStockAlert && (
                    <div className="space-y-2 pl-4">
                      <Label>{t('lowStockThreshold')}</Label>
                      <Input
                        type="number"
                        value={notificationSettings.lowStockThreshold}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, lowStockThreshold: Number(e.target.value) })}
                        onKeyDown={blockInvalidNumberKeys}
                        min="1"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>{t('paymentReminder')}</Label>
                      <p className="text-sm text-gray-500">{t('remindAboutDuePayments')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.paymentReminder}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, paymentReminder: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>

                  {notificationSettings.paymentReminder && (
                    <div className="space-y-2 pl-4">
                      <Label>{t('remindDaysBefore')}</Label>
                      <Input
                        type="number"
                        value={notificationSettings.reminderDaysBefore}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, reminderDaysBefore: Number(e.target.value) })}
                        onKeyDown={blockInvalidNumberKeys}
                        min="1"
                        max="30"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label>{t('orderStatusUpdates')}</Label>
                    <p className="text-sm text-gray-500">{t('whenOrderStatusChanges')}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.orderStatusUpdates}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, orderStatusUpdates: e.target.checked })}
                    className="w-5 h-5"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label>{t('weeklyReportEmail')}</Label>
                    <p className="text-sm text-gray-500">{t('weeklySummaryEmail')}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.weeklyReportEmail}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, weeklyReportEmail: e.target.checked })}
                    className="w-5 h-5"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('notification')}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t('systemSettings')}
              </CardTitle>
              <CardDescription>
                {t('generalApplicationSettings')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('dateFormat')}
                  </Label>
                  <select
                    value={systemSettings.dateFormat}
                    onChange={(e) => setSystemSettings({ ...systemSettings, dateFormat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('timeFormat')}
                  </Label>
                  <select
                    value={systemSettings.timeFormat}
                    onChange={(e) => setSystemSettings({ ...systemSettings, timeFormat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="12h">12 Hour</option>
                    <option value="24h">24 Hour</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t('timezone')}
                  </Label>
                  <select
                    value={systemSettings.timezone}
                    onChange={(e) => setSystemSettings({ ...systemSettings, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4" />
                    {t('currency')}
                  </Label>
                  <select
                    value={systemSettings.currency}
                    onChange={(e) => setSystemSettings({ ...systemSettings, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t('sessionTimeoutMinutes')}</Label>
                  <Input
                    type="number"
                    value={systemSettings.sessionTimeout}
                    onChange={(e) => setSystemSettings({ ...systemSettings, sessionTimeout: Number(e.target.value) })}
                    onKeyDown={blockInvalidNumberKeys}
                    min="5"
                    max="120"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('maxLoginAttempts')}</Label>
                  <Input
                    type="number"
                    value={systemSettings.maxLoginAttempts}
                    onChange={(e) => setSystemSettings({ ...systemSettings, maxLoginAttempts: Number(e.target.value) })}
                    onKeyDown={blockInvalidNumberKeys}
                    min="3"
                    max="10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      {t('autoBackup')}
                    </Label>
                    <p className="text-sm text-gray-500">{t('automaticallyBackupData')}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.autoBackup}
                    onChange={(e) => setSystemSettings({ ...systemSettings, autoBackup: e.target.checked })}
                    className="w-5 h-5"
                  />
                </div>

                {systemSettings.autoBackup && (
                  <div className="space-y-2">
                    <Label>{t('backupFrequency')}</Label>
                    <select
                      value={systemSettings.backupFrequency}
                      onChange={(e) => setSystemSettings({ ...systemSettings, backupFrequency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="daily">{t('daily')}</option>
                      <option value="weekly">{t('weekly')}</option>
                      <option value="monthly">{t('monthly')}</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  {t('backupNow')}
                </Button>
                <Button onClick={() => handleSave('system')}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('securitySettings')}
              </CardTitle>
              <CardDescription>
                {t('accountSecurityAndAccessControl')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {t('passwordPolicy')}
                  </h3>

                  <div className="space-y-2">
                    <Label>{t('passwordExpiryDays')}</Label>
                    <Input
                      type="number"
                      value={securitySettings.passwordExpiry}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiry: Number(e.target.value) })}
                      onKeyDown={blockInvalidNumberKeys}
                      min="30"
                      max="365"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('minimumPasswordLength')}</Label>
                    <Input
                      type="number"
                      value={securitySettings.minPasswordLength}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, minPasswordLength: Number(e.target.value) })}
                      onKeyDown={blockInvalidNumberKeys}
                      min="6"
                      max="20"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={securitySettings.requireSpecialChar}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, requireSpecialChar: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <Label>{t('requireSpecialCharacter')}</Label>
                  </div>

                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={securitySettings.requireNumbers}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, requireNumbers: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <Label>{t('requireNumbers')}</Label>
                  </div>

                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={securitySettings.requireUppercase}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, requireUppercase: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <Label>{t('requireUppercase')}</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    {t('accessControl')}
                  </h3>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>{t('twofactorAuthentication')}</Label>
                      <p className="text-sm text-gray-500">{t('enable2faForExtraSecurity')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={securitySettings.twoFactorAuth}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorAuth: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>{t('auditLog')}</Label>
                      <p className="text-sm text-gray-500">{t('logAllUserActions')}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={securitySettings.auditLog}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, auditLog: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('ipWhitelist')}</Label>
                    <textarea
                      value={securitySettings.ipWhitelist}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value })}
                      placeholder={t('oneIpAddressPerLine')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500">
                      {t('restrictAccessToSpecificIpAddresses')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('security')}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsModule;
