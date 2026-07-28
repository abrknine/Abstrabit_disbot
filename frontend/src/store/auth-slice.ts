import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api, getToken, setToken } from "../api/client";

interface AuthState {
  email: string | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  email: null,
  authenticated: !!getToken(),
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  "auth/login",
  async (creds: { email: string; password: string }) => {
    const data = await api<{ token: string; email: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(creds),
    });
    setToken(data.token);
    return data.email;
  }
);

export const restoreSession = createAsyncThunk("auth/restore", async () => {
  const data = await api<{ email: string }>("/auth/me");
  return data.email;
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      setToken(null);
      state.email = null;
      state.authenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.authenticated = true;
        state.email = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Login failed";
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.email = action.payload;
      })
      .addCase(restoreSession.rejected, (state) => {
        setToken(null);
        state.authenticated = false;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
