// One request body, fields and one plate. URL-encoded posts stay the existing
// studio path; multipart is only for the cover form's plate upload.

const MAX_PLATE_BYTES = 8 * 1024 * 1024;
const PLATE_TYPES = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

export async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_PLATE_BYTES + 64 * 1024) {
      throw new Error("cover form body is larger than the plate allowance");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function parseFormBody(req, raw) {
  const type = String(req.headers["content-type"] ?? "");
  const boundary = type.match(/boundary=([^;]+)/)?.[1];
  if (!boundary) {
    const fields = Object.fromEntries(new URLSearchParams(raw.toString("utf8")));
    return { fields, file: undefined };
  }
  return parseMultipart(raw, boundary);
}

function parseMultipart(raw, boundary) {
  const token = Buffer.from(`--${boundary}`);
  const fields = {};
  let file;
  let cursor = indexOf(raw, token, 0);
  while (cursor !== -1) {
    const start = cursor + token.length;
    if (raw[start] === 0x2d && raw[start + 1] === 0x2d) break;
    const headStart = raw[start] === 0x0d ? start + 2 : start;
    const headerEnd = indexOf(raw, Buffer.from("\r\n\r\n"), headStart);
    if (headerEnd === -1) break;
    const headers = raw.slice(headStart, headerEnd).toString("utf8");
    const next = indexOf(raw, token, headerEnd + 4);
    const bodyEnd = next === -1 ? raw.length : next - 2;
    const body = raw.slice(headerEnd + 4, bodyEnd);
    const name = headers.match(/name="([^"]+)"/)?.[1];
    const filename = headers.match(/filename="([^"]+)"/)?.[1];
    if (name && filename) {
      const mime = headers.match(/Content-Type:\s*([^\r\n]+)/i)?.[1]?.trim() ?? "";
      file = { field: name, filename, mime, bytes: body };
    } else if (name) {
      fields[name] = body.toString("utf8");
    }
    cursor = next;
  }
  return { fields, file };
}

function indexOf(buffer, token, from) {
  return buffer.indexOf(token, from);
}

export function plateExtension(file) {
  if (!file) return undefined;
  const byMime = PLATE_TYPES.get(file.mime);
  if (byMime) return byMime;
  const ext = file.filename.toLowerCase().match(/\.(png|jpe?g|webp)$/)?.[0];
  return ext === ".jpeg" ? ".jpg" : ext;
}
