import { useState } from 'react'
import { NavBrand } from './NavBrand'
import { StandaloneTopologyMap, type SimTrafficType } from './sandbox/StandaloneTopologyMap'

type ViewTab = 'simulator' | 'guide' | 'configs' | 'security'
type ArchMode = 'naive' | 'proxy' | 'alb' | 'containers'
type SimRequest = SimTrafficType
type ConfigTab = 'caddy' | 'apache' | 'ssh' | 'env' | 'terraform'

interface RequestScenario {
  id: SimRequest
  label: string
  method: string
  url: string
  targetPort: number
  description: string
  allowedInProxyMode: boolean
  securityGroupDecision: 'ALLOW' | 'DROP'
  proxyAction?: string
  internalTarget?: string
  responseStatus: string
  details: string
  packetPath: string[]
}

const modeScenarios: Record<ArchMode, Record<SimRequest, RequestScenario>> = {
  naive: {
    all: {
      id: 'all',
      label: '⚡ Ambient Probing (All Ports Open)',
      method: 'MULTI',
      url: 'http://EC2_PUBLIC_IP:* (Direct Unfiltered)',
      targetPort: 0,
      description: 'Simultaneous scanning of all ports directly exposed to 0.0.0.0/0 on the EC2 public interface.',
      allowedInProxyMode: false,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'NONE (Zero Reverse Proxy — Requests reach raw Linux processes directly)',
      internalTarget: '0.0.0.0 (Public eth0 Network Interface)',
      responseStatus: 'CRITICAL RISK · 6 Ports Exposed to Internet',
      details: 'Naive Anti-Pattern: Every internal service is exposed without isolation or centralized TLS encryption.',
      packetPath: ['attacker', 'db', 'api', 'vite', 'ssh'],
    },
    static: {
      id: 'static',
      label: '1. Vite Dev Server (:5173)',
      method: 'GET',
      url: 'http://EC2_PUBLIC_IP:5173/',
      targetPort: 5173,
      description: 'User connects directly to unminified Vite dev server running in production.',
      allowedInProxyMode: false,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'NONE (npm run dev listening on 0.0.0.0:5173)',
      internalTarget: 'Node.js Dev Server (eth0:5173)',
      responseStatus: '200 OK · High RAM Usage & Slow Dev Bundles',
      details: 'Running dev servers directly in production leaks local filesystem paths and lacks gzip/brotli compression.',
      packetPath: ['client', 'vite-dev'],
    },
    api: {
      id: 'api',
      label: '2. FastAPI Backend (:8000)',
      method: 'GET',
      url: 'http://EC2_PUBLIC_IP:8000/users',
      targetPort: 8000,
      description: 'Frontend calls backend API directly on port 8000 with hardcoded public IP.',
      allowedInProxyMode: false,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'NONE (uvicorn main:app --host 0.0.0.0 --port 8000)',
      internalTarget: 'Uvicorn Process (eth0:8000)',
      responseStatus: '200 OK · CORS Preflight Required on Port 8000',
      details: 'Direct port exposure forces frontend to couple to the EC2 public IP. If the IP changes, client apps break.',
      packetPath: ['client', 'api-exposed'],
    },
    farm: {
      id: 'farm',
      label: '3. Secondary Service (:8001)',
      method: 'GET',
      url: 'http://EC2_PUBLIC_IP:8001/status',
      targetPort: 8001,
      description: 'Microservice requires opening another public port in the AWS Security Group.',
      allowedInProxyMode: false,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'NONE (Secondary service listening on 0.0.0.0:8001)',
      internalTarget: 'Service 2 Process (eth0:8001)',
      responseStatus: '200 OK · Additional Firewall Port Required',
      details: 'Every new microservice punches another hole in the firewall, rapidly expanding the host attack surface.',
      packetPath: ['client', 'service2-exposed'],
    },
    'db-attack': {
      id: 'db-attack',
      label: '4. Direct DB Exploit (:5432)',
      method: 'TCP SYN',
      url: 'postgres://EC2_PUBLIC_IP:5432/app',
      targetPort: 5432,
      description: 'External scanner exploits PostgreSQL port 5432 left wide open to 0.0.0.0/0.',
      allowedInProxyMode: false,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'NONE (PostgreSQL bound to 0.0.0.0:5432 — VULNERABILITY EXPLOITED)',
      internalTarget: 'PostgreSQL Server (eth0:5432)',
      responseStatus: 'TCP ESTABLISHED · Database Handshake Success (DATA BREACH RISK)',
      details: 'Catastrophic vulnerability: Databases must NEVER listen on public interfaces or be open in Security Groups.',
      packetPath: ['attacker', 'db-exploited'],
    },
    'api-attack': {
      id: 'api-attack',
      label: '5. Exposed Swagger Docs (:8000)',
      method: 'GET',
      url: 'http://EC2_PUBLIC_IP:8000/docs',
      targetPort: 8000,
      description: 'Attacker accesses internal interactive Swagger API schema directly over the internet.',
      allowedInProxyMode: false,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'NONE (Exposed FastAPI OpenAPI Swagger docs)',
      internalTarget: 'FastAPI /docs endpoint (eth0:8000)',
      responseStatus: '200 OK · Complete Internal API Schema Leaked',
      details: 'Without reverse proxy path control, sensitive internal endpoints (/docs, /metrics) are exposed.',
      packetPath: ['attacker', 'api-exposed'],
    },
    'ssh-bastion': {
      id: 'ssh-bastion',
      label: '6. SSH Port 22 Brute-Force',
      method: 'SSH-2.0',
      url: 'ssh root@EC2_PUBLIC_IP:22',
      targetPort: 22,
      description: 'Automated botnets probe SSH port 22 open directly to 0.0.0.0/0.',
      allowedInProxyMode: false,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'NONE (sshd listening on 0.0.0.0:22)',
      internalTarget: 'sshd daemon (eth0:22)',
      responseStatus: 'SSH Handshake · 10,000 Failed Password Attempts/Day',
      details: 'Leaving SSH port 22 open to 0.0.0.0/0 invites brute-force credential stuffing and zero-day exploits.',
      packetPath: ['attacker', 'ssh-exposed'],
    },
  },
  proxy: {
    all: {
      id: 'all',
      label: '⚡ Ambient Traffic (All Flows)',
      method: 'MULTI',
      url: 'https://demo.example.com/* (Simultaneous)',
      targetPort: 443,
      description: 'Concurrent simulated traffic streams across web ingress, reverse proxy, loopback sockets, and deflected attack probes.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'Concurrent L7 path multiplexing: / -> static, /api/ -> :8000, /farm/ -> :8001',
      internalTarget: '127.0.0.1 (Loopback sockets active)',
      responseStatus: 'Continuous 200 OK & 0-byte Port Drops',
      details: 'Visualizes normal production operations: web users access apps seamlessly while port scanners hit the firewall wall.',
      packetPath: ['client', 'dns', 'secgroup', 'proxy', 'static-dist', 'api1', 'database', 'api2', 'attacker', 'admin'],
    },
    static: {
      id: 'static',
      label: '1. Root Page (SPA / Vite Dist)',
      method: 'GET',
      url: 'https://demo.example.com/',
      targetPort: 443,
      description: 'User requests the website frontend application.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'Serve static Vite production build from /var/www/demo/index.html (file_server)',
      internalTarget: '/var/www/demo (Local Disk)',
      responseStatus: '200 OK · Content-Type: text/html',
      details: 'Served directly by Caddy/Apache file server. No development Vite server running on port 5173!',
      packetPath: ['client', 'dns', 'secgroup', 'proxy', 'static-dist'],
    },
    api: {
      id: 'api',
      label: '2. Backend API (/api/)',
      method: 'GET',
      url: 'https://demo.example.com/api/users',
      targetPort: 443,
      description: 'Frontend calls REST API for user profile data.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'Reverse proxy strip /api/ and forward request to 127.0.0.1:8000/users',
      internalTarget: '127.0.0.1:8000 (Backend API 1)',
      responseStatus: '200 OK · Content-Type: application/json',
      details: 'Traffic reaches EC2 on port 443; reverse proxy tunnels internally over loopback interface (lo).',
      packetPath: ['client', 'dns', 'secgroup', 'proxy', 'api1', 'database'],
    },
    farm: {
      id: 'farm',
      label: '3. Secondary Service (/farm/)',
      method: 'GET',
      url: 'https://demo.example.com/farm/status',
      targetPort: 443,
      description: 'Request directed to microservice running on secondary port.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'Reverse proxy forwards to 127.0.0.1:8001/status',
      internalTarget: '127.0.0.1:8001 (Backend API 2)',
      responseStatus: '200 OK · Content-Type: application/json',
      details: 'Routed by URL path without opening another public port in the EC2 security group.',
      packetPath: ['client', 'dns', 'secgroup', 'proxy', 'api2'],
    },
    'db-attack': {
      id: 'db-attack',
      label: '4. Direct DB Port Attack (:5432)',
      method: 'TCP SYN',
      url: 'http://EC2_PUBLIC_IP:5432',
      targetPort: 5432,
      description: 'Malicious scanner attempts direct connection to PostgreSQL database.',
      allowedInProxyMode: false,
      securityGroupDecision: 'DROP',
      proxyAction: 'Packets dropped at AWS hypervisor boundary before reaching EC2 network interface',
      internalTarget: 'BLOCKED (Port 5432 not in Security Group)',
      responseStatus: 'CONNECTION TIMED OUT · 0 Bytes Returned',
      details: 'PostgreSQL only listens on 127.0.0.1. Even if the firewall leaked, the database rejects external interfaces.',
      packetPath: ['attacker', 'secgroup-blocked'],
    },
    'api-attack': {
      id: 'api-attack',
      label: '5. Direct Backend Probe (:8000)',
      method: 'GET',
      url: 'http://EC2_PUBLIC_IP:8000/docs',
      targetPort: 8000,
      description: 'External user tries to bypass reverse proxy and hit backend port directly.',
      allowedInProxyMode: false,
      securityGroupDecision: 'DROP',
      proxyAction: 'Inbound rule missing in AWS Security Group. Traffic silently discarded.',
      internalTarget: 'BLOCKED (Port 8000 closed to 0.0.0.0/0)',
      responseStatus: 'CONNECTION TIMED OUT · Dropped by AWS SG',
      details: 'Backend runs with --host 127.0.0.1. It cannot be probed from outside the EC2 host.',
      packetPath: ['attacker', 'secgroup-blocked'],
    },
    'ssh-bastion': {
      id: 'ssh-bastion',
      label: '6. SSH Admin via Bastion',
      method: 'SSH-2.0',
      url: 'ssh demo-web (ProxyJump demo-bastion)',
      targetPort: 22,
      description: 'System administrator connects for maintenance via Bastion host.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'SSH ProxyJump forwards connection through Bastion host to EC2 private IP',
      internalTarget: '10.0.1.15:22 (Private EC2 Subnet)',
      responseStatus: '200 Authenticated · Session Established via ProxyJump',
      details: 'Port 22 on the web server only allows the Bastion SG. Admin private keys remain safely on local laptop.',
      packetPath: ['admin', 'bastion', 'ssh-web'],
    },
  },
  alb: {
    all: {
      id: 'all',
      label: '⚡ Multi-AZ Traffic Balancing',
      method: 'MULTI',
      url: 'https://demo.example.com/* (Active/Active)',
      targetPort: 443,
      description: 'ALB terminates TLS with ACM certificate and distributes requests across AZ-1a and AZ-1b.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'ALB Round-Robin L7 distribution across 2 Availability Zones',
      internalTarget: '10.0.1.15:80 (AZ-1a) & 10.0.2.28:80 (AZ-1b)',
      responseStatus: '200 OK · Zero Downtime Multi-AZ Active',
      details: 'High Availability: AWS ALB provides single DNS entry and automatically routes around failed AZs.',
      packetPath: ['client', 'route53', 'alb', 'ec2-1', 'ec2-2', 'rds-primary', 'rds-replica'],
    },
    static: {
      id: 'static',
      label: '1. Web Ingress ➔ AZ-1a (50%)',
      method: 'GET',
      url: 'https://demo.example.com/',
      targetPort: 443,
      description: 'ALB forwards user request to EC2 instance in us-east-1a private subnet.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'ALB Target Group Health: 2/2 Healthy ➔ Routed to Node 1',
      internalTarget: '10.0.1.15:80 (EC2 Instance AZ-1a)',
      responseStatus: '200 OK · Served from Node 1 (AZ-1a)',
      details: 'EC2 instances reside in private subnets with no public IPs; only the ALB is exposed to the internet.',
      packetPath: ['client', 'route53', 'alb', 'ec2-1'],
    },
    api: {
      id: 'api',
      label: '2. API Ingress ➔ AZ-1b (50%)',
      method: 'GET',
      url: 'https://demo.example.com/api/users',
      targetPort: 443,
      description: 'Subsequent API request balanced to EC2 instance in us-east-1b.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'ALB Round-Robin selection ➔ Routed to Node 2 (10.0.2.28)',
      internalTarget: '10.0.2.28:80 (EC2 Instance AZ-1b)',
      responseStatus: '200 OK · Query executed on Primary RDS',
      details: 'Both EC2 instances communicate with Amazon RDS Multi-AZ PostgreSQL over private VPC peering.',
      packetPath: ['client', 'route53', 'alb', 'ec2-2', 'rds-primary'],
    },
    farm: {
      id: 'farm',
      label: '3. Path Target Group (/farm/*)',
      method: 'GET',
      url: 'https://demo.example.com/farm/status',
      targetPort: 443,
      description: 'ALB path rule matches /farm/* and forwards directly to dedicated Farm Target Group.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'ALB Listener Rule: Path /farm/* ➔ Forward to TG-Farm',
      internalTarget: 'TG-Farm (Instances: 10.0.1.15:8001, 10.0.2.28:8001)',
      responseStatus: '200 OK · Content-Type: application/json',
      details: 'Microservices scale and route independently at the ALB layer without touching EC2 web configs.',
      packetPath: ['client', 'route53', 'alb', 'ec2-1'],
    },
    'db-attack': {
      id: 'db-attack',
      label: '4. Blocked Direct DB Ingress',
      method: 'TCP SYN',
      url: 'http://ALB_DNS:5432',
      targetPort: 5432,
      description: 'External attacker probes ALB for database port 5432.',
      allowedInProxyMode: false,
      securityGroupDecision: 'DROP',
      proxyAction: 'ALB only configures listeners on ports 80/443. All other ports dropped at edge.',
      internalTarget: 'BLOCKED (ALB has no listener on TCP 5432)',
      responseStatus: 'CONNECTION REFUSED / TIMED OUT · 0 Bytes',
      details: 'ALB provides built-in Layer 4 network isolation; non-configured ports cannot enter the VPC.',
      packetPath: ['attacker', 'alb-blocked'],
    },
    'api-attack': {
      id: 'api-attack',
      label: '5. AZ-1a Outage & Auto-Failover',
      method: 'FAILOVER',
      url: 'https://demo.example.com/health',
      targetPort: 443,
      description: 'Simulates hardware crash in AZ-1a. ALB detects health check failure and drains instance.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'ALB Health Check: AZ-1a marked UNHEALTHY (Draining). 100% traffic shifted to AZ-1b.',
      internalTarget: '10.0.2.28:80 (AZ-1b Active)',
      responseStatus: '200 OK · Instant Automatic Failover (Zero Downtime)',
      details: 'In single EC2, a hardware fault causes an outage. With ALB multi-AZ, failover is seamless.',
      packetPath: ['client', 'route53', 'alb', 'ec2-2', 'rds-replica'],
    },
    'ssh-bastion': {
      id: 'ssh-bastion',
      label: '6. Private Fleet SSH via Bastion',
      method: 'SSH-2.0',
      url: 'ssh ec2-user@10.0.1.15 (via Bastion)',
      targetPort: 22,
      description: 'Admin manages multiple private EC2 nodes via single hardened Bastion in public subnet.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'ProxyJump to private subnet 10.0.1.15 and 10.0.2.28',
      internalTarget: 'Private Subnet Fleet (Port 22 Bastion SG allowed)',
      responseStatus: '200 Authenticated · Multi-Instance Administration',
      details: 'Fleet nodes have no public IPs or internet gateways; admin traffic is strictly centralized.',
      packetPath: ['admin', 'bastion', 'ec2-fleet'],
    },
  },
  containers: {
    all: {
      id: 'all',
      label: '⚡ Fargate Microservices Flow',
      method: 'MULTI',
      url: 'https://demo.example.com/* (Dynamic Tasks)',
      targetPort: 443,
      description: 'ALB routes traffic to serverless container tasks dynamically registered via awsvpc ENIs.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'Path-based L7 routing: /api/* ➔ Task A & B, /farm/* ➔ Task C',
      internalTarget: '10.0.1.42:8000, 10.0.2.88:8000, 10.0.1.75:8001',
      responseStatus: '200 OK · Serverless Container Microservices Active',
      details: 'Zero EC2 instances to manage or patch. Tasks scale horizontally in 15-30s on demand.',
      packetPath: ['client', 'route53', 'alb', 'task-a', 'task-b', 'task-c', 'rds-proxy', 'database'],
    },
    static: {
      id: 'static',
      label: '1. S3 / CloudFront Edge CDN',
      method: 'GET',
      url: 'https://demo.example.com/',
      targetPort: 443,
      description: 'Frontend Vite static assets served directly from global Edge Cache (CloudFront / S3).',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'CloudFront Edge Cache Hit (X-Cache: Hit from cloudfront)',
      internalTarget: 'Amazon S3 Bucket (Zero compute container cost)',
      responseStatus: '200 OK · Sub-15ms TTFB',
      details: 'In modern container architectures, static assets bypass application containers completely, saving CPU.',
      packetPath: ['client', 'route53', 'edge-cdn'],
    },
    api: {
      id: 'api',
      label: '2. ALB Path /api/* ➔ ECS Task A & B',
      method: 'GET',
      url: 'https://demo.example.com/api/users',
      targetPort: 443,
      description: 'REST API requests load-balanced across multiple ephemeral Docker container replicas.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'Target Group (IP Target): 10.0.1.42:8000 (Task A) & 10.0.2.88:8000 (Task B)',
      internalTarget: 'FastAPI Container (awsvpc ENI: 10.0.1.42:8000)',
      responseStatus: '200 OK · Content-Type: application/json',
      details: 'Each container task has its own private IP. No port conflicts, even with dozens of replicas.',
      packetPath: ['client', 'route53', 'alb', 'task-a', 'rds-proxy', 'database'],
    },
    farm: {
      id: 'farm',
      label: '3. ALB Path /farm/* ➔ ECS Task C',
      method: 'GET',
      url: 'https://demo.example.com/farm/status',
      targetPort: 443,
      description: 'Path-based routing steers secondary microservice traffic to dedicated Container Task C.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'Target Group B: Dynamic forward to Container Task C (10.0.1.75:8001)',
      internalTarget: 'Microservice Container (0.25 vCPU, 512MB RAM)',
      responseStatus: '200 OK · Content-Type: application/json',
      details: 'Service isolation prevents memory leaks in service 2 from degrading primary API containers.',
      packetPath: ['client', 'route53', 'alb', 'task-c'],
    },
    'db-attack': {
      id: 'db-attack',
      label: '4. RDS Proxy Connection Pooling',
      method: 'SQL POOL',
      url: 'demo-db.proxy-xyz.rds.amazonaws.com:5432',
      targetPort: 5432,
      description: '50 concurrent container tasks query database through Amazon RDS Proxy.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'RDS Proxy multiplexes 50 incoming container connections into 5 backend DB sockets.',
      internalTarget: 'Amazon RDS Proxy Pool (Sub-millisecond connection reuse)',
      responseStatus: 'Active Pooling · 0 DB Connection Exhaustion Errors',
      details: 'Prevents ephemeral container tasks from exceeding PostgreSQL max_connections during auto-scaling.',
      packetPath: ['task-a', 'task-b', 'rds-proxy', 'database'],
    },
    'api-attack': {
      id: 'api-attack',
      label: '5. Container Horizontal Auto-Scale',
      method: 'TRAFFIC SURGE',
      url: 'https://demo.example.com/api/heavy-load',
      targetPort: 443,
      description: 'Traffic surge pushes CPU utilization above 70%, triggering ECS Auto Scaling policy.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'ECS Service Autoscaler launches Task D & Task E (Image pulled from ECR in 18s)',
      internalTarget: 'ALB registers new task IPs 10.0.1.99 and 10.0.2.140 automatically',
      responseStatus: '200 OK · Cluster Scaled from 2 to 4 Tasks in 18s',
      details: 'Containers launch in seconds, whereas EC2 AMI boots take 3-5 minutes.',
      packetPath: ['client', 'alb', 'task-b', 'rds-proxy'],
    },
    'ssh-bastion': {
      id: 'ssh-bastion',
      label: '6. ECS Exec (Zero-SSH Shell)',
      method: 'AWS-SSM',
      url: 'aws ecs execute-command --task task-a',
      targetPort: 443,
      description: 'Developer debugs running container namespace via AWS Systems Manager without SSH.',
      allowedInProxyMode: true,
      securityGroupDecision: 'ALLOW',
      proxyAction: 'SSM Agent tunnels interactive shell session over TLS control plane',
      internalTarget: 'Container namespace PID (Rootless appuser)',
      responseStatus: 'Connected · Audited Session in CloudTrail (Port 22 CLOSED)',
      details: 'Zero open inbound ports required for management; authenticated via IAM and logged to CloudTrail.',
      packetPath: ['admin', 'route53', 'task-a'],
    },
  },
}

export function StandaloneWebsiteSandbox() {
  const [activeTab, setActiveTab] = useState<ViewTab>('simulator')
  const [archMode, setArchMode] = useState<ArchMode>('proxy')
  const [selectedReq, setSelectedReq] = useState<SimRequest>('static')
  const [activeConfig, setActiveConfig] = useState<ConfigTab>('caddy')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [activeGuideSection, setActiveGuideSection] = useState<string>('intro')

  const scenarios = modeScenarios[archMode]
  const req = scenarios[selectedReq] || scenarios['static']

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="sandbox-shell fade-in">
      {/* Top sticky navigation */}
      <nav className="sandbox-topbar">
        <div className="container sandbox-topbar-inner">
          <NavBrand href="/#projects" />
          <div className="sandbox-breadcrumb">SANDBOX / EC2 STANDALONE & REVERSE PROXY · v0.5.7</div>
          <a className="sandbox-back" href="/#projects">← back to projects</a>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <header className="sandbox-hero section" style={{ paddingBottom: '24px' }}>
          <div className="container">
            <div className="sandbox-hero-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div className="sandbox-hero-title">
                <div className="kicker" style={{ marginBottom: '8px' }}>
                  <span className="kicker-dot" /> AWS EC2 · Networking & Security Architecture
                </div>
                <h1 style={{ fontSize: 'clamp(28px, 4.5vw, 44px)', letterSpacing: '-0.04em', margin: '0 0 10px' }}>
                  Hosting Standalone Website on AWS EC2
                </h1>
                <p style={{ maxWidth: '820px', color: 'var(--muted)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                  A comprehensive engineering guide and interactive laboratory exploring how to host multi-service web applications on a single AWS EC2 instance — securely routing traffic through an Apache/Caddy reverse proxy, isolating backend sockets to loopback, eliminating public IP coupling, and securing administrative access with SSH ProxyJump.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <a
                  className="button primary"
                  href="https://medium.com/@ngn22666/hosting-a-standalone-demo-website-on-aws-ec2-securely-with-a-reverse-proxy-e0e0914bda19?sharedUserId=ngn22666"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read on Medium ↗
                </a>
                <span className="sandbox-status success" style={{ background: 'rgba(79,209,197,0.06)', border: '1px solid rgba(79,209,197,0.3)' }}>
                  <span /> Architecture: Production-Ready
                </span>
                <span className="tag" style={{ border: '1px solid var(--line)', background: 'var(--panel)', padding: '6px 12px', fontSize: '11px', color: 'var(--amber)' }}>
                  EC2 t3.micro · Ubuntu 24.04 LTS
                </span>
              </div>
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
              <a
                href="https://medium.com/@ngn22666/hosting-a-standalone-demo-website-on-aws-ec2-securely-with-a-reverse-proxy-e0e0914bda19?sharedUserId=ngn22666"
                target="_blank"
                rel="noreferrer"
                className="tab-btn"
                style={{ textDecoration: 'none' }}
              >
                📖 Complete Deep Dive on Medium ↗
              </a>
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
                🛡️ Security & Architecture Audit
              </button>
            </div>
          </div>
        </header>

        {/* TAB 1: INTERACTIVE SIMULATOR */}
        {activeTab === 'simulator' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              {/* Architecture Mode Selector */}
              <div className="standalone-card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span className="control-label" style={{ display: 'block', marginBottom: '4px' }}>Standalone Architecture Pattern Selection</span>
                  <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                    {archMode === 'naive' && '⚠️ Anti-Pattern: Direct Multi-Port Exposure (All Ports Public)'}
                    {archMode === 'proxy' && '🔒 Recommended: Reverse Proxy with Localhost Isolation (Ports 80/443 Only)'}
                  </strong>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`button ${archMode === 'naive' ? 'primary' : ''}`}
                    style={{ fontSize: '11px', padding: '6px 14px' }}
                    onClick={() => setArchMode('naive')}
                  >
                    1. Direct Exposure (Anti-Pattern)
                  </button>
                  <button
                    type="button"
                    className={`button ${archMode === 'proxy' ? 'primary' : ''}`}
                    style={{ fontSize: '11px', padding: '6px 14px' }}
                    onClick={() => setArchMode('proxy')}
                  >
                    2. Reverse Proxy (Recommended)
                  </button>
                  <span
                    className="tag"
                    title="Multi-EC2 load balancing and Docker container scaling will be introduced in an upcoming microservices project"
                    style={{
                      fontSize: '10px',
                      opacity: 0.6,
                      border: '1px dashed var(--line)',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '5px 10px',
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    🔒 Multi-EC2 & Docker (Masked for Scaling Project)
                  </span>
                </div>
              </div>

              {/* Simulation Controls: Request Scenarios */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="control-label" style={{ margin: 0 }}>
                    Select an incoming traffic scenario to simulate:
                  </span>
                  <span
                    className="tag"
                    style={{
                      fontSize: '10px',
                      color:
                        archMode === 'naive'
                          ? 'var(--red)'
                          : archMode === 'proxy'
                            ? 'var(--teal)'
                            : archMode === 'alb'
                              ? 'var(--amber)'
                              : '#a78bfa',
                      border: `1px solid ${
                        archMode === 'naive'
                          ? 'var(--red)'
                          : archMode === 'proxy'
                            ? 'var(--teal)'
                            : archMode === 'alb'
                              ? 'var(--amber)'
                              : '#a78bfa'
                      }40`,
                      background: 'rgba(7, 12, 19, 0.85)',
                      padding: '4px 10px',
                    }}
                  >
                    {archMode === 'naive' && '⚠️ Anti-Pattern Mode: Direct Exposed Public Ports'}
                    {archMode === 'proxy' && '🔒 Reverse Proxy Mode: Single 80/443 Entry & Loopback'}
                    {archMode === 'alb' && '🌐 Stage 2 ALB Mode: Multi-AZ Round-Robin & Failover'}
                    {archMode === 'containers' && '🐳 Stage 3 Container Mode: ECS Fargate & RDS Proxy'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                  {Object.values(scenarios).map((scenario) => {
                    const isDanger =
                      archMode === 'naive'
                        ? scenario.id.includes('attack') || scenario.id === 'db-attack'
                        : scenario.id.includes('attack')
                    return (
                      <button
                        key={scenario.id}
                        type="button"
                        onClick={() => setSelectedReq(scenario.id)}
                        className={`standalone-scenario-btn ${selectedReq === scenario.id ? 'active' : ''} ${isDanger ? 'is-attack' : ''}`}
                      >
                        <span className="method-pill">{scenario.method}</span>
                        <strong>{scenario.label}</strong>
                        <small>{scenario.url}</small>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* High-Fidelity SVG Topology Map with Animated Packet Flows */}
              <div style={{ marginBottom: '24px' }}>
                <StandaloneTopologyMap
                  archMode={archMode}
                  selectedTraffic={selectedReq}
                  onSelectTraffic={(type) => setSelectedReq(type as SimRequest)}
                  onSelectArchMode={(mode) => setArchMode(mode)}
                />
              </div>

              {/* Lower Inspection Grid: Terminal Trace + Socket Interface Status */}
              <div className="standalone-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                {/* Live Inspection Terminal */}
                <div className="hero-terminal" style={{ margin: 0, height: '100%', minHeight: '420px' }}>
                  <div className="term-bar">
                    <span className="term-dot" />
                    <span className="term-dot" />
                    <span className="term-dot" />
                    <span className="term-title">packet-trace / {archMode} / {selectedReq}</span>
                  </div>
                  <div className="term-body" style={{ fontSize: '11px', lineHeight: '1.6' }}>
                    <div style={{ color: 'var(--amber)', marginBottom: '8px' }}>
                      # [{archMode.toUpperCase()}] TRAFFIC SIMULATION: {req.method} {req.url}
                    </div>

                    <div style={{ borderLeft: '2px solid var(--line)', paddingLeft: '8px', marginBottom: '10px' }}>
                      <div className="term-faint">CLIENT ➔ NETWORK INGRESS:</div>
                      <div>Destination Target: <strong>{req.url}</strong></div>
                      <div>Port Requested: <strong>TCP/{req.targetPort || 'MULTI'}</strong></div>
                      <div>Source IP: {selectedReq.includes('attack') ? '198.51.100.250 (Untrusted Scanner / Attacker)' : '203.0.113.42 (Legitimate User Client)'}</div>
                    </div>

                    {archMode === 'naive' && (
                      <>
                        <div style={{ borderLeft: '2px solid var(--red)', paddingLeft: '8px', marginBottom: '10px' }}>
                          <div className="term-faint">AWS SECURITY GROUP (PERMISSIVE 0.0.0.0/0 GATE):</div>
                          <div>Rule Target: Inbound TCP/{req.targetPort} from 0.0.0.0/0</div>
                          <div>Verdict: <span className="term-fail">ALLOW [UNPROTECTED: Port open to world!]</span></div>
                        </div>

                        <div style={{ borderLeft: '2px solid var(--red)', paddingLeft: '8px', marginBottom: '10px' }}>
                          <div className="term-faint">RAW HOST PROCESS BINDING (eth0):</div>
                          <div>Reverse Proxy: <span className="term-fail">NONE (Direct Process Access)</span></div>
                          <div>Target Process: <strong>{req.internalTarget}</strong></div>
                          <div>Traffic Verdict: <span className="term-fail">{req.responseStatus}</span></div>
                        </div>
                      </>
                    )}

                    {archMode === 'proxy' && (
                      <>
                        <div style={{ borderLeft: `2px solid ${req.securityGroupDecision === 'ALLOW' ? 'var(--teal)' : 'var(--red)'}`, paddingLeft: '8px', marginBottom: '10px' }}>
                          <div className="term-faint">AWS SECURITY GROUP (L4 HYPERVISOR GATE):</div>
                          <div>Rule Target: Inbound TCP/{req.targetPort}</div>
                          <div>
                            Verdict:&nbsp;
                            {req.securityGroupDecision === 'ALLOW' ? (
                              <span className="term-ok">ALLOW [Matched rule: TCP/{req.targetPort} from 0.0.0.0/0]</span>
                            ) : (
                              <span className="term-fail">DROP [DEFAULT DENY: Port {req.targetPort} closed to external internet]</span>
                            )}
                          </div>
                        </div>

                        {req.securityGroupDecision === 'ALLOW' ? (
                          <>
                            <div style={{ borderLeft: '2px solid var(--teal)', paddingLeft: '8px', marginBottom: '10px' }}>
                              <div className="term-faint">REVERSE PROXY (LAYER 7 ROUTING):</div>
                              <div>Host Header: demo.example.com</div>
                              <div>Matched Directive: <span className="term-ok">{req.proxyAction}</span></div>
                              <div>Internal Socket: <strong>{req.internalTarget}</strong></div>
                            </div>

                            <div style={{ borderLeft: '2px solid var(--teal)', paddingLeft: '8px', marginBottom: '10px' }}>
                              <div className="term-faint">LINUX LOOPBACK SOCKET DISPATCH (lo):</div>
                              <div>Socket Binding: <span className="term-ok">127.0.0.1 (Loopback interface)</span></div>
                              <div>External NIC Transversal: <strong>0 bytes</strong></div>
                              <div>Response Status: <span className="term-ok">{req.responseStatus}</span></div>
                            </div>
                          </>
                        ) : (
                          <div style={{ borderLeft: '2px solid var(--red)', paddingLeft: '8px', marginBottom: '10px' }}>
                            <div className="term-faint">FIREWALL DEFLECTION:</div>
                            <div className="term-fail">TCP SYN packet terminated at AWS hypervisor boundary.</div>
                            <div className="term-fail">Zero packets enter the EC2 network interface (eth0).</div>
                            <div>Target Status: <span className="term-ok">127.0.0.1:5432 / 127.0.0.1:8000 safely isolated</span></div>
                          </div>
                        )}
                      </>
                    )}

                    {archMode === 'alb' && (
                      <>
                        <div style={{ borderLeft: '2px solid var(--teal)', paddingLeft: '8px', marginBottom: '10px' }}>
                          <div className="term-faint">ROUTE 53 & AWS APPLICATION LOAD BALANCER:</div>
                          <div>DNS Target: dualstack.demo-alb-12345.us-east-1.elb.amazonaws.com</div>
                          <div>TLS Offloading: <span className="term-ok">ACM Certificate (demo.example.com - Automated Renewal)</span></div>
                          <div>Routing Action: <span className="term-ok">{req.proxyAction}</span></div>
                          <div>Selected Target: <strong>{req.internalTarget}</strong></div>
                        </div>

                        <div style={{ borderLeft: '2px solid var(--teal)', paddingLeft: '8px', marginBottom: '10px' }}>
                          <div className="term-faint">VPC PRIVATE FLEET & MULTI-AZ REPLICATION:</div>
                          <div>Subnet Isolation: <span className="term-ok">EC2 SG only allows ALB SG (No public IPs)</span></div>
                          <div>Database State: <span className="term-ok">Amazon RDS Multi-AZ Synchronous Replication</span></div>
                          <div>Response Status: <span className="term-ok">{req.responseStatus}</span></div>
                        </div>
                      </>
                    )}

                    {archMode === 'containers' && (
                      <>
                        <div style={{ borderLeft: '2px solid #a78bfa', paddingLeft: '8px', marginBottom: '10px' }}>
                          <div className="term-faint">ALB PATH ROUTING & DYNAMIC TARGET GROUP (awsvpc):</div>
                          <div>Path Matcher: <span className="term-ok">{req.proxyAction}</span></div>
                          <div>Target Instance: <strong>{req.internalTarget}</strong></div>
                          <div>Task Status: <span className="term-ok">ECS Task RUNNING · 0.25 vCPU · 512MB RAM</span></div>
                        </div>

                        <div style={{ borderLeft: '2px solid #38bdf8', paddingLeft: '8px', marginBottom: '10px' }}>
                          <div className="term-faint">AMAZON RDS PROXY CONNECTION POOL:</div>
                          <div>Proxy Host: demo-db.proxy-xyz.rds.amazonaws.com:5432</div>
                          <div>Connection Pooling: <span className="term-ok">50 Container Worker Conns ➔ 5 Physical DB Sockets</span></div>
                          <div>Response Status: <span className="term-ok">{req.responseStatus}</span></div>
                        </div>
                      </>
                    )}

                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--line)', color: 'var(--muted)' }}>
                      💡 <strong style={{ color: 'var(--text)' }}>Engineering Rule:</strong> {req.details}
                    </div>
                  </div>
                </div>

                {/* Host Socket & Interface Verification Panel */}
                <div className="standalone-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className="control-label">
                      {archMode === 'naive' && 'Unprotected Host Socket State'}
                      {archMode === 'proxy' && 'Hardened Host Network Verification'}
                      {archMode === 'alb' && 'ALB Target Group & Fleet Status'}
                      {archMode === 'containers' && 'ECS Fargate Fleet & RDS Proxy'}
                    </span>
                    <span
                      className="tag"
                      style={{
                        fontSize: '9px',
                        color:
                          archMode === 'naive'
                            ? 'var(--red)'
                            : archMode === 'proxy'
                              ? 'var(--teal)'
                              : archMode === 'alb'
                                ? 'var(--amber)'
                                : '#a78bfa',
                      }}
                    >
                      {archMode === 'naive' && 'ss -tulpn (DANGER)'}
                      {archMode === 'proxy' && 'ss -tulpn output'}
                      {archMode === 'alb' && 'ALB TargetHealth API'}
                      {archMode === 'containers' && 'ECS Task List + RDS Proxy'}
                    </span>
                  </div>

                  {archMode === 'naive' && (
                    <>
                      <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--red)' }}>
                        ⚠️ Insecure: All Processes Listening on 0.0.0.0
                      </strong>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                        In this naive anti-pattern, every internal daemon is directly bound to all interfaces. Anyone on the public internet can connect directly to internal ports:
                      </p>

                      <div className="guide-table-wrap" style={{ margin: '0 0 16px' }}>
                        <table className="guide-table" style={{ fontSize: '11px' }}>
                          <thead>
                            <tr>
                              <th>Interface</th>
                              <th>Port</th>
                              <th>Process</th>
                              <th>Public Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ background: 'rgba(255, 93, 93, 0.08)' }}>
                              <td><code>0.0.0.0</code></td>
                              <td><code>5173</code></td>
                              <td>vite dev server</td>
                              <td><span className="danger-chip">EXPOSED DEV</span></td>
                            </tr>
                            <tr style={{ background: 'rgba(255, 93, 93, 0.08)' }}>
                              <td><code>0.0.0.0</code></td>
                              <td><code>8000</code></td>
                              <td>uvicorn (FastAPI)</td>
                              <td><span className="danger-chip">EXPOSED API</span></td>
                            </tr>
                            <tr style={{ background: 'rgba(255, 93, 93, 0.08)' }}>
                              <td><code>0.0.0.0</code></td>
                              <td><code>8001</code></td>
                              <td>node (service-2)</td>
                              <td><span className="danger-chip">FIREWALL HOLE</span></td>
                            </tr>
                            <tr style={{ background: 'rgba(255, 93, 93, 0.16)' }}>
                              <td><code>0.0.0.0</code></td>
                              <td><code>5432</code></td>
                              <td>postgres</td>
                              <td><span className="danger-chip">CRITICAL BREACH</span></td>
                            </tr>
                            <tr style={{ background: 'rgba(255, 93, 93, 0.08)' }}>
                              <td><code>0.0.0.0</code></td>
                              <td><code>22</code></td>
                              <td>sshd</td>
                              <td><span className="danger-chip">BRUTE-FORCE RISK</span></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="guide-box" style={{ margin: 0, padding: '12px', background: 'rgba(255, 93, 93, 0.1)', borderLeft: '3px solid var(--red)' }}>
                        <strong style={{ fontSize: '11.5px', color: 'var(--red)', marginBottom: '4px' }}>
                          Security Warning:
                        </strong>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 }}>
                          Port scanners discover port 5432 in seconds. Never run production databases with <code>listen_addresses = '*'</code> or open database ports in AWS security groups.
                        </p>
                      </div>
                    </>
                  )}

                  {archMode === 'proxy' && (
                    <>
                      <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
                        Listening Sockets on the EC2 Host
                      </strong>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                        Notice the critical difference between the <strong>public reverse proxy</strong> listening on <code>0.0.0.0</code> and the <strong>backend services</strong> strictly bound to <code>127.0.0.1</code>:
                      </p>

                      <div className="guide-table-wrap" style={{ margin: '0 0 16px' }}>
                        <table className="guide-table" style={{ fontSize: '11px' }}>
                          <thead>
                            <tr>
                              <th>Interface</th>
                              <th>Port</th>
                              <th>Process</th>
                              <th>Public Access</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ background: 'rgba(79, 209, 197, 0.04)' }}>
                              <td><code>0.0.0.0</code></td>
                              <td><code>443</code></td>
                              <td>caddy / apache</td>
                              <td><span className="ok-chip">PUBLIC (Allowed)</span></td>
                            </tr>
                            <tr style={{ background: 'rgba(79, 209, 197, 0.04)' }}>
                              <td><code>0.0.0.0</code></td>
                              <td><code>80</code></td>
                              <td>caddy / apache</td>
                              <td><span className="ok-chip">PUBLIC (Allowed)</span></td>
                            </tr>
                            <tr>
                              <td><code>127.0.0.1</code></td>
                              <td><code>8000</code></td>
                              <td>uvicorn (FastAPI)</td>
                              <td><span className="tag" style={{ fontSize: '8px' }}>LOOPBACK ONLY</span></td>
                            </tr>
                            <tr>
                              <td><code>127.0.0.1</code></td>
                              <td><code>8001</code></td>
                              <td>node (service-2)</td>
                              <td><span className="tag" style={{ fontSize: '8px' }}>LOOPBACK ONLY</span></td>
                            </tr>
                            <tr>
                              <td><code>127.0.0.1</code></td>
                              <td><code>5432</code></td>
                              <td>postgres</td>
                              <td><span className="tag" style={{ fontSize: '8px' }}>LOOPBACK ONLY</span></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="guide-box" style={{ margin: 0, padding: '12px', background: 'rgba(7, 12, 19, 0.7)' }}>
                        <strong style={{ fontSize: '11.5px', color: 'var(--amber)', marginBottom: '4px' }}>
                          Why packet flow doesn't touch the AWS Security Group internally:
                        </strong>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 }}>
                          When the reverse proxy communicates with <code>127.0.0.1:8000</code> or <code>127.0.0.1:5432</code>, the Linux kernel routes packets over the virtual loopback adapter (<code>lo</code>). Packets never enter the AWS virtual network interface (<code>eth0</code>), which is where Security Group rules are enforced.
                        </p>
                      </div>
                    </>
                  )}

                  {archMode === 'alb' && (
                    <>
                      <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
                        Target Group Health & Multi-AZ Nodes
                      </strong>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                        AWS ALB continuously health-checks registered EC2 instances across multiple Availability Zones in private subnets:
                      </p>

                      <div className="guide-table-wrap" style={{ margin: '0 0 16px' }}>
                        <table className="guide-table" style={{ fontSize: '11px' }}>
                          <thead>
                            <tr>
                              <th>Node / Resource</th>
                              <th>Zone</th>
                              <th>Private IP</th>
                              <th>Target Health</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ background: 'rgba(79, 209, 197, 0.04)' }}>
                              <td>EC2 Node 1</td>
                              <td>us-east-1a</td>
                              <td><code>10.0.1.15:80</code></td>
                              <td><span className="ok-chip">HEALTHY (50%)</span></td>
                            </tr>
                            <tr style={{ background: 'rgba(232, 163, 61, 0.04)' }}>
                              <td>EC2 Node 2</td>
                              <td>us-east-1b</td>
                              <td><code>10.0.2.28:80</code></td>
                              <td><span className="ok-chip">HEALTHY (50%)</span></td>
                            </tr>
                            <tr>
                              <td>PostgreSQL Primary</td>
                              <td>us-east-1a</td>
                              <td><code>10.0.1.200:5432</code></td>
                              <td><span className="tag" style={{ fontSize: '8px' }}>WRITABLE</span></td>
                            </tr>
                            <tr>
                              <td>PostgreSQL Standby</td>
                              <td>us-east-1b</td>
                              <td><code>10.0.2.200:5432</code></td>
                              <td><span className="tag" style={{ fontSize: '8px' }}>SYNC REPLICA</span></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="guide-box" style={{ margin: 0, padding: '12px', background: 'rgba(7, 12, 19, 0.7)' }}>
                        <strong style={{ fontSize: '11.5px', color: 'var(--amber)', marginBottom: '4px' }}>
                          Multi-AZ High Availability Advantage:
                        </strong>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 }}>
                          If an entire AWS data center experiences a power failure, the ALB instantly drops the failing target and steers 100% of user traffic to AZ-1b with zero downtime.
                        </p>
                      </div>
                    </>
                  )}

                  {archMode === 'containers' && (
                    <>
                      <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
                        ECS Fargate Tasks & RDS Connection Pool
                      </strong>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                        Serverless container tasks dynamically allocated with granular fractional hardware and managed DB connection pooling:
                      </p>

                      <div className="guide-table-wrap" style={{ margin: '0 0 16px' }}>
                        <table className="guide-table" style={{ fontSize: '11px' }}>
                          <thead>
                            <tr>
                              <th>Task / Container</th>
                              <th>Hardware</th>
                              <th>awsvpc Private IP</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ background: 'rgba(167, 139, 250, 0.05)' }}>
                              <td>Task A (FastAPI v1.4)</td>
                              <td>0.25 vCPU · 512MB</td>
                              <td><code>10.0.1.42:8000</code></td>
                              <td><span className="ok-chip">RUNNING</span></td>
                            </tr>
                            <tr style={{ background: 'rgba(167, 139, 250, 0.05)' }}>
                              <td>Task B (FastAPI v1.4)</td>
                              <td>0.25 vCPU · 512MB</td>
                              <td><code>10.0.2.88:8000</code></td>
                              <td><span className="ok-chip">RUNNING</span></td>
                            </tr>
                            <tr style={{ background: 'rgba(232, 163, 61, 0.05)' }}>
                              <td>Task C (Farm v1.4)</td>
                              <td>0.25 vCPU · 512MB</td>
                              <td><code>10.0.1.75:8001</code></td>
                              <td><span className="ok-chip">RUNNING</span></td>
                            </tr>
                            <tr style={{ background: 'rgba(56, 189, 248, 0.05)' }}>
                              <td>RDS Proxy Pool</td>
                              <td>Managed Proxy</td>
                              <td><code>demo-db.proxy-xyz</code></td>
                              <td><span className="tag" style={{ fontSize: '8px' }}>50 ➔ 5 DB Sockets</span></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="guide-box" style={{ margin: 0, padding: '12px', background: 'rgba(7, 12, 19, 0.7)' }}>
                        <strong style={{ fontSize: '11.5px', color: 'var(--amber)', marginBottom: '4px' }}>
                          Why RDS Proxy is required for container scaling:
                        </strong>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 }}>
                          As ECS scales tasks horizontally from 2 to 20, RDS Proxy multiplexes hundreds of short-lived container connections into a stable, persistent pool, protecting PostgreSQL from memory exhaustion.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: COMPLETE TECHNICAL DEEP DIVE (THE FULL ARTICLE) */}
        {activeTab === 'guide' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              <div className="standalone-guide-layout" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px' }}>
                {/* Table of Contents Sticky Sidebar */}
                <aside className="guide-toc-sidebar" style={{ position: 'sticky', top: '80px', height: 'fit-content' }}>
                  <div className="toc-card" style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', background: 'var(--panel)' }}>
                    <span className="control-label" style={{ display: 'block', marginBottom: '12px' }}>Table of Contents</span>
                    <nav className="toc-nav" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        { id: 'intro', label: 'Introduction' },
                        { id: 'sec-1', label: '1. Initial Architecture' },
                        { id: 'sec-2', label: '2. The Reverse Proxy' },
                        { id: 'sec-3', label: '3. Layer 7 Routing Logic' },
                        { id: 'sec-4', label: '4. Loopback Security Magic' },
                        { id: 'sec-5', label: '5. Security Groups & Bastion' },
                        { id: 'sec-6', label: '6. Zero Public IP Coupling' },
                        { id: 'sec-7', label: '7. Vite Static Build vs Dev' },
                        { id: 'sec-8', label: '8. Why Consider Caddy?' },
                        { id: 'sec-9', label: '9. Reverse Proxy vs AWS ALB' },
                        { id: 'sec-10', label: '10. Final Architecture & Benefits' },
                        { id: 'conclusion', label: 'Conclusion' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`toc-link ${activeGuideSection === item.id ? 'active' : ''}`}
                          onClick={() => {
                            setActiveGuideSection(item.id)
                            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </nav>
                  </div>
                </aside>

                {/* Full Article Content */}
                <article className="guide-article-body" style={{ maxWidth: '820px' }}>
                  {/* Article Title */}
                  <header style={{ marginBottom: '32px', borderBottom: '1px solid var(--line)', paddingBottom: '24px' }}>
                    <div className="kicker" style={{ marginBottom: '10px' }}>Standalone AWS Deployment Architecture</div>
                    <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.2, letterSpacing: '-0.04em', margin: '0 0 16px' }}>
                      Hosting a Standalone Demo Website on AWS EC2 — Securely with a Reverse Proxy
                    </h1>
                    <div style={{ display: 'flex', gap: '16px', color: 'var(--faint)', fontSize: '12px', fontFamily: 'var(--mono)', marginBottom: '20px' }}>
                      <span>AUTHOR: Neehara Nellikala</span>
                      <span>·</span>
                      <span>CATEGORY: AWS / Cloud Networking / DevOps</span>
                      <span>·</span>
                      <span>READ TIME: 8 MIN</span>
                    </div>

                    <div className="callout callout-tip" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', margin: 0 }}>
                      <div>
                        <strong style={{ fontSize: '13.5px' }}>Full Article Published on Medium</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Read the complete illustrated publication with real-world engineering takeaways.
                        </p>
                      </div>
                      <a
                        className="button primary"
                        href="https://medium.com/@ngn22666/hosting-a-standalone-demo-website-on-aws-ec2-securely-with-a-reverse-proxy-e0e0914bda19?sharedUserId=ngn22666"
                        target="_blank"
                        rel="noreferrer"
                        style={{ padding: '7px 16px', fontSize: '11.5px' }}
                      >
                        Open on Medium ↗
                      </a>
                    </div>
                  </header>

                  {/* Introduction */}
                  <section id="intro" className="guide-section">
                    <h2>Introduction</h2>
                    <p>
                      What starts as a simple requirement — <em>"I just want to host a standalone webpage on an EC2 instance"</em> — can quickly turn into an interesting networking and security exercise.
                    </p>
                    <p>
                      Imagine having a frontend, multiple backend services, a database, and monitoring tools running on a single EC2 instance.
                    </p>
                    <div className="guide-box">
                      <strong>Everything works locally:</strong>
                      <ul>
                        <li>Frontend running on port <code>5173</code></li>
                        <li>Backend API running on port <code>8000</code></li>
                        <li>Another service running on port <code>8001</code></li>
                        <li>PostgreSQL running on port <code>5432</code></li>
                        <li>Apache serving a test webpage on port <code>80</code></li>
                      </ul>
                    </div>
                    <p>
                      But how do we make these applications accessible over the internet without exposing every application port? More importantly, how do we do it without hardcoding changing public IP addresses into application configuration files?
                    </p>
                    <p>
                      That's where reverse proxies come into the picture. In this blog, we'll explore how to host a standalone demo webpage on AWS EC2 using a reverse proxy, secure application ports, configure DNS, and establish a clean communication flow between services.
                    </p>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 1 */}
                  <section id="sec-1" className="guide-section">
                    <h2>1. The Initial Architecture</h2>
                    <p>For our demonstration, we started with an EC2 instance running multiple services:</p>

                    <div className="guide-table-wrap">
                      <table className="guide-table">
                        <thead>
                          <tr>
                            <th>Service</th>
                            <th>Port</th>
                            <th>Purpose</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>React / Vite frontend</td>
                            <td><code>5173</code></td>
                            <td>User interface</td>
                          </tr>
                          <tr>
                            <td>Backend API</td>
                            <td><code>8000</code></td>
                            <td>Application logic</td>
                          </tr>
                          <tr>
                            <td>Secondary backend</td>
                            <td><code>8001</code></td>
                            <td>Another application</td>
                          </tr>
                          <tr>
                            <td>Apache</td>
                            <td><code>80</code></td>
                            <td>Web server</td>
                          </tr>
                          <tr>
                            <td>PostgreSQL</td>
                            <td><code>5432</code></td>
                            <td>Database</td>
                          </tr>
                          <tr>
                            <td>Redis</td>
                            <td><code>6379</code></td>
                            <td>Cache</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p>Initially, accessing these applications externally would mean opening multiple ports in the EC2 security group:</p>
                    <pre className="code-block">
                      <code>{`http://EC2_PUBLIC_IP:5173
http://EC2_PUBLIC_IP:8000
http://EC2_PUBLIC_IP:8001
http://EC2_PUBLIC_IP:9090`}</code>
                    </pre>

                    <div className="callout callout-warning">
                      <strong>Why this approach is problematic:</strong>
                      <ul>
                        <li><strong>Larger attack surface:</strong> Every open port is a direct target for automated port scanners and brute-force bots.</li>
                        <li><strong>Direct service exposure:</strong> Backends and databases are exposed without Layer 7 protection or sanitization.</li>
                        <li><strong>Hardcoded public IPs:</strong> Frontend configs become coupled to changing EC2 public IP addresses.</li>
                        <li><strong>Complicated HTTPS:</strong> Every exposed port would need individual SSL certificate binding and configuration.</li>
                        <li><strong>Security group overhead:</strong> Constant maintenance of inbound firewall rules.</li>
                      </ul>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 2 */}
                  <section id="sec-2" className="guide-section">
                    <h2>2. Introducing the Reverse Proxy</h2>
                    <p>
                      Instead of exposing every application port, we introduced a reverse proxy. A reverse proxy acts as a single entry point between external clients and internal application services. Rather than allowing internet users to communicate directly with every application, we expose only the standard web entry ports (80 and 443).
                    </p>

                    <div className="ascii-diagram-card">
                      <span className="control-label">Layer 7 Reverse Proxy Traffic Topology</span>
                      <pre>
{`                 Internet
                     |
                     |
                DNS Resolution
                     |
                     v
               EC2 Public IP
                     |
                     v
               Reverse Proxy
                (Apache/Caddy)
                     |
          +----------+----------+
          |          |          |
          v          v          v
       Frontend   Backend    Backend 2
       :5173      :8000      :8001
          |
          |
       Database
       :5432`}
                      </pre>
                    </div>

                    <p>
                      The reverse proxy receives incoming HTTP/HTTPS requests and determines which internal service should handle each request based on URL paths:
                    </p>
                    <ul>
                      <li><code>https://demo.example.com</code> → Static Frontend</li>
                      <li><code>https://demo.example.com/api</code> → Backend API 1</li>
                      <li><code>https://demo.example.com/farm</code> → Secondary Backend</li>
                    </ul>
                    <p>
                      These URLs all point to the same public IP and use the standard HTTPS port (443). The reverse proxy handles all routing internally.
                    </p>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 3 */}
                  <section id="sec-3" className="guide-section">
                    <h2>3. Understanding How Reverse Proxy Routing Works</h2>
                    <p>
                      A reverse proxy operates at the application layer (Layer 7). Unlike basic Layer 4 network address translation, it understands HTTP requests, including the Hostname, URL path, HTTP method, and headers.
                    </p>
                    <p>Consider this request arriving at port 443:</p>
                    <pre className="code-block">
                      <code>{`GET /api/users HTTP/1.1
Host: demo.example.com`}</code>
                    </pre>

                    <p>The reverse proxy inspects the path and matches it against configured rules. In Apache:</p>
                    <pre className="code-block">
                      <code>{`ProxyPass /api/ http://127.0.0.1:8000/
ProxyPassReverse /api/ http://127.0.0.1:8000/

ProxyPass /farm/ http://127.0.0.1:8001/
ProxyPassReverse /farm/ http://127.0.0.1:8001/`}</code>
                    </pre>

                    <div className="guide-table-wrap">
                      <table className="guide-table">
                        <thead>
                          <tr>
                            <th>Public URL</th>
                            <th>Internal Destination</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><code>/api/</code></td>
                            <td><code>127.0.0.1:8000</code></td>
                          </tr>
                          <tr>
                            <td><code>/farm/</code></td>
                            <td><code>127.0.0.1:8001</code></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p>
                      The browser never needs to know the backend ports. An important detail: these Apache rules strip the matching prefixes in this example. Backend route definitions must account for that, or proxy rules can be configured to preserve the full path.
                    </p>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 4 */}
                  <section id="sec-4" className="guide-section">
                    <h2>4. Why We Don't Need to Open Every Port in the Security Group</h2>
                    <p>
                      This is the single most important networking concept in this architecture. Consider two separate connections:
                    </p>

                    <div className="guide-grid-two">
                      <div className="guide-box">
                        <span className="control-label">Connection 1: Browser to Reverse Proxy</span>
                        <pre style={{ margin: '8px 0' }}>{`Browser → EC2_PUBLIC_IP:443`}</pre>
                        <p style={{ margin: 0, fontSize: '12px' }}>
                          Arrives through the EC2 external network interface (eth0). The AWS Security Group <strong>must</strong> allow inbound HTTPS traffic.
                        </p>
                      </div>

                      <div className="guide-box">
                        <span className="control-label">Connection 2: Reverse Proxy to Backend</span>
                        <pre style={{ margin: '8px 0' }}>{`Reverse Proxy → 127.0.0.1:8000`}</pre>
                        <p style={{ margin: 0, fontSize: '12px' }}>
                          Uses the Linux loopback interface (lo). It never traverses the external interface and is <strong>not</strong> subject to AWS Security Group inbound rules!
                        </p>
                      </div>
                    </div>

                    <p>
                      This allows us to bind all internal services strictly to localhost (127.0.0.1):
                    </p>
                    <pre className="code-block">
                      <code>{`# Python / FastAPI
uvicorn main:app --host 127.0.0.1 --port 8000

# PostgreSQL in postgresql.conf
listen_addresses = '127.0.0.1'`}</code>
                    </pre>

                    <div className="callout callout-tip">
                      <strong>Key Architectural Distinction:</strong>
                      A reverse proxy does not automatically secure a backend. The backend must explicitly be configured to bind to <code>127.0.0.1</code> to prevent direct external socket binding!
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 5 */}
                  <section id="sec-5" className="guide-section">
                    <h2>5. Security Group Configuration & SSH Bastion</h2>
                    <p>
                      With the reverse proxy in place, the AWS security group configuration becomes dramatically simplified:
                    </p>

                    <h3>Website EC2 Security Group</h3>
                    <div className="guide-table-wrap">
                      <table className="guide-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Port</th>
                            <th>Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>HTTP</td>
                            <td><code>80</code></td>
                            <td><code>0.0.0.0/0</code></td>
                          </tr>
                          <tr>
                            <td>HTTPS</td>
                            <td><code>443</code></td>
                            <td><code>0.0.0.0/0</code></td>
                          </tr>
                          <tr>
                            <td>SSH</td>
                            <td><code>22</code></td>
                            <td>Bastion Security Group (sg-bastion)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p>
                      Notice: <strong>Zero</strong> public inbound rules exist for Vite (5173), Backend (8000), Backend 2 (8001), PostgreSQL (5432), or Redis (6379).
                    </p>

                    <h3>Bastion Security Group</h3>
                    <div className="guide-table-wrap">
                      <table className="guide-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Port</th>
                            <th>Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>SSH</td>
                            <td><code>22</code></td>
                            <td>Trusted Administrator IP <code>/32</code></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p>
                      To administer the server securely without exposing port 22 to the entire world, we used an SSH Bastion host with <code>ProxyJump</code>. This keeps private keys safely on the administrator's local machine rather than storing keys on the bastion.
                    </p>

                    <pre className="code-block">
                      <code>{`# ~/.ssh/config on administrator laptop
Host demo-bastion
    HostName BASTION_PUBLIC_IP
    User ubuntu
    IdentityFile ~/.ssh/bastion.pem

Host demo-web
    HostName WEB_PRIVATE_IP
    User ubuntu
    IdentityFile ~/.ssh/web.pem
    ProxyJump demo-bastion`}</code>
                    </pre>

                    <p>Connect with a single command:</p>
                    <pre className="code-block">
                      <code>ssh demo-web</code>
                    </pre>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 6 */}
                  <section id="sec-6" className="guide-section">
                    <h2>6. Eliminating Public IP Dependencies in Application Configuration</h2>
                    <p>
                      Another major issue in demo deployments is hardcoding public IPv4 addresses into <code>.env</code> files:
                    </p>
                    <pre className="code-block">
                      <code>{`# Fragile Anti-Pattern
VITE_API_URL=http://13.xx.xx.xx:8000
DATABASE_URL=postgresql://admin:password@13.xx.xx.xx:5432/farmdb`}</code>
                    </pre>
                    <p>
                      When an EC2 instance stops and restarts, its public IPv4 address changes, breaking the frontend build and database connections. We resolved this by decoupling internal and external communication:
                    </p>

                    <div className="guide-grid-two">
                      <div className="guide-box">
                        <span className="control-label">Frontend Configuration</span>
                        <pre style={{ margin: '8px 0' }}><code>VITE_API_URL=/api</code></pre>
                        <p style={{ margin: 0, fontSize: '12px' }}>
                          Frontend makes relative requests to the same origin: <code>https://demo.example.com/api/users</code>. The reverse proxy handles forwarding.
                        </p>
                      </div>

                      <div className="guide-box">
                        <span className="control-label">Backend Configuration</span>
                        <pre style={{ margin: '8px 0' }}><code>DATABASE_URL=postgresql://admin:PASS@127.0.0.1:5432/farmdb</code></pre>
                        <p style={{ margin: 0, fontSize: '12px' }}>
                          Connects directly over localhost. Zero dependency on public IPs!
                        </p>
                      </div>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 7 */}
                  <section id="sec-7" className="guide-section">
                    <h2>7. Hosting Static Frontend Files Instead of Running Vite in Production</h2>
                    <p>
                      During development, Vite typically runs on <code>localhost:5173</code>. For a public demo, however, running a development server continuously in production is an anti-pattern: it consumes unnecessary RAM and lacks production caching optimizations.
                    </p>
                    <p>Instead, we compile the frontend into static assets:</p>
                    <pre className="code-block">
                      <code>{`npm run build
# Generates the dist/ directory

sudo mkdir -p /var/www/demo
sudo rsync -av --delete dist/ /var/www/demo/`}</code>
                    </pre>
                    <p>
                      Apache or Caddy can now serve these static HTML, CSS, and JS files directly via high-performance OS file caching. For React SPAs, configure <code>try_files &#123;path&#125; /index.html</code> so client-side routing works seamlessly.
                    </p>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 8 */}
                  <section id="sec-8" className="guide-section">
                    <h2>8. Why We Considered Caddy</h2>
                    <p>
                      While Apache is reliable, we also evaluated Caddy. Caddy includes automated HTTPS via Let's Encrypt / ZeroSSL, reverse proxying, static file serving, and WebSocket support out of the box in a 10-line Caddyfile:
                    </p>

                    <pre className="code-block">
                      <code>{`demo.example.com {
    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }

    handle {
        root * /var/www/demo
        try_files {path} /index.html
        file_server
    }
}`}</code>
                    </pre>

                    <div className="callout callout-tip">
                      <strong>Best Practice:</strong>
                      Choose either Apache or Caddy based on your team's familiarity. Do not run both Apache and Caddy together on the same host for the same routing responsibility.
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 9 */}
                  <section id="sec-9" className="guide-section">
                    <h2>9. What About an AWS Application Load Balancer (ALB)?</h2>
                    <p>
                      An ALB is also a Layer 7 reverse proxy supporting host/path routing, ACM certificates, and health checks. However, for a single EC2 instance, an ALB adds unnecessary AWS hourly costs ($16-25+/month) without high-availability benefits.
                    </p>
                    <p>
                      The natural progression is:
                    </p>
                    <div className="ascii-diagram-card">
                      <pre>
{`Stage 1: Single EC2 Demo
Internet → Caddy / Apache → Internal Services

Stage 2: Production Multi-Instance Scale
Internet → AWS ALB → Target Group [EC2 1, EC2 2, EC2 3]`}
                      </pre>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Section 10 */}
                  <section id="sec-10" className="guide-section">
                    <h2>10. Final Architecture and Benefits</h2>
                    <div className="ascii-diagram-card">
                      <span className="control-label">Final Production Demo Architecture</span>
                      <pre>
{`                    Internet
                       |
                       v
                 Namecheap DNS
                       |
                       v
                  Elastic IP
                       |
                       v
                 AWS Security Group
                    80 / 443
                       |
                       v
                 Caddy / Apache
                       |
             +---------+---------+
             |         |         |
             v         v         v
          Frontend  Backend   Backend 2
          Static    8000      8001
          files
                       |
                       v
                   PostgreSQL
                     5432`}
                      </pre>
                    </div>

                    <div className="guide-box">
                      <strong>6 Core Architectural Benefits:</strong>
                      <ol>
                        <li><strong>Reduced attack surface:</strong> Database and backend ports are never exposed to public internet.</li>
                        <li><strong>Simplified DNS:</strong> A single stable Elastic IP and domain serves all applications and APIs.</li>
                        <li><strong>Cleaner configuration:</strong> Internal services use <code>127.0.0.1</code>; zero dependency on dynamic EC2 public IPs.</li>
                        <li><strong>Centralized HTTPS:</strong> TLS certificates managed at the reverse proxy boundary.</li>
                        <li><strong>Simpler deployments:</strong> New APIs added via config without touching AWS security groups.</li>
                        <li><strong>Clear separation:</strong> Public ingress decoupled from internal application communication.</li>
                      </ol>
                    </div>
                  </section>

                  <hr className="guide-divider" />

                  {/* Conclusion */}
                  <section id="conclusion" className="guide-section">
                    <h2>Conclusion</h2>
                    <p>
                      What started as a simple task of hosting a standalone webpage on EC2 turned into a practical lesson in networking, DNS, security groups, reverse proxies and application architecture.
                    </p>
                    <p>
                      The biggest takeaway: <strong>we don't need to expose every service to make an application accessible over the internet.</strong> We need a controlled entry point, sensible routing, and proper separation between public and internal communication.
                    </p>

                    <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)', marginTop: '20px' }}>
                      <strong>Looking Ahead: High-Availability & Containerization (Upcoming Project)</strong>
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                        While a single hardened EC2 instance with a reverse proxy is the optimal, cost-efficient blueprint for standalone websites and demos ($5–$10/month), future scale brings new challenges. When traffic demands zero downtime, auto-scaling, and microservice density, the architecture naturally advances into <strong>Multi-AZ Application Load Balancers</strong> and <strong>Docker containers on serverless AWS ECS Fargate</strong> with <strong>RDS Proxy</strong>. That multi-tier scaling progression will be explored in depth in an upcoming portfolio project!
                      </p>
                    </div>
                  </section>
                </article>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: PRODUCTION CONFIGS */}
        {activeTab === 'configs' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              <div className="standalone-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <span className="control-label" style={{ display: 'block', marginBottom: '4px' }}>Tested Configuration Blueprints</span>
                    <h2 style={{ fontSize: '20px', margin: 0 }}>Infrastructure & Proxy Configuration Files</h2>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'caddy' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('caddy')}
                    >
                      Caddyfile
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'apache' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('apache')}
                    >
                      Apache VirtualHost
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'ssh' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('ssh')}
                    >
                      ~/.ssh/config
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'env' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('env')}
                    >
                      .env Profiles
                    </button>
                    <button
                      type="button"
                      className={`button ${activeConfig === 'terraform' ? 'primary' : ''}`}
                      onClick={() => setActiveConfig('terraform')}
                    >
                      Terraform SG
                    </button>
                  </div>
                </div>

                {/* Config Code Display */}
                {activeConfig === 'caddy' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="term-faint">/etc/caddy/Caddyfile</span>
                      <button
                        type="button"
                        className="button"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(`demo.example.com {
    # Backend 1: API Routing
    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }

    # Backend 2: Secondary microservice
    handle /farm/* {
        reverse_proxy 127.0.0.1:8001
    }

    # Frontend: Static Vite build with SPA routing fallback
    handle {
        root * /var/www/demo
        try_files {path} /index.html
        file_server
    }
}`, 'caddy')}
                      >
                        {copiedKey === 'caddy' ? 'Copied ✓' : 'Copy Caddyfile'}
                      </button>
                    </div>
                    <pre className="code-block" style={{ margin: 0 }}>
                      <code>{`# /etc/caddy/Caddyfile
demo.example.com {
    # Backend 1: API Routing
    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }

    # Backend 2: Secondary microservice
    handle /farm/* {
        reverse_proxy 127.0.0.1:8001
    }

    # Frontend: Static Vite build with SPA routing fallback
    handle {
        root * /var/www/demo
        try_files {path} /index.html
        file_server
    }
}`}</code>
                    </pre>
                  </div>
                )}

                {activeConfig === 'apache' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="term-faint">/etc/apache2/sites-available/demo.conf</span>
                      <button
                        type="button"
                        className="button"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(`<VirtualHost *:443>
    ServerName demo.example.com
    DocumentRoot /var/www/demo

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/demo.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/demo.example.com/privkey.pem

    # Reverse proxy backend API
    ProxyPreserveHost On
    ProxyPass /api/ http://127.0.0.1:8000/
    ProxyPassReverse /api/ http://127.0.0.1:8000/

    # Reverse proxy secondary service
    ProxyPass /farm/ http://127.0.0.1:8001/
    ProxyPassReverse /farm/ http://127.0.0.1:8001/

    # Fallback to index.html for Single Page Application
    <Directory /var/www/demo>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ index.html [L]
    </Directory>
</VirtualHost>`, 'apache')}
                      >
                        {copiedKey === 'apache' ? 'Copied ✓' : 'Copy Apache Conf'}
                      </button>
                    </div>
                    <pre className="code-block" style={{ margin: 0 }}>
                      <code>{`<VirtualHost *:443>
    ServerName demo.example.com
    DocumentRoot /var/www/demo

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/demo.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/demo.example.com/privkey.pem

    # Reverse proxy backend API
    ProxyPreserveHost On
    ProxyPass /api/ http://127.0.0.1:8000/
    ProxyPassReverse /api/ http://127.0.0.1:8000/

    # Reverse proxy secondary service
    ProxyPass /farm/ http://127.0.0.1:8001/
    ProxyPassReverse /farm/ http://127.0.0.1:8001/

    # Fallback to index.html for Single Page Application
    <Directory /var/www/demo>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ index.html [L]
    </Directory>
</VirtualHost>`}</code>
                    </pre>
                  </div>
                )}

                {activeConfig === 'ssh' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="term-faint">~/.ssh/config</span>
                      <button
                        type="button"
                        className="button"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(`Host demo-bastion
    HostName BASTION_PUBLIC_IP
    User ubuntu
    IdentityFile ~/.ssh/bastion.pem

Host demo-web
    HostName 10.0.1.15
    User ubuntu
    IdentityFile ~/.ssh/web.pem
    ProxyJump demo-bastion`, 'ssh')}
                      >
                        {copiedKey === 'ssh' ? 'Copied ✓' : 'Copy SSH Config'}
                      </button>
                    </div>
                    <pre className="code-block" style={{ margin: 0 }}>
                      <code>{`# ~/.ssh/config on administrator workstation
Host demo-bastion
    HostName BASTION_PUBLIC_IP
    User ubuntu
    IdentityFile ~/.ssh/bastion.pem

Host demo-web
    HostName 10.0.1.15
    User ubuntu
    IdentityFile ~/.ssh/web.pem
    ProxyJump demo-bastion

# Connect with:
# ssh demo-web`}</code>
                    </pre>
                  </div>
                )}

                {activeConfig === 'env' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="term-faint">Frontend vs Backend .env</span>
                      <button
                        type="button"
                        className="button"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(`# FRONTEND: /app/frontend/.env.production
# Relative origin: avoids public IP coupling!
VITE_API_URL=/api

# BACKEND: /app/backend/.env
# Localhost loopback: never exposed externally!
HOST=127.0.0.1
PORT=8000
DATABASE_URL=postgresql://app_user:DB_SECRET@127.0.0.1:5432/app_db`, 'env')}
                      >
                        {copiedKey === 'env' ? 'Copied ✓' : 'Copy .env Files'}
                      </button>
                    </div>
                    <pre className="code-block" style={{ margin: 0 }}>
                      <code>{`# FRONTEND: /app/frontend/.env.production
# Relative origin: avoids public IP coupling!
VITE_API_URL=/api

# BACKEND: /app/backend/.env
# Localhost loopback: never exposed externally!
HOST=127.0.0.1
PORT=8000
DATABASE_URL=postgresql://app_user:DB_SECRET@127.0.0.1:5432/app_db`}</code>
                    </pre>
                  </div>
                )}

                {activeConfig === 'terraform' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="term-faint">security-groups.tf</span>
                      <button
                        type="button"
                        className="button"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(`resource "aws_security_group" "web" {
  name        = "demo-web-sg"
  description = "Allows only HTTP/S and SSH from bastion"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`, 'terraform')}
                      >
                        {copiedKey === 'terraform' ? 'Copied ✓' : 'Copy Terraform'}
                      </button>
                    </div>
                    <pre className="code-block" style={{ margin: 0 }}>
                      <code>{`resource "aws_security_group" "web" {
  name        = "demo-web-sg"
  description = "Allows only HTTP/S and SSH from bastion"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: SECURITY AUDIT & COMPARISON */}
        {activeTab === 'security' && (
          <section className="section" style={{ paddingTop: '16px' }}>
            <div className="container">
              <div className="standalone-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Attack Surface Reduction Matrix */}
                <div className="standalone-card" style={{ padding: '24px' }}>
                  <span className="control-label" style={{ display: 'block', marginBottom: '8px' }}>Security Audit</span>
                  <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Attack Surface Reduction: 66% Fewer Ports</h3>

                  <div className="guide-table-wrap">
                    <table className="guide-table">
                      <thead>
                        <tr>
                          <th>Vector</th>
                          <th>Naive Architecture</th>
                          <th>Reverse Proxy Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Public Ports</strong></td>
                          <td><span className="danger-chip">6 Ports Open</span></td>
                          <td><span className="ok-chip">2 Ports Open (80/443)</span></td>
                        </tr>
                        <tr>
                          <td><strong>PostgreSQL (:5432)</strong></td>
                          <td><span className="danger-chip">Public (0.0.0.0/0)</span></td>
                          <td><span className="ok-chip">127.0.0.1 Loopback</span></td>
                        </tr>
                        <tr>
                          <td><strong>FastAPI (:8000)</strong></td>
                          <td><span className="danger-chip">Directly Exposed</span></td>
                          <td><span className="ok-chip">Internal L7 Routing</span></td>
                        </tr>
                        <tr>
                          <td><strong>SSH Management</strong></td>
                          <td><span className="danger-chip">Port 22 Open to World</span></td>
                          <td><span className="ok-chip">Bastion SG + ProxyJump</span></td>
                        </tr>
                        <tr>
                          <td><strong>TLS Management</strong></td>
                          <td>Fragmented / Unencrypted</td>
                          <td><span className="ok-chip">Centralized Let's Encrypt</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Caveats & Operational Tradeoffs */}
                <div className="standalone-card" style={{ padding: '24px' }}>
                  <span className="control-label" style={{ display: 'block', marginBottom: '8px' }}>Operational Reality</span>
                  <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Single Point of Failure & Mitigations</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="guide-box" style={{ borderLeft: '3px solid var(--amber)' }}>
                      <strong>1. Single EC2 Instance Failure</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                        If the host crashes or AWS hardware degrades, all services go down.
                        <br />
                        <span style={{ color: 'var(--text)' }}>→ Mitigation:</span> Upgrade to Stage 2 with AWS Application Load Balancer across multi-AZ Auto Scaling Groups.
                      </p>
                    </div>

                    <div className="guide-box" style={{ borderLeft: '3px solid var(--amber)' }}>
                      <strong>2. Reverse Proxy Overhead</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                        If Apache or Caddy process crashes, external entry stops.
                        <br />
                        <span style={{ color: 'var(--text)' }}>→ Mitigation:</span> Manage reverse proxy via systemd with <code>Restart=always</code> and enable CloudWatch process monitoring.
                      </p>
                    </div>

                    <div className="guide-box" style={{ borderLeft: '3px solid var(--teal)' }}>
                      <strong>3. Application-Level Security</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                        A reverse proxy restricts network exposure, but APIs still require JWT/session authentication, rate limiting, and CORS headers.
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
