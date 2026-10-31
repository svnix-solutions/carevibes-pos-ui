// Tube labels are usually 1D (Code 128 / Code 39 / Codabar / ITF); QR and
// Data Matrix are included for labs that print 2D codes.
const FORMATS = [
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "itf",
  "ean_13",
  "ean_8",
  "upc_a",
  "qr_code",
  "data_matrix",
] as const;

interface Detector {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>;
}

let detector: Promise<Detector> | undefined;

/**
 * Chrome on Android has a built-in BarcodeDetector; elsewhere (iPhone, most
 * desktops) the zxing-wasm ponyfill stands in — loaded only when first needed.
 */
function getDetector(): Promise<Detector> {
  detector ??= (async () => {
    const Native = (globalThis as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector;
    if (Native) {
      try {
        const supported = await Native.getSupportedFormats();
        const formats = FORMATS.filter((f) => supported.includes(f));
        if (formats.includes("code_128")) return new Native({ formats });
      } catch {
        // fall through to the ponyfill
      }
    }
    const { BarcodeDetector } = await import("barcode-detector/ponyfill");
    return new BarcodeDetector({ formats: [...FORMATS] });
  })();
  return detector;
}

/** The first barcode found in an image or video frame, or null. */
export async function detectBarcode(source: ImageBitmapSource): Promise<string | null> {
  try {
    const found = await (await getDetector()).detect(source);
    const value = found.find((b) => b.rawValue.trim())?.rawValue.trim();
    return value || null;
  } catch {
    return null;
  }
}

/** Barcode in a photo (Blob), or null — used to read the label off the tube photo. */
export async function detectBarcodeInPhoto(photo: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(photo);
    try {
      return await detectBarcode(bitmap);
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}
