import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getClassroomConnection, disconnectClassroom } from "@/lib/classroom.functions";
import { getClassroomSyncSummary } from "@/lib/classroom-sync.functions";
import { getClassroomIndexStats } from "@/lib/classroom-index.functions";
import { ClassroomSyncProgress } from "@/components/app/ClassroomSyncProgress";
import {
  RefreshCw, ShieldCheck, LogOut, CheckCircle2, AlertTriangle, Database, Zap, FileStack, Clock, GraduationCap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/classroom/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const getConn = useServerFn(getClassroomConnection);
  const disconnect = useServerFn(disconnectClassroom);
  const getSummary = useServerFn(getClassroomSyncSummary);
  const getIndex = useServerFn(getClassroomIndexStats);
  const [syncOpen, setSyncOpen] = useState(false);

  const { data: conn } = useQuery({
    queryKey: ["classroom-connection"],
    queryFn: () => getConn(),
    staleTime: 30_000,
  });
  const { data: summary } = useQuery({
    queryKey: ["classroom-sync-summary"],
    queryFn: () => getSummary(),
    staleTime: 30_000,
    enabled: !!conn?.connected,
  });
  const { data: index } = useQuery({
    queryKey: ["classroom-index-stats"],
    queryFn: () => getIndex(),
    staleTime: 30_000,
    enabled: !!conn?.connected,
  });

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Classroom? Your synced data stays private and is removed.")) return;
    try {
      await disconnect();
      toast.success("Disconnected");
      qc.invalidateQueries({ queryKey: ["classroom-connection"] });
      qc.invalidateQueries({ queryKey: ["classroom-sync-summary"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't disconnect");
    }
  }

  if (!conn?.connected) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-[12px] text-muted-foreground">
        Not connected. Open the Classroom connector from Chat to sign in.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Account */}
      <section className="rounded-3xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          {conn.picture ? (
            <img src={conn.picture} alt="" className="h-12 w-12 rounded-full" />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black">{conn.name ?? "Connected"}</div>
            <div className="truncate text-[11px] text-muted-foreground">{conn.email}</div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">
            <CheckCircle2 className="h-3 w-3" /> Live
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {conn.last_sync_at
            ? `Last sync ${new Date(conn.last_sync_at).toLocaleString()}`
            : "No sync yet."}
        </div>
        {conn.last_error && (
          <div className="mt-2 flex items-start gap-2 rounded-2xl bg-destructive/10 p-2.5 text-[11px] text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="min-w-0">{conn.last_error}</span>
          </div>
        )}
      </section>

      {/* Automation */}
      <section className="rounded-3xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <Zap className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[13px] font-black">Background sync</h3>
            <p className="text-[11px] text-muted-foreground">Runs every 15 minutes automatically.</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setSyncOpen(true)}
            className="gradient-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold text-white shadow-soft"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Sync now
          </button>
        </div>
      </section>

      {/* Data footprint */}
      <section className="rounded-3xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue/10 text-blue">
            <Database className="h-4 w-4" />
          </span>
          <h3 className="text-[13px] font-black">Your data</h3>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Courses" value={summary?.courses ?? 0} />
          <Stat label="Assignments" value={summary?.coursework ?? 0} />
          <Stat label="Announcements" value={summary?.announcements ?? 0} />
          <Stat label="Materials" value={summary?.materials ?? 0} />
        </dl>
        <div className="mt-3 rounded-2xl bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
            <FileStack className="h-3.5 w-3.5" /> AI index
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            <IndexStat label="Indexed" value={index?.indexed ?? 0} tone="text-success" />
            <IndexStat label="Pending" value={index?.pending ?? 0} tone="text-primary" />
            <IndexStat label="Skipped" value={index?.skipped ?? 0} tone="text-muted-foreground" />
            <IndexStat label="Errors" value={index?.errored ?? 0} tone="text-destructive" />
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">
            {(index?.chunks ?? 0).toLocaleString()} searchable text chunks
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="rounded-3xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-success/10 text-success">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <h3 className="text-[13px] font-black">Privacy</h3>
        </div>
        <ul className="mt-2 space-y-1.5 text-[11.5px] text-muted-foreground">
          <li>· Read-only Google scopes — Sana never modifies your Classroom or Drive.</li>
          <li>· Data is scoped to your account by row-level security.</li>
          <li>· Disconnecting revokes tokens and clears your synced data.</li>
        </ul>
      </section>

      {/* Danger zone */}
      <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-4">
        <h3 className="text-[13px] font-black text-destructive">Disconnect</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Revokes your Google session and clears synced classroom data.
        </p>
        <button
          onClick={handleDisconnect}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-card px-4 py-2 text-[12px] font-bold text-destructive shadow-card hover:bg-destructive/10"
        >
          <LogOut className="h-3.5 w-3.5" /> Disconnect Google Classroom
        </button>
      </section>

      <ClassroomSyncProgress open={syncOpen} onClose={() => setSyncOpen(false)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-3">
      <div className="text-lg font-black leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
function IndexStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className={`text-base font-black leading-none ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
