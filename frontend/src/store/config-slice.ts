import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";
import type { CommandConfig } from "../types";

interface ConfigState {
  items: CommandConfig[];
  saving: string | null;
  error: string | null;
}

const initialState: ConfigState = { items: [], saving: null, error: null };

export const fetchConfig = createAsyncThunk("config/fetch", async () =>
  api<CommandConfig[]>("/config")
);

export const saveConfig = createAsyncThunk(
  "config/save",
  async (config: Omit<CommandConfig, "updatedAt">) =>
    api<CommandConfig>(`/config/${config.command}`, {
      method: "PUT",
      body: JSON.stringify({
        enabled: config.enabled,
        mirrorEnabled: config.mirrorEnabled,
        replyTemplate: config.replyTemplate,
      }),
    })
);

const configSlice = createSlice({
  name: "config",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchConfig.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(saveConfig.pending, (state, action) => {
        state.saving = action.meta.arg.command;
        state.error = null;
      })
      .addCase(saveConfig.fulfilled, (state, action) => {
        state.saving = null;
        state.items = state.items.map((c) =>
          c.command === action.payload.command ? action.payload : c
        );
      })
      .addCase(saveConfig.rejected, (state, action) => {
        state.saving = null;
        state.error = action.error.message ?? "Save failed";
      });
  },
});

export default configSlice.reducer;
