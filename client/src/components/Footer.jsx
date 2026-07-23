// Global site footer — same style as the landing page footer.
import { Link } from "react-router-dom";

const Icon = ({ name, fill = false }) => (
  <span className={`material-symbols-outlined${fill ? " fill" : ""}`}>{name}</span>
);

export default function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-foot-grid">
        <div>
          <Link to="/" className="lp-brand" style={{ fontSize: 20 }}>
            <Icon name="hexagon" fill /> HireHub
          </Link>
          <p className="muted tiny" style={{ marginTop: 12 }}>
            © 2024 HireHub Recruitment. All rights reserved.
          </p>
        </div>
        <div className="lp-foot-col">
          <h4>Company</h4>
          <a href="#">About</a>
          <a href="#">Careers</a>
        </div>
        <div className="lp-foot-col">
          <h4>Legal</h4>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms</a>
        </div>
      </div>
    </footer>
  );
}
