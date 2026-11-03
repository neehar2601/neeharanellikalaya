import { useState } from 'react'

export type AuthPersona = 'anonymous' | 'farmer' | 'service_provider' | 'admin' | 'tampered'
export type AuthEndpoint = 'public' | 'me' | 'crops' | 'services' | 'admin-users' | 'reset-pwd'

interface AuthTopologyMapProps {
  persona: AuthPersona
  endpoint: AuthEndpoint
  decision: 'ALLOW' | 'DENY_401' | 'DENY_403'
  onSelectPersona?: (persona: AuthPersona) => void
  onSelectEndpoint?: (endpoint: AuthEndpoint) => void
}

interface PathDef {
  id: string
  d: string
  label?: string
  labelX?: number
  labelY?: number
  color: string
  packetColor: string
  dur: string
  delay?: string
  active: boolean
  isBlocked?: boolean
}

export function AuthTopologyMap({
  persona,
  endpoint,
  decision,
}: AuthTopologyMapProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // -------------------------------------------------------------
  // PATH DEFINITIONS & FLOW LOGIC
  // -------------------------------------------------------------
  const isAnonymous = persona === 'anonymous'
  const isTampered = persona === 'tampered'
  const isDenied = decision !== 'ALLOW'

  // Path 1: Client -> Keycloak (Port 8080) for OAuth Login
  const authLoginActive = !isAnonymous && !isTampered
  // Path 2: Keycloak -> Postgres (Port 5432) for User Store validation
  const keycloakDbActive = authLoginActive
  // Path 3: Keycloak -> Client (Token issue with RS256 signature)
  const tokenIssueActive = authLoginActive
  // Path 4: Keycloak JWKS -> Flask API (Public key cert distribution)
  const jwksActive = true
  // Path 5: Client -> Flask API (Bearer Token Request)
  const apiRequestActive = true
  // Path 6: Flask API -> RBAC Gate (Claims check)
  const rbacActive = !isAnonymous
  // Path 7: RBAC Gate -> App Postgres DB (Authorized query)
  const appDbActive = decision === 'ALLOW' && endpoint !== 'public'

  const paths: PathDef[] = [
    // 1. Client to Keycloak OAuth Token Endpoint
    {
      id: 'client-to-kc',
      d: 'M 140 220 C 180 180, 220 140, 310 140',
      label: '1. POST /token (OAuth 2.0 Credentials)',
      labelX: 200,
      labelY: 155,
      color: authLoginActive ? '#38bdf8' : '#2b3846',
      packetColor: '#38bdf8',
      dur: '1.8s',
      delay: '0s',
      active: authLoginActive,
    },
    // 2. Keycloak to Postgres DB (User & Role Verification)
    {
      id: 'kc-to-db',
      d: 'M 450 140 L 590 140',
      label: '2. Query Realm Store (Roles & Credentials)',
      labelX: 520,
      labelY: 125,
      color: keycloakDbActive ? '#a78bfa' : '#2b3846',
      packetColor: '#a78bfa',
      dur: '1.5s',
      delay: '0.3s',
      active: keycloakDbActive,
    },
    // 3. Keycloak Issues RS256 Signed JWT back to Client
    {
      id: 'kc-to-client',
      d: 'M 310 160 C 240 180, 190 220, 140 250',
      label: '3. Return RS256 Signed Bearer Token',
      labelX: 205,
      labelY: 220,
      color: tokenIssueActive ? '#4fd1c5' : '#2b3846',
      packetColor: '#4fd1c5',
      dur: '1.8s',
      delay: '0.6s',
      active: tokenIssueActive,
    },
    // 4. JWKS Public Keys: Keycloak -> Flask API Resource Server
    {
      id: 'jwks-sync',
      d: 'M 380 190 L 380 320',
      label: '4. JWKS Certs (/openid-connect/certs)',
      labelX: 385,
      labelY: 260,
      color: '#38bdf8',
      packetColor: '#38bdf8',
      dur: '2.5s',
      delay: '1.0s',
      active: jwksActive,
    },
    // 5. Client to Flask API (Bearer Token Request)
    {
      id: 'client-to-api',
      d: 'M 140 280 C 200 320, 240 370, 310 370',
      label: isAnonymous
        ? '5. Request WITHOUT Bearer Token'
        : isTampered
          ? '5. Request with TAMPERED Bearer Token'
          : '5. Request with Bearer Token (Authorization)',
      labelX: 195,
      labelY: 345,
      color: isTampered ? '#ff5d5d' : isAnonymous ? '#e8a33d' : '#4fd1c5',
      packetColor: isTampered ? '#ff5d5d' : isAnonymous ? '#e8a33d' : '#4fd1c5',
      dur: '1.8s',
      delay: '0.8s',
      active: apiRequestActive,
    },
    // 6. Flask API to RBAC Policy Gate
    {
      id: 'api-to-rbac',
      d: 'M 450 370 L 580 370',
      label: isTampered
        ? '6. RS256 Verify Fails (Signature Mismatch!)'
        : isAnonymous && endpoint !== 'public'
          ? '6. Missing Token (401 Unauthorized)'
          : '6. Stateless JWKS Verify & RBAC Gate',
      labelX: 515,
      labelY: 355,
      color: decision === 'ALLOW' ? '#4fd1c5' : decision === 'DENY_401' ? '#e8a33d' : '#ff5d5d',
      packetColor: decision === 'ALLOW' ? '#4fd1c5' : decision === 'DENY_401' ? '#e8a33d' : '#ff5d5d',
      dur: '1.6s',
      delay: '1.2s',
      active: rbacActive || endpoint === 'public',
      isBlocked: isDenied && endpoint !== 'public',
    },
    // 7. RBAC Gate to Application Database (Postgres)
    {
      id: 'rbac-to-db',
      d: 'M 720 370 C 760 370, 780 300, 720 220 L 690 190',
      label: '7. Authorized Data Query (SQL)',
      labelX: 740,
      labelY: 280,
      color: appDbActive ? '#4fd1c5' : '#2b3846',
      packetColor: '#4fd1c5',
      dur: '1.6s',
      delay: '1.5s',
      active: appDbActive,
    },
  ]

  return (
    <div className="standalone-topology-canvas" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Top Banner & Context Info */}
      <div className="topology-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              className="topology-badge"
              style={{
                color: decision === 'ALLOW' ? 'var(--teal)' : decision === 'DENY_401' ? 'var(--amber)' : 'var(--red)',
                borderColor: decision === 'ALLOW' ? 'rgba(79,209,197,0.3)' : decision === 'DENY_401' ? 'rgba(232,163,61,0.3)' : 'rgba(255,93,93,0.3)',
                background: decision === 'ALLOW' ? 'rgba(79,209,197,0.08)' : decision === 'DENY_401' ? 'rgba(232,163,61,0.08)' : 'rgba(255,93,93,0.08)',
              }}
            >
              {decision === 'ALLOW' && 'STATUS: 200 OK · AUTHORIZED'}
              {decision === 'DENY_401' && 'STATUS: 401 UNAUTHORIZED · INVALID / MISSING TOKEN'}
              {decision === 'DENY_403' && 'STATUS: 403 FORBIDDEN · ROLE ACCESS DENIED'}
            </span>
            <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>
              REALM: <strong style={{ color: 'var(--text)' }}>farm360</strong> · CLIENT: <strong style={{ color: 'var(--text)' }}>farm360-web</strong>
            </span>
          </div>
          <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>OAuth 2.0 / OIDC & RS256 Stateless Token Verification Flow</span>
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)', maxWidth: '780px' }}>
            {decision === 'ALLOW' && 'Token cryptographically verified via public JWKS. User role satisfies the required endpoint policy gate. Resource served from PostgreSQL.'}
            {decision === 'DENY_401' && 'Request blocked at authentication gate. Either Authorization Bearer header was missing or RSA signature failed validation against JWKS public key.'}
            {decision === 'DENY_403' && 'Authentication passed, but authorization failed. User token lacks required realm role permissions for this endpoint.'}
          </p>
        </div>

        {/* Legend */}
        <div className="gallery-flow-legend" style={{ gap: '12px', margin: 0 }}>
          <span><i className="legend-dot" style={{ background: '#38bdf8', boxShadow: '0 0 9px rgba(56,189,248,0.5)' }} /> OAuth / JWKS</span>
          <span><i className="legend-dot teal" /> Authorized Bearer Flow</span>
          <span><i className="legend-dot amber" /> Missing Token (401)</span>
          <span><i className="legend-dot" style={{ background: '#ff5d5d', boxShadow: '0 0 9px rgba(255,93,93,0.5)' }} /> Deflected / 403 Forbidden</span>
          <span><i className="legend-dot" style={{ background: '#a78bfa', boxShadow: '0 0 9px rgba(167,139,250,0.5)' }} /> Keycloak Internal DB</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="gallery-live-map-canvas" style={{ minHeight: '520px', position: 'relative' }}>
        <div className="gallery-grid-overlay" />

        <svg
          className="gallery-flow-svg"
          viewBox="0 0 960 520"
          role="img"
          aria-label="Keycloak OAuth 2.0 Architecture Flow"
        >
          <defs>
            <filter id="auth-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="block-spark" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* BACKGROUND BOUNDARY ZONES */}
          {/* Identity Provider Zone */}
          <rect
            x="280"
            y="70"
            width="460"
            height="140"
            rx="12"
            fill="rgba(56, 189, 248, 0.03)"
            stroke="rgba(56, 189, 248, 0.2)"
            strokeDasharray="4 4"
          />
          <text x="295" y="92" fill="#38bdf8" fontSize="10" fontFamily="var(--mono)" letterSpacing="0.05em">
            IAM BOUNDARY: KEYCLOAK IDENTITY PROVIDER (PORT 8080)
          </text>

          {/* Resource Server Zone */}
          <rect
            x="280"
            y="290"
            width="460"
            height="160"
            rx="12"
            fill="rgba(79, 209, 197, 0.03)"
            stroke="rgba(79, 209, 197, 0.2)"
            strokeDasharray="4 4"
          />
          <text x="295" y="312" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)" letterSpacing="0.05em">
            RESOURCE SERVER BOUNDARY: FLASK API &amp; RBAC GATE (PORT 5001)
          </text>

          {/* ANIMATED PACKET PATHS */}
          {paths.map((p) => {
            return (
              <g key={p.id}>
                {/* Background base path */}
                <path
                  d={p.d}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={p.active ? 2.5 : 1.2}
                  strokeOpacity={p.active ? 0.8 : 0.2}
                  strokeDasharray={p.active ? 'none' : '4 4'}
                />

                {/* Animated Packet Stream */}
                {p.active && (
                  <path
                    d={p.d}
                    fill="none"
                    stroke={p.packetColor}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray="10 120"
                    filter="url(#auth-glow)"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="130"
                      to="0"
                      dur={p.dur}
                      begin={p.delay || '0s'}
                      repeatCount="indefinite"
                    />
                  </path>
                )}

                {/* Path Micro-Label */}
                {p.label && p.labelX && p.labelY && p.active && (
                  <text
                    x={p.labelX}
                    y={p.labelY}
                    fill={p.isBlocked ? '#ff5d5d' : 'var(--muted)'}
                    fontSize="9"
                    fontFamily="var(--mono)"
                    textAnchor="middle"
                  >
                    {p.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* BLOCKED DEFLECTION SPARK IF DENIED */}
          {isDenied && endpoint !== 'public' && (
            <g transform="translate(580, 370)">
              <circle r="16" fill="rgba(255, 93, 93, 0.25)" filter="url(#block-spark)" />
              <circle r="8" fill="#ff5d5d" />
              <text x="0" y="28" fill="#ff5d5d" fontSize="10" fontWeight="700" fontFamily="var(--mono)" textAnchor="middle">
                {decision === 'DENY_401' ? '401 BLOCKED' : '403 FORBIDDEN'}
              </text>
            </g>
          )}

          {/* ------------------------------------------------------------- */}
          {/* ARCHITECTURE NODES */}
          {/* ------------------------------------------------------------- */}

          {/* NODE 1: CLIENT / FRONTEND / CLI */}
          <g
            className="topo-interactive-node"
            transform="translate(40, 200)"
            onMouseEnter={() => setHoveredNode('client')}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              width="100"
              height="100"
              rx="10"
              fill="#0f151d"
              stroke={isTampered ? '#ff5d5d' : isAnonymous ? '#e8a33d' : '#4fd1c5'}
              strokeWidth="1.8"
            />
            <text x="50" y="28" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">CLIENT TIER</text>
            <text x="50" y="48" fill="var(--text)" fontSize="12" fontWeight="700" textAnchor="middle">
              {persona === 'farmer' && '🌾 Ramesh'}
              {persona === 'service_provider' && '🚜 Kiran'}
              {persona === 'admin' && '🛡️ Admin'}
              {persona === 'anonymous' && '👤 Anonymous'}
              {persona === 'tampered' && '🦹 Attacker'}
            </text>
            <text x="50" y="66" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">
              {persona === 'farmer' && 'Role: farmer'}
              {persona === 'service_provider' && 'Role: provider'}
              {persona === 'admin' && 'Role: admin'}
              {persona === 'anonymous' && 'No Token'}
              {persona === 'tampered' && 'Forged Token'}
            </text>
            <text x="50" y="85" fill={isTampered ? '#ff5d5d' : 'var(--teal)'} fontSize="8" fontFamily="var(--mono)" textAnchor="middle">
              :3000 / cURL
            </text>
          </g>

          {/* NODE 2: KEYCLOAK IDENTITY PROVIDER */}
          <g
            className="topo-interactive-node"
            transform="translate(310, 95)"
            onMouseEnter={() => setHoveredNode('keycloak')}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              width="140"
              height="90"
              rx="10"
              fill="#0f151d"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <text x="70" y="24" fill="#38bdf8" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">OIDC / AUTH SERVER</text>
            <text x="70" y="44" fill="var(--text)" fontSize="13" fontWeight="700" textAnchor="middle">
              Keycloak 26.0
            </text>
            <text x="70" y="62" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)" textAnchor="middle">
              Realm: farm360
            </text>
            <text x="70" y="78" fill="#38bdf8" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">
              Port: 8080 · RS256 Signer
            </text>
          </g>

          {/* NODE 3: POSTGRESQL (KEYCLOAK USER STORE & APP DATA) */}
          <g
            className="topo-interactive-node"
            transform="translate(590, 95)"
            onMouseEnter={() => setHoveredNode('postgres')}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              width="130"
              height="90"
              rx="10"
              fill="#0f151d"
              stroke="#a78bfa"
              strokeWidth="1.8"
            />
            <text x="65" y="24" fill="#a78bfa" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">PERSISTENCE</text>
            <text x="65" y="44" fill="var(--text)" fontSize="13" fontWeight="700" textAnchor="middle">
              PostgreSQL 16
            </text>
            <text x="65" y="62" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">
              Realm &amp; App Tables
            </text>
            <text x="65" y="78" fill="#a78bfa" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">
              Port: 5432
            </text>
          </g>

          {/* NODE 4: FLASK RESOURCE API (STATELESS VALIDATOR) */}
          <g
            className="topo-interactive-node"
            transform="translate(310, 325)"
            onMouseEnter={() => setHoveredNode('flask-api')}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              width="140"
              height="90"
              rx="10"
              fill="#0f151d"
              stroke="var(--teal)"
              strokeWidth="2"
            />
            <text x="70" y="24" fill="var(--teal)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">RESOURCE SERVER</text>
            <text x="70" y="44" fill="var(--text)" fontSize="13" fontWeight="700" textAnchor="middle">
              Flask Resource API
            </text>
            <text x="70" y="62" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)" textAnchor="middle">
              PyJWKClient (Stateless)
            </text>
            <text x="70" y="78" fill="var(--teal)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">
              Port: 5001 (:5000 in Docker)
            </text>
          </g>

          {/* NODE 5: RBAC POLICY GATE */}
          <g
            className="topo-interactive-node"
            transform="translate(580, 325)"
            onMouseEnter={() => setHoveredNode('rbac-gate')}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              width="140"
              height="90"
              rx="10"
              fill="#0f151d"
              stroke={decision === 'ALLOW' ? 'var(--teal)' : decision === 'DENY_401' ? 'var(--amber)' : '#ff5d5d'}
              strokeWidth="2"
            />
            <text x="70" y="24" fill={decision === 'ALLOW' ? 'var(--teal)' : '#ff5d5d'} fontSize="9" fontFamily="var(--mono)" textAnchor="middle">
              AUTHORIZATION GATE
            </text>
            <text x="70" y="44" fill="var(--text)" fontSize="13" fontWeight="700" textAnchor="middle">
              @require_roles
            </text>
            <text x="70" y="62" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">
              realm_access.roles
            </text>
            <text x="70" y="78" fill={decision === 'ALLOW' ? 'var(--teal)' : '#ff5d5d'} fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">
              {decision === 'ALLOW' ? 'POLICY PASSED' : 'POLICY REJECTED'}
            </text>
          </g>

          {/* NODE 6: TARGET DATA RESOURCE */}
          <g
            className="topo-interactive-node"
            transform="translate(800, 325)"
            onMouseEnter={() => setHoveredNode('target-data')}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              width="120"
              height="90"
              rx="10"
              fill="#0f151d"
              stroke={appDbActive ? 'var(--teal)' : '#2b3846'}
              strokeWidth="1.5"
            />
            <text x="60" y="24" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">TARGET RESOURCE</text>
            <text x="60" y="44" fill="var(--text)" fontSize="12" fontWeight="700" textAnchor="middle">
              {endpoint === 'public' && 'Public Health'}
              {endpoint === 'me' && 'User Profile'}
              {endpoint === 'crops' && 'Farm Crops'}
              {endpoint === 'services' && 'Agri Services'}
              {endpoint === 'admin-users' && 'Admin Console'}
              {endpoint === 'reset-pwd' && 'Password Reset'}
            </text>
            <text x="60" y="62" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">
              {appDbActive ? 'SQL Result' : 'Access Restricted'}
            </text>
            <text x="60" y="78" fill={appDbActive ? 'var(--teal)' : 'var(--faint)'} fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">
              {appDbActive ? '200 OK Response' : '0 Bytes Returned'}
            </text>
          </g>
        </svg>

        {/* Hover Inspector Pill */}
        {hoveredNode && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '16px',
              right: '16px',
              padding: '10px 16px',
              background: 'rgba(9, 13, 18, 0.95)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ color: 'var(--teal)', fontWeight: 600 }}>INSPECTING NODE:</span>
            <span style={{ color: 'var(--text)' }}>
              {hoveredNode === 'client' && 'Client / Single Page App: Authenticates via Keycloak OIDC, receives access tokens, and attaches Bearer authorization headers to API calls.'}
              {hoveredNode === 'keycloak' && 'Keycloak Identity Provider: Central IAM engine handling realm farm360, user federation, password hashing, and RS256 token signing.'}
              {hoveredNode === 'postgres' && 'PostgreSQL Database: Backing store for Keycloak internal realm configuration, users, roles, and application domain tables.'}
              {hoveredNode === 'flask-api' && 'Flask Resource API: Verifies Bearer tokens statelessly using public keys fetched from Keycloak JWKS endpoint. Never queries the database for token validity.'}
              {hoveredNode === 'rbac-gate' && 'RBAC Policy Gate: Inspects decoded realm_access.roles claims and guarantees that only authorized roles can invoke sensitive business logic.'}
              {hoveredNode === 'target-data' && 'Target Business Domain: The underlying PostgreSQL business entities (crops, workers, bookings, finance ledgers, and user management).'}
            </span>
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: 'var(--muted)' }}>
        <span>
          💡 <strong style={{ color: 'var(--text)' }}>Stateless Scalability:</strong> Resource APIs verify RS256 signatures using cached JWKS public keys — zero load on Keycloak during high API traffic.
        </span>
        <span style={{ font: '10px var(--mono)', color: 'var(--faint)' }}>
          KEYCLOAK 26 · OAUTH 2.0 / OIDC · RS256 ASYMMETRIC · POSTGRES 16
        </span>
      </div>
    </div>
  )
}
