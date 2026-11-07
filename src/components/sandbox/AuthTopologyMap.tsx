import { useState } from 'react'

export type AuthPersona = 'anonymous' | 'farmer' | 'service_provider' | 'admin' | 'tampered' | 'alice' | 'drench' | 'mallory'
export type AuthEndpoint = 'public' | 'me' | 'crops' | 'services' | 'admin-users' | 'reset-pwd' | 'users'
export type DiagramMode = 'architecture' | 'validation-pipeline' | 'hostname-split' | 'attack-matrix' | 'key-rotation'

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

export function AuthTopologyMap({
  phase = 'phase-1',
  persona,
  endpoint,
  decision,
  activeExploit,
  diagramMode: controlledDiagramMode,
  onSelectDiagramMode,
}: AuthTopologyMapProps) {
  const [internalDiagramMode, setInternalDiagramMode] = useState<DiagramMode>('architecture')
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
              REALM: <strong style={{ color: 'var(--text)' }}>{isPhase2 ? 'Authlab' : 'farm360'}</strong> · CLIENT: <strong style={{ color: 'var(--text)' }}>{isPhase2 ? 'authlab-web' : 'farm360-web'}</strong>
            </span>
          </div>

          <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>
              {activeMode === 'architecture' && 'Diagram 1: The Two Sides of Auth (Issuer vs Resource Server)'}
              {activeMode === 'validation-pipeline' && 'Diagram 2: How the API Validates a Token (6-Step Pipeline in api/app.py)'}
              {activeMode === 'hostname-split' && 'Diagram 3: Gotcha — Issuer vs JWKS Hostnames (TOKEN_ISSUER vs JWKS_URL)'}
              {activeMode === 'attack-matrix' && 'Diagram 4: Phase 2 Cryptographic Attack vs Defense (CVE-2015-9235 & alg: none)'}
              {activeMode === 'key-rotation' && 'Diagram 5: Zero-Downtime KeyStore Rotation with Overlap Window'}
            </span>
          </h4>

          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)', maxWidth: '780px' }}>
            {activeMode === 'architecture' && 'Authentication has two sides: the issuer (proves identity, signs tokens with RSA private key) and the resource server (checks token on every request, never sees passwords).'}
            {activeMode === 'validation-pipeline' && 'The 6 validation steps: 1. Read Bearer header ➔ 2. Read kid from header ➔ 3. Fetch JWKS public keys ➔ 4. Verify RS256 signature ➔ 5. Check iss, aud, exp ➔ 6. Read realm_access.roles.'}
            {activeMode === 'hostname-split' && 'The token iss claim is localhost:8080 (from browser perspective), but the Flask container connects to keycloak:8080 over Docker network. That is why compose has two separate settings!'}
            {activeMode === 'attack-matrix' && 'Contrasting the vulnerable naive_verify_token (believes alg header) against the secure verify_token (pinned to algorithms=["RS256"]). Thwarts CVE-2015-9235 and alg: none.'}
            {activeMode === 'key-rotation' && 'KeyStore maintains an overlap window where old and new keys are published in JWKS simultaneously. Active sessions do not break until old keys are retired.'}
          </p>
        </div>

        {/* DIAGRAM MODE SWITCHER BUTTONS */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
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

              {/* Postgres Database Box */}
              <g transform="translate(80, 310)">
                <rect width="320" height="130" rx="10" fill="#0f151d" stroke="#a78bfa" strokeWidth="1.8" />
                <text x="20" y="30" fill="#a78bfa" fontSize="10" fontWeight="700" fontFamily="var(--mono)">POSTGRESQL 16 (SURVIVES RESTARTS)</text>
                <text x="20" y="55" fill="var(--text)" fontSize="13" fontWeight="700">Persistent Realm &amp; App Store</text>
                <text x="20" y="78" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• User accounts, Argon2/PBKDF2 password hashes</text>
                <text x="20" y="96" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Avoids ephemeral embedded DB; production-grade</text>
                <text x="20" y="114" fill="#a78bfa" fontSize="10" fontFamily="var(--mono)">• Port: 5432 · Bound to 127.0.0.1</text>
              </g>

              {/* Right Zone: The Resource Server (Flask API) */}
              <rect x="530" y="60" width="380" height="420" rx="14" fill="rgba(79, 209, 197, 0.03)" stroke="rgba(79, 209, 197, 0.25)" strokeDasharray="4 4" />
              <text x="550" y="88" fill="var(--teal)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">
                THE RESOURCE SERVER (PROTECTED API)
              </text>
              <text x="550" y="105" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">
                Checks tokens on every request · NEVER sees passwords!
              </text>

              {/* Flask API Box */}
              <g transform="translate(560, 130)">
                <rect width="320" height="130" rx="10" fill="#0f151d" stroke="var(--teal)" strokeWidth="2" />
                <text x="20" y="30" fill="var(--teal)" fontSize="10" fontWeight="700" fontFamily="var(--mono)">FLASK RESOURCE API (PORT 5001)</text>
                <text x="20" y="55" fill="var(--text)" fontSize="13" fontWeight="700">Stateless Token Verification &amp; RBAC</text>
                <text x="20" y="78" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Fetches &amp; caches public keys from JWKS</text>
                <text x="20" y="96" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Verifies RS256 signature, iss, aud, exp</text>
                <text x="20" y="114" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)">• Decides 200 OK vs 401 Unauthorized vs 403 Forbidden</text>
              </g>

              {/* Protected Domain Box */}
              <g transform="translate(560, 310)">
                <rect width="320" height="130" rx="10" fill="#0f151d" stroke="var(--line)" strokeWidth="1.8" />
                <text x="20" y="30" fill="var(--faint)" fontSize="10" fontWeight="700" fontFamily="var(--mono)">PROTECTED BUSINESS RESOURCES</text>
                <text x="20" y="55" fill="var(--text)" fontSize="13" fontWeight="700">Domain Entities (Users, Crops, Services)</text>
                <text x="20" y="78" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• /api/users: Accessible to viewer, developer, admin</text>
                <text x="20" y="96" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• /api/admin/users: Strictly restricted to role: admin</text>
                <text x="20" y="114" fill="var(--amber)" fontSize="10" fontFamily="var(--mono)">• Non-root user execution in container</text>
              </g>

              {/* Communication Paths */}
              {/* Path 1: JWKS Sync */}
              <path d="M 400 180 L 560 180" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="6 6" />
              <text x="480" y="170" fill="#38bdf8" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">JWKS Public Certs</text>

              {/* Path 2: Client Request Flow */}
              <path d="M 480 370 L 560 370" fill="none" stroke="var(--teal)" strokeWidth="2.5" />
              <text x="480" y="360" fill="var(--teal)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">Bearer Token API Call</text>

              {/* Central Client Badge */}
              <g transform="translate(430, 230)">
                <circle cx="50" cy="50" r="32" fill="#090d12" stroke="var(--teal)" strokeWidth="2" filter="url(#auth-glow)" />
                <text x="50" y="46" fill="var(--text)" fontSize="10" fontWeight="700" textAnchor="middle">CLIENT</text>
                <text x="50" y="60" fill="var(--teal)" fontSize="8" fontFamily="var(--mono)" textAnchor="middle">App / cURL</text>
              </g>
            </g>
          )}

          {/* ============================================================= */}
          {/* DIAGRAM 2: THE 6-STEP API VALIDATION PIPELINE (api/app.py)    */}
          {/* ============================================================= */}
          {activeMode === 'validation-pipeline' && (
            <g>
              <text x="50" y="50" fill="var(--text)" fontSize="14" fontWeight="700">
                The 6-Step Token Validation Flowchart (Executed on Every Protected Request)
              </text>

              {/* Step 1 */}
              <g transform="translate(50, 80)">
                <rect width="130" height="90" rx="8" fill="#0f151d" stroke="#38bdf8" strokeWidth="1.8" />
                <text x="12" y="24" fill="#38bdf8" fontSize="9" fontWeight="700" fontFamily="var(--mono)">STEP 1</text>
                <text x="12" y="44" fill="var(--text)" fontSize="11" fontWeight="700">Read Header</text>
                <text x="12" y="62" fill="var(--muted)" fontSize="8.5" fontFamily="var(--mono)">Authorization:</text>
                <text x="12" y="76" fill="var(--teal)" fontSize="8.5" fontFamily="var(--mono)">Bearer &lt;token&gt;</text>
              </g>

              {/* Step 2 */}
              <g transform="translate(200, 80)">
                <rect width="130" height="90" rx="8" fill="#0f151d" stroke="#38bdf8" strokeWidth="1.8" />
                <text x="12" y="24" fill="#38bdf8" fontSize="9" fontWeight="700" fontFamily="var(--mono)">STEP 2</text>
                <text x="12" y="44" fill="var(--text)" fontSize="11" fontWeight="700">Read Header kid</text>
                <text x="12" y="62" fill="var(--muted)" fontSize="8.5" fontFamily="var(--mono)">Extract Key ID</text>
                <text x="12" y="76" fill="#38bdf8" fontSize="8.5" fontFamily="var(--mono)">kid: &quot;e7b1a49f&quot;</text>
              </g>

              {/* Step 3 */}
              <g transform="translate(350, 80)">
                <rect width="130" height="90" rx="8" fill="#0f151d" stroke="#38bdf8" strokeWidth="1.8" />
                <text x="12" y="24" fill="#38bdf8" fontSize="9" fontWeight="700" fontFamily="var(--mono)">STEP 3</text>
                <text x="12" y="44" fill="var(--text)" fontSize="11" fontWeight="700">Fetch JWKS</text>
                <text x="12" y="62" fill="var(--muted)" fontSize="8.5" fontFamily="var(--mono)">Match public key</text>
                <text x="12" y="76" fill="#38bdf8" fontSize="8.5" fontFamily="var(--mono)">In-memory cache</text>
              </g>

              {/* Step 4 */}
              <g transform="translate(500, 80)">
                <rect width="130" height="90" rx="8" fill="#0f151d" stroke="var(--teal)" strokeWidth="1.8" />
                <text x="12" y="24" fill="var(--teal)" fontSize="9" fontWeight="700" fontFamily="var(--mono)">STEP 4</text>
                <text x="12" y="44" fill="var(--text)" fontSize="11" fontWeight="700">Verify RS256</text>
                <text x="12" y="62" fill="var(--muted)" fontSize="8.5" fontFamily="var(--mono)">Asymmetric math</text>
                <text x="12" y="76" fill="var(--teal)" fontSize="8.5" fontFamily="var(--mono)">Digital signature</text>
              </g>

              {/* Step 5 */}
              <g transform="translate(650, 80)">
                <rect width="130" height="90" rx="8" fill="#0f151d" stroke="var(--teal)" strokeWidth="1.8" />
                <text x="12" y="24" fill="var(--teal)" fontSize="9" fontWeight="700" fontFamily="var(--mono)">STEP 5</text>
                <text x="12" y="44" fill="var(--text)" fontSize="11" fontWeight="700">Check Claims</text>
                <text x="12" y="62" fill="var(--muted)" fontSize="8.5" fontFamily="var(--mono)">iss, aud, exp</text>
                <text x="12" y="76" fill="var(--teal)" fontSize="8.5" fontFamily="var(--mono)">Mandatory check</text>
              </g>

              {/* Step 6 */}
              <g transform="translate(800, 80)">
                <rect width="130" height="90" rx="8" fill="#0f151d" stroke="var(--amber)" strokeWidth="1.8" />
                <text x="12" y="24" fill="var(--amber)" fontSize="9" fontWeight="700" fontFamily="var(--mono)">STEP 6</text>
                <text x="12" y="44" fill="var(--text)" fontSize="11" fontWeight="700">RBAC Gate</text>
                <text x="12" y="62" fill="var(--muted)" fontSize="8.5" fontFamily="var(--mono)">realm_access.roles</text>
                <text x="12" y="76" fill="var(--amber)" fontSize="8.5" fontFamily="var(--mono)">@require_roles</text>
              </g>

              {/* Flow Arrows */}
              <path d="M 180 125 L 200 125" stroke="var(--teal)" strokeWidth="2" />
              <path d="M 330 125 L 350 125" stroke="var(--teal)" strokeWidth="2" />
              <path d="M 480 125 L 500 125" stroke="var(--teal)" strokeWidth="2" />
              <path d="M 630 125 L 650 125" stroke="var(--teal)" strokeWidth="2" />
              <path d="M 780 125 L 800 125" stroke="var(--teal)" strokeWidth="2" />

              {/* Failure Branches & Decision Outcomes */}
              <g transform="translate(50, 220)">
                <rect width="380" height="240" rx="10" fill="rgba(232, 115, 93, 0.05)" stroke="rgba(232, 115, 93, 0.3)" />
                <text x="20" y="32" fill="var(--red)" fontSize="12" fontWeight="700" fontFamily="var(--mono)">401 UNAUTHORIZED: &quot;I CANNOT TRUST WHO YOU ARE&quot;</text>
                <text x="20" y="60" fill="var(--text)" fontSize="11" fontWeight="600">Occurs at Steps 1–5 if:</text>
                <text x="20" y="85" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Missing Authorization header (Step 1)</text>
                <text x="20" y="110" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Unknown or forged kid (Step 2 &amp; 3)</text>
                <text x="20" y="135" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Signature mismatch / altered payload bytes (Step 4)</text>
                <text x="20" y="160" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Expired token: exp &lt; now (Step 5)</text>
                <text x="20" y="185" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Wrong issuer or wrong audience aud (Step 5)</text>
                <text x="20" y="215" fill="var(--red)" fontSize="10" fontFamily="var(--mono)">➔ Stops execution immediately · Zero DB access</text>
              </g>

              <g transform="translate(490, 220)">
                <rect width="440" height="240" rx="10" fill="rgba(79, 209, 197, 0.05)" stroke="rgba(79, 209, 197, 0.3)" />
                <text x="20" y="32" fill="var(--teal)" fontSize="12" fontWeight="700" fontFamily="var(--mono)">403 FORBIDDEN: &quot;I KNOW WHO YOU ARE, BUT NO&quot;</text>
                <text x="20" y="60" fill="var(--text)" fontSize="11" fontWeight="600">Occurs strictly at Step 6:</text>
                <text x="20" y="85" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Authentication is 100% valid (identity is verified)</text>
                <text x="20" y="110" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Alice (role: viewer) calls /api/admin/users ➔ 403 Forbidden</text>
                <text x="20" y="135" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">• Bob (role: admin) calls /api/admin/users ➔ 200 OK (Allowed)</text>
                <text x="20" y="170" fill="var(--teal)" fontSize="11" fontWeight="600">The Core Distinction:</text>
                <text x="20" y="195" fill="var(--text)" fontSize="10.5" fontFamily="var(--mono)">401 = Authentication failure (unverified identity)</text>
                <text x="20" y="215" fill="var(--text)" fontSize="10.5" fontFamily="var(--mono)">403 = Authorization failure (insufficient role privileges)</text>
              </g>
            </g>
          )}

          {/* ============================================================= */}
          {/* DIAGRAM 3: GOTCHA — ISSUER VS JWKS HOSTNAMES                  */}
          {/* ============================================================= */}
          {activeMode === 'hostname-split' && (
            <g>
              <text x="50" y="50" fill="var(--text)" fontSize="14" fontWeight="700">
                Gotcha: The Network Hostname Split (Why TOKEN_ISSUER != JWKS_URL)
              </text>

              {/* Host Machine Zone */}
              <rect x="50" y="80" width="400" height="380" rx="12" fill="rgba(56, 189, 248, 0.04)" stroke="rgba(56, 189, 248, 0.3)" />
              <text x="70" y="110" fill="#38bdf8" fontSize="12" fontWeight="700" fontFamily="var(--mono)">
                HOST MACHINE / BROWSER VIEW (localhost)
              </text>
              <text x="70" y="130" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">
                The user accesses Keycloak via browser or cURL CLI
              </text>

              <g transform="translate(80, 160)">
                <rect width="340" height="90" rx="8" fill="#0f151d" stroke="#38bdf8" strokeWidth="1.8" />
                <text x="16" y="28" fill="#38bdf8" fontSize="10" fontWeight="700" fontFamily="var(--mono)">USER TOKEN REQUEST</text>
                <text x="16" y="50" fill="var(--text)" fontSize="11" fontFamily="var(--mono)">POST http://localhost:8080/realms/authlab/token</text>
                <text x="16" y="72" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)">➔ Minted Token iss = &quot;http://localhost:8080/realms/authlab&quot;</text>
              </g>

              <g transform="translate(80, 280)">
                <rect width="340" height="150" rx="8" fill="#0f151d" stroke="var(--line)" strokeWidth="1.8" />
                <text x="16" y="28" fill="var(--text)" fontSize="11" fontWeight="700">Why TOKEN_ISSUER must be localhost:8080</text>
                <text x="16" y="52" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">The Flask API validates: token[&quot;iss&quot;] == TOKEN_ISSUER.</text>
                <text x="16" y="74" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">If the API checked &quot;http://keycloak:8080...&quot;,</text>
                <text x="16" y="96" fill="var(--red)" fontSize="10" fontFamily="var(--mono)">it would crash with InvalidIssuerError!</text>
                <text x="16" y="124" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)">TOKEN_ISSUER = http://localhost:8080/realms/authlab</text>
              </g>

              {/* Docker Internal Network Zone */}
              <rect x="510" y="80" width="400" height="380" rx="12" fill="rgba(79, 209, 197, 0.04)" stroke="rgba(79, 209, 197, 0.3)" />
              <text x="530" y="110" fill="var(--teal)" fontSize="12" fontWeight="700" fontFamily="var(--mono)">
                DOCKER INTERNAL BRIDGE NETWORK (keycloak:8080)
              </text>
              <text x="530" y="130" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">
                Containers communicate via Docker internal service DNS
              </text>

              <g transform="translate(540, 160)">
                <rect width="340" height="90" rx="8" fill="#0f151d" stroke="var(--teal)" strokeWidth="1.8" />
                <text x="16" y="28" fill="var(--teal)" fontSize="10" fontWeight="700" fontFamily="var(--mono)">API JWKS CERTIFICATE FETCH</text>
                <text x="16" y="50" fill="var(--text)" fontSize="11" fontFamily="var(--mono)">GET http://keycloak:8080/realms/authlab/certs</text>
                <text x="16" y="72" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)">➔ API connects over Docker bridge network</text>
              </g>

              <g transform="translate(540, 280)">
                <rect width="340" height="150" rx="8" fill="#0f151d" stroke="var(--line)" strokeWidth="1.8" />
                <text x="16" y="28" fill="var(--text)" fontSize="11" fontWeight="700">Why JWKS_URL must be keycloak:8080</text>
                <text x="16" y="52" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">Inside the Flask container, &quot;localhost&quot; means</text>
                <text x="16" y="74" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">the Flask container itself, NOT Keycloak!</text>
                <text x="16" y="96" fill="var(--red)" fontSize="10" fontFamily="var(--mono)">Calling localhost:8080 inside container = Connection Refused!</text>
                <text x="16" y="124" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)">JWKS_URL = http://keycloak:8080/realms/authlab/certs</text>
              </g>

              {/* Connecting Bridge Arrow */}
              <path d="M 450 205 L 510 205" stroke="var(--amber)" strokeWidth="2.5" strokeDasharray="4 4" />
              <text x="480" y="195" fill="var(--amber)" fontSize="9" fontFamily="var(--mono)" textAnchor="middle">Network Split</text>
            </g>
          )}

          {/* ============================================================= */}
          {/* DIAGRAM 4: PHASE 2 ATTACK VS DEFENSE (CVE-2015-9235 & NONE)  */}
          {/* ============================================================= */}
          {activeMode === 'attack-matrix' && (
            <g>
              <text x="50" y="50" fill="var(--text)" fontSize="14" fontWeight="700">
                Phase 2 Cryptographic Attack Vectors vs Hardened Defenses
              </text>

              {/* Exploit A: alg: none */}
              <g transform="translate(50, 80)">
                <rect width="410" height="180" rx="10" fill="#0f151d" stroke="var(--red)" strokeWidth="1.8" />
                <text x="16" y="28" fill="var(--red)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">
                  EXPLOIT A: alg: &quot;none&quot; SIGNATURE STRIPPING
                </text>
                <text x="16" y="52" fill="var(--text)" fontSize="10.5" fontFamily="var(--mono)">
                  Token Header: {`{"alg": "none", "typ": "JWT"}`} · Signature: &quot;&quot; (empty)
                </text>
                <text x="16" y="80" fill="var(--muted)" fontSize="10">
                  • Naive Verifier: Believes alg header ➔ Skips signature validation!
                </text>
                <text x="16" y="98" fill="var(--red)" fontSize="10.5" fontWeight="700" fontFamily="var(--mono)">
                  ➔ EXPLOITED: Mallory granted role: admin with zero credentials!
                </text>
                <text x="16" y="128" fill="var(--teal)" fontSize="10">
                  • Hardened Verifier: Enforces algorithms=[&quot;RS256&quot;] allow-list.
                </text>
                <text x="16" y="146" fill="var(--teal)" fontSize="10.5" fontWeight="700" fontFamily="var(--mono)">
                  ➔ BLOCKED: Raises jwt.InvalidTokenError (&quot;algorithm none not allowed&quot;)
                </text>
              </g>

              {/* Exploit B: CVE-2015-9235 */}
              <g transform="translate(500, 80)">
                <rect width="410" height="180" rx="10" fill="#0f151d" stroke="var(--red)" strokeWidth="1.8" />
                <text x="16" y="28" fill="var(--red)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">
                  EXPLOIT B: CVE-2015-9235 (ALGORITHM KEY CONFUSION)
                </text>
                <text x="16" y="52" fill="var(--text)" fontSize="10.5" fontFamily="var(--mono)">
                  Attacker signs with server&apos;s PUBLIC RSA PEM as HMAC secret!
                </text>
                <text x="16" y="80" fill="var(--muted)" fontSize="10">
                  • Naive Verifier: jwt.decode(token, public_key) with no alg check.
                </text>
                <text x="16" y="98" fill="var(--red)" fontSize="10.5" fontWeight="700" fontFamily="var(--mono)">
                  ➔ EXPLOITED: PyJWT treats public key as HMAC string and approves!
                </text>
                <text x="16" y="128" fill="var(--teal)" fontSize="10">
                  • Hardened Verifier: Rejects symmetric algorithms when expecting RSA.
                </text>
                <text x="16" y="146" fill="var(--teal)" fontSize="10.5" fontWeight="700" fontFamily="var(--mono)">
                  ➔ BLOCKED: Asymmetric allow-list prevents symmetric confusion
                </text>
              </g>

              {/* 16 Tests Summary Box */}
              <g transform="translate(50, 290)">
                <rect width="860" height="170" rx="10" fill="rgba(79, 209, 197, 0.05)" stroke="var(--teal)" strokeWidth="1.8" />
                <text x="20" y="32" fill="var(--teal)" fontSize="12" fontWeight="700" fontFamily="var(--mono)">
                  THE 16-EXPLOIT AUTOMATED PYTEST SUITE (test_jwt_attacks.py)
                </text>
                <text x="20" y="60" fill="var(--text)" fontSize="11">
                  Phase 2 systematically tests and proves every defense mechanism:
                </text>

                <g transform="translate(20, 80)">
                  <text x="0" y="0" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">1. Expired / missing exp ➔ Checked</text>
                  <text x="0" y="24" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">2. Wrong audience / issuer ➔ Pinned</text>
                  <text x="0" y="48" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">3. Tampered payload ➔ Signature caught</text>

                  <text x="300" y="0" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">4. Attacker foreign key ➔ Rejected</text>
                  <text x="300" y="24" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">5. Unknown kid ➔ Never falls back</text>
                  <text x="300" y="48" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">6. alg: none &amp; HS256 ➔ Allow-list</text>

                  <text x="600" y="0" fill="var(--teal)" fontSize="10.5" fontFamily="var(--mono)">7. Key rotation ➔ Overlap</text>
                  <text x="600" y="24" fill="var(--teal)" fontSize="10.5" fontFamily="var(--mono)">8. HTTP RBAC ➔ 401 &amp; 403</text>
                  <text x="600" y="48" fill="var(--teal)" fontSize="10.5" fontWeight="700" fontFamily="var(--mono)">16/16 PASSED (100%)</text>
                </g>
              </g>
            </g>
          )}

          {/* ============================================================= */}
          {/* DIAGRAM 5: KEYSTORE ROTATION WITH OVERLAP WINDOW              */}
          {/* ============================================================= */}
          {activeMode === 'key-rotation' && (
            <g>
              <text x="50" y="50" fill="var(--text)" fontSize="14" fontWeight="700">
                KeyStore Zero-Downtime Key Rotation: The Overlap Window
              </text>

              {/* State 1 */}
              <g transform="translate(50, 90)">
                <rect width="260" height="240" rx="10" fill="#0f151d" stroke="#38bdf8" strokeWidth="1.8" />
                <text x="16" y="28" fill="#38bdf8" fontSize="11" fontWeight="700" fontFamily="var(--mono)">STATE 1: INITIAL STATE</text>
                <text x="16" y="55" fill="var(--text)" fontSize="12" fontWeight="700">Key A Active (e7b1a49f)</text>
                <text x="16" y="80" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">• KeyStore.current = &quot;e7b1a49f&quot;</text>
                <text x="16" y="105" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">• JWKS publishes: [Key A]</text>
                <text x="16" y="130" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">• All tokens signed with Key A</text>
                <text x="16" y="165" fill="var(--teal)" fontSize="10.5" fontWeight="700" fontFamily="var(--mono)">Tokens Valid: 100%</text>
                <text x="16" y="195" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)">Single key in rotation</text>
              </g>

              {/* State 2 */}
              <g transform="translate(350, 90)">
                <rect width="260" height="240" rx="10" fill="#0f151d" stroke="var(--teal)" strokeWidth="2" filter="url(#auth-glow)" />
                <text x="16" y="28" fill="var(--teal)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">STATE 2: OVERLAP WINDOW</text>
                <text x="16" y="55" fill="var(--text)" fontSize="12" fontWeight="700">store.rotate() Invoked</text>
                <text x="16" y="80" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">• Key B minted (8f2d9c1b)</text>
                <text x="16" y="105" fill="var(--teal)" fontSize="10" fontFamily="var(--mono)">• JWKS publishes: [Key A, Key B]</text>
                <text x="16" y="130" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">• New tokens signed with Key B</text>
                <text x="16" y="150" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">• Old tokens signed with Key A</text>
                <text x="16" y="180" fill="var(--teal)" fontSize="10.5" fontWeight="700" fontFamily="var(--mono)">Tokens Valid: Key A &amp; Key B</text>
                <text x="16" y="205" fill="var(--teal)" fontSize="9" fontFamily="var(--mono)">ZERO DOWNTIME achieved!</text>
              </g>

              {/* State 3 */}
              <g transform="translate(650, 90)">
                <rect width="260" height="240" rx="10" fill="#0f151d" stroke="var(--amber)" strokeWidth="1.8" />
                <text x="16" y="28" fill="var(--amber)" fontSize="11" fontWeight="700" fontFamily="var(--mono)">STATE 3: RETIREMENT</text>
                <text x="16" y="55" fill="var(--text)" fontSize="12" fontWeight="700">store.retire(&quot;e7b1a49f&quot;)</text>
                <text x="16" y="80" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">• Once Key A tokens expire (15m)</text>
                <text x="16" y="105" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">• JWKS publishes: [Key B]</text>
                <text x="16" y="130" fill="var(--muted)" fontSize="10" fontFamily="var(--mono)">• Key A dropped from memory</text>
                <text x="16" y="165" fill="var(--amber)" fontSize="10.5" fontWeight="700" fontFamily="var(--mono)">Key A Tokens: REJECTED</text>
                <text x="16" y="195" fill="var(--faint)" fontSize="9" fontFamily="var(--mono)">Key B Tokens: VALID (200 OK)</text>
              </g>

              {/* Transition Arrows */}
              <path d="M 310 210 L 350 210" stroke="var(--teal)" strokeWidth="2.5" />
              <text x="330" y="200" fill="var(--teal)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">rotate()</text>

              <path d="M 610 210 L 650 210" stroke="var(--amber)" strokeWidth="2.5" />
              <text x="630" y="200" fill="var(--amber)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle">retire()</text>

              {/* Explanation Box */}
              <g transform="translate(50, 360)">
                <rect width="860" height="100" rx="8" fill="rgba(255, 255, 255, 0.02)" stroke="var(--line)" />
                <text x="20" y="28" fill="var(--text)" fontSize="11" fontWeight="700">
                  Why Rotation Needs an Overlap Window (Interview Talking Point):
                </text>
                <text x="20" y="50" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">
                  If you swap cryptographic keys instantly without publishing both in the JWKS, every single live session token
                </text>
                <text x="20" y="70" fill="var(--muted)" fontSize="10.5" fontFamily="var(--mono)">
                  breaks across the entire platform. The overlap window ensures old tokens validate until their natural TTL expires.
                </text>
              </g>
            </g>
          )}
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
            <span style={{ color: 'var(--text)' }}>{hoveredNode}</span>
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: 'var(--muted)' }}>
        <span>
          💡 <strong style={{ color: 'var(--text)' }}>Core Architecture Rule:</strong> Always keep the Issuer (identity, credentials, private key) separate from the Resource Server (stateless public verification, permissions).
        </span>
        <span style={{ font: '10px var(--mono)', color: 'var(--faint)' }}>
          KEYCLOAK 26 · OAUTH 2.0 / OIDC · RS256 JWKS · 16 PYTEST EXPLOITS
        </span>
      </div>
    </div>
  )
}
