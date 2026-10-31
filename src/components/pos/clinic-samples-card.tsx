"use client";

import { useRef, useState } from "react";
import { Camera, Check, CircleSlash, Loader2, TestTubes, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useClinicOrder, useCollectTube, useFinishCollection } from "@/hooks/use-clinic-samples";
import { detectBarcodeInPhoto } from "@/lib/barcode";
import { photoToBase64 } from "@/lib/photo";

/**
 * In-clinic sample collection on the order page. Shows only for users with
 * the Phlebotomist role, on bills with lab tests. Built for counter computers:
 * the barcode is typed or comes from a USB scanner (which types it and presses
 * Enter, saving the tube). A photo is optional; where one is added, the
 * barcode is read from it if the field is still empty.
 */
export function ClinicSamplesCard({ invoice }: { invoice: string }) {
  const { data } = useClinicOrder(invoice);
  const collect = useCollectTube(invoice);
  const finish = useFinishCollection(invoice);

  const [pickedSample, setPickedSample] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notCollectedOpen, setNotCollectedOpen] = useState(false);
  const [reason, setReason] = useState("");
  const barcodeInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const order = data?.order;
  if (!order) return null;

  const pending = order.status === "Pending";
  const got = (sample: string) => order.collected.filter((c) => c.sample === sample).length;
  // The next expected tube still to collect, until someone picks another.
  const nextExpected = order.expected_tubes.find((t) => got(t.sample) < t.qty)?.sample ?? "";
  const sample = pickedSample ?? nextExpected;
  const code = barcode.trim();

  async function handlePhoto(file: File) {
    setPhoto(file);
    if (code) return;
    const found = await detectBarcodeInPhoto(file);
    if (found) {
      setBarcode(found);
      toast.success(`Barcode read from photo: ${found}`);
    } else {
      toast("Couldn't read a barcode from the photo. Please type it.");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!sample || code.length < 3 || saving) return;
    setSaving(true);
    try {
      await collect.mutateAsync({ sample, barcode: code, photo: photo ? await photoToBase64(photo) : undefined });
      toast.success(`${sample} tube saved`);
      setBarcode("");
      setPhoto(null);
      setPickedSample(null);
      barcodeInput.current?.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the tube");
    } finally {
      setSaving(false);
    }
  }

  async function close(outcome: "collected" | "not_collected") {
    try {
      await finish.mutateAsync({ outcome, reason: reason.trim() || undefined });
      toast.success(outcome === "collected" ? "Collection completed" : "Marked as not collected");
      setNotCollectedOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't close collection");
    }
  }

  return (
    <Card className="mb-4 p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <TestTubes className="h-4 w-4" /> Samples
          {order.patient_name && <span className="font-normal text-muted-foreground">{order.patient_name}</span>}
        </h3>
        <Badge variant={order.status === "Not Collected" ? "destructive" : order.status === "Collected" ? "default" : "secondary"}>
          {order.status}
        </Badge>
      </div>
      <Separator />
      <div className="space-y-3 px-4 py-3">
        <p className="text-sm text-muted-foreground">{order.items.map((i) => i.item_name).join(", ")}</p>

        {pending && !order.patient && (
          <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            No Patient is linked to this customer, so samples can&apos;t be saved yet.
          </p>
        )}
        {pending && order.unmapped_items.length > 0 && (
          <p className="rounded-md bg-muted p-2 text-sm text-muted-foreground">
            No tube set for {order.unmapped_items.join(", ")}. Choose the tubes you draw.
          </p>
        )}

        {order.expected_tubes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {order.expected_tubes.map((t) => (
              <Badge key={t.sample} variant={got(t.sample) >= t.qty ? "default" : "outline"}>
                {t.sample} {got(t.sample)}/{t.qty}
              </Badge>
            ))}
          </div>
        )}

        {order.collected.length > 0 && (
          <ul className="divide-y rounded-md border text-sm">
            {order.collected.map((c) => (
              <li key={c.name} className="flex items-center gap-2 px-3 py-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="font-mono font-medium">{c.barcode}</span>
                <span className="text-muted-foreground">{c.sample}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {c.custody}
                  {c.has_photo ? " · photo" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {pending && (
          <>
            <form onSubmit={save} className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Tube type"
                value={sample}
                onChange={(e) => setPickedSample(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">Tube type…</option>
                {data.samples.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <Input
                ref={barcodeInput}
                aria-label="Barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Type or scan barcode"
                autoComplete="off"
                className="h-9 min-w-48 flex-1 font-mono"
              />
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) handlePhoto(file);
                }}
              />
              {photo ? (
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setPhoto(null)}>
                  <X className="mr-1 h-4 w-4" /> Remove photo
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => photoInput.current?.click()}>
                  <Camera className="mr-1 h-4 w-4" /> Photo (optional)
                </Button>
              )}
              <Button type="submit" size="sm" className="h-9" disabled={!sample || code.length < 3 || saving || !order.patient}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save tube
              </Button>
            </form>
            <Separator />
            <div className="flex justify-between gap-2">
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setNotCollectedOpen(true)}>
                <CircleSlash className="mr-1 h-4 w-4" /> Couldn&apos;t collect
              </Button>
              <Button size="sm" disabled={order.collected.length === 0 || finish.isPending} onClick={() => close("collected")}>
                <Check className="mr-1 h-4 w-4" /> Finish collection
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={notCollectedOpen} onOpenChange={setNotCollectedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Couldn&apos;t collect</DialogTitle>
            <DialogDescription>Say what happened. This closes collection for this bill.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Patient left, not fasting…" />
          <DialogFooter>
            <Button variant="destructive" disabled={!reason.trim() || finish.isPending} onClick={() => close("not_collected")}>
              Close collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
