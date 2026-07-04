import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  formatAsYouType,
  guessCountry,
  listCountries,
  validatePhone,
  type CountryCode,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // E.164 (or empty)
  onChange: (e164: string, meta: { valid: boolean; reason?: string; country: CountryCode }) => void;
  placeholder?: string;
  className?: string;
};

export function PhoneInput({ value, onChange, placeholder, className }: Props) {
  const [country, setCountry] = useState<CountryCode>(() => guessCountry());
  const [display, setDisplay] = useState("");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const countries = useMemo(() => listCountries(), []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(s) || c.dial.includes(s) || c.code.toLowerCase().includes(s),
    );
  }, [countries, q]);

  // Hydrate from existing E.164 value once
  useEffect(() => {
    if (value && !display) {
      const r = validatePhone(value);
      if (r.ok) {
        setCountry(r.country);
        setDisplay(r.national);
      } else {
        setDisplay(value);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (nextDisplay: string, nextCountry: CountryCode) => {
    const r = validatePhone(nextDisplay, nextCountry);
    if (r.ok) onChange(r.e164, { valid: true, country: nextCountry });
    else onChange("", { valid: false, reason: r.reason, country: nextCountry });
  };

  const dial = countries.find((c) => c.code === country)?.dial ?? "";
  const validity = validatePhone(display, country);

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex h-11 w-full items-center gap-1 rounded-2xl border border-border bg-card pr-2 pl-1 focus-within:border-primary",
          display && !validity.ok && "ring-2 ring-destructive/50",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 items-center gap-1 rounded-xl px-2 text-sm font-bold hover:bg-muted"
        >
          <span aria-hidden>{flagOf(country)}</span>
          <span className="text-muted-foreground">{dial}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <input
          className="h-full flex-1 bg-transparent px-1 text-sm font-semibold outline-none"
          value={display}
          inputMode="tel"
          autoComplete="tel"
          placeholder={placeholder ?? "Phone number"}
          onChange={(e) => {
            const formatted = formatAsYouType(e.target.value, country);
            setDisplay(formatted);
            emit(formatted, country);
          }}
        />
        {validity.ok && <Check className="h-4 w-4 text-emerald-500" aria-label="Valid" />}
      </div>

      {display && !validity.ok && (
        <p className="mt-1 px-1 text-[11px] font-semibold text-destructive">{validity.reason}</p>
      )}
      {validity.ok && (
        <p className="mt-1 px-1 text-[11px] text-muted-foreground">Will call: {validity.e164}</p>
      )}

      {open && (
        <>
          <button
            aria-hidden
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search country"
                className="h-8 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCountry(c.code);
                    setOpen(false);
                    setQ("");
                    emit(display, c.code);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                    c.code === country && "bg-lavender",
                  )}
                >
                  <span aria-hidden>{flagOf(c.code)}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.dial}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">No matches</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function flagOf(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + code.charCodeAt(0) - 65,
    base + code.charCodeAt(1) - 65,
  );
}
