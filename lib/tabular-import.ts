import { inflateRawSync } from "node:zlib";

type Row = Record<string, string>;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function rowsToObjects(rows: string[][]): Row[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).filter((row) => row.some((cell) => cell.trim() !== "")).map((row) => {
    const record: Row = {};
    headers.forEach((header, index) => { if (header) record[header] = String(row[index] ?? "").trim(); });
    return record;
  });
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

function unzipEntries(buffer: Buffer) {
  const eocdSignature = 0x06054b50;
  let eocd = -1;
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let index = buffer.length - 22; index >= minOffset; index -= 1) {
    if (buffer.readUInt32LE(index) === eocdSignature) { eocd = index; break; }
  }
  if (eocd < 0) throw new Error("Invalid XLSX file: ZIP directory not found.");
  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map<string, Buffer>();
  for (let entry = 0; entry < entryCount; entry += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid XLSX central directory.");
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Invalid XLSX local entry.");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) entries.set(name, Buffer.from(compressed));
    else if (method === 8) entries.set(name, inflateRawSync(compressed));
    else throw new Error(`Unsupported XLSX compression method ${method}.`);
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function decodeXml(value: string) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function columnIndex(reference: string) {
  const match = /^([A-Z]+)/i.exec(reference);
  if (!match) return 0;
  let result = 0;
  for (const char of match[1].toUpperCase()) result = result * 26 + (char.charCodeAt(0) - 64);
  return result - 1;
}

function parseXlsx(buffer: Buffer): string[][] {
  const entries = unzipEntries(buffer);
  const sharedXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const sharedStrings: string[] = [];
  for (const item of sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    sharedStrings.push([...item[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXml(part[1])).join(""));
  }
  const sheet = entries.get("xl/worksheets/sheet1.xml")?.toString("utf8");
  if (!sheet) throw new Error("The Excel workbook has no first worksheet.");
  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const body = cellMatch[2];
      const reference = /\br="([^"]+)"/.exec(attributes)?.[1] ?? "A1";
      const type = /\bt="([^"]+)"/.exec(attributes)?.[1] ?? "";
      let value = "";
      if (type === "inlineStr") value = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXml(part[1])).join("");
      else {
        const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
        value = type === "s" ? sharedStrings[Number(raw)] ?? "" : decodeXml(raw);
      }
      row[columnIndex(reference)] = value;
    }
    rows.push(row.map((value) => value ?? ""));
  }
  return rows;
}

export async function parseTabularUpload(file: File): Promise<Row[]> {
  if (file.size > 8 * 1024 * 1024) throw new Error("Bulk import file must be 8 MB or smaller.");
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") return rowsToObjects(parseCsv(await file.text()));
  if (name.endsWith(".xlsx") || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return rowsToObjects(parseXlsx(Buffer.from(await file.arrayBuffer())));
  }
  throw new Error("Use a CSV or XLSX Excel file.");
}
