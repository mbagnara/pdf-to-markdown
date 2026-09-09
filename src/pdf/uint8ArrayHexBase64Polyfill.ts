/**
 * pdfjs-dist (6.x) calls the still-new Uint8Array base64/hex methods (the
 * TC39 "Uint8Array to/from base64/hex" proposal) without a fallback. On a
 * browser that hasn't shipped them yet, loading ANY PDF fails with an error
 * like "toHex is not a function" even though the file itself is perfectly
 * valid. This installs a minimal polyfill for the handful of methods pdf.js
 * actually calls, only if the browser doesn't already provide them.
 *
 * pdf.js runs its worker in a separate realm, which doesn't see this patch.
 * `UINT8ARRAY_HEX_BASE64_POLYFILL_SOURCE` below mirrors the functions here
 * as plain JS, prepended to the worker script's own source in
 * extractPdf.ts. Keep the two in sync if this ever changes.
 */

export function bytesToHex(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i += 1) {
    hex += (bytes[i] ?? 0).toString(16).padStart(2, '0')
  }
  return hex
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(hex.length / 2))
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i] ?? 0)
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function installUint8ArrayHexBase64Polyfill(): void {
  const proto = Uint8Array.prototype as unknown as Record<string, unknown>
  const ctor = Uint8Array as unknown as Record<string, unknown>

  if (typeof proto['toHex'] !== 'function') {
    proto['toHex'] = function toHex(this: Uint8Array): string {
      return bytesToHex(this)
    }
  }
  if (typeof ctor['fromHex'] !== 'function') {
    ctor['fromHex'] = hexToBytes
  }
  if (typeof proto['toBase64'] !== 'function') {
    proto['toBase64'] = function toBase64(this: Uint8Array): string {
      return bytesToBase64(this)
    }
  }
  if (typeof ctor['fromBase64'] !== 'function') {
    ctor['fromBase64'] = base64ToBytes
  }
}

export const UINT8ARRAY_HEX_BASE64_POLYFILL_SOURCE = `(function () {
  var proto = Uint8Array.prototype;
  var ctor = Uint8Array;
  if (typeof proto.toHex !== 'function') {
    proto.toHex = function () {
      var hex = '';
      for (var i = 0; i < this.length; i++) hex += this[i].toString(16).padStart(2, '0');
      return hex;
    };
  }
  if (typeof ctor.fromHex !== 'function') {
    ctor.fromHex = function (hex) {
      var bytes = new Uint8Array(Math.floor(hex.length / 2));
      for (var i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      return bytes;
    };
  }
  if (typeof proto.toBase64 !== 'function') {
    proto.toBase64 = function () {
      var binary = '';
      for (var i = 0; i < this.length; i++) binary += String.fromCharCode(this[i]);
      return btoa(binary);
    };
  }
  if (typeof ctor.fromBase64 !== 'function') {
    ctor.fromBase64 = function (base64) {
      var binary = atob(base64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    };
  }
})();
`
