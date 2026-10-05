"use client";

import { useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Printer, RotateCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { erpnext } from "@/lib/erpnext/client";

/**
 * Print Format the bill is rendered with — the same one ERPNext's own Print
 * button uses, so the till and the back office hand out the same document.
 */
export const INVOICE_PRINT_FORMAT =
  process.env.NEXT_PUBLIC_ERPNEXT_INVOICE_PRINT_FORMAT || "Iklera Print Format";

/** ERPNext-rendered PDF of the invoice, for saving or sharing. */
export function invoicePdfUrl(invoiceName: string) {
  return `/api/print/invoice/${encodeURIComponent(invoiceName)}`;
}

/**
 * Wrap ERPNext's print HTML the way its /printview page does, so the format's
 * own CSS applies unchanged. On screen it sits as a sheet on the dialog's
 * surface; in print only the sheet's content goes to paper.
 */
function toDocument(html: string, style: string) {
  return `<!doctype html><html><head><meta charset="utf-8">
<base target="_blank">
<style>${style}</style>
<style>
  @page { size: A4; margin: 12mm; }
  html, body { margin: 0; background: transparent; }
  @media screen {
    .print-format-gutter { background: transparent; padding: 16px; }
    .print-format { border-radius: 4px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.12), 0 1px 2px rgb(0 0 0 / 0.08); }
  }
</style></head>
<body><div class="print-format-gutter"><div class="print-format">${html}</div></div></body></html>`;
}

interface InvoiceViewProps {
  invoiceName: string;
  /** Left side of the toolbar: what this screen is about. */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Shown between the toolbar and the invoice, e.g. a warning. */
  notice?: ReactNode;
  /** Primary actions for the screen, placed after Print. */
  actions?: ReactNode;
}

/**
 * The Sales Invoice as ERPNext renders it, with one toolbar for everything
 * done to it. Shown as HTML rather than a PDF so there is no viewer chrome
 * inside the dialog, and printed straight from the frame.
 */
export function InvoiceView({
  invoiceName,
  title,
  subtitle,
  notice,
  actions,
}: InvoiceViewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["invoice-html", invoiceName, INVOICE_PRINT_FORMAT],
    queryFn: async () => {
      const res = await erpnext.get<{ message: { html: string; style?: string } }>(
        "api/method/frappe.www.printview.get_html_and_style",
        {
          doc: "Sales Invoice",
          name: invoiceName,
          print_format: INVOICE_PRINT_FORMAT,
          no_letterhead: "0",
        }
      );
      return toDocument(res.message.html, res.message.style ?? "");
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });

  function handlePrint() {
    const frame = frameRef.current?.contentWindow;
    frame?.focus();
    frame?.print();
  }

  return (
    <div className="flex h-[min(88dvh,1100px)] flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 pr-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-base font-semibold">{title}</div>
          {subtitle && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={invoicePdfUrl(invoiceName)}
            download={`${invoiceName}.pdf`}
            aria-label="Download PDF"
            title="Download PDF"
            className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          >
            <Download />
          </a>
          <Button variant="outline" onClick={handlePrint} disabled={!data}>
            <Printer />
            Print
          </Button>
          {actions}
        </div>
      </div>

      {notice}

      {/* Invoice */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-muted">
        {data ? (
          <iframe
            ref={frameRef}
            srcDoc={data}
            title={`Invoice ${invoiceName}`}
            // No scripts run in ERPNext's HTML; modals are needed for print().
            sandbox="allow-same-origin allow-modals allow-popups"
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            {isLoading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Loading invoice…
              </>
            ) : isError ? (
              <>
                <p className="text-destructive">Couldn&apos;t load invoice {invoiceName}.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                  <RotateCw className={isFetching ? "animate-spin" : undefined} />
                  Retry
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
