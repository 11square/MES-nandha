import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Download } from 'lucide-react';

export type LedgerEntry = {
  key: string;
  date: string;
  item: string;
  ref: string;
  debit: number;
  credit: number;
  source?: any;
  kind?: 'bill' | 'po' | 'tx';
};

export type LedgerRange =
  | 'all'
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'this_year'
  | 'financial_year'
  | 'custom';

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

function getRangeBounds(range: LedgerRange, fromStr: string, toStr: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  switch (range) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'this_week': {
      const d = startOfDay(now);
      const dow = d.getDay(); // 0..6 (Sun..Sat)
      const monday = new Date(d); monday.setDate(d.getDate() - ((dow + 6) % 7));
      return { from: monday, to: endOfDay(now) };
    }
    case 'this_month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case 'this_year':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
    case 'financial_year': {
      // Indian FY: Apr 1 – Mar 31
      const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return { from: new Date(y, 3, 1), to: endOfDay(new Date(y + 1, 2, 31)) };
    }
    case 'custom':
      return {
        from: fromStr ? startOfDay(new Date(fromStr)) : null,
        to: toStr ? endOfDay(new Date(toStr)) : null,
      };
    default:
      return { from: null, to: null };
  }
}

export function useLedgerFilter() {
  const [range, setRange] = useState<LedgerRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  return { range, setRange, customFrom, setCustomFrom, customTo, setCustomTo };
}

export function applyLedgerFilter(
  entries: LedgerEntry[],
  range: LedgerRange,
  customFrom: string,
  customTo: string,
): LedgerEntry[] {
  const { from, to } = getRangeBounds(range, customFrom, customTo);
  if (!from && !to) return entries;
  return entries.filter((e) => {
    if (!e.date) return false;
    const t = new Date(e.date).getTime();
    if (Number.isNaN(t)) return false;
    if (from && t < from.getTime()) return false;
    if (to && t > to.getTime()) return false;
    return true;
  });
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportLedgerCsv(filename: string, rows: Array<LedgerEntry & { balance: number }>) {
  const header = ['Date', 'Items', 'Bill Reference', 'Credit', 'Debit', 'Balance'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const dateLabel = r.date
      ? new Date(r.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    lines.push([
      csvCell(dateLabel),
      csvCell(r.item),
      csvCell(r.ref),
      csvCell(r.credit > 0 ? r.credit : ''),
      csvCell(r.debit > 0 ? r.debit : ''),
      csvCell(r.balance),
    ].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getRangeLabel(range: LedgerRange, customFrom: string, customTo: string): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const { from, to } = getRangeBounds(range, customFrom, customTo);
  switch (range) {
    case 'all': return 'All time';
    case 'today': return `Today (${fmt(new Date())})`;
    case 'this_week': return from && to ? `This Week (${fmt(from)} - ${fmt(to)})` : 'This Week';
    case 'this_month': return from && to ? `This Month (${fmt(from)} - ${fmt(to)})` : 'This Month';
    case 'this_year': return from && to ? `This Year (${fmt(from)} - ${fmt(to)})` : 'This Year';
    case 'financial_year': return from && to ? `FY ${from.getFullYear()}-${String((to.getFullYear()) % 100).padStart(2, '0')} (${fmt(from)} - ${fmt(to)})` : 'Financial Year';
    case 'custom': return from && to ? `${fmt(from)} - ${fmt(to)}` : (from ? `From ${fmt(from)}` : (to ? `Until ${fmt(to)}` : 'Custom'));
  }
}

export interface PartyMeta {
  kind: 'client' | 'vendor';
  name: string;
  code?: string | number;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  gst?: string;
}

const INR = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export async function exportLedgerPdf(
  filename: string,
  party: PartyMeta,
  periodLabel: string,
  rows: Array<LedgerEntry & { balance: number }>,
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const accent: [number, number, number] = party.kind === 'client' ? [37, 99, 235] : [124, 58, 237];

  const totalCredit = rows.reduce((s, r) => s + (r.credit || 0), 0);
  const totalDebit = rows.reduce((s, r) => s + (r.debit || 0), 0);
  // Statement is shown in chronological reverse (latest first by caller).
  // For opening/closing we use chronological order.
  const chrono = [...rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const openingRow = chrono[0];
  const closingRow = chrono[chrono.length - 1];
  // opening balance = balance of opening row minus its own delta (debit - credit for client; reverse for vendor)
  // Use the inverse of how the page builds running balance: client running += debit - credit; vendor += credit - debit
  let opening = 0;
  let closing = 0;
  if (openingRow && closingRow) {
    const sign = party.kind === 'client' ? 1 : -1;
    opening = openingRow.balance - sign * ((openingRow.debit || 0) - (openingRow.credit || 0));
    closing = closingRow.balance;
  }

  // ===== Header band =====
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Account Statement', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${party.kind === 'client' ? 'Client' : 'Vendor'} Ledger`, margin, 18);
  doc.setFontSize(9);
  const generatedOn = `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`;
  doc.text(generatedOn, pageW - margin, 12, { align: 'right' });
  doc.text(`Period: ${periodLabel}`, pageW - margin, 18, { align: 'right' });

  // ===== Account holder card (removed per request) =====
  doc.setTextColor(30);
  let y = 34;

  // ===== Summary cards =====
  y += 3;
  const cardW = (pageW - margin * 2 - 6) / 4;
  const cardH = 16;
  const summary: Array<{ label: string; value: string; color: [number, number, number] }> = [
    { label: 'Opening Balance', value: INR(opening), color: [71, 85, 105] },
    { label: party.kind === 'client' ? 'Total Credit (Received)' : 'Total Credit (Paid)', value: INR(totalCredit), color: [22, 163, 74] },
    { label: party.kind === 'client' ? 'Total Debit (Billed)' : 'Total Debit (Refund)', value: INR(totalDebit), color: [220, 38, 38] },
    { label: 'Closing Balance', value: INR(closing), color: accent },
  ];
  summary.forEach((s, i) => {
    const x = margin + i * (cardW + 2);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardW, cardH, 1.5, 1.5, 'FD');
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(s.label.toUpperCase(), x + 2.5, y + 5);
    doc.setTextColor(s.color[0], s.color[1], s.color[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Rs. ${s.value}`, x + 2.5, y + 12);
  });
  y += cardH + 6;

  // ===== Table =====
  const cols = [
    { key: 'date', label: 'Date', w: 24, align: 'left' as const },
    { key: 'ref', label: 'Reference', w: 28, align: 'left' as const },
    { key: 'item', label: 'Particulars', w: 64, align: 'left' as const },
    { key: 'credit', label: 'Credit (Rs.)', w: 22, align: 'right' as const },
    { key: 'debit', label: 'Debit (Rs.)', w: 22, align: 'right' as const },
    { key: 'balance', label: 'Balance (Rs.)', w: 26, align: 'right' as const },
  ];
  const tableX = margin;
  const rowH = 7;
  const headerH = 8;

  const drawTableHeader = (yStart: number) => {
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(tableX, yStart, pageW - margin * 2, headerH, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    let cx = tableX;
    for (const c of cols) {
      const tx = c.align === 'right' ? cx + c.w - 2 : cx + 2;
      doc.text(c.label, tx, yStart + 5.5, { align: c.align });
      cx += c.w;
    }
  };

  drawTableHeader(y);
  y += headerH;

  doc.setTextColor(30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const writeRow = (r: LedgerEntry & { balance: number }, idx: number) => {
    if (y + rowH > pageH - 18) {
      // footer + new page
      drawFooter();
      doc.addPage();
      y = margin;
      drawTableHeader(y);
      y += headerH;
      doc.setTextColor(30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
    }
    if (idx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(tableX, y, pageW - margin * 2, rowH, 'F');
    }
    let cx = tableX;
    const dateLabel = r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
    const cells: Record<string, string> = {
      date: dateLabel,
      ref: r.ref || '-',
      item: truncate(doc, r.item || '-', cols[2].w - 4),
      credit: r.credit > 0 ? INR(r.credit) : '-',
      debit: r.debit > 0 ? INR(r.debit) : '-',
      balance: INR(r.balance),
    };
    for (const c of cols) {
      const v = cells[c.key];
      if (c.key === 'credit' && r.credit > 0) doc.setTextColor(22, 163, 74);
      else if (c.key === 'debit' && r.debit > 0) doc.setTextColor(220, 38, 38);
      else if (c.key === 'balance') { doc.setFont('helvetica', 'bold'); doc.setTextColor(30); }
      else doc.setTextColor(40);
      const tx = c.align === 'right' ? cx + c.w - 2 : cx + 2;
      doc.text(v, tx, y + 4.8, { align: c.align });
      doc.setFont('helvetica', 'normal');
      cx += c.w;
    }
    // row separator
    doc.setDrawColor(230);
    doc.line(tableX, y + rowH, pageW - margin, y + rowH);
    y += rowH;
  };

  rows.forEach((r, i) => writeRow(r, i));

  // Totals row
  if (y + rowH + 2 > pageH - 18) {
    drawFooter();
    doc.addPage();
    y = margin;
  }
  y += 1;
  doc.setFillColor(241, 245, 249);
  doc.rect(tableX, y, pageW - margin * 2, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30);
  let cx = tableX;
  const totalsCells: Record<string, string> = {
    date: '',
    ref: '',
    item: 'TOTALS',
    credit: INR(totalCredit),
    debit: INR(totalDebit),
    balance: INR(closing),
  };
  for (const c of cols) {
    const v = totalsCells[c.key];
    if (c.key === 'credit') doc.setTextColor(22, 163, 74);
    else if (c.key === 'debit') doc.setTextColor(220, 38, 38);
    else doc.setTextColor(30);
    const tx = c.align === 'right' ? cx + c.w - 2 : cx + 2;
    doc.text(v, tx, y + 4.8, { align: c.align });
    cx += c.w;
  }
  y += rowH + 2;

  function drawFooter() {
    const total = doc.getNumberOfPages();
    const cur = doc.getCurrentPageInfo().pageNumber;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text('This is a computer-generated statement and does not require a signature.', margin, pageH - 8);
    doc.text(`Page ${cur} of ${total}`, pageW - margin, pageH - 8, { align: 'right' });
  }

  // Stamp footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text('This is a computer-generated statement and does not require a signature.', margin, pageH - 8);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 8, { align: 'right' });
  }

  doc.save(filename);
}

function truncate(doc: any, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && doc.getTextWidth(s + '...') > maxWidth) s = s.slice(0, -1);
  return s + '...';
}

export function LedgerToolbar({
  range,
  setRange,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  onExport,
  exportDisabled,
}: {
  range: LedgerRange;
  setRange: (r: LedgerRange) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  onExport: () => void;
  exportDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-white">
      <span className="text-xs font-medium text-slate-500">Filter</span>
      <Select value={range} onValueChange={(v) => setRange(v as LedgerRange)}>
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="this_week">This week</SelectItem>
          <SelectItem value="this_month">This month</SelectItem>
          <SelectItem value="this_year">This year</SelectItem>
          <SelectItem value="financial_year">Financial year</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>
      {range === 'custom' && (
        <>
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 w-[150px] text-xs"
          />
          <span className="text-xs text-slate-500">to</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 w-[150px] text-xs"
          />
        </>
      )}
      <div className="ml-auto">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={onExport}
          disabled={exportDisabled}
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export PDF
        </Button>
      </div>
    </div>
  );
}
