import mammoth from "mammoth";

export type ExtractedDocument = {
  text: string;
  pages?: number;
  truncated?: boolean;
};

function clean(text: string) {
  return text.replace(/\u0000/g, "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
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
    // Dynamic import keeps PDF.js out of routes that do not process PDFs.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    });

    const pdf = await task.promise;
    const chunks: string[] = [];
    const maxPages = Math.min(pdf.numPages, 40);

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = (content.items as Array<{ str?: string }>).map((item) => item.str || "").join(" ");
      if (pageText.trim()) chunks.push("[Page " + pageNumber + "]\n" + pageText);
      page.cleanup();
    }

    await pdf.cleanup();
    return {
      text: clean(chunks.join("\n\n")),
      pages: pdf.numPages,
      truncated: pdf.numPages > maxPages,
    };
  }

  throw new Error("Unsupported file format.");
}