/**
 * A photo shrunk for upload: longest side ≤ 1600px, JPEG, as base64 without
 * the data: prefix. The app's host caps a request at 6 MB and base64 adds a
 * third, so this keeps uploads comfortably small.
 */
export async function photoToBase64(file: Blob): Promise<string> {
  const MAX_SIDE = 1600;
  let blob = file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    if (jpeg) blob = jpeg;
  } catch {
    // The browser can't decode it: send the original.
  }
  if (blob.size > 4 * 1024 * 1024) throw new Error("That photo is too large");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Couldn't read that photo"));
    reader.readAsDataURL(blob);
  });
}
