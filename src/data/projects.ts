import type { Stage } from '../types/simulation'

export type Project = {
  id: string
  index: string
  title: string
  subtitle: string
  description: string
  tags: string[]
  stages: Stage[]
}

export const projects: Project[] = [
  {
    id: 'progressive',
    index: '01',
    title: 'Progressive Delivery on Kubernetes',
    subtitle: 'Canary releases with service-mesh traffic control, automated analysis and rollback.',
    description:
      'A reusable deployment flow inspired by the Kubernetes + Istio + Flagger + Argo CD work in the portfolio: commit, build, package, sync, split traffic, observe, decide, then promote or recover.',
    tags: ['Kubernetes', 'Istio', 'Flagger', 'Argo CD', 'Jenkins', 'Helm', 'Prometheus'],
    stages: [
      { id: 'github', name: 'GitHub', detail: 'commit', short: 'GH' },
      { id: 'jenkins', name: 'Jenkins', detail: 'build', short: 'CI' },
      { id: 'helm', name: 'Helm', detail: 'package', short: 'H' },
      { id: 'argocd', name: 'Argo CD', detail: 'sync', short: 'CD' },
      { id: 'istio', name: 'Istio', detail: 'traffic split', short: 'I' },
      { id: 'prom', name: 'Prometheus', detail: 'metrics', short: 'P' },
      { id: 'flagger', name: 'Flagger', detail: 'analysis', short: 'F' },
      { id: 'k8s', name: 'Kubernetes', detail: 'result', short: 'K8s' },
    ],
  },
  {
    id: 'cafe',
    index: '02',
    title: 'Café Dynamic Website on AWS',
    subtitle: 'Architecture evolution from static S3 hosting to HA AWS infrastructure, secure serverless reporting and repeatable infrastructure with CloudFormation.',
    description:
      'Explore the design trail from S3 static hosting to dynamic EC2, RDS, ALB + Auto Scaling, a least-privilege two-Lambda reporting workflow, CloudWatch operations and CloudFormation-based infrastructure replication — with the reason each choice was introduced.',
    tags: ['AWS', 'EC2', 'RDS', 'VPC', 'ALB', 'ASG', 'Lambda', 'SNS', 'CloudWatch', 'CloudFormation'],
    stages: [
      { id: 'client', name: 'Users', detail: 'requests', short: 'U' },
      { id: 'alb', name: 'ALB', detail: 'public entry', short: 'LB' },
      { id: 'ec2', name: 'EC2 / ASG', detail: 'web tier', short: 'EC2' },
      { id: 'rds', name: 'RDS', detail: 'private data', short: 'DB' },
      { id: 'lambda1', name: 'Lambda 1', detail: 'read + process', short: 'L1' },
      { id: 'lambda2', name: 'Lambda 2', detail: 'format + SNS', short: 'L2' },
      { id: 'sns', name: 'SNS', detail: 'notify', short: 'SN' },
      { id: 'cloudwatch', name: 'CloudWatch', detail: 'observe', short: 'CW' },
      { id: 'cloudformation', name: 'CloudFormation', detail: 'replicate infra', short: 'CFN' },
    ],
  },

  {
    id: 'collegefest',
    index: '03',
    title: 'CollegeFest Deployment Flow',
    subtitle: 'Containerized college website delivery from private source control to Docker Hub and HTTPS on EC2.',
    description:
      'Recreate the hosting workflow: private GitHub source, Jenkins CI, build-number-tagged Docker images, Docker Hub push, Jenkins-updated Docker Compose, free-tier EC2 deployment, and read-only TLS certificate volumes mounted from the host.',
    tags: ['Jenkins', 'Docker', 'Docker Compose', 'AWS EC2', 'S3', 'Firebase'],
    stages: [
      { id: 'github', name: 'GitHub', detail: 'source', short: 'GH' },
      { id: 'jenkins', name: 'Jenkins', detail: 'build', short: 'CI' },
      { id: 'docker', name: 'Docker', detail: 'image', short: 'D' },
      { id: 'registry', name: 'Registry', detail: 'push', short: 'REG' },
      { id: 'compose', name: 'Compose', detail: 'deploy', short: 'DC' },
      { id: 'health', name: 'Health check', detail: 'verify', short: 'HC' },
      { id: 'live', name: 'Live', detail: 'serve', short: 'ON' },
    ],
  },
  {
    id: 'image-gallery',
    index: '04',
    title: 'Dynamic Image Gallery on AWS',
    subtitle: 'Architecture evolution from static S3 hosting to generated metadata, serverless discovery and private CloudFront delivery.',
    description:
      'Explore the actual evolution of the image gallery: start with static S3 hosting, generate metadata with a script, replace the metadata file with Lambda + API Gateway, then protect the objects behind CloudFront while keeping dynamic listing serverless.',
    tags: ['S3', 'Lambda', 'API Gateway', 'CloudFront', 'OAC', 'IAM', 'Serverless'],
    stages: [
      { id: 's3-static', name: 'S3 Static', detail: 'website', short: 'S3' },
      { id: 'metadata', name: 'Metadata', detail: 'generated index', short: 'JSON' },
      { id: 'lambda', name: 'Lambda', detail: 'dynamic listing', short: 'λ' },
      { id: 'api', name: 'API Gateway', detail: 'HTTPS API', short: 'API' },
      { id: 'cloudfront', name: 'CloudFront', detail: 'secure delivery', short: 'CF' },
      { id: 'private-s3', name: 'Private S3', detail: 'OAC protected', short: 'OAC' },
    ],
  },
  {
    id: 'cicd-pipeline',
    index: '05',
    title: 'Automated CI/CD with E2E Gating',
    subtitle: 'Secure S3 static hosting + CloudFront free-tier metrics with automated Playwright staging gates.',
    description:
      'Explore the CI/CD pipeline powering the live DevOps Hub (devopslearnercorner.org). Built leveraging AWS expertise with secure S3 static hosting, CloudFront free tier for HTTPS and built-in edge access metrics without extra monitoring spend, and GitHub Actions with Playwright automated release gating.',
    tags: ['GitHub Actions', 'Playwright', 'S3', 'CloudFront', 'CI/CD', 'Automated Testing'],
    stages: [
      { id: 'github', name: 'GitHub', detail: 'commit', short: 'GH' },
      { id: 'test', name: 'S3 (Test)', detail: 'sync test', short: 'S3-T' },
      { id: 'e2e', name: 'Playwright', detail: 'E2E tests', short: 'E2E' },
      { id: 'prod', name: 'S3 (Prod)', detail: 'sync prod', short: 'S3-P' },
      { id: 'cf', name: 'CloudFront', detail: 'invalidate', short: 'CF' },
    ],
  },
  {
    id: 'standalone-website',
    index: '06',
    title: 'Hosting Standalone Website on AWS EC2',
    subtitle: 'Secure single-instance reverse proxy routing with Apache/Caddy, loopback backend isolation, bastion access, and zero public IP coupling.',
    description:
      'Explore the networking and security architecture for hosting a standalone demo web application on AWS EC2: replacing naive multi-port exposure with Apache/Caddy reverse proxying, binding backends to localhost loopback, bastion host SSH ProxyJump, Vite static file serving, and eliminating public IP coupling.',
    tags: ['AWS EC2', 'Reverse Proxy', 'Apache', 'Caddy', 'Security Groups', 'DNS', 'SSH Bastion', 'Vite Static', 'PostgreSQL'],
    stages: [
      { id: 'dns', name: 'DNS / EIP', detail: 'domain resolution', short: 'DNS' },
      { id: 'secgroup', name: 'Security Group', detail: 'ports 80/443 only', short: 'SG' },
      { id: 'proxy', name: 'Reverse Proxy', detail: 'Apache / Caddy', short: 'RP' },
      { id: 'frontend', name: 'Static Frontend', detail: 'Vite dist build', short: 'VITE' },
      { id: 'backend', name: 'Internal APIs', detail: '127.0.0.1:8000', short: 'API' },
      { id: 'database', name: 'Local DB', detail: 'PostgreSQL:5432', short: 'DB' },
      { id: 'bastion', name: 'SSH Bastion', detail: 'ProxyJump admin', short: 'SSH' },
    ],
  },
]


