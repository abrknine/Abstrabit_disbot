import { useAppDispatch, useAppSelector } from "../store";
import { fetchLogs, setCommandFilter, setStatusFilter } from "../store/logs-slice";
import type { Interaction } from "../types";

const MIRROR_STYLES: Record<string, { dot: string; label: string }> = {
  sent: { dot: "bg-dgreen", label: "Sent" },
  failed: { dot: "bg-dred", label: "Failed" },
  pending: { dot: "bg-dyellow", label: "Pending" },
  skipped: { dot: "bg-muted", label: "Skipped" },
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-dgreen/20 text-dgreen",
  in_progress: "bg-dlink/20 text-dlink",
  resolved: "bg-selected text-muted",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "text-dred",
  medium: "text-dyellow",
  low: "text-dgreen",
};

const selectClass = "rounded bg-tertiary px-2.5 py-2 text-sm text-normal outline-none";

export const LogPanel = () => {
  const dispatch = useAppDispatch();
  const { items, stats, commandFilter, statusFilter, loading } = useAppSelector((s) => s.logs);
  const commands = stats ? Object.keys(stats.byCommand) : [];

  const refetch = () => dispatch(fetchLogs());

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <StatCard label="Total commands" value={stats?.total ?? 0} />
        <StatCard label="Open tickets" value={stats?.openTickets ?? 0} />
        <StatCard label="High priority open" value={stats?.highPriorityOpen ?? 0} danger />
        <StatCard label="In progress" value={stats?.inProgress ?? 0} />
        <StatCard label="Mirror failures" value={stats?.mirrorFailed ?? 0} danger />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <select
          value={commandFilter}
          onChange={(e) => { dispatch(setCommandFilter(e.target.value)); refetch(); }}
          className={selectClass}
        >
          <option value="all">All commands</option>
          {commands.map((c) => (
            <option key={c} value={c}>/{c}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { dispatch(setStatusFilter(e.target.value)); refetch(); }}
          className={selectClass}
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <button
          onClick={refetch}
          className="rounded bg-selected px-3.5 py-2 text-sm text-normal hover:bg-[#4e5058]"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        <span className="text-xs text-muted">auto-refreshes every 10s</span>
      </div>

      <div className="overflow-x-auto rounded-lg bg-secondary">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-tertiary text-left text-xs font-bold uppercase text-muted">
              <th className="px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">User</th>
              <th className="px-3 py-2.5">Command</th>
              <th className="px-3 py-2.5">Details</th>
              <th className="px-3 py-2.5">AI triage</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Mirror</th>
              <th className="px-3 py-2.5">Time</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <LogRow key={row.interactionId} row={row} />
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="p-10 text-center text-muted">
                  Nothing here yet. Run /report or /status in Discord.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LogRow = ({ row }: { row: Interaction }) => {
  const mirror = MIRROR_STYLES[row.mirrorStatus] ?? MIRROR_STYLES.pending;
  const title = String(row.options.title ?? "");
  const detail =
    title ||
    Object.entries(row.options).map(([k, v]) => `${k}: ${String(v)}`).join(", ") ||
    "—";

  return (
    <tr className="border-t border-black/20 text-sm hover:bg-hover">
      <td className="px-3 py-2.5 text-muted">{row.status === "n/a" ? "—" : row.id}</td>
      <td className="px-3 py-2.5 text-heading">{row.username}</td>
      <td className="px-3 py-2.5">
        <span className="rounded bg-tertiary px-1.5 py-0.5 text-[13px] font-semibold text-dlink">
          /{row.command}
        </span>
      </td>
      <td className="max-w-[260px] truncate px-3 py-2.5 text-normal" title={String(row.options.description ?? "")}>
        {detail}
      </td>
      <td className="max-w-[260px] px-3 py-2.5">
        {row.aiCategory ? (
          <span title={row.aiSummary ?? undefined}>
            <span className={`font-semibold ${PRIORITY_STYLES[row.aiPriority ?? ""] ?? "text-muted"}`}>
              {row.aiPriority}
            </span>
            <span className="text-muted"> · {row.aiCategory}</span>
            {row.aiSummary && <span className="block truncate text-xs text-muted">{row.aiSummary}</span>}
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {row.status === "n/a" ? (
          <span className="text-muted">—</span>
        ) : (
          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[row.status] ?? ""}`}>
            {row.status.replace("_", " ")}
            {row.claimedBy ? ` · ${row.claimedBy}` : ""}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5" title={row.mirrorError ?? undefined}>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${mirror.dot}`} />
          {mirror.label}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-muted">
        {new Date(row.createdAt).toLocaleString()}
      </td>
    </tr>
  );
};

const StatCard = ({ label, value, danger }: { label: string; value: number; danger?: boolean }) => (
  <div className="min-w-[130px] rounded-lg bg-secondary px-5 py-3">
    <p className={`text-2xl font-bold ${danger && value > 0 ? "text-dred" : "text-heading"}`}>
      {value}
    </p>
    <p className="text-xs font-bold uppercase text-muted">{label}</p>
  </div>
);
