import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";
import type { ConnectedGuild, GuildChannel } from "../types";

interface ServersState {
  guilds: ConnectedGuild[];
  channels: Record<string, GuildChannel[]>;
  saving: string | null;
  error: string | null;
}

const initialState: ServersState = { guilds: [], channels: {}, saving: null, error: null };

export const fetchGuilds = createAsyncThunk("servers/fetch", async () =>
  api<ConnectedGuild[]>("/discord/guilds")
);

export const fetchChannels = createAsyncThunk("servers/channels", async (guildId: string) => ({
  guildId,
  channels: await api<GuildChannel[]>(`/discord/guilds/${guildId}/channels`),
}));

export const setMirrorChannel = createAsyncThunk(
  "servers/setMirror",
  async ({ guildId, channelId }: { guildId: string; channelId: string }) =>
    api<ConnectedGuild>(`/discord/guilds/${guildId}/mirror-channel`, {
      method: "PUT",
      body: JSON.stringify({ channelId }),
    })
);

export const startInstall = createAsyncThunk("servers/install", async () => {
  const { url } = await api<{ url: string }>("/discord/install-url");
  window.location.href = url;
});

const serversSlice = createSlice({
  name: "servers",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGuilds.fulfilled, (state, action) => {
        state.guilds = action.payload;
      })
      .addCase(fetchChannels.fulfilled, (state, action) => {
        state.channels[action.payload.guildId] = action.payload.channels;
      })
      .addCase(setMirrorChannel.pending, (state, action) => {
        state.saving = action.meta.arg.guildId;
        state.error = null;
      })
      .addCase(setMirrorChannel.fulfilled, (state, action) => {
        state.saving = null;
        state.guilds = state.guilds.map((g) =>
          g.guildId === action.payload.guildId ? action.payload : g
        );
      })
      .addCase(setMirrorChannel.rejected, (state, action) => {
        state.saving = null;
        state.error = action.error.message ?? "Failed to set channel";
      })
      .addCase(startInstall.rejected, (state, action) => {
        state.error = action.error.message ?? "Could not start the install flow";
      });
  },
});

export default serversSlice.reducer;
