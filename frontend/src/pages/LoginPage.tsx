import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import { login } from "../store/auth-slice";

const inputClass =
  "w-full rounded-[3px] bg-tertiary p-2.5 text-normal outline-none";

export const LoginPage = () => {
  const dispatch = useAppDispatch();
  const { authenticated, loading, error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (authenticated) return <Navigate to="/" replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    dispatch(login({ email, password }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blurple via-[#414eda] to-[#3442d9]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[480px] rounded-[5px] bg-primary p-8 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
      >
        <h1 className="text-center text-2xl font-semibold text-heading">Welcome back!</h1>
        <p className="mb-5 mt-2 text-center text-label">
          We're so excited to see you again!
        </p>

        <div className="mb-5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-label">
            Email <span className="text-dred">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
            autoFocus
          />
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-label">
            Password <span className="text-dred">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        {error && <p className="mb-4 text-sm text-dred">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[3px] bg-blurple p-3 font-medium text-white transition-colors hover:bg-blurple-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log In"}
        </button>
      </form>
    </div>
  );
};
