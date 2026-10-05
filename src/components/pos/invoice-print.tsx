"use client";

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Printer, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Where the POS fetches ERPNext's rendered PDF for an invoice. */
export function invoicePdfUrl(invoiceName: string) {
  return `/api/print/invoice/${encodeURIComponent(invoiceName)}`;
}

/**
 * The Sales Invoice as ERPNext prints it, shown in place and printable.
 *
 * Fetched as a blob first (rather than pointing the iframe at the route) so a
 * failure shows a message and a retry instead of an error page inside the
 * frame, and so the frame stays same-origin and can be printed directly.
 */
export function InvoicePrint({
  invoiceName,
  className = "h-[60vh]",
}: {
  invoiceName: string;
  className?: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const { data: objectUrl, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["invoice-pdf", invoiceName],
    queryFn: async () => {
      const res = await fetch(invoicePdfUrl(invoiceName));
      if (!res.ok) throw new Error(`Print failed (${res.status})`);
      // Not revoked: a bill PDF is a few tens of KB and a till views a
      // handful per session, while revoking on unmount breaks the frame
      // under React's double-mounted effects.
      return URL.createObjectURL(await res.blob());
    },
    // Re-fetched each time it's opened (a later payment can change what the
    // format shows), but not on every window focus.
    refetchOnWindowFocus: false,
    retry: 1,
  });

  function handlePrint() {
    const frame = frameRef.current?.contentWindow;
    try {
      frame?.focus();
      frame?.print();
    } catch {
      // Some browsers (Safari) won't print a PDF frame — open it instead,
      // where the viewer's own print button works.
      if (objectUrl) window.open(objectUrl, "_blank");
    }
  }

  return (
    <div className="space-y-2">
      <div className={`overflow-hidden rounded-lg border bg-muted/30 ${className}`}>
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading invoice from ERPNext…
          </div>
        ) : isError || !objectUrl ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm">
            <p className="text-destructive">
              Couldn&apos;t load invoice {invoiceName} from ERPNext.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RotateCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </div>
        ) : (
          <iframe
            ref={frameRef}
            src={objectUrl}
            title={`Invoice ${invoiceName}`}
            className="h-full w-full"
          />
        )}
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" variant="outline" onClick={handlePrint} disabled={!objectUrl}>
          <Printer className="mr-1.5 h-4 w-4" />
          Print Invoice
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open invoice PDF in a new tab"
          disabled={!objectUrl}
          onClick={() => objectUrl && window.open(objectUrl, "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
