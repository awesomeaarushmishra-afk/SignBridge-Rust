import * as pdfjsLib from 'pdfjs-dist';

let workerConfigured = false;

function ensurePdfWorker() {
  if (workerConfigured) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  workerConfigured = true;
}

/**
 * Extracts readable text page-by-page from an uploaded .pdf dictionary file in-browser.
 */
export async function extractTextFromPdfFile(file: File): Promise<string> {
  ensurePdfWorker();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const pageBlocks: string[] = [];
  const totalPages = Math.min(pdf.numPages, 120);

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group PDF text items into lines using Y coordinate proximity
    const lines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const str = item.str;
      const y = Array.isArray(item.transform) ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = str;
      } else {
        currentLine = currentLine ? `${currentLine} ${str}` : str;
      }
      if (y !== null) lastY = y;
      if ('hasEOL' in item && item.hasEOL) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = '';
        lastY = null;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    pageBlocks.push(`--- Page ${pageNum} ---\n${lines.join('\n')}`);
  }

  return pageBlocks.join('\n');
}
