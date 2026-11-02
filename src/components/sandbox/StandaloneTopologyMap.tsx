import React, { useState } from 'react'

export type ArchPattern = 'naive' | 'proxy' | 'alb' | 'containers'
export type SimTrafficType = 'all' | 'static' | 'api' | 'farm' | 'db-attack' | 'api-attack' | 'ssh-bastion'

interface StandaloneTopologyMapProps {
  archMode: ArchPattern
  selectedTraffic: SimTrafficType
  onSelectTraffic: (type: SimTrafficType) => void
  onSelectArchMode?: (mode: ArchPattern) => void
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

export function StandaloneTopologyMap({
  archMode,
  selectedTraffic,
  onSelectTraffic,
  onSelectArchMode,
}: StandaloneTopologyMapProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // -------------------------------------------------------------
  // PATH DEFINITIONS FOR 1. DIRECT EXPOSURE (NAIVE ANTI-PATTERN)
  // -------------------------------------------------------------
  const isNaiveAll = selectedTraffic === 'all'
  const isNaiveStatic = isNaiveAll || selectedTraffic === 'static'
  const isNaiveApi = isNaiveAll || selectedTraffic === 'api' || selectedTraffic === 'api-attack'
  const isNaiveFarm = isNaiveAll || selectedTraffic === 'farm'
  const isNaiveDb = isNaiveAll || selectedTraffic === 'db-attack'
  const isNaiveSsh = isNaiveAll || selectedTraffic === 'ssh-bastion'

  const naivePaths: PathDef[] = [
    {
      id: 'naive-vite',
      d: 'M 150 110 L 460 110',
      label: 'Direct HTTP :5173 (Vite Dev)',
      labelX: 290,
      labelY: 95,
      color: '#ff5d5d',
      packetColor: '#ff5d5d',
      dur: '1.6s',
      delay: '0s',
      active: isNaiveStatic,
    },
    {
      id: 'naive-api',
      d: 'M 150 190 L 460 190',
      label: 'Direct HTTP :8000 (FastAPI)',
      labelX: 290,
      labelY: 175,
      color: '#ff5d5d',
      packetColor: '#ff5d5d',
      dur: '1.8s',
      delay: '0.4s',
      active: isNaiveApi,
    },
    {
      id: 'naive-farm',
      d: 'M 150 220 L 460 220',
      label: 'Direct HTTP :8001 (Service 2)',
      labelX: 290,
      labelY: 205,
      color: '#ff5d5d',
      packetColor: '#ff5d5d',
      dur: '1.8s',
      delay: '0.6s',
      active: isNaiveFarm,
    },
    {
      id: 'naive-db-attack',
      d: 'M 150 280 L 720 280',
      label: 'CRITICAL: Port 5432 Exposed to Internet!',
      labelX: 380,
      labelY: 265,
      color: '#ff5d5d',
      packetColor: '#ff5d5d',
      dur: '2.0s',
      delay: '0.2s',
      active: isNaiveDb,
    },
    {
      id: 'naive-ssh',
      d: 'M 150 440 L 460 440',
      label: 'SSH :22 Open to 0.0.0.0/0',
      labelX: 290,
      labelY: 425,
      color: '#ff5d5d',
      packetColor: '#ff5d5d',
      dur: '1.8s',
      delay: '0.8s',
      active: isNaiveSsh,
    },
  ]

  // -------------------------------------------------------------
  // PATH DEFINITIONS FOR 2. REVERSE PROXY (CURRENT RECOMMENDED)
  // -------------------------------------------------------------
  const isAll = selectedTraffic === 'all'
  const isStatic = isAll || selectedTraffic === 'static'
  const isApi = isAll || selectedTraffic === 'api'
  const isFarm = isAll || selectedTraffic === 'farm'
  const isDbAttack = isAll || selectedTraffic === 'db-attack'
  const isApiAttack = isAll || selectedTraffic === 'api-attack'
  const isSsh = isAll || selectedTraffic === 'ssh-bastion'

  const proxyPaths: PathDef[] = [
    {
      id: 'client-to-dns',
      d: 'M 150 120 L 180 120',
      label: 'HTTPS :443',
      labelX: 165,
      labelY: 105,
      color: '#4fd1c5',
      packetColor: '#4fd1c5',
      dur: '1.4s',
      delay: '0s',
      active: isStatic || isApi || isFarm,
    },
    {
      id: 'dns-to-proxy',
      d: 'M 300 120 L 430 120',
      label: 'SG: ALLOW (443)',
      labelX: 365,
      labelY: 102,
      color: '#4fd1c5',
      packetColor: '#4fd1c5',
      dur: '1.8s',
      delay: '0.3s',
      active: isStatic || isApi || isFarm,
    },
    {
      id: 'proxy-to-static',
      d: 'M 560 120 C 600 120, 615 135, 645 135',
      label: 'file_server (Root /)',
      labelX: 602,
      labelY: 115,
      color: '#4fd1c5',
      packetColor: '#4fd1c5',
      dur: '1.6s',
      delay: '0.6s',
      active: isStatic,
    },
    {
      id: 'proxy-to-api1',
      d: 'M 560 135 C 595 135, 610 215, 645 215',
      label: 'ProxyPass /api/ → lo:8000',
      labelX: 600,
      labelY: 175,
      color: '#a78bfa',
      packetColor: '#a78bfa',
      dur: '1.8s',
      delay: '0.6s',
      active: isApi,
    },
    {
      id: 'api1-to-db',
      d: 'M 810 248 C 840 280, 840 330, 810 360',
      label: 'SQL 127.0.0.1:5432',
      labelX: 865,
      labelY: 305,
      color: '#38bdf8',
      packetColor: '#38bdf8',
      dur: '2.0s',
      delay: '1.1s',
      active: isApi,
    },
    {
      id: 'proxy-to-api2',
      d: 'M 560 150 C 585 150, 605 295, 645 300',
      label: 'ProxyPass /farm/ → lo:8001',
      labelX: 600,
      labelY: 255,
      color: '#e8a33d',
      packetColor: '#e8a33d',
      dur: '2.0s',
      delay: '0.6s',
      active: isFarm,
    },
    {
      id: 'attack-to-db',
      d: 'M 150 280 L 348 280',
      label: 'TCP SYN :5432 ➔ [DROP]',
      labelX: 250,
      labelY: 265,
      color: '#ff5d5d',
      packetColor: '#ff5d5d',
      dur: '1.2s',
      delay: '0s',
      active: isDbAttack,
      isBlocked: true,
    },
    {
      id: 'attack-to-api',
      d: 'M 150 280 C 220 280, 270 230, 348 230',
      label: 'GET :8000 ➔ [DROP]',
      labelX: 255,
      labelY: 220,
      color: '#ff5d5d',
      packetColor: '#ff5d5d',
      dur: '1.3s',
      delay: '0.4s',
      active: isApiAttack,
      isBlocked: true,
    },
    {
      id: 'admin-to-bastion',
      d: 'M 150 460 L 180 460',
      label: 'SSH :22 (Admin IP/32)',
      labelX: 165,
      labelY: 445,
      color: '#38bdf8',
      packetColor: '#38bdf8',
      dur: '1.5s',
      delay: '0s',
      active: isSsh,
    },
    {
      id: 'bastion-to-web-ssh',
      d: 'M 300 460 L 430 460',
      label: 'ProxyJump (Private IP 10.0.1.15)',
      labelX: 365,
      labelY: 445,
      color: '#38bdf8',
      packetColor: '#38bdf8',
      dur: '1.8s',
      delay: '0.5s',
      active: isSsh,
    },
  ]

  // -------------------------------------------------------------
  // PATH DEFINITIONS FOR 3. MULTI-EC2 ALB (STAGE 2 HIGH AVAILABILITY)
  // -------------------------------------------------------------
  const isAlbAll = selectedTraffic === 'all'
  const isAlbStatic = isAlbAll || selectedTraffic === 'static'
  const isAlbApi = isAlbAll || selectedTraffic === 'api'
  const isAlbFarm = isAlbAll || selectedTraffic === 'farm'
  const isAlbDb = isAlbAll || selectedTraffic === 'db-attack'
  const isAlbFailover = selectedTraffic === 'api-attack'
  const isAlbSsh = isAlbAll || selectedTraffic === 'ssh-bastion'

  const albPaths: PathDef[] = [
    {
      id: 'alb-client-dns',
      d: 'M 140 260 L 175 260',
      label: 'Route 53 DNS',
      labelX: 158,
      labelY: 242,
      color: '#4fd1c5',
      packetColor: '#4fd1c5',
      dur: '1.4s',
      delay: '0s',
      active: !isAlbSsh,
    },
    {
      id: 'alb-dns-alb',
      d: 'M 295 260 L 335 260',
      label: 'HTTPS :443 (ACM Cert)',
      labelX: 315,
      labelY: 242,
      color: '#4fd1c5',
      packetColor: '#4fd1c5',
      dur: '1.6s',
      delay: '0.3s',
      active: !isAlbSsh,
    },
    {
      id: 'alb-to-ec2-1',
      d: 'M 455 235 C 490 235, 510 160, 545 160',
      label: isAlbFailover ? '⚠️ AZ-1a DEGRADED (Drained)' : '50% Load ➔ AZ-1a (10.0.1.15)',
      labelX: 495,
      labelY: 175,
      color: isAlbFailover ? '#ff5d5d' : '#4fd1c5',
      packetColor: isAlbFailover ? '#ff5d5d' : '#4fd1c5',
      dur: '1.8s',
      delay: '0.6s',
      active: (isAlbStatic || isAlbFarm || (isAlbAll && !isAlbFailover)) && !isAlbSsh,
    },
    {
      id: 'alb-to-ec2-2',
      d: 'M 455 285 C 490 285, 510 360, 545 360',
      label: isAlbFailover ? '100% Failover ➔ AZ-1b (Healthy)' : '50% Load ➔ AZ-1b (10.0.2.28)',
      labelX: 495,
      labelY: 345,
      color: '#e8a33d',
      packetColor: '#e8a33d',
      dur: '1.8s',
      delay: '0.9s',
      active: (isAlbApi || isAlbAll || isAlbFailover) && !isAlbSsh,
    },
    {
      id: 'ec2-1-to-rds',
      d: 'M 745 160 C 770 160, 785 240, 810 240',
      label: 'SQL :5432 (Primary)',
      labelX: 778,
      labelY: 185,
      color: '#38bdf8',
      packetColor: '#38bdf8',
      dur: '2.0s',
      delay: '1.2s',
      active: (isAlbStatic || (isAlbAll && !isAlbFailover) || isAlbDb) && !isAlbSsh,
    },
    {
      id: 'ec2-2-to-rds',
      d: 'M 745 360 C 770 360, 785 280, 810 280',
      label: isAlbFailover ? 'Emergency SQL Ingress' : 'SQL :5432 (Replica Sync)',
      labelX: 778,
      labelY: 335,
      color: '#38bdf8',
      packetColor: '#38bdf8',
      dur: '2.0s',
      delay: '1.4s',
      active: (isAlbApi || isAlbAll || isAlbFailover || isAlbDb) && !isAlbSsh,
    },
  ]

  // -------------------------------------------------------------
  // PATH DEFINITIONS FOR 4. DOCKER / ECS FARGATE BEHIND ALB (CONTAINERS)
  // -------------------------------------------------------------
  const isContAll = selectedTraffic === 'all'
  const isContStatic = isContAll || selectedTraffic === 'static'
  const isContApi = isContAll || selectedTraffic === 'api'
  const isContFarm = isContAll || selectedTraffic === 'farm'
  const isContDb = isContAll || selectedTraffic === 'db-attack'
  const isContScale = selectedTraffic === 'api-attack'
  const isContSsh = isContAll || selectedTraffic === 'ssh-bastion'

  const containerPaths: PathDef[] = [
    {
      id: 'cont-client-dns',
      d: 'M 140 260 L 175 260',
      label: 'Route 53 DNS',
      labelX: 158,
      labelY: 242,
      color: '#4fd1c5',
      packetColor: '#4fd1c5',
      dur: '1.4s',
      delay: '0s',
      active: !isContSsh,
    },
    {
      id: 'cont-dns-alb',
      d: 'M 295 260 L 335 260',
      label: 'HTTPS :443 (ACM Cert)',
      labelX: 315,
      labelY: 242,
      color: '#4fd1c5',
      packetColor: '#4fd1c5',
      dur: '1.6s',
      delay: '0.3s',
      active: !isContSsh,
    },
    {
      id: 'cont-alb-task-1',
      d: 'M 455 230 C 490 230, 510 145, 545 145',
      label: 'TG /api/* ➔ Container Task A',
      labelX: 500,
      labelY: 165,
      color: '#a78bfa',
      packetColor: '#a78bfa',
      dur: '1.8s',
      delay: '0.6s',
      active: (isContApi || isContAll || isContStatic) && !isContSsh,
    },
    {
      id: 'cont-alb-task-2',
      d: 'M 455 260 L 545 260',
      label: isContScale ? '⚡ Autoscaled Task (+18s)' : 'TG /api/* ➔ Container Task B',
      labelX: 500,
      labelY: 245,
      color: isContScale ? '#38bdf8' : '#a78bfa',
      packetColor: isContScale ? '#38bdf8' : '#a78bfa',
      dur: '1.8s',
      delay: '0.9s',
      active: (isContApi || isContAll || isContScale) && !isContSsh,
    },
    {
      id: 'cont-alb-task-3',
      d: 'M 455 290 C 490 290, 510 375, 545 375',
      label: 'TG /farm/* ➔ Container Task C',
      labelX: 500,
      labelY: 355,
      color: '#e8a33d',
      packetColor: '#e8a33d',
      dur: '1.8s',
      delay: '1.2s',
      active: (isContFarm || isContAll) && !isContSsh,
    },
    {
      id: 'cont-task1-rds',
      d: 'M 745 145 C 770 145, 785 240, 810 240',
      label: 'RDS Proxy Pool (5 conns)',
      labelX: 778,
      labelY: 180,
      color: '#38bdf8',
      packetColor: '#38bdf8',
      dur: '2.0s',
      delay: '1.4s',
      active: (isContApi || isContAll || isContDb) && !isContSsh,
    },
    {
      id: 'cont-task2-rds',
      d: 'M 745 260 L 810 260',
      label: 'RDS Proxy Pool (5 conns)',
      labelX: 778,
      labelY: 275,
      color: '#38bdf8',
      packetColor: '#38bdf8',
      dur: '2.0s',
      delay: '1.6s',
      active: (isContApi || isContAll || isContScale || isContDb) && !isContSsh,
    },
  ]

  const activePaths =
    archMode === 'containers'
      ? containerPaths.filter((p) => p.active)
      : archMode === 'alb'
        ? albPaths.filter((p) => p.active)
        : archMode === 'naive'
          ? naivePaths.filter((p) => p.active)
          : proxyPaths.filter((p) => p.active)

  return (
    <div className="gallery-live-map" style={{ marginTop: '0' }}>
      {/* Header bar with mode status and legend */}
      <div className="gallery-live-map-head" style={{ alignItems: 'flex-start' }}>
        <div>
          <span className="control-label">
            {archMode === 'naive' && 'STAGE 0 · ANTI-PATTERN'}
            {archMode === 'proxy' && 'STAGE 1 · REVERSE PROXY LAB (ACTIVE)'}
            {archMode === 'alb' && 'STAGE 2 · MULTI-INSTANCE AWS ALB EVOLUTION'}
            {archMode === 'containers' && 'STAGE 3 · CONTAINERIZED DOCKER / ECS FARGATE BEHIND ALB (FUTURE SCALE)'}
          </span>
          <strong style={{ fontSize: '15px' }}>
            {archMode === 'naive' && '⚠️ Direct Multi-Port Exposure Architecture (All Ports Exposed)'}
            {archMode === 'proxy' && '🔒 Single EC2 Instance Reverse Proxy with Loopback Isolation'}
            {archMode === 'alb' && '🌐 Multi-AZ AWS Application Load Balancer + Auto Scaling + Multi-AZ RDS'}
            {archMode === 'containers' && '🐳 Docker Containers (AWS ECS / Fargate) Behind Application Load Balancer'}
          </strong>
          <p>
            {archMode === 'naive' && 'Every service port (5173, 8000, 8001, 5432, 22) is opened directly to the public internet. Port scanners penetrate straight into PostgreSQL, and public IP coupling breaks upon restart.'}
            {archMode === 'proxy' && 'A single entry point (80/443) accepts traffic. Apache/Caddy routes on Layer 7 while all internal sockets bind strictly to 127.0.0.1 loopback. Direct attack probes are deflected at the AWS Security Group.'}
            {archMode === 'alb' && 'Traffic scales across multi-AZ availability zones. An AWS ALB distributes requests between redundant EC2 instances in private subnets, backed by a synchronous Multi-AZ RDS PostgreSQL database.'}
            {archMode === 'containers' && 'As demand rises, full virtual machines are replaced with lightweight Docker container tasks running on serverless AWS Fargate. ALB path routing directs requests to isolated task definitions with sub-minute auto-scaling, granular CPU/memory bin-packing, and zero idle VM costs.'}
          </p>
        </div>

        <div className="gallery-flow-legend" style={{ gap: '14px', marginTop: '4px' }}>
          {archMode === 'containers' ? (
            <>
              <span><i className="legend-dot" style={{ background: '#a78bfa', boxShadow: '0 0 9px rgba(167,139,250,0.5)' }} /> ALB ➔ FastAPI Tasks (:8000)</span>
              <span><i className="legend-dot amber" /> ALB ➔ Microservice Tasks (:8001)</span>
              <span><i className="legend-dot teal" /> ECS Auto-scaling Tasks</span>
              <span><i className="legend-dot" style={{ background: '#38bdf8', boxShadow: '0 0 9px rgba(56,189,248,0.5)' }} /> RDS Proxy Connection Pool</span>
            </>
          ) : archMode === 'alb' ? (
            <>
              <span><i className="legend-dot teal" /> ALB ➔ EC2 Instance 1 (AZ-1a)</span>
              <span><i className="legend-dot amber" /> ALB ➔ EC2 Instance 2 (AZ-1b)</span>
              <span><i className="legend-dot" style={{ background: '#38bdf8', boxShadow: '0 0 9px rgba(56,189,248,0.5)' }} /> Multi-AZ RDS Replication</span>
            </>
          ) : archMode === 'naive' ? (
            <>
              <span><i className="legend-dot" style={{ background: '#ff5d5d', boxShadow: '0 0 9px rgba(255,93,93,0.5)' }} /> Direct Public Exposure (:5173, :8000, :5432)</span>
              <span><i className="legend-dot" style={{ background: '#ff5d5d', boxShadow: '0 0 9px rgba(255,93,93,0.5)' }} /> Database Penetrated Directly</span>
            </>
          ) : (
            <>
              <span><i className="legend-dot teal" /> Web Ingress / Static SPA (443)</span>
              <span><i className="legend-dot" style={{ background: '#a78bfa', boxShadow: '0 0 9px rgba(167,139,250,0.5)' }} /> API Proxy (8000)</span>
              <span><i className="legend-dot amber" /> Service 2 Proxy (8001)</span>
              <span><i className="legend-dot" style={{ background: '#38bdf8', boxShadow: '0 0 9px rgba(56,189,248,0.5)' }} /> Localhost DB / SSH</span>
              <span><i className="legend-dot" style={{ background: '#ff5d5d', boxShadow: '0 0 9px rgba(255,93,93,0.5)' }} /> Blocked Probe [DROP]</span>
            </>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="gallery-live-map-canvas" style={{ minHeight: '560px', position: 'relative' }}>
        <div className="gallery-grid-overlay" />

        <svg
          className="gallery-flow-svg"
          viewBox="0 0 1020 550"
          role="img"
          aria-label="AWS Architecture Topology"
        >
          <defs>
            <filter id="topo-glow" x="-50%" y="-50%" width="200%" height="200%">
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

          {/* ========================================================================= */}
          {/* ARCHITECTURE MODE 3: MULTI-EC2 ALB TOPOLOGY                               */}
          {/* ========================================================================= */}
          {archMode === 'alb' && (
            <g>
              {/* VPC OUTLINE */}
              <rect
                x="280"
                y="35"
                width="725"
                height="490"
                rx="14"
                fill="rgba(11, 17, 26, 0.94)"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
              <text x="300" y="58" fontSize="9.5" fontWeight="800" fill="#38bdf8" letterSpacing="1" fontFamily="var(--mono)">
                AWS VPC (10.0.0.0/16) · MULTI-AZ APPLICATION LOAD BALANCER INFRASTRUCTURE
              </text>

              {/* PUBLIC SUBNET (ALB) */}
              <rect
                x="300"
                y="75"
                width="200"
                height="430"
                rx="10"
                fill="rgba(79, 209, 197, 0.03)"
                stroke="rgba(79, 209, 197, 0.25)"
                strokeDasharray="4 4"
              />
              <text x="315" y="95" fontSize="8.5" fontWeight="700" fill="#4fd1c5" fontFamily="var(--mono)">
                PUBLIC SUBNET (ALB)
              </text>

              {/* PRIVATE APP SUBNETS (EC2 ASG) */}
              <rect
                x="525"
                y="75"
                width="240"
                height="430"
                rx="10"
                fill="rgba(232, 163, 61, 0.03)"
                stroke="rgba(232, 163, 61, 0.25)"
                strokeDasharray="4 4"
              />
              <text x="540" y="95" fontSize="8.5" fontWeight="700" fill="#e8a33d" fontFamily="var(--mono)">
                PRIVATE APP SUBNETS (AUTO SCALING)
              </text>

              {/* PRIVATE DB SUBNET (RDS MULTI-AZ) */}
              <rect
                x="785"
                y="75"
                width="205"
                height="430"
                rx="10"
                fill="rgba(56, 189, 248, 0.03)"
                stroke="rgba(56, 189, 248, 0.25)"
                strokeDasharray="4 4"
              />
              <text x="800" y="95" fontSize="8.5" fontWeight="700" fill="#38bdf8" fontFamily="var(--mono)">
                PRIVATE DB SUBNET (MULTI-AZ)
              </text>

              {/* NODE: Public Web Client */}
              <g className="topo-interactive-node">
                <rect x="25" y="220" width="115" height="80" rx="8" fill="rgba(14, 22, 32, 0.95)" stroke="#4fd1c5" strokeWidth="2" />
                <rect x="35" y="230" width="50" height="14" rx="3" fill="rgba(79, 209, 197, 0.12)" />
                <text x="60" y="240" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#4fd1c5" fontFamily="var(--mono)">CLIENTS</text>
                <text x="125" y="244" textAnchor="end" fontSize="14">🌐</text>
                <text x="35" y="265" fontSize="11" fontWeight="700" fill="#edf2f7">Global Traffic</text>
                <text x="35" y="280" fontSize="8" fill="#93a0b1" fontFamily="var(--mono)">HTTPS Users</text>
              </g>

              {/* NODE: Route 53 DNS */}
              <g className="topo-interactive-node">
                <rect x="175" y="220" width="120" height="80" rx="8" fill="rgba(14, 22, 32, 0.95)" stroke="#4fd1c5" strokeWidth="2" />
                <rect x="185" y="230" width="60" height="14" rx="3" fill="rgba(79, 209, 197, 0.12)" />
                <text x="215" y="240" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#4fd1c5" fontFamily="var(--mono)">ROUTE 53</text>
                <text x="280" y="244" textAnchor="end" fontSize="14">🌍</text>
                <text x="185" y="265" fontSize="11" fontWeight="700" fill="#edf2f7">DNS Alias</text>
                <text x="185" y="280" fontSize="8" fill="#93a0b1" fontFamily="var(--mono)">Points to ALB</text>
              </g>

              {/* NODE: Application Load Balancer */}
              <g className="topo-interactive-node">
                <rect x="335" y="205" width="130" height="110" rx="8" fill="rgba(15, 25, 36, 0.98)" stroke="#4fd1c5" strokeWidth="2" />
                <rect x="345" y="215" width="70" height="15" rx="3" fill="rgba(79, 209, 197, 0.15)" />
                <text x="380" y="226" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#4fd1c5" fontFamily="var(--mono)">AWS ALB (L7)</text>
                <text x="450" y="229" textAnchor="end" fontSize="14">⚖️</text>
                <text x="345" y="250" fontSize="11" fontWeight="700" fill="#edf2f7">App Load Balancer</text>
                <text x="345" y="266" fontSize="8" fill="#5cdbd3" fontFamily="var(--mono)">ACM TLSv1.3 Termination</text>
                <text x="345" y="280" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">Health Checked TG</text>
                <text x="345" y="294" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">Cross-Zone Balanced</text>
              </g>

              {/* NODE: EC2 Instance 1 (AZ-1a) */}
              <g className="topo-interactive-node">
                <rect x="545" y="115" width="200" height="95" rx="8" fill="rgba(16, 24, 34, 0.95)" stroke="#4fd1c5" strokeWidth="2" />
                <rect x="555" y="125" width="85" height="15" rx="3" fill="rgba(79, 209, 197, 0.12)" />
                <text x="597" y="136" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#4fd1c5" fontFamily="var(--mono)">EC2 INSTANCE 1</text>
                <text x="730" y="139" textAnchor="end" fontSize="14">🖥️</text>
                <text x="555" y="160" fontSize="11" fontWeight="700" fill="#edf2f7">Web / App Worker A</text>
                <text x="555" y="176" fontSize="8" fill="#5cdbd3" fontFamily="var(--mono)">Subnet 10.0.1.15 · AZ-1a</text>
                <text x="555" y="190" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">Target Group Port 8000</text>
              </g>

              {/* NODE: EC2 Instance 2 (AZ-1b) */}
              <g className="topo-interactive-node">
                <rect x="545" y="315" width="200" height="95" rx="8" fill="rgba(16, 24, 34, 0.95)" stroke="#e8a33d" strokeWidth="2" />
                <rect x="555" y="325" width="85" height="15" rx="3" fill="rgba(232, 163, 61, 0.15)" />
                <text x="597" y="336" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#e8a33d" fontFamily="var(--mono)">EC2 INSTANCE 2</text>
                <text x="730" y="339" textAnchor="end" fontSize="14">🖥️</text>
                <text x="555" y="360" fontSize="11" fontWeight="700" fill="#edf2f7">Web / App Worker B</text>
                <text x="555" y="376" fontSize="8" fill="#ffc069" fontFamily="var(--mono)">Subnet 10.0.2.28 · AZ-1b</text>
                <text x="555" y="390" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">Redundant Failover Node</text>
              </g>

              {/* NODE: Multi-AZ RDS PostgreSQL */}
              <g className="topo-interactive-node">
                <rect x="805" y="200" width="170" height="120" rx="8" fill="rgba(16, 24, 34, 0.98)" stroke="#38bdf8" strokeWidth="2" />
                <rect x="815" y="210" width="80" height="15" rx="3" fill="rgba(56, 189, 248, 0.15)" />
                <text x="855" y="221" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#38bdf8" fontFamily="var(--mono)">RDS MULTI-AZ</text>
                <text x="960" y="224" textAnchor="end" fontSize="14">🗄️</text>
                <text x="815" y="245" fontSize="11" fontWeight="700" fill="#edf2f7">PostgreSQL RDS</text>
                <text x="815" y="262" fontSize="8" fill="#7dd3fc" fontFamily="var(--mono)">Primary AZ-1a (Active)</text>
                <text x="815" y="276" fontSize="8" fill="#5d6878" fontFamily="var(--mono)">Standby AZ-1b (Sync)</text>
                <text x="815" y="295" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">Zero Public IP / Secure</text>
              </g>
            </g>
          )}

          {/* ========================================================================= */}
          {/* ARCHITECTURE MODE 4: DOCKER CONTAINERS & ECS FARGATE BEHIND ALB           */}
          {/* ========================================================================= */}
          {archMode === 'containers' && (
            <g>
              {/* VPC OUTLINE */}
              <rect
                x="280"
                y="35"
                width="725"
                height="490"
                rx="14"
                fill="rgba(11, 17, 26, 0.94)"
                stroke="#a78bfa"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
              <text x="300" y="58" fontSize="9.5" fontWeight="800" fill="#a78bfa" letterSpacing="1" fontFamily="var(--mono)">
                AWS VPC · STAGE 3: CONTAINERIZED DOCKER MICROSERVICES BEHIND APPLICATION LOAD BALANCER
              </text>

              {/* PUBLIC SUBNET (ALB) */}
              <rect
                x="300"
                y="75"
                width="200"
                height="430"
                rx="10"
                fill="rgba(79, 209, 197, 0.03)"
                stroke="rgba(79, 209, 197, 0.25)"
                strokeDasharray="4 4"
              />
              <text x="315" y="95" fontSize="8.5" fontWeight="700" fill="#4fd1c5" fontFamily="var(--mono)">
                PUBLIC SUBNET (ALB L7)
              </text>

              {/* PRIVATE ECS CLUSTER SUBNET (FARGATE CONTAINER TASKS) */}
              <rect
                x="525"
                y="75"
                width="240"
                height="430"
                rx="10"
                fill="rgba(167, 139, 250, 0.04)"
                stroke="rgba(167, 139, 250, 0.3)"
                strokeDasharray="4 4"
              />
              <text x="540" y="95" fontSize="8.5" fontWeight="700" fill="#a78bfa" fontFamily="var(--mono)">
                ECS CLUSTER · DOCKER FARGATE
              </text>
              <text x="750" y="95" textAnchor="end" fontSize="7.5" fill="#5cdbd3" fontFamily="var(--mono)">
                ⚡ AUTO-SCALE: 2 ➔ 20 TASKS
              </text>

              {/* PRIVATE DB SUBNET (RDS PROXY + MULTI-AZ) */}
              <rect
                x="785"
                y="75"
                width="205"
                height="430"
                rx="10"
                fill="rgba(56, 189, 248, 0.03)"
                stroke="rgba(56, 189, 248, 0.25)"
                strokeDasharray="4 4"
              />
              <text x="800" y="95" fontSize="8.5" fontWeight="700" fill="#38bdf8" fontFamily="var(--mono)">
                RDS PROXY + MULTI-AZ
              </text>

              {/* NODE: Public Web Client */}
              <g className="topo-interactive-node">
                <rect x="25" y="220" width="115" height="80" rx="8" fill="rgba(14, 22, 32, 0.95)" stroke="#4fd1c5" strokeWidth="2" />
                <rect x="35" y="230" width="50" height="14" rx="3" fill="rgba(79, 209, 197, 0.12)" />
                <text x="60" y="240" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#4fd1c5" fontFamily="var(--mono)">CLIENTS</text>
                <text x="125" y="244" textAnchor="end" fontSize="14">🌐</text>
                <text x="35" y="265" fontSize="11" fontWeight="700" fill="#edf2f7">Global Traffic</text>
                <text x="35" y="280" fontSize="8" fill="#93a0b1" fontFamily="var(--mono)">HTTPS Users</text>
              </g>

              {/* NODE: Route 53 DNS */}
              <g className="topo-interactive-node">
                <rect x="175" y="220" width="120" height="80" rx="8" fill="rgba(14, 22, 32, 0.95)" stroke="#4fd1c5" strokeWidth="2" />
                <rect x="185" y="230" width="60" height="14" rx="3" fill="rgba(79, 209, 197, 0.12)" />
                <text x="215" y="240" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#4fd1c5" fontFamily="var(--mono)">ROUTE 53</text>
                <text x="280" y="244" textAnchor="end" fontSize="14">🌍</text>
                <text x="185" y="265" fontSize="11" fontWeight="700" fill="#edf2f7">DNS Alias</text>
                <text x="185" y="280" fontSize="8" fill="#93a0b1" fontFamily="var(--mono)">Points to ALB</text>
              </g>

              {/* NODE: Application Load Balancer */}
              <g className="topo-interactive-node">
                <rect x="335" y="200" width="130" height="120" rx="8" fill="rgba(15, 25, 36, 0.98)" stroke="#a78bfa" strokeWidth="2" />
                <rect x="345" y="210" width="70" height="15" rx="3" fill="rgba(167, 139, 250, 0.15)" />
                <text x="380" y="221" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#a78bfa" fontFamily="var(--mono)">AWS ALB (L7)</text>
                <text x="450" y="224" textAnchor="end" fontSize="14">⚖️</text>
                <text x="345" y="245" fontSize="11" fontWeight="700" fill="#edf2f7">App Load Balancer</text>
                <text x="345" y="260" fontSize="8" fill="#c4b5fd" fontFamily="var(--mono)">Path-Based Routing:</text>
                <text x="345" y="274" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">/api/* ➔ TG API Tasks</text>
                <text x="345" y="288" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">/farm/* ➔ TG Farm Tasks</text>
                <text x="345" y="302" fontSize="7.5" fill="#5cdbd3" fontFamily="var(--mono)">/ ➔ S3 / CloudFront</text>
              </g>

              {/* DOCKER CONTAINER TASK 1: FastAPI (AZ-1a) */}
              <g className="topo-interactive-node">
                <rect x="545" y="105" width="200" height="80" rx="8" fill="rgba(24, 18, 38, 0.95)" stroke="#a78bfa" strokeWidth="2" />
                <rect x="555" y="115" width="95" height="14" rx="3" fill="rgba(167, 139, 250, 0.2)" />
                <text x="602" y="125" textAnchor="middle" fontSize="7" fontWeight="700" fill="#a78bfa" fontFamily="var(--mono)">DOCKER · ECS TASK A</text>
                <text x="730" y="128" textAnchor="end" fontSize="12">🐳</text>
                <text x="555" y="145" fontSize="10.5" fontWeight="700" fill="#edf2f7">fastapi-backend:v2.1</text>
                <text x="555" y="160" fontSize="7.5" fill="#c4b5fd" fontFamily="var(--mono)">0.5 vCPU · 1GB RAM · Port 8000</text>
                <text x="555" y="173" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">AZ-1a · awsvpc ENI 10.0.1.45</text>
              </g>

              {/* DOCKER CONTAINER TASK 2: FastAPI (AZ-1b) */}
              <g className="topo-interactive-node">
                <rect x="545" y="220" width="200" height="80" rx="8" fill="rgba(24, 18, 38, 0.95)" stroke="#a78bfa" strokeWidth="2" />
                <rect x="555" y="230" width="95" height="14" rx="3" fill="rgba(167, 139, 250, 0.2)" />
                <text x="602" y="240" textAnchor="middle" fontSize="7" fontWeight="700" fill="#a78bfa" fontFamily="var(--mono)">DOCKER · ECS TASK B</text>
                <text x="730" y="243" textAnchor="end" fontSize="12">🐳</text>
                <text x="555" y="260" fontSize="10.5" fontWeight="700" fill="#edf2f7">fastapi-backend:v2.1</text>
                <text x="555" y="275" fontSize="7.5" fill="#c4b5fd" fontFamily="var(--mono)">0.5 vCPU · 1GB RAM · Port 8000</text>
                <text x="555" y="288" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">AZ-1b · awsvpc ENI 10.0.2.62</text>
              </g>

              {/* DOCKER CONTAINER TASK 3: Secondary Microservice (AZ-1a) */}
              <g className="topo-interactive-node">
                <rect x="545" y="335" width="200" height="80" rx="8" fill="rgba(34, 25, 20, 0.95)" stroke="#e8a33d" strokeWidth="2" />
                <rect x="555" y="345" width="95" height="14" rx="3" fill="rgba(232, 163, 61, 0.2)" />
                <text x="602" y="355" textAnchor="middle" fontSize="7" fontWeight="700" fill="#e8a33d" fontFamily="var(--mono)">DOCKER · ECS TASK C</text>
                <text x="730" y="358" textAnchor="end" fontSize="12">📦</text>
                <text x="555" y="375" fontSize="10.5" fontWeight="700" fill="#edf2f7">microservice-farm:v1.4</text>
                <text x="555" y="390" fontSize="7.5" fill="#ffc069" fontFamily="var(--mono)">0.25 vCPU · 512MB · Port 8001</text>
                <text x="555" y="403" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">AZ-1a · Path /farm/* routed</text>
              </g>

              {/* NODE: Amazon RDS Proxy + Multi-AZ PostgreSQL */}
              <g className="topo-interactive-node">
                <rect x="805" y="195" width="170" height="135" rx="8" fill="rgba(16, 24, 34, 0.98)" stroke="#38bdf8" strokeWidth="2" />
                <rect x="815" y="205" width="95" height="15" rx="3" fill="rgba(56, 189, 248, 0.15)" />
                <text x="862" y="216" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#38bdf8" fontFamily="var(--mono)">RDS PROXY + DB</text>
                <text x="960" y="219" textAnchor="end" fontSize="14">🗄️</text>
                <text x="815" y="240" fontSize="11" fontWeight="700" fill="#edf2f7">PostgreSQL Multi-AZ</text>
                <text x="815" y="256" fontSize="8" fill="#7dd3fc" fontFamily="var(--mono)">Amazon RDS Proxy</text>
                <text x="815" y="270" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">Manages container sockets</text>
                <text x="815" y="284" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">Prevents DB exhaustion</text>
                <text x="815" y="302" fontSize="7.5" fill="#5cdbd3" fontFamily="var(--mono)">Multi-AZ Replication</text>
              </g>
            </g>
          )}

          {/* ========================================================================= */}
          {/* ARCHITECTURE MODE 1: NAIVE DIRECT MULTI-PORT EXPOSURE (ANTI-PATTERN)      */}
          {/* ========================================================================= */}
          {archMode === 'naive' && (
            <g>
              {/* WARNING BANNER ON TOP */}
              <rect x="25" y="10" width="970" height="30" rx="6" fill="rgba(255, 93, 93, 0.12)" stroke="#ff5d5d" strokeWidth="1.2" />
              <text x="40" y="29" fontSize="10" fontWeight="800" fill="#ff5d5d" fontFamily="var(--mono)">
                ⚠️ CRITICAL VULNERABILITY: DIRECT MULTI-PORT EXPOSURE · 6 PORTS OPEN TO 0.0.0.0/0 · ZERO REVERSE PROXY
              </text>

              {/* Permissive Security Group with Red Warning Boundary */}
              <rect
                x="300"
                y="55"
                width="690"
                height="470"
                rx="12"
                fill="rgba(28, 16, 20, 0.95)"
                stroke="#ff5d5d"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              <text x="320" y="78" fontSize="10" fontWeight="800" fill="#ff5d5d" fontFamily="var(--mono)">
                AWS EC2 HOST (t3.micro) · PORTS EXPOSED DIRECTLY TO INTERNET INTERFACE (eth0)
              </text>

              {/* NODE: Web Browser */}
              <g className="topo-interactive-node">
                <rect x="25" y="80" width="125" height="70" rx="8" fill="rgba(28, 16, 20, 0.95)" stroke="#ff5d5d" strokeWidth="1.5" />
                <rect x="35" y="90" width="46" height="14" rx="3" fill="rgba(255, 93, 93, 0.2)" />
                <text x="58" y="100" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#ff5d5d" fontFamily="var(--mono)">CLIENT</text>
                <text x="135" y="103" textAnchor="end" fontSize="14">🌐</text>
                <text x="35" y="122" fontSize="10.5" fontWeight="700" fill="#edf2f7">Web Browser</text>
                <text x="35" y="137" fontSize="8" fill="#ff9999" fontFamily="var(--mono)">VITE_API_URL hardcoded</text>
              </g>

              {/* NODE: Port Scanner / Attacker */}
              <g className="topo-interactive-node">
                <rect x="25" y="240" width="125" height="80" rx="8" fill="rgba(35, 12, 16, 0.98)" stroke="#ff5d5d" strokeWidth="2.5" />
                <rect x="35" y="250" width="60" height="14" rx="3" fill="rgba(255, 93, 93, 0.3)" />
                <text x="65" y="260" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#ff5d5d" fontFamily="var(--mono)">ATTACKER</text>
                <text x="135" y="264" textAnchor="end" fontSize="14">💀</text>
                <text x="35" y="285" fontSize="11" fontWeight="700" fill="#ff5d5d">Port Scanner / Bot</text>
                <text x="35" y="302" fontSize="8" fill="#ff9999" fontFamily="var(--mono)">Scanning 5432 directly</text>
              </g>

              {/* NODE: Admin with Port 22 Open */}
              <g className="topo-interactive-node">
                <rect x="25" y="410" width="125" height="70" rx="8" fill="rgba(28, 16, 20, 0.95)" stroke="#ff5d5d" strokeWidth="1.5" />
                <rect x="35" y="420" width="56" height="14" rx="3" fill="rgba(255, 93, 93, 0.2)" />
                <text x="63" y="430" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#ff5d5d" fontFamily="var(--mono)">SSH :22</text>
                <text x="135" y="433" textAnchor="end" fontSize="14">💻</text>
                <text x="35" y="452" fontSize="10.5" fontWeight="700" fill="#edf2f7">Admin Workstation</text>
                <text x="35" y="467" fontSize="8" fill="#ff9999" fontFamily="var(--mono)">Direct SSH to public IP</text>
              </g>

              {/* EXPOSED INTERNAL SERVICES */}
              {/* 1. Vite Dev Server on :5173 */}
              <g className="topo-interactive-node">
                <rect x="460" y="85" width="230" height="55" rx="6" fill="#1f1114" stroke="#ff5d5d" strokeWidth="1.5" />
                <rect x="470" y="93" width="70" height="13" rx="3" fill="rgba(255, 93, 93, 0.2)" />
                <text x="505" y="103" textAnchor="middle" fontSize="7" fontWeight="700" fill="#ff5d5d" fontFamily="var(--mono)">PUBLIC :5173</text>
                <text x="675" y="105" textAnchor="end" fontSize="12">⚠️</text>
                <text x="470" y="122" fontSize="10.5" fontWeight="700" fill="#edf2f7">Vite Dev Server (npm run dev)</text>
                <text x="470" y="133" fontSize="7.5" fill="#ff9999" fontFamily="var(--mono)">Uncompressed dev server running in prod</text>
              </g>

              {/* 2. FastAPI Backend on :8000 */}
              <g className="topo-interactive-node">
                <rect x="460" y="165" width="230" height="55" rx="6" fill="#1f1114" stroke="#ff5d5d" strokeWidth="1.5" />
                <rect x="470" y="173" width="70" height="13" rx="3" fill="rgba(255, 93, 93, 0.2)" />
                <text x="505" y="183" textAnchor="middle" fontSize="7" fontWeight="700" fill="#ff5d5d" fontFamily="var(--mono)">PUBLIC :8000</text>
                <text x="675" y="185" textAnchor="end" fontSize="12">⚠️</text>
                <text x="470" y="202" fontSize="10.5" fontWeight="700" fill="#edf2f7">Backend API (--host 0.0.0.0)</text>
                <text x="470" y="213" fontSize="7.5" fill="#ff9999" fontFamily="var(--mono)">Exposed directly without reverse proxy</text>
              </g>

              {/* 3. PostgreSQL Database on :5432 - EXPOSED DIRECTLY! */}
              <g className="topo-interactive-node">
                <rect x="720" y="240" width="250" height="90" rx="8" fill="#300d12" stroke="#ff5d5d" strokeWidth="2.5" />
                <rect x="730" y="250" width="105" height="15" rx="3" fill="rgba(255, 93, 93, 0.4)" />
                <text x="782" y="261" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#ff5d5d" fontFamily="var(--mono)">PUBLIC PORT 5432</text>
                <text x="955" y="264" textAnchor="end" fontSize="14">🔥</text>
                <text x="730" y="285" fontSize="11" fontWeight="700" fill="#fff">PostgreSQL (listen_addresses='*')</text>
                <text x="730" y="302" fontSize="8" fill="#ff9999" fontFamily="var(--mono)">Direct internet connection allowed!</text>
                <text x="730" y="316" fontSize="7.5" fill="#ff5d5d" fontFamily="var(--mono)">Brute-force attacks hit DB port directly</text>
              </g>

              {/* 4. Host SSH Daemon on :22 */}
              <g className="topo-interactive-node">
                <rect x="460" y="415" width="230" height="55" rx="6" fill="#1f1114" stroke="#ff5d5d" strokeWidth="1.5" />
                <rect x="470" y="423" width="70" height="13" rx="3" fill="rgba(255, 93, 93, 0.2)" />
                <text x="505" y="433" textAnchor="middle" fontSize="7" fontWeight="700" fill="#ff5d5d" fontFamily="var(--mono)">PUBLIC :22</text>
                <text x="675" y="435" textAnchor="end" fontSize="12">⚠️</text>
                <text x="470" y="452" fontSize="10.5" fontWeight="700" fill="#edf2f7">OpenSSH (0.0.0.0/0)</text>
                <text x="470" y="463" fontSize="7.5" fill="#ff9999" fontFamily="var(--mono)">No bastion; exposed to automated SSH bots</text>
              </g>
            </g>
          )}

          {/* ========================================================================= */}
          {/* ARCHITECTURE MODE 2: REVERSE PROXY LAB (RECOMMENDED DEFAULT)              */}
          {/* ========================================================================= */}
          {archMode === 'proxy' && (
            <g>
              {/* PUBLIC INTERNET ZONE (Left) */}
              <rect
                x="10"
                y="40"
                width="300"
                height="485"
                rx="10"
                fill="rgba(10, 16, 24, 0.45)"
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="1"
              />
              <text x="22" y="60" fontSize="9" fontWeight="700" letterSpacing="1" fill="#5d6878" fontFamily="var(--mono)">
                PUBLIC INTERNET &amp; UNTRUSTED TRAFFIC ZONE
              </text>

              {/* AWS SECURITY GROUP VERTICAL BARRIER (Center) */}
              <g>
                <rect
                  x="330"
                  y="40"
                  width="45"
                  height="485"
                  rx="8"
                  fill="rgba(18, 24, 34, 0.92)"
                  stroke={isDbAttack || isApiAttack ? '#ff5d5d' : 'rgba(79, 209, 197, 0.5)'}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x="352"
                  y="285"
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="800"
                  letterSpacing="1.2"
                  fill={isDbAttack || isApiAttack ? '#ff5d5d' : '#4fd1c5'}
                  fontFamily="var(--mono)"
                  transform="rotate(-90 352 285)"
                >
                  AWS SECURITY GROUP (L4 HYPERVISOR FILTER)
                </text>

                {/* Gate 1: 80/443 ALLOW */}
                <circle cx="352.5" cy="120" r="14" fill="#0f1f22" stroke="#4fd1c5" strokeWidth="2" />
                <text x="352.5" y="124" textAnchor="middle" fontSize="11" fontWeight="800" fill="#4fd1c5">✓</text>
                <text x="352.5" y="146" textAnchor="middle" fontSize="7" fontWeight="700" fill="#4fd1c5" fontFamily="var(--mono)">80/443</text>

                {/* Gate 2: Probes :5432 & :8000 (DROP) */}
                <circle
                  cx="352.5"
                  cy="280"
                  r="14"
                  fill="#251212"
                  stroke="#ff5d5d"
                  strokeWidth="2"
                  className={isDbAttack || isApiAttack ? 'pulse-barrier-glow' : ''}
                />
                <text x="352.5" y="284" textAnchor="middle" fontSize="11" fontWeight="800" fill="#ff5d5d">✕</text>
                <text x="352.5" y="306" textAnchor="middle" fontSize="7" fontWeight="700" fill="#ff5d5d" fontFamily="var(--mono)">DROP</text>

                {/* Deflection shockwave sparks */}
                {(isDbAttack || isApiAttack) && (
                  <g filter="url(#block-spark)">
                    <circle cx="352.5" cy="280" r="22" fill="none" stroke="#ff5d5d" strokeWidth="1.5" opacity="0.7">
                      <animate attributeName="r" values="14;34" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;0" dur="1s" repeatCount="indefinite" />
                    </circle>
                  </g>
                )}

                {/* Gate 3: Port 22 Bastion SG */}
                <circle cx="352.5" cy="460" r="14" fill="#0c1a29" stroke="#38bdf8" strokeWidth="2" />
                <text x="352.5" y="464" textAnchor="middle" fontSize="10" fontWeight="800" fill="#38bdf8">🔒</text>
                <text x="352.5" y="486" textAnchor="middle" fontSize="7" fontWeight="700" fill="#38bdf8" fontFamily="var(--mono)">:22 SG</text>
              </g>

              {/* AWS EC2 INSTANCE BOUNDARY (Right) */}
              <rect
                x="400"
                y="40"
                width="605"
                height="485"
                rx="12"
                fill="rgba(11, 17, 25, 0.92)"
                stroke="rgba(79, 209, 197, 0.35)"
                strokeWidth="1.5"
              />
              <text x="420" y="62" fontSize="9.5" fontWeight="800" letterSpacing="1" fill="#4fd1c5" fontFamily="var(--mono)">
                🖥️ AWS EC2 HOST (t3.micro) · eth0 (Public IP) + Private IP 10.0.1.15
              </text>

              {/* LINUX LOOPBACK SOCKET INTERFACE (lo) BOX */}
              <rect
                x="620"
                y="75"
                width="370"
                height="435"
                rx="10"
                fill="rgba(7, 12, 18, 0.88)"
                stroke="rgba(79, 209, 197, 0.25)"
                strokeDasharray="4 4"
                strokeWidth="1.2"
              />
              <text x="635" y="93" fontSize="8.5" fontWeight="700" letterSpacing="0.8" fill="#5cdbd3" fontFamily="var(--mono)">
                ⇄ LINUX LOOPBACK INTERFACE (lo) — 127.0.0.1 (INTERNAL ONLY)
              </text>
              <text x="975" y="93" textAnchor="end" fontSize="7.5" fill="#5d6878" fontFamily="var(--mono)">
                ZERO EXTERNAL NIC EXPOSURE
              </text>

              {/* NODE 1: Web Client (Browser) */}
              <g className="topo-interactive-node" onClick={() => onSelectTraffic('static')} cursor="pointer">
                <rect x="25" y="80" width="125" height="80" rx="8" fill="rgba(14, 22, 32, 0.95)" stroke={isStatic || isApi || isFarm ? '#4fd1c5' : 'rgba(255,255,255,0.1)'} strokeWidth={isStatic || isApi || isFarm ? 2 : 1} />
                <rect x="35" y="90" width="46" height="15" rx="3" fill="rgba(79, 209, 197, 0.12)" />
                <text x="58" y="101" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#4fd1c5" fontFamily="var(--mono)">CLIENT</text>
                <text x="135" y="104" textAnchor="end" fontSize="14">🌐</text>
                <text x="35" y="125" fontSize="10.5" fontWeight="700" fill="#edf2f7">Web Browser</text>
                <text x="35" y="142" fontSize="8" fill="#93a0b1" fontFamily="var(--mono)">demo.example.com</text>
              </g>

              {/* NODE 2: Elastic IP + DNS */}
              <g className="topo-interactive-node" onClick={() => onSelectTraffic('all')} cursor="pointer">
                <rect x="180" y="80" width="120" height="80" rx="8" fill="rgba(14, 22, 32, 0.95)" stroke={isStatic || isApi || isFarm ? '#4fd1c5' : 'rgba(255,255,255,0.1)'} strokeWidth={isStatic || isApi || isFarm ? 2 : 1} />
                <rect x="190" y="90" width="56" height="15" rx="3" fill="rgba(79, 209, 197, 0.12)" />
                <text x="218" y="101" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#4fd1c5" fontFamily="var(--mono)">DNS / EIP</text>
                <text x="285" y="104" textAnchor="end" fontSize="14">🌍</text>
                <text x="190" y="125" fontSize="10.5" fontWeight="700" fill="#edf2f7">Namecheap DNS</text>
                <text x="190" y="142" fontSize="8" fill="#93a0b1" fontFamily="var(--mono)">Stable Public IP</text>
              </g>

              {/* NODE 3: Attacker / Port Scanner */}
              <g className="topo-interactive-node" onClick={() => onSelectTraffic('db-attack')} cursor="pointer">
                <rect x="25" y="240" width="125" height="80" rx="8" fill="rgba(28, 16, 20, 0.95)" stroke={isDbAttack || isApiAttack ? '#ff5d5d' : 'rgba(255,255,255,0.1)'} strokeWidth={isDbAttack || isApiAttack ? 2 : 1} />
                <rect x="35" y="250" width="65" height="15" rx="3" fill="rgba(255, 93, 93, 0.15)" />
                <text x="67" y="261" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#ff5d5d" fontFamily="var(--mono)">SCANNER</text>
                <text x="135" y="264" textAnchor="end" fontSize="14">💀</text>
                <text x="35" y="285" fontSize="10.5" fontWeight="700" fill="#edf2f7">External Probe</text>
                <text x="35" y="302" fontSize="8" fill="#ff9999" fontFamily="var(--mono)">Attacking :5432</text>
              </g>

              {/* NODE 4: Admin Workstation */}
              <g className="topo-interactive-node" onClick={() => onSelectTraffic('ssh-bastion')} cursor="pointer">
                <rect x="25" y="420" width="125" height="80" rx="8" fill="rgba(12, 22, 34, 0.95)" stroke={isSsh ? '#38bdf8' : 'rgba(255,255,255,0.1)'} strokeWidth={isSsh ? 2 : 1} />
                <rect x="35" y="430" width="56" height="15" rx="3" fill="rgba(56, 189, 248, 0.15)" />
                <text x="63" y="441" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#38bdf8" fontFamily="var(--mono)">ADMIN IP</text>
                <text x="135" y="444" textAnchor="end" fontSize="14">💻</text>
                <text x="35" y="465" fontSize="10.5" fontWeight="700" fill="#edf2f7">Admin Laptop</text>
                <text x="35" y="482" fontSize="8" fill="#7dd3fc" fontFamily="var(--mono)">Trusted IP /32</text>
              </g>

              {/* NODE 5: Bastion EC2 Host */}
              <g className="topo-interactive-node" onClick={() => onSelectTraffic('ssh-bastion')} cursor="pointer">
                <rect x="180" y="420" width="120" height="80" rx="8" fill="rgba(12, 22, 34, 0.95)" stroke={isSsh ? '#38bdf8' : 'rgba(255,255,255,0.1)'} strokeWidth={isSsh ? 2 : 1} />
                <rect x="190" y="430" width="58" height="15" rx="3" fill="rgba(56, 189, 248, 0.15)" />
                <text x="219" y="441" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#38bdf8" fontFamily="var(--mono)">BASTION</text>
                <text x="285" y="444" textAnchor="end" fontSize="14">🛡️</text>
                <text x="190" y="465" fontSize="10.5" fontWeight="700" fill="#edf2f7">Bastion Host</text>
                <text x="190" y="482" fontSize="8" fill="#7dd3fc" fontFamily="var(--mono)">SSH ProxyJump</text>
              </g>

              {/* NODE 6: Reverse Proxy Engine (Apache / Caddy) */}
              <g className="topo-interactive-node" onClick={() => onSelectTraffic('static')} cursor="pointer">
                <rect x="430" y="95" width="130" height="95" rx="8" fill="rgba(15, 25, 36, 0.98)" stroke={isStatic || isApi || isFarm ? '#e8a33d' : 'rgba(255,255,255,0.1)'} strokeWidth={isStatic || isApi || isFarm ? 2 : 1} />
                <rect x="440" y="105" width="85" height="15" rx="3" fill="rgba(232, 163, 61, 0.15)" />
                <text x="482" y="116" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#e8a33d" fontFamily="var(--mono)">REVERSE PROXY</text>
                <text x="545" y="119" textAnchor="end" fontSize="14">↹</text>
                <text x="440" y="140" fontSize="11" fontWeight="700" fill="#edf2f7">Apache / Caddy</text>
                <text x="440" y="156" fontSize="8" fill="#ffc069" fontFamily="var(--mono)">Layer 7 Ingress</text>
                <text x="440" y="170" fontSize="7.5" fill="#93a0b1" fontFamily="var(--mono)">TLS Termination</text>
              </g>

              {/* NODE 7: Static Vite SPA Dist */}
              <g className="topo-interactive-node" onClick={() => onSelectTraffic('static')} cursor="pointer">
                <rect x="645" y="105" width="330" height="60" rx="6" fill="rgba(16, 24, 34, 0.95)" stroke={isStatic ? '#4fd1c5' : 'rgba(255,255,255,0.08)'} strokeWidth={isStatic ? 2 : 1} />
                <rect x="655" y="115" width="68" height="14" rx="3" fill="rgba(79, 209, 197, 0.12)" />
                <text x="689" y="125" textAnchor="middle" fontSize="7" fontWeight="700" fill="#4fd1c5" fontFamily="var(--mono)">STATIC FILES</text>
                <text x="960" y="128" textAnchor="end" fontSize="12">📄</text>
                <text x="655" y="145" fontSize="10.5" fontWeight="700" fill="#edf2f7">/var/www/demo (Vite Production dist)</text>
                <text x="655" y="157" fontSize="7.5" fill="#5cdbd3" fontFamily="var(--mono)">file_server + try_files &#123;path&#125; /index.html (No dev server on :5173)</text>
              </g>

              {/* NODE 8: Backend API 1 (127.0.0.1:8000) */}
              <g className="topo-interactive-node" onClick={() => onSelectTraffic('api')} cursor="pointer">
                <rect x="645" y="185" width="330" height="62" rx="6" fill="rgba(16, 24, 34, 0.95)" stroke={isApi ? '#a78bfa' : 'rgba(255,255,255,0.08)'} strokeWidth={isApi ? 2 : 1} />
                <rect x="655" y="195" width="75" height="14" rx="3" fill="rgba(167, 139, 250, 0.15)" />
                <text x="692" y="205" textAnchor="middle" fontSize="7" fontWeight="700" fill="#a78bfa" fontFamily="var(--mono)">FASTAPI / NODE</text>
                <text x="960" y="208" textAnchor="end" fontSize="12">⚙️</text>
                <text x="655" y="225" fontSize="10.5" fontWeight="700" fill="#edf2f7">Internal API · 127.0.0.1:8000</text>
                <text x="655" y="238" fontSize="7.5" fill="#c4b5fd" fontFamily="var(--mono)">uvicorn main:app --host 127.0.0.1 (Loopback bound)</text>
              </g>

              {/* NODE 9: Secondary Microservice (127.0.0.1:8001) */}
              <g className="topo-interactive-node" onClick={() => onSelectTraffic('farm')} cursor="pointer">
                <rect x="645" y="268" width="330" height="62" rx="6" fill="rgba(16, 24, 34, 0.95)" stroke={isFarm ? '#e8a33d' : 'rgba(255,255,255,0.08)'} strokeWidth={isFarm ? 2 : 1} />
                <rect x="655" y="278" width="65" height="14" rx="3" fill="rgba(232, 163, 61, 0.15)" />
                <text x="687" y="288" textAnchor="middle" fontSize="7" fontWeight="700" fill="#e8a33d" fontFamily="var(--mono)">SERVICE 2</text>
                <text x="960" y="291" textAnchor="end" fontSize="12">📦</text>
                <text x="655" y="308" fontSize="10.5" fontWeight="700" fill="#edf2f7">Secondary Service · 127.0.0.1:8001</text>
                <text x="655" y="321" fontSize="7.5" fill="#ffc069" fontFamily="var(--mono)">Reverse proxied from /farm/ without opening port</text>
              </g>

              {/* NODE 10: PostgreSQL Database (127.0.0.1:5432) */}
              <g className="topo-interactive-node" onClick={() => onSelectTraffic('api')} cursor="pointer">
                <rect x="645" y="350" width="330" height="65" rx="6" fill="rgba(16, 24, 34, 0.95)" stroke={isApi ? '#38bdf8' : 'rgba(255,255,255,0.08)'} strokeWidth={isApi ? 2 : 1} />
                <rect x="655" y="360" width="70" height="14" rx="3" fill="rgba(56, 189, 248, 0.15)" />
                <text x="690" y="370" textAnchor="middle" fontSize="7" fontWeight="700" fill="#38bdf8" fontFamily="var(--mono)">POSTGRESQL</text>
                <text x="960" y="373" textAnchor="end" fontSize="12">🗄️</text>
                <text x="655" y="390" fontSize="10.5" fontWeight="700" fill="#edf2f7">PostgreSQL Database · 127.0.0.1:5432</text>
                <text x="655" y="403" fontSize="7.5" fill="#7dd3fc" fontFamily="var(--mono)">listen_addresses = '127.0.0.1' (Zero public exposure)</text>
              </g>

              {/* NODE 11: Host SSH Daemon (Port 22) */}
              <g className="topo-interactive-node" onClick={() => onSelectTraffic('ssh-bastion')} cursor="pointer">
                <rect x="430" y="420" width="130" height="80" rx="8" fill="rgba(12, 22, 34, 0.95)" stroke={isSsh ? '#38bdf8' : 'rgba(255,255,255,0.1)'} strokeWidth={isSsh ? 2 : 1} />
                <rect x="440" y="430" width="60" height="15" rx="3" fill="rgba(56, 189, 248, 0.15)" />
                <text x="470" y="441" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#38bdf8" fontFamily="var(--mono)">SSHD :22</text>
                <text x="545" y="444" textAnchor="end" fontSize="14">🔑</text>
                <text x="440" y="465" fontSize="10.5" fontWeight="700" fill="#edf2f7">OpenSSH</text>
                <text x="440" y="482" fontSize="7.5" fill="#7dd3fc" fontFamily="var(--mono)">Private 10.0.1.15</text>
              </g>
            </g>
          )}

          {/* ============================================================ */}
          {/* FAINT BACKGROUND PATHS & ACTIVE ANIMATED MOVING PACKETS       */}
          {/* ============================================================ */}
          {activePaths.map((p) => (
            <path
              key={`bg-${p.id}`}
              d={p.d}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1.6"
              strokeDasharray="4 6"
              fill="none"
            />
          ))}

          {activePaths.map((p) => (
            <g key={`active-${p.id}`}>
              <path
                d={p.d}
                stroke={p.color}
                strokeWidth={p.isBlocked ? '2.5' : '2'}
                strokeOpacity={p.isBlocked ? '0.85' : '0.65'}
                fill="none"
              />
              <circle
                r={p.isBlocked ? '5.5' : '5'}
                fill={p.packetColor}
                filter="url(#topo-glow)"
              >
                <animateMotion
                  dur={p.dur}
                  begin={p.delay || '0s'}
                  repeatCount="indefinite"
                  path={p.d}
                  calcMode="spline"
                  keyTimes="0; 1"
                  keySplines="0.42 0 0.58 1"
                />
              </circle>
            </g>
          ))}
        </svg>

        {/* Floating Path Explainer Labels */}
        {activePaths.filter((p) => p.label && p.labelX && p.labelY).map((p) => (
          <div
            key={`lbl-${p.id}`}
            style={{
              position: 'absolute',
              left: `${(p.labelX! / 1020) * 100}%`,
              top: `${(p.labelY! / 550) * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 15,
              padding: '2px 7px',
              borderRadius: '999px',
              background: 'rgba(7, 12, 19, 0.92)',
              border: `1px solid ${p.color}`,
              color: p.color,
              fontSize: '9px',
              fontWeight: 700,
              fontFamily: 'var(--mono)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: `0 0 10px ${p.color}25`,
            }}
          >
            {p.label}
          </div>
        ))}

        {/* Live Status Pill at Bottom */}
        <div className="gallery-live-flow-status" style={{ zIndex: 20 }}>
          <span
            className="live-pulse"
            style={{
              background:
                archMode === 'containers'
                  ? '#a78bfa'
                  : archMode === 'naive'
                    ? '#ff5d5d'
                    : isDbAttack || isApiAttack
                      ? '#ff5d5d'
                      : 'var(--teal)',
            }}
          />
          <span>
            {archMode === 'containers' && 'Stage 3 Containers (ECS/Fargate): Docker tasks scale horizontally behind ALB with granular CPU/memory bin-packing and RDS Proxy'}
            {archMode === 'alb' && 'Multi-AZ ALB: Traffic load-balanced across EC2 instances (AZ-1a & AZ-1b) with zero downtime'}
            {archMode === 'naive' && 'CRITICAL: Multi-port exposure detected! Database port 5432 and backend exposed directly to the public internet'}
            {archMode === 'proxy' && `Reverse Proxy Active (${selectedTraffic.toUpperCase()}): Single entry point 80/443 with localhost loopback isolation`}
          </span>
        </div>
      </div>
    </div>
  )
}
