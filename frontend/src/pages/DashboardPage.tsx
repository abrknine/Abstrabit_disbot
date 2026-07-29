import { useEffect, useState } from "react";
import { ChannelSidebar } from "../components/ChannelSidebar";
import { LogPanel } from "../components/LogPanel";
import { ServerRail } from "../components/ServerRail";
import { ServersPanel } from "../components/ServersPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { useAppDispatch } from "../store";
import { fetchConfig } from "../store/config-slice";
import { fetchLogs, fetchStats } from "../store/logs-slice";

export type Tab = "command-log" | "servers" | "settings";

const POLL_MS = 10_000;

export const DashboardPage = () => {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<Tab>("command-log");

  useEffect(() => {
    dispatch(fetchLogs());
    dispatch(fetchStats());
    dispatch(fetchConfig());
    const timer = setInterval(() => {
      dispatch(fetchLogs());
      dispatch(fetchStats());
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [dispatch]);

  const topic =
    tab === "command-log"
      ? "Live log of every slash command and action taken"
      : tab === "servers"
        ? "Connect Discord servers and pick their mirror channels"
        : "Configure how each command behaves";

  return (
    <div className="flex h-screen overflow-hidden">
      <ServerRail />
      <ChannelSidebar tab={tab} onSelect={setTab} />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 px-4 shadow-[0_1px_0_rgba(0,0,0,0.24)]">
          <span className="text-2xl text-muted">#</span>
          <span className="font-semibold text-heading">{tab}</span>
          <span className="ml-2 border-l border-selected pl-4 text-sm text-muted">{topic}</span>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "command-log" && <LogPanel />}
          {tab === "servers" && <ServersPanel />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </main>
    </div>
  );
};
