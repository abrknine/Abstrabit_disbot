import { useAppDispatch, useAppSelector } from "../store";
import { fetchLogs, setCommandFilter } from "../store/logs-slice";

const MIRROR_STYLES: Record<string, { dot: string; label: string }> = {
  sent: { dot: "bg-dgreen", label: "Sent" },
  failed: { dot: "bg-dred", label: "Failed" },
  pending: { dot: "bg-dyellow", label: "Pending" },
  skipped: { dot: "bg-muted", label: "Skipped" },
};

export const LogPanel = () => {
  const dispatch = useAppDispatch();
  const { items, stats, commandFilter, loading } = useAppSelector((s) => s.logs);
  const commands = stats ? Object.keys(stats.byCommand) : [];

  const onFilter = (value: string) => {
    dispatch(setCommandFilter(value));
    dispatch(fetchLogs());
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <StatCard label="Total commands" value={stats?.total ?? 0} />
        {commands.map((c) => (
          <StatCard key={c} label={`/${c}`} value={stats?.byCommand[c] ?? 0} />
        ))}
        <StatCard label="Mirror failures" value={stats?.mirrorFailed ?? 0} danger />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <select
          value={commandFilter}
          onChange={(e) => onFilter(e.target.value)}
          className="rounded bg-tertiary px-2.5 py-2 text-sm text-normal outline-none"
        >
          <option value="all">All commands</option>
          {commands.map((c) => (
            <option key={c} value={c}>
              /{c}
            </option>
          ))}
        </select>
        <button
          onClick={() => dispatch(fetchLogs())}
          className="rounded bg-selected px-3.5 py-2 text-sm text-normal hover:bg-[#4e5058]"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        <span className="text-xs text-muted">auto-refreshes every 10s</span>
      </div>

      <div className="overflow-hidden rounded-lg bg-secondary">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-tertiary text-left text-xs font-bold uppercase text-muted">
              <th className="px-3 py-2.5">User</th>
              <th className="px-3 py-2.5">Command</th>
              <th className="px-3 py-2.5">Arguments</th>
              <th className="px-3 py-2.5">Mirror</th>
              <th className="px-3 py-2.5">Time</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const mirror = MIRROR_STYLES[row.mirrorStatus] ?? MIRROR_STYLES.pending;
              return (
                <tr key={row.interactionId} className="border-t border-black/20 text-sm hover:bg-hover">
                  <td className="px-3 py-2.5 text-heading">{row.username}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-tertiary px-1.5 py-0.5 text-[13px] font-semibold text-dlink">
                      /{row.command}
                    </span>
                  </td>
                  <td className="max-w-[300px] truncate px-3 py-2.5 text-normal">
                    {Object.entries(row.options)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2.5" title={row.mirrorError ?? undefined}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${mirror.dot}`} />
                      {mirror.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted">
                  No commands logged yet. Run /report or /status in Discord.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, danger }: { label: string; value: number; danger?: boolean }) => (
  <div className="min-w-[140px] rounded-lg bg-secondary px-5 py-3">
    <p className={`text-2xl font-bold ${danger && value > 0 ? "text-dred" : "text-heading"}`}>
      {value}
    </p>
    <p className="text-xs font-bold uppercase text-muted">{label}</p>
  </div>
);
