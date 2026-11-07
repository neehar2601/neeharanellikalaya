import { useState } from 'react'
import { NavBrand } from './NavBrand'
import { AuthTopologyMap, type AuthPersona, type AuthEndpoint, type DiagramMode } from './sandbox/AuthTopologyMap'

type ViewTab = 'simulator' | 'what-how-why' | 'jwt' | 'configs' | 'security'
type LabPhase = 'phase-1' | 'phase-2'
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
  const [activeTab, setActiveTab] = useState<ViewTab>('simulator')
  const [labPhase, setLabPhase] = useState<LabPhase>('phase-2')
  const [activeConfig, setActiveConfig] = useState<ConfigTab>('phase2-auth')
  const [diagramMode, setDiagramMode] = useState<DiagramMode>('architecture')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Simulation state
  const [selectedPersonaP1, setSelectedPersonaP1] = useState<AuthPersona>('farmer')
  const [selectedEndpointP1, setSelectedEndpointP1] = useState<AuthEndpoint>('crops')

  const [selectedPersonaP2, setSelectedPersonaP2] = useState<AuthPersona>('alice')
  const [selectedEndpointP2, setSelectedEndpointP2] = useState<AuthEndpoint>('users')

  // Phase 2 Exploit Simulator state
  const [activeExploit, setActiveExploit] = useState<'none' | 'hs256' | 'tamper' | 'expired' | 'rogue-key' | 'rotation' | null>(null)
  const [keyRotated, setKeyRotated] = useState(false)
  const [keyRetired, setKeyRetired] = useState(false)

  const isPhase2 = labPhase === 'phase-2'
  const personaMap = isPhase2 ? personasPhase2 : personasPhase1
  const endpointMap = isPhase2 ? endpointsPhase2 : endpointsPhase1

  const currentPersonaKey = isPhase2 ? selectedPersonaP2 : selectedPersonaP1
  const persona = personaMap[currentPersonaKey] || personaMap.alice || personaMap.farmer

  const currentEndpointKey = isPhase2 ? selectedEndpointP2 : selectedEndpointP1
  const endpoint = endpointMap[currentEndpointKey] || endpointMap.users || endpointMap.crops

  // Calculate access decision
  let decision: 'ALLOW' | 'DENY_401' | 'DENY_403' = 'ALLOW'

  if (endpoint.isPublic) {
    decision = 'ALLOW'
  } else if (!persona.tokenValid || persona.id === 'anonymous') {
    decision = 'DENY_401'
  } else if (persona.isAttacker || activeExploit) {
    decision = 'DENY_401' // Signature / exploit validation failure
  } else if (!endpoint.requiredRoles.includes(persona.role)) {
    decision = 'DENY_403' // RBAC role rejection
  } else {
    decision = 'ALLOW'
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(label)
    setTimeout(() => setCopiedCode(null), 2200)
  }

  // Token Simulation Claims
  const activeKid = keyRotated && !keyRetired ? '8f2d9c1b' : 'e7b1a49f'

  const tokenHeader = {
    alg: activeExploit === 'none' ? 'none' : activeExploit === 'hs256' ? 'HS256' : 'RS256',
    typ: 'JWT',
    kid: activeExploit === 'rogue-key' ? 'attacker-foreign-key' : activeKid,
  }

  const tokenPayload = {
    iss: isPhase2 ? 'http://localhost:5001' : 'http://localhost:8080/realms/authlab',
    aud: isPhase2 ? 'authlab-api' : 'authlab-api',
    sub: persona.id,
    roles: activeExploit === 'tamper' || activeExploit === 'none' || activeExploit === 'hs256'
      ? ['admin']
      : [persona.role],
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: activeExploit === 'expired' ? Math.floor(Date.now() / 1000) - 1800 : Math.floor(Date.now() / 1000) + 900,
    preferred_username: persona.id,
    email: `${persona.id}@${isPhase2 ? 'authlab.dev' : 'farmsight360.com'}`,
  }

  const tokenSignature = activeExploit === 'none'
    ? ''
    : activeExploit === 'hs256'
      ? 'HMAC_SHA256_USING_PUBLIC_RSA_PEM_AS_SECRET'
      : activeExploit
        ? 'INVALID_TAMPERED_SIGNATURE_MISMATCH'
        : 'RSASHA256_e829fa_sJ82Lkp9Q2VwM1xN9ZbK4tEw5rY7uI9oP1qR3tU5'

  return (
    <div className="sandbox-shell fade-in">
      {/* Top Navigation Bar */}
      <nav className="sandbox-topbar">
        <div className="container sandbox-topbar-inner">
          <NavBrand href="/#projects" />
          <div className="sandbox-breadcrumb">
            SANDBOX / AUTHLAB PHASES 1 &amp; 2 · {isPhase2 ? 'PHASE 2 (OFFENSIVE/DEFENSIVE)' : 'PHASE 1 (ENTERPRISE IDP)'} · v0.5.7
          </div>
          <a className="sandbox-back" href="/#projects">← back to projects</a>
        </div>
      </nav>

      {/* Main Container */}
      <main className="sandbox-main">
        {/* Hero Section */}
        <header className="hero" style={{ paddingBottom: '20px' }}>
          <div className="container">
            <div className="kicker">
              <span className="kicker-dot" /> AuthLab: What, How and Why · Phases 1 &amp; 2 Engineering Guide
            </div>
            <h1 style={{ margin: '8px 0 12px', fontSize: '32px', letterSpacing: '-0.03em' }}>
              AuthLab: Enterprise IAM &amp; JWT Attack Platform
            </h1>
            <p className="hero-copy" style={{ maxWidth: '880px', margin: '0 0 20px', fontSize: '15px', lineHeight: '1.6' }}>
              A hands-on walkthrough exploring the two sides of authentication: the <strong>Issuer</strong> (Identity Provider proving who you are)
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

            {/* PHASE SWITCHER BAR */}
            <div
              className="standalone-card"
              style={{
                padding: '14px 18px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                borderLeft: '4px solid var(--teal)',
              }}
            >
              <div>
                <span className="control-label" style={{ display: 'block', marginBottom: '2px' }}>
                  Laboratory Phase Selection
                </span>
                <strong style={{ fontSize: '13.5px', color: 'var(--text)' }}>
                  {isPhase2
                    ? '🛡️ Phase 2: Build & Break Your Own JWT Issuer (CVE-2015-9235, alg: none, KeyStore Rotation, 16 Pytest Suite)'
                    : '🌾 Phase 1: Real Identity Provider & Protected API (Keycloak 26, PostgreSQL 16, Flask API)'}
                </strong>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`button ${labPhase === 'phase-1' ? 'primary' : ''}`}
                  style={{ fontSize: '11px', padding: '6px 14px' }}
                  onClick={() => setLabPhase('phase-1')}
                >
                  🌾 Phase 1: Keycloak Stack
                </button>
                <button
                  type="button"
                  className={`button ${labPhase === 'phase-2' ? 'primary' : ''}`}
                  style={{ fontSize: '11px', padding: '6px 14px' }}
                  onClick={() => setLabPhase('phase-2')}
                >
                  🛡️ Phase 2: JWT Attack Lab
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="standalone-tab-row" style={{ marginTop: '16px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', overflowX: 'auto' }}>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
                onClick={() => setActiveTab('simulator')}
              >
                ⚡ Interactive Lab &amp; Topology (5 Flow Diagrams)
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'what-how-why' ? 'active' : ''}`}
                onClick={() => setActiveTab('what-how-why')}
              >
                📐 What, How &amp; Why (Architecture Walkthrough)
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'jwt' ? 'active' : ''}`}
                onClick={() => setActiveTab('jwt')}
              >
                💥 Phase 2 Attack Simulator &amp; JWT Lab
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'configs' ? 'active' : ''}`}
                onClick={() => setActiveTab('configs')}
              >
                ⚙️ Production Configs
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                🛡️ 16-Exploit Audit &amp; Matrix
              </button>
            </div>
          </div>
        </header>

        {/* ============================================================= */}
        {/* TAB 1: INTERACTIVE SIMULATOR & TOPOLOGY (5 FLOW DIAGRAMS)     */}
        {/* ============================================================= */}
        {activeTab === 'simulator' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              {/* Persona Selector Card */}
              <div className="standalone-card" style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span className="control-label" style={{ display: 'block', marginBottom: '4px' }}>
                      Step 1: Select Active User Identity ({isPhase2 ? 'Phase 2 Testbench' : 'Phase 1 FarmSight 360'})
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                      Identity: {persona.name} · Role: <code>{persona.role}</code> · Group: <code>{persona.group}</code>
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="tag" style={{ font: '10px var(--mono)' }}>Roundtrip: 14ms</span>
                    <span className="tag" style={{ font: '10px var(--mono)', color: persona.tokenValid ? 'var(--teal)' : 'var(--red)' }}>
                      {persona.tokenValid ? 'VALID OIDC TOKEN' : persona.isAttacker ? 'ATTACK / TAMPERED' : 'UNAUTHENTICATED'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  {(Object.keys(personaMap) as AuthPersona[]).map((pKey) => {
                    const p = personaMap[pKey]
                    const isSelected = isPhase2 ? selectedPersonaP2 === pKey : selectedPersonaP1 === pKey
                    return (
                      <button
                        key={pKey}
                        type="button"
                        onClick={() => {
                          if (isPhase2) {
                            setSelectedPersonaP2(pKey)
                            if (p.isAttacker) setActiveExploit('tamper')
                            else setActiveExploit(null)
                          } else {
                            setSelectedPersonaP1(pKey)
                          }
                        }}
                        className={`standalone-scenario-btn ${isSelected ? 'active' : ''} ${p.isAttacker ? 'is-attack' : ''}`}
                        style={{ padding: '12px 14px' }}
                      >
                        <span className="method-pill">
                          {pKey === 'farmer' && '🌾 FARMER'}
                          {pKey === 'service_provider' && '🚜 CONTRACTOR'}
                          {pKey === 'alice' && '👩‍💻 VIEWER'}
                          {pKey === 'drench' && '🧑‍💻 DEV'}
                          {pKey === 'admin' && '🛡️ ADMIN'}
                          {pKey === 'anonymous' && '👤 GUEST'}
                          {(pKey === 'tampered' || pKey === 'mallory') && '🦹 ATTACKER'}
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
                      Step 2: Probe API Endpoint ({isPhase2 ? 'Phase 2 Endpoint Runner' : 'Phase 1 Business Domain'})
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                      {endpoint.method} {endpoint.path} — {endpoint.label}
                    </strong>
                  </div>
                  <span className="tag" style={{ font: '10px var(--mono)' }}>
                    Required: {endpoint.isPublic ? 'None (Public)' : endpoint.requiredRoles.join(' | ')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  {(Object.keys(endpointMap) as AuthEndpoint[]).map((eKey) => {
                    const ep = endpointMap[eKey]
                    const isSelected = isPhase2 ? selectedEndpointP2 === eKey : selectedEndpointP1 === eKey
                    return (
                      <button
                        key={eKey}
                        type="button"
                        onClick={() => {
                          if (isPhase2) setSelectedEndpointP2(eKey)
                          else setSelectedEndpointP1(eKey)
                        }}
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

              {/* High-Fidelity SVG Topology Map with 5 Interactive Diagram Modes */}
              <div style={{ marginBottom: '24px' }}>
                <AuthTopologyMap
                  phase={labPhase}
                  persona={currentPersonaKey}
                  endpoint={currentEndpointKey}
                  decision={decision}
                  activeExploit={activeExploit}
                  diagramMode={diagramMode}
                  onSelectDiagramMode={(mode) => setDiagramMode(mode)}
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
                    <span className="term-title">auth-trace / {labPhase} / {persona.id} / {endpoint.path}</span>
                  </div>
                  <div className="term-body" style={{ font: '12px/1.55 var(--mono)' }}>
                    <div style={{ color: 'var(--muted)', marginBottom: '8px' }}>
                      # {isPhase2 ? 'Phase 2 Web Test Bench & Exploit Trace:' : 'Phase 1 Request Simulation via cURL CLI:'}
                    </div>
                    <div style={{ color: 'var(--text)', marginBottom: '12px' }}>
                      $ curl -s -i -X {endpoint.method} &quot;http://localhost:5001{endpoint.path}&quot; \{'\n'}
                      {persona.id !== 'anonymous' && (
                        <span>&nbsp;&nbsp;-H &quot;Authorization: Bearer eyJhbGci...{persona.role}&quot;{'\n'}</span>
                      )}
                      &nbsp;&nbsp;-H &quot;Accept: application/json&quot;
                    </div>

                    <div style={{ color: 'var(--muted)', borderTop: '1px solid var(--line-soft)', paddingTop: '10px', marginBottom: '8px' }}>
                      # 6-Step Server Verification Decision Matrix:
                    </div>
                    <div>1. Inbound Request: <span style={{ color: 'var(--teal)' }}>{endpoint.method} {endpoint.path}</span></div>

                    {endpoint.isPublic ? (
                      <div style={{ color: 'var(--teal)' }}>
                        2. Route flagged @public_route ➔ Bypassing JWT validation gate (200 OK)
                      </div>
                    ) : persona.id === 'anonymous' ? (
                      <div style={{ color: 'var(--red)' }}>
                        2. Missing Authorization header ➔ 401 Unauthorized (&quot;Bearer token required&quot;)
                      </div>
                    ) : activeExploit ? (
                      <div style={{ color: 'var(--red)' }}>
                        2. Exploit [{activeExploit}] intercepted!{'\n'}
                        &nbsp;&nbsp;[HARDENED VERIFIER] Deflected by strict RS256 algorithm allow-list and signature check!
                      </div>
                    ) : (
                      <>
                        <div style={{ color: 'var(--teal)' }}>
                          2. Token present ➔ Matching public RSA cert fetched from JWKS cache (kid: {activeKid})
                        </div>
                        <div style={{ color: 'var(--teal)' }}>
                          3. RS256 signature verified against public key ✓
                        </div>
                        <div style={{ color: 'var(--teal)' }}>
                          4. Claims verified: iss={isPhase2 ? 'http://localhost:5001' : 'http://localhost:8080/realms/authlab'}, aud=authlab-api, exp valid ✓
                        </div>
                        <div>
                          5. RBAC Policy Check: user has role <code>[{persona.role}]</code> vs required <code>{JSON.stringify(endpoint.requiredRoles)}</code>
                        </div>
                        {decision === 'ALLOW' ? (
                          <div style={{ color: 'var(--teal)' }}>
                            6. Role authorization PASSED ✓ ➔ Executing authorized business logic (Roundtrip: 14ms)
                          </div>
                        ) : (
                          <div style={{ color: 'var(--red)' }}>
                            6. Role authorization REJECTED ✗ ➔ 403 Forbidden (&quot;Access denied for role {persona.role}&quot;)
                          </div>
                        )}
                      </>
                    )}

                    <div style={{ marginTop: '14px', borderTop: '1px solid var(--line-soft)', paddingTop: '10px' }}>
                      <span className="term-faint">HTTP STATUS: </span>
                      <strong style={{ color: decision === 'ALLOW' ? 'var(--teal)' : decision === 'DENY_401' ? 'var(--amber)' : 'var(--red)' }}>
                        {decision === 'ALLOW' && 'HTTP/1.1 200 OK'}
                        {decision === 'DENY_401' && 'HTTP/1.1 401 UNAUTHORIZED'}
                        {decision === 'DENY_403' && 'HTTP/1.1 403 FORBIDDEN'}
                      </strong>
                    </div>

                    <div style={{ marginTop: '6px' }}>
                      <span className="term-faint">RESPONSE BODY:</span>
                      <pre style={{ margin: '4px 0 0', color: decision === 'ALLOW' ? 'var(--teal)' : 'var(--red)', font: '11px/1.4 var(--mono)' }}>
                        {decision === 'ALLOW' && endpoint.id === 'users' && JSON.stringify({
                          status: 'success',
                          users: [
                            { username: 'alice', role: 'viewer', status: 'active' },
                            { username: 'drench', role: 'developer', status: 'active' },
                            { username: 'bob', role: 'admin', status: 'active' },
                          ],
                          requested_by: persona.name,
                          latency_ms: 14,
                        }, null, 2)}

                        {decision === 'ALLOW' && endpoint.id === 'crops' && JSON.stringify({
                          status: 'success',
                          data: [
                            { farm: 'Green Valley Estate', crop: 'Coffee (Arabica)', acres: 14.5, stage: 'Growing', yield_kg: 4200 },
                            { farm: 'Sunrise Paddy Fields', crop: 'Basmati Rice', acres: 8.0, stage: 'Ready for Harvest', yield_kg: 16500 },
                          ],
                          authenticated_as: persona.name,
                        }, null, 2)}

                        {decision === 'ALLOW' && endpoint.id === 'services' && JSON.stringify({
                          status: 'success',
                          marketplace: [
                            { title: 'Agri-Drone Precision Spraying', rate: '850/acre', provider: 'Kiran AgriTech' },
                            { title: 'Combine Paddy Harvester', rate: '2200/hr', provider: 'Kiran AgriTech' },
                          ],
                          authenticated_as: persona.name,
                        }, null, 2)}

                        {decision === 'ALLOW' && endpoint.id === 'me' && JSON.stringify({
                          username: persona.name,
                          role: persona.role,
                          group: persona.group,
                          phase: labPhase,
                          kid: activeKid,
                        }, null, 2)}

                        {decision === 'ALLOW' && (endpoint.id === 'admin-users' || endpoint.id === 'reset-pwd') && JSON.stringify({
                          status: 'success',
                          action: endpoint.id,
                          managed_realm: isPhase2 ? 'Authlab' : 'authlab',
                          executed_by: 'admin (bob)',
                          admin_clearance: true,
                        }, null, 2)}

                        {decision === 'ALLOW' && endpoint.id === 'public' && JSON.stringify({
                          service: isPhase2 ? 'AuthLab Phase 2 API' : 'FarmSight 360 API',
                          status: 'healthy',
                          timestamp: new Date().toISOString(),
                        }, null, 2)}

                        {decision === 'DENY_401' && JSON.stringify({
                          error: 'Unauthorized',
                          message: persona.id === 'anonymous' ? 'Missing Bearer authorization token' : activeExploit ? `Cryptographic exploit '${activeExploit}' deflected by RS256 verifier` : 'Token signature verification failed',
                          code: 401,
                        }, null, 2)}

                        {decision === 'DENY_403' && JSON.stringify({
                          error: 'Forbidden',
                          message: `Role '${persona.role}' lacks sufficient privileges for ${endpoint.path}`,
                          required_roles: endpoint.requiredRoles,
                          code: 403,
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Token Claims Inspector */}
                <div className="standalone-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span className="control-label" style={{ margin: 0 }}>Active Token Inspector</span>
                      <span className="tag" style={{ font: '9px var(--mono)', color: '#a78bfa' }}>
                        KID: {activeKid} · ALGORITHM: RS256
                      </span>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                        Active Token Roles &amp; Attributes:
                      </span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {persona.id !== 'anonymous' ? (
                          <>
                            <span className="tag" style={{ background: 'rgba(79, 209, 197, 0.1)', color: 'var(--teal)', border: '1px solid var(--teal)' }}>
                              role: {persona.role}
                            </span>
                            <span className="tag">{isPhase2 ? 'authlab-access' : 'farm360-access'}</span>
                            <span className="tag">exp: in 15m</span>
                          </>
                        ) : (
                          <span className="tag" style={{ color: 'var(--muted)' }}>No Token Attached (Anonymous)</span>
                        )}
                      </div>
                    </div>

                    <div className="code-block" style={{ margin: 0, maxHeight: '230px', overflowY: 'auto', fontSize: '11px' }}>
                      <pre style={{ margin: 0, color: 'var(--text)' }}>
                        {JSON.stringify(persona.id !== 'anonymous' ? tokenPayload : { error: 'No Authorization Token' }, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line-soft)', fontSize: '11.5px', color: 'var(--muted)' }}>
                    <strong style={{ color: 'var(--text)' }}>KeyStore Rotation:</strong> Phase 2 supports dual-key rotation. When <code>store.rotate()</code> is invoked, old tokens continue validating until <code>store.retire()</code> drops the key.
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* TAB 2: WHAT, HOW & WHY (ARCHITECTURAL WALKTHROUGH)            */}
        {/* ============================================================= */}
        {activeTab === 'what-how-why' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
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
                  </div>
                </aside>

                {/* Article Content */}
                <article className="guide-article-body">
                  {/* Section 1: The Big Picture */}
                  <section id="whw-big-picture">
                    <h2>1. The Big Picture: Issuer vs. Resource Server</h2>
                    <p>
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
                    <div className="callout callout-tip">
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
                            <td><code>quay.io/keycloak/keycloak:26.0</code></td>
                            <td>Builds are reproducible; avoids breaking changes on unexpected updates</td>
                          </tr>
                          <tr>
                            <td><strong>Localhost Binding</strong></td>
                            <td><code>127.0.0.1:8080:8080</code></td>
                            <td>Ports bound strictly to 127.0.0.1, preventing public LAN/WAN exposure</td>
                          </tr>
                          <tr>
                            <td><strong>Secret Isolation</strong></td>
                            <td><code>.env</code> in <code>.gitignore</code></td>
                            <td>Database and admin credentials never committed to source control</td>
                          </tr>
                          <tr>
                            <td><strong>Non-Root User</strong></td>
                            <td><code>USER 10001</code> in API Dockerfile</td>
                            <td>Mitigates container breakout risk if API process is compromised</td>
                          </tr>
                          <tr>
                            <td><strong>Development Label</strong></td>
                            <td><code>command: start-dev</code></td>
                            <td>Explicitly documented as dev-mode, never mistaken for production</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 4: How the API Validates a Token */}
                  <section id="whw-api-validation">
                    <h2>4. How the API Validates a Token (`api/app.py`)</h2>
                    <p>
                      Every protected API request passes through a 6-step cryptographic validation sequence:
                    </p>
                    <ol>
                      <li><strong>Read Authorization Header:</strong> Read <code>Authorization: Bearer &lt;token&gt;</code>. If missing, return <code>401 Unauthorized</code>.</li>
                      <li><strong>Extract Key ID:</strong> Read the <code>kid</code> from the unverified token header.</li>
                      <li><strong>Fetch Public Keys:</strong> Fetch Keycloak&apos;s public keys from its JWKS URL (cached in memory via <code>PyJWKClient</code>).</li>
                      <li><strong>Verify Signature:</strong> Verify the 2048-bit <code>RS256</code> digital signature using the public RSA key.</li>
                      <li><strong>Enforce Claims:</strong> Check issuer (<code>iss</code>), audience (<code>aud</code>) and expiry (<code>exp</code>), and require those claims to be present.</li>
                      <li><strong>Evaluate RBAC:</strong> Read roles from <code>realm_access.roles</code>. If the role is wrong, return <code>403 Forbidden</code>.</li>
                    </ol>

                    <div className="guide-grid-two">
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>Why RS256, not HS256:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          With RS256 (asymmetric), Keycloak signs with a private key and the API only needs the public key, so a compromised API cannot mint tokens. With HS256 every verifier holds the same secret that can also sign.
                        </p>
                      </div>
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--amber)' }}>
                        <strong>Why an Algorithm Allow-List:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          The API accepts only <code>RS256</code> and never believes the token&apos;s own <code>alg</code> header. Phase 2 shows what happens without it (CVE-2015-9235).
                        </p>
                      </div>
                    </div>

                    <div className="guide-box" style={{ borderLeft: '3px solid var(--red)' }}>
                      <strong>Why 401 vs 403:</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                        <strong>401 Unauthorized:</strong> Means the server cannot trust who you are (missing, expired or forged token).
                        <br />
                        <strong>403 Forbidden:</strong> Means the server knows who you are, and the answer is no (insufficient role privileges).
                      </p>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 5: Keycloak Setup */}
                  <section id="whw-keycloak-setup">
                    <h2>5. The Keycloak Setup, and Why</h2>
                    <div className="guide-table-wrap">
                      <table className="guide-table">
                        <thead>
                          <tr>
                            <th>Keycloak Configuration Step</th>
                            <th>Why It Is Configured</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Realm `authlab`</strong></td>
                            <td>A realm is an isolated tenant of users, roles and clients, keeping application state separated from the master admin realm.</td>
                          </tr>
                          <tr>
                            <td><strong>Roles and Two Users</strong></td>
                            <td>Provisions a <code>viewer</code> (Alice) and an <code>admin</code> (Bob) to test 403 Forbidden vs 200 OK access control.</td>
                          </tr>
                          <tr>
                            <td><strong>Public Client `authlab-web`, PKCE S256</strong></td>
                            <td>Browser-style clients cannot keep a client secret safe, so PKCE (Proof Key for Code Exchange) protects the code grant.</td>
                          </tr>
                          <tr>
                            <td><strong>Direct Access Grants (Lab Only)</strong></td>
                            <td>A convenient shortcut to acquire tokens via cURL CLI during early development; the real browser code flow comes in Phase 3.</td>
                          </tr>
                          <tr>
                            <td><strong>Audience Mapper `authlab-api`</strong></td>
                            <td>Tells Keycloak to put your API in the token&apos;s <code>aud</code> claim, preventing token substitution attacks.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 6: Gotchas */}
                  <section id="whw-gotchas">
                    <h2>6. Gotchas Worth Writing About</h2>
                    <div className="callout callout-warning">
                      <strong>Gotcha 1: Issuer vs. JWKS Hostnames (Docker Split)</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                        The token&apos;s <code>iss</code> claim is <code>http://localhost:8080/realms/authlab</code> because that is the URL the browser/cURL used.
                        However, the Flask API container fetches keys from <code>http://keycloak:8080/realms/authlab/certs</code> over the Docker internal bridge network!
                        That is why <code>docker-compose.yml</code> has two separate settings: <code>TOKEN_ISSUER</code> and <code>JWKS_URL</code>.
                      </p>
                    </div>
                    <div className="callout callout-warning">
                      <strong>Gotcha 2: Missing Audience Mapper</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                        If you forget to add the audience mapper in Keycloak, the API throws <code>jwt.exceptions.InvalidAudienceError</code>.
                        This is not a bug — it is the audience check correctly preventing tokens meant for other clients from reaching this API!
                      </p>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 7: Phase 2 */}
                  <section id="whw-phase-2">
                    <h2>7. Phase 2: Build and Break Your Own JWT Issuer</h2>
                    <p>
                      <strong>What we built:</strong> The <code>jwtlab/</code> folder with <code>auth.py</code>, <code>app.py</code>, 16 tests, a README and pytest config.
                    </p>
                    <p>
                      <strong>Why:</strong> Using Keycloak teaches you configuration. Building a mini issuer teaches you what is actually in a token and what a verifier must check.
                    </p>
                    <ul>
                      <li>
                        <strong>KeyStore:</strong> Holds RSA keys by <code>kid</code> and supports rotation (a new current key) and retirement (dropping an old one).
                        Its JWKS output contains public keys only, which a test confirms by checking that no private <code>d</code> value is published.
                      </li>
                      <li>
                        <strong>issue_token:</strong> Creates a token with standard claims: <code>iss</code>, <code>aud</code>, <code>sub</code>, <code>roles</code>, <code>iat</code>, <code>exp</code>, and <code>jti</code>.
                        Passing <code>None</code> for a claim removes it, which is how the exploit test suite builds broken tokens.
                      </li>
                      <li>
                        <strong>The Secure Verifier (`verify_token`):</strong> Fixes the algorithm to RS256, looks up the key by <code>kid</code>, rejects unknown keys,
                        and checks signature, issuer, audience and expiry with required claims strictly enforced.
                      </li>
                    </ul>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 8: Vulnerable Verifier */}
                  <section id="whw-vulnerable-verifier">
                    <h2>8. The Deliberately Vulnerable Verifier (`naive_verify_token`)</h2>
                    <p>
                      The naive verifier believes the token&apos;s <code>alg</code> header, demonstrating two classic cryptographic vulnerabilities:
                    </p>
                    <div className="guide-box" style={{ borderLeft: '3px solid var(--red)' }}>
                      <strong>1. `alg: none` Signature Stripping:</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                        The attacker claims the token needs no signature (<code>&quot;alg&quot;: &quot;none&quot;</code>), and the naive server accepts it without validation, granting unauthenticated admin access.
                      </p>
                    </div>
                    <div className="guide-box" style={{ borderLeft: '3px solid var(--red)' }}>
                      <strong>2. CVE-2015-9235: Public Key Confusion:</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                        The attacker takes your public key (published in the JWKS), signs a token with HS256 using that public key as the HMAC secret, and sets the header to HS256.
                        The naive server treats its own public key as the HMAC secret and accepts it. <em>The fix is to pin the algorithm to RS256!</em>
                      </p>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 9: What the Tests Prove */}
                  <section id="whw-what-tests-prove">
                    <h2>9. What the 16 Tests Prove</h2>
                    <div className="guide-table-wrap">
                      <table className="guide-table">
                        <thead>
                          <tr>
                            <th>Attack Vector Tested</th>
                            <th>Defense Verified in Code</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Expired or missing `exp`</td>
                            <td><code>exp</code> claim is required and strictly validated against current time</td>
                          </tr>
                          <tr>
                            <td>Wrong audience or issuer</td>
                            <td><code>aud</code> and <code>iss</code> are pinned and enforced</td>
                          </tr>
                          <tr>
                            <td>Edit role without re-signing</td>
                            <td>The digital signature covers the payload; tampering breaks math</td>
                          </tr>
                          <tr>
                            <td>Sign with attacker&apos;s key</td>
                            <td>Verify only against the issuer&apos;s authorized KeyStore keys</td>
                          </tr>
                          <tr>
                            <td>Unknown `kid`</td>
                            <td>Reject immediately, never fall back to default keys</td>
                          </tr>
                          <tr>
                            <td>`alg: none` and HS256 confusion</td>
                            <td>Fixed algorithm allow-list (<code>algorithms=[&quot;RS256&quot;]</code>)</td>
                          </tr>
                          <tr>
                            <td>Key Rotation</td>
                            <td>Old tokens work while the old key is published, and fail once retired</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="callout callout-tip">
                      <strong>Rotation Needs an Overlap Window:</strong> If you swap keys instantly, every live token across all users breaks.
                      Publishing both keys during the transition window ensures zero downtime.
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 10: Interview Talking Points */}
                  <section id="whw-interview-points">
                    <h2>10. Interview Talking Points</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>1. Why RS256 Over HS256 for Distributed Systems:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Asymmetric cryptography keeps the signing private key strictly inside the IdP. Resource APIs only need public certificates from the JWKS. A compromise of an API server never leaks the token signing key.
                        </p>
                      </div>

                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>2. Why You Pin Algorithms (alg: none and Key Confusion):</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Never trust client-supplied <code>alg</code> headers. Enforcing <code>algorithms=[&quot;RS256&quot;]</code> completely prevents <code>alg: none</code> signature bypass and CVE-2015-9235 public-key HMAC confusion.
                        </p>
                      </div>

                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>3. The Difference Between 401 and 403:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          401 Unauthorized means authentication failed (cannot trust who you are). 403 Forbidden means authorization failed (identity is verified, but role permissions are insufficient).
                        </p>
                      </div>

                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>4. Why Audience and Issuer Checks Stop Token Reuse:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Pinning <code>aud</code> prevents token substitution across microservices (tokens minted for Service A cannot be replayed against Service B).
                        </p>
                      </div>

                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>5. Key Rotation with an Overlap Window:</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Key rotation must publish both old and new public keys in JWKS simultaneously until existing tokens reach their natural expiration TTL, achieving zero downtime.
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
        {/* TAB 3: PHASE 2 ATTACK SIMULATOR & JWT LAB                     */}
        {/* ============================================================= */}
        {activeTab === 'jwt' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              {/* Interactive Attack Simulator Banner */}
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
                        4. Attacker Foreign Key Substitution
                      </strong>
                      <span className="tag" style={{ font: '9px var(--mono)' }}>{activeExploit === 'rogue-key' ? 'TRIGGERED' : 'ARM'}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Attacker signs token with their own RSA private key while claiming genuine kid. Server verifies against real JWKS and rejects foreign key.
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
                      Submits an expired timestamp (<code>exp &lt; now</code>). Hardened server enforces mandatory exp validation.
                    </p>
                  </div>

                  {/* Feature 6: KeyStore Key Rotation */}
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
                        6. Zero-Downtime Key Rotation
                      </strong>
                      <span className="tag" style={{ font: '9px var(--mono)' }}>
                        {!keyRotated ? 'KEY 1 (e7b1a49f)' : !keyRetired ? 'ROTATED (8f2d9c1b)' : 'RETIRED (RESET)'}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Click to cycle: <code>store.rotate()</code> issues fresh kid while preserving old keys in JWKS; <code>store.retire()</code> drops old keys.
                    </p>
                  </div>
                </div>

                {/* SIDE-BY-SIDE VERIFIER VERDICT COMPARISON */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
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
                          [DEFENSE] jwt.exceptions.InvalidTokenError: 'none' is not an allowed algorithm.{'\n'}
                          Strict allow-list pinned to algorithms=[&quot;RS256&quot;].
                        </div>
                      )}
                      {activeExploit === 'hs256' && (
                        <div style={{ color: 'var(--teal)' }}>
                          🛡️ STATUS: ATTACK BLOCKED (401 Unauthorized){'\n'}
                          [DEFENSE] Algorithm 'HS256' rejected by RS256 allow-list.{'\n'}
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
                <div>
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
                    <span style={{ color: '#ff5d5d' }}>{btoa(JSON.stringify(tokenHeader)).replace(/=/g, '')}</span>
                    <span style={{ color: 'var(--muted)' }}>.</span>
                    <span style={{ color: '#a78bfa' }}>{btoa(JSON.stringify(tokenPayload)).replace(/=/g, '')}</span>
                    <span style={{ color: 'var(--muted)' }}>.</span>
                    <span style={{ color: activeExploit ? 'var(--red)' : '#38bdf8' }}>{tokenSignature}</span>
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
                      className={`button ${activeConfig === 'phase2-auth' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('phase2-auth')}
                    >
                      phase-2/jwtlab/auth.py
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'phase2-tests' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('phase2-tests')}
                    >
                      test_jwt_attacks.py
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'phase1-compose' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('phase1-compose')}
                    >
                      phase-1/docker-compose.yml
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'phase1-api' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('phase1-api')}
                    >
                      phase-1/api/app.py
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'phase2-compose' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('phase2-compose')}
                    >
                      phase-2/docker-compose.yml
                    </button>
                  </div>
                </div>

                {/* Config Code Viewers */}
                {activeConfig === 'phase2-auth' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="term-faint">phase-2/jwtlab/auth.py (KeyStore &amp; Naive vs Secure Verifier)</span>
                      <button
                        type="button"
                        className="button"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(`class KeyStore:
    def __init__(self):
        self.keys = {}
        self.current = None
        self.rotate()

    def rotate(self):
        kid = uuid.uuid4().hex[:8]
        self.keys[kid] = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.current = kid
        return kid

    def retire(self, kid):
        self.keys.pop(kid, None)

    def public_key(self, kid):
        return self.keys[kid].public_key() if kid in self.keys else None

    def jwks(self):
        out = []
        for kid in self.keys:
            jwk = jwt.algorithms.RSAAlgorithm.to_jwk(self.public_key(kid), as_dict=True)
            out.append({**jwk, "kid": kid, "use": "sig", "alg": "RS256"})
        return {"keys": out}

def verify_token(token, store):
    """Secure verifier with strict RS256 pinning."""
    header = jwt.get_unverified_header(token)
    key = store.public_key(header.get("kid"))
    if key is None:
        raise jwt.InvalidTokenError("unknown kid")
    return jwt.decode(
        token, key,
        algorithms=["RS256"],
        issuer="http://localhost:5001", audience="authlab-api",
        options={"require": ["exp", "iat", "iss", "aud", "sub"]},
    )`, 'auth-py')}
                      >
                        {copiedCode === 'auth-py' ? '✓ Copied' : 'Copy auth.py'}
                      </button>
                    </div>
                    <div className="code-block" style={{ margin: 0 }}>
                      <pre>{`class KeyStore:
    """Holds RSA signing keys by kid. Supports zero-downtime rotation and retirement."""
    def __init__(self):
        self.keys = {}
        self.current = None
        self.rotate()

    def rotate(self):
        kid = uuid.uuid4().hex[:8]
        self.keys[kid] = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.current = kid
        return kid

    def retire(self, kid):
        self.keys.pop(kid, None)

    def public_key(self, kid):
        return self.keys[kid].public_key() if kid in self.keys else None

    def jwks(self):
        out = []
        for kid in self.keys:
            jwk = jwt.algorithms.RSAAlgorithm.to_jwk(self.public_key(kid), as_dict=True)
            out.append({**jwk, "kid": kid, "use": "sig", "alg": "RS256"})
        return {"keys": out}

def verify_token(token, store):
    """Secure verifier with strict RS256 pinning."""
    header = jwt.get_unverified_header(token)
    key = store.public_key(header.get("kid"))
    if key is None:
        raise jwt.InvalidTokenError("unknown kid")
    return jwt.decode(
        token, key,
        algorithms=["RS256"],
        issuer="http://localhost:5001", audience="authlab-api",
        options={"require": ["exp", "iat", "iss", "aud", "sub"]},
    )`}</pre>
                    </div>
                  </div>
                )}

                {activeConfig === 'phase2-tests' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="term-faint">phase-2/jwtlab/tests/test_jwt_attacks.py (16 Pytest Exploit Suite)</span>
                      <button
                        type="button"
                        className="button"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(`def test_alg_none_rejected_by_secure_verifier_but_fooled_naive(store):
    token = forge({"alg": "none", "typ": "JWT", "kid": store.current}, admin_claims())
    with pytest.raises(jwt.InvalidTokenError):
        verify_token(token, store)
    assert naive_verify_token(token, store)["roles"] == ["admin"]      # exploit works on naive

def test_hs256_key_confusion_rejected_by_secure_verifier_but_fooled_naive(store):
    token = forge({"alg": "HS256", "typ": "JWT", "kid": store.current}, admin_claims(),
                  secret=store.public_pem(store.current))
    with pytest.raises(jwt.InvalidTokenError):
        verify_token(token, store)
    assert naive_verify_token(token, store)["roles"] == ["admin"]      # exploit works on naive`, 'tests')}
                      >
                        {copiedCode === 'tests' ? '✓ Copied' : 'Copy test_jwt_attacks.py'}
                      </button>
                    </div>
                    <div className="code-block" style={{ margin: 0 }}>
                      <pre>{`def test_alg_none_rejected_by_secure_verifier_but_fooled_naive(store):
    token = forge({"alg": "none", "typ": "JWT", "kid": store.current}, admin_claims())
    with pytest.raises(jwt.InvalidTokenError):
        verify_token(token, store)
    assert naive_verify_token(token, store)["roles"] == ["admin"]      # exploit works on naive

def test_hs256_key_confusion_rejected_by_secure_verifier_but_fooled_naive(store):
    token = forge({"alg": "HS256", "typ": "JWT", "kid": store.current}, admin_claims(),
                  secret=store.public_pem(store.current))
    with pytest.raises(jwt.InvalidTokenError):
        verify_token(token, store)
    assert naive_verify_token(token, store)["roles"] == ["admin"]      # exploit works on naive

def test_rotation_old_tokens_valid_until_key_retired(store):
    old_kid = store.current
    old_token = issue_token(store, "alice", ["viewer"])
    store.rotate()
    assert verify_token(old_token, store)["sub"] == "alice"            # old key still published
    assert len(store.jwks()["keys"]) == 2
    store.retire(old_kid)
    with pytest.raises(jwt.InvalidTokenError):
        verify_token(old_token, store)`}</pre>
                    </div>
                  </div>
                )}

                {activeConfig === 'phase1-compose' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="term-faint">phase-1/docker-compose.yml</span>
                      <button
                        type="button"
                        className="button"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(`services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: start-dev
    ports:
      - "127.0.0.1:8080:8080"
  api:
    build: ./api
    ports:
      - "127.0.0.1:5001:5000"
  frontend:
    image: nginx:alpine
    ports:
      - "127.0.0.1:3000:80"`, 'p1-compose')}
                      >
                        {copiedCode === 'p1-compose' ? '✓ Copied' : 'Copy Compose'}
                      </button>
                    </div>
                    <div className="code-block" style={{ margin: 0 }}>
                      <pre>{`services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: start-dev
    ports:
      - "127.0.0.1:8080:8080"

  api:
    build: ./api
    environment:
      TOKEN_ISSUER: http://localhost:8080/realms/authlab
      JWKS_URL: http://keycloak:8080/realms/authlab/protocol/openid-connect/certs
    ports:
      - "127.0.0.1:5001:5000"

  frontend:
    image: nginx:alpine
    ports:
      - "127.0.0.1:3000:80"`}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* TAB 5: 16-EXPLOIT AUDIT & MATRIX                              */}
        {/* ============================================================= */}
        {activeTab === 'security' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              {/* 16-Exploit Test Matrix */}
              <div className="standalone-card" style={{ padding: '24px', marginBottom: '24px' }}>
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
              </div>

              {/* Defense-in-depth cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div className="standalone-card" style={{ padding: '24px' }}>
                  <span className="control-label" style={{ display: 'block', marginBottom: '8px' }}>CVE Defense</span>
                  <h4 style={{ margin: '0 0 12px', fontSize: '16px' }}>Defending CVE-2015-9235</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
                    Never allow the caller to specify the cryptographic algorithm. Always pass an explicit single-algorithm allow-list:
                    <code>algorithms=[&quot;RS256&quot;]</code>.
                  </p>
                </div>

                <div className="standalone-card" style={{ padding: '24px' }}>
                  <span className="control-label" style={{ display: 'block', marginBottom: '8px' }}>JWKS Integrity</span>
                  <h4 style={{ margin: '0 0 12px', fontSize: '16px' }}>Key ID (kid) Matching</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
                    Always lookup the public certificate in the KeyStore by matching the token&apos;s <code>kid</code> header. Unknown or missing <code>kid</code> headers are rejected immediately.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
