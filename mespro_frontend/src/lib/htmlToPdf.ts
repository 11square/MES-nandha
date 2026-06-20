/**
 * Generic helper: rasterises a styled HTML document with html2canvas, slices it
 * into A4 pages and downloads the result as a multi-page PDF via jsPDF.
 *
 * The HTML must contain a top-level `.page` element (794px wide) holding the
 * report body — the same convention used across the app's PDF reports.
 */
export async function renderHtmlToPdf(html: string, fileName: string): Promise<void> {
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

    // Trim trailing whitespace to avoid a spurious blank final page.
    const trimmedCanvas = (() => {
      const ctx0 = canvas.getContext('2d');
      if (!ctx0) return canvas;
      try {
        const { width, height } = canvas;
        const data = ctx0.getImageData(0, 0, width, height).data;
        const isContentRow = (y: number) => {
          const rowStart = y * width * 4;
          for (let x = 0; x < width; x += 4) {
            const i = rowStart + x * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            if (r < 248 || g < 248 || b < 248) return true;
          }
          return false;
        };
        let lastContent = height - 1;
        while (lastContent > 0 && !isContentRow(lastContent)) lastContent--;
        const trimmedHeight = Math.min(height, lastContent + 24);
        if (trimmedHeight >= height - 4) return canvas;
        const trimmed = document.createElement('canvas');
        trimmed.width = width;
        trimmed.height = trimmedHeight;
        const tctx = trimmed.getContext('2d')!;
        tctx.fillStyle = '#ffffff';
        tctx.fillRect(0, 0, width, trimmedHeight);
        tctx.drawImage(canvas, 0, 0, width, trimmedHeight, 0, 0, width, trimmedHeight);
        return trimmed;
      } catch {
        return canvas;
      }
    })();

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();
    const marginMm = 8;
    const usableWidthMm = pageWidthMm - marginMm * 2;
    const usableHeightMm = pageHeightMm - marginMm * 2;
    const pxPerMm = trimmedCanvas.width / usableWidthMm;
    const pageHeightPx = Math.floor(usableHeightMm * pxPerMm);

    let renderedPx = 0;
    let pageIdx = 0;
    while (renderedPx < trimmedCanvas.height) {
      const remainingPx = trimmedCanvas.height - renderedPx;
      if (pageIdx > 0 && remainingPx < pageHeightPx * 0.04) break;
      const sliceHeightPx = Math.min(pageHeightPx, remainingPx);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = trimmedCanvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(trimmedCanvas, 0, renderedPx, trimmedCanvas.width, sliceHeightPx, 0, 0, trimmedCanvas.width, sliceHeightPx);
      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      if (pageIdx > 0) pdf.addPage();
      const sliceHeightMm = sliceHeightPx / pxPerMm;
      pdf.addImage(imgData, 'JPEG', marginMm, marginMm, usableWidthMm, sliceHeightMm);
      renderedPx += sliceHeightPx;
      pageIdx++;
    }

    pdf.save(fileName);
  } finally {
    document.body.removeChild(iframe);
  }
}
