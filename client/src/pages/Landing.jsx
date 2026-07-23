// Public landing page — reproduces the Stitch "Vertex — Find Your Next Career" screen.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Material Symbols icon.
function Icon({ name, fill = false, size, className = "" }) {
  return (
    <span
      className={`material-symbols-outlined${fill ? " fill" : ""} ${className}`}
      style={size ? { fontSize: size } : undefined}
    >
      {name}
    </span>
  );
}

const CATEGORIES_MED = [
  { icon: "brush", label: "Design & UX", jobs: "840+ Jobs" },
  { icon: "bar_chart", label: "Data Science", jobs: "1,200+ Jobs" },
];
const FEATURES = [
  { icon: "verified", title: "Verified Opportunities", body: "Every listing is vetted to ensure quality and authenticity, saving you time." },
  { icon: "insights", title: "Salary Transparency", body: "Upfront compensation details help you make informed career decisions." },
  { icon: "person_search", title: "Direct Connections", body: "Skip the middleman and communicate directly with hiring managers." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");

  function search(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    navigate(`/jobs${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="lp">
      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-left">
            <Link to="/" className="lp-brand">
              <Icon name="hexagon" fill size={28} /> HireHub
            </Link>
            <div className="lp-nav-links">
              <Link to="/jobs" className="active">Find Jobs</Link>
              <Link to="/jobs">Post a Job</Link>
              <Link to="/network">Companies</Link>
            </div>
          </div>
          <div className="lp-nav-right">
            <button className="lp-signin" onClick={() => navigate("/login")}>Sign In</button>
            <button onClick={() => navigate("/register")}>Join HireHub</button>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-badge">
            <Icon name="work" size={16} />
            <span>Over 10,000 new premium roles added this week</span>
          </div>
          <h1 className="lp-title">
            Find your next career <span>milestone</span>
          </h1>
          <p className="lp-sub">
            Connect with top-tier employers and discover opportunities that match your
            expertise. The modern platform for professional growth.
          </p>

          <form className="lp-search" onSubmit={search}>
            <div className="lp-field">
              <Icon name="search" />
              <input
                placeholder="Job title, keyword, or company"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="lp-search-sep" />
            <div className="lp-field loc">
              <Icon name="location_on" />
              <input
                placeholder="City, state, or remote"
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
              />
            </div>
            <button type="submit">Search Jobs</button>
          </form>
        </section>

        {/* Trusted by */}
        <section className="lp-trusted">
          <div className="lp-trusted-inner">
            <p>Trusted by innovative companies</p>
            <div className="lp-logos">
              <span className="co"><Icon name="cloud" />Aether</span>
              <span className="co"><Icon name="dataset" />NexusData</span>
              <span className="co"><Icon name="account_tree" />Lumina</span>
              <span className="co"><Icon name="public" />GlobalSys</span>
              <span className="co"><Icon name="monitoring" />Apex</span>
            </div>
          </div>
        </section>

        {/* Featured categories */}
        <section className="lp-section">
          <div className="lp-section-head">
            <div>
              <h2>Featured Categories</h2>
              <p className="muted">Explore roles tailored to your expertise.</p>
            </div>
            <Link to="/jobs" className="lp-viewall">
              View all <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
          <div className="lp-bento">
            <Link to="/jobs" className="lp-cat lp-cat-lg">
              <div className="lp-cat-iconbox"><Icon name="code" /></div>
              <div>
                <h3>Software Engineering</h3>
                <p className="muted" style={{ marginTop: 4 }}>2,450+ open roles in Frontend, Backend, and Full Stack.</p>
              </div>
            </Link>
            {CATEGORIES_MED.map((c) => (
              <Link to="/jobs" className="lp-cat" key={c.label}>
                <div className="spread" style={{ alignItems: "flex-start" }}>
                  <Icon name={c.icon} />
                  <span className="lp-cat-pill">{c.jobs}</span>
                </div>
                <h3 style={{ marginTop: 16 }}>{c.label}</h3>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Why Vertex */}
      <section className="lp-why">
        <div className="lp-why-inner">
          <div className="lp-why-head">
            <h2>Why HireHub</h2>
            <p>Designed for clarity and efficiency, prioritizing your professional journey.</p>
          </div>
          <div className="lp-why-grid">
            {FEATURES.map((f) => (
              <div className="lp-feature" key={f.title}>
                <div className="lp-icon-box"><Icon name={f.icon} /></div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-foot-grid">
          <div>
            <Link to="/" className="lp-brand" style={{ fontSize: 20, marginBottom: 12 }}>
              <Icon name="hexagon" fill /> HireHub
            </Link>
            <p className="muted tiny">The modern platform for finding your next career milestone.</p>
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
          <div className="lp-foot-col">
            <h4>Connect</h4>
            <div className="row" style={{ color: "var(--muted)" }}>
              <a href="#"><Icon name="language" /></a>
              <a href="#"><Icon name="mail" /></a>
            </div>
          </div>
        </div>
        <div className="lp-foot-bottom">
          <p>© 2024 HireHub Recruitment. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
