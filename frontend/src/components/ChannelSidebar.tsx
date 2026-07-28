import { useAppDispatch, useAppSelector } from "../store";
import { logout } from "../store/auth-slice";
import type { Tab } from "../pages/DashboardPage";

const TABS: Tab[] = ["command-log", "settings"];

export const ChannelSidebar = ({ tab, onSelect }: { tab: Tab; onSelect: (t: Tab) => void }) => {
  const dispatch = useAppDispatch();
  const email = useAppSelector((s) => s.auth.email);

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-secondary">
      <div className="flex h-12 items-center px-4 font-semibold text-heading shadow-[0_1px_0_rgba(0,0,0,0.24)]">
        Abstrabit Admin
      </div>

      <nav className="flex-1 p-2">
        <p className="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted">
          Admin channels
        </p>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left ${
              tab === t
                ? "bg-selected text-white"
                : "text-muted hover:bg-hover hover:text-normal"
            }`}
          >
            <span className="font-normal text-muted">#</span> {t}
          </button>
        ))}
      </nav>

      <div className="flex h-[52px] items-center gap-2 bg-floating px-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dgreen text-sm font-bold text-white">
          {(email ?? "A")[0].toUpperCase()}
        </div>
        <span className="flex-1 truncate text-[13px] text-heading">{email ?? "admin"}</span>
        <button
          onClick={() => dispatch(logout())}
          className="rounded px-1.5 py-1 text-[13px] text-muted hover:bg-hover hover:text-dred"
        >
          Log out
        </button>
      </div>
    </aside>
  );
};
