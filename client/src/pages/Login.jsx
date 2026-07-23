import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await api.post("/auth/login", { email, password });
      login(r.data.token, r.data.user);
      navigate("/");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <Link to="/" className="logo">
        HireHub
      </Link>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Sign in</h2>
        <form onSubmit={submit}>
          <label>Username</label>
          <input
            type="text"
            placeholder="e.g. rec1, or any name"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
      <p className="center muted">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}
