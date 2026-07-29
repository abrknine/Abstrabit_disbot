import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchChannels,
  fetchGuilds,
  setMirrorChannel,
  startInstall,
} from "../store/servers-slice";
import type { ConnectedGuild } from "../types";

export const ServersPanel = () => {
  const dispatch = useAppDispatch();
  const { guilds, error } = useAppSelector((s) => s.servers);

  useEffect(() => {
    dispatch(fetchGuilds());
  }, [dispatch]);

  return (
    <div className="max-w-2xl">
      <div className="mb-4 rounded-lg bg-secondary p-4">
        <p className="font-semibold text-heading">Connect a Discord server</p>
        <p className="mb-3 mt-1 text-sm text-muted">
          Opens Discord's authorization screen. Pick a server you manage — the bot is added, slash
          commands are registered, and the server appears below to configure.
        </p>
        <button
          onClick={() => dispatch(startInstall())}
          className="rounded-[3px] bg-blurple px-5 py-2.5 font-medium text-white hover:bg-blurple-dark"
        >
          Add to Discord
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-dred">{error}</p>}

      {guilds.map((guild) => (
        <GuildCard key={guild.guildId} guild={guild} />
      ))}
      {guilds.length === 0 && (
        <p className="p-6 text-center text-muted">No servers connected yet.</p>
      )}
    </div>
  );
};

const GuildCard = ({ guild }: { guild: ConnectedGuild }) => {
  const dispatch = useAppDispatch();
  const channels = useAppSelector((s) => s.servers.channels[guild.guildId]);
  const saving = useAppSelector((s) => s.servers.saving) === guild.guildId;
  const [selected, setSelected] = useState(guild.mirrorChannelId ?? "");

  useEffect(() => {
    dispatch(fetchChannels(guild.guildId));
  }, [dispatch, guild.guildId]);

  const currentChannel = channels?.find((c) => c.id === guild.mirrorChannelId);

  return (
    <div className="mb-3 rounded-lg bg-secondary p-4">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blurple font-bold text-white">
          {guild.name[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="font-semibold text-heading">{guild.name}</p>
          <p className="text-xs text-muted">
            {guild.mirrorWebhookUrl
              ? `Mirroring to #${currentChannel?.name ?? guild.mirrorChannelId}`
              : "Mirror channel not configured — using the global fallback webhook"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 rounded bg-tertiary px-2.5 py-2 text-sm text-normal outline-none"
        >
          <option value="">Pick a channel for mirror notifications…</option>
          {(channels ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => dispatch(setMirrorChannel({ guildId: guild.guildId, channelId: selected }))}
          disabled={!selected || saving || selected === guild.mirrorChannelId}
          className="rounded-[3px] bg-dgreen px-4 py-2 text-sm font-medium text-white hover:bg-[#1a8a4a] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
};
