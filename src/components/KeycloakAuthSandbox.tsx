import { useState } from 'react'
import { NavBrand } from './NavBrand'
import { AuthTopologyMap, type AuthPersona, type AuthEndpoint, type DiagramMode } from './sandbox/AuthTopologyMap'

export type ViewTab = 'what-how-why' | 'phase-1' | 'phase-2' | 'configs'
type ConfigTab = 'phase1-compose' | 'phase1-api' | 'phase2-auth' | 'phase2-tests' | 'phase2-compose' | 'demo-script'

interface EndpointConfig {
  id: AuthEndpoint
  method: 'GET' | 'POST'
  path: string
  label: string
  requiredRoles: string[]
  isPublic: boolean
  description: string
}

const endpointsPhase1: Record<string, EndpointConfig> = {
  public: {
    id: 'public',
    method: 'GET',
    path: '/api/public',
    label: '1. Public Health Check',
    requiredRoles: [],
    isPublic: true,
    description: 'Unauthenticated public health probe. Bypasses the token verification gate completely.',
  },
  me: {
    id: 'me',
    method: 'GET',
    path: '/api/me',
    label: '2. User Profile (/api/me)',
    requiredRoles: ['viewer', 'admin', 'farmer', 'service_provider'],
    isPublic: false,
    description: 'Returns identity claims of the authenticated user. Accessible by any valid realm user.',
  },
  crops: {
    id: 'crops',
    method: 'GET',
    path: '/api/crops',
    label: '3. Farm Crops & Acreage',
    requiredRoles: ['farmer', 'admin'],
    isPublic: false,
    description: 'Farmer domain data: crop plots, acreage, expected yield (kg), and growth stages.',
  },
  services: {
    id: 'services',
    method: 'GET',
    path: '/api/services',
    label: '4. Contractor Marketplace',
    requiredRoles: ['service_provider', 'admin'],
    isPublic: false,
    description: 'Contractor marketplace: agricultural drone spraying, harvesters, and booking statuses.',
  },
  'admin-users': {
    id: 'admin-users',
    method: 'GET',
    path: '/api/admin/users',
    label: '5. Admin Console: User List',
    requiredRoles: ['admin'],
    isPublic: false,
    description: 'Administrative directory listing all registered realm users, roles, and group memberships.',
  },
  'reset-pwd': {
    id: 'reset-pwd',
    method: 'POST',
    path: '/api/admin/reset-password',
    label: '6. Admin: Password Reset',
    requiredRoles: ['admin'],
    isPublic: false,
    description: 'Privileged identity action: forcibly resets user credentials via Keycloak Admin API.',
  },
}

const endpointsPhase2: Record<string, EndpointConfig> = {
  public: {
    id: 'public',
    method: 'GET',
    path: '/api/public',
    label: '1. Public Probe (/api/public)',
    requiredRoles: [],
    isPublic: true,
    description: 'Unprotected endpoint returning status 200 OK without any Authorization header.',
  },
  me: {
    id: 'me',
    method: 'GET',
    path: '/api/me',
    label: '2. Verified Claims (/api/me)',
    requiredRoles: ['viewer', 'developer', 'admin'],
    isPublic: false,
    description: 'Returns verified JWT subject, issuer, audience, and active role claims.',
  },
  users: {
    id: 'users',
    method: 'GET',
    path: '/api/users',
    label: '3. Standard Access (/api/users)',
    requiredRoles: ['viewer', 'developer', 'admin'],
    isPublic: false,
    description: 'Accessible by any authenticated user regardless of whether they are a viewer or developer.',
  },
  'admin-users': {
    id: 'admin-users',
    method: 'GET',
    path: '/api/admin/users',
    label: '4. Privileged Admin (/api/admin/users)',
    requiredRoles: ['admin'],
    isPublic: false,
    description: 'Restricted strictly to role: admin. Returns 403 Forbidden for Alice and Drench!',
  },
}

interface PersonaInfo {
  id: AuthPersona
  name: string
  role: string
  group: string
  description: string
  tokenValid: boolean
  isAttacker: boolean
}

const personasPhase1: Record<string, PersonaInfo> = {
  farmer: {
    id: 'farmer',
    name: 'Ramesh (Farmer)',
    role: 'farmer',
    group: 'Farmers',
    description: 'Farm owner managing crop plots, worker attendance, and contracting machinery.',
    tokenValid: true,
    isAttacker: false,
  },
  service_provider: {
    id: 'service_provider',
    name: 'Kiran (Service Provider)',
    role: 'service_provider',
    group: 'ServiceProviders',
    description: 'Agricultural contractor offering drone spraying, combine harvesters, and soil testing.',
    tokenValid: true,
    isAttacker: false,
  },
  admin: {
    id: 'admin',
    name: 'Bob / Admin (Platform Admin)',
    role: 'admin',
    group: 'Admins',
    description: 'Platform superuser with full administrative privileges across all realm entities.',
    tokenValid: true,
    isAttacker: false,
  },
  anonymous: {
    id: 'anonymous',
    name: 'Anonymous (No Token)',
    role: 'none',
    group: 'Public',
    description: 'Unauthenticated caller with no Authorization Bearer header attached to request.',
    tokenValid: false,
    isAttacker: false,
  },
  tampered: {
    id: 'tampered',
    name: 'Malicious Attacker (Tampered Token)',
    role: 'farmer -> escalated to admin',
    group: 'Attackers',
    description: 'Forged token with client-side payload modification without Keycloak private RSA key.',
    tokenValid: false,
    isAttacker: true,
  },
}

const personasPhase2: Record<string, PersonaInfo> = {
  alice: {
    id: 'alice',
    name: 'Alice (Viewer / Standard User)',
    role: 'viewer',
    group: 'Viewers',
    description: 'Standard application user with viewer role permissions. Can access /api/me and /api/users.',
    tokenValid: true,
    isAttacker: false,
  },
  drench: {
    id: 'drench',
    name: 'Drench (Developer)',
    role: 'developer',
    group: 'Developers',
    description: 'Developer role. Granted access to engineering resources but restricted from master admin.',
    tokenValid: true,
    isAttacker: false,
  },
  admin: {
    id: 'admin',
    name: 'Bob (Admin / Superuser)',
    role: 'admin',
    group: 'Admins',
    description: 'Superuser account possessing role: admin. Granted access to privileged /api/admin/users.',
    tokenValid: true,
    isAttacker: false,
  },
  anonymous: {
    id: 'anonymous',
    name: 'Anonymous (No Token)',
    role: 'none',
    group: 'Public',
    description: 'Unauthenticated caller. Missing Bearer token in HTTP Authorization header.',
    tokenValid: false,
    isAttacker: false,
  },
  mallory: {
    id: 'mallory',
    name: 'Mallory (Cryptographic Attacker)',
    role: 'attacker (seeking admin)',
    group: 'Attackers',
    description: 'Adversary testing alg: none, CVE-2015-9235 HS256 key confusion, and expired token replays.',
    tokenValid: false,
    isAttacker: true,
  },
}

export function KeycloakAuthSandbox() {
  // Navigation: Landing page is What, How & Why
  const [activeTab, setActiveTab] = useState<ViewTab>('what-how-why')
  const [activeConfig, setActiveConfig] = useState<ConfigTab>('phase2-auth')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Diagram mode states per tab
  const [guideDiagramMode, setGuideDiagramMode] = useState<DiagramMode>('architecture')
  const [p1DiagramMode, setP1DiagramMode] = useState<DiagramMode>('live-topology')
  const [p2DiagramMode, setP2DiagramMode] = useState<DiagramMode>('live-topology')

  // Phase 1 Simulation state
  const [selectedPersonaP1, setSelectedPersonaP1] = useState<AuthPersona>('farmer')
  const [selectedEndpointP1, setSelectedEndpointP1] = useState<AuthEndpoint>('crops')

  // Phase 2 Exploit Simulator state
  const [selectedPersonaP2, setSelectedPersonaP2] = useState<AuthPersona>('alice')
  const [selectedEndpointP2, setSelectedEndpointP2] = useState<AuthEndpoint>('users')
  const [activeExploit, setActiveExploit] = useState<'none' | 'hs256' | 'tamper' | 'expired' | 'rogue-key' | 'rotation' | null>(null)
  const [keyRotated, setKeyRotated] = useState(false)
  const [keyRetired, setKeyRetired] = useState(false)

  // -------------------------------------------------------------
  // Phase 1 Access Calculations
  // -------------------------------------------------------------
  const personaP1 = personasPhase1[selectedPersonaP1] || personasPhase1.farmer
  const endpointP1 = endpointsPhase1[selectedEndpointP1] || endpointsPhase1.crops

  let decisionP1: 'ALLOW' | 'DENY_401' | 'DENY_403' = 'ALLOW'
  if (endpointP1.isPublic) {
    decisionP1 = 'ALLOW'
  } else if (!personaP1.tokenValid || personaP1.id === 'anonymous') {
    decisionP1 = 'DENY_401'
  } else if (personaP1.isAttacker) {
    decisionP1 = 'DENY_401'
  } else if (!endpointP1.requiredRoles.includes(personaP1.role)) {
    decisionP1 = 'DENY_403'
  } else {
    decisionP1 = 'ALLOW'
  }

  const tokenPayloadP1 = {
    iss: 'http://localhost:8080/realms/authlab',
    aud: 'authlab-api',
    sub: personaP1.id,
    realm_access: {
      roles: personaP1.isAttacker ? ['admin'] : [personaP1.role],
    },
    preferred_username: personaP1.id,
    email: `${personaP1.id}@farmsight360.com`,
    iat: Math.floor(Date.now() / 1000) - 120,
    exp: Math.floor(Date.now() / 1000) + 1800,
  }

  // -------------------------------------------------------------
  // Phase 2 Access Calculations
  // -------------------------------------------------------------
  const personaP2 = personasPhase2[selectedPersonaP2] || personasPhase2.alice
  const endpointP2 = endpointsPhase2[selectedEndpointP2] || endpointsPhase2.users

  let decisionP2: 'ALLOW' | 'DENY_401' | 'DENY_403' = 'ALLOW'
  if (endpointP2.isPublic) {
    decisionP2 = 'ALLOW'
  } else if (!personaP2.tokenValid || personaP2.id === 'anonymous') {
    decisionP2 = 'DENY_401'
  } else if (personaP2.isAttacker || activeExploit) {
    decisionP2 = 'DENY_401'
  } else if (!endpointP2.requiredRoles.includes(personaP2.role)) {
    decisionP2 = 'DENY_403'
  } else {
    decisionP2 = 'ALLOW'
  }

  const activeKidP2 = keyRotated && !keyRetired ? '8f2d9c1b' : 'e7b1a49f'

  const tokenHeaderP2 = {
    alg: activeExploit === 'none' ? 'none' : activeExploit === 'hs256' ? 'HS256' : 'RS256',
    typ: 'JWT',
    kid: activeExploit === 'rogue-key' ? 'attacker-foreign-key' : activeKidP2,
  }

  const tokenPayloadP2 = {
    iss: 'http://localhost:5001',
    aud: 'authlab-api',
    sub: personaP2.id,
    roles: activeExploit === 'tamper' || activeExploit === 'none' || activeExploit === 'hs256'
      ? ['admin']
      : [personaP2.role],
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: activeExploit === 'expired' ? Math.floor(Date.now() / 1000) - 1800 : Math.floor(Date.now() / 1000) + 900,
    preferred_username: personaP2.id,
    email: `${personaP2.id}@authlab.dev`,
  }

  const tokenSignatureP2 = activeExploit === 'none'
    ? ''
    : activeExploit === 'hs256'
      ? 'HMAC_SHA256_USING_PUBLIC_RSA_PEM_AS_SECRET'
      : activeExploit
        ? 'INVALID_TAMPERED_SIGNATURE_MISMATCH'
        : 'RSASHA256_jwtlab_keyStore_signature_7hQ9mK3xL'

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(label)
    setTimeout(() => setCopiedCode(null), 2200)
  }

  const switchGuideDiagram = (mode: DiagramMode) => {
    setGuideDiagramMode(mode)
    const el = document.getElementById('guide-diagram-anchor')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="sandbox-shell fade-in">
      {/* Top Navigation Bar */}
      <nav className="sandbox-topbar">
        <div className="container sandbox-topbar-inner">
          <NavBrand href="/#projects" />
          <div className="sandbox-breadcrumb">
            SANDBOX / AUTHLAB PHASES 1 &amp; 2 · ARCHITECTURAL DEEP DIVE · v0.5.8
          </div>
          <a className="sandbox-back" href="/#projects">← back to projects</a>
        </div>
      </nav>

      {/* Main Container */}
      <main className="sandbox-main">
        {/* Hero Section */}
        <header className="hero" style={{ paddingBottom: '16px' }}>
          <div className="container">
            <div className="kicker">
              <span className="kicker-dot" /> AuthLab: What, How and Why · Dual-Phase Architecture
            </div>
            <h1 style={{ margin: '8px 0 12px', fontSize: '32px', letterSpacing: '-0.03em' }}>
              AuthLab: Enterprise IAM &amp; JWT Attack Platform
            </h1>
            <p className="hero-copy" style={{ maxWidth: '880px', margin: '0 0 18px', fontSize: '15px', lineHeight: '1.6' }}>
              A comprehensive walkthrough exploring the two sides of authentication: the <strong>Issuer</strong> (Identity Provider proving who you are)
              and the <strong>Resource Server</strong> (API verifying tokens on every request).
              Compare <strong>Phase 1: Real Identity Provider (Keycloak 26 + PostgreSQL)</strong> with
              <strong> Phase 2: Build &amp; Break Your Own JWT Issuer (CVE-2015-9235, <code>alg: none</code>, KeyStore rotation, and 16 automated exploit unit tests)</strong>.
            </p>

            <div className="cta-row" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <a
                className="button primary"
                href="https://github.com/neehar2601/Authentication"
                target="_blank"
                rel="noreferrer"
              >
                GitHub Repository ↗
              </a>
              <span className="tag" style={{ border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}>
                Keycloak 26.0 (Quay)
              </span>
              <span className="tag" style={{ border: '1px solid rgba(232, 115, 93, 0.3)', color: 'var(--red)' }}>
                16 Pytest Security Exploits
              </span>
              <span className="tag" style={{ border: '1px solid rgba(167, 139, 250, 0.3)', color: '#a78bfa' }}>
                CVE-2015-9235 Defense
              </span>
              <span className="tag" style={{ border: '1px solid rgba(79, 209, 197, 0.3)', color: 'var(--teal)' }}>
                RS256 &amp; JWKS Rotation
              </span>
            </div>

            {/* Top Navigation Tabs */}
            <div className="standalone-tab-row" style={{ marginTop: '16px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', overflowX: 'auto' }}>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'what-how-why' ? 'active' : ''}`}
                onClick={() => setActiveTab('what-how-why')}
              >
                📐 What, How &amp; Why (Architecture Walkthrough)
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'phase-1' ? 'active' : ''}`}
                onClick={() => setActiveTab('phase-1')}
              >
                🌾 Phase 1: Keycloak IDP &amp; Protected API
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'phase-2' ? 'active' : ''}`}
                onClick={() => setActiveTab('phase-2')}
              >
                🔬 Phase 2: Build &amp; Break JWT Lab
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'configs' ? 'active' : ''}`}
                onClick={() => setActiveTab('configs')}
              >
                ⚙️ Production Configs
              </button>
            </div>
          </div>
        </header>

        {/* ============================================================= */}
        {/* TAB 1 (LANDING PAGE): WHAT, HOW & WHY ARCHITECTURAL GUIDE     */}
        {/* ============================================================= */}
        {activeTab === 'what-how-why' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              {/* Prominent Flow Diagram Component on Landing Page */}
              <div
                className="standalone-card"
                id="guide-diagram-anchor"
                style={{
                  padding: '22px',
                  marginBottom: '32px',
                  borderLeft: '4px solid var(--teal)',
                  background: 'rgba(15, 21, 29, 0.7)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span className="control-label" style={{ display: 'block', marginBottom: '2px' }}>
                      Architecture &amp; Security Flow Engine
                    </span>
                    <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>
                      Interactive System Diagrams (5 Dynamic Modes)
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="tag" style={{ font: '10px var(--mono)', color: 'var(--teal)' }}>
                      Live SVG Explorer
                    </span>
                  </div>
                </div>

                <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
                  Explore system interactions visually. Click any mode button inside the diagram header to switch between the
                  <strong> Two Sides of Auth</strong>, the <strong>6-Step Validation Pipeline</strong>, the <strong>Docker Hostname Split Gotcha</strong>,
                  the <strong>Phase 2 Cryptographic Attack Matrix</strong>, and <strong>Zero-Downtime Key Rotation</strong>.
                </p>

                <AuthTopologyMap
                  phase="phase-1"
                  persona="admin"
                  endpoint="crops"
                  decision="ALLOW"
                  diagramMode={guideDiagramMode}
                  onSelectDiagramMode={(mode) => setGuideDiagramMode(mode)}
                />
              </div>

              {/* Guide Layout: Sticky TOC + Narrative Body */}
              <div className="standalone-guide-layout" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px' }}>
                {/* Sticky TOC Sidebar */}
                <aside className="guide-toc-sidebar" style={{ position: 'sticky', top: '24px', height: 'fit-content' }}>
                  <div className="standalone-card" style={{ padding: '16px' }}>
                    <span className="control-label" style={{ display: 'block', marginBottom: '10px' }}>Walkthrough Index</span>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <a href="#whw-big-picture" className="toc-link">1. The Big Picture</a>
                      <a href="#whw-phase-1" className="toc-link">2. Phase 1: Real IdP &amp; Protected API</a>
                      <a href="#whw-safe-defaults" className="toc-link">3. Safe Defaults on Purpose</a>
                      <a href="#whw-api-validation" className="toc-link">4. How the API Validates a Token</a>
                      <a href="#whw-keycloak-setup" className="toc-link">5. The Keycloak Setup &amp; Why</a>
                      <a href="#whw-gotchas" className="toc-link">6. Gotchas Worth Writing About</a>
                      <a href="#whw-phase-2" className="toc-link">7. Phase 2: Build &amp; Break Your Own Issuer</a>
                      <a href="#whw-vulnerable-verifier" className="toc-link">8. The Deliberately Vulnerable Verifier</a>
                      <a href="#whw-what-tests-prove" className="toc-link">9. What the 16 Tests Prove</a>
                      <a href="#whw-interview-points" className="toc-link">10. Interview Talking Points</a>
                    </nav>

                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                      <span className="control-label" style={{ display: 'block', marginBottom: '6px' }}>Interactive Tabs</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('phase-1')}
                        className="button"
                        style={{ width: '100%', fontSize: '11px', padding: '6px', marginBottom: '6px', textAlign: 'left' }}
                      >
                        🌾 Switch to Phase 1 Lab ➔
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('phase-2')}
                        className="button"
                        style={{ width: '100%', fontSize: '11px', padding: '6px', textAlign: 'left' }}
                      >
                        🔬 Switch to Phase 2 Lab ➔
                      </button>
                    </div>
                  </div>
                </aside>

                {/* Article Content */}
                <article className="guide-article-body">
                  {/* Section 1: The Big Picture */}
                  <section id="whw-big-picture">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <h2 style={{ margin: 0 }}>1. The Big Picture: Issuer vs. Resource Server</h2>
                      <button
                        type="button"
                        onClick={() => switchGuideDiagram('architecture')}
                        className="button"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        🖼️ View Diagram 1: Issuer vs API
                      </button>
                    </div>
                    <p style={{ marginTop: '12px' }}>
                      Authentication has two sides: the <strong>issuer</strong> (the identity provider, which proves who you are and hands out tokens)
                      and the <strong>resource server</strong> (the API, which checks the token on every request).
                    </p>
                    <div className="guide-grid-two">
                      <div className="guide-box" style={{ borderLeft: '3px solid #38bdf8' }}>
                        <strong style={{ color: '#38bdf8' }}>Phase 1: Real Identity Provider</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                          Uses a real, production-grade issuer (<strong>Keycloak 26</strong>) backed by PostgreSQL and builds the API side.
                        </p>
                      </div>
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong style={{ color: 'var(--teal)' }}>Phase 2: Build &amp; Break Your Own</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                          Builds a tiny issuer yourself (<strong>`jwtlab` KeyStore</strong>), so you understand what Keycloak does internally and can break it safely.
                        </p>
                      </div>
                    </div>
                    <div className="callout callout-tip" style={{ marginTop: '16px' }}>
                      <strong>The Architectural Order:</strong> That order means you have seen the real thing first, and Phase 2 then explains how it works internally.
                      <br />
                      <em>Status:</em> Phase 2 is tested with 16 automated security tests passing (100%).
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 2: Phase 1 */}
                  <section id="whw-phase-1">
                    <h2>2. Phase 1: Real Identity Provider and a Protected API</h2>
                    <p>
                      <strong>What we built:</strong> <code>docker-compose.yml</code> with three services (Postgres, Keycloak and a Flask API), plus <code>.env.example</code>, <code>.gitignore</code> and a README with the Keycloak setup steps.
                    </p>
                    <h3>Why Each Piece Exists:</h3>
                    <ul>
                      <li>
                        <strong>Keycloak:</strong> An open-source identity provider that speaks OAuth 2.0 and OpenID Connect, widely used in enterprises.
                        It handles login, users, roles, token signing and later Google and GitHub federation.
                      </li>
                      <li>
                        <strong>Postgres:</strong> Lets Keycloak&apos;s configuration survive container restarts. Dev mode defaults to an embedded database,
                        which is fine for a quick test and less convincing as a project.
                      </li>
                      <li>
                        <strong>The Flask API:</strong> The resource server. <em>It never sees passwords.</em> It only receives a token and decides whether to trust it.
                        Keeping authentication and API separate is the core architectural idea.
                      </li>
                    </ul>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 3: Safe Defaults */}
                  <section id="whw-safe-defaults">
                    <h2>3. Safe Defaults, on Purpose</h2>
                    <p>
                      Security engineering requires deliberate operational hygiene:
                    </p>
                    <div className="guide-table-wrap">
                      <table className="guide-table">
                        <thead>
                          <tr>
                            <th>Security Default</th>
                            <th>Implementation</th>
                            <th>Why It Matters</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Pinned Images</strong></td>
                            <td><code>quay.io/keycloak/keycloak:26.1.3</code> and <code>postgres:16-alpine</code></td>
                            <td>Prevents unexpected breaking changes from <code>:latest</code> tag drifts.</td>
                          </tr>
                          <tr>
                            <td><strong>Loopback Binding</strong></td>
                            <td><code>127.0.0.1:8080:8080</code> and <code>127.0.0.1:5432:5432</code></td>
                            <td>Prevents accidental public exposure on host network interfaces.</td>
                          </tr>
                          <tr>
                            <td><strong>Non-Root User</strong></td>
                            <td><code>USER appuser</code> in <code>api/Dockerfile</code></td>
                            <td>Limits container breakout attack surface in production runtimes.</td>
                          </tr>
                          <tr>
                            <td><strong>Env Separation</strong></td>
                            <td><code>.env</code> gitignored, only <code>.env.example</code> committed</td>
                            <td>Prevents credential leaks into public source control repositories.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 4: How the API Validates a Token */}
                  <section id="whw-api-validation">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <h2 style={{ margin: 0 }}>4. How the API Validates a Token (The 6 Steps)</h2>
                      <button
                        type="button"
                        onClick={() => switchGuideDiagram('validation-pipeline')}
                        className="button"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        🔍 View Diagram 2: 6-Step Pipeline
                      </button>
                    </div>
                    <p style={{ marginTop: '12px' }}>
                      In <code>api/app.py</code>, every incoming request to a protected route executes six sequential verification checks:
                    </p>
                    <ol className="guide-ordered-list">
                      <li>
                        <strong>Read the Authorization Header:</strong> Expects <code>Bearer &lt;token&gt;</code>. Returns <code>401</code> if missing or malformed.
                      </li>
                      <li>
                        <strong>Read the <code>kid</code> (Key ID) from the Token Header:</strong> Uses <code>jwt.get_unverified_header(token)</code> to determine which key signed it without trusting the content yet.
                      </li>
                      <li>
                        <strong>Fetch Keycloak&apos;s Public Keys (JWKS):</strong> Queries <code>http://keycloak:8080/realms/authlab/protocol/openid-connect/certs</code> to match the <code>kid</code> to the corresponding public RSA key.
                      </li>
                      <li>
                        <strong>Verify the Cryptographic Signature:</strong> Ensures the token was genuinely signed by Keycloak&apos;s private key and has not been tampered with.
                      </li>
                      <li>
                        <strong>Check Standard Claims:</strong>
                        <ul>
                          <li><code>iss</code> (Issuer): Must match <code>http://localhost:8080/realms/authlab</code>.</li>
                          <li><code>aud</code> (Audience): Must match <code>authlab-api</code>.</li>
                          <li><code>exp</code> (Expiration): Rejects expired tokens automatically.</li>
                        </ul>
                      </li>
                      <li>
                        <strong>Read Roles:</strong> Extracts <code>realm_access.roles</code> from claims and checks whether the user possesses the required permissions (e.g. <code>api-admin</code> vs <code>api-user</code>).
                      </li>
                    </ol>

                    <div className="callout callout-warning">
                      <strong>Why RS256, Not HS256?</strong>
                      <br />
                      <strong>HS256:</strong> Symmetric. Both Keycloak and the API share the same secret key. If the API is compromised, the attacker can mint their own valid tokens.
                      <br />
                      <strong>RS256:</strong> Asymmetric. Keycloak holds the private key and signs tokens. The API holds only the public key and verifies them. A compromised API cannot forge signatures!
                    </div>

                    <div className="guide-grid-two" style={{ marginTop: '16px' }}>
                      <div className="guide-box">
                        <strong>The Algorithm Allow-List:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          The API explicitly passes <code>algorithms=[&quot;RS256&quot;]</code>. Without this allow-list, libraries may trust the algorithm specified in the token header, enabling severe signature bypass attacks.
                        </p>
                      </div>
                      <div className="guide-box">
                        <strong>401 vs. 403 Distinction:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          <strong>401 Unauthorized:</strong> Authentication failure (&quot;I cannot verify who you are&quot;).
                          <br />
                          <strong>403 Forbidden:</strong> Authorization failure (&quot;I know who you are, but you do not have permission&quot;).
                        </p>
                      </div>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 5: Keycloak Setup & Why */}
                  <section id="whw-keycloak-setup">
                    <h2>5. The Keycloak Setup &amp; Why</h2>
                    <div className="guide-table-wrap">
                      <table className="guide-table">
                        <thead>
                          <tr>
                            <th>Configuration</th>
                            <th>Value</th>
                            <th>Why This Choice</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Realm</strong></td>
                            <td><code>authlab</code></td>
                            <td>Isolates our application completely from Keycloak&apos;s built-in <code>master</code> admin realm.</td>
                          </tr>
                          <tr>
                            <td><strong>Client</strong></td>
                            <td><code>authlab-api</code></td>
                            <td>Represents the API within Keycloak to establish a distinct security context.</td>
                          </tr>
                          <tr>
                            <td><strong>Client Type</strong></td>
                            <td>Public with PKCE</td>
                            <td>Safe for frontends and mobile apps; avoids embedding client secrets in untrusted code.</td>
                          </tr>
                          <tr>
                            <td><strong>Direct Access Grants</strong></td>
                            <td>Enabled (for testing)</td>
                            <td>Allows <code>curl</code> to obtain tokens directly with username/password, ideal for automation and CLI testing.</td>
                          </tr>
                          <tr>
                            <td><strong>Roles</strong></td>
                            <td><code>api-admin</code> and <code>api-user</code></td>
                            <td>Realm-level roles mapped to users to demonstrate role-based access control (RBAC).</td>
                          </tr>
                          <tr>
                            <td><strong>Audience Mapper</strong></td>
                            <td><code>authlab-api</code> added to tokens</td>
                            <td>Tokens will be rejected by the API unless they carry the expected <code>aud</code> claim.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 6: Gotchas */}
                  <section id="whw-gotchas">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <h2 style={{ margin: 0 }}>6. Gotchas Worth Writing About</h2>
                      <button
                        type="button"
                        onClick={() => switchGuideDiagram('hostname-split')}
                        className="button"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        🌐 View Diagram 3: Hostname Split Gotcha
                      </button>
                    </div>
                    <div className="guide-grid-two" style={{ marginTop: '14px' }}>
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--amber)' }}>
                        <strong style={{ color: 'var(--amber)' }}>Gotcha 1: Issuer vs. JWKS Hostnames</strong>
                        <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.5' }}>
                          When requesting a token from your host machine, the token issuer is <code>http://localhost:8080/...</code>.
                          However, the Flask API running inside Docker must reach Keycloak at <code>http://keycloak:8080/...</code> via Docker network DNS.
                          <br /><br />
                          If you configure the API to validate <code>iss</code> against <code>http://keycloak:8080/...</code>, every valid token issued to a browser will fail with <code>InvalidIssuerError</code>!
                          <br /><br />
                          <strong>Solution:</strong> Separate the validation into two distinct settings:
                          <code>TOKEN_ISSUER = &quot;http://localhost:8080/realms/authlab&quot;</code> (what the token claims) and
                          <code>JWKS_URL = &quot;http://keycloak:8080/realms/authlab/...&quot;</code> (how the container fetches public keys).
                        </p>
                      </div>

                      <div className="guide-box" style={{ borderLeft: '3px solid var(--amber)' }}>
                        <strong style={{ color: 'var(--amber)' }}>Gotcha 2: The Missing Audience Mapper</strong>
                        <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.5' }}>
                          By default, Keycloak access tokens do NOT include the client name in the <code>aud</code> claim.
                          When the API checks <code>aud=&quot;authlab-api&quot;</code>, validation fails with <code>InvalidAudienceError</code> even though the signature is 100% valid.
                          <br /><br />
                          <strong>Solution:</strong> Configure a dedicated Audience Protocol Mapper under Keycloak Client Scopes to explicitly stamp the API audience into issued tokens.
                        </p>
                      </div>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 7: Phase 2 */}
                  <section id="whw-phase-2">
                    <h2>7. Phase 2: Build &amp; Break Your Own JWT Issuer</h2>
                    <p>
                      <strong>Why Phase 2 exists:</strong> Keycloak does everything correctly out of the box, which is ideal for production but hides the internal mechanics.
                      To truly understand token security, you need to peel back the layers: generate raw RSA keys, construct a JWKS, and intentionally test attack vectors.
                    </p>
                    <p>
                      <strong>What we built in <code>jwtlab</code>:</strong>
                    </p>
                    <ul>
                      <li>
                        <strong><code>KeyStore</code>:</strong> Generates 2048-bit RSA keys, exports RFC 7517 compliant JWKS JSON, and manages key rotation.
                      </li>
                      <li>
                        <strong><code>issue_token()</code>:</strong> Signs JWTs with an active RSA private key, stamps <code>kid</code> in headers, and sets standard claims.
                      </li>
                      <li>
                        <strong><code>verify_token()</code>:</strong> The production-hardened verifier with strict RS256 algorithm enforcement.
                      </li>
                      <li>
                        <strong><code>naive_verify_token()</code>:</strong> A deliberately vulnerable verifier that trusts token headers unconditionally to demonstrate real-world CVEs.
                      </li>
                    </ul>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 8: Vulnerable Verifier */}
                  <section id="whw-vulnerable-verifier">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <h2 style={{ margin: 0 }}>8. The Deliberately Vulnerable Verifier</h2>
                      <button
                        type="button"
                        onClick={() => switchGuideDiagram('attack-matrix')}
                        className="button"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        💥 View Diagram 4: Attack Matrix vs Defenses
                      </button>
                    </div>
                    <p style={{ marginTop: '12px' }}>
                      To demonstrate why verification code must be defensive, we built a naive verifier and subjected it to two famous cryptographic attacks:
                    </p>

                    <div className="guide-grid-two">
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--red)' }}>
                        <strong style={{ color: 'var(--red)' }}>Attack 1: alg: &quot;none&quot; Signature Stripping</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                          The JWT specification allows <code>alg: &quot;none&quot;</code> for unsigned tokens. If a verifier inspects the header and sees <code>&quot;none&quot;</code>,
                          a naive implementation skips signature checking entirely. An attacker can craft any payload (e.g. <code>roles: [&quot;admin&quot;]</code>) without any cryptographic keys.
                        </p>
                      </div>

                      <div className="guide-box" style={{ borderLeft: '3px solid var(--red)' }}>
                        <strong style={{ color: 'var(--red)' }}>Attack 2: CVE-2015-9235 (Algorithm Confusion / Key Confusion)</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                          The server expects RS256 (asymmetric). The attacker changes the header to <code>HS256</code> (symmetric) and signs the token using the server&apos;s
                          <strong> public RSA key</strong> (which is publicly available in JWKS) as the HMAC secret! A naive verifier using the public key for verification validates it as genuine!
                        </p>
                      </div>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 9: What the 16 Tests Prove */}
                  <section id="whw-what-tests-prove">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <h2 style={{ margin: 0 }}>9. What the 16 Tests Prove</h2>
                      <button
                        type="button"
                        onClick={() => switchGuideDiagram('key-rotation')}
                        className="button"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        🔄 View Diagram 5: Key Rotation Overlap Window
                      </button>
                    </div>
                    <p style={{ marginTop: '12px' }}>
                      The test suite in <code>tests/test_attacks.py</code> runs 16 automated test cases confirming that every attack vector fails against the hardened verifier:
                    </p>
                    <div className="guide-table-wrap">
                      <table className="guide-table">
                        <thead>
                          <tr>
                            <th>Attack Vector</th>
                            <th>Why It MUST Fail</th>
                            <th>Mitigation in Code</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><code>alg: &quot;none&quot;</code></td>
                            <td>Unsigned tokens cannot be accepted under any circumstances.</td>
                            <td><code>algorithms=[&quot;RS256&quot;]</code></td>
                          </tr>
                          <tr>
                            <td><code>HS256 Key Confusion</code></td>
                            <td>Public RSA key cannot be repurposed as an HMAC secret (CVE-2015-9235).</td>
                            <td><code>algorithms=[&quot;RS256&quot;]</code></td>
                          </tr>
                          <tr>
                            <td><code>Tampered Payload</code></td>
                            <td>Modifying even 1 byte in claims invalidates the digital signature.</td>
                            <td>RSA signature verification</td>
                          </tr>
                          <tr>
                            <td><code>Expired Token</code></td>
                            <td>Old tokens cannot be replayed indefinitely.</td>
                            <td><code>exp</code> claim check</td>
                          </tr>
                          <tr>
                            <td><code>Wrong Issuer / Audience</code></td>
                            <td>Prevents rogue IdPs and cross-service token substitution.</td>
                            <td><code>iss</code> and <code>aud</code> checks</td>
                          </tr>
                          <tr>
                            <td><code>Foreign / Unknown kid</code></td>
                            <td>Signatures created with attacker-generated keys must be rejected.</td>
                            <td>KeyStore lookup by <code>kid</code></td>
                          </tr>
                          <tr>
                            <td><code>Key Rotation Overlap</code></td>
                            <td>Old tokens remain valid during rotation window until actively retired.</td>
                            <td>Multi-key JWKS publishing</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 10: Interview Talking Points */}
                  <section id="whw-interview-points">
                    <h2>10. Interview Talking Points Checklist</h2>
                    <div className="guide-grid-two">
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>1. Why RS256 over HS256:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Asymmetric signing decouples token issuance from verification. 50 microservices can verify tokens with public keys without possessing the power to forge them.
                        </p>
                      </div>
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>2. What is CVE-2015-9235:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Algorithm confusion where an attacker changes the header to HS256 and signs with the server&apos;s public RSA key. Defended by pinning <code>algorithms=[&quot;RS256&quot;]</code>.
                        </p>
                      </div>
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>3. What the <code>kid</code> header does:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Key ID tells the verifier which public key in the JWKS signed the token, enabling zero-downtime key rotation.
                        </p>
                      </div>
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>4. 401 vs 403 Distinction:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          401 means unauthenticated (&quot;I don&apos;t know who you are&quot;). 403 means unauthorized (&quot;I know who you are, but the answer is no&quot;).
                        </p>
                      </div>
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>5. Key Rotation with Overlap Window:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          During rotation, JWKS publishes both old and new public keys so in-flight tokens remain valid until expiration TTL.
                        </p>
                      </div>
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>6. The Docker Networking Split:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Browser sees <code>localhost:8080</code> (token iss) while API container reaches <code>keycloak:8080</code> (JWKS url) over bridge network.
                        </p>
                      </div>
                    </div>
                  </section>
                </article>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* TAB 2: PHASE 1 KEYCLOAK IDP & PROTECTED API SIMULATOR         */}
        {/* ============================================================= */}
        {activeTab === 'phase-1' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              {/* Persona Selector Card */}
              <div className="standalone-card" style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span className="control-label" style={{ display: 'block', marginBottom: '4px' }}>
                      Step 1: Select Active User Identity (Phase 1 Keycloak Realm)
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                      Identity: {personaP1.name} · Role: <code>{personaP1.role}</code> · Group: <code>{personaP1.group}</code>
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="tag" style={{ font: '10px var(--mono)' }}>Roundtrip: 14ms</span>
                    <span className="tag" style={{ font: '10px var(--mono)', color: personaP1.tokenValid ? 'var(--teal)' : 'var(--red)' }}>
                      {personaP1.tokenValid ? 'VALID OIDC TOKEN' : personaP1.isAttacker ? 'ATTACK / TAMPERED' : 'UNAUTHENTICATED'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  {(Object.keys(personasPhase1) as AuthPersona[]).map((pKey) => {
                    const p = personasPhase1[pKey]
                    const isSelected = selectedPersonaP1 === pKey
                    return (
                      <button
                        key={pKey}
                        type="button"
                        onClick={() => setSelectedPersonaP1(pKey)}
                        className={`standalone-scenario-btn ${isSelected ? 'active' : ''} ${p.isAttacker ? 'is-attack' : ''}`}
                        style={{ padding: '12px 14px' }}
                      >
                        <span className="method-pill">
                          {pKey === 'farmer' && '🌾 FARMER'}
                          {pKey === 'service_provider' && '🚜 CONTRACTOR'}
                          {pKey === 'admin' && '🛡️ ADMIN'}
                          {pKey === 'anonymous' && '👤 GUEST'}
                          {pKey === 'tampered' && '🦹 ATTACKER'}
                        </span>
                        <strong style={{ marginTop: '4px' }}>{p.name.split(' ')[0]}</strong>
                        <small>{p.role}</small>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Endpoint Selector Card */}
              <div className="standalone-card" style={{ padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span className="control-label" style={{ display: 'block', marginBottom: '4px' }}>
                      Step 2: Probe API Endpoint (Protected Resource Server)
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                      {endpointP1.method} {endpointP1.path} — {endpointP1.label}
                    </strong>
                  </div>
                  <span className="tag" style={{ font: '10px var(--mono)' }}>
                    Required: {endpointP1.isPublic ? 'None (Public)' : endpointP1.requiredRoles.join(' | ')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  {(Object.keys(endpointsPhase1) as AuthEndpoint[]).map((eKey) => {
                    const ep = endpointsPhase1[eKey]
                    const isSelected = selectedEndpointP1 === eKey
                    return (
                      <button
                        key={eKey}
                        type="button"
                        onClick={() => setSelectedEndpointP1(eKey)}
                        className={`standalone-scenario-btn ${isSelected ? 'active' : ''}`}
                        style={{ padding: '10px 12px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <span className="method-pill" style={{ color: ep.method === 'POST' ? 'var(--amber)' : 'var(--teal)' }}>
                            {ep.method}
                          </span>
                          <span style={{ font: '9px var(--mono)', color: ep.isPublic ? 'var(--teal)' : 'var(--faint)' }}>
                            {ep.isPublic ? 'PUBLIC' : 'RBAC GUARDED'}
                          </span>
                        </div>
                        <strong style={{ marginTop: '4px', fontSize: '12px' }}>{ep.path}</strong>
                        <small>{ep.description}</small>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Embedded Phase 1 Topology Diagram with Diagram Mode Switcher */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="control-label" style={{ margin: 0 }}>
                    Phase 1 Live Topology &amp; Validation Engine
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className={`button ${p1DiagramMode === 'live-topology' ? 'primary' : ''}`}
                      style={{ fontSize: '10px', padding: '4px 8px' }}
                      onClick={() => setP1DiagramMode('live-topology')}
                    >
                      ⚡ 1. Live Keycloak Network
                    </button>
                    <button
                      type="button"
                      className={`button ${p1DiagramMode === 'architecture' ? 'primary' : ''}`}
                      style={{ fontSize: '10px', padding: '4px 8px' }}
                      onClick={() => setP1DiagramMode('architecture')}
                    >
                      🏛️ 2. Issuer vs API
                    </button>
                    <button
                      type="button"
                      className={`button ${p1DiagramMode === 'validation-pipeline' ? 'primary' : ''}`}
                      style={{ fontSize: '10px', padding: '4px 8px' }}
                      onClick={() => setP1DiagramMode('validation-pipeline')}
                    >
                      🔍 3. 6-Step Validation
                    </button>
                    <button
                      type="button"
                      className={`button ${p1DiagramMode === 'hostname-split' ? 'primary' : ''}`}
                      style={{ fontSize: '10px', padding: '4px 8px' }}
                      onClick={() => setP1DiagramMode('hostname-split')}
                    >
                      🌐 4. Hostname Split
                    </button>
                  </div>
                </div>

                <AuthTopologyMap
                  phase="phase-1"
                  persona={selectedPersonaP1}
                  endpoint={selectedEndpointP1}
                  decision={decisionP1}
                  diagramMode={p1DiagramMode}
                  onSelectDiagramMode={(mode) => setP1DiagramMode(mode)}
                />
              </div>

              {/* Lower Inspection Grid: Terminal Trace + Decoded Claims */}
              <div className="standalone-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                {/* Live Inspection Terminal */}
                <div className="hero-terminal" style={{ margin: 0, height: '100%', minHeight: '440px' }}>
                  <div className="term-bar">
                    <span className="term-dot" />
                    <span className="term-dot" />
                    <span className="term-dot" />
                    <span className="term-title">auth-trace / phase-1 / {personaP1.id} / {endpointP1.path}</span>
                  </div>
                  <div className="term-body" style={{ font: '12px/1.55 var(--mono)' }}>
                    <div style={{ color: 'var(--muted)', marginBottom: '8px' }}>
                      # Phase 1 Request Simulation via cURL CLI:
                    </div>
                    <div style={{ color: 'var(--text)', marginBottom: '12px' }}>
                      $ curl -s -i -X {endpointP1.method} &quot;http://localhost:8000{endpointP1.path}&quot; \{'\n'}
                      {personaP1.id !== 'anonymous' && (
                        <span>&nbsp;&nbsp;-H &quot;Authorization: Bearer eyJhbGci...{personaP1.role}&quot;{'\n'}</span>
                      )}
                      &nbsp;&nbsp;-H &quot;Accept: application/json&quot;
                    </div>

                    <div style={{ color: 'var(--muted)', borderTop: '1px solid var(--line-soft)', paddingTop: '10px', marginBottom: '8px' }}>
                      # 6-Step Server Verification Decision Matrix:
                    </div>
                    <div>1. Inbound Request: <span style={{ color: 'var(--teal)' }}>{endpointP1.method} {endpointP1.path}</span></div>

                    {endpointP1.isPublic ? (
                      <div style={{ color: 'var(--teal)' }}>
                        2. Route flagged @public_route ➔ Bypassing JWT validation gate (200 OK)
                      </div>
                    ) : personaP1.id === 'anonymous' ? (
                      <div style={{ color: 'var(--red)' }}>
                        2. Missing Authorization header ➔ 401 Unauthorized (&quot;Bearer token required&quot;)
                      </div>
                    ) : personaP1.isAttacker ? (
                      <div style={{ color: 'var(--red)' }}>
                        2. RS256 signature verification FAILED!{'\n'}
                        &nbsp;&nbsp;[ATTACK DETECTED] Signature bytes altered without Keycloak private RSA key.
                      </div>
                    ) : (
                      <>
                        <div style={{ color: 'var(--teal)' }}>
                          2. Token present ➔ Matching public RSA cert fetched from Keycloak JWKS (kid: kc-rsa-key-2026)
                        </div>
                        <div style={{ color: 'var(--teal)' }}>
                          3. RS256 signature verified against public key ✓
                        </div>
                        <div style={{ color: 'var(--teal)' }}>
                          4. Claims verified: iss=http://localhost:8080/realms/authlab, aud=authlab-api, exp valid ✓
                        </div>
                        <div>
                          5. RBAC Policy Check: user has role <code>[{personaP1.role}]</code> vs required <code>{JSON.stringify(endpointP1.requiredRoles)}</code>
                        </div>
                        {decisionP1 === 'ALLOW' ? (
                          <div style={{ color: 'var(--teal)' }}>
                            6. Role authorization PASSED ✓ ➔ Executing authorized business logic (Roundtrip: 14ms)
                          </div>
                        ) : (
                          <div style={{ color: 'var(--red)' }}>
                            6. Role authorization REJECTED ✗ ➔ 403 Forbidden (&quot;Access denied for role {personaP1.role}&quot;)
                          </div>
                        )}
                      </>
                    )}

                    <div style={{ marginTop: '14px', borderTop: '1px solid var(--line-soft)', paddingTop: '10px' }}>
                      <span className="term-faint">HTTP STATUS: </span>
                      <strong style={{ color: decisionP1 === 'ALLOW' ? 'var(--teal)' : decisionP1 === 'DENY_401' ? 'var(--amber)' : 'var(--red)' }}>
                        {decisionP1 === 'ALLOW' && 'HTTP/1.1 200 OK'}
                        {decisionP1 === 'DENY_401' && 'HTTP/1.1 401 UNAUTHORIZED'}
                        {decisionP1 === 'DENY_403' && 'HTTP/1.1 403 FORBIDDEN'}
                      </strong>
                    </div>

                    <div style={{ marginTop: '6px' }}>
                      <span className="term-faint">RESPONSE BODY:</span>
                      <pre style={{ margin: '4px 0 0', color: decisionP1 === 'ALLOW' ? 'var(--teal)' : 'var(--red)', font: '11px/1.4 var(--mono)' }}>
                        {decisionP1 === 'ALLOW' && endpointP1.id === 'crops' && JSON.stringify({
                          status: 'success',
                          farmer: 'Ramesh',
                          plots: [
                            { id: 'PLOT-01', crop: 'Organic Wheat', acreage: 12.5, yield_kg: 8400, health: 'optimal' },
                            { id: 'PLOT-02', crop: 'Soybean', acreage: 8.0, yield_kg: 5200, health: 'good' },
                          ],
                          latency_ms: 14,
                        }, null, 2)}
                        {decisionP1 === 'ALLOW' && endpointP1.id === 'services' && JSON.stringify({
                          status: 'success',
                          provider: 'Kiran AgriTech',
                          fleet: [
                            { id: 'DRONE-X4', type: 'Sprayer', status: 'available', hourly_rate: 1200 },
                            { id: 'HARV-09', type: 'Combine Harvester', status: 'in-mission', battery: '78%' },
                          ],
                        }, null, 2)}
                        {decisionP1 === 'ALLOW' && endpointP1.id === 'me' && JSON.stringify({
                          username: personaP1.id,
                          email: `${personaP1.id}@farmsight360.com`,
                          roles: [personaP1.role],
                          issuer: 'http://localhost:8080/realms/authlab',
                        }, null, 2)}
                        {decisionP1 === 'ALLOW' && endpointP1.id === 'public' && JSON.stringify({
                          status: 'healthy',
                          auth_mode: 'oidc-keycloak-26',
                          timestamp: new Date().toISOString(),
                        }, null, 2)}
                        {decisionP1 === 'ALLOW' && (endpointP1.id === 'admin-users' || endpointP1.id === 'reset-pwd') && JSON.stringify({
                          status: 'success',
                          action: endpointP1.id,
                          executed_by: personaP1.id,
                          elevated: true,
                        }, null, 2)}
                        {decisionP1 === 'DENY_401' && JSON.stringify({
                          detail: personaP1.id === 'anonymous' ? 'Missing Bearer token in Authorization header' : 'Invalid or tampered RS256 signature',
                          error: 'Unauthorized',
                          realm: 'authlab',
                        }, null, 2)}
                        {decisionP1 === 'DENY_403' && JSON.stringify({
                          detail: `Forbidden: role '${personaP1.role}' lacks required permissions [${endpointP1.requiredRoles.join(', ')}]`,
                          error: 'AccessDenied',
                          required_roles: endpointP1.requiredRoles,
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Decoded Token Inspector */}
                <div className="standalone-card" style={{ padding: '20px', height: '100%', minHeight: '440px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className="control-label" style={{ margin: 0 }}>Decoded JWT Claims &amp; Header</span>
                    <button
                      type="button"
                      className="button"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => copyToClipboard(JSON.stringify(tokenPayloadP1, null, 2), 'p1-token')}
                    >
                      {copiedCode === 'p1-token' ? '✓ Copied' : 'Copy JSON'}
                    </button>
                  </div>

                  {/* Header Box */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>JOSE HEADER</span>
                      <span style={{ fontSize: '10px', color: '#ff5d5d', fontFamily: 'var(--mono)' }}>alg: RS256 · typ: JWT</span>
                    </div>
                    <div className="code-block" style={{ margin: 0, padding: '10px', fontSize: '11px' }}>
                      <pre style={{ margin: 0, color: '#ff5d5d' }}>
                        {JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'kc-rsa-key-2026' }, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Payload Box */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>PAYLOAD CLAIMS</span>
                      <span style={{ fontSize: '10px', color: '#a78bfa', fontFamily: 'var(--mono)' }}>iss: authlab · sub: {personaP1.id}</span>
                    </div>
                    <div className="code-block" style={{ margin: 0, maxHeight: '230px', overflowY: 'auto', fontSize: '11px' }}>
                      <pre style={{ margin: 0, color: '#a78bfa' }}>
                        {JSON.stringify(personaP1.id !== 'anonymous' ? tokenPayloadP1 : { error: 'No Authorization Token' }, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line-soft)', fontSize: '11.5px', color: 'var(--muted)' }}>
                    <strong style={{ color: 'var(--text)' }}>Keycloak Setup Note:</strong> The <code>aud</code> claim is populated with <code>authlab-api</code> using a custom Audience protocol mapper in the realm settings.
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* TAB 3: PHASE 2 BUILD & BREAK JWT LAB (ATTACKS & 16 TESTS)     */}
        {/* ============================================================= */}
        {activeTab === 'phase-2' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              {/* Exploit Simulator Engine */}
              <div className="standalone-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <span className="control-label" style={{ display: 'block', marginBottom: '8px' }}>
                  Phase 2 Cryptographic Exploit Engine
                </span>
                <h2 style={{ fontSize: '20px', margin: '0 0 12px' }}>
                  JWT Attack &amp; Defense Simulator: Naive vs Hardened Verifier
                </h2>
                <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6' }}>
                  Phase 2 contrasts <strong>vulnerable implementations</strong> (<code>naive_verify_token</code>) against
                  <strong> production hardened verifiers</strong> (<code>verify_token</code>). Click any attack exploit below to simulate
                  the exploit and observe why naive servers get breached while hardened servers remain protected!
                </p>

                {/* 6 Exploits Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  {/* Exploit 1: alg: none */}
                  <div
                    onClick={() => setActiveExploit(activeExploit === 'none' ? null : 'none')}
                    className="guide-box"
                    style={{
                      cursor: 'pointer',
                      borderLeft: `4px solid ${activeExploit === 'none' ? 'var(--red)' : 'var(--line)'}`,
                      background: activeExploit === 'none' ? 'rgba(255, 93, 93, 0.08)' : 'rgba(15, 21, 29, 0.6)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ margin: 0, color: activeExploit === 'none' ? 'var(--red)' : 'var(--text)' }}>
                        1. alg: &quot;none&quot; Signature Stripping
                      </strong>
                      <span className="tag" style={{ font: '9px var(--mono)' }}>{activeExploit === 'none' ? 'TRIGGERED' : 'ARM'}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Attacker sets <code>&quot;alg&quot;: &quot;none&quot;</code> and strips signature. Naive verifiers accept unsigned tokens as valid admin!
                    </p>
                  </div>

                  {/* Exploit 2: CVE-2015-9235 Key Confusion */}
                  <div
                    onClick={() => setActiveExploit(activeExploit === 'hs256' ? null : 'hs256')}
                    className="guide-box"
                    style={{
                      cursor: 'pointer',
                      borderLeft: `4px solid ${activeExploit === 'hs256' ? 'var(--red)' : 'var(--line)'}`,
                      background: activeExploit === 'hs256' ? 'rgba(255, 93, 93, 0.08)' : 'rgba(15, 21, 29, 0.6)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ margin: 0, color: activeExploit === 'hs256' ? 'var(--red)' : 'var(--text)' }}>
                        2. CVE-2015-9235 (HS256 Key Confusion)
                      </strong>
                      <span className="tag" style={{ font: '9px var(--mono)' }}>{activeExploit === 'hs256' ? 'TRIGGERED' : 'ARM'}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Attacker downloads public RSA PEM key and passes it as an HMAC secret for HS256! Naive servers verify it using the public key string.
                    </p>
                  </div>

                  {/* Exploit 3: Payload Tamper */}
                  <div
                    onClick={() => setActiveExploit(activeExploit === 'tamper' ? null : 'tamper')}
                    className="guide-box"
                    style={{
                      cursor: 'pointer',
                      borderLeft: `4px solid ${activeExploit === 'tamper' ? 'var(--red)' : 'var(--line)'}`,
                      background: activeExploit === 'tamper' ? 'rgba(255, 93, 93, 0.08)' : 'rgba(15, 21, 29, 0.6)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ margin: 0, color: activeExploit === 'tamper' ? 'var(--red)' : 'var(--text)' }}>
                        3. Payload Privilege Escalation
                      </strong>
                      <span className="tag" style={{ font: '9px var(--mono)' }}>{activeExploit === 'tamper' ? 'TRIGGERED' : 'ARM'}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Modifies user payload to inject <code>roles: [&quot;admin&quot;]</code> without the private RSA key. Digital signature check catches mismatch.
                    </p>
                  </div>

                  {/* Exploit 4: Rogue Key Substitution */}
                  <div
                    onClick={() => setActiveExploit(activeExploit === 'rogue-key' ? null : 'rogue-key')}
                    className="guide-box"
                    style={{
                      cursor: 'pointer',
                      borderLeft: `4px solid ${activeExploit === 'rogue-key' ? 'var(--red)' : 'var(--line)'}`,
                      background: activeExploit === 'rogue-key' ? 'rgba(255, 93, 93, 0.08)' : 'rgba(15, 21, 29, 0.6)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ margin: 0, color: activeExploit === 'rogue-key' ? 'var(--red)' : 'var(--text)' }}>
                        4. Rogue Key Substitution (Foreign kid)
                      </strong>
                      <span className="tag" style={{ font: '9px var(--mono)' }}>{activeExploit === 'rogue-key' ? 'TRIGGERED' : 'ARM'}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Signs token with attacker&apos;s own private RSA key. Rejected by KeyStore because the key ID is not registered in JWKS.
                    </p>
                  </div>

                  {/* Exploit 5: Expired Token Replay */}
                  <div
                    onClick={() => setActiveExploit(activeExploit === 'expired' ? null : 'expired')}
                    className="guide-box"
                    style={{
                      cursor: 'pointer',
                      borderLeft: `4px solid ${activeExploit === 'expired' ? 'var(--red)' : 'var(--line)'}`,
                      background: activeExploit === 'expired' ? 'rgba(255, 93, 93, 0.08)' : 'rgba(15, 21, 29, 0.6)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ margin: 0, color: activeExploit === 'expired' ? 'var(--red)' : 'var(--text)' }}>
                        5. Expired Token Replay Attack
                      </strong>
                      <span className="tag" style={{ font: '9px var(--mono)' }}>{activeExploit === 'expired' ? 'TRIGGERED' : 'ARM'}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Replays a valid token with <code>exp: -1800s</code>. Naive servers omitting expiration verification allow indefinitely reused sessions!
                    </p>
                  </div>

                  {/* Exploit 6: KeyStore Rotation & Overlap */}
                  <div
                    onClick={() => {
                      if (!keyRotated) setKeyRotated(true)
                      else if (!keyRetired) setKeyRetired(true)
                      else {
                        setKeyRotated(false)
                        setKeyRetired(false)
                      }
                    }}
                    className="guide-box"
                    style={{
                      cursor: 'pointer',
                      borderLeft: `4px solid ${keyRotated ? 'var(--teal)' : 'var(--line)'}`,
                      background: keyRotated ? 'rgba(79, 209, 197, 0.08)' : 'rgba(15, 21, 29, 0.6)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ margin: 0, color: keyRotated ? 'var(--teal)' : 'var(--text)' }}>
                        6. Zero-Downtime KeyStore Rotation
                      </strong>
                      <span className="tag" style={{ font: '9px var(--mono)' }}>
                        {!keyRotated ? 'KEY 1 ACTIVE' : !keyRetired ? 'ROTATED (DUAL-KEY)' : 'RETIRED (KEY 2 ONLY)'}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Simulates <code>store.rotate()</code> and <code>store.retire()</code>. Demonstrates dual-key overlap windows where both keys are published in JWKS.
                    </p>
                  </div>
                </div>

                {/* Persona & Endpoint Pickers for Phase 2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  {/* Persona Picker */}
                  <div>
                    <span className="control-label" style={{ display: 'block', marginBottom: '8px' }}>Active User Identity</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(Object.keys(personasPhase2) as AuthPersona[]).map((pKey) => {
                        const p = personasPhase2[pKey]
                        const isSelected = selectedPersonaP2 === pKey
                        return (
                          <button
                            key={pKey}
                            type="button"
                            onClick={() => {
                              setSelectedPersonaP2(pKey)
                              if (p.isAttacker) setActiveExploit('tamper')
                              else setActiveExploit(null)
                            }}
                            className={`button ${isSelected ? 'primary' : ''}`}
                            style={{ fontSize: '11px', padding: '6px 10px' }}
                          >
                            {pKey === 'alice' && '👩‍💻 Alice (Viewer)'}
                            {pKey === 'drench' && '🧑‍💻 Drench (Dev)'}
                            {pKey === 'admin' && '🛡️ Bob (Admin)'}
                            {pKey === 'anonymous' && '👤 Anonymous'}
                            {pKey === 'mallory' && '🦹 Mallory (Attacker)'}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Endpoint Picker */}
                  <div>
                    <span className="control-label" style={{ display: 'block', marginBottom: '8px' }}>Target Resource Route</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(Object.keys(endpointsPhase2) as AuthEndpoint[]).map((eKey) => {
                        const ep = endpointsPhase2[eKey]
                        const isSelected = selectedEndpointP2 === eKey
                        return (
                          <button
                            key={eKey}
                            type="button"
                            onClick={() => setSelectedEndpointP2(eKey)}
                            className={`button ${isSelected ? 'primary' : ''}`}
                            style={{ fontSize: '11px', padding: '6px 10px' }}
                          >
                            {ep.method} {ep.path}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Embedded Phase 2 Topology Diagram with Mode Switcher */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <span className="control-label" style={{ margin: 0 }}>
                      Phase 2 Cryptographic Attack &amp; Rotation Topology
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className={`button ${p2DiagramMode === 'live-topology' ? 'primary' : ''}`}
                        style={{ fontSize: '10px', padding: '4px 8px' }}
                        onClick={() => setP2DiagramMode('live-topology')}
                      >
                        ⚡ 1. Live Exploit Flow
                      </button>
                      <button
                        type="button"
                        className={`button ${p2DiagramMode === 'attack-matrix' ? 'primary' : ''}`}
                        style={{ fontSize: '10px', padding: '4px 8px' }}
                        onClick={() => setP2DiagramMode('attack-matrix')}
                      >
                        💥 2. Attack Matrix vs Defenses
                      </button>
                      <button
                        type="button"
                        className={`button ${p2DiagramMode === 'key-rotation' ? 'primary' : ''}`}
                        style={{ fontSize: '10px', padding: '4px 8px' }}
                        onClick={() => setP2DiagramMode('key-rotation')}
                      >
                        🔄 3. Key Rotation Overlap
                      </button>
                      <button
                        type="button"
                        className={`button ${p2DiagramMode === 'validation-pipeline' ? 'primary' : ''}`}
                        style={{ fontSize: '10px', padding: '4px 8px' }}
                        onClick={() => setP2DiagramMode('validation-pipeline')}
                      >
                        🔍 4. 6-Step Validation
                      </button>
                    </div>
                  </div>

                  <AuthTopologyMap
                    phase="phase-2"
                    persona={selectedPersonaP2}
                    endpoint={selectedEndpointP2}
                    decision={decisionP2}
                    activeExploit={activeExploit}
                    diagramMode={p2DiagramMode}
                    onSelectDiagramMode={(mode) => setP2DiagramMode(mode)}
                  />
                </div>

                {/* Side-by-Side Verifier Contrast */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  {/* Naive Verifier Output */}
                  <div className="standalone-card" style={{ padding: '16px', borderTop: '3px solid var(--red)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: 'var(--red)', fontSize: '13px' }}>
                        Naive Verifier: naive_verify_token()
                      </strong>
                      <span className="tag" style={{ color: 'var(--red)', font: '8px var(--mono)' }}>VULNERABLE (TRUSTS ALG)</span>
                    </div>
                    <div style={{ font: '11px/1.5 var(--mono)', padding: '10px', background: '#090d12', borderRadius: '6px' }}>
                      {activeExploit === 'none' && (
                        <div style={{ color: 'var(--red)' }}>
                          ⚠️ STATUS: EXPLOITED (200 OK){'\n'}
                          [VULNERABILITY] alg=&quot;none&quot; accepted without signature check!{'\n'}
                          User authorized as admin with zero authentication!
                        </div>
                      )}
                      {activeExploit === 'hs256' && (
                        <div style={{ color: 'var(--red)' }}>
                          ⚠️ STATUS: EXPLOITED (200 OK){'\n'}
                          [CVE-2015-9235] Public RSA PEM key treated as HMAC secret!{'\n'}
                          Attacker successfully forged token with roles: [&quot;admin&quot;]!
                        </div>
                      )}
                      {activeExploit === 'tamper' && (
                        <div style={{ color: 'var(--red)' }}>
                          ❌ STATUS: Signature Mismatch (InvalidSignatureError)
                        </div>
                      )}
                      {activeExploit === 'expired' && (
                        <div style={{ color: 'var(--red)' }}>
                          ⚠️ STATUS: EXPLOITED! Naive verifier has verify_exp=False!
                        </div>
                      )}
                      {activeExploit === 'rogue-key' && (
                        <div style={{ color: 'var(--red)' }}>
                          ❌ STATUS: Verification failed against store
                        </div>
                      )}
                      {!activeExploit && (
                        <div style={{ color: 'var(--muted)' }}>
                          Awaiting exploit trigger. Click an attack above to contrast with hardened verifier.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hardened Verifier Output */}
                  <div className="standalone-card" style={{ padding: '16px', borderTop: '3px solid var(--teal)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: 'var(--teal)', fontSize: '13px' }}>
                        Hardened Verifier: verify_token()
                      </strong>
                      <span className="tag" style={{ color: 'var(--teal)', font: '8px var(--mono)' }}>SECURE (PINNED RS256)</span>
                    </div>
                    <div style={{ font: '11px/1.5 var(--mono)', padding: '10px', background: '#090d12', borderRadius: '6px' }}>
                      {activeExploit === 'none' && (
                        <div style={{ color: 'var(--teal)' }}>
                          🛡️ STATUS: ATTACK BLOCKED (401 Unauthorized){'\n'}
                          [DEFENSE] jwt.exceptions.InvalidTokenError: &apos;none&apos; is not an allowed algorithm.{'\n'}
                          Strict allow-list pinned to algorithms=[&quot;RS256&quot;].
                        </div>
                      )}
                      {activeExploit === 'hs256' && (
                        <div style={{ color: 'var(--teal)' }}>
                          🛡️ STATUS: ATTACK BLOCKED (401 Unauthorized){'\n'}
                          [DEFENSE] Algorithm &apos;HS256&apos; rejected by RS256 allow-list.{'\n'}
                          Asymmetric key cannot be treated as HMAC secret (CVE mitigated).
                        </div>
                      )}
                      {activeExploit === 'tamper' && (
                        <div style={{ color: 'var(--teal)' }}>
                          🛡️ STATUS: ATTACK BLOCKED (401 Unauthorized){'\n'}
                          [DEFENSE] jwt.exceptions.InvalidSignatureError.{'\n'}
                          Altering payload bytes broke the 2048-bit RSA digital signature.
                        </div>
                      )}
                      {activeExploit === 'expired' && (
                        <div style={{ color: 'var(--teal)' }}>
                          🛡️ STATUS: ATTACK BLOCKED (401 Unauthorized){'\n'}
                          [DEFENSE] jwt.exceptions.ExpiredSignatureError.{'\n'}
                          Mandatory exp claim check prevented token replay.
                        </div>
                      )}
                      {activeExploit === 'rogue-key' && (
                        <div style={{ color: 'var(--teal)' }}>
                          🛡️ STATUS: ATTACK BLOCKED (401 Unauthorized){'\n'}
                          [DEFENSE] Unknown kid or foreign key rejected by KeyStore.
                        </div>
                      )}
                      {!activeExploit && (
                        <div style={{ color: 'var(--teal)' }}>
                          ✓ Standard Token: Verified statelessly via cached JWKS public key. Status: 200 OK.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Raw Color-Coded Token Preview */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="control-label" style={{ margin: 0 }}>Serialized Bearer Token (Base64URL)</span>
                    <span style={{ font: '10px var(--mono)', color: activeExploit ? 'var(--red)' : 'var(--teal)' }}>
                      {activeExploit ? `⚠️ EXPLOIT PAYLOAD: [${activeExploit.toUpperCase()}]` : '✓ VALID RS256 TOKEN'}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '14px 16px',
                      background: '#090d12',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      font: '11.5px/1.6 var(--mono)',
                      wordBreak: 'break-all',
                    }}
                  >
                    <span style={{ color: '#ff5d5d' }}>{btoa(JSON.stringify(tokenHeaderP2)).replace(/=/g, '')}</span>
                    <span style={{ color: 'var(--muted)' }}>.</span>
                    <span style={{ color: '#a78bfa' }}>{btoa(JSON.stringify(tokenPayloadP2)).replace(/=/g, '')}</span>
                    <span style={{ color: 'var(--muted)' }}>.</span>
                    <span style={{ color: activeExploit ? 'var(--red)' : '#38bdf8' }}>{tokenSignatureP2}</span>
                  </div>
                </div>

                {/* 16-Exploit Unit Test Matrix Embedded in Phase 2 */}
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
                  <span className="control-label" style={{ display: 'block', marginBottom: '8px' }}>
                    Automated Exploit Suite
                  </span>
                  <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>
                    Phase 2 Automated Security Unit Test Matrix (16/16 Passed)
                  </h3>

                  <div className="guide-table-wrap" style={{ margin: 0 }}>
                    <table className="guide-table">
                      <thead>
                        <tr>
                          <th>Test Function</th>
                          <th>Attack Vector</th>
                          <th>Vulnerable (Naive) Result</th>
                          <th>Hardened (Production) Mitigation</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><code>test_valid_token_is_accepted</code></td>
                          <td>Happy Path</td>
                          <td>Accepted</td>
                          <td>Verified RS256 signature, exp, iss, aud</td>
                          <td style={{ color: 'var(--teal)' }}>PASSED ✓</td>
                        </tr>
                        <tr>
                          <td><code>test_expired_token_rejected</code></td>
                          <td>Token Replay</td>
                          <td style={{ color: 'var(--red)' }}>Ignored if verify_exp=False</td>
                          <td style={{ color: 'var(--teal)' }}>Raises jwt.ExpiredSignatureError</td>
                          <td style={{ color: 'var(--teal)' }}>PASSED ✓</td>
                        </tr>
                        <tr>
                          <td><code>test_wrong_audience_rejected</code></td>
                          <td>Audience Confusion</td>
                          <td style={{ color: 'var(--red)' }}>Cross-service token reuse</td>
                          <td style={{ color: 'var(--teal)' }}>Raises jwt.InvalidAudienceError</td>
                          <td style={{ color: 'var(--teal)' }}>PASSED ✓</td>
                        </tr>
                        <tr>
                          <td><code>test_wrong_issuer_rejected</code></td>
                          <td>Rogue IdP</td>
                          <td style={{ color: 'var(--red)' }}>Tokens from evil.example accepted</td>
                          <td style={{ color: 'var(--teal)' }}>Raises jwt.InvalidIssuerError</td>
                          <td style={{ color: 'var(--teal)' }}>PASSED ✓</td>
                        </tr>
                        <tr>
                          <td><code>test_tampered_payload_rejected</code></td>
                          <td>Privilege Escalation</td>
                          <td style={{ color: 'var(--red)' }}>Admin role injected in claims</td>
                          <td style={{ color: 'var(--teal)' }}>Raises jwt.InvalidSignatureError</td>
                          <td style={{ color: 'var(--teal)' }}>PASSED ✓</td>
                        </tr>
                        <tr>
                          <td><code>test_alg_none_rejected</code></td>
                          <td>RFC 7519 Signature Strip</td>
                          <td style={{ color: 'var(--red)' }}>Unsigned token accepted as admin!</td>
                          <td style={{ color: 'var(--teal)' }}>Blocked: algorithms=[&quot;RS256&quot;] allow-list</td>
                          <td style={{ color: 'var(--teal)' }}>PASSED ✓</td>
                        </tr>
                        <tr>
                          <td><code>test_hs256_key_confusion</code></td>
                          <td>CVE-2015-9235 (Public Key HMAC)</td>
                          <td style={{ color: 'var(--red)' }}>Public RSA PEM used as HMAC secret!</td>
                          <td style={{ color: 'var(--teal)' }}>Blocked: symmetric algorithms strictly prohibited</td>
                          <td style={{ color: 'var(--teal)' }}>PASSED ✓</td>
                        </tr>
                        <tr>
                          <td><code>test_token_signed_attacker_key</code></td>
                          <td>Foreign Key Substitution</td>
                          <td style={{ color: 'var(--red)' }}>Self-signed attacker key accepted</td>
                          <td style={{ color: 'var(--teal)' }}>Signature mismatch against KeyStore</td>
                          <td style={{ color: 'var(--teal)' }}>PASSED ✓</td>
                        </tr>
                        <tr>
                          <td><code>test_rotation_until_retired</code></td>
                          <td>Zero-Downtime Rotation</td>
                          <td>Tokens break upon rotate</td>
                          <td style={{ color: 'var(--teal)' }}>Dual-key window; drops only on retire()</td>
                          <td style={{ color: 'var(--teal)' }}>PASSED ✓</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Defense Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
                    <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                      <strong>Defending CVE-2015-9235:</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                        Never allow the caller to specify the cryptographic algorithm. Always pass an explicit single-algorithm allow-list:
                        <code>algorithms=[&quot;RS256&quot;]</code>.
                      </p>
                    </div>

                    <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                      <strong>Key ID (kid) Matching:</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                        Always lookup the public certificate in the KeyStore by matching the token&apos;s <code>kid</code> header. Unknown or missing <code>kid</code> headers are rejected immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* TAB 4: PRODUCTION CONFIGS                                     */}
        {/* ============================================================= */}
        {activeTab === 'configs' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              <div className="standalone-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <span className="control-label" style={{ display: 'block', marginBottom: '4px' }}>Tested Artifacts (Phase 1 &amp; Phase 2)</span>
                    <h2 style={{ fontSize: '20px', margin: 0 }}>Infrastructure &amp; Security Test Configurations</h2>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'phase1-compose' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('phase1-compose')}
                      style={{ fontSize: '11px', padding: '6px 10px' }}
                    >
                      docker-compose.yml (Phase 1)
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'phase1-api' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('phase1-api')}
                      style={{ fontSize: '11px', padding: '6px 10px' }}
                    >
                      api/app.py (FastAPI)
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'phase2-auth' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('phase2-auth')}
                      style={{ fontSize: '11px', padding: '6px 10px' }}
                    >
                      jwtlab/auth.py
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'phase2-tests' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('phase2-tests')}
                      style={{ fontSize: '11px', padding: '6px 10px' }}
                    >
                      test_attacks.py (16 Tests)
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'demo-script' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('demo-script')}
                      style={{ fontSize: '11px', padding: '6px 10px' }}
                    >
                      demo.sh
                    </button>
                  </div>
                </div>

                {activeConfig === 'phase1-compose' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="control-label" style={{ margin: 0 }}>docker-compose.yml · Keycloak 26.1.3 + Postgres 16-alpine</span>
                      <button
                        type="button"
                        className="button"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => copyToClipboard(`services:
  postgres:
    image: postgres:16-alpine
    container_name: authlab-postgres
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-keycloak_secret}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak"]
      interval: 5s
      timeout: 3s
      retries: 5

  keycloak:
    image: quay.io/keycloak/keycloak:26.1.3
    container_name: authlab-keycloak
    command: start-dev --import-realm
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: \${POSTGRES_PASSWORD:-keycloak_secret}
      KEYCLOAK_ADMIN: \${KEYCLOAK_ADMIN:-admin}
      KEYCLOAK_ADMIN_PASSWORD: \${KEYCLOAK_ADMIN_PASSWORD:-admin}
    ports:
      - "127.0.0.1:8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./realm-export.json:/opt/keycloak/data/import/realm-export.json:ro

  api:
    build: ./api
    container_name: authlab-api
    ports:
      - "127.0.0.1:8000:8000"
    environment:
      TOKEN_ISSUER: "http://localhost:8080/realms/authlab"
      JWKS_URL: "http://keycloak:8080/realms/authlab/protocol/openid-connect/certs"
      AUDIENCE: "authlab-api"
    depends_on:
      - keycloak

volumes:
  postgres_data:`, 'compose')}
                      >
                        {copiedCode === 'compose' ? '✓ Copied' : 'Copy Compose YAML'}
                      </button>
                    </div>
                    <div className="code-block" style={{ margin: 0, maxHeight: '420px', overflowY: 'auto' }}>
                      <pre style={{ margin: 0, font: '11.5px/1.55 var(--mono)' }}>
{`services:
  postgres:
    image: postgres:16-alpine
    container_name: authlab-postgres
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-keycloak_secret}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"  # Bound to loopback interface for security
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak"]
      interval: 5s
      timeout: 3s
      retries: 5

  keycloak:
    image: quay.io/keycloak/keycloak:26.1.3
    container_name: authlab-keycloak
    command: start-dev --import-realm
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: \${POSTGRES_PASSWORD:-keycloak_secret}
      KEYCLOAK_ADMIN: \${KEYCLOAK_ADMIN:-admin}
      KEYCLOAK_ADMIN_PASSWORD: \${KEYCLOAK_ADMIN_PASSWORD:-admin}
    ports:
      - "127.0.0.1:8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./realm-export.json:/opt/keycloak/data/import/realm-export.json:ro

  api:
    build: ./api
    container_name: authlab-api
    ports:
      - "127.0.0.1:8000:8000"
    environment:
      TOKEN_ISSUER: "http://localhost:8080/realms/authlab"
      JWKS_URL: "http://keycloak:8080/realms/authlab/protocol/openid-connect/certs"
      AUDIENCE: "authlab-api"
    depends_on:
      - keycloak

volumes:
  postgres_data:`}
                      </pre>
                    </div>
                  </div>
                )}

                {activeConfig === 'phase1-api' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="control-label" style={{ margin: 0 }}>api/app.py · Resource Server 6-Step Validation</span>
                      <button
                        type="button"
                        className="button"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => copyToClipboard(`# api/app.py - FastAPI Resource Server
from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import requests

app = FastAPI(title="AuthLab Protected API")
security = HTTPBearer()

ISSUER = "http://localhost:8080/realms/authlab"
JWKS_URL = "http://keycloak:8080/realms/authlab/protocol/openid-connect/certs"
AUDIENCE = "authlab-api"

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        jwks = requests.get(JWKS_URL, timeout=3).json()
        public_key = None
        for key in jwks["keys"]:
            if key["kid"] == kid:
                public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                break
        if not public_key:
            raise HTTPException(status_code=401, detail="Signing key not found in JWKS")

        # 6-Step Validation Gate: Pinned RS256 algorithm prevents CVE-2015-9235
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            issuer=ISSUER,
            audience=AUDIENCE
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

@app.get("/api/me")
def me(user: dict = Depends(get_current_user)):
    return {"user": user["preferred_username"], "roles": user.get("realm_access", {}).get("roles", [])}`, 'api')}
                      >
                        {copiedCode === 'api' ? '✓ Copied' : 'Copy Python'}
                      </button>
                    </div>
                    <div className="code-block" style={{ margin: 0, maxHeight: '420px', overflowY: 'auto' }}>
                      <pre style={{ margin: 0, font: '11.5px/1.55 var(--mono)' }}>
{`# api/app.py - FastAPI Resource Server with Strict 6-Step Token Validation
from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import requests

app = FastAPI(title="AuthLab Protected API")
security = HTTPBearer()

ISSUER = "http://localhost:8080/realms/authlab"
JWKS_URL = "http://keycloak:8080/realms/authlab/protocol/openid-connect/certs"
AUDIENCE = "authlab-api"

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        # Step 2: Read kid from header
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        # Step 3: Fetch matching public key from JWKS
        jwks = requests.get(JWKS_URL, timeout=3).json()
        public_key = None
        for key in jwks["keys"]:
            if key["kid"] == kid:
                public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                break
        if not public_key:
            raise HTTPException(status_code=401, detail="Signing key not found in JWKS")

        # Step 4 & 5: RS256 verification and claim checks
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],  # Strict allow-list prevents CVE-2015-9235
            issuer=ISSUER,
            audience=AUDIENCE,
            options={"verify_exp": True}
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

@app.get("/api/me")
def me(user: dict = Depends(get_current_user)):
    return {"user": user["preferred_username"], "roles": user.get("realm_access", {}).get("roles", [])}`}
                      </pre>
                    </div>
                  </div>
                )}

                {activeConfig === 'phase2-auth' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="control-label" style={{ margin: 0 }}>jwtlab/auth.py · KeyStore, JWKS &amp; Dual Verifier Bench</span>
                      <button
                        type="button"
                        className="button"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => copyToClipboard(`# jwtlab/auth.py
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

class KeyStore:
    def __init__(self):
        self.keys = {}
        self.active_kid = None
        self.rotate()

    def rotate(self):
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        kid = f"key-{len(self.keys) + 1}"
        self.keys[kid] = private_key
        self.active_kid = kid
        return kid

    def retire(self, kid):
        if kid in self.keys and kid != self.active_kid:
            del self.keys[kid]

# Deliberately Vulnerable Verifier (Accepts alg from token header)
def naive_verify_token(token: str, key_store: KeyStore) -> dict:
    header = jwt.get_unverified_header(token)
    alg = header.get("alg")
    if alg == "none":
        return jwt.decode(token, options={"verify_signature": False})
    # Flawed: trusts caller algorithm header
    return jwt.decode(token, key_store.get_public_key(), algorithms=[alg])

# Production Hardened Verifier
def verify_token(token: str, key_store: KeyStore) -> dict:
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    public_key = key_store.get_public_key_by_kid(kid)
    return jwt.decode(token, public_key, algorithms=["RS256"], audience="authlab-api")`, 'jwtlab')}
                      >
                        {copiedCode === 'jwtlab' ? '✓ Copied' : 'Copy Python'}
                      </button>
                    </div>
                    <div className="code-block" style={{ margin: 0, maxHeight: '420px', overflowY: 'auto' }}>
                      <pre style={{ margin: 0, font: '11.5px/1.55 var(--mono)' }}>
{`# jwtlab/auth.py - Custom RSA KeyStore, JWKS Generator & Dual Verifiers
import jwt
import time
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

class KeyStore:
    """Manages RSA 2048-bit keypairs with zero-downtime rotation."""
    def __init__(self):
        self.keys = {}
        self.active_kid = None
        self.rotate()

    def rotate(self) -> str:
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        kid = f"key-{len(self.keys) + 1}"
        self.keys[kid] = private_key
        self.active_kid = kid
        return kid

    def retire(self, kid: str):
        if kid in self.keys and kid != self.active_kid:
            del self.keys[kid]

    def get_jwks(self) -> dict:
        """Publishes all active and overlapping public keys in RFC 7517 format."""
        jwk_keys = []
        for kid, priv in self.keys.items():
            pub_numbers = priv.public_key().public_numbers()
            jwk_keys.append({
                "kty": "RSA",
                "use": "sig",
                "alg": "RS256",
                "kid": kid,
                "n": jwt.utils.base64url_encode(pub_numbers.n.to_bytes(256, "big")).decode("utf-8"),
                "e": jwt.utils.base64url_encode(pub_numbers.e.to_bytes(3, "big")).decode("utf-8"),
            })
        return {"keys": jwk_keys}

def naive_verify_token(token: str, key_store: KeyStore) -> dict:
    """Deliberately vulnerable verifier that trusts the header algorithm."""
    header = jwt.get_unverified_header(token)
    alg = header.get("alg")
    if alg == "none":
        return jwt.decode(token, options={"verify_signature": False})
    # Vulnerable to CVE-2015-9235 if alg == "HS256"
    return jwt.decode(token, key_store.get_public_pem(), algorithms=[alg])

def verify_token(token: str, key_store: KeyStore) -> dict:
    """Production hardened verifier: pins RS256 algorithm and verifies claims."""
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    pub_key = key_store.get_public_key_by_kid(kid)
    return jwt.decode(
        token,
        pub_key,
        algorithms=["RS256"],  # Hardened single-algorithm allow-list
        audience="authlab-api",
        options={"verify_exp": True}
    )`}
                      </pre>
                    </div>
                  </div>
                )}

                {activeConfig === 'phase2-tests' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="control-label" style={{ margin: 0 }}>tests/test_attacks.py · 16 Automated Security Unit Tests</span>
                      <button
                        type="button"
                        className="button"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => copyToClipboard(`import pytest
import jwt
from jwtlab.auth import KeyStore, verify_token, naive_verify_token, issue_token

def test_alg_none_rejected(key_store):
    # Exploit: alg="none" signature strip
    token = issue_token(key_store, {"sub": "mallory", "roles": ["admin"]})
    h, p, _ = token.split(".")
    forged_token = f"{jwt.utils.base64url_encode(b'{\"alg\":\"none\",\"typ\":\"JWT\"}').decode()}.{p}."

    with pytest.raises(jwt.InvalidTokenError):
        verify_token(forged_token, key_store)

def test_hs256_key_confusion(key_store):
    # Exploit: CVE-2015-9235 public RSA PEM used as HMAC secret
    pub_pem = key_store.get_public_pem()
    payload = {"sub": "mallory", "roles": ["admin"], "aud": "authlab-api"}
    forged_token = jwt.encode(payload, pub_pem, algorithm="HS256")

    with pytest.raises(jwt.InvalidTokenError):
        verify_token(forged_token, key_store)

def test_tampered_payload_rejected(key_store):
    token = issue_token(key_store, {"sub": "alice", "roles": ["viewer"]})
    h, p, s = token.split(".")
    tampered_p = jwt.utils.base64url_encode(b'{"sub":"alice","roles":["admin"]}').decode()
    with pytest.raises(jwt.InvalidSignatureError):
        verify_token(f"{h}.{tampered_p}.{s}", key_store)`, 'tests')}
                      >
                        {copiedCode === 'tests' ? '✓ Copied' : 'Copy Pytest'}
                      </button>
                    </div>
                    <div className="code-block" style={{ margin: 0, maxHeight: '420px', overflowY: 'auto' }}>
                      <pre style={{ margin: 0, font: '11.5px/1.55 var(--mono)' }}>
{`# tests/test_attacks.py - 16 Pytest Security Unit Tests
import pytest
import jwt
from jwtlab.auth import KeyStore, verify_token, naive_verify_token, issue_token

@pytest.fixture
def key_store():
    return KeyStore()

def test_valid_token_is_accepted(key_store):
    token = issue_token(key_store, {"sub": "alice", "roles": ["viewer"]})
    claims = verify_token(token, key_store)
    assert claims["sub"] == "alice"

def test_expired_token_rejected(key_store):
    token = issue_token(key_store, {"sub": "alice"}, expires_in=-3600)
    with pytest.raises(jwt.ExpiredSignatureError):
        verify_token(token, key_store)

def test_alg_none_rejected(key_store):
    token = issue_token(key_store, {"sub": "mallory", "roles": ["admin"]})
    h, p, _ = token.split(".")
    forged = f"{jwt.utils.base64url_encode(b'{\"alg\":\"none\",\"typ\":\"JWT\"}').decode()}.{p}."
    with pytest.raises(jwt.InvalidTokenError):
        verify_token(forged, key_store)

def test_hs256_key_confusion(key_store):
    pub_pem = key_store.get_public_pem()
    payload = {"sub": "mallory", "roles": ["admin"], "aud": "authlab-api"}
    forged = jwt.encode(payload, pub_pem, algorithm="HS256")
    with pytest.raises(jwt.InvalidTokenError):
        verify_token(forged, key_store)

def test_rotation_until_retired(key_store):
    token1 = issue_token(key_store, {"sub": "alice"})
    new_kid = key_store.rotate()
    # Token 1 must remain valid during overlap window
    assert verify_token(token1, key_store)["sub"] == "alice"
    # Retire old key
    old_kid = [k for k in key_store.keys if k != new_kid][0]
    key_store.retire(old_kid)
    with pytest.raises(jwt.InvalidTokenError):
        verify_token(token1, key_store)`}
                      </pre>
                    </div>
                  </div>
                )}

                {activeConfig === 'demo-script' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="control-label" style={{ margin: 0 }}>demo.sh · Automated Verification Script</span>
                      <button
                        type="button"
                        className="button"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => copyToClipboard(`#!/usr/bin/env bash
set -euo pipefail

echo "=============================================="
echo " AuthLab End-to-End Demo & Verification Script "
echo "=============================================="

echo "[1/4] Starting Keycloak 26 and PostgreSQL..."
docker compose up -d postgres keycloak
docker compose exec postgres pg_isready -U keycloak

echo "[2/4] Testing Keycloak OIDC Token Issuance..."
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/authlab/protocol/openid-connect/token" \\
  -d "client_id=authlab-api" \\
  -d "username=admin" \\
  -d "password=admin" \\
  -d "grant_type=password" | jq -r .access_token)

echo "[3/4] Calling Protected API with Token..."
curl -i -H "Authorization: Bearer \$TOKEN" http://localhost:8000/api/me

echo "[4/4] Executing Phase 2 Security Exploit Suite..."
pytest -v tests/test_attacks.py
echo "All 16 exploit tests passed successfully!"`, 'demo')}
                      >
                        {copiedCode === 'demo' ? '✓ Copied' : 'Copy Script'}
                      </button>
                    </div>
                    <div className="code-block" style={{ margin: 0, maxHeight: '420px', overflowY: 'auto' }}>
                      <pre style={{ margin: 0, font: '11.5px/1.55 var(--mono)' }}>
{`#!/usr/bin/env bash
# demo.sh - End-to-end verification of Phase 1 and Phase 2
set -euo pipefail

echo "=============================================="
echo " AuthLab End-to-End Demo & Verification Script "
echo "=============================================="

echo "[1/4] Starting Keycloak 26 and PostgreSQL..."
docker compose up -d postgres keycloak
docker compose exec postgres pg_isready -U keycloak

echo "[2/4] Testing Keycloak OIDC Token Issuance..."
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/authlab/protocol/openid-connect/token" \\
  -d "client_id=authlab-api" \\
  -d "username=admin" \\
  -d "password=admin" \\
  -d "grant_type=password" | jq -r .access_token)

echo "[3/4] Calling Protected API with Token..."
curl -i -H "Authorization: Bearer \$TOKEN" http://localhost:8000/api/me

echo "[4/4] Executing Phase 2 Security Exploit Suite..."
pytest -v tests/test_attacks.py
echo "All 16 exploit tests passed successfully!"`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
