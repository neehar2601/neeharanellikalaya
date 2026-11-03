import { useState } from 'react'
import { NavBrand } from './NavBrand'
import { AuthTopologyMap, type AuthPersona, type AuthEndpoint } from './sandbox/AuthTopologyMap'

type ViewTab = 'simulator' | 'jwt' | 'guide' | 'configs' | 'security'
type ConfigTab = 'docker-compose' | 'flask-api' | 'demo-script' | 'env' | 'frontend'

interface EndpointConfig {
  id: AuthEndpoint
  method: 'GET' | 'POST'
  path: string
  label: string
  requiredRoles: string[]
  isPublic: boolean
  description: string
}

const endpoints: Record<AuthEndpoint, EndpointConfig> = {
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
    requiredRoles: ['farmer', 'service_provider', 'admin'],
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

interface PersonaInfo {
  id: AuthPersona
  name: string
  role: string
  group: string
  description: string
  tokenValid: boolean
  isTampered: boolean
}

const personas: Record<AuthPersona, PersonaInfo> = {
  farmer: {
    id: 'farmer',
    name: 'Ramesh (Farmer)',
    role: 'farmer',
    group: 'Farmers',
    description: 'Farm owner managing crop plots, worker attendance, and contracting machinery.',
    tokenValid: true,
    isTampered: false,
  },
  service_provider: {
    id: 'service_provider',
    name: 'Kiran (Service Provider)',
    role: 'service_provider',
    group: 'ServiceProviders',
    description: 'Agricultural contractor offering drone spraying, combine harvesters, and soil testing.',
    tokenValid: true,
    isTampered: false,
  },
  admin: {
    id: 'admin',
    name: 'Bob / Admin (Platform Admin)',
    role: 'admin',
    group: 'Admins',
    description: 'Platform superuser with full administrative privileges across all realm entities.',
    tokenValid: true,
    isTampered: false,
  },
  anonymous: {
    id: 'anonymous',
    name: 'Anonymous (No Token)',
    role: 'none',
    group: 'Public',
    description: 'Unauthenticated caller with no Authorization Bearer header attached to request.',
    tokenValid: false,
    isTampered: false,
  },
  tampered: {
    id: 'tampered',
    name: 'Malicious Attacker (Tampered JWT)',
    role: 'farmer -> escalated to admin',
    group: 'Attackers',
    description: 'Forged token with client-side payload modification without Keycloak private RSA key.',
    tokenValid: false,
    isTampered: true,
  },
}

export function KeycloakAuthSandbox() {
  const [activeTab, setActiveTab] = useState<ViewTab>('simulator')
  const [activeConfig, setActiveConfig] = useState<ConfigTab>('docker-compose')
  const [selectedPersona, setSelectedPersona] = useState<AuthPersona>('farmer')
  const [selectedEndpoint, setSelectedEndpoint] = useState<AuthEndpoint>('crops')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Tamper lab interactive controls
  const [tamperRole, setTamperRole] = useState(false)
  const [tamperExpire, setTamperExpire] = useState(false)
  const [tamperIssuer, setTamperIssuer] = useState(false)

  const persona = personas[selectedPersona]
  const endpoint = endpoints[selectedEndpoint]

  // Calculate access decision
  let decision: 'ALLOW' | 'DENY_401' | 'DENY_403' = 'ALLOW'

  if (endpoint.isPublic) {
    decision = 'ALLOW'
  } else if (!persona.tokenValid || persona.id === 'anonymous') {
    decision = 'DENY_401'
  } else if (persona.isTampered) {
    decision = 'DENY_401' // Signature validation failure
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

  // Generated JWT token simulation components
  const tokenHeader = {
    alg: 'RS256',
    typ: 'JWT',
    kid: 'farm360-keycloak-rsa-key-2026',
  }

  const tokenPayload = {
    exp: tamperExpire ? Math.floor(Date.now() / 1000) - 3600 : Math.floor(Date.now() / 1000) + 900,
    iat: Math.floor(Date.now() / 1000) - 60,
    jti: '9b2c8a1e-450f-48d1-93e1-8fbb49e28c25',
    iss: tamperIssuer ? 'http://attacker-evil-host.com/realms/fake' : 'http://localhost:8080/realms/farm360',
    aud: 'farm360-api',
    sub: selectedPersona === 'farmer' ? 'usr-f482-ramesh' : selectedPersona === 'service_provider' ? 'usr-s910-kiran' : 'usr-a001-admin',
    typ: 'Bearer',
    azp: 'farm360-web',
    preferred_username: selectedPersona === 'farmer' ? 'ramesh' : selectedPersona === 'service_provider' ? 'kiran' : 'admin_farm',
    email: `${selectedPersona === 'farmer' ? 'ramesh' : selectedPersona === 'service_provider' ? 'kiran' : 'admin'}@farmsight360.com`,
    realm_access: {
      roles: tamperRole ? ['admin', 'farmer'] : [persona.role, 'default-roles-farm360'],
    },
    resource_access: {
      'farm360-api': {
        roles: tamperRole ? ['admin'] : [persona.role],
      },
    },
    scope: 'openid profile email',
  }

  const tokenSignature = tamperRole || tamperExpire || tamperIssuer
    ? 'INVALID_SIGNATURE_MISMATCH_RSA256_VERIFICATION_FAILED'
    : 'sJ82_Lkp9Q_2VwM1xN9ZbK4tEw5rY7uI9oP1qR3tU5vW7xY9zB2cE4gH6jL8mO0qS2uV4xZ6'

  return (
    <div className="sandbox-shell fade-in">
      {/* Top Navigation Bar */}
      <nav className="sandbox-topbar">
        <div className="container sandbox-topbar-inner">
          <NavBrand href="/#projects" />
          <div className="sandbox-breadcrumb">SANDBOX / KEYCLOAK IAM & OAUTH 2.0 · v0.5.7</div>
          <a className="sandbox-back" href="/#projects">← back to projects</a>
        </div>
      </nav>

      {/* Main Container */}
      <main className="sandbox-main">
        {/* Hero Section */}
        <header className="hero" style={{ paddingBottom: '20px' }}>
          <div className="container">
            <div className="kicker">
              <span className="kicker-dot" /> IAM Architecture · OAuth 2.0 & OIDC · Keycloak 26
            </div>
            <h1 style={{ margin: '8px 0 12px', fontSize: '32px', letterSpacing: '-0.03em' }}>
              Enterprise Authentication & IAM with Keycloak
            </h1>
            <p className="hero-copy" style={{ maxWidth: '840px', margin: '0 0 20px', fontSize: '15px', lineHeight: '1.6' }}>
              An interactive identity and access management laboratory based on <strong>FarmSight 360 & AuthLab</strong>.
              Explore how <strong>Keycloak 26</strong> issues asymmetric <strong>RS256 JSON Web Tokens (JWT)</strong>,
              how Flask Resource APIs verify signatures statelessly using public <strong>JSON Web Key Sets (JWKS)</strong>,
              and how <strong>Role-Based Access Control (RBAC)</strong> enforces least-privilege security across multi-tenant microservices.
            </p>

            <div className="cta-row" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
              <span className="tag" style={{ border: '1px solid rgba(79, 209, 197, 0.3)', color: 'var(--teal)' }}>
                OAuth 2.0 / OIDC
              </span>
              <span className="tag" style={{ border: '1px solid rgba(167, 139, 250, 0.3)', color: '#a78bfa' }}>
                RS256 Asymmetric JWT
              </span>
              <span className="tag" style={{ border: '1px solid rgba(232, 163, 61, 0.3)', color: 'var(--amber)' }}>
                PostgreSQL 16
              </span>
            </div>

            {/* Navigation Tabs */}
            <div className="standalone-tab-row" style={{ marginTop: '32px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', overflowX: 'auto' }}>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
                onClick={() => setActiveTab('simulator')}
              >
                ⚡ Interactive Lab & Topology
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'jwt' ? 'active' : ''}`}
                onClick={() => setActiveTab('jwt')}
              >
                🔑 JWT Deep Dive & Tamper Lab
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
                onClick={() => setActiveTab('guide')}
              >
                📖 Complete Technical Guide
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
                🛡️ Security & IAM Audit
              </button>
            </div>
          </div>
        </header>

        {/* ============================================================= */}
        {/* TAB 1: INTERACTIVE SIMULATOR & TOPOLOGY                       */}
        {/* ============================================================= */}
        {activeTab === 'simulator' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              {/* Persona Selector Card */}
              <div className="standalone-card" style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span className="control-label" style={{ display: 'block', marginBottom: '4px' }}>Step 1: Select Active User Identity / Persona</span>
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                      Current Identity: {persona.name} · Role: <code>{persona.role}</code> · Group: <code>{persona.group}</code>
                    </strong>
                  </div>
                  <span className="tag" style={{ font: '10px var(--mono)', color: persona.tokenValid ? 'var(--teal)' : 'var(--red)' }}>
                    {persona.tokenValid ? 'VALID OIDC TOKEN' : persona.isTampered ? 'TAMPERED TOKEN' : 'UNAUTHENTICATED'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  {(['farmer', 'service_provider', 'admin', 'anonymous', 'tampered'] as AuthPersona[]).map((pKey) => {
                    const p = personas[pKey]
                    const isSelected = selectedPersona === pKey
                    return (
                      <button
                        key={pKey}
                        type="button"
                        onClick={() => setSelectedPersona(pKey)}
                        className={`standalone-scenario-btn ${isSelected ? 'active' : ''} ${p.isTampered ? 'is-attack' : ''}`}
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
                    <span className="control-label" style={{ display: 'block', marginBottom: '4px' }}>Step 2: Probe Resource API Endpoint</span>
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                      {endpoint.method} {endpoint.path} — {endpoint.label}
                    </strong>
                  </div>
                  <span className="tag" style={{ font: '10px var(--mono)' }}>
                    Required Roles: {endpoint.isPublic ? 'None (Public)' : endpoint.requiredRoles.join(' | ')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  {(Object.keys(endpoints) as AuthEndpoint[]).map((eKey) => {
                    const ep = endpoints[eKey]
                    const isSelected = selectedEndpoint === eKey
                    return (
                      <button
                        key={eKey}
                        type="button"
                        onClick={() => setSelectedEndpoint(eKey)}
                        className={`standalone-scenario-btn ${isSelected ? 'active' : ''}`}
                        style={{ padding: '10px 12px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <span className="method-pill" style={{ color: ep.method === 'POST' ? 'var(--amber)' : 'var(--teal)' }}>
                            {ep.method}
                          </span>
                          <span style={{ font: '9px var(--mono)', color: ep.isPublic ? 'var(--teal)' : 'var(--faint)' }}>
                            {ep.isPublic ? 'PUBLIC' : 'RBAC PROTECTED'}
                          </span>
                        </div>
                        <strong style={{ marginTop: '4px', fontSize: '12px' }}>{ep.path}</strong>
                        <small>{ep.description}</small>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* High-Fidelity SVG Topology Map with Animated Packet Flows */}
              <div style={{ marginBottom: '24px' }}>
                <AuthTopologyMap
                  persona={selectedPersona}
                  endpoint={selectedEndpoint}
                  decision={decision}
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
                    <span className="term-title">auth-trace / {selectedPersona} / {selectedEndpoint}</span>
                  </div>
                  <div className="term-body" style={{ font: '12px/1.55 var(--mono)' }}>
                    <div style={{ color: 'var(--muted)', marginBottom: '8px' }}>
                      # Request Simulation via cURL CLI:
                    </div>
                    <div style={{ color: 'var(--text)', marginBottom: '12px' }}>
                      $ curl -s -i -X {endpoint.method} &quot;http://localhost:5001{endpoint.path}&quot; \{'\n'}
                      {persona.id !== 'anonymous' && (
                        <span>&nbsp;&nbsp;-H &quot;Authorization: Bearer eyJhbGci...{persona.role}&quot;{'\n'}</span>
                      )}
                      &nbsp;&nbsp;-H &quot;Accept: application/json&quot;
                    </div>

                    <div style={{ color: 'var(--muted)', borderTop: '1px solid var(--line-soft)', paddingTop: '10px', marginBottom: '8px' }}>
                      # Flask Resource API Verification Steps:
                    </div>
                    <div>1. Inbound Request: <span style={{ color: 'var(--teal)' }}>{endpoint.method} {endpoint.path}</span></div>

                    {endpoint.isPublic ? (
                      <div style={{ color: 'var(--teal)' }}>
                        2. Route flagged @public_route ➔ Bypassing JWT validation gate
                      </div>
                    ) : persona.id === 'anonymous' ? (
                      <div style={{ color: 'var(--red)' }}>
                        2. Missing Authorization header ➔ 401 Unauthorized (&quot;Bearer token required&quot;)
                      </div>
                    ) : persona.isTampered ? (
                      <div style={{ color: 'var(--red)' }}>
                        2. PyJWKClient extracted kid ➔ RSA signature verification FAILED!{'\n'}
                        &nbsp;&nbsp;[CRITICAL] Payload hash does not match Keycloak signature!
                      </div>
                    ) : (
                      <>
                        <div style={{ color: 'var(--teal)' }}>
                          2. Token present ➔ PyJWKClient fetched matching RSA public cert from JWKS cache
                        </div>
                        <div style={{ color: 'var(--teal)' }}>
                          3. RS256 signature verified against Keycloak public key ✓
                        </div>
                        <div style={{ color: 'var(--teal)' }}>
                          4. Claims checked: iss=farm360, aud=farm360-api, exp valid ✓
                        </div>
                        <div>
                          5. RBAC Policy Check: user has role <code>[{persona.role}]</code> vs required <code>{JSON.stringify(endpoint.requiredRoles)}</code>
                        </div>
                        {decision === 'ALLOW' ? (
                          <div style={{ color: 'var(--teal)' }}>
                            6. Role authorization PASSED ✓ ➔ Querying PostgreSQL store...
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
                          realm: 'farm360',
                        }, null, 2)}

                        {decision === 'ALLOW' && (endpoint.id === 'admin-users' || endpoint.id === 'reset-pwd') && JSON.stringify({
                          status: 'success',
                          action: endpoint.id,
                          managed_realm: 'farm360',
                          executed_by: 'admin',
                        }, null, 2)}

                        {decision === 'ALLOW' && endpoint.id === 'public' && JSON.stringify({
                          service: 'FarmSight 360 API',
                          status: 'healthy',
                          timestamp: new Date().toISOString(),
                        }, null, 2)}

                        {decision === 'DENY_401' && JSON.stringify({
                          error: 'Unauthorized',
                          message: persona.id === 'anonymous' ? 'Missing Bearer authorization token' : 'Token signature verification failed',
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
                      <span className="control-label" style={{ margin: 0 }}>Decoded JWT Claims</span>
                      <span className="tag" style={{ font: '9px var(--mono)', color: '#a78bfa' }}>
                        ALGORITHM: RS256
                      </span>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                        Keycloak Realm Access Roles (Claim: <code>realm_access.roles</code>):
                      </span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {persona.id !== 'anonymous' ? (
                          <>
                            <span className="tag" style={{ background: 'rgba(79, 209, 197, 0.1)', color: 'var(--teal)', border: '1px solid var(--teal)' }}>
                              role: {persona.role}
                            </span>
                            <span className="tag">default-roles-farm360</span>
                            <span className="tag">offline_access</span>
                            <span className="tag">uma_authorization</span>
                          </>
                        ) : (
                          <span className="tag" style={{ color: 'var(--muted)' }}>No Token Claims (Anonymous)</span>
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
                    <strong style={{ color: 'var(--text)' }}>Why RS256 beats HS256:</strong> With RS256, the Resource Server only needs Keycloak&apos;s public key to verify tokens. The signing private key never leaves Keycloak!
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* TAB 2: JWT DEEP DIVE & TAMPER LAB                             */}
        {/* ============================================================= */}
        {activeTab === 'jwt' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              {/* Interactive Tamper Engine */}
              <div className="standalone-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <span className="control-label" style={{ display: 'block', marginBottom: '8px' }}>Cryptographic Attack Simulator</span>
                <h2 style={{ fontSize: '20px', margin: '0 0 12px' }}>Interactive JWT Tampering & Defense Lab</h2>
                <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6' }}>
                  A JSON Web Token consists of three base64url-encoded parts separated by dots: <code>Header.Payload.Signature</code>.
                  Toggle attack scenarios below to test how the Flask API&apos;s asymmetric RSA verification stops token manipulation in its tracks!
                </p>

                {/* Attack Toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  <div
                    onClick={() => setTamperRole(!tamperRole)}
                    className="guide-box"
                    style={{
                      cursor: 'pointer',
                      borderLeft: `4px solid ${tamperRole ? 'var(--red)' : 'var(--line)'}`,
                      background: tamperRole ? 'rgba(255, 93, 93, 0.08)' : 'rgba(15, 21, 29, 0.6)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ margin: 0, color: tamperRole ? 'var(--red)' : 'var(--text)' }}>
                        1. Privilege Escalation Tamper
                      </strong>
                      <span className="tag" style={{ font: '9px var(--mono)' }}>{tamperRole ? 'ATTACK ACTIVE' : 'NORMAL'}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Attacker edits payload to inject <code>&quot;admin&quot;</code> role. Without Keycloak&apos;s RSA private key, the signature becomes invalid!
                    </p>
                  </div>

                  <div
                    onClick={() => setTamperExpire(!tamperExpire)}
                    className="guide-box"
                    style={{
                      cursor: 'pointer',
                      borderLeft: `4px solid ${tamperExpire ? 'var(--red)' : 'var(--line)'}`,
                      background: tamperExpire ? 'rgba(255, 93, 93, 0.08)' : 'rgba(15, 21, 29, 0.6)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ margin: 0, color: tamperExpire ? 'var(--red)' : 'var(--text)' }}>
                        2. Expired Token Replay
                      </strong>
                      <span className="tag" style={{ font: '9px var(--mono)' }}>{tamperExpire ? 'ATTACK ACTIVE' : 'NORMAL'}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Simulates replaying an expired token (<code>exp &lt; now</code>). PyJWKClient catches expired timestamps and returns 401 Unauthorized.
                    </p>
                  </div>

                  <div
                    onClick={() => setTamperIssuer(!tamperIssuer)}
                    className="guide-box"
                    style={{
                      cursor: 'pointer',
                      borderLeft: `4px solid ${tamperIssuer ? 'var(--red)' : 'var(--line)'}`,
                      background: tamperIssuer ? 'rgba(255, 93, 93, 0.08)' : 'rgba(15, 21, 29, 0.6)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ margin: 0, color: tamperIssuer ? 'var(--red)' : 'var(--text)' }}>
                        3. Rogue Issuer Spoofing
                      </strong>
                      <span className="tag" style={{ font: '9px var(--mono)' }}>{tamperIssuer ? 'ATTACK ACTIVE' : 'NORMAL'}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Token minted by a rogue authentication server (<code>iss != farm360</code>). Flask rejects untrusted issuer claims.
                    </p>
                  </div>
                </div>

                {/* Live Color-Coded JWT String */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="control-label" style={{ margin: 0 }}>Raw Serialized Bearer Token (Base64URL)</span>
                    <span style={{ font: '10px var(--mono)', color: (tamperRole || tamperExpire || tamperIssuer) ? 'var(--red)' : 'var(--teal)' }}>
                      {(tamperRole || tamperExpire || tamperIssuer) ? '⚠️ TAMPER DETECTED — SIGNATURE INVALID' : '✓ VALID KEYCLOAK RS256 TOKEN'}
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
                    <span style={{ color: '#ff5d5d' }}>eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImZhcm0zNjAta2V5Y2xvYWstcnNhLWtleS0yMDI2In0</span>
                    <span style={{ color: 'var(--muted)' }}>.</span>
                    <span style={{ color: '#a78bfa' }}>
                      {btoa(JSON.stringify(tokenPayload)).replace(/=/g, '')}
                    </span>
                    <span style={{ color: 'var(--muted)' }}>.</span>
                    <span style={{ color: (tamperRole || tamperExpire || tamperIssuer) ? 'var(--red)' : '#38bdf8' }}>
                      {tokenSignature}
                    </span>
                  </div>
                </div>

                {/* 3-Column Decoded Inspector */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {/* Header */}
                  <div className="standalone-card" style={{ padding: '16px', borderTop: '3px solid #ff5d5d' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: '#ff5d5d', fontSize: '13px' }}>1. Header (JOSE)</strong>
                      <span className="tag" style={{ font: '8px var(--mono)' }}>Algorithm & Key ID</span>
                    </div>
                    <pre style={{ margin: 0, font: '11px var(--mono)', color: 'var(--text)', background: 'transparent' }}>
                      {JSON.stringify(tokenHeader, null, 2)}
                    </pre>
                    <small style={{ display: 'block', marginTop: '10px', color: 'var(--muted)', fontSize: '10.5px' }}>
                      The <code>kid</code> matches the public key in Keycloak&apos;s JWKS endpoint.
                    </small>
                  </div>

                  {/* Payload */}
                  <div className="standalone-card" style={{ padding: '16px', borderTop: '3px solid #a78bfa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: '#a78bfa', fontSize: '13px' }}>2. Payload (Claims)</strong>
                      <span className="tag" style={{ font: '8px var(--mono)' }}>Identity & Roles</span>
                    </div>
                    <pre style={{ margin: 0, font: '11px var(--mono)', color: 'var(--text)', background: 'transparent', maxHeight: '220px', overflowY: 'auto' }}>
                      {JSON.stringify(tokenPayload, null, 2)}
                    </pre>
                    <small style={{ display: 'block', marginTop: '10px', color: 'var(--muted)', fontSize: '10.5px' }}>
                      Resource servers extract <code>realm_access.roles</code> to enforce RBAC permissions.
                    </small>
                  </div>

                  {/* Signature */}
                  <div className="standalone-card" style={{ padding: '16px', borderTop: '3px solid #38bdf8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: '#38bdf8', fontSize: '13px' }}>3. Signature (RS256)</strong>
                      <span className="tag" style={{ font: '8px var(--mono)' }}>Asymmetric Cryptography</span>
                    </div>
                    <div style={{ padding: '10px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '6px', fontSize: '11px', color: 'var(--text)' }}>
                      <code style={{ color: '#38bdf8', display: 'block', marginBottom: '6px' }}>
                        RSASHA256({'\n'}
                        &nbsp;&nbsp;base64Url(header) + &quot;.&quot; +{'\n'}
                        &nbsp;&nbsp;base64Url(payload),{'\n'}
                        &nbsp;&nbsp;Keycloak_Private_RSA_Key{'\n'}
                        )
                      </code>
                    </div>
                    <small style={{ display: 'block', marginTop: '10px', color: 'var(--muted)', fontSize: '10.5px' }}>
                      Only Keycloak possesses the private key. Changing a single character in the payload invalidates this signature!
                    </small>
                  </div>
                </div>
              </div>

              {/* Symmetric vs Asymmetric Architecture Comparison */}
              <div className="standalone-card" style={{ padding: '24px' }}>
                <span className="control-label" style={{ display: 'block', marginBottom: '8px' }}>Architectural Comparison</span>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Why Enterprise Systems Choose RS256 over HS256</h3>

                <div className="guide-table-wrap" style={{ margin: 0 }}>
                  <table className="guide-table">
                    <thead>
                      <tr>
                        <th>Architectural Dimension</th>
                        <th>Symmetric (HS256)</th>
                        <th>Asymmetric (RS256 with Keycloak)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Secret Sharing</strong></td>
                        <td style={{ color: 'var(--red)' }}>Shared Secret must be distributed to every single microservice</td>
                        <td style={{ color: 'var(--teal)' }}>Private Key stays strictly inside Keycloak; public certs distributed via JWKS</td>
                      </tr>
                      <tr>
                        <td><strong>Blast Radius</strong></td>
                        <td style={{ color: 'var(--red)' }}>If 1 service leaks the secret, attacker can forge tokens for all services</td>
                        <td style={{ color: 'var(--teal)' }}>Compromise of a resource server leaks only public keys (zero forgery risk)</td>
                      </tr>
                      <tr>
                        <td><strong>Key Rotation</strong></td>
                        <td style={{ color: 'var(--amber)' }}>Requires coordinated redeployment of all microservices simultaneously</td>
                        <td style={{ color: 'var(--teal)' }}>Zero-downtime rotation: Keycloak publishes new key in JWKS with new <code>kid</code></td>
                      </tr>
                      <tr>
                        <td><strong>Third-Party Integration</strong></td>
                        <td style={{ color: 'var(--red)' }}>Impossible: You cannot give partners your secret signing key</td>
                        <td style={{ color: 'var(--teal)' }}>Seamless: Third parties verify tokens against public <code>/certs</code> endpoint</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* TAB 3: COMPLETE TECHNICAL GUIDE                               */}
        {/* ============================================================= */}
        {activeTab === 'guide' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              <div className="standalone-guide-layout" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px' }}>
                {/* Sticky TOC Sidebar */}
                <aside className="guide-toc-sidebar" style={{ position: 'sticky', top: '24px', height: 'fit-content' }}>
                  <div className="standalone-card" style={{ padding: '16px' }}>
                    <span className="control-label" style={{ display: 'block', marginBottom: '10px' }}>Table of Contents</span>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <a href="#sec-1" className="toc-link">1. IAM in Distributed Systems</a>
                      <a href="#sec-2" className="toc-link">2. OAuth 2.0 vs OpenID Connect</a>
                      <a href="#sec-3" className="toc-link">3. Anatomy of a JSON Web Token</a>
                      <a href="#sec-4" className="toc-link">4. Symmetric vs Asymmetric Crypto</a>
                      <a href="#sec-5" className="toc-link">5. The JWKS Protocol at Scale</a>
                      <a href="#sec-6" className="toc-link">6. Flask & PyJWKClient Implementation</a>
                      <a href="#sec-7" className="toc-link">7. Keycloak Realms, Clients & Roles</a>
                      <a href="#sec-8" className="toc-link">8. Docker Compose Architecture</a>
                      <a href="#sec-9" className="toc-link">9. Token Lifecycles & Refresh</a>
                      <a href="#sec-10" className="toc-link">10. Production Security Hardening</a>
                    </nav>
                  </div>
                </aside>

                {/* Article Content */}
                <article className="guide-article-body">
                  <section id="sec-1">
                    <h2>1. The Challenge of Identity & Access Management (IAM)</h2>
                    <p>
                      In monolithic web applications, authentication was historically simple: a user submitted credentials,
                      the application verified the password hash in a database, created a session in Redis or server memory,
                      and returned a stateful cookie.
                    </p>
                    <p>
                      However, in distributed microservice architectures, this model collapses. If 50 microservices must handle
                      user requests, querying a centralized session database for every single HTTP request creates an untenable
                      bottleneck, single point of failure (SPOF), and high inter-service latency.
                    </p>
                    <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                      <strong>The Solution: Decentralized Stateless Verification</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                        Centralize <em>authentication</em> in a dedicated Identity Provider (Keycloak), while decentralizing
                        <em>authorization verification</em> using cryptographically signed, tamper-proof JSON Web Tokens (JWT).
                      </p>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  <section id="sec-2">
                    <h2>2. OAuth 2.0 vs OpenID Connect (OIDC) Demystified</h2>
                    <p>
                      Many developers conflate OAuth 2.0 and OpenID Connect. While closely related, they solve two fundamentally different problems:
                    </p>
                    <ul>
                      <li>
                        <strong>OAuth 2.0 (Authorization Framework):</strong> Designed to grant delegated access to resources without sharing credentials
                        (e.g., &quot;Allow Service A to read photos from Service B&quot;). It issues an <em>Access Token</em>, which is an opaque or structured
                        bearer token meant for the API.
                      </li>
                      <li>
                        <strong>OpenID Connect (Authentication Layer):</strong> An identity layer built directly on top of OAuth 2.0. It introduces the
                        <em>ID Token</em> (always a JWT) and the <code>/userinfo</code> endpoint to answer the question: <em>&quot;Who is the user?&quot;</em>
                      </li>
                    </ul>

                    <div className="ascii-diagram-card">
                      <span className="term-faint">OIDC PROTOCOL STACK</span>
                      <pre>{`+-------------------------------------------------------------+
|         OpenID Connect 1.0 (Identity: ID Token / UserInfo)  |
+-------------------------------------------------------------+
|           OAuth 2.0 Framework (Access Tokens & Scopes)       |
+-------------------------------------------------------------+
|    JSON Web Token (JWT)  |  JSON Web Key Sets (JWKS)        |
+-------------------------------------------------------------+
|                    TLS / HTTPS Transport                    |
+-------------------------------------------------------------+`}</pre>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  <section id="sec-3">
                    <h2>3. Anatomy of a JSON Web Token (JWT)</h2>
                    <p>
                      A JWT is a compact, URL-safe means of representing claims between two parties. It is composed of three parts
                      concatenated by dots (<code>.</code>):
                    </p>
                    <ol>
                      <li>
                        <strong>Header:</strong> Specifies the cryptographic algorithm (e.g. <code>RS256</code>) and the Key ID (<code>kid</code>)
                        used to locate the public certificate.
                      </li>
                      <li>
                        <strong>Payload:</strong> Contains identity claims such as <code>iss</code> (Issuer), <code>sub</code> (Subject / User ID),
                        <code>aud</code> (Audience), <code>exp</code> (Expiration), and application roles (<code>realm_access.roles</code>).
                      </li>
                      <li>
                        <strong>Signature:</strong> A digital signature produced by encrypting the SHA-256 hash of <code>Header + &quot;.&quot; + Payload</code>
                        using Keycloak&apos;s private RSA key.
                      </li>
                    </ol>
                  </section>

                  <hr className="guide-divider" />

                  <section id="sec-4">
                    <h2>4. Symmetric (HS256) vs Asymmetric (RS256) Cryptography</h2>
                    <p>
                      A critical design choice in microservice security is the choice of cryptographic signing algorithm:
                    </p>
                    <div className="guide-grid-two">
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--amber)' }}>
                        <strong>HS256 (HMAC with SHA-256)</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                          Uses a single symmetric secret key for both signing and verification. Every backend API service must have
                          the secret key. If an attacker breaches one minor service and dumps its environment variables, they can forge
                          administrator tokens for the entire platform!
                        </p>
                      </div>
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>RS256 (RSA Signature with SHA-256)</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                          Uses an asymmetric keypair. Keycloak retains the 2048-bit Private Key to sign tokens. All microservices only
                          hold the Public Certificate to verify signatures. Even if all 50 microservices are completely compromised,
                          an attacker cannot forge a valid token!
                        </p>
                      </div>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  <section id="sec-5">
                    <h2>5. The JWKS Protocol: Stateless Verification at Scale</h2>
                    <p>
                      How do microservices acquire Keycloak&apos;s public keys without manual configuration file sharing?
                      Via the <strong>JSON Web Key Set (JWKS)</strong> specification (RFC 7517).
                    </p>
                    <p>
                      Keycloak automatically exposes its active public keys at a standardized endpoint:
                      <br />
                      <code>GET /realms/farm360/protocol/openid-connect/certs</code>
                    </p>
                    <p>
                      When a request hits the Flask Resource API, the <code>PyJWKClient</code> checks the token&apos;s <code>kid</code> header.
                      If the key is already in memory, it verifies the signature locally in microseconds. If the key is new, it fetches
                      the JWKS document over HTTP, caches it, and verifies. This achieves completely stateless horizontal scalability!
                    </p>
                  </section>

                  <hr className="guide-divider" />

                  <section id="sec-6">
                    <h2>6. Flask & PyJWKClient Implementation Pattern</h2>
                    <p>
                      In our repository, the Flask API uses a clean Python decorator (<code>@require_roles</code>) to enforce both
                      authentication and role authorization:
                    </p>

                    <div className="code-block">
                      <pre>{`def require_roles(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing Bearer token"}), 401

            token = auth_header.split(" ")[1]
            try:
                # 1. Fetch public signing key from cached JWKS
                signing_key = _jwks_client.get_signing_key_from_jwt(token)
                
                # 2. Asymmetrically verify RS256 signature, issuer, and audience
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["RS256"],
                    issuer="http://localhost:8080/realms/farm360",
                    audience="farm360-api",
                )
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError as e:
                return jsonify({"error": f"Invalid token: {e}"}), 401

            # 3. RBAC Role Evaluation
            user_roles = set(payload.get("realm_access", {}).get("roles", []))
            if allowed_roles and not (user_roles & set(allowed_roles)):
                return jsonify({"error": "Forbidden: Insufficient privileges"}), 403

            g.current_user = payload
            return fn(*args, **kwargs)
        return wrapper
    return decorator`}</pre>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  <section id="sec-7">
                    <h2>7. Keycloak Realms, Clients, Roles & Groups</h2>
                    <p>
                      Keycloak models enterprise multi-tenancy and permissions with four core abstractions:
                    </p>
                    <ul>
                      <li>
                        <strong>Realm:</strong> An isolated security domain containing users, credentials, roles, and clients. Our application uses the
                        <code>farm360</code> realm, completely separated from the <code>master</code> administrative realm.
                      </li>
                      <li>
                        <strong>Clients:</strong> Applications requesting authentication. <code>farm360-web</code> is configured as a public OIDC client
                        supporting both Authorization Code Flow (browser) and Direct Access Grants (CLI/automation).
                      </li>
                      <li>
                        <strong>Realm Roles:</strong> Global permission tags such as <code>farmer</code>, <code>service_provider</code>, and <code>admin</code>.
                      </li>
                      <li>
                        <strong>Groups:</strong> Organizational collections of users (e.g. <code>Farmers</code> group maps directly to the <code>farmer</code> role),
                        enabling bulk user onboarding.
                      </li>
                    </ul>
                  </section>

                  <hr className="guide-divider" />

                  <section id="sec-8">
                    <h2>8. Docker Compose Multi-Container Orchestration</h2>
                    <p>
                      The repository provides an automated local development lab orchestrated via Docker Compose:
                    </p>
                    <div className="ascii-diagram-card">
                      <span className="term-faint">DOCKER CONTAINER TOPOLOGY</span>
                      <pre>{`+-------------------+      +-------------------+      +-------------------+
|  Nginx Frontend   |      |   Keycloak 26.0   |      |  PostgreSQL 16    |
|   (Port 3000)     |      |    (Port 8080)    |      |    (Port 5432)    |
+---------+---------+      +---------+---------+      +---------+---------+
          |                          |                          |
          |       OAuth Code Flow    |      JDBC Connection     |
          +------------------------->+<-------------------------+
          |                          |
          | Bearer Token API Calls   | JWKS Public Cert Sync
          v                          v
+------------------------------------+
|       Flask Resource API (Port 5001 / Internal :5000)        |
+--------------------------------------------------------------+`}</pre>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  <section id="sec-9">
                    <h2>9. Token Lifecycles, Expiration, and Refresh Rotation</h2>
                    <p>
                      Security requires balancing convenience against exposure risk:
                    </p>
                    <ul>
                      <li>
                        <strong>Short-Lived Access Tokens:</strong> Configured for 5 to 15 minutes. If an access token is intercepted, the attacker&apos;s
                        window of opportunity is strictly bounded.
                      </li>
                      <li>
                        <strong>Refresh Tokens:</strong> Long-lived credentials stored in <code>HttpOnly</code>, <code>Secure</code> cookies. When the access token expires,
                        the client sends the refresh token to <code>POST /protocol/openid-connect/token</code> to acquire a fresh token pair.
                      </li>
                      <li>
                        <strong>Refresh Token Rotation:</strong> Keycloak issues a new refresh token with each refresh request and invalidates the previous one.
                        If an attacker attempts to reuse an old refresh token, Keycloak detects token theft and invalidates the entire session family!
                      </li>
                    </ul>
                  </section>

                  <hr className="guide-divider" />

                  <section id="sec-10">
                    <h2>10. Enterprise Security Hardening & Zero-Trust Best Practices</h2>
                    <p>
                      Key security guardrails implemented in this project:
                    </p>
                    <div className="guide-grid-two">
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>1. Strict Audience Validation</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Tokens issued for <code>Client A</code> cannot be presented to <code>API B</code>. The resource server rejects tokens whose <code>aud</code> claim
                          does not match <code>farm360-api</code>.
                        </p>
                      </div>
                      <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                        <strong>2. Localhost Network Isolation</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Docker Compose binds service ports strictly to <code>127.0.0.1</code>, preventing public interface exposure during local development.
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
        {/* TAB 4: PRODUCTION CONFIGS                                     */}
        {/* ============================================================= */}
        {activeTab === 'configs' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              <div className="standalone-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <span className="control-label" style={{ display: 'block', marginBottom: '4px' }}>Production Artifacts</span>
                    <h2 style={{ fontSize: '20px', margin: 0 }}>Tested Configuration & Code Blueprints</h2>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'docker-compose' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('docker-compose')}
                    >
                      docker-compose.yml
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'flask-api' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('flask-api')}
                    >
                      api/app.py
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'demo-script' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('demo-script')}
                    >
                      demo_auth.sh
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'env' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('env')}
                    >
                      .env.example
                    </button>
                  </div>
                </div>

                {/* Config Display */}
                {activeConfig === 'docker-compose' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="term-faint">docker-compose.yml</span>
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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak -d keycloak"]
      interval: 5s
      timeout: 3s
      retries: 10

  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: start-dev
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: \${POSTGRES_PASSWORD}
      KC_BOOTSTRAP_ADMIN_USERNAME: \${KC_ADMIN_USER}
      KC_BOOTSTRAP_ADMIN_PASSWORD: \${KC_ADMIN_PASSWORD}
    ports:
      - "127.0.0.1:8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

  api:
    build: ./api
    volumes:
      - ./api/app.py:/app/app.py:ro
    environment:
      TOKEN_ISSUER: http://localhost:8080/realms/farm360
      JWKS_URL: http://keycloak:8080/realms/farm360/protocol/openid-connect/certs
      API_AUDIENCE: farm360-api
      KEYCLOAK_INTERNAL_URL: http://keycloak:8080
      KEYCLOAK_REALM: farm360
    ports:
      - "127.0.0.1:5001:5000"
    depends_on:
      - keycloak

  frontend:
    image: nginx:alpine
    volumes:
      - ./frontend:/usr/share/nginx/html:ro
    ports:
      - "127.0.0.1:3000:80"
    depends_on:
      - api
      - keycloak

volumes:
  pgdata:`, 'compose')}
                      >
                        {copiedCode === 'compose' ? '✓ Copied' : 'Copy docker-compose.yml'}
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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak -d keycloak"]
      interval: 5s
      timeout: 3s
      retries: 10

  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: start-dev
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: \${POSTGRES_PASSWORD}
      KC_BOOTSTRAP_ADMIN_USERNAME: \${KC_ADMIN_USER}
      KC_BOOTSTRAP_ADMIN_PASSWORD: \${KC_ADMIN_PASSWORD}
    ports:
      - "127.0.0.1:8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

  api:
    build: ./api
    volumes:
      - ./api/app.py:/app/app.py:ro
    environment:
      TOKEN_ISSUER: http://localhost:8080/realms/farm360
      JWKS_URL: http://keycloak:8080/realms/farm360/protocol/openid-connect/certs
      API_AUDIENCE: farm360-api
      KEYCLOAK_INTERNAL_URL: http://keycloak:8080
      KEYCLOAK_REALM: farm360
    ports:
      - "127.0.0.1:5001:5000"
    depends_on:
      - keycloak

  frontend:
    image: nginx:alpine
    volumes:
      - ./frontend:/usr/share/nginx/html:ro
    ports:
      - "127.0.0.1:3000:80"
    depends_on:
      - api
      - keycloak

volumes:
  pgdata:`}</pre>
                    </div>
                  </div>
                )}

                {activeConfig === 'flask-api' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="term-faint">api/app.py (PyJWKClient RS256 Verification & RBAC)</span>
                      <button
                        type="button"
                        className="button"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(`import os
from functools import wraps
import jwt
from flask import Flask, g, jsonify, request
from jwt import PyJWKClient

app = Flask(__name__)
JWKS_URL = os.environ.get("JWKS_URL", "http://keycloak:8080/realms/farm360/protocol/openid-connect/certs")
ISSUER = os.environ.get("TOKEN_ISSUER", "http://localhost:8080/realms/farm360")
AUDIENCE = os.environ.get("API_AUDIENCE", "farm360-api")

_jwks_client = PyJWKClient(JWKS_URL, cache_keys=True)

def require_roles(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or malformed Authorization header"}), 401

            token = auth_header.split(" ")[1]
            try:
                signing_key = _jwks_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["RS256"],
                    issuer=ISSUER,
                    audience=AUDIENCE,
                )
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token has expired"}), 401
            except jwt.InvalidTokenError as e:
                return jsonify({"error": f"Invalid token: {e}"}), 401

            user_roles = set(payload.get("realm_access", {}).get("roles", []))
            if allowed_roles and not (user_roles & set(allowed_roles)):
                return jsonify({"error": "Forbidden: Insufficient privileges"}), 403

            g.current_user = payload
            return fn(*args, **kwargs)
        return wrapper
    return decorator`, 'flask')}
                      >
                        {copiedCode === 'flask' ? '✓ Copied' : 'Copy api/app.py'}
                      </button>
                    </div>
                    <div className="code-block" style={{ margin: 0 }}>
                      <pre>{`import os
from functools import wraps
import jwt
from flask import Flask, g, jsonify, request
from jwt import PyJWKClient

app = Flask(__name__)
JWKS_URL = os.environ.get("JWKS_URL", "http://keycloak:8080/realms/farm360/protocol/openid-connect/certs")
ISSUER = os.environ.get("TOKEN_ISSUER", "http://localhost:8080/realms/farm360")
AUDIENCE = os.environ.get("API_AUDIENCE", "farm360-api")

# Stateless public key client with automatic caching
_jwks_client = PyJWKClient(JWKS_URL, cache_keys=True)

def require_roles(*allowed_roles):
    """Decorator enforcing RS256 token verification + Role-Based Access Control."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or malformed Authorization header"}), 401

            token = auth_header.split(" ")[1]
            try:
                signing_key = _jwks_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["RS256"],
                    issuer=ISSUER,
                    audience=AUDIENCE,
                )
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token has expired"}), 401
            except jwt.InvalidTokenError as e:
                return jsonify({"error": f"Invalid token: {e}"}), 401

            user_roles = set(payload.get("realm_access", {}).get("roles", []))
            if allowed_roles and not (user_roles & set(allowed_roles)):
                return jsonify({"error": "Forbidden: Insufficient privileges"}), 403

            g.current_user = payload
            return fn(*args, **kwargs)
        return wrapper
    return decorator`}</pre>
                    </div>
                  </div>
                )}

                {activeConfig === 'demo-script' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="term-faint">demo_auth.sh (CLI cURL OAuth Test Script)</span>
                      <button
                        type="button"
                        className="button"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(`#!/usr/bin/env bash
set -e

KEYCLOAK_URL="http://localhost:8080"
API_URL="http://localhost:5001"
REALM="farm360"
CLIENT_ID="farm360-web"

echo "=== 1. Requesting Token for Ramesh (Farmer) ==="
RAMESH_RESP=$(curl -s -X POST "\${KEYCLOAK_URL}/realms/\${REALM}/protocol/openid-connect/token" \\
  -d grant_type=password \\
  -d client_id="\${CLIENT_ID}" \\
  -d username=ramesh \\
  -d password=ramesh123)

RAMESH_TOKEN=$(echo "$RAMESH_RESP" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("access_token", ""))')

echo "=== 2. Ramesh accesses /api/crops (Expect 200 OK) ==="
curl -s -i -H "Authorization: Bearer $RAMESH_TOKEN" "\${API_URL}/api/crops" | head -n 7

echo "=== 3. Ramesh accesses /api/admin/users (Expect 403 Forbidden) ==="
curl -s -i -H "Authorization: Bearer $RAMESH_TOKEN" "\${API_URL}/api/admin/users" | head -n 7`, 'demo')}
                      >
                        {copiedCode === 'demo' ? '✓ Copied' : 'Copy demo_auth.sh'}
                      </button>
                    </div>
                    <div className="code-block" style={{ margin: 0 }}>
                      <pre>{`#!/usr/bin/env bash
set -e

KEYCLOAK_URL="http://localhost:8080"
API_URL="http://localhost:5001"
REALM="farm360"
CLIENT_ID="farm360-web"

echo "=== 1. Requesting Token for Ramesh (Farmer) ==="
RAMESH_RESP=$(curl -s -X POST "\${KEYCLOAK_URL}/realms/\${REALM}/protocol/openid-connect/token" \\
  -d grant_type=password \\
  -d client_id="\${CLIENT_ID}" \\
  -d username=ramesh \\
  -d password=ramesh123)

RAMESH_TOKEN=$(echo "$RAMESH_RESP" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("access_token", ""))')

echo "=== 2. Ramesh accesses /api/crops (Expect 200 OK) ==="
curl -s -i -H "Authorization: Bearer $RAMESH_TOKEN" "\${API_URL}/api/crops" | head -n 7

echo "=== 3. Ramesh accesses /api/admin/users (Expect 403 Forbidden) ==="
curl -s -i -H "Authorization: Bearer $RAMESH_TOKEN" "\${API_URL}/api/admin/users" | head -n 7`}</pre>
                    </div>
                  </div>
                )}

                {activeConfig === 'env' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="term-faint">.env.example</span>
                      <button
                        type="button"
                        className="button"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(`POSTGRES_PASSWORD=Stronghold_2501
KC_ADMIN_USER=admin
KC_ADMIN_PASSWORD=Admin@2601
KEYCLOAK_REALM=farm360
API_AUDIENCE=farm360-api`, 'env')}
                      >
                        {copiedCode === 'env' ? '✓ Copied' : 'Copy .env.example'}
                      </button>
                    </div>
                    <div className="code-block" style={{ margin: 0 }}>
                      <pre>{`# Keycloak & PostgreSQL Credentials
POSTGRES_PASSWORD=Stronghold_2501
KC_ADMIN_USER=admin
KC_ADMIN_PASSWORD=Admin@2601

# Realm & Audience Guardrails
KEYCLOAK_REALM=farm360
API_AUDIENCE=farm360-api
TOKEN_ISSUER=http://localhost:8080/realms/farm360`}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* TAB 5: SECURITY AUDIT & IAM BEST PRACTICES                    */}
        {/* ============================================================= */}
        {activeTab === 'security' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Security Matrix */}
                <div className="standalone-card" style={{ padding: '24px' }}>
                  <span className="control-label" style={{ display: 'block', marginBottom: '8px' }}>Security Audit</span>
                  <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Authentication Pattern Security Tradeoffs</h3>

                  <div className="guide-table-wrap" style={{ margin: 0 }}>
                    <table className="guide-table">
                      <thead>
                        <tr>
                          <th>Vector</th>
                          <th>Naive / Basic Auth</th>
                          <th>Keycloak OIDC + RS256</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Credential Storage</strong></td>
                          <td style={{ color: 'var(--red)' }}>Passwords handled by application APIs</td>
                          <td style={{ color: 'var(--teal)' }}>Centralized Argon2/PBKDF2 in Keycloak only</td>
                        </tr>
                        <tr>
                          <td><strong>Token Tampering</strong></td>
                          <td style={{ color: 'var(--red)' }}>Unsigned or weak HMAC keys prone to brute force</td>
                          <td style={{ color: 'var(--teal)' }}>2048-bit RSA asymmetric digital signatures</td>
                        </tr>
                        <tr>
                          <td><strong>Service Scaling</strong></td>
                          <td style={{ color: 'var(--amber)' }}>Central DB queried on every API hit</td>
                          <td style={{ color: 'var(--teal)' }}>Stateless verification via cached JWKS certs</td>
                        </tr>
                        <tr>
                          <td><strong>Account Lockout / MFA</strong></td>
                          <td style={{ color: 'var(--red)' }}>Must be coded manually into each service</td>
                          <td style={{ color: 'var(--teal)' }}>Built-in TOTP, WebAuthn & brute-force detection</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Defense-in-Depth Guardrails */}
                <div className="standalone-card" style={{ padding: '24px' }}>
                  <span className="control-label" style={{ display: 'block', marginBottom: '8px' }}>Production Hardening</span>
                  <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>IAM Defense-in-Depth Guardrails</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                      <strong>1. Short Access Token TTL (5–15 Minutes)</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                        Short lifespans drastically reduce the attack window if an access token is leaked. Refresh tokens handle background renewal.
                      </p>
                    </div>

                    <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                      <strong>2. HttpOnly, SameSite & Secure Cookie Storage</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                        Tokens stored in browser LocalStorage are vulnerable to Cross-Site Scripting (XSS). Storing refresh tokens in <code>HttpOnly; SameSite=Strict</code> cookies mitigates token exfiltration.
                      </p>
                    </div>

                    <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                      <strong>3. Audience & Issuer Strict Validation</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                        Prevent token substitution attacks by enforcing that <code>iss</code> matches the exact realm URL and <code>aud</code> matches the intended API identifier.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

