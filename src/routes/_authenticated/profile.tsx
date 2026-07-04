import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/app/TopBar";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut, Flame, Trophy, Sparkles, ChevronRight, Bell, Moon, Shield,
  HelpCircle, Star, Zap, Target, User, Phone, MapPin, Users, Mail,
  Pencil, Check, X, Camera, AlertCircle, PhoneCall,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import fallbackAvatar from "@/assets/sana-avatar.png";
import { validatePhone } from "@/lib/phone";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  ssr: false,
  component: ProfilePage,
});

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  phone_e164: string | null;
  gender: string | null;
  location: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  streak_days: number;
  email?: string | null;
};

const REQUIRED_FIELDS: { key: keyof ProfileRow; label: string; critical?: boolean }[] = [
  { key: "display_name", label: "Name" },
  { key: "phone_e164", label: "Phone", critical: true },
  { key: "gender", label: "Gender" },
  { key: "location", label: "Location" },
  { key: "avatar_url", label: "Photo" },
];

function ProfilePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [darkMode, setDarkMode] = useState(false);
  const [notif, setNotif] = useState(true);
  const [editing, setEditing] = useState(false);

  const { data: profile } = useQuery<ProfileRow | null>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", u.user.id).maybeSingle();
      return data ? { ...(data as ProfileRow), email: u.user.email } : null;
    },
  });

  const avatarSrc = useResolvedAvatar(profile?.avatar_url ?? null);

  const missing = useMemo(
    () => REQUIRED_FIELDS.filter((f) => !profile || !(profile as any)[f.key]),
    [profile],
  );
  const completion = Math.round(((REQUIRED_FIELDS.length - missing.length) / REQUIRED_FIELDS.length) * 100);
  const phoneMissing = !profile?.phone_e164;

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/welcome" });
  }

  const xp = profile?.xp ?? 320;
  const level = profile?.level ?? 4;
  const nextLevelXp = level * 500;
  const xpPct = Math.min(100, (xp / nextLevelXp) * 100);

  return (
    <div className="pb-8">
      <TopBar title="Profile" back="/home" />

      <section className="mx-5 rounded-[28px] gradient-lavender p-6 text-center shadow-card">
        <AvatarUploader
          userId={profile?.user_id}
          src={avatarSrc}
          onUploaded={() => qc.invalidateQueries({ queryKey: ["profile"] })}
        />
        <div className="mt-3 text-lg font-black">{profile?.display_name ?? "Learner"}</div>
        <div className="text-xs text-muted-foreground">{profile?.email}</div>

        <div className="mt-4 rounded-2xl bg-card/70 p-3 backdrop-blur">
          <div className="flex justify-between text-[11px] font-bold">
            <span>Level {level}</span>
            <span className="text-primary">{xp} / {nextLevelXp} XP</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full gradient-primary" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </section>

      {completion < 100 && (
        <section className="mx-5 mt-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-card">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                {phoneMissing ? <PhoneCall className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black">
                  {phoneMissing ? "Add your phone to unlock AI Calls" : "Complete your profile"}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  Missing: {missing.map((m) => m.label).join(" · ")}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full gradient-primary" style={{ width: `${completion}%` }} />
                </div>
                <div className="mt-1 text-[10px] font-bold text-primary">{completion}% complete</div>
              </div>
              <button
                onClick={() => {
                  setEditing(true);
                  requestAnimationFrame(() =>
                    document.getElementById("personal-details")?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  );
                }}
                className="shrink-0 rounded-full gradient-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-soft active:scale-95"
              >
                Update
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="mx-5 mt-4 grid grid-cols-3 gap-2">
        <StatTile icon={Trophy} v={`L${level}`} l="Level" tint="bg-primary/10 text-primary" />
        <StatTile icon={Flame} v={`${profile?.streak_days ?? 0}`} l="Streak" tint="bg-warning/10 text-warning" />
        <StatTile icon={Zap} v={`${xp}`} l="XP" tint="bg-success/10 text-success" />
      </section>

      <section className="mx-5 mt-4">
        <SectionTitle>Achievements</SectionTitle>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { i: Flame, n: "On Fire", c: "bg-warning/10 text-warning" },
            { i: Star, n: "First 100", c: "bg-primary/10 text-primary" },
            { i: Target, n: "Sharpshot", c: "bg-success/10 text-success" },
            { i: Sparkles, n: "Rising", c: "bg-pink/10 text-pink" },
            { i: Trophy, n: "Champ", c: "bg-blue/10 text-blue" },
          ].map((b) => (
            <div key={b.n} className={`shrink-0 rounded-2xl border border-border bg-card p-3 text-center shadow-card w-20`}>
              <div className={`mx-auto grid h-10 w-10 place-items-center rounded-full ${b.c}`}>
                <b.i className="h-5 w-5" />
              </div>
              <div className="mt-1.5 text-[10px] font-bold">{b.n}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="personal-details" className="mx-5 mt-5 scroll-mt-20">
        <SectionTitle>Personal Details</SectionTitle>
        <PersonalDetailsCard
          profile={profile ?? null}
          editing={editing}
          setEditing={setEditing}
          onSaved={() => qc.invalidateQueries({ queryKey: ["profile"] })}
        />
      </section>

      <section className="mx-5 mt-5">
        <SectionTitle>Preferences</SectionTitle>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
          <ToggleRow icon={Bell} label="Notifications" val={notif} onChange={setNotif} tint="bg-primary/10 text-primary" />
          <ToggleRow icon={Moon} label="Dark Mode" val={darkMode} onChange={setDarkMode} tint="bg-blue/10 text-blue" />
          <RowLink to="/notifications" icon={Bell} label="Notification Center" tint="bg-warning/10 text-warning" />
        </div>
      </section>

      <section className="mx-5 mt-5">
        <SectionTitle>Support</SectionTitle>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
          <RowButton icon={Shield} label="Privacy & Security" tint="bg-success/10 text-success" />
          <RowButton icon={HelpCircle} label="Help Center" tint="bg-blue/10 text-blue" />
        </div>
      </section>

      <button
        onClick={signOut}
        className="mx-5 mt-6 flex h-12 w-[calc(100%-2.5rem)] items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-card text-sm font-bold text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
      <p className="mt-3 text-center text-[10px] text-muted-foreground">Mnemora v1.0 · Made with Sana</p>
    </div>
  );
}

function useResolvedAvatar(path: string | null) {
  const [url, setUrl] = useState<string>(fallbackAvatar);
  useEffect(() => {
    let alive = true;
    if (!path) {
      setUrl(fallbackAvatar);
      return;
    }
    if (/^https?:\/\//i.test(path)) {
      setUrl(path);
      return;
    }
    (async () => {
      const { data } = await supabase.storage.from("user-uploads").createSignedUrl(path, 60 * 60);
      if (alive && data?.signedUrl) setUrl(data.signedUrl);
    })();
    return () => {
      alive = false;
    };
  }, [path]);
  return url;
}

function AvatarUploader({
  userId,
  src,
  onUploaded,
}: {
  userId?: string;
  src: string;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `avatars/${userId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("user-uploads").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: path }).eq("user_id", userId);
    setUploading(false);
    if (dbErr) {
      toast.error(dbErr.message);
      return;
    }
    toast.success("Photo updated");
    onUploaded();
  }

  return (
    <div className="relative inline-block">
      <img src={src} className="h-24 w-24 rounded-full border-4 border-card object-cover shadow-soft" alt="avatar" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || !userId}
        className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full gradient-primary text-primary-foreground shadow-soft active:scale-95 disabled:opacity-60"
        aria-label="Change photo"
      >
        <Camera className="h-4 w-4" />
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {uploading && (
        <div className="absolute inset-0 grid place-items-center rounded-full bg-background/60 text-[10px] font-bold">
          Uploading…
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{children}</div>;
}

function StatTile({ icon: Icon, v, l, tint }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-card">
      <div className={`mx-auto grid h-8 w-8 place-items-center rounded-full ${tint}`}><Icon className="h-4 w-4" /></div>
      <div className="mt-1 text-lg font-black">{v}</div>
      <div className="text-[10px] text-muted-foreground">{l}</div>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, val, onChange, tint }: any) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className={`grid h-9 w-9 place-items-center rounded-full ${tint}`}><Icon className="h-4 w-4" /></div>
      <div className="flex-1 text-sm font-semibold">{label}</div>
      <button
        onClick={() => onChange(!val)}
        className={`relative h-7 w-12 rounded-full transition ${val ? "gradient-primary" : "bg-muted"}`}
        aria-label={label}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${val ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function RowLink({ to, icon: Icon, label, tint }: any) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3.5">
      <div className={`grid h-9 w-9 place-items-center rounded-full ${tint}`}><Icon className="h-4 w-4" /></div>
      <div className="flex-1 text-sm font-semibold">{label}</div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function RowButton({ icon: Icon, label, tint }: any) {
  return (
    <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <div className={`grid h-9 w-9 place-items-center rounded-full ${tint}`}><Icon className="h-4 w-4" /></div>
      <div className="flex-1 text-sm font-semibold">{label}</div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

const GENDER_LABELS: Record<string, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
  prefer_not: "Prefer not to say",
};

function PersonalDetailsCard({
  profile,
  editing,
  setEditing,
  onSaved,
}: {
  profile: ProfileRow | null;
  editing: boolean;
  setEditing: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.display_name ?? "");
    setPhone(profile?.phone_e164 ?? "");
    setGender(profile?.gender ?? "");
    setLocation(profile?.location ?? "");
  }, [profile]);

  async function save() {
    if (!profile) return;
    let phoneE164: string | null = null;
    if (phone.trim()) {
      const r = validatePhone(phone);
      if (!r.ok) {
        toast.error(r.reason);
        return;
      }
      phoneE164 = r.e164;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim() || null,
        phone_e164: phoneE164,
        gender: gender || null,
        location: location.trim() || null,
      })
      .eq("user_id", profile.user_id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    setEditing(false);
    onSaved();
  }

  function cancel() {
    setName(profile?.display_name ?? "");
    setPhone(profile?.phone_e164 ?? "");
    setGender(profile?.gender ?? "");
    setLocation(profile?.location ?? "");
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Your info</div>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary active:scale-95"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
        <DetailRow icon={User} label="Name" value={profile?.display_name ?? "—"} missing={!profile?.display_name} tint="bg-primary/10 text-primary" />
        <DetailRow icon={Mail} label="Email" value={profile?.email ?? "—"} tint="bg-blue/10 text-blue" />
        <DetailRow
          icon={Phone}
          label="Phone"
          value={profile?.phone_e164 ?? "Add for AI Calls"}
          missing={!profile?.phone_e164}
          tint="bg-success/10 text-success"
        />
        <DetailRow
          icon={Users}
          label="Gender"
          value={profile?.gender ? GENDER_LABELS[profile.gender] ?? profile.gender : "—"}
          missing={!profile?.gender}
          tint="bg-pink/10 text-pink"
        />
        <DetailRow
          icon={MapPin}
          label="Location"
          value={profile?.location ?? "—"}
          missing={!profile?.location}
          tint="bg-warning/10 text-warning"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <EditField icon={User} label="Name" value={name} onChange={setName} placeholder="Your name" />
      <EditField
        icon={Phone}
        label="Phone (for AI Calls)"
        value={phone}
        onChange={setPhone}
        placeholder="+1 555 123 4567"
        type="tel"
      />
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink/10 text-pink">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Gender</div>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <EditField icon={MapPin} label="Location" value={location} onChange={setLocation} placeholder="City, Country" />

      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="gradient-primary shadow-soft flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-60"
        >
          <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={cancel}
          disabled={saving}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold"
        >
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  tint,
  missing = false,
}: {
  icon: typeof User;
  label: string;
  value: string;
  tint: string;
  missing?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className={`grid h-9 w-9 place-items-center rounded-full ${tint}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`truncate text-sm font-bold ${missing ? "text-primary" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

function EditField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: typeof User;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}
