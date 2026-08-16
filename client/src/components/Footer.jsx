// Global site footer — same layout and content as the landing page footer.
import { Link } from "react-router-dom";

const Icon = ({ name, fill = false }) => (
  <span className={`material-symbols-outlined${fill ? " fill" : ""}`}>{name}</span>
);

export default function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-foot-grid">
        <div className="lp-foot-brand">
          <Link to="/" className="lp-brand" style={{ fontSize: 20 }}>
            <Icon name="hexagon" fill /> HireHub
          </Link>
          <p className="muted tiny">
            The modern platform for finding your next career milestone. Verified roles,
            transparent pay, direct lines to the people who hire.
          </p>
          <div className="lp-social">
            <a href="#" aria-label="Website"><Icon name="language" /></a>
            <a href="#" aria-label="Email us"><Icon name="mail" /></a>
            <a href="#" aria-label="Community"><Icon name="forum" /></a>
            <a href="#" aria-label="Newsroom"><Icon name="rss_feed" /></a>
          </div>
          <div className="lp-foot-stat">
            <i className="lp-dot" />
            12,400 open roles · 2,800 hiring teams
          </div>
        </div>

        <div className="lp-foot-col">
          <h4>Platform</h4>
          <Link to="/jobs">Find Jobs</Link>
          <Link to="/applications">My Applications</Link>
          <Link to="/network">Companies</Link>
          <Link to="/messages">Messages</Link>
        </div>
        <div className="lp-foot-col">
          <h4>Company</h4>
          <a href="#">About</a>
          <a href="#">Careers</a>
          <a href="#">Press</a>
          <a href="#">Contact</a>
        </div>
        <div className="lp-foot-col">
          <h4>Resources</h4>
          <a href="#">Help Center</a>
          <a href="#">Hiring Guides</a>
          <a href="#">Blog</a>
          <a href="#">Status</a>
        </div>
        <div className="lp-foot-col">
          <h4>Legal</h4>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms</a>
          <a href="#">Cookies</a>
          <a href="#">Security</a>
        </div>
      </div>
      <div className="lp-foot-bottom">
        <p>© 2024 HireHub Recruitment. All rights reserved.</p>
        <div className="lp-foot-meta">
          <span className="lp-status"><i />All systems operational</span>
          <span className="sep">·</span>
          <span>EN · Global</span>
        </div>
      </div>
    </footer>
  );
}
