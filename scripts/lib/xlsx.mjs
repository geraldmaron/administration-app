// A spreadsheet read with nothing but the system `unzip` and the XML's own
// structure: the vendor scripts take a handful of public workbooks (the World
// Bank's Fiscal Space database, the Census Bureau's trade by country) and a
// dependency for that would be the only one they had.
import { execFileSync } from "node:child_process";

export function unzipText(zip, entry) {
  return execFileSync("unzip", ["-p", zip, entry], { maxBuffer: 256 * 1024 * 1024 }).toString("utf8");
}

const decodeXml = (raw) => raw.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** One sheet of an .xlsx as rows keyed by header text. */
export function xlsxSheet(zip, sheetName) {
  const strings = [...unzipText(zip, "xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => decodeXml(m[1]));
  const workbook = unzipText(zip, "xl/workbook.xml");
  const rid = new RegExp(`<sheet name="${sheetName}" sheetId="\\d+" r:id="(rId\\d+)"`).exec(workbook)?.[1];
  if (!rid) throw new Error(`${zip} has no sheet ${sheetName}`);
  const rels = unzipText(zip, "xl/_rels/workbook.xml.rels");
  const target = new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`).exec(rels)?.[1] ?? new RegExp(`Target="([^"]+)"[^>]*Id="${rid}"`).exec(rels)?.[1];
  const xml = unzipText(zip, `xl/${target.replace(/^\/?xl\//, "")}`);
  const rows = [];
  let header;
  for (const [, body] of xml.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)) {
    const row = {};
    for (const [, col, attrs, value] of body.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(?:<f>[\s\S]*?<\/f>)?(?:<v>([^<]*)<\/v>)?<\/c>)/g)) {
      if (value !== undefined && value !== "") row[col] = attrs.includes('t="s"') ? strings[Number(value)] : value;
    }
    if (!header) header = row;
    else rows.push(Object.fromEntries(Object.entries(row).map(([col, value]) => [header[col], value])));
  }
  return rows;
}
