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
export declare const COMPRESSED_PAYLOAD_MARKER = "gz1:";
/** The JSON as it is stored: compressed where the platform can, plain where it cannot. */
export declare function encodePayload(json: string): Promise<string>;
/** The JSON a stored payload holds, whichever way it was kept. */
export declare function decodePayload(stored: string): Promise<string>;
