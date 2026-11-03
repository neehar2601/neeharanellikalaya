import { useEffect, useMemo, useState } from 'react'
import type { Project } from '../data/projects'
import type { PipelineState, SimulationSnapshot } from '../types/simulation'
import { failureSnapshots, successSnapshots } from '../simulations/canary'

type Props = {
  project: Project
}

type ProjectSimConfig = {
  idleMessage: string
  successMessage: string
  stageDescriptions: string[]
  metrics?: {
    head1: string
    tag1: string
    val1: string
    sub1: string
    head2: string
    tag2: string
    val2: string
    sub2: string
  }
}

const projectConfigs: Record<string, ProjectSimConfig> = {
  progressive: {
    idleMessage: 'idle — click "▶ run simulation" to simulate Istio canary promotion',
    successMessage: 'promotion complete — 100% traffic shifted to stable deployment',
    stageDescriptions: [
      '1/8 · Git commit pushed to production branch',
      '2/8 · Jenkins CI builds and packages Helm chart release',
      '3/8 · Helm packages application manifest',
      '4/8 · Argo CD syncs desired Kubernetes state',
      '5/8 · Istio initiates canary traffic routing (10% canary)',
      '6/8 · Prometheus collects latency & error rate metrics',
      '7/8 · Flagger analyzes metrics against health criteria',
      '8/8 · Kubernetes deployment promoted: 100% traffic live',
    ],
  },
  cafe: {
    idleMessage: 'idle — click "▶ run flow preview" to simulate AWS request routing & serverless flow',
    successMessage: 'healthy 200 OK — high-availability multi-AZ cafe architecture operational',
    stageDescriptions: [
      '1/9 · Users initiate HTTPS requests to cafe web portal',
      '2/9 · Application Load Balancer terminates TLS & balances across AZs',
      '3/9 · Auto Scaling EC2 instances serve dynamic PHP/web requests',
      '4/9 · Multi-AZ MySQL RDS processes order and menu queries',
      '5/9 · Daily reporting trigger: Lambda 1 extracts transaction data',
      '6/9 · Lambda 2 formats daily summary and prepares SNS alert',
      '7/9 · Amazon SNS delivers operational notifications to subscribers',
      '8/9 · CloudWatch logs system metrics, alarms, and response latency',
      '9/9 · CloudFormation verifies template syntax for repeatable infra',
    ],
    metrics: {
      head1: 'ALB & Web Tier',
      tag1: 'AWS us-east-1',
      val1: '2/2 healthy',
      sub1: 'Auto Scaling · multi-AZ · TLSv1.3',
      head2: 'Database & Reporting',
      tag2: 'RDS + Lambda + SNS',
      val2: '12ms latency',
      sub2: 'Multi-AZ MySQL · automated daily report',
    },
  },
  collegefest: {
    idleMessage: 'idle — click "▶ run flow preview" to simulate build, push & EC2 compose deployment',
    successMessage: 'deployment verified — container online with TLS certificate at msisfelicity.in',
    stageDescriptions: [
      '1/7 · Source commit pushed to private GitHub repository',
      '2/7 · Jenkins CI triggered: automated unit test execution',
      '3/7 · Docker packages container image (python:3.9-slim)',
      '4/7 · Immutable build-number-tagged image pushed to Docker Hub',
      '5/7 · Jenkins updates docker-compose.yml on free-tier EC2 instance',
      '6/7 · Automated curl health verification checks HTTP 200 response',
      '7/7 · Service live! Nginx reverse proxy serves HTTPS with host-mounted certs',
    ],
    metrics: {
      head1: 'Container Build',
      tag1: 'Docker Hub',
      val1: 'neehar/felicity:v24',
      sub1: 'python:3.9-slim · build number tagged',
      head2: 'Host Runtime',
      tag2: 'AWS EC2 Free Tier',
      val2: 'active (running)',
      sub2: 'Docker Compose · read-only TLS mount',
    },
  },
  'image-gallery': {
    idleMessage: 'idle — click "▶ run flow preview" to simulate serverless listing & CloudFront delivery',
    successMessage: 'architecture verified — OAC-protected private S3 with serverless API dynamic discovery',
    stageDescriptions: [
      '1/6 · Browser requests gallery frontend from S3 static website hosting',
      '2/6 · Python script scans bucket & pre-generates gallery-index.json metadata',
      '3/6 · Serverless AWS Lambda handles dynamic listing via ListObjectsV2',
      '4/6 · Amazon API Gateway exposes RESTful HTTPS endpoint (/images)',
      '5/6 · CloudFront global CDN caches assets at edge locations',
      '6/6 · Origin Access Control (OAC) restricts direct S3 access to CloudFront only',
    ],
    metrics: {
      head1: 'Edge Delivery',
      tag1: 'CloudFront CDN',
      val1: 'Cache HIT (edge)',
      sub1: 'Global distribution · Origin Access Control',
      head2: 'Serverless Discovery',
      tag2: 'API Gateway + Lambda',
      val2: '200 OK (5 objects)',
      sub2: 'Dynamic S3 ListObjectsV2 execution',
    },
  },
  'cicd-pipeline': {
    idleMessage: 'idle — click "▶ run flow preview" to simulate GitHub Actions & Playwright gating',
    successMessage: 'pipeline passed — automated Playwright gating promoted release to production',
    stageDescriptions: [
      '1/5 · Developer pushes commit to development branch',
      '2/5 · GitHub Actions syncs static build artifacts to S3 test bucket',
      '3/5 · Playwright headless browser runs automated end-to-end regression tests',
      '4/5 · Tests passed 100%: syncing release to S3 production bucket',
      '5/5 · CloudFront cache invalidation created (/*) — production site live',
    ],
    metrics: {
      head1: 'Cost & Edge Telemetry',
      tag1: 'CloudFront Free Tier',
      val1: '$0 / month',
      sub1: 'Built-in edge metrics · HTTPS encryption · no extra monitoring spend',
      head2: 'Validation & Gating',
      tag2: 'Playwright + GitHub Actions',
      val2: 'E2E tests passed (100%)',
      sub2: 'Secure S3 staging gate · production sync & cache invalidation',
    },
  },
  'standalone-website': {
    idleMessage: 'idle — click "▶ run flow preview" to simulate reverse proxy routing & loopback isolation',
    successMessage: 'secure 200 OK — reverse proxy routed request via localhost; database & API ports unexposed',
    stageDescriptions: [
      '1/7 · User queries domain: DNS resolves to stable EC2 Elastic IP',
      '2/7 · AWS Security Group permits inbound traffic exclusively on ports 80 & 443',
      '3/7 · Reverse proxy (Apache/Caddy) terminates TLS and inspects HTTP Layer 7 request path',
      '4/7 · Root (/) requests served directly from static Vite SPA document root (/var/www/demo)',
      '5/7 · API (/api/) requests proxied over loopback to internal backend at 127.0.0.1:8000',
      '6/7 · Backend queries PostgreSQL on 127.0.0.1:5432 — database port completely unexposed',
      '7/7 · Secure admin access: SSH ProxyJump routes through bastion host without public key copying',
    ],
    metrics: {
      head1: 'Attack Surface',
      tag1: 'AWS Security Group',
      val1: '2 Ports Open (80/443)',
      sub1: 'Ports 5173, 8000, 8001, 5432, 6379 strictly closed externally',
      head2: 'Routing Architecture',
      tag2: 'Caddy / Apache L7 Proxy',
      val2: '127.0.0.1 Loopback',
      sub2: 'Clean zero-public-IP coupling · automatic TLS certificate renewal',
    },
  },
  'keycloak-auth': {
    idleMessage: 'idle — click "▶ run flow preview" to simulate OAuth 2.0 token grant, RS256 verification & RBAC check',
    successMessage: 'authorized 200 OK — Keycloak issued RS256 token; Flask API verified signature against JWKS & authorized roles',
    stageDescriptions: [
      '1/7 · Client initiates OAuth 2.0 authentication flow with Keycloak (Authorization Code / Direct Grants)',
      '2/7 · Keycloak validates user credentials against PostgreSQL realm store and assigns realm roles',
      '3/7 · Keycloak signs JWT Access Token using RSA Private Key (RS256 algorithm with kid header)',
      '4/7 · Resource API fetches and caches Keycloak JSON Web Key Set (JWKS) public certificates',
      '5/7 · Client attaches Bearer token: Resource API verifies signature, issuer & audience statelessly',
      '6/7 · RBAC gate checks token claims (realm_access.roles) against endpoint requirements',
      '7/7 · Database query executed for authorized tenant data — unauthorized roles receive 403 Forbidden',
    ],
    metrics: {
      head1: 'IAM Security',
      tag1: 'RS256 Cryptography',
      val1: 'Stateless JWKS',
      sub1: 'Zero DB hits on Keycloak during API token verification',
      head2: 'Access Model',
      tag2: 'OAuth 2.0 + RBAC',
      val2: 'Role Enforced',
      sub2: 'Least-privilege isolation: Farmer, Contractor & Admin',
    },
  },
}

export function Pipeline({ project }: Props) {
  const isProgressive = project.id === 'progressive'
  const config = projectConfigs[project.id] || projectConfigs.progressive

  const [state, setState] = useState<PipelineState>('idle')
  const [stageIndex, setStageIndex] = useState(-1)
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null)
  const [runId, setRunId] = useState(0)

  // Progressive delivery specific snapshots
  const snapshots = useMemo(() => {
    if (!isProgressive) return []
    return runId % 3 === 2 ? failureSnapshots : successSnapshots
  }, [isProgressive, runId])

  useEffect(() => {
    if (!runId) return
    setState('running')
    setStageIndex(-1)
    setSnapshot(null)

    let cancelled = false
    const timers: number[] = []

    if (isProgressive) {
      snapshots.forEach((item, index) => {
        timers.push(
          window.setTimeout(() => {
            if (cancelled) return
            setStageIndex(item.stageIndex)
            setSnapshot(item)
          }, 550 * (index + 1))
        )
      })

      const finalTimer = window.setTimeout(() => {
        if (cancelled) return
        const failed = snapshots[snapshots.length - 1].errorRate > 1
        setState(failed ? 'failure' : 'success')
      }, 550 * (snapshots.length + 1))
      timers.push(finalTimer)
    } else {
      // Flow preview for all other projects
      const totalStages = project.stages.length
      project.stages.forEach((_, index) => {
        timers.push(
          window.setTimeout(() => {
            if (cancelled) return
            setStageIndex(index)
          }, 650 * (index + 1))
        )
      })

      const finalTimer = window.setTimeout(() => {
        if (cancelled) return
        setState('success')
      }, 650 * (totalStages + 1))
      timers.push(finalTimer)
    }

    return () => {
      cancelled = true
      timers.forEach(window.clearTimeout)
    }
  }, [runId, snapshots, isProgressive, project.stages])

  const run = () => setRunId((value) => value + 1)

  const stageClass = (index: number) => {
    if (state === 'failure' && isProgressive && index === stageIndex) return 'stage is-fail'
    if (index === stageIndex) return 'stage is-active'
    if (index < stageIndex) return 'stage is-done'
    return 'stage'
  }

  const currentDescription = stageIndex >= 0 && config.stageDescriptions[stageIndex]
    ? config.stageDescriptions[stageIndex]
    : null

  const statusText = state === 'idle'
    ? config.idleMessage
    : state === 'running'
      ? (currentDescription ? `running — ${currentDescription}` : `running — stage ${stageIndex + 1}/${project.stages.length}`)
      : state === 'failure'
        ? 'rollback complete — stable revision restored'
        : config.successMessage

  return (
    <div className="pipeline-panel">
      <div className="pipeline-toolbar">
        <span className="pipeline-label">
          {isProgressive ? 'CI/CD + canary flow' : `${project.title.split(' ')[0]} delivery flow preview`}
        </span>
        <button
          className={`pipeline-run ${state}`}
          type="button"
          onClick={run}
        >
          {state === 'idle' ? '▶ run flow preview' : state === 'running' ? '⏳ executing flow...' : '↻ re-run preview'}
        </button>
      </div>

      <div className="pipeline-canvas">
        <div className="pipeline-row">
          {project.stages.map((stage, index) => (
            <div className="stage-wrap" key={stage.id}>
              <div className={stageClass(index)}>
                <div className="stage-node">{stage.short}</div>
                <div className="stage-name">{stage.name}</div>
                <div className="stage-detail">{stage.detail}</div>
              </div>
              {index < project.stages.length - 1 && (
                <div className={`connector ${index < stageIndex ? 'lit' : ''}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progressive delivery canary telemetry */}
      {isProgressive && (
        <div className="canary-grid">
          <div className="metric-card">
            <div className="metric-head"><span>traffic split</span><span>Istio</span></div>
            <div className="traffic-bar">
              <div className="traffic-stable" style={{ width: `${100 - (snapshot?.traffic ?? 0)}%` }} />
              <div className="traffic-canary" style={{ width: `${snapshot?.traffic ?? 0}%` }} />
            </div>
            <div className="traffic-legend"><span>stable {100 - (snapshot?.traffic ?? 0)}%</span><span>canary {snapshot?.traffic ?? 0}%</span></div>
          </div>
          <div className="metric-card">
            <div className="metric-head"><span>analysis</span><span>Prometheus → Flagger</span></div>
            <div className="metric-value">{snapshot ? `${snapshot.errorRate.toFixed(1)}%` : '—'}</div>
            <div className="metric-sub">error rate · latency {snapshot ? `${snapshot.latency}ms` : '—'} · {snapshot?.requests ?? '—'} req/min</div>
          </div>
        </div>
      )}

      {/* Architecture-specific telemetry for all other projects */}
      {!isProgressive && config.metrics && (
        <div className="canary-grid">
          <div className="metric-card">
            <div className="metric-head"><span>{config.metrics.head1}</span><span>{config.metrics.tag1}</span></div>
            <div className="metric-value" style={{ color: state === 'success' ? 'var(--teal)' : 'var(--text)' }}>
              {state === 'idle' ? '—' : config.metrics.val1}
            </div>
            <div className="metric-sub">{config.metrics.sub1}</div>
          </div>
          <div className="metric-card">
            <div className="metric-head"><span>{config.metrics.head2}</span><span>{config.metrics.tag2}</span></div>
            <div className="metric-value" style={{ color: state === 'success' ? 'var(--teal)' : 'var(--text)' }}>
              {state === 'idle' ? '—' : config.metrics.val2}
            </div>
            <div className="metric-sub">{config.metrics.sub2}</div>
          </div>
        </div>
      )}

      <div className={`pipeline-status ${state === 'success' ? 'ok' : state === 'failure' ? 'fail' : ''}`}>
        <span className="pipeline-bullet" />
        <span>{statusText}</span>
      </div>
    </div>
  )
}
