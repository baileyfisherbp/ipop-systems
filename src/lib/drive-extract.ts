import { drive_v3 } from "googleapis";

import JSZip from "jszip";

const MAX_CONTENT_LENGTH = 15000;

// Mime types we can directly read as text
const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/csv",
  "text/html",
  "text/xml",
  "text/markdown",
  "text/tab-separated-values",
  "text/rtf",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-yaml",
  "application/x-sh",
]);

function isTextMimeType(mimeType: string): boolean {
  if (TEXT_MIME_TYPES.has(mimeType)) return true;
  if (mimeType.startsWith("text/")) return true;
  return false;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract text from DOCX (OpenXML) — it's a ZIP with XML inside
async function extractDocxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const docXml = zip.file("word/document.xml");
  if (!docXml) return "(Could not read DOCX content)";

  const xml = await docXml.async("text");
  // Extract text from <w:t> tags
  const texts: string[] = [];
  const regex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    texts.push(match[1]);
  }

  // Detect paragraph boundaries for readability
  return xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:t[^>]*>/g, "")
    .replace(/<\/w:t>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim() || texts.join(" ");
}

// Extract text from PPTX slides
async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideTexts: string[] = [];

  // Slides are in ppt/slides/slide1.xml, slide2.xml, etc.
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();

  for (const slidePath of slideFiles) {
    const xml = await zip.file(slidePath)!.async("text");
    // Extract text from <a:t> tags
    const texts: string[] = [];
    const regex = /<a:t>([\s\S]*?)<\/a:t>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      texts.push(match[1]);
    }
    if (texts.length > 0) {
      const slideNum = slidePath.match(/slide(\d+)/)?.[1];
      slideTexts.push(`[Slide ${slideNum}]\n${texts.join(" ")}`);
    }
  }

  return slideTexts.join("\n\n") || "(No text content found in slides)";
}

// Extract text from XLSX spreadsheets
async function extractXlsxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  // Read shared strings
  const sharedStringsFile = zip.file("xl/sharedStrings.xml");
  const strings: string[] = [];
  if (sharedStringsFile) {
    const xml = await sharedStringsFile.async("text");
    const regex = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      strings.push(match[1]);
    }
  }

  // Read sheets
  const sheetFiles = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort();

  const sheetTexts: string[] = [];

  for (const sheetPath of sheetFiles) {
    const xml = await zip.file(sheetPath)!.async("text");
    const rows: string[] = [];
    const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(xml)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<c[^>]*(?:t="s"[^>]*)?>[\s\S]*?<v>([\s\S]*?)<\/v>/g;
      const typeRegex = /<c[^>]*t="s"[^>]*>/;
      // Simple extraction: get <v> values, resolve shared strings
      const vRegex = /<c([^>]*)><v>(\d+)<\/v><\/c>|<c([^>]*)><v>([^<]+)<\/v><\/c>/g;
      let cellMatch;
      const rawRow = rowMatch[1];
      const simpleVRegex = /<c([^>]*)>(?:<f>[^<]*<\/f>)?<v>([^<]*)<\/v><\/c>/g;
      while ((cellMatch = simpleVRegex.exec(rawRow)) !== null) {
        const attrs = cellMatch[1];
        const value = cellMatch[2];
        if (attrs.includes('t="s"') && strings[Number(value)]) {
          cells.push(strings[Number(value)]);
        } else {
          cells.push(value);
        }
      }
      if (cells.length > 0) {
        rows.push(cells.join("\t"));
      }
    }
    if (rows.length > 0) {
      const sheetNum = sheetPath.match(/sheet(\d+)/)?.[1];
      sheetTexts.push(`[Sheet ${sheetNum}]\n${rows.join("\n")}`);
    }
  }

  return sheetTexts.join("\n\n") || "(No data found in spreadsheet)";
}

/**
 * Extract text content from a Google Drive file.
 * Handles Google Workspace files, PDFs, Office documents, and text files.
 */
export async function extractFileContent(
  drive: drive_v3.Drive,
  fileId: string,
  mimeType: string
): Promise<string> {
  try {
    // --- Google Workspace files: use export API ---
    if (mimeType.startsWith("application/vnd.google-apps.")) {
      const exportMime =
        mimeType === "application/vnd.google-apps.spreadsheet"
          ? "text/csv"
          : mimeType === "application/vnd.google-apps.presentation"
            ? "text/plain"
            : "text/plain";

      const exported = await drive.files.export(
        { fileId, mimeType: exportMime },
        { responseType: "text" }
      );
      const text = typeof exported.data === "string" ? exported.data : String(exported.data);
      return text.slice(0, MAX_CONTENT_LENGTH);
    }

    // --- Text-based files: download as text ---
    if (isTextMimeType(mimeType)) {
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "text" }
      );
      let text = typeof res.data === "string" ? res.data : String(res.data);

      // Strip HTML tags for HTML files
      if (mimeType === "text/html") {
        text = stripHtmlTags(text);
      }

      return text.slice(0, MAX_CONTENT_LENGTH);
    }

    // --- Binary files: download as buffer ---
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const buffer = Buffer.from(res.data as ArrayBuffer);

    // PDF
    if (mimeType === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      return result.text.slice(0, MAX_CONTENT_LENGTH);
    }

    // DOCX
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      // .doc (legacy) can't be parsed easily; DOCX can
      if (mimeType === "application/msword") {
        // Try to extract any readable text from binary .doc
        const text = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
        return text.slice(0, MAX_CONTENT_LENGTH) || "(Legacy .doc format — content extraction limited)";
      }
      return (await extractDocxText(buffer)).slice(0, MAX_CONTENT_LENGTH);
    }

    // PPTX
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      mimeType === "application/vnd.ms-powerpoint"
    ) {
      if (mimeType === "application/vnd.ms-powerpoint") {
        return "(Legacy .ppt format — use Google Slides conversion for full content)";
      }
      return (await extractPptxText(buffer)).slice(0, MAX_CONTENT_LENGTH);
    }

    // XLSX
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      if (mimeType === "application/vnd.ms-excel") {
        return "(Legacy .xls format — use Google Sheets conversion for full content)";
      }
      return (await extractXlsxText(buffer)).slice(0, MAX_CONTENT_LENGTH);
    }

    // RTF — extract readable text
    if (mimeType === "application/rtf") {
      const text = buffer.toString("utf-8")
        .replace(/\\[a-z]+\d*\s?/g, "")
        .replace(/[{}]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return text.slice(0, MAX_CONTENT_LENGTH);
    }

    // Images — can't extract text, return metadata note
    if (mimeType.startsWith("image/")) {
      return "(Image file — no text content to extract)";
    }

    // Video/Audio
    if (mimeType.startsWith("video/") || mimeType.startsWith("audio/")) {
      return "(Media file — no text content to extract)";
    }

    // ZIP/archive
    if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") {
      const zip = await JSZip.loadAsync(buffer);
      const fileList = Object.keys(zip.files).filter((f) => !zip.files[f].dir);
      return `Archive contains ${fileList.length} files:\n${fileList.slice(0, 50).join("\n")}`;
    }

    // Fallback: try to read as text
    const fallbackText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, "").trim();
    if (fallbackText.length > 50) {
      return fallbackText.slice(0, MAX_CONTENT_LENGTH);
    }

    return "(Binary file — content extraction not supported for this file type)";
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return `(Could not extract file content: ${msg})`;
  }
}
