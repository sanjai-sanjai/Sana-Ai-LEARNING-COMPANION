import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/app/TopBar";
import { TrendingUp, TrendingDown, X, Sparkles, Target, Flame, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Focus Time", "Topics", "Trends", "Insights"] as const;
const RANGES = ["Today", "Week", "Month"] as const;
type Tab = typeof TABS[number];
type Range = typeof RANGES[number];

type AnalyticsSearch = { tab: Tab; range: Range };

export const Route = createFileRoute("/_authenticated/analytics")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AnalyticsSearch => ({
    tab: (TABS as readonly string[]).includes(search.tab as string) ? (search.tab as Tab) : "Overview",
    range: (RANGES as readonly string[]).includes(search.range as string) ? (search.range as Range) : "Week",
  }),
  head: () => ({
    meta: [
      { title: "Analytics — Sana" },
      { name: "description", content: "Track your focus time, sessions, and top topics." },
    ],
  }),
  component: AnalyticsPage,
});


const PURPLE = "oklch(0.58 0.22 285)";
const PURPLE_SOFT = "oklch(0.58 0.22 285 / 0.18)";

/* ---------- data (mock, keyed by range) ---------- */

const focusBars: Record<Range, { d: string; h: number; label: string }[]> = {
  Today: [
    { d: "6a", h: 0.5, label: "30m" }, { d: "9a", h: 1.25, label: "1h 15m" },
    { d: "12p", h: 0.75, label: "45m" }, { d: "3p", h: 0, label: "0" },
    { d: "6p", h: 0.25, label: "15m" }, { d: "9p", h: 0, label: "0" },
  ],
  Week: [
    { d: "Mon", h: 1.5, label: "1h 30m" }, { d: "Tue", h: 3.0, label: "3h" },
    { d: "Wed", h: 3.75, label: "3h 45m" }, { d: "Thu", h: 2.5, label: "2h 30m" },
    { d: "Fri", h: 2.75, label: "2h 45m" }, { d: "Sat", h: 1.25, label: "1h 15m" },
    { d: "Sun", h: 2.5, label: "2h 30m" },
  ],
  Month: [
    { d: "W1", h: 12, label: "12h" }, { d: "W2", h: 15.5, label: "15h 30m" },
    { d: "W3", h: 18, label: "18h" }, { d: "W4", h: 14.5, label: "14h 30m" },
  ],
};

const totals: Record<Range, { primary: string; label: string; delta?: string; deltaUp?: boolean }> = {
  Today: { primary: "2h 45m", label: "Total Focus Time", delta: "+18% vs yesterday", deltaUp: true },
  Week: { primary: "14h 30m", label: "vs last week", delta: "↑ 23%", deltaUp: true },
  Month: { primary: "60h 00m", label: "vs last month", delta: "↑ 12%", deltaUp: true },
};

const categories = [
  { name: "Python", pct: 60, color: "oklch(0.58 0.22 285)", time: "8h 20m", sessions: 12 },
  { name: "DSA", pct: 25, color: "oklch(0.68 0.19 245)", time: "4h 00m", sessions: 6 },
  { name: "Web Dev", pct: 10, color: "oklch(0.82 0.18 85)", time: "2h 10m", sessions: 3 },
  { name: "Other", pct: 5, color: "oklch(0.72 0.14 190)", time: "1h 00m", sessions: 2 },
];

const topics = [
  { name: "Python Programming", time: "8h 20m", pct: 92, icon: "🐍", bg: "bg-yellow-400/20", sessions: 12, streak: 7 },
  { name: "Data Structures & Algorithms", time: "4h 00m", pct: 48, icon: "🧩", bg: "bg-emerald-500/15", sessions: 6, streak: 4 },
  { name: "Web Development", time: "2h 10m", pct: 26, icon: "🌐", bg: "bg-blue/15", sessions: 3, streak: 2 },
  { name: "Other Topics", time: "1h 00m", pct: 12, icon: "💬", bg: "bg-muted", sessions: 2, streak: 1 },
];

const insights = [
  { icon: <Flame className="h-4 w-4" />, tone: "bg-warning/15 text-warning", title: "12-day streak", body: "You've studied every day for 12 days. Keep the momentum going!" },
  { icon: <Target className="h-4 w-4" />, tone: "bg-primary/15 text-primary", title: "Peak focus at 10 AM", body: "Your best sessions happen mid-morning. Schedule hard tasks then." },
  { icon: <TrendingUp className="h-4 w-4" />, tone: "bg-success/15 text-success", title: "23% more focus this week", body: "You beat last week by 2h 45m. Great pacing." },
  { icon: <Sparkles className="h-4 w-4" />, tone: "bg-lavender text-primary", title: "Try a Web Dev session", body: "You're 40% below your Web Dev goal — a short session helps." },
];

/* ---------- page ---------- */

function AnalyticsPage() {
  const { tab, range } = Route.useSearch();
  const nav = useNavigate({ from: "/analytics" });
  const [drill, setDrill] = useState<null | { title: string; body: React.ReactNode }>(null);

  const setTab = (t: Tab) => nav({ search: (p: AnalyticsSearch) => ({ ...p, tab: t }) });
  const setRange = (r: Range) => nav({ search: (p: AnalyticsSearch) => ({ ...p, range: r }) });

  const bars = focusBars[range as Range];
  const total = totals[range as Range];


  return (
    <div className="pb-8">
      <TopBar title="Analytics" subtitle="Track your progress. Improve every day." />

      {/* Range filter */}
      <section className="mx-5 mt-1">
        <div className="inline-flex rounded-full border border-border bg-card p-1 text-xs font-bold shadow-card">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-4 py-1.5 transition",
                range === r ? "gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <section className="mx-5 mt-3">
        <div className="shadow-card overflow-x-auto rounded-2xl border border-border bg-card p-1">
          <div className="flex min-w-max items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-bold transition sm:px-4",
                  tab === t ? "gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {tab === "Overview" && (
        <>
          <FocusCard title="Focus Time" subtitle={`(${range})`} total={total} bars={bars} onBar={(b) => setDrill({
            title: `Focus — ${b.d}`,
            body: <DrillList rows={[
              { k: "Time", v: b.label },
              { k: "Sessions", v: String(Math.max(1, Math.round(b.h * 2))) },
              { k: "Top topic", v: "Python Programming" },
            ]} />,
          })} />

          <section className="mx-5 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CategoryDonutCard onSeg={(c) => setDrill({
              title: c.name,
              body: <DrillList rows={[
                { k: "Focus", v: c.time }, { k: "Sessions", v: String(c.sessions) }, { k: "Share", v: `${c.pct}%` },
              ]} />,
            })} />
            <SessionsCard onSlice={(label, value) => setDrill({
              title: `Sessions — ${label}`,
              body: <DrillList rows={[{ k: "Count", v: String(value) }, { k: "Range", v: range }]} />,
            })} />
          </section>

          <TopicsCard onTopic={(t) => setDrill({
            title: t.name,
            body: <DrillList rows={[
              { k: "Focus", v: t.time }, { k: "Sessions", v: String(t.sessions) }, { k: "Streak", v: `${t.streak} days` },
            ]} />,
          })} />
        </>
      )}

      {tab === "Focus Time" && (
        <>
          <FocusCard title="Focus Time" subtitle={`(${range})`} total={total} bars={bars} onBar={(b) => setDrill({
            title: `Focus — ${b.d}`,
            body: <DrillList rows={[{ k: "Time", v: b.label }, { k: "Sessions", v: String(Math.max(1, Math.round(b.h * 2))) }]} />,
          })} />
          <StatsGrid range={range} />
        </>
      )}

      {tab === "Topics" && (
        <>
          <section className="mx-5 mt-4 rounded-[24px] border border-border bg-card p-4 shadow-card">
            <div className="text-sm font-bold">Focus by Category</div>
            <div className="mt-3">
              <DonutChart data={categories} centerTop="2h 45m" centerBottom="Total" />
            </div>
          </section>
          <TopicsCard expanded onTopic={(t) => setDrill({
            title: t.name,
            body: <DrillList rows={[
              { k: "Focus", v: t.time }, { k: "Sessions", v: String(t.sessions) }, { k: "Streak", v: `${t.streak} days` },
            ]} />,
          })} />
        </>
      )}

      {tab === "Trends" && (
        <>
          <section className="mx-5 mt-4 rounded-[24px] border border-border bg-card p-4 shadow-card">
            <div className="text-sm font-bold">
              Focus Time <span className="font-semibold text-muted-foreground">({range})</span>
            </div>
            <div className="mt-3 grid grid-cols-[minmax(0,110px)_minmax(0,1fr)] items-center gap-3">
              <div className="min-w-0">
                <div className="text-2xl font-black leading-none text-primary sm:text-3xl">{total.primary}</div>
                <div className="mt-2 text-[11px] font-semibold text-muted-foreground">
                  {total.label}{total.delta && <span className={cn("ml-1", total.deltaUp ? "text-success" : "text-destructive")}>{total.delta}</span>}
                </div>
              </div>
              <LineChart data={focusBars.Week} onPoint={(p) => setDrill({
                title: `${p.d} — ${p.label}`,
                body: <DrillList rows={[{ k: "Focus", v: p.label }, { k: "Range", v: range }]} />,
              })} />
            </div>
          </section>
          <ComparisonCard />
        </>
      )}

      {tab === "Insights" && (
        <section className="mx-5 mt-4 space-y-2">
          {insights.map((it) => (
            <div key={it.title} className="shadow-card flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
              <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", it.tone)}>{it.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{it.title}</div>
                <p className="text-[12px] leading-snug text-muted-foreground">{it.body}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {drill && <DrillSheet title={drill.title} onClose={() => setDrill(null)}>{drill.body}</DrillSheet>}
    </div>
  );
}

/* ---------- cards ---------- */

function FocusCard({
  title, subtitle, total, bars, onBar,
}: {
  title: string; subtitle: string;
  total: { primary: string; label: string; delta?: string; deltaUp?: boolean };
  bars: { d: string; h: number; label: string }[];
  onBar: (b: { d: string; h: number; label: string }) => void;
}) {
  return (
    <section className="mx-5 mt-4 rounded-[24px] border border-border bg-card p-4 shadow-card">
      <div className="text-sm font-bold">
        {title} <span className="font-semibold text-muted-foreground">{subtitle}</span>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,110px)_minmax(0,1fr)] items-end gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-black leading-none text-primary sm:text-3xl">{total.primary}</div>
          <div className="mt-2 text-[11px] font-semibold text-muted-foreground">
            {total.label}
            {total.delta && (
              <span className={cn("ml-1 inline-flex items-center gap-0.5", total.deltaUp ? "text-success" : "text-destructive")}>
                {total.deltaUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {total.delta}
              </span>
            )}
          </div>
        </div>
        <BarsChart data={bars} onBar={onBar} />
      </div>
    </section>
  );
}

function CategoryDonutCard({ onSeg }: { onSeg: (c: typeof categories[number]) => void }) {
  return (
    <div className="shadow-card rounded-[20px] border border-border bg-card p-3">
      <div className="text-[13px] font-bold">Focus Time by Category</div>
      <div className="mt-2 flex items-center gap-2">
        <DonutChart data={categories} centerTop="2h 45m" centerBottom="Total" onSeg={onSeg} />
        <ul className="min-w-0 flex-1 space-y-1 text-[11px]">
          {categories.map((c) => (
            <li key={c.name}>
              <button onClick={() => onSeg(c)} className="flex w-full items-center justify-between gap-1">
                <span className="inline-flex min-w-0 items-center gap-1">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="truncate font-semibold">{c.name}</span>
                </span>
                <span className="font-bold">{c.pct}%</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SessionsCard({ onSlice }: { onSlice: (label: string, value: number) => void }) {
  const rows = [
    { color: "oklch(0.58 0.22 285)", label: "Completed", value: 3 },
    { color: "oklch(0.68 0.19 245)", label: "Interrupted", value: 0 },
    { color: "oklch(0.82 0.18 85)", label: "Skipped", value: 0 },
  ];
  return (
    <div className="shadow-card rounded-[20px] border border-border bg-card p-3">
      <div className="text-[13px] font-bold">Sessions <span className="font-semibold text-muted-foreground">(Today)</span></div>
      <div className="mt-2 flex items-center gap-2">
        <SessionsRing value={3} total={3} />
        <ul className="min-w-0 flex-1 space-y-1 text-[11px]">
          {rows.map((r) => (
            <li key={r.label}>
              <button onClick={() => onSlice(r.label, r.value)} className="flex w-full items-center justify-between gap-1">
                <span className="inline-flex min-w-0 items-center gap-1">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="truncate font-semibold">{r.label}</span>
                </span>
                <span className="font-bold">{r.value}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TopicsCard({ expanded, onTopic }: { expanded?: boolean; onTopic: (t: typeof topics[number]) => void }) {
  return (
    <section className="mx-5 mt-4 rounded-[24px] border border-border bg-card p-4 shadow-card">
      <div className="text-sm font-bold">
        Top Focus Topics <span className="font-semibold text-muted-foreground">(This Week)</span>
      </div>
      <ul className="mt-3 space-y-3">
        {topics.map((t) => (
          <li key={t.name}>
            <button onClick={() => onTopic(t)} className="flex w-full items-center gap-3 text-left">
              <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg", t.bg)}>{t.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold">{t.name}</div>
                  <div className="shrink-0 text-xs font-bold">{t.time}</div>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="gradient-primary h-full rounded-full" style={{ width: `${t.pct}%` }} />
                </div>
                {expanded && (
                  <div className="mt-1 text-[10px] text-muted-foreground">{t.sessions} sessions · {t.streak}-day streak</div>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatsGrid({ range }: { range: Range }) {
  const items = useMemo(() => {
    const base = {
      Today: [
        { icon: "⏱️", label: "Focus", value: "2h 45m", tone: "bg-primary/10 text-primary" },
        { icon: "🍅", label: "Sessions", value: "3", tone: "bg-destructive/10 text-destructive" },
        { icon: "🎯", label: "Goal", value: "82%", tone: "bg-success/10 text-success" },
        { icon: "⚡", label: "Peak", value: "10 AM", tone: "bg-warning/10 text-warning" },
      ],
      Week: [
        { icon: "⏱️", label: "Focus", value: "14h 30m", tone: "bg-primary/10 text-primary" },
        { icon: "🍅", label: "Sessions", value: "23", tone: "bg-destructive/10 text-destructive" },
        { icon: "🎯", label: "Goal", value: "91%", tone: "bg-success/10 text-success" },
        { icon: "🔥", label: "Streak", value: "12d", tone: "bg-warning/10 text-warning" },
      ],
      Month: [
        { icon: "⏱️", label: "Focus", value: "60h", tone: "bg-primary/10 text-primary" },
        { icon: "🍅", label: "Sessions", value: "92", tone: "bg-destructive/10 text-destructive" },
        { icon: "🎯", label: "Goal", value: "88%", tone: "bg-success/10 text-success" },
        { icon: "📈", label: "Growth", value: "+12%", tone: "bg-success/10 text-success" },
      ],
    } as const;
    return base[range];
  }, [range]);

  return (
    <section className="mx-5 mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="rounded-2xl border border-border bg-card p-3 text-center shadow-card">
          <div className={cn("mx-auto grid h-8 w-8 place-items-center rounded-full", s.tone)}>{s.icon}</div>
          <div className="mt-1 text-[10px] font-semibold text-muted-foreground">{s.label}</div>
          <div className="text-sm font-black">{s.value}</div>
        </div>
      ))}
    </section>
  );
}

function ComparisonCard() {
  const rows = [
    { label: "This week", value: "14h 30m", pct: 100 },
    { label: "Last week", value: "11h 45m", pct: 81 },
    { label: "2 weeks ago", value: "9h 20m", pct: 64 },
    { label: "3 weeks ago", value: "12h 10m", pct: 84 },
  ];
  return (
    <section className="mx-5 mt-4 rounded-[24px] border border-border bg-card p-4 shadow-card">
      <div className="text-sm font-bold">Week over week</div>
      <ul className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-bold">{r.value}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="gradient-primary h-full rounded-full" style={{ width: `${r.pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- charts ---------- */

function BarsChart({ data, onBar }: { data: { d: string; h: number; label: string }[]; onBar: (b: { d: string; h: number; label: string }) => void }) {
  const w = 240, h = 130, padL = 4, padR = 22, padT = 4, padB = 18;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  const max = Math.max(4, ...data.map(d => d.h));
  const gap = chartW / data.length;
  const barW = gap * 0.55;
  const grid = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id="bar-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.66 0.22 285)" />
          <stop offset="1" stopColor="oklch(0.58 0.22 285)" />
        </linearGradient>
      </defs>
      {Array.from({ length: grid + 1 }, (_, i) => {
        const v = (max / grid) * (grid - i);
        const y = padT + (chartH * i) / grid;
        return (
          <g key={i}>
            <line x1={padL} x2={padL + chartW} y1={y} y2={y} stroke="oklch(0.9 0 0)" strokeDasharray="2 3" />
            <text x={w - padR + 3} y={y + 3} fontSize={7} fill="currentColor" className="text-muted-foreground">{Math.round(v)}h</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const bh = (d.h / max) * chartH;
        const x = padL + i * gap + (gap - barW) / 2;
        const y = padT + chartH - bh;
        return (
          <g key={d.d + i} className="cursor-pointer" onClick={() => onBar(d)}>
            <rect x={x} y={y} width={barW} height={Math.max(bh, 1)} rx={3} fill="url(#bar-g)" />
            <rect x={x - 2} y={padT} width={barW + 4} height={chartH} fill="transparent" />
            <text x={x + barW / 2} y={padT + chartH + 12} textAnchor="middle" fontSize={8} fill="currentColor" className="text-muted-foreground">{d.d}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data, onPoint }: { data: { d: string; h: number; label: string }[]; onPoint: (p: { d: string; h: number; label: string }) => void }) {
  const w = 240, h = 130, padL = 6, padR = 6, padT = 22, padB = 18;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  const max = Math.max(4, ...data.map(d => d.h));
  const step = chartW / (data.length - 1);
  const points = data.map((d, i) => ({ x: padL + i * step, y: padT + chartH - (d.h / max) * chartH, ...d }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id="area-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PURPLE_SOFT} />
          <stop offset="1" stopColor="oklch(0.58 0.22 285 / 0)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#area-g)" />
      <path d={line} fill="none" stroke={PURPLE} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p) => (
        <g key={p.d} className="cursor-pointer" onClick={() => onPoint(p)}>
          <circle cx={p.x} cy={p.y} r={3} fill="white" stroke={PURPLE} strokeWidth={1.4} />
          <circle cx={p.x} cy={p.y} r={8} fill="transparent" />
          <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize={6.5} fill={PURPLE} fontWeight={700}>{p.label}</text>
          <text x={p.x} y={padT + chartH + 12} textAnchor="middle" fontSize={7.5} fill="currentColor" className="text-muted-foreground">{p.d}</text>
        </g>
      ))}
    </svg>
  );
}

function DonutChart({
  data, centerTop, centerBottom, onSeg,
}: { data: typeof categories; centerTop: string; centerBottom: string; onSeg?: (c: typeof categories[number]) => void }) {
  const size = 108, stroke = 16, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        {data.map((seg) => {
          const len = (seg.pct / 100) * c;
          const el = (
            <circle
              key={seg.name} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
              className={onSeg ? "cursor-pointer" : undefined}
              onClick={() => onSeg?.(seg)}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-tight">
        <div>
          <div className="text-[12px] font-black">{centerTop}</div>
          <div className="text-[8px] text-muted-foreground">{centerBottom}</div>
        </div>
      </div>
    </div>
  );
}

function SessionsRing({ value, total }: { value: number; total: number }) {
  const size = 96, stroke = 8, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : value / total;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(0.92 0 0)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={PURPLE} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-tight">
        <div>
          <div className="text-lg font-black">{value}</div>
          <div className="text-[9px] text-muted-foreground">Sessions</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- drill sheet ---------- */

function DrillSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-border bg-card p-4 shadow-card sm:mb-4 sm:rounded-3xl"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted" />
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-bold">
            <Clock className="h-4 w-4 text-primary" /> {title}
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function DrillList({ rows }: { rows: { k: string; v: string }[] }) {
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border">
      {rows.map((r) => (
        <li key={r.k} className="flex items-center justify-between px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">{r.k}</span>
          <span className="font-bold">{r.v}</span>
        </li>
      ))}
    </ul>
  );
}
