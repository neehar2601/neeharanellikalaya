import { useState } from 'react'

export type AuthPersona = 'anonymous' | 'farmer' | 'service_provider' | 'admin' | 'tampered' | 'alice' | 'drench' | 'mallory'
export type AuthEndpoint = 'public' | 'me' | 'crops' | 'services' | 'admin-users' | 'reset-pwd' | 'users'
export type DiagramMode = 'live-topology' | 'architecture' | 'validation-pipeline' | 'hostname-split' | 'attack-matrix' | 'key-rotation'

interface AuthTopologyMapProps {
  phase?: 'phase-1' | 'phase-2'
  persona: AuthPersona
  endpoint: AuthEndpoint
  decision: 'ALLOW' | 'DENY_401' | 'DENY_403'
  activeExploit?: string | null
  diagramMode?: DiagramMode
  onSelectPersona?: (persona: AuthPersona) => void
  onSelectEndpoint?: (endpoint: AuthEndpoint) => void
  onSelectDiagramMode?: (mode: DiagramMode) => void
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
  phase = 'phase-1',
  persona,
  endpoint,
  decision,
  activeExploit,
  diagramMode: controlledDiagramMode,
  onSelectDiagramMode,
}: AuthTopologyMapProps) {
  const [internalDiagramMode, setInternalDiagramMode] = useState<DiagramMode>('live-topology')
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const activeMode = controlledDiagramMode || internalDiagramMode

  const setMode = (mode: DiagramMode) => {
    setInternalDiagramMode(mode)
    if (onSelectDiagramMode) onSelectDiagramMode(mode)
  }

  const isAnonymous = persona === 'anonymous'
  const isAttacker = persona === 'tampered' || persona === 'mallory' || !!activeExploit
  const isDenied = decision !== 'ALLOW'
  const isPhase2 = phase === 'phase-2'

  // -------------------------------------------------------------
  // PHASE 1 LIVE TOPOLOGY PATH DEFINITIONS
  // -------------------------------------------------------------
  const p1AuthLoginActive = !isAnonymous && !isAttacker
  const p1KeycloakDbActive = p1AuthLoginActive
  const p1TokenIssueActive = p1AuthLoginActive
  const p1JwksActive = true
  const p1ApiRequestActive = true
  const p1RbacActive = !isAnonymous
  const p1AppDbActive = decision === 'ALLOW' && endpoint !== 'public'

  const pathsP1: PathDef[] = [
    // 1. Client to Keycloak OAuth Token Endpoint
    {
      id: 'client-to-kc',
      d: 'M 140 220 C 180 180, 220 140, 310 140',
      label: '1. POST /token (OAuth 2.0 Credentials)',
      labelX: 200,
      labelY: 155,
      color: p1AuthLoginActive ? '#38bdf8' : '#2b3846',
      packetColor: '#38bdf8',
      dur: '1.8s',
      delay: '0s',
      active: p1AuthLoginActive,
    },
    // 2. Keycloak to Postgres DB (User & Role Verification)
    {
      id: 'kc-to-db',
      d: 'M 450 140 L 590 140',
      label: '2. Query Realm Store (Roles & Credentials)',
      labelX: 520,
      labelY: 125,
      color: p1KeycloakDbActive ? '#a78bfa' : '#2b3846',
      packetColor: '#a78bfa',
      dur: '1.5s',
      delay: '0.3s',
      active: p1KeycloakDbActive,
    },
    // 3. Keycloak Issues RS256 Signed JWT back to Client
    {
      id: 'kc-to-client',
      d: 'M 310 160 C 240 180, 190 220, 140 250',
      label: '3. Return RS256 Signed Bearer Token',
      labelX: 205,
      labelY: 220,
      color: p1TokenIssueActive ? '#4fd1c5' : '#2b3846',
      packetColor: '#4fd1c5',
      dur: '1.8s',
      delay: '0.6s',
      active: p1TokenIssueActive,
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
      active: p1JwksActive,
    },
    // 5. Client to Flask API (Bearer Token Request)
    {
      id: 'client-to-api',
      d: 'M 140 280 C 200 320, 240 370, 310 370',
      label: isAnonymous
        ? '5. Request WITHOUT Bearer Token'
        : isAttacker
          ? '5. Request with TAMPERED Bearer Token'
          : '5. Request with Bearer Token (Authorization)',
      labelX: 195,
      labelY: 345,
      color: isAttacker ? '#ff5d5d' : isAnonymous ? '#e8a33d' : '#4fd1c5',
      packetColor: isAttacker ? '#ff5d5d' : isAnonymous ? '#e8a33d' : '#4fd1c5',
      dur: '1.8s',
      delay: '0.8s',
      active: p1ApiRequestActive,
    },
    // 6. Flask API to RBAC Policy Gate
    {
      id: 'api-to-rbac',
      d: 'M 450 370 L 580 370',
      label: isAttacker
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
      active: p1RbacActive || endpoint === 'public',
      isBlocked: isDenied && endpoint !== 'public',
    },
    // 7. RBAC Gate to Application Database (Postgres)
    {
      id: 'rbac-to-db',
      d: 'M 720 370 C 760 370, 780 300, 720 220 L 690 190',
      label: '7. Authorized Data Query (SQL)',
      labelX: 740,
      labelY: 280,
      color: p1AppDbActive ? '#4fd1c5' : '#2b3846',
      packetColor: '#4fd1c5',
      dur: '1.6s',
      delay: '1.5s',
      active: p1AppDbActive,
    },
  ]

  // -------------------------------------------------------------
  // PHASE 2 LIVE TOPOLOGY PATH DEFINITIONS (EXPLOIT & DUAL VERIFIER)
  // -------------------------------------------------------------
  const p2Paths: PathDef[] = [
    // 1. KeyStore generates RSA keys & publishes JWKS
    {
      id: 'p2-ks-to-jwks',
      d: 'M 430 140 L 570 140',
      label: '1. RFC 7517 JWKS Public Keys (/jwks.json)',
      labelX: 500,
      labelY: 125,
      color: '#38bdf8',
      packetColor: '#38bdf8',
      dur: '2.0s',
      delay: '0s',
      active: true,
    },
    // 2. JWKS to Hardened Verifier
    {
      id: 'p2-jwks-to-hardened',
      d: 'M 640 185 C 640 260, 480 370, 430 420',
      label: '2. Public Key Cached by kid in JWKS',
      labelX: 560,
      labelY: 290,
      color: '#4fd1c5',
      packetColor: '#4fd1c5',
      dur: '2.2s',
      delay: '0.4s',
      active: true,
    },
    // 3. Client / Attacker to Naive Verifier (Port 5001)
    {
      id: 'p2-client-to-naive',
      d: 'M 140 230 C 200 260, 240 310, 290 325',
      label: isAttacker
        ? `3. Exploit Payload [${activeExploit || 'tamper'}]`
        : '3. Bearer Token Request',
      labelX: 200,
      labelY: 285,
      color: isAttacker ? '#ff5d5d' : '#4fd1c5',
      packetColor: isAttacker ? '#ff5d5d' : '#4fd1c5',
      dur: '1.8s',
      delay: '0.6s',
      active: true,
    },
    // 4. Client / Attacker to Hardened Verifier (Port 5001)
    {
      id: 'p2-client-to-hardened',
      d: 'M 140 260 C 200 320, 240 400, 290 425',
      label: isAttacker
        ? '4. Strict RS256 Allow-List Check'
        : '4. Bearer Token Request',
      labelX: 195,
      labelY: 375,
      color: isAttacker ? '#ff5d5d' : '#4fd1c5',
      packetColor: isAttacker ? '#ff5d5d' : '#4fd1c5',
      dur: '1.8s',
      delay: '0.6s',
      active: true,
    },
    // 5. Naive Verifier to Target: BREACHED if exploit, or normal access
    {
      id: 'p2-naive-to-target',
      d: 'M 430 325 C 540 325, 680 325, 800 340',
      label: isAttacker
        ? '⚠️ NAIVE: EXPLOITED! 200 OK (Trusts alg)'
        : '✓ Naive: 200 OK',
      labelX: 615,
      labelY: 315,
      color: isAttacker ? '#ff5d5d' : '#4fd1c5',
      packetColor: isAttacker ? '#ff5d5d' : '#4fd1c5',
      dur: '1.5s',
      delay: '1.0s',
      active: !isAnonymous,
      isBlocked: isAnonymous,
    },
    // 6. Hardened Verifier to Target: BLOCKED if exploit, ALLOWED if legitimate
    {
      id: 'p2-hardened-to-target',
      d: 'M 430 425 C 550 425, 680 390, 800 360',
      label: isAttacker || isDenied
        ? '🛡️ HARDENED: BLOCKED (401 / RS256 Enforced)'
        : '✓ Hardened: Verified 200 OK',
      labelX: 615,
      labelY: 410,
      color: decision === 'ALLOW' ? '#4fd1c5' : '#ff5d5d',
      packetColor: decision === 'ALLOW' ? '#4fd1c5' : '#ff5d5d',
      dur: '1.5s',
      delay: '1.2s',
      active: decision === 'ALLOW',
      isBlocked: decision !== 'ALLOW',
    },
  ]

  return (
    <div className="standalone-topology-canvas" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Top Banner & Mode Switcher */}
      <div className="topology-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span
              className="topology-badge"
              style={{
                color: decision === 'ALLOW' ? 'var(--teal)' : decision === 'DENY_401' ? 'var(--amber)' : 'var(--red)',
                borderColor: decision === 'ALLOW' ? 'rgba(79,209,197,0.3)' : decision === 'DENY_401' ? 'rgba(232,163,61,0.3)' : 'rgba(255,93,93,0.3)',
                background: decision === 'ALLOW' ? 'rgba(79,209,197,0.08)' : decision === 'DENY_401' ? 'rgba(232,163,61,0.08)' : 'rgba(255,93,93,0.08)',
              }}
            >
              {decision === 'ALLOW' && 'STATUS: 200 OK · AUTHORIZED'}
              {decision === 'DENY_401' && 'STATUS: 401 UNAUTHORIZED · MISSING / UNTRUSTED TOKEN'}
              {decision === 'DENY_403' && 'STATUS: 403 FORBIDDEN · ROLE ACCESS DENIED'}
            </span>
            <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>
              REALM: <strong style={{ color: 'var(--text)' }}>{isPhase2 ? 'authlab' : 'farm360'}</strong> · CLIENT: <strong style={{ color: 'var(--text)' }}>{isPhase2 ? 'authlab-api' : 'farm360-web'}</strong>
            </span>
          </div>

          <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>
              {activeMode === 'live-topology' && (isPhase2 ? 'Phase 2 Live Exploit Bench: Cryptographic Attack & Dual Verifier Flow' : 'Phase 1 Live Network: OAuth 2.0 / OIDC & RS256 Stateless Token Verification')}
              {activeMode === 'architecture' && 'Diagram 1: The Two Sides of Auth (Issuer vs Resource Server)'}
              {activeMode === 'validation-pipeline' && 'Diagram 2: How the API Validates a Token (6-Step Pipeline in api/app.py)'}
              {activeMode === 'hostname-split' && 'Diagram 3: Gotcha — Issuer vs JWKS Hostnames (TOKEN_ISSUER vs JWKS_URL)'}
              {activeMode === 'attack-matrix' && 'Diagram 4: Phase 2 Cryptographic Attack vs Defense (CVE-2015-9235 & alg: none)'}
              {activeMode === 'key-rotation' && 'Diagram 5: Zero-Downtime KeyStore Rotation with Overlap Window'}
            </span>
          </h4>

          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)', maxWidth: '780px' }}>
            {activeMode === 'live-topology' && (isPhase2
              ? 'Real-time exploit flow contrasting the vulnerable naive_verify_token (accepts header algorithm, breached) against the hardened verify_token (pinned to RS256, blocks CVE-2015-9235 and alg: none).'
              : 'Token cryptographically verified via public JWKS. User role satisfies the required endpoint policy gate. Resource served from PostgreSQL.')}
            {activeMode === 'architecture' && 'Authentication has two sides: the issuer (proves identity, signs tokens with RSA private key) and the resource server (checks token on every request, never sees passwords).'}
            {activeMode === 'validation-pipeline' && 'The 6 validation steps: 1. Read Bearer header ➔ 2. Read kid from header ➔ 3. Fetch JWKS public keys ➔ 4. Verify RS256 signature ➔ 5. Check iss, aud, exp ➔ 6. Read realm_access.roles.'}
            {activeMode === 'hostname-split' && 'The token iss claim is localhost:8080 (from browser perspective), but the Flask container connects to keycloak:8080 over Docker network. That is why compose has two separate settings!'}
            {activeMode === 'attack-matrix' && 'Contrasting the vulnerable naive_verify_token (believes alg header) against the secure verify_token (pinned to algorithms=["RS256"]). Thwarts CVE-2015-9235 and alg: none.'}
            {activeMode === 'key-rotation' && 'KeyStore maintains an overlap window where old and new keys are published in JWKS simultaneously. Active sessions do not break until old keys are retired.'}
          </p>
        </div>

        {/* DIAGRAM MODE SWITCHER BUTTONS (SHOWN ONLY ON WHAT, HOW & WHY ARCHITECTURE PAGE) */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isPhase2 ? (
            <span className="tag" style={{ font: '10px var(--mono)', color: 'var(--teal)', border: '1px solid rgba(79,209,197,0.3)' }}>
              ⚡ LIVE EXPLOIT &amp; DUAL-VERIFIER BENCH
            </span>
          ) : phase === 'phase-1' ? (
            <span className="tag" style={{ font: '10px var(--mono)', color: 'var(--teal)', border: '1px solid rgba(79,209,197,0.3)' }}>
              ⚡ LIVE KEYCLOAK &amp; POSTGRES NETWORK
            </span>
          ) : (
            <>
              <button
                type="button"
                className={`button ${activeMode === 'architecture' ? 'primary' : ''}`}
                style={{ fontSize: '10px', padding: '5px 10px' }}
                onClick={() => setMode('architecture')}
              >
                🏛️ 1. Issuer vs API
              </button>
              <button
                type="button"
                className={`button ${activeMode === 'validation-pipeline' ? 'primary' : ''}`}
                style={{ fontSize: '10px', padding: '5px 10px' }}
                onClick={() => setMode('validation-pipeline')}
              >
                🔍 2. 6-Step Validation
              </button>
              <button
                type="button"
                className={`button ${activeMode === 'hostname-split' ? 'primary' : ''}`}
                style={{ fontSize: '10px', padding: '5px 10px' }}
                onClick={() => setMode('hostname-split')}
              >
                🌐 3. Hostname Split
              </button>
              <button
                type="button"
                className={`button ${activeMode === 'attack-matrix' ? 'primary' : ''}`}
                style={{ fontSize: '10px', padding: '5px 10px' }}
                onClick={() => setMode('attack-matrix')}
              >
                💥 4. Attack vs Defense
              </button>
              <button
                type="button"
                className={`button ${activeMode === 'key-rotation' ? 'primary' : ''}`}
                style={{ fontSize: '10px', padding: '5px 10px' }}
                onClick={() => setMode('key-rotation')}
              >
                🔄 5. Key Rotation
              </button>
            </>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="gallery-live-map-canvas" style={{ minHeight: '520px', position: 'relative' }}>
        <div className="gallery-grid-overlay" />

        <svg
          className="gallery-flow-svg"
          viewBox="0 0 960 520"
          role="img"
          aria-label="AuthLab Architecture and Verification Flows"
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

          {/* ============================================================= */}
          {/* MODE: LIVE TOPOLOGY (ANIMATED PACKETS & INTERACTIVE NODES)    */}
          {/* ============================================================= */}
          {activeMode === 'live-topology' && !isPhase2 && (
            <g>
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
                RESOURCE SERVER BOUNDARY: FASTAPI / FLASK &amp; RBAC GATE (PORT 8000)
              </text>

              {/* Animated Packet Paths */}
              {pathsP1.map((p) => (
                <g key={p.id}>
                  <path
                    d={p.d}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={p.active ? 2.5 : 1.2}
                    strokeOpacity={p.active ? 0.8 : 0.2}
                    strokeDasharray={p.active ? 'none' : '4 4'}
                  />
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
              ))}

              {/* Blocked deflection spark if denied */}
              {isDenied && endpoint !== 'public' && (
                <g transform="translate(580, 370)">
                  <circle r="16" fill="rgba(255, 93, 93, 0.25)" filter="url(#block-spark)" />
                  <circle r="8" fill="#ff5d5d" />
                  <text x="0" y="28" fill="#ff5d5d" fontSize="10" fontWeight="700" fontFamily="var(--mono)" textAnchor="middle">
                    {decision === 'DENY_401' ? '401 BLOCKED' : '403 FORBIDDEN'}
                  </text>
                </g>
              )}

              {/* NODE 1: CLIENT TIER */}
              <g
                className="topo-interactive-node"
                transform="translate(40, 200)"
                onMouseEnter={() => setHoveredNode('client-p1')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  width="100"
                  height="100"
                  rx="10"
                  fill="#0f151d"
                  stroke={isAttacker ? '#ff5d5d' : isAnonymous ? '#e8a33d' : '#4fd1c5'}
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
                <text x="50" y="85" fill={isAttacker ? '#ff5d5d' : 'var(--teal)'} fontSize="8" fontFamily="var(--mono)" textAnchor="middle">
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
                <rect width="140" height="90" rx="10" fill="#0f151d" stroke="#38bdf8" strokeWidth="2" />
                <text x="70" y="24" fill="#38bdf8" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">OIDC / AUTH SERVER</text>
                <text x="70" y="44" fill="var(--text)" fontSize="13" fontWeight="700" textAnchor="middle">Keycloak 26.1</text>
                <text x="70" y="62" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)" textAnchor="middle">Realm: authlab</text>
                <text x="70" y="78" fill="#38bdf8" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">Port: 8080 · RS256 Signer</text>
              </g>

              {/* NODE 3: POSTGRESQL */}
              <g
                className="topo-interactive-node"
                transform="translate(590, 95)"
                onMouseEnter={() => setHoveredNode('postgres')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect width="130" height="90" rx="10" fill="#0f151d" stroke="#a78bfa" strokeWidth="1.8" />
                <text x="65" y="24" fill="#a78bfa" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">PERSISTENCE</text>
                <text x="65" y="44" fill="var(--text)" fontSize="13" fontWeight="700" textAnchor="middle">PostgreSQL 16</text>
                <text x="65" y="62" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">Keycloak Realm Store</text>
                <text x="65" y="78" fill="#a78bfa" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">Port: 5432 (127.0.0.1)</text>
              </g>

              {/* NODE 4: FLASK / FASTAPI RESOURCE SERVER */}
              <g
                className="topo-interactive-node"
                transform="translate(310, 325)"
                onMouseEnter={() => setHoveredNode('resource-api')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect width="140" height="90" rx="10" fill="#0f151d" stroke="var(--teal)" strokeWidth="2" />
                <text x="70" y="24" fill="var(--teal)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">RESOURCE SERVER</text>
                <text x="70" y="44" fill="var(--text)" fontSize="13" fontWeight="700" textAnchor="middle">Protected API</text>
                <text x="70" y="62" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)" textAnchor="middle">PyJWKClient (Stateless)</text>
                <text x="70" y="78" fill="var(--teal)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">Port: 8000 (:5001)</text>
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
                <text x="70" y="44" fill="var(--text)" fontSize="13" fontWeight="700" textAnchor="middle">@require_roles</text>
                <text x="70" y="62" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">realm_access.roles</text>
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
                <rect width="120" height="90" rx="10" fill="#0f151d" stroke={p1AppDbActive ? 'var(--teal)' : '#2b3846'} strokeWidth="1.5" />
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
                  {p1AppDbActive ? 'SQL Result' : 'Access Restricted'}
                </text>
                <text x="60" y="78" fill={p1AppDbActive ? 'var(--teal)' : 'var(--faint)'} fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">
                  {p1AppDbActive ? '200 OK Response' : '0 Bytes Returned'}
                </text>
              </g>
            </g>
          )}

          {/* ============================================================= */}
          {/* MODE: LIVE TOPOLOGY FOR PHASE 2 (ATTACK & DUAL VERIFIER BENCH) */}
          {/* ============================================================= */}
          {activeMode === 'live-topology' && isPhase2 && (
            <g>
              {/* Issuer Zone */}
              <rect
                x="260"
                y="70"
                width="480"
                height="150"
                rx="12"
                fill="rgba(56, 189, 248, 0.03)"
                stroke="rgba(56, 189, 248, 0.2)"
                strokeDasharray="4 4"
              />
              <text x="275" y="92" fill="#38bdf8" fontSize="10" fontFamily="var(--mono)" letterSpacing="0.05em">
                AUTHLAB ISSUER TIER: JWTLAB KEYSTORE &amp; RFC 7517 JWKS
              </text>

              {/* Dual Verifier Zone */}
              <rect
                x="260"
                y="265"
                width="480"
                height="215"
                rx="12"
                fill="rgba(79, 209, 197, 0.03)"
                stroke="rgba(79, 209, 197, 0.2)"
                strokeDasharray="4 4"
              />
              <text x="275" y="285" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)" letterSpacing="0.05em">
                DUAL VERIFICATION BENCH: NAIVE (VULNERABLE) VS HARDENED (PINNED RS256)
              </text>

              {/* Animated Packet Paths */}
              {p2Paths.map((p) => (
                <g key={p.id}>
                  <path
                    d={p.d}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={p.active ? 2.5 : 1.2}
                    strokeOpacity={p.active ? 0.8 : 0.2}
                    strokeDasharray={p.active ? 'none' : '4 4'}
                  />
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
              ))}

              {/* Hardened Verifier Deflection Spark if Exploit or Denied */}
              {(isAttacker || isDenied) && (
                <g transform="translate(430, 425)">
                  <circle r="16" fill="rgba(255, 93, 93, 0.25)" filter="url(#block-spark)" />
                  <circle r="8" fill="#ff5d5d" />
                  <text x="0" y="28" fill="#ff5d5d" fontSize="10" fontWeight="700" fontFamily="var(--mono)" textAnchor="middle">
                    401 DEFLECTED
                  </text>
                </g>
              )}

              {/* Naive Verifier Breach Alert if Exploit Active */}
              {isAttacker && !isAnonymous && (
                <g transform="translate(430, 325)">
                  <circle r="14" fill="rgba(255, 93, 93, 0.2)" />
                  <circle r="6" fill="#ff5d5d" />
                  <text x="0" y="-14" fill="#ff5d5d" fontSize="9" fontWeight="700" fontFamily="var(--mono)" textAnchor="middle">
                    ⚠️ 200 OK BREACHED!
                  </text>
                </g>
              )}

              {/* NODE 1: CLIENT / ADVERSARY */}
              <g
                className="topo-interactive-node"
                transform="translate(40, 200)"
                onMouseEnter={() => setHoveredNode('client-p2')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  width="100"
                  height="100"
                  rx="10"
                  fill="#0f151d"
                  stroke={isAttacker ? '#ff5d5d' : '#4fd1c5'}
                  strokeWidth="1.8"
                />
                <text x="50" y="26" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">CALLER</text>
                <text x="50" y="46" fill="var(--text)" fontSize="12" fontWeight="700" textAnchor="middle">
                  {persona === 'alice' && '👩‍💻 Alice'}
                  {persona === 'drench' && '🧑‍💻 Drench'}
                  {persona === 'admin' && '🛡️ Bob'}
                  {persona === 'anonymous' && '👤 Guest'}
                  {persona === 'mallory' && '🦹 Mallory'}
                </text>
                <text x="50" y="64" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">
                  {persona === 'mallory' ? 'Attacker' : `Role: ${persona}`}
                </text>
                <text x="50" y="82" fill={isAttacker ? '#ff5d5d' : 'var(--teal)'} fontSize="8" fontFamily="var(--mono)" textAnchor="middle">
                  {activeExploit ? `[${activeExploit}]` : 'Standard Token'}
                </text>
              </g>

              {/* NODE 2: JWTLAB KEYSTORE */}
              <g
                className="topo-interactive-node"
                transform="translate(290, 100)"
                onMouseEnter={() => setHoveredNode('keystore')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect width="140" height="85" rx="10" fill="#0f151d" stroke="#38bdf8" strokeWidth="2" />
                <text x="70" y="22" fill="#38bdf8" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">KEYSTORE ENGINE</text>
                <text x="70" y="42" fill="var(--text)" fontSize="13" fontWeight="700" textAnchor="middle">jwtlab KeyStore</text>
                <text x="70" y="60" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)" textAnchor="middle">RSA-2048 Asymmetric</text>
                <text x="70" y="74" fill="#38bdf8" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">rotate() / retire()</text>
              </g>

              {/* NODE 3: RFC 7517 JWKS ENDPOINT */}
              <g
                className="topo-interactive-node"
                transform="translate(570, 100)"
                onMouseEnter={() => setHoveredNode('jwks-p2')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect width="140" height="85" rx="10" fill="#0f151d" stroke="#a78bfa" strokeWidth="1.8" />
                <text x="70" y="22" fill="#a78bfa" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">PUBLIC JWKS</text>
                <text x="70" y="42" fill="var(--text)" fontSize="13" fontWeight="700" textAnchor="middle">RFC 7517 Keys</text>
                <text x="70" y="60" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">Dual-Key Overlap Window</text>
                <text x="70" y="74" fill="#a78bfa" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">kid: e7b1a49f / 8f2d9c1b</text>
              </g>

              {/* NODE 4A: NAIVE VERIFIER */}
              <g
                className="topo-interactive-node"
                transform="translate(290, 305)"
                onMouseEnter={() => setHoveredNode('naive-verifier')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect width="140" height="70" rx="8" fill="#0f151d" stroke="var(--red)" strokeWidth="1.8" />
                <text x="70" y="20" fill="var(--red)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">NAIVE VERIFIER</text>
                <text x="70" y="38" fill="var(--text)" fontSize="11.5" fontWeight="700" textAnchor="middle">naive_verify_token()</text>
                <text x="70" y="54" fill="var(--red)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">Vulnerable (Trusts alg)</text>
              </g>

              {/* NODE 4B: HARDENED VERIFIER */}
              <g
                className="topo-interactive-node"
                transform="translate(290, 395)"
                onMouseEnter={() => setHoveredNode('hardened-verifier')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect width="140" height="70" rx="8" fill="#0f151d" stroke="var(--teal)" strokeWidth="2" />
                <text x="70" y="20" fill="var(--teal)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">HARDENED VERIFIER</text>
                <text x="70" y="38" fill="var(--text)" fontSize="11.5" fontWeight="700" textAnchor="middle">verify_token()</text>
                <text x="70" y="54" fill="var(--teal)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">Pinned algorithms=[&quot;RS256&quot;]</text>
              </g>

              {/* NODE 5: RBAC & CLAIMS GATE */}
              <g
                className="topo-interactive-node"
                transform="translate(570, 345)"
                onMouseEnter={() => setHoveredNode('rbac-p2')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  width="140"
                  height="80"
                  rx="10"
                  fill="#0f151d"
                  stroke={decision === 'ALLOW' ? 'var(--teal)' : decision === 'DENY_401' ? 'var(--amber)' : '#ff5d5d'}
                  strokeWidth="2"
                />
                <text x="70" y="22" fill={decision === 'ALLOW' ? 'var(--teal)' : '#ff5d5d'} fontSize="9" fontFamily="var(--mono)" textAnchor="middle">
                  CLAIMS GATE
                </text>
                <text x="70" y="42" fill="var(--text)" fontSize="12" fontWeight="700" textAnchor="middle">iss / aud / exp / roles</text>
                <text x="70" y="60" fill="var(--muted)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">
                  {decision === 'ALLOW' ? 'CLAIM PASSED' : 'REJECTED'}
                </text>
              </g>

              {/* NODE 6: TARGET RESOURCE */}
              <g
                className="topo-interactive-node"
                transform="translate(800, 345)"
                onMouseEnter={() => setHoveredNode('resource-p2')}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect width="120" height="80" rx="10" fill="#0f151d" stroke={decision === 'ALLOW' ? 'var(--teal)' : '#2b3846'} strokeWidth="1.5" />
                <text x="60" y="22" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">TARGET RESOURCE</text>
                <text x="60" y="42" fill="var(--text)" fontSize="12" fontWeight="700" textAnchor="middle">
                  {endpoint === 'public' && 'Public Probe'}
                  {endpoint === 'me' && 'User Claims'}
                  {endpoint === 'users' && 'Users API'}
                  {endpoint === 'admin-users' && 'Admin Route'}
                </text>
                <text x="60" y="60" fill={decision === 'ALLOW' ? 'var(--teal)' : 'var(--faint)'} fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">
                  {decision === 'ALLOW' ? '200 OK Response' : 'Access Denied'}
                </text>
              </g>
            </g>
          )}

          {/* ============================================================= */}
          {/* DIAGRAM 1: ISSUER VS RESOURCE SERVER (THE TWO SIDES OF AUTH)  */}
          {/* ============================================================= */}
          {activeMode === 'architecture' && (
            <g>
              {/* Left Zone: The Issuer (Keycloak / KeyStore) */}
              <rect x="50" y="60" width="380" height="420" rx="14" fill="rgba(56, 189, 248, 0.03)" stroke="rgba(56, 189, 248, 0.25)" strokeDasharray="4 4" />
              <text x="70" y="88" fill="#38bdf8" fontSize="11" fontWeight="700" fontFamily="var(--mono)">
                THE ISSUER (IDENTITY PROVIDER)
              </text>
              <text x="70" y="105" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">
                Proves who you are · Handles passwords &amp; roles · Signs tokens
              </text>

              {/* Issuer Box */}
              <g transform="translate(80, 130)">
                <rect width="320" height="130" rx="10" fill="#0f151d" stroke="#38bdf8" strokeWidth="2" />
                <text x="20" y="30" fill="#38bdf8" fontSize="10" fontWeight="700" fontFamily="var(--mono)">KEYCLOAK 26 / KEYSTORE</text>
                <text x="20" y="55" fill="var(--text)" fontSize="13" fontWeight="700">Centralized Identity &amp; Token Minting</text>
                <text x="20" y="78" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Signs with 2048-bit RSA Private Key (RS256)</text>
                <text x="20" y="96" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Exposes Public JWKS: /.well-known/jwks.json</text>
                <text x="20" y="114" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)">• Realm: Authlab / farm360 · Port :8080 / :5001</text>
              </g>

              {/* Database backing issuer */}
              <g transform="translate(80, 290)">
                <rect width="320" height="90" rx="10" fill="#0f151d" stroke="#a78bfa" strokeWidth="1.5" />
                <text x="20" y="28" fill="#a78bfa" fontSize="10" fontWeight="700" fontFamily="var(--mono)">POSTGRESQL 16</text>
                <text x="20" y="50" fill="var(--text)" fontSize="12" fontWeight="700">Persistent Credential &amp; Role Store</text>
                <text x="20" y="70" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">Bound to 127.0.0.1:5432 · Non-root user isolation</text>
              </g>

              {/* Center Flow Arrow (Tokens + JWKS) */}
              <path d="M 430 200 L 530 200" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="4 4" />
              <text x="480" y="185" fill="#38bdf8" fontSize="9" fontWeight="700" fontFamily="var(--mono)" textAnchor="middle">
                JWKS Public Keys
              </text>
              <text x="480" y="225" fill="var(--muted)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">
                (Asymmetric RS256)
              </text>

              {/* Right Zone: The Resource Server (API) */}
              <rect x="530" y="60" width="380" height="420" rx="14" fill="rgba(79, 209, 197, 0.03)" stroke="rgba(79, 209, 197, 0.25)" strokeDasharray="4 4" />
              <text x="550" y="88" fill="var(--teal)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">
                THE RESOURCE SERVER (PROTECTED API)
              </text>
              <text x="550" y="105" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">
                Checks token on EVERY request · Never sees passwords · Stateless
              </text>

              {/* Resource Server Box */}
              <g transform="translate(560, 130)">
                <rect width="320" height="130" rx="10" fill="#0f151d" stroke="var(--teal)" strokeWidth="2" />
                <text x="20" y="30" fill="var(--teal)" fontSize="10" fontWeight="700" fontFamily="var(--mono)">FASTAPI / FLASK API GATEWAY</text>
                <text x="20" y="55" fill="var(--text)" fontSize="13" fontWeight="700">Stateless Token Verification Gate</text>
                <text x="20" y="78" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">1. Matches kid to JWKS cached public key</text>
                <text x="20" y="96" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">2. Cryptographic signature check (RS256)</text>
                <text x="20" y="114" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">3. Validates claims: iss, aud, exp, roles</text>
              </g>

              {/* Core Security Rule Callout */}
              <g transform="translate(560, 290)">
                <rect width="320" height="150" rx="10" fill="rgba(232, 163, 61, 0.08)" stroke="rgba(232, 163, 61, 0.4)" strokeWidth="1.5" />
                <text x="20" y="30" fill="var(--amber)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">WHY RS256 OVER HS256?</text>
                <text x="20" y="55" fill="var(--text)" fontSize="12" fontWeight="600">Asymmetric Decoupling</text>
                <text x="20" y="78" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• HS256 requires sharing the secret key</text>
                <text x="20" y="96" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• If API is breached, attacker can mint tokens</text>
                <text x="20" y="114" fill="var(--teal)" fontSize="10.5" fontFamily="var(--mono)">• With RS256, API only holds public key!</text>
                <text x="20" y="132" fill="var(--teal)" fontSize="10.5" fontFamily="var(--mono)">• Compromised API cannot forge new tokens</text>
              </g>
            </g>
          )}

          {/* ============================================================= */}
          {/* DIAGRAM 2: 6-STEP TOKEN VALIDATION PIPELINE                   */}
          {/* ============================================================= */}
          {activeMode === 'validation-pipeline' && (
            <g>
              <rect x="30" y="40" width="900" height="450" rx="14" fill="rgba(15, 21, 29, 0.5)" stroke="var(--line)" />
              <text x="50" y="72" fill="var(--text)" fontSize="14" fontWeight="700">
                How api/app.py Validates an Incoming Bearer Token (6 Sequential Gates)
              </text>
              <text x="50" y="92" fill="var(--muted)" fontSize="11" fontFamily="var(--mono)">
                Every protected HTTP request passes through these 6 checks before executing any business logic
              </text>

              {/* Step 1 */}
              <g transform="translate(50, 120)">
                <rect width="130" height="150" rx="8" fill="#090d12" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="14" y="24" fill="#38bdf8" fontSize="10" fontWeight="700" fontFamily="var(--mono)">STEP 1</text>
                <text x="14" y="44" fill="var(--text)" fontSize="11.5" fontWeight="700">Read Bearer</text>
                <text x="14" y="65" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">Extract header:</text>
                <text x="14" y="80" fill="#38bdf8" fontSize="8.5" fontFamily="var(--mono)">Authorization:</text>
                <text x="14" y="95" fill="#38bdf8" fontSize="8.5" fontFamily="var(--mono)">Bearer &lt;token&gt;</text>
                <rect x="14" y="115" width="102" height="22" rx="4" fill="rgba(255, 93, 93, 0.1)" stroke="var(--red)" />
                <text x="65" y="130" fill="var(--red)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">Fail ➔ 401</text>
              </g>
              <path d="M 180 195 L 195 195" stroke="var(--line)" strokeWidth="2" markerEnd="url(#arrow)" />

              {/* Step 2 */}
              <g transform="translate(195, 120)">
                <rect width="130" height="150" rx="8" fill="#090d12" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="14" y="24" fill="#38bdf8" fontSize="10" fontWeight="700" fontFamily="var(--mono)">STEP 2</text>
                <text x="14" y="44" fill="var(--text)" fontSize="11.5" fontWeight="700">Read &apos;kid&apos;</text>
                <text x="14" y="65" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">Parse unverified</text>
                <text x="14" y="80" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">token header:</text>
                <text x="14" y="98" fill="#a78bfa" fontSize="9" fontFamily="var(--mono)">kid=&quot;8f2d9c1b&quot;</text>
                <rect x="14" y="115" width="102" height="22" rx="4" fill="rgba(255, 93, 93, 0.1)" stroke="var(--red)" />
                <text x="65" y="130" fill="var(--red)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">No kid ➔ 401</text>
              </g>
              <path d="M 325 195 L 340 195" stroke="var(--line)" strokeWidth="2" />

              {/* Step 3 */}
              <g transform="translate(340, 120)">
                <rect width="130" height="150" rx="8" fill="#090d12" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="14" y="24" fill="#38bdf8" fontSize="10" fontWeight="700" fontFamily="var(--mono)">STEP 3</text>
                <text x="14" y="44" fill="var(--text)" fontSize="11.5" fontWeight="700">Fetch JWKS</text>
                <text x="14" y="65" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">Lookup cert from</text>
                <text x="14" y="80" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">JWKS cache by</text>
                <text x="14" y="98" fill="#a78bfa" fontSize="9" fontFamily="var(--mono)">matching kid</text>
                <rect x="14" y="115" width="102" height="22" rx="4" fill="rgba(255, 93, 93, 0.1)" stroke="var(--red)" />
                <text x="65" y="130" fill="var(--red)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">Unknown ➔ 401</text>
              </g>
              <path d="M 470 195 L 485 195" stroke="var(--line)" strokeWidth="2" />

              {/* Step 4 */}
              <g transform="translate(485, 120)">
                <rect width="130" height="150" rx="8" fill="#090d12" stroke="var(--teal)" strokeWidth="2" />
                <text x="14" y="24" fill="var(--teal)" fontSize="10" fontWeight="700" fontFamily="var(--mono)">STEP 4</text>
                <text x="14" y="44" fill="var(--text)" fontSize="11.5" fontWeight="700">RS256 Verify</text>
                <text x="14" y="65" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">Verify RSA</text>
                <text x="14" y="80" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">digital signature</text>
                <text x="14" y="98" fill="var(--teal)" fontSize="8.5" fontFamily="var(--mono)">alg=&quot;RS256&quot; only</text>
                <rect x="14" y="115" width="102" height="22" rx="4" fill="rgba(255, 93, 93, 0.1)" stroke="var(--red)" />
                <text x="65" y="130" fill="var(--red)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">Bad Sig ➔ 401</text>
              </g>
              <path d="M 615 195 L 630 195" stroke="var(--line)" strokeWidth="2" />

              {/* Step 5 */}
              <g transform="translate(630, 120)">
                <rect width="130" height="150" rx="8" fill="#090d12" stroke="var(--teal)" strokeWidth="1.5" />
                <text x="14" y="24" fill="var(--teal)" fontSize="10" fontWeight="700" fontFamily="var(--mono)">STEP 5</text>
                <text x="14" y="44" fill="var(--text)" fontSize="11.5" fontWeight="700">Check Claims</text>
                <text x="14" y="65" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)">• iss: localhost:8080</text>
                <text x="14" y="80" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)">• aud: authlab-api</text>
                <text x="14" y="95" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)">• exp &gt; now()</text>
                <rect x="14" y="115" width="102" height="22" rx="4" fill="rgba(255, 93, 93, 0.1)" stroke="var(--red)" />
                <text x="65" y="130" fill="var(--red)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">Expired ➔ 401</text>
              </g>
              <path d="M 760 195 L 775 195" stroke="var(--line)" strokeWidth="2" />

              {/* Step 6 */}
              <g transform="translate(775, 120)">
                <rect width="140" height="150" rx="8" fill="#090d12" stroke="var(--amber)" strokeWidth="2" />
                <text x="14" y="24" fill="var(--amber)" fontSize="10" fontWeight="700" fontFamily="var(--mono)">STEP 6 (RBAC)</text>
                <text x="14" y="44" fill="var(--text)" fontSize="11.5" fontWeight="700">Role Check</text>
                <text x="14" y="65" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)">Inspect roles in</text>
                <text x="14" y="80" fill="var(--muted)" fontSize="9" fontFamily="var(--mono)">realm_access.roles</text>
                <text x="14" y="96" fill="var(--amber)" fontSize="8.5" fontFamily="var(--mono)">api-admin required</text>
                <rect x="14" y="115" width="112" height="22" rx="4" fill="rgba(232, 163, 61, 0.1)" stroke="var(--amber)" />
                <text x="70" y="130" fill="var(--amber)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">No Role ➔ 403</text>
              </g>

              {/* Bottom Distinction Callout */}
              <g transform="translate(50, 310)">
                <rect width="865" height="150" rx="10" fill="rgba(56, 189, 248, 0.05)" stroke="rgba(56, 189, 248, 0.2)" />
                <text x="24" y="32" fill="#38bdf8" fontSize="12" fontWeight="700" fontFamily="var(--mono)">
                  CRITICAL DISTINCTION: 401 UNAUTHORIZED VS 403 FORBIDDEN
                </text>
                <text x="24" y="60" fill="var(--text)" fontSize="12" fontWeight="600">
                  Steps 1 through 5 return 401 Unauthorized (Authentication Failure):
                </text>
                <text x="24" y="80" fill="var(--muted)" fontSize="11" fontFamily="var(--mono)">
                  &quot;I do not know who you are, or I cannot cryptographically verify your token.&quot; (Missing header, bad kid, forged signature, expired).
                </text>
                <text x="24" y="108" fill="var(--text)" fontSize="12" fontWeight="600">
                  Step 6 returns 403 Forbidden (Authorization Failure):
                </text>
                <text x="24" y="128" fill="var(--amber)" fontSize="11" fontFamily="var(--mono)">
                  &quot;I know exactly who you are, your token is 100% genuine, but you do not have permission for this route.&quot;
                </text>
              </g>
            </g>
          )}

          {/* ============================================================= */}
          {/* DIAGRAM 3: GOTCHA — THE DOCKER HOSTNAME SPLIT                 */}
          {/* ============================================================= */}
          {activeMode === 'hostname-split' && (
            <g>
              <rect x="40" y="40" width="880" height="450" rx="14" fill="rgba(15, 21, 29, 0.6)" stroke="rgba(232, 163, 61, 0.3)" />
              <text x="60" y="72" fill="var(--amber)" fontSize="14" fontWeight="700" fontFamily="var(--mono)">
                GOTCHA: THE DOCKER BRIDGE HOSTNAME SPLIT
              </text>
              <text x="60" y="92" fill="var(--muted)" fontSize="11" fontFamily="var(--mono)">
                Why docker-compose.yml requires separate TOKEN_ISSUER and JWKS_URL configuration values
              </text>

              {/* Host Machine / Browser Perspective */}
              <g transform="translate(60, 120)">
                <rect width="380" height="180" rx="10" fill="#090d12" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="20" y="28" fill="#38bdf8" fontSize="11" fontWeight="700" fontFamily="var(--mono)">CLIENT PERSPECTIVE (HOST OS)</text>
                <text x="20" y="52" fill="var(--text)" fontSize="12">Browser requests token from localhost:8080</text>
                <text x="20" y="78" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">Token claim stamped by Keycloak:</text>
                <rect x="20" y="90" width="340" height="35" rx="6" fill="#141c26" />
                <text x="30" y="112" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)">
                  &quot;iss&quot;: &quot;http://localhost:8080/realms/authlab&quot;
                </text>
                <text x="20" y="145" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">
                  Browser connects directly over host loopback.
                </text>
              </g>

              {/* Container Network Perspective */}
              <g transform="translate(520, 120)">
                <rect width="380" height="180" rx="10" fill="#090d12" stroke="var(--teal)" strokeWidth="1.5" />
                <text x="20" y="28" fill="var(--teal)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">API CONTAINER (DOCKER BRIDGE)</text>
                <text x="20" y="52" fill="var(--text)" fontSize="12">API container queries Keycloak via Docker DNS</text>
                <text x="20" y="78" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">Network endpoint to fetch JWKS:</text>
                <rect x="20" y="90" width="340" height="35" rx="6" fill="#141c26" />
                <text x="30" y="112" fill="#38bdf8" fontSize="10" fontFamily="var(--mono)">
                  &quot;JWKS_URL&quot;: &quot;http://keycloak:8080/realms/...&quot;
                </text>
                <text x="20" y="145" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">
                  Inside Docker, localhost:8080 is the API container itself!
                </text>
              </g>

              {/* The Mistake and Solution */}
              <g transform="translate(60, 320)">
                <rect width="840" height="145" rx="10" fill="rgba(255, 93, 93, 0.05)" stroke="rgba(255, 93, 93, 0.25)" />
                <text x="20" y="28" fill="var(--red)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">
                  WHAT BREAKS IF YOU DON&apos;T SPLIT THEM:
                </text>
                <text x="20" y="52" fill="var(--text)" fontSize="11.5">
                  If you set <code>TOKEN_ISSUER = &quot;http://keycloak:8080/realms/authlab&quot;</code>, the API checks <code>claim[&apos;iss&apos;] == &quot;keycloak:8080&quot;</code>.
                </text>
                <text x="20" y="72" fill="var(--red)" fontSize="11" fontFamily="var(--mono)">
                  Every token issued to a real browser or cURL will be rejected with <code>InvalidIssuerError</code> (401)!
                </text>
                <text x="20" y="102" fill="var(--teal)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">
                  THE PRODUCTION SOLUTION:
                </text>
                <text x="20" y="124" fill="var(--muted)" fontSize="11" fontFamily="var(--mono)">
                  Set <code>TOKEN_ISSUER = &quot;http://localhost:8080/...&quot;</code> (claim validation) and <code>JWKS_URL = &quot;http://keycloak:8080/...&quot;</code> (HTTP network fetch).
                </text>
              </g>
            </g>
          )}

          {/* ============================================================= */}
          {/* DIAGRAM 4: PHASE 2 ATTACK MATRIX VS VERIFIER DEFENSES         */}
          {/* ============================================================= */}
          {activeMode === 'attack-matrix' && (
            <g>
              <rect x="30" y="30" width="900" height="465" rx="14" fill="rgba(15, 21, 29, 0.6)" stroke="var(--line)" />
              <text x="50" y="60" fill="var(--text)" fontSize="14" fontWeight="700">
                Phase 2 Cryptographic Attack Vectors vs Strict Verifier Defenses
              </text>
              <text x="50" y="80" fill="var(--muted)" fontSize="11" fontFamily="var(--mono)">
                Demonstrating why naive verifiers get breached while production hardened code remains protected
              </text>

              {/* Exploit 1: alg: none */}
              <g transform="translate(50, 100)">
                <rect width="410" height="160" rx="10" fill="#090d12" stroke="var(--red)" strokeWidth="1.5" />
                <text x="16" y="26" fill="var(--red)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">ATTACK 1: alg: &quot;none&quot; SIGNATURE STRIP</text>
                <text x="16" y="48" fill="var(--text)" fontSize="11.5">Attacker sets <code>alg=&quot;none&quot;</code> and strips signature</text>
                <rect x="16" y="60" width="378" height="38" rx="6" fill="#141c26" />
                <text x="26" y="83" fill="#ff5d5d" fontSize="10" fontFamily="var(--mono)">eyJhbGciOiJub25lIn0.eyJyb2xlcyI6WyJhZG1pbiJdfQ.</text>
                <text x="16" y="120" fill="var(--red)" fontSize="10" fontFamily="var(--mono)">• Naive Verifier: Skips verify_signature ➔ 200 OK BREACHED!</text>
                <text x="16" y="138" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)">• Hardened: algorithms=[&quot;RS256&quot;] rejects &apos;none&apos; ➔ 401 BLOCKED</text>
              </g>

              {/* Exploit 2: CVE-2015-9235 */}
              <g transform="translate(485, 100)">
                <rect width="425" height="160" rx="10" fill="#090d12" stroke="var(--red)" strokeWidth="1.5" />
                <text x="16" y="26" fill="var(--red)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">ATTACK 2: CVE-2015-9235 (KEY CONFUSION)</text>
                <text x="16" y="48" fill="var(--text)" fontSize="11.5">Attacker switches RS256 ➔ HS256 using public RSA key</text>
                <rect x="16" y="60" width="393" height="38" rx="6" fill="#141c26" />
                <text x="26" y="83" fill="#a78bfa" fontSize="9.5" fontFamily="var(--mono)">HMAC_SHA256(payload, secret=PUBLIC_RSA_PEM_STRING)</text>
                <text x="16" y="120" fill="var(--red)" fontSize="10" fontFamily="var(--mono)">• Naive Verifier: Treats RSA public key as HMAC secret ➔ BREACHED!</text>
                <text x="16" y="138" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)">• Hardened: Rejects symmetric algs; pins RS256 ➔ 401 BLOCKED</text>
              </g>

              {/* Exploit 3 & 4 */}
              <g transform="translate(50, 275)">
                <rect width="410" height="190" rx="10" fill="#090d12" stroke="var(--line)" />
                <text x="16" y="26" fill="var(--amber)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">ATTACK 3: PAYLOAD PRIVILEGE ESCALATION</text>
                <text x="16" y="48" fill="var(--text)" fontSize="11.5">Modifies user claim from <code>viewer</code> ➔ <code>admin</code></text>
                <text x="16" y="75" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">
                  Without KeyStore&apos;s private RSA key, the mathematical hash will not match the digital signature.
                </text>
                <rect x="16" y="100" width="378" height="40" rx="6" fill="rgba(79, 209, 197, 0.08)" stroke="var(--teal)" />
                <text x="26" y="124" fill="var(--teal)" fontSize="10.5" fontFamily="var(--mono)">
                  Raises jwt.exceptions.InvalidSignatureError
                </text>
                <text x="16" y="165" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)">✓ Defended: 2048-bit RSA mathematical integrity</text>
              </g>

              {/* Exploit 5 & 6 */}
              <g transform="translate(485, 275)">
                <rect width="425" height="190" rx="10" fill="#090d12" stroke="var(--line)" />
                <text x="16" y="26" fill="var(--amber)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">ATTACK 4: EXPIRED TOKEN REPLAY ATTACK</text>
                <text x="16" y="48" fill="var(--text)" fontSize="11.5">Replays a validly signed token with <code>exp: -3600s</code></text>
                <text x="16" y="75" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">
                  Naive servers with <code>verify_exp=False</code> accept expired tokens indefinitely, allowing credential replay.
                </text>
                <rect x="16" y="100" width="393" height="40" rx="6" fill="rgba(79, 209, 197, 0.08)" stroke="var(--teal)" />
                <text x="26" y="124" fill="var(--teal)" fontSize="10.5" fontFamily="var(--mono)">
                  Raises jwt.exceptions.ExpiredSignatureError
                </text>
                <text x="16" y="165" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)">✓ Defended: Strict timestamp expiration gate</text>
              </g>
            </g>
          )}

          {/* ============================================================= */}
          {/* DIAGRAM 5: KEYSTORE ZERO-DOWNTIME ROTATION WITH OVERLAP       */}
          {/* ============================================================= */}
          {activeMode === 'key-rotation' && (
            <g>
              <rect x="30" y="30" width="900" height="465" rx="14" fill="rgba(15, 21, 29, 0.6)" stroke="rgba(79, 209, 197, 0.3)" />
              <text x="50" y="60" fill="var(--teal)" fontSize="14" fontWeight="700" fontFamily="var(--mono)">
                Zero-Downtime KeyStore Rotation with Multi-Key Overlap Window
              </text>
              <text x="50" y="80" fill="var(--muted)" fontSize="11" fontFamily="var(--mono)">
                How jwtlab KeyStore publishes multiple public keys in JWKS to prevent breaking active user sessions
              </text>

              {/* Timeline Header */}
              <g transform="translate(50, 110)">
                {/* State 1 */}
                <rect width="260" height="230" rx="10" fill="#090d12" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="20" y="28" fill="#38bdf8" fontSize="11" fontWeight="700" fontFamily="var(--mono)">STAGE 1: KEY 1 ACTIVE</text>
                <text x="20" y="50" fill="var(--text)" fontSize="11.5">Initial Operational State</text>
                <text x="20" y="75" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">• Active key: <code>e7b1a49f</code></text>
                <text x="20" y="95" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">• Signs all new tokens</text>
                <text x="20" y="115" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">• JWKS publishes:</text>
                <rect x="20" y="125" width="220" height="35" rx="4" fill="#141c26" />
                <text x="30" y="147" fill="#38bdf8" fontSize="9" fontFamily="var(--mono)">keys: [ kid: &quot;e7b1a49f&quot; ]</text>
                <text x="20" y="185" fill="var(--teal)" fontSize="9.5" fontFamily="var(--mono)">✓ Key 1 tokens valid (200 OK)</text>
              </g>

              {/* Rotation Trigger Arrow */}
              <path d="M 320 220 L 350 220" stroke="var(--teal)" strokeWidth="2" strokeDasharray="3 3" />
              <text x="335" y="210" fill="var(--teal)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">rotate()</text>

              {/* State 2: Overlap Window */}
              <g transform="translate(360, 110)">
                <rect width="260" height="230" rx="10" fill="rgba(79, 209, 197, 0.05)" stroke="var(--teal)" strokeWidth="2" />
                <text x="20" y="28" fill="var(--teal)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">STAGE 2: OVERLAP WINDOW</text>
                <text x="20" y="50" fill="var(--text)" fontSize="11.5">Dual-Key Coexistence</text>
                <text x="20" y="75" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">• Active key rotated: <code>8f2d9c1b</code></text>
                <text x="20" y="95" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">• Old key retained in store</text>
                <text x="20" y="115" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">• JWKS publishes BOTH:</text>
                <rect x="20" y="125" width="220" height="45" rx="4" fill="#141c26" />
                <text x="30" y="143" fill="#a78bfa" fontSize="8.5" fontFamily="var(--mono)">keys: [ &quot;e7b1a49f&quot; (old),</text>
                <text x="75" y="158" fill="var(--teal)" fontSize="8.5" fontFamily="var(--mono)">&quot;8f2d9c1b&quot; (new) ]</text>
                <text x="20" y="195" fill="var(--teal)" fontSize="9" fontFamily="var(--mono)">✓ ZERO DOWNTIME: In-flight</text>
                <text x="20" y="210" fill="var(--teal)" fontSize="9" fontFamily="var(--mono)">tokens continue validating!</text>
              </g>

              {/* Retire Trigger Arrow */}
              <path d="M 630 220 L 660 220" stroke="var(--amber)" strokeWidth="2" strokeDasharray="3 3" />
              <text x="645" y="210" fill="var(--amber)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">retire()</text>

              {/* State 3: Old Key Retired */}
              <g transform="translate(670, 110)">
                <rect width="240" height="230" rx="10" fill="#090d12" stroke="var(--line)" />
                <text x="20" y="28" fill="var(--muted)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">STAGE 3: RETIRED</text>
                <text x="20" y="50" fill="var(--text)" fontSize="11.5">Old Key Purged from JWKS</text>
                <text x="20" y="75" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">• Active key: <code>8f2d9c1b</code></text>
                <text x="20" y="95" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">• Old key dropped after TTL</text>
                <text x="20" y="115" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">• JWKS publishes:</text>
                <rect x="20" y="125" width="200" height="35" rx="4" fill="#141c26" />
                <text x="30" y="147" fill="var(--teal)" fontSize="9" fontFamily="var(--mono)">keys: [ kid: &quot;8f2d9c1b&quot; ]</text>
                <text x="20" y="185" fill="var(--red)" fontSize="9.5" fontFamily="var(--mono)">✗ Old Key 1 tokens now 401</text>
                <text x="20" y="200" fill="var(--teal)" fontSize="9.5" fontFamily="var(--mono)">✓ Key 2 tokens valid (200 OK)</text>
              </g>

              {/* Bottom Rule Strip */}
              <g transform="translate(50, 360)">
                <rect width="860" height="110" rx="10" fill="rgba(56, 189, 248, 0.05)" stroke="rgba(56, 189, 248, 0.2)" />
                <text x="20" y="28" fill="#38bdf8" fontSize="11" fontWeight="700" fontFamily="var(--mono)">
                  WHAT THE 4 ROTATION TESTS PROVE:
                </text>
                <text x="20" y="50" fill="var(--text)" fontSize="11.5">
                  1. When <code>store.rotate()</code> runs, tokens signed with the old key MUST still validate successfully.
                </text>
                <text x="20" y="70" fill="var(--text)" fontSize="11.5">
                  2. Only after <code>store.retire(old_kid)</code> removes the old key from JWKS should old tokens fail with 401.
                </text>
                <text x="20" y="92" fill="var(--teal)" fontSize="10.5" fontFamily="var(--mono)">
                  This overlap window guarantees that rotating keys never disconnects active mobile apps or active browser sessions.
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* Hover Inspector Pill for Interactive Nodes */}
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
              zIndex: 10,
            }}
          >
            <span style={{ color: 'var(--teal)', fontWeight: 600 }}>INSPECTING NODE:</span>
            <span style={{ color: 'var(--text)' }}>
              {hoveredNode === 'client-p1' && 'Client / Single Page App: Authenticates via Keycloak OIDC, receives access tokens, and attaches Bearer authorization headers to API calls.'}
              {hoveredNode === 'keycloak' && 'Keycloak Identity Provider: Central IAM engine handling realm authlab, user federation, password hashing, and RS256 token signing (Port 8080).'}
              {hoveredNode === 'postgres' && 'PostgreSQL Database: Persistent store for Keycloak internal realm configuration, users, roles, and application domain tables (Port 5432).'}
              {hoveredNode === 'resource-api' && 'Protected Resource API: Verifies Bearer tokens statelessly using public keys fetched from Keycloak JWKS endpoint. Never queries the database for token validity.'}
              {hoveredNode === 'rbac-gate' && 'RBAC Policy Gate: Inspects decoded realm_access.roles claims and guarantees that only authorized roles can invoke sensitive business logic.'}
              {hoveredNode === 'target-data' && 'Target Business Domain: The underlying PostgreSQL business entities (crops, workers, bookings, finance ledgers, and user management).'}
              {hoveredNode === 'client-p2' && 'Client / Threat Actor: Represents normal application users (Alice, Drench, Bob) or adversary Mallory simulating cryptographic attack payloads.'}
              {hoveredNode === 'keystore' && 'jwtlab KeyStore: Generates 2048-bit RSA keys, exports RFC 7517 compliant JWKS, and manages zero-downtime key rotation with dual-key overlap.'}
              {hoveredNode === 'jwks-p2' && 'RFC 7517 JWKS Endpoint: Publishes active and retiring public RSA keys (/jwks.json) for stateless verifier consumption.'}
              {hoveredNode === 'naive-verifier' && 'Naive Verifier: Deliberately vulnerable implementation that blindly trusts the token header alg claim, enabling alg: none and CVE-2015-9235 exploits.'}
              {hoveredNode === 'hardened-verifier' && 'Production Hardened Verifier: Strict verifier with pinned algorithms=["RS256"] allow-list, blocking all signature stripping and key confusion attacks.'}
              {hoveredNode === 'rbac-p2' && 'Phase 2 Claims Gate: Enforces standard claims (iss, aud, exp) and user roles from verified payload.'}
              {hoveredNode === 'resource-p2' && 'Protected API Route: Target endpoints returning user profiles, developer assets, or administrative user lists.'}
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
          KEYCLOAK 26 · OAUTH 2.0 / OIDC · RS256 ASYMMETRIC · POSTGRES 16 · 16 PYTEST SECURITY TESTS
        </span>
      </div>
    </div>
  )
}
