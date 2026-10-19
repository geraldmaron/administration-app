/**
 * How a campaign's JSON is kept on the device.
 *
 * At 196 governments a campaign 208 weeks in is about 12 MB of JSON, over the
 * 10 MB a slot is allowed, and the ledger, the wire and the people only grow.
 * JSON of this shape compresses five to eight times, so the payload is gzipped
 * and stored as base64 behind a marker. The storage port stays a string port,
 * which is what IndexedDB and the desktop's atomic file writes already take.
 *
 * A payload without the marker is plain JSON, which is how every save written
 * before this was kept; it is read as it stands and rewritten compressed on the
 * next save, so no administration has to be migrated to keep playing.
 */

export const COMPRESSED_PAYLOAD_MARKER = "gz1:";

// Chunked so a multi-megabyte payload never spreads more arguments than a
// call frame holds.
const CHUNK = 0x8000;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function canCompress(): boolean {
  return typeof CompressionStream === "function" && typeof DecompressionStream === "function";
}

/** The JSON as it is stored: compressed where the platform can, plain where it cannot. */
export async function encodePayload(json: string): Promise<string> {
  // A runtime without compression streams still has to save: plain JSON is
  // what every build before this wrote, and every build since reads it.
  if (!canCompress()) return json;
  const packed = await pipe(new TextEncoder().encode(json), new CompressionStream("gzip"));
  return `${COMPRESSED_PAYLOAD_MARKER}${toBase64(packed)}`;
}

/** The JSON a stored payload holds, whichever way it was kept. */
export async function decodePayload(stored: string): Promise<string> {
  if (!stored.startsWith(COMPRESSED_PAYLOAD_MARKER)) return stored;
  if (!canCompress()) {
    throw new Error("This save is compressed and this runtime cannot decompress it. Open it in a current browser or the desktop app.");
  }
  const unpacked = await pipe(fromBase64(stored.slice(COMPRESSED_PAYLOAD_MARKER.length)), new DecompressionStream("gzip"));
  return new TextDecoder().decode(unpacked);
}
