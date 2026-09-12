import mammoth from "mammoth";

export type ExtractedDocument = {
  text: string;
  pages?: number;
  truncated?: boolean;
  scanned?: boolean;
};

function clean(text: string) {
  return text.replace(/\u0000/g, "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function ocrImage(image: Buffer) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(image);
    return clean(result.data.text || "");
  } finally {
    await worker.terminate();
  }
}

async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  // Text-only extraction keeps this route compatible with server bundlers.
  // OCR for scanned PDFs can be added later through a separate worker/service.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  });
  const pdf = await task.promise;
  const chunks: string[] = [];
  const maxPages = Math.min(pdf.numPages, 25);
  let scanned = false;

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = clean((content.items as Array<{ str?: string }>).map((item) => item.str || "").join(" "));
    if (pageText.length >= 20) chunks.push("[Page " + pageNumber + "]\n" + pageText);
    else {
      scanned = true;
      chunks.push("[Page " + pageNumber + " appears to be scanned. Text extraction was not available for this page.]");
    }
    page.cleanup();
  }

  const pages = pdf.numPages;
  await pdf.cleanup();
  return { text: clean(chunks.join("\n\n")), pages, truncated: pages > maxPages, scanned };
}

export async function extractDocumentText(buffer: Buffer, name: string, type: string): Promise<ExtractedDocument> {
  const lower = name.toLowerCase();

  if (type.startsWith("text/") || /\.(txt|md|csv)$/i.test(lower)) {
    return { text: clean(buffer.toString("utf8")) };
  }

  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: clean(result.value) };
  }

  if (lower.endsWith(".doc")) {
    throw new Error("Legacy .doc files are not supported. Please save the document as .docx or PDF.");
  }

  if (lower.endsWith(".pdf") || type === "application/pdf") {
    return extractPdf(buffer);
  }

  if (type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(lower)) {
    return { text: await ocrImage(buffer), scanned: true };
  }

  throw new Error("Unsupported file format.");
}