/**
 * Generates a detailed monthly GST/Audit report PDF intended to be sent to an
 * auditor. Covers tax summary, CGST/SGST/IGST breakdown, purchase (input) and
 * sales (output) invoice registers, and stock reconciliation for one month.
 */
import { renderHtmlToPdf } from './htmlToPdf';

const fmtINR = (n: number | string | null | undefined) => {
  const v = Number(n) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
};

const fmtDate = (d: any) => {
  if (!d) return '-';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export interface AuditReportData {
  monthLabel: string;
  businessName?: string;
  totals: {
    totalPurchaseAmount: number;
    totalInputGST: number;
    totalSalesAmount: number;
    totalOutputGST: number;
    gstPayable: number;
    netProfit: number;
    inputCGST: number;
    inputSGST: number;
    inputIGST: number;
    outputCGST: number;
    outputSGST: number;
    outputIGST: number;
    cgstPayable: number;
    sgstPayable: number;
    igstPayable: number;
    totalPurchasedStockValue: number;
    totalSoldStockValue: number;
  };
  purchaseOrders: any[];
  salesBills: any[];
  stockReconciliation: any[];
}

function buildHtml(data: AuditReportData): string {
  const { monthLabel, businessName, totals, purchaseOrders, salesBills, stockReconciliation } = data;
  const accent = '#0f766e';
  const accentDark = '#115e59';
  const generatedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const poRows = purchaseOrders.length ? purchaseOrders.map(po => `
    <tr>
      <td>${esc(po.id)}</td>
      <td>${esc(po.vendor)}</td>
      <td>${fmtDate(po.date)}</td>
      <td class="r">${fmtINR(po.amount)}</td>
      <td class="r">${fmtINR(po.gst)}</td>
      <td>${esc(po.gst_type)}</td>
      <td class="r b">${fmtINR(po.total_amount)}</td>
      <td><span class="pill ${String(po.status || '').toLowerCase()}">${esc(po.status || '-')}</span></td>
    </tr>`).join('') : `<tr><td colspan="8" class="empty">No purchase invoices for this month</td></tr>`;

  const billRows = salesBills.length ? salesBills.map(bill => `
    <tr>
      <td>${esc(bill.id)}</td>
      <td>${esc(bill.customer)}</td>
      <td>${fmtDate(bill.date)}</td>
      <td class="r">${fmtINR(bill.amount)}</td>
      <td class="r">${fmtINR(bill.gst)}</td>
      <td>${esc(bill.gst_type)}</td>
      <td class="r b">${fmtINR(bill.total_amount)}</td>
      <td><span class="pill ${String(bill.status || '').toLowerCase()}">${esc(bill.status || '-')}</span></td>
    </tr>`).join('') : `<tr><td colspan="8" class="empty">No sales invoices for this month</td></tr>`;

  const stockRows = stockReconciliation.length ? stockReconciliation.map(item => `
    <tr>
      <td>${esc(item.item)}</td>
      <td class="r">${esc(item.purchased ?? 0)}</td>
      <td class="r">${esc(item.used ?? 0)}</td>
      <td class="r">${esc(item.in_stock ?? 0)}</td>
      <td class="r">${fmtINR(item.po_value)}</td>
      <td class="r">${fmtINR(item.bill_value)}</td>
      <td class="r b" style="color:${Number(item.variance) === 0 ? '#059669' : '#b45309'}">${esc(item.variance ?? 0)}</td>
    </tr>`).join('') : `<tr><td colspan="7" class="empty">No stock movement for this month</td></tr>`;

  const gstLabel = totals.gstPayable >= 0 ? 'GST Payable' : 'GST Credit';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Audit Report - ${esc(monthLabel)}</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;background:#fff}
  .page{width:794px;padding:32px 40px;background:#fff}
  .hero{background:linear-gradient(135deg,${accent} 0%,${accentDark} 100%);color:#fff;border-radius:14px;padding:22px 26px;margin-bottom:18px;box-shadow:0 4px 14px rgba(0,0,0,.08)}
  .hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
  .hero h1{margin:0;font-size:22px;font-weight:700;letter-spacing:-.01em}
  .hero .sub{font-size:12px;opacity:.85;margin-top:4px}
  .hero .period{font-size:14px;font-weight:600;margin-top:8px;background:rgba(255,255,255,.18);display:inline-block;padding:4px 12px;border-radius:8px}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 22px}
  .stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px}
  .stat .label{font-size:10.5px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:.04em}
  .stat .value{font-size:18px;font-weight:700;margin-top:4px;color:#0f172a}
  .stat.green{background:#ecfdf5;border-color:#a7f3d0}.stat.green .value{color:#047857}
  .stat.blue{background:#eff6ff;border-color:#bfdbfe}.stat.blue .value{color:#1d4ed8}
  .stat.amber{background:#fff7ed;border-color:#fed7aa}.stat.amber .value{color:#b45309}
  .stat.red{background:#fef2f2;border-color:#fecaca}.stat.red .value{color:#b91c1c}
  .section{margin-bottom:18px;break-inside:avoid}
  .section-title{display:flex;align-items:center;justify-content:space-between;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid ${accent}}
  .section-title h2{font-size:13.5px;font-weight:700;margin:0;color:${accentDark};text-transform:uppercase;letter-spacing:.05em}
  .section-title .count{font-size:10.5px;color:#64748b;font-weight:500}
  table{width:100%;border-collapse:collapse;font-size:10.5px}
  thead th{background:#f8fafc;color:#475569;text-align:left;padding:7px 8px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;font-size:9.5px;border-bottom:1px solid #e2e8f0}
  thead th.r{text-align:right}
  tbody td{padding:7px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top}
  tbody tr:nth-child(even) td{background:#fafbfc}
  td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
  td.b{font-weight:600}
  td.empty{color:#94a3b8;text-align:center;padding:20px;font-style:italic}
  tfoot td{padding:8px;font-weight:700;border-top:2px solid #cbd5e1;background:#f8fafc}
  .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:9.5px;font-weight:600;text-transform:capitalize;background:#e2e8f0;color:#475569}
  .pill.paid,.pill.completed,.pill.received,.pill.active{background:#d1fae5;color:#065f46}
  .pill.pending,.pill.draft{background:#fef3c7;color:#92400e}
  .pill.cancelled,.pill.overdue{background:#fee2e2;color:#991b1b}
  .pill.partial{background:#dbeafe;color:#1e40af}
  .gst-table td{font-size:11px}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:9.5px;color:#94a3b8;display:flex;justify-content:space-between}
</style></head>
<body>
  <div class="page">
    <div class="hero">
      <div class="hero-top">
        <div>
          <h1>GST / Audit Report</h1>
          <div class="sub">${businessName ? esc(businessName) + ' · ' : ''}Monthly statement for auditor review</div>
          <div class="period">${esc(monthLabel)}</div>
        </div>
        <div style="text-align:right;font-size:11px;opacity:.9">Generated<br/><strong style="font-size:13px">${esc(generatedOn)}</strong></div>
      </div>
    </div>

    <div class="stats">
      <div class="stat blue"><div class="label">Total Purchases</div><div class="value">${fmtINR(totals.totalPurchaseAmount)}</div></div>
      <div class="stat green"><div class="label">Total Sales</div><div class="value">${fmtINR(totals.totalSalesAmount)}</div></div>
      <div class="stat amber"><div class="label">Input GST</div><div class="value">${fmtINR(totals.totalInputGST)}</div></div>
      <div class="stat amber"><div class="label">Output GST</div><div class="value">${fmtINR(totals.totalOutputGST)}</div></div>
      <div class="stat ${totals.gstPayable >= 0 ? 'red' : 'green'}"><div class="label">${gstLabel}</div><div class="value">${fmtINR(Math.abs(totals.gstPayable))}</div></div>
      <div class="stat ${totals.netProfit >= 0 ? 'green' : 'red'}"><div class="label">Net (Before Tax)</div><div class="value">${fmtINR(totals.netProfit)}</div></div>
      <div class="stat blue"><div class="label">Stock Purchased Val.</div><div class="value">${fmtINR(totals.totalPurchasedStockValue)}</div></div>
      <div class="stat green"><div class="label">Stock Sold Val.</div><div class="value">${fmtINR(totals.totalSoldStockValue)}</div></div>
    </div>

    <div class="section">
      <div class="section-title"><h2>GST Breakdown</h2></div>
      <table class="gst-table">
        <thead><tr><th>Tax Type</th><th class="r">Input (Credit)</th><th class="r">Output (Liability)</th><th class="r">Net Payable</th></tr></thead>
        <tbody>
          <tr><td>CGST</td><td class="r">${fmtINR(totals.inputCGST)}</td><td class="r">${fmtINR(totals.outputCGST)}</td><td class="r b">${fmtINR(totals.cgstPayable)}</td></tr>
          <tr><td>SGST</td><td class="r">${fmtINR(totals.inputSGST)}</td><td class="r">${fmtINR(totals.outputSGST)}</td><td class="r b">${fmtINR(totals.sgstPayable)}</td></tr>
          <tr><td>IGST</td><td class="r">${fmtINR(totals.inputIGST)}</td><td class="r">${fmtINR(totals.outputIGST)}</td><td class="r b">${fmtINR(totals.igstPayable)}</td></tr>
        </tbody>
        <tfoot><tr><td>Total</td><td class="r">${fmtINR(totals.totalInputGST)}</td><td class="r">${fmtINR(totals.totalOutputGST)}</td><td class="r">${fmtINR(totals.gstPayable)}</td></tr></tfoot>
      </table>
    </div>

    <div class="section">
      <div class="section-title"><h2>Purchase Register (Input)</h2><span class="count">${purchaseOrders.length} invoice(s)</span></div>
      <table>
        <thead><tr><th>PO / Invoice</th><th>Vendor</th><th>Date</th><th class="r">Taxable</th><th class="r">GST</th><th>Type</th><th class="r">Total</th><th>Status</th></tr></thead>
        <tbody>${poRows}</tbody>
        <tfoot><tr><td colspan="3">Total</td><td class="r">${fmtINR(totals.totalPurchaseAmount)}</td><td class="r">${fmtINR(totals.totalInputGST)}</td><td></td><td class="r">${fmtINR(totals.totalPurchaseAmount + totals.totalInputGST)}</td><td></td></tr></tfoot>
      </table>
    </div>

    <div class="section">
      <div class="section-title"><h2>Sales Register (Output)</h2><span class="count">${salesBills.length} invoice(s)</span></div>
      <table>
        <thead><tr><th>Invoice No</th><th>Customer</th><th>Date</th><th class="r">Taxable</th><th class="r">GST</th><th>Type</th><th class="r">Total</th><th>Status</th></tr></thead>
        <tbody>${billRows}</tbody>
        <tfoot><tr><td colspan="3">Total</td><td class="r">${fmtINR(totals.totalSalesAmount)}</td><td class="r">${fmtINR(totals.totalOutputGST)}</td><td></td><td class="r">${fmtINR(totals.totalSalesAmount + totals.totalOutputGST)}</td><td></td></tr></tfoot>
      </table>
    </div>

    <div class="section">
      <div class="section-title"><h2>Stock Reconciliation</h2><span class="count">${stockReconciliation.length} item(s)</span></div>
      <table>
        <thead><tr><th>Item</th><th class="r">Purchased</th><th class="r">Used / Sold</th><th class="r">In Stock</th><th class="r">PO Value</th><th class="r">Sale Value</th><th class="r">Variance</th></tr></thead>
        <tbody>${stockRows}</tbody>
      </table>
    </div>

    <div class="footer">
      <span>Computer-generated GST/Audit report — invoices only (quotations excluded).</span>
      <span>Generated ${esc(generatedOn)}</span>
    </div>
  </div>
</body></html>`;
}

export async function generateAuditReportPdf(data: AuditReportData): Promise<void> {
  const html = buildHtml(data);
  const safeMonth = data.monthLabel.replace(/[^a-z0-9]+/gi, '_');
  await renderHtmlToPdf(html, `Audit_Report_${safeMonth}.pdf`);
}
