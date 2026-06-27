import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Loader2, User, X } from "lucide-react";
import { toast } from "sonner";
import { useGuests, useCreateGuest } from "../hooks/useGuests";

interface GuestPickerProps {
  value: string | null;
  onChange: (guestId: string, guestName: string) => void;
  onClear?: () => void;
}

export function GuestPicker({ value, onChange, onClear }: GuestPickerProps) {
  const { data: guests = [] } = useGuests();
  const createGuest = useCreateGuest();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selectedGuest = guests.find((g) => g.id === value);

  const filtered = query.trim()
    ? guests.filter((g) => {
        const q = query.toLowerCase();
        return (
          g.full_name.toLowerCase().includes(q) ||
          g.email?.toLowerCase().includes(q) ||
          g.phone?.includes(q)
        );
      }).slice(0, 8)
    : guests.slice(0, 8);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) { toast.error("Guest name is required."); return; }
    try {
      const data = await createGuest.mutateAsync({
        full_name: newName.trim(),
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
      });
      onChange(data.id, data.full_name);
      setOpen(false);
      setCreating(false);
      setNewName(""); setNewEmail(""); setNewPhone("");
      setQuery("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create guest.");
    }
  }, [newName, newEmail, newPhone, createGuest, onChange]);

  // Selected state
  if (selectedGuest) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{selectedGuest.full_name}</p>
          {selectedGuest.email && <p className="text-xs text-muted-foreground">{selectedGuest.email}</p>}
        </div>
        {onClear && (
          <button onClick={onClear} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search guests by name, email, or phone…"
          className="pl-9"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setCreating(false); }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border bg-card p-1.5 shadow-lg">
          {!creating ? (
            <>
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">No guests found.</p>
              )}
              {filtered.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { onChange(g.id, g.full_name); setOpen(false); setQuery(""); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{g.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[g.email, g.phone].filter(Boolean).join(" · ") || "No contact info"}
                    </p>
                  </div>
                </button>
              ))}
              <div className="mt-1 border-t pt-1">
                <button
                  type="button"
                  onClick={() => { setCreating(true); setNewName(query); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary transition-colors hover:bg-accent"
                >
                  <Plus className="h-4 w-4" /> Create new guest
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3 p-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New guest</p>
              <div className="space-y-2">
                <Input placeholder="Full name *" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9 text-sm" />
                <Input placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-9 text-sm" />
                <Input placeholder="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
                <Button type="button" size="sm" disabled={createGuest.isPending} className="gap-1.5" onClick={handleCreate}>
                  {createGuest.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
