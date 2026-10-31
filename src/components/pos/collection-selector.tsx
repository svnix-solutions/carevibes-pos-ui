"use client";

import { useState } from "react";
import { Building2, House, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useHomeOptions, useSaveAddress, type HomeOptions, type NewAddress } from "@/hooks/use-home-collection";
import { addDays, clinicToday } from "@/lib/date";
import { hasLabItems } from "@/lib/cart/collection";
import { useCartStore } from "@/lib/cart/store";
import { cn } from "@/lib/utils";

const NEW_ADDRESS = "__new__";
const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const MAX_DAYS_AHEAD = 90;

/** At clinic / home collection, for carts with lab tests and a patient. */
export function CollectionSelector() {
  const items = useCartStore((s) => s.items);
  const patient = useCartStore((s) => s.patient);
  const collection = useCartStore((s) => s.collection);
  const setCollection = useCartStore((s) => s.setCollection);
  const [addingAddress, setAddingAddress] = useState(false);

  const visible = hasLabItems(items) && !!patient;
  const home = collection.mode === "home" ? collection : null;
  const { data: options, isLoading, error } = useHomeOptions(patient?.name, visible && !!home);

  if (!visible) return null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(
          [
            { mode: "clinic", label: "At clinic", icon: Building2 },
            { mode: "home", label: "Home collection", icon: House },
          ] as const
        ).map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            aria-pressed={collection.mode === mode}
            onClick={() => {
              if (mode === collection.mode) return;
              setCollection(mode === "home" ? { mode, date: clinicToday() } : { mode });
            }}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground",
              collection.mode === mode && "bg-background text-foreground shadow-sm"
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {home && (
        <>
          {error && <p className="text-xs text-destructive">{error.message}</p>}
          <select
            aria-label="Collection address"
            className={SELECT}
            disabled={isLoading}
            value={home.address?.name ?? ""}
            onChange={(e) => {
              if (e.target.value === NEW_ADDRESS) {
                setAddingAddress(true);
                return;
              }
              const address = options?.addresses.find((a) => a.name === e.target.value);
              setCollection({ ...home, address });
            }}
          >
            <option value="">{isLoading ? "Loading addresses…" : "Choose address…"}</option>
            {options?.addresses.map((a) => (
              <option key={a.name} value={a.name}>
                {a.label}
              </option>
            ))}
            <option value={NEW_ADDRESS}>+ New address</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              aria-label="Collection date"
              className={SELECT}
              min={clinicToday()}
              max={addDays(clinicToday(), MAX_DAYS_AHEAD)}
              value={home.date ?? ""}
              onChange={(e) => setCollection({ ...home, date: e.target.value })}
            />
            <input
              type="time"
              aria-label="Collection time"
              className={SELECT}
              value={home.time ?? ""}
              onChange={(e) => setCollection({ ...home, time: e.target.value })}
            />
          </div>
          <select
            aria-label="Phlebotomist"
            className={SELECT}
            value={home.phlebotomist?.name ?? ""}
            onChange={(e) =>
              setCollection({ ...home, phlebotomist: options?.phlebotomists.find((p) => p.name === e.target.value) })
            }
          >
            <option value="">Assign phlebotomist later</option>
            {options?.phlebotomists.map((p) => (
              <option key={p.name} value={p.name}>
                {p.employee_name}
              </option>
            ))}
          </select>
          {!(home.address && home.date && home.time) && (
            <p className="text-xs text-muted-foreground">Choose the address, date and time to complete the sale.</p>
          )}
        </>
      )}

      {addingAddress && options && (
        <NewAddressDialog
          patient={patient.name}
          options={options}
          onClose={() => setAddingAddress(false)}
          onSaved={(address) => {
            if (home) setCollection({ ...home, address });
            setAddingAddress(false);
          }}
        />
      )}
    </div>
  );
}

function NewAddressDialog({
  patient,
  options,
  onClose,
  onSaved,
}: {
  patient: string;
  options: HomeOptions;
  onClose: () => void;
  onSaved: (address: { name: string; label: string }) => void;
}) {
  const save = useSaveAddress(patient);
  const [form, setForm] = useState<NewAddress>({
    address_line1: "",
    address_line2: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    phone: options.default_phone ?? "",
  });
  const set = (field: keyof NewAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));
  const ready = form.address_line1.trim() && form.city.trim() && form.state && /^[1-9]\d{5}$/.test(form.pincode.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      onSaved(await save.mutateAsync(form));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the address");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>New address</DialogTitle>
          </DialogHeader>
          <Input autoFocus aria-label="House and street" placeholder="House no., street" value={form.address_line1} onChange={set("address_line1")} />
          <Input aria-label="Area" placeholder="Area (optional)" value={form.address_line2} onChange={set("address_line2")} />
          <Input aria-label="Landmark" placeholder="Landmark (optional)" value={form.landmark} onChange={set("landmark")} />
          <div className="grid grid-cols-2 gap-2">
            <Input aria-label="City" placeholder="City" value={form.city} onChange={set("city")} />
            <Input aria-label="PIN code" placeholder="PIN code" inputMode="numeric" value={form.pincode} onChange={set("pincode")} />
          </div>
          <select aria-label="State" className={SELECT} value={form.state} onChange={set("state")}>
            <option value="">Choose state…</option>
            {options.states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Input aria-label="Phone" placeholder="Phone" value={form.phone} onChange={set("phone")} />
          <DialogFooter>
            <Button type="submit" disabled={!ready || save.isPending}>
              {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save address
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
