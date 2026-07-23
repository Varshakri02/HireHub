// Central config. Override via env vars in production.
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = process.env.PORT || 4000;
export const JWT_SECRET =
  process.env.JWT_SECRET || "dev-secret-change-me-in-production";
// DEMO_AUTH: login accepts ANY email+password — auto-creates the account if new
// and skips the password check for existing ones. Convenience for demos ONLY.
// Set DEMO_AUTH=false to enforce real credentials.
export const DEMO_AUTH = process.env.DEMO_AUTH !== "false";
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
// Account with this email is auto-promoted to admin on register/login/boot.
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@hirehub.com").toLowerCase();

// Absolute paths so it runs the same from any cwd.
export const ROOT = path.resolve(__dirname, "..");
export const DB_PATH = process.env.DB_PATH || path.join(ROOT, "data.db");
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, "uploads");
