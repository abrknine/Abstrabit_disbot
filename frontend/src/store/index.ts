import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import authReducer from "./auth-slice";
import configReducer from "./config-slice";
import logsReducer from "./logs-slice";
import serversReducer from "./servers-slice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    logs: logsReducer,
    config: configReducer,
    servers: serversReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
