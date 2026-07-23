import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await api.post("/auth/register", form);
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
        <h2 style={{ marginTop: 0 }}>Join HireHub</h2>
        <form onSubmit={submit}>
          <label>Full name</label>
          <input value={form.name} onChange={set("name")} required />
          <label>Username</label>
          <input type="text" placeholder="pick a username" autoComplete="username" value={form.email} onChange={set("email")} required />
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            minLength={6}
            required
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
      </div>
      <p className="center muted">
        Already a member? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
