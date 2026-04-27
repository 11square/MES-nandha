/**
 * Generates a detailed PDF history/statement report for a Client or Vendor.
 * Builds a styled HTML document, rasterises with html2canvas, slices into A4
 * pages and downloads via jsPDF.
 */

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

export interface PartyReportData {
  kind: 'client' | 'vendor';
  party: any;
  bills?: any[];
  purchaseOrders?: any[];
  payments?: any[];
  transactions?: any[];
  orders?: any[];
  dispatches?: any[];
  followups?: any[];
  outstandings?: any[];
  totals: {
    totalBilled: number;        // for vendor: total purchase amount
    totalPaid: number;
    outstanding: number;
    ordersCount?: number;
    incomeTxnTotal: number;
    expenseTxnTotal: number;
  };
}

function buildHtml(data: PartyReportData): string {
  const { kind, party, bills = [], purchaseOrders = [], payments = [], transactions = [], orders = [], dispatches = [], followups = [], outstandings = [], totals } = data;
  const isClient = kind === 'client';
  const accent = isClient ? '#2563eb' : '#7c3aed';
  const accentDark = isClient ? '#1d4ed8' : '#6d28d9';
  const title = isClient ? 'Client Statement Report' : 'Vendor Statement Report';
  const partyKind = isClient ? 'Client' : 'Vendor';
  const initials = String(party.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  // Build running outstanding for txns (chronological asc, anchored to top outstanding)
  const sortedAsc = [...transactions].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    if (da !== db) return da - db;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
  const sumIncome = sortedAsc.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const sumExpense = sortedAsc.filter(t => t.type !== 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const balanceById = new Map<any, number>();
  let running = isClient
    ? totals.outstanding + sumIncome - sumExpense
    : totals.outstanding + sumExpense - sumIncome;
  for (const t of sortedAsc) {
    const amt = Number(t.amount) || 0;
    if (isClient) running += t.type === 'income' ? -amt : amt;
    else running += t.type === 'income' ? amt : -amt;
    balanceById.set(t.id, running);
  }

  const generated = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const billsRows = bills.length ? bills.map((b: any) => `
    <tr>
      <td>${esc(b.bill_number || b.invoice_number || `#${b.id}`)}</td>
      <td>${fmtDate(b.bill_date || b.created_at || b.date)}</td>
      <td class="r">${fmtINR(b.subtotal || b.sub_total || 0)}</td>
      <td class="r">${fmtINR(b.tax_amount || b.gst_amount || 0)}</td>
      <td class="r b">${fmtINR(b.grand_total || b.total || 0)}</td>
      <td class="r" style="color:#059669">${fmtINR(b.paid_amount || 0)}</td>
      <td><span class="pill ${String(b.status || '').toLowerCase()}">${esc(b.status || 'pending')}</span></td>
    </tr>`).join('') : `<tr><td colspan="7" class="empty">No bills recorded</td></tr>`;

  const poRows = purchaseOrders.length ? purchaseOrders.map((po: any) => `
    <tr>
      <td>${esc(po.po_number || `PO-${po.id}`)}</td>
      <td>${fmtDate(po.order_date || po.created_at || po.date)}</td>
      <td>${fmtDate(po.expected_delivery_date || po.delivery_date)}</td>
      <td class="r b">${fmtINR(po.total_amount || po.grand_total || 0)}</td>
      <td><span class="pill ${String(po.status || '').toLowerCase()}">${esc(po.status || 'pending')}</span></td>
    </tr>`).join('') : `<tr><td colspan="5" class="empty">No purchase orders recorded</td></tr>`;

  const paymentRows = payments.length ? payments.map((p: any) => `
    <tr>
      <td>${fmtDate(p.payment_date || p.date || p.created_at)}</td>
      <td>${esc(p.bill_number || p.invoice_number || p.reference || '-')}</td>
      <td>${esc(p.payment_method || p.method || '-')}</td>
      <td class="r b" style="color:#059669">${fmtINR(p.amount || p.paid_amount)}</td>
      <td>${esc(p.notes || p.remarks || '-')}</td>
    </tr>`).join('') : `<tr><td colspan="5" class="empty">No bill payments recorded</td></tr>`;

  const txnRows = transactions.length ? transactions.map((t: any) => {
    const bal = balanceById.get(t.id) ?? 0;
    const isIncome = t.type === 'income';
    return `<tr>
      <td>${fmtDate(t.date)}</td>
      <td><span class="${isIncome ? 'in' : 'out'}">${isIncome ? '▼ Income' : '▲ Expense'}</span></td>
      <td>${esc(t.category || '-')}</td>
      <td>${esc(t.description || '-')}</td>
      <td class="r b" style="color:${isIncome ? '#059669' : '#dc2626'}">${isIncome ? '+' : '-'}${fmtINR(t.amount)}</td>
      <td>${esc(t.payment_method || '-')}</td>
      <td class="r b" style="color:${bal > 0 ? '#b45309' : bal < 0 ? '#059669' : '#64748b'}">${bal < 0 ? `(${fmtINR(Math.abs(bal))})` : fmtINR(bal)}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" class="empty">No finance transactions recorded</td></tr>`;

  const orderRows = orders.length ? orders.slice(0, 50).map((o: any) => `
    <tr>
      <td>${esc(o.order_number || `#${o.id}`)}</td>
      <td>${fmtDate(o.order_date || o.created_at || o.date)}</td>
      <td>${esc(o.product_name || o.item || '-')}</td>
      <td class="r">${esc(o.quantity || '-')}</td>
      <td class="r b">${fmtINR(o.total_amount || o.amount || 0)}</td>
      <td><span class="pill ${String(o.status || '').toLowerCase()}">${esc(o.status || 'pending')}</span></td>
    </tr>`).join('') : `<tr><td colspan="6" class="empty">No orders recorded</td></tr>`;

  const followupRows = followups.length ? followups.map((f: any) => `
    <tr>
      <td>${fmtDate(f.date || f.followup_date || f.created_at)}</td>
      <td>${esc(f.type || '-')}</td>
      <td>${esc(f.subject || '-')}</td>
      <td>${esc(f.notes || '-')}</td>
      <td><span class="pill ${String(f.status || '').toLowerCase()}">${esc(f.status || 'pending')}</span></td>
    </tr>`).join('') : `<tr><td colspan="5" class="empty">No follow-ups recorded</td></tr>`;

  const billedLabel = isClient ? 'Total Billed' : 'Total Purchase Value';
  const paidLabel = isClient ? 'Total Received' : 'Total Paid';
  const outstandingLabel = 'Outstanding Balance';
  const itemCountLabel = isClient ? `${bills.length} bills` : `${purchaseOrders.length} purchase orders`;
  const partyMeta: string[] = [];
  if (party.contact_person) partyMeta.push(`Contact: ${esc(party.contact_person)}`);
  if (party.phone) partyMeta.push(`Phone: ${esc(party.phone)}`);
  if (party.email) partyMeta.push(`Email: ${esc(party.email)}`);
  if (party.gst_number) partyMeta.push(`GSTIN: ${esc(party.gst_number)}`);
  if (party.address) partyMeta.push(`Address: ${esc(party.address)}`);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>${esc(title)} - ${esc(party.name)}</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;background:#fff}
  .page{width:794px;padding:32px 40px;background:#fff}
  .hero{background:linear-gradient(135deg,${accent} 0%,${accentDark} 100%);color:#fff;border-radius:14px;padding:22px 26px;margin-bottom:18px;box-shadow:0 4px 14px rgba(0,0,0,.08)}
  .hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
  .hero h1{margin:0;font-size:22px;font-weight:700;letter-spacing:-.01em}
  .hero .sub{font-size:12px;opacity:.85;margin-top:4px}
  .avatar{width:54px;height:54px;border-radius:12px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;color:#fff;flex-shrink:0;border:2px solid rgba(255,255,255,.35)}
  .party-block{display:flex;gap:16px;align-items:center}
  .party-name{font-size:18px;font-weight:700}
  .party-id{font-size:11px;opacity:.85}
  .party-meta{margin-top:14px;display:grid;grid-template-columns:repeat(2,1fr);gap:6px 18px;font-size:11.5px;opacity:.92}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 22px}
  .stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px}
  .stat .label{font-size:10.5px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:.04em}
  .stat .value{font-size:18px;font-weight:700;margin-top:4px;color:#0f172a}
  .stat .hint{font-size:10px;color:#94a3b8;margin-top:2px}
  .stat.green{background:#ecfdf5;border-color:#a7f3d0}
  .stat.green .value{color:#047857}
  .stat.blue{background:#eff6ff;border-color:#bfdbfe}
  .stat.blue .value{color:#1d4ed8}
  .stat.amber{background:#fff7ed;border-color:#fed7aa}
  .stat.amber .value{color:#b45309}
  .stat.red{background:#fef2f2;border-color:#fecaca}
  .stat.red .value{color:#b91c1c}
  .stat.slate{background:#f1f5f9;border-color:#cbd5e1}
  .stat.slate .value{color:#334155}
  .section{margin-bottom:18px;break-inside:avoid}
  .section-title{display:flex;align-items:center;justify-content:space-between;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid ${accent}}
  .section-title h2{font-size:13.5px;font-weight:700;margin:0;color:${accentDark};text-transform:uppercase;letter-spacing:.05em}
  .section-title .count{font-size:10.5px;color:#64748b;font-weight:500}
  table{width:100%;border-collapse:collapse;font-size:10.5px}
  thead th{background:#f8fafc;color:#475569;text-align:left;padding:7px 8px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;font-size:9.5px;border-bottom:1px solid #e2e8f0}
  tbody td{padding:7px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top}
  tbody tr:nth-child(even) td{background:#fafbfc}
  td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
  td.b{font-weight:600}
  td.empty{color:#94a3b8;text-align:center;padding:20px;font-style:italic}
  .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:9.5px;font-weight:600;text-transform:capitalize;background:#e2e8f0;color:#475569}
  .pill.paid,.pill.completed,.pill.received,.pill.delivered,.pill.active{background:#d1fae5;color:#065f46}
  .pill.pending,.pill.draft{background:#fef3c7;color:#92400e}
  .pill.cancelled,.pill.overdue{background:#fee2e2;color:#991b1b}
  .pill.partial{background:#dbeafe;color:#1e40af}
  .in{color:#059669;font-weight:600}
  .out{color:#dc2626;font-weight:600}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:9.5px;color:#94a3b8;display:flex;justify-content:space-between}
  .summary-box{background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #cbd5e1;border-radius:10px;padding:14px 18px;margin-top:6px}
  .summary-box .row{display:flex;justify-content:space-between;padding:4px 0;font-size:11.5px}
  .summary-box .row.total{border-top:2px solid #334155;margin-top:6px;padding-top:8px;font-size:13px;font-weight:700}
</style></head>
<body>
  <div class="page">
    <div class="hero">
      <div class="hero-top">
        <div class="party-block">
          <div class="avatar">${esc(initials || partyKind[0])}</div>
          <div>
            <div class="party-name">${esc(party.name || partyKind)}</div>
            <div class="party-id">${partyKind} #${esc(party.id || '-')} • ${esc(party.status || 'Active')}${party.category ? ' • ' + esc(party.category) : ''}</div>
          </div>
        </div>
        <div style="text-align:right">
          <h1>${esc(title)}</h1>
          <div class="sub">Generated on ${esc(generated)}</div>
        </div>
      </div>
      ${partyMeta.length ? `<div class="party-meta">${partyMeta.map(m => `<div>• ${m}</div>`).join('')}</div>` : ''}
    </div>

    <div class="stats">
      <div class="stat blue"><div class="label">${isClient ? 'Total Orders' : 'Total Purchases'}</div><div class="value">${totals.ordersCount ?? (isClient ? orders.length : purchaseOrders.length)}</div><div class="hint">${itemCountLabel}</div></div>
      <div class="stat ${isClient ? 'green' : 'blue'}"><div class="label">${billedLabel}</div><div class="value">${fmtINR(totals.totalBilled)}</div></div>
      <div class="stat green"><div class="label">${paidLabel}</div><div class="value">${fmtINR(totals.totalPaid)}</div></div>
      <div class="stat ${totals.outstanding > 0 ? 'red' : 'slate'}"><div class="label">${outstandingLabel}</div><div class="value">${totals.outstanding < 0 ? `(${fmtINR(Math.abs(totals.outstanding))})` : fmtINR(totals.outstanding)}</div><div class="hint">${totals.outstanding < 0 ? 'Credit balance' : totals.outstanding > 0 ? (isClient ? 'To collect' : 'To pay') : 'Settled'}</div></div>
    </div>

    <div class="section">
      <div class="section-title"><h2>Account Summary</h2></div>
      <div class="summary-box">
        <div class="row"><span>${billedLabel}</span><span>${fmtINR(totals.totalBilled)}</span></div>
        <div class="row"><span>${isClient ? 'Bill Payments Received' : 'Direct Payments to Vendor'}</span><span style="color:#059669">${fmtINR(isClient ? (totals.totalPaid - totals.incomeTxnTotal + totals.expenseTxnTotal) : totals.expenseTxnTotal)}</span></div>
        <div class="row"><span>Finance Ledger - Income</span><span style="color:#059669">+ ${fmtINR(totals.incomeTxnTotal)}</span></div>
        <div class="row"><span>Finance Ledger - Expense</span><span style="color:#dc2626">- ${fmtINR(totals.expenseTxnTotal)}</span></div>
        <div class="row"><span>Net ${paidLabel}</span><span style="color:#059669">${fmtINR(totals.totalPaid)}</span></div>
        <div class="row total"><span>${outstandingLabel}</span><span style="color:${totals.outstanding > 0 ? '#b91c1c' : '#334155'}">${totals.outstanding < 0 ? `(${fmtINR(Math.abs(totals.outstanding))})` : fmtINR(totals.outstanding)}</span></div>
      </div>
    </div>

    ${isClient ? `
    <div class="section">
      <div class="section-title"><h2>Bills</h2><span class="count">${bills.length} record${bills.length === 1 ? '' : 's'}</span></div>
      <table><thead><tr><th>Bill #</th><th>Date</th><th class="r">Subtotal</th><th class="r">Tax</th><th class="r">Total</th><th class="r">Paid</th><th>Status</th></tr></thead><tbody>${billsRows}</tbody></table>
    </div>

    <div class="section">
      <div class="section-title"><h2>Bill Payments</h2><span class="count">${payments.length} record${payments.length === 1 ? '' : 's'}</span></div>
      <table><thead><tr><th>Date</th><th>Reference</th><th>Method</th><th class="r">Amount</th><th>Notes</th></tr></thead><tbody>${paymentRows}</tbody></table>
    </div>
    ` : `
    <div class="section">
      <div class="section-title"><h2>Purchase Orders</h2><span class="count">${purchaseOrders.length} record${purchaseOrders.length === 1 ? '' : 's'}</span></div>
      <table><thead><tr><th>PO #</th><th>Order Date</th><th>Expected</th><th class="r">Amount</th><th>Status</th></tr></thead><tbody>${poRows}</tbody></table>
    </div>
    `}

    <div class="section">
      <div class="section-title"><h2>Finance Transactions (Running Outstanding)</h2><span class="count">${transactions.length} record${transactions.length === 1 ? '' : 's'}</span></div>
      <table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th class="r">Amount</th><th>Method</th><th class="r">Outstanding</th></tr></thead><tbody>${txnRows}</tbody></table>
    </div>

    ${isClient && orders.length ? `
    <div class="section">
      <div class="section-title"><h2>Orders</h2><span class="count">${orders.length} record${orders.length === 1 ? '' : 's'}${orders.length > 50 ? ' (showing first 50)' : ''}</span></div>
      <table><thead><tr><th>Order #</th><th>Date</th><th>Product</th><th class="r">Qty</th><th class="r">Amount</th><th>Status</th></tr></thead><tbody>${orderRows}</tbody></table>
    </div>` : ''}

    <div class="section">
      <div class="section-title"><h2>Follow-ups</h2><span class="count">${followups.length} record${followups.length === 1 ? '' : 's'}</span></div>
      <table><thead><tr><th>Date</th><th>Type</th><th>Subject</th><th>Notes</th><th>Status</th></tr></thead><tbody>${followupRows}</tbody></table>
    </div>

    <div class="footer">
      <span>${esc(title)} • ${esc(party.name)}</span>
      <span>Generated ${esc(generated)} • Confidential</span>
    </div>
  </div>
</body></html>`;
}

export async function generatePartyReportPdf(data: PartyReportData): Promise<void> {
  const html = buildHtml(data);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '820px';
  iframe.style.height = '1200px';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();

    try { await (doc as any).fonts?.ready; } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, 250));

    const target = (doc.querySelector('.page') as HTMLElement) || doc.body;
    const fullHeight = Math.max(target.scrollHeight, doc.documentElement.scrollHeight) + 60;
    iframe.style.height = `${fullHeight}px`;
    await new Promise(r => setTimeout(r, 100));

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 820,
      windowHeight: fullHeight,
      width: target.scrollWidth,
      height: target.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();
    const marginMm = 8;
    const usableWidthMm = pageWidthMm - marginMm * 2;
    const usableHeightMm = pageHeightMm - marginMm * 2;
    const pxPerMm = canvas.width / usableWidthMm;
    const pageHeightPx = Math.floor(usableHeightMm * pxPerMm);

    let renderedPx = 0;
    let pageIdx = 0;
    while (renderedPx < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      if (pageIdx > 0) pdf.addPage();
      const sliceHeightMm = sliceHeightPx / pxPerMm;
      pdf.addImage(imgData, 'JPEG', marginMm, marginMm, usableWidthMm, sliceHeightMm);
      renderedPx += sliceHeightPx;
      pageIdx++;
    }

    const safe = String(data.party.name || data.kind).replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
    const stamp = new Date().toISOString().slice(0, 10);
    pdf.save(`${data.kind}_statement_${safe}_${stamp}.pdf`);
  } finally {
    document.body.removeChild(iframe);
  }
}
