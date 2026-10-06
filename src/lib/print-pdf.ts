/**
 * Print a server-rendered PDF.
 *
 * Chrome, Edge and Firefox print a PDF loaded in a frame, which sends
 * ERPNext's own layout to the printer at true A4 rather than re-flowing HTML.
 * Phones, tablets and Safari can't (Safari prints a blank page), so there the
 * PDF opens in the browser's viewer, whose Print and Share act on the file.
 *
 * Must be called straight from a click: the mobile path opens a tab, which
 * browsers only allow in direct response to the user.
 */
export async function printPdf(url: string): Promise<void> {
  if (!canPrintPdfFrame()) {
    window.open(url, "_blank");
    return;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load the PDF (${res.status})`);
  const blobUrl = URL.createObjectURL(await res.blob());

  // Off-screen rather than display:none or zero-sized — Chrome won't load the
  // PDF viewer, and so can't print, in a frame that isn't rendered.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:800px;height:1100px;border:0;";
  frame.src = blobUrl;

  const cleanup = () => {
    frame.remove();
    URL.revokeObjectURL(blobUrl);
  };

  await new Promise<void>((resolve) => {
    frame.onload = () => resolve();
    document.body.appendChild(frame);
  });

  try {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    // The print dialog doesn't report when it closes; give it ample time
    // before tearing the frame down.
    setTimeout(cleanup, 60_000);
  } catch {
    // A browser that refuses outright: open it instead (best effort — this
    // is no longer inside the click, so a popup blocker may stop it).
    window.open(blobUrl, "_blank");
    setTimeout(cleanup, 60_000);
  }
}

function canPrintPdfFrame(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  const mobile =
    /Android|iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg/.test(ua);
  return !mobile && !safari;
}
