import { useState } from 'react'
import type { Project } from '../data/projects'
import { Pipeline } from './Pipeline'

export function ProjectCard({ project }: { project: Project }) {
  const [open, setOpen] = useState(project.id === 'progressive')
  return (
    <article className={`project-card ${open ? 'open' : ''}`}>
      <button className="project-head" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <div>
          <div className="project-kicker">project {project.index}</div>
          <div className="project-title">{project.title}</div>
          <div className="project-subtitle">{project.subtitle}</div>
        </div>
        <div className="project-chevron">⌄</div>
      </button>
      <div className="project-body">
        <div className="project-body-inner">
          <div className="project-content">
            <p className="project-description">{project.description}</p>
            <div className="tags">{project.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
            {project.id === 'progressive' && (
              <div className="cta-row project-sandbox-link">
                <a className="button primary" href="/sandbox/progressive-delivery">Open full sandbox →</a>
              </div>
            )}
            {project.id === 'cafe' && (
              <div className="cta-row project-sandbox-link">
                <a className="button primary" href="/sandbox/cafe-aws">Open AWS infrastructure lab →</a>
              </div>
            )}
            {project.id === 'image-gallery' && (
              <div className="cta-row project-sandbox-link">
                <a className="button primary" href="/sandbox/image-gallery">Explore image gallery evolution →</a>
                <a className="button" href="https://dj209obmn76yt.cloudfront.net/" target="_blank" rel="noreferrer">Open live gallery ↗</a>
              </div>
            )}
            {project.id === 'collegefest' && (
              <div className="cta-row project-sandbox-link">
                <a className="button primary" href="/sandbox/collegefest">Open deployment sandbox →</a>
              </div>
            )}
            {project.id === 'cicd-pipeline' && (
              <div className="cta-row project-sandbox-link">
                <a className="button primary" href="/sandbox/cicd-pipeline">Open CI/CD sandbox →</a>
                <a className="button" href="https://devopslearnercorner.org/" target="_blank" rel="noreferrer">Open live DevOps Hub ↗</a>
                <a className="button" href="https://github.com/neehar2601/DevOps-Refresher" target="_blank" rel="noreferrer">GitHub repo ↗</a>
              </div>
            )}
            {project.id === 'standalone-website' && (
              <div className="cta-row project-sandbox-link">
                <a className="button primary" href="/sandbox/standalone-website">Open EC2 reverse proxy lab →</a>
                <a className="button" href="https://medium.com/@ngn22666/hosting-a-standalone-demo-website-on-aws-ec2-securely-with-a-reverse-proxy-e0e0914bda19?sharedUserId=ngn22666" target="_blank" rel="noreferrer">Read on Medium ↗</a>
              </div>
            )}
            {project.id === 'keycloak-auth' && (
              <div className="cta-row project-sandbox-link">
                <a className="button primary" href="/sandbox/keycloak-auth">Open Keycloak & OAuth lab →</a>
                <a className="button" href="https://github.com/neehar2601/Authentication" target="_blank" rel="noreferrer">GitHub repo ↗</a>
              </div>
            )}
            <Pipeline project={project} />
          </div>
        </div>
      </div>
    </article>
  )
}
