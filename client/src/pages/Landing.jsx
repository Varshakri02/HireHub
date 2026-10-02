// Public landing page — same sections, links and search behaviour as before.
// Visual layer only: 3D particle field behind the hero, perspective grid floor,
// marquee trust strip and an asymmetric bento of categories.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ParticleField from "../components/ParticleField.jsx";
import { useScrollReveal, trackBloom } from "../components/Reveal.jsx";

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
const TRUSTED = [
  { icon: "cloud", name: "Aether" },
  { icon: "dataset", name: "NexusData" },
  { icon: "account_tree", name: "Lumina" },
  { icon: "public", name: "GlobalSys" },
  { icon: "monitoring", name: "Apex" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");

  useScrollReveal();

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
        {/* Hero — particle field + perspective floor sit behind the content */}
        <div className="lp-hero-stage">
          <div className="lp-hero-glow" aria-hidden="true" />
          <ParticleField className="lp-hero-canvas" />
          <div className="lp-grid-floor" aria-hidden="true" />

          <section className="lp-hero">
            <div className="lp-badge">
              <Icon name="local_fire_department" size={16} />
              <span><b>10,000+</b> premium roles added this week</span>
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

            <div className="lp-hero-stats">
              <div className="st"><b>12,400</b><span>Open roles</span></div>
              <div className="st"><b>2,800</b><span>Hiring teams</span></div>
              <div className="st"><b>48h</b><span>Median reply</span></div>
            </div>
          </section>
        </div>

        {/* Trusted by — marquee, pauses on hover */}
        <section className="lp-trusted">
          <div className="lp-trusted-inner">
            <p>Trusted by innovative companies</p>
            <div className="lp-logos">
              {[...TRUSTED, ...TRUSTED].map((c, i) => (
                <span className="co" key={`${c.name}-${i}`} aria-hidden={i >= TRUSTED.length}>
                  <Icon name={c.icon} />
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Featured categories */}
        <section className="lp-section">
          <div className="lp-section-head reveal">
            <div>
              <h2>Featured Categories</h2>
              <p className="muted">Explore roles tailored to your expertise.</p>
            </div>
            <Link to="/jobs" className="lp-viewall">
              View all <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
          <div className="lp-bento">
            <Link to="/jobs" className="lp-cat lp-cat-lg reveal" onPointerMove={trackBloom}>
              <div className="lp-cat-iconbox"><Icon name="code" /></div>
              <div>
                <h3>Software Engineering</h3>
                <p className="muted" style={{ marginTop: 6 }}>2,450+ open roles in Frontend, Backend, and Full Stack.</p>
              </div>
            </Link>
            {CATEGORIES_MED.map((c, i) => (
              <Link
                to="/jobs"
                className={`lp-cat reveal d${i + 1}`}
                key={c.label}
                onPointerMove={trackBloom}
              >
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

      {/* Why HireHub */}
      <section className="lp-why">
        <div className="lp-why-inner">
          <div className="lp-why-head reveal">
            <h2>Why HireHub</h2>
            <p>Designed for clarity and efficiency, prioritizing your professional journey.</p>
          </div>
          <div className="lp-why-grid">
            {FEATURES.map((f, i) => (
              <div className={`lp-feature reveal d${i + 1}`} key={f.title}>
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
            <Link to="/jobs">Post a Job</Link>
            <Link to="/network">Companies</Link>
            <a href="#">Salary Guide</a>
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
    </div>
  );
}
