# Spec: M9 DO Deployment — Provision Droplet and Wire deploy.yml

**Track ID:** m9-do-deploy_20260625
**Issues:** #653

## Goal

Provision a DigitalOcean Droplet and activate the already-scaffolded `deploy.yml` GitHub
Actions workflow so that every merge to `master` automatically deploys the app to production.

## Prerequisites (already done in M8)

- Terraform IaC in `infra/` defines Droplet, Spaces bucket, Firewall, and secrets
- `deploy.yml` workflow is scaffolded and merged
- `.env.example` has all required `SPACES_*` and other production vars documented

## Deliverables

- Running Droplet: Ubuntu 22.04, 2 vCPU / 4 GB, Node.js 20, PM2, nginx
- DO Spaces bucket for production (separate from dev)
- Three GitHub secrets wired: `DO_DROPLET_IP`, `DO_SSH_USER`, `DO_SSH_KEY`
- `deploy.yml` green on first push

## Acceptance Criteria

- `https://<droplet-ip>/` serves the Vue app
- Create a game → `pm2 restart lob-online` → game state still loads from Spaces
- Discord webhook fires when `discord_webhook` is set on a game
- `deploy.yml` runs green on every merge to `master`
