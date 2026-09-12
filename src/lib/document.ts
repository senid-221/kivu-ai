import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

type PdfTextItem = { str?: string };

export async function extractDocumentText(
  buffer: Buffer,
  name: string,
  type: string,
): Promise<string> {
  const normalizedName = name.toLowerCase();

  if (type.startsWith("text/") || normalizedName.endsWith(".txt")) {
    return buffer.toString("utf8");
  }

  if (normalizedName.endsWith(".docx")) {
    return (await mammoth.extractRawText({ buffer })).value;
  }

  if (normalizedName.endsWith(".pdf") || type === "application/pdf") {
    const document = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    }).promise;

    let text = "";

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items as PdfTextItem[];
      text += items.map((item) => item.str ?? "").join(" ") + "\n";
      page.cleanup();
    }

    await document.cleanup();
    return text;
  }

  throw new Error("Unsupported format");
}
