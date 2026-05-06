import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate("/");
    } catch (err: unknown) {
      const msg =
        (
          err as {
            response?: {
              data?: { error?: string; errors?: { msg: string }[] };
            };
          }
        )?.response?.data?.error ||
        (err as { response?: { data?: { errors?: { msg: string }[] } } })
          ?.response?.data?.errors?.[0]?.msg ||
        "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <p className="brand-tag">Process hub</p>
        <h1 className="login-title">
          My <em>checklists</em>
        </h1>
        <p className="login-sub">
          {mode === "login" ? "Sign in to your account" : "Create an account"}
        </p>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="modal-field" style={{ marginBottom: "1rem" }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <div className="modal-field" style={{ marginBottom: "1.5rem" }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              placeholder={
                mode === "register" ? "Min 10 chars, upper, number, symbol" : ""
              }
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: "100%", marginBottom: "0.75rem" }}
          >
            {loading ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          className="btn-ghost"
          style={{ width: "100%" }}
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login"
            ? "Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
