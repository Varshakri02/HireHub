// Renders an attached document: inline preview for images, download link otherwise.
import { docIcon } from "../util.js";

export default function DocAttach({ url, name, type }) {
  if (!url) return null;
  if ((type || "").startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img
          src={url}
          alt={name}
          style={{ maxWidth: "100%", borderRadius: 8, marginTop: 10 }}
        />
      </a>
    );
  }
  return (
    <a className="doc-attach" href={url} target="_blank" rel="noreferrer">
      <span className="doc-icon">{docIcon(type)}</span>
      <span>
        <strong>{name || "Document"}</strong>
        <br />
        <span className="muted">Click to open</span>
      </span>
    </a>
  );
}
