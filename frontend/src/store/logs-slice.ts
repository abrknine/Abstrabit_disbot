import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "../api/client";
import type { Interaction, Stats } from "../types";

interface LogsState {
  items: Interaction[];
  stats: Stats | null;
  commandFilter: string;
  statusFilter: string;
  loading: boolean;
}

const initialState: LogsState = {
  items: [],
  stats: null,
  commandFilter: "all",
  statusFilter: "all",
  loading: false,
};

export const fetchLogs = createAsyncThunk<Interaction[], void, { state: { logs: LogsState } }>(
  "logs/fetch",
  async (_, { getState }) => {
    const { commandFilter, statusFilter } = getState().logs;
    const query =
      (commandFilter === "all" ? "" : `&command=${commandFilter}`) +
      (statusFilter === "all" ? "" : `&status=${statusFilter}`);
    return api<Interaction[]>(`/interactions?limit=100${query}`);
  }
);

export const fetchStats = createAsyncThunk("logs/stats", async () => api<Stats>("/stats"));

const logsSlice = createSlice({
  name: "logs",
  initialState,
  reducers: {
    setCommandFilter: (state, action: PayloadAction<string>) => {
      state.commandFilter = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.statusFilter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLogs.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchLogs.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { setCommandFilter, setStatusFilter } = logsSlice.actions;
export default logsSlice.reducer;
