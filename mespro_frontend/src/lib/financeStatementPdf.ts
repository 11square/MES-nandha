/**
 * Generates a bank-statement-style PDF for finance transactions.
 * Uses jsPDF directly (no html2canvas) for crisp tabular output.
 */

export interface FinanceTxnRow {
  id: string | number;
  date: string;
  type: 'income' | 'expense';
  category?: string;
  description?: string;
  party?: string;        // client or vendor name
  partyType?: 'client' | 'vendor' | 'others';
  reference?: string;    // bill no / po no / source id
  source?: string;       // 'transaction' | 'order' | 'bill' | 'purchase_order'
  paymentMethod?: string;
  status?: string;
  amount: number;
}

const INR = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

function truncate(doc: any, text: string, maxWidth: number): string {
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && doc.getTextWidth(s + '...') > maxWidth) s = s.slice(0, -1);
  return s + '...';
}

export async function exportFinanceStatementPdf(
  filename: string,
  periodLabel: string,
  filterSummary: string,
  rows: FinanceTxnRow[],
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const accent: [number, number, number] = [37, 99, 235];

  // Sort chronological for running balance
  const chrono = [...rows].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  let runningBalance = 0;
  const balanceById = new Map<string | number, number>();
  for (const r of chrono) {
    const amt = Number(r.amount) || 0;
    runningBalance += r.type === 'income' ? amt : -amt;
    balanceById.set(r.id, runningBalance);
  }

  const totalCredit = rows
    .filter(r => r.type === 'income')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalDebit = rows
    .filter(r => r.type === 'expense')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const netBalance = totalCredit - totalDebit;

  // ===== Header band =====
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, 0, pageW, 24, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Finance Transaction Statement', margin, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('All Income & Expense Transactions', margin, 17);
  doc.setFontSize(8.5);
  const generatedOn = `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`;
  doc.text(generatedOn, pageW - margin, 11, { align: 'right' });
  doc.text(`Period: ${periodLabel}`, pageW - margin, 17, { align: 'right' });

  let y = 30;

  // Filter summary line
  doc.setTextColor(80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Filters: ${filterSummary}`, margin, y);
  y += 5;

  // ===== Summary cards =====
  const cardW = (pageW - margin * 2 - 9) / 4;
  const cardH = 16;
  const summary: Array<{ label: string; value: string; color: [number, number, number] }> = [
    { label: 'Total Transactions', value: String(rows.length), color: [71, 85, 105] },
    { label: 'Total Credit (Income)', value: 'Rs. ' + INR(totalCredit), color: [22, 163, 74] },
    { label: 'Total Debit (Expense)', value: 'Rs. ' + INR(totalDebit), color: [220, 38, 38] },
    {
      label: 'Net Balance',
      value: (netBalance >= 0 ? 'Rs. ' : '-Rs. ') + INR(Math.abs(netBalance)),
      color: netBalance >= 0 ? [22, 163, 74] : [220, 38, 38],
    },
  ];
  summary.forEach((s, i) => {
    const x = margin + i * (cardW + 3);
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
    doc.text(s.value, x + 2.5, y + 12);
  });
  y += cardH + 5;

  // ===== Table =====
  const cols = [
    { key: 'date', label: 'Date', w: 22, align: 'left' as const },
    { key: 'reference', label: 'Reference', w: 28, align: 'left' as const },
    { key: 'party', label: 'Client / Vendor', w: 42, align: 'left' as const },
    { key: 'category', label: 'Category', w: 24, align: 'left' as const },
    { key: 'description', label: 'Description', w: 60, align: 'left' as const },
    { key: 'paymentMethod', label: 'Mode', w: 20, align: 'left' as const },
    { key: 'credit', label: 'Credit (Rs.)', w: 24, align: 'right' as const },
    { key: 'debit', label: 'Debit (Rs.)', w: 24, align: 'right' as const },
    { key: 'balance', label: 'Balance (Rs.)', w: 27, align: 'right' as const },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const tableX = margin + (pageW - margin * 2 - tableW) / 2;
  const rowH = 6.5;
  const headerH = 7.5;

  const drawTableHeader = (yStart: number) => {
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(tableX, yStart, tableW, headerH, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    let cx = tableX;
    for (const c of cols) {
      const tx = c.align === 'right' ? cx + c.w - 2 : cx + 2;
      doc.text(c.label, tx, yStart + 5, { align: c.align });
      cx += c.w;
    }
  };

  const drawFooter = () => {
    const total = doc.getNumberOfPages();
    const cur = doc.getCurrentPageInfo().pageNumber;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(
      'This is a computer-generated statement and does not require a signature.',
      margin,
      pageH - 6,
    );
    doc.text(`Page ${cur} of ${total}`, pageW - margin, pageH - 6, { align: 'right' });
  };

  drawTableHeader(y);
  y += headerH;

  doc.setTextColor(30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const writeRow = (r: FinanceTxnRow, idx: number) => {
    if (y + rowH > pageH - 14) {
      doc.addPage();
      y = margin;
      drawTableHeader(y);
      y += headerH;
      doc.setTextColor(30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }
    if (idx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(tableX, y, tableW, rowH, 'F');
    }
    let cx = tableX;
    const dateLabel = r.date
      ? new Date(r.date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-';
    const partyLabel = r.party
      ? r.party + (r.partyType ? ` (${r.partyType})` : '')
      : '-';
    const isCredit = r.type === 'income';
    const balance = balanceById.get(r.id) ?? 0;
    const cells: Record<string, string> = {
      date: dateLabel,
      reference: r.reference || '-',
      party: '',
      category: r.category || '-',
      description: '',
      paymentMethod: r.paymentMethod || '-',
      credit: isCredit ? INR(Number(r.amount) || 0) : '-',
      debit: !isCredit ? INR(Number(r.amount) || 0) : '-',
      balance: INR(balance),
    };
    for (const c of cols) {
      let v = cells[c.key];
      if (c.key === 'party') v = truncate(doc, partyLabel, c.w - 4);
      else if (c.key === 'description') v = truncate(doc, r.description || '-', c.w - 4);
      else if (c.key === 'reference') v = truncate(doc, r.reference || '-', c.w - 4);
      else if (c.key === 'category') v = truncate(doc, r.category || '-', c.w - 4);

      if (c.key === 'credit' && isCredit) doc.setTextColor(22, 163, 74);
      else if (c.key === 'debit' && !isCredit) doc.setTextColor(220, 38, 38);
      else if (c.key === 'balance') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(balance >= 0 ? 30 : 220, balance >= 0 ? 30 : 38, balance >= 0 ? 30 : 38);
      } else doc.setTextColor(40);

      const tx = c.align === 'right' ? cx + c.w - 2 : cx + 2;
      doc.text(v, tx, y + 4.5, { align: c.align });
      doc.setFont('helvetica', 'normal');
      cx += c.w;
    }
    doc.setDrawColor(230);
    doc.line(tableX, y + rowH, tableX + tableW, y + rowH);
    y += rowH;
  };

  rows.forEach((r, i) => writeRow(r, i));

  // Totals row
  if (y + rowH + 2 > pageH - 14) {
    doc.addPage();
    y = margin;
  }
  y += 1;
  doc.setFillColor(241, 245, 249);
  doc.rect(tableX, y, tableW, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30);
  let cx = tableX;
  const totalsCells: Record<string, string> = {
    date: '',
    reference: '',
    party: '',
    category: '',
    description: 'TOTALS',
    paymentMethod: '',
    credit: INR(totalCredit),
    debit: INR(totalDebit),
    balance: INR(netBalance),
  };
  for (const c of cols) {
    const v = totalsCells[c.key];
    if (c.key === 'credit') doc.setTextColor(22, 163, 74);
    else if (c.key === 'debit') doc.setTextColor(220, 38, 38);
    else if (c.key === 'balance') doc.setTextColor(netBalance >= 0 ? 22 : 220, netBalance >= 0 ? 163 : 38, netBalance >= 0 ? 74 : 38);
    else doc.setTextColor(30);
    const tx = c.align === 'right' ? cx + c.w - 2 : cx + 2;
    doc.text(v, tx, y + 4.5, { align: c.align });
    cx += c.w;
  }
  y += rowH;

  // Stamp footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter();
  }

  doc.save(filename);
}
