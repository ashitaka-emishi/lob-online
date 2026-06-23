# Implementation Plan: Terraform IaC for DigitalOcean Provisioning

**Track ID:** terraform-iac_20260623
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-23
**Status:** [ ] Not Started

## Overview

Create `infra/` with a flat Terraform configuration that provisions the lob-online production
environment declaratively. Replaces the manual Phase 3 steps from `m8-notifications_20260622`.
No app code changes — infra-only.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None — pure config files, no app code affected

## Risk Classification

**Risk:** Low
**Reason:** New directory of declarative config files; no existing app code modified.

## Quality Gates

- [ ] `terraform validate` passes in `infra/`
- [ ] `terraform fmt -check` passes in `infra/`
- [ ] `npm run lint` (app ESLint — unchanged)
- [ ] `npm run test` (app tests — unchanged)
- [ ] `terraform.tfvars` absent from git tracking
- [ ] `terraform.tfvars.example` present and documents all required inputs

## Debt Budget

**Allowed new deferred debt:** 0.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] `terraform validate` + `terraform fmt -check` pass
- [ ] `.gitignore` updated for Terraform artifacts
- [ ] Ready for `/team-review`

---

## Phase 1: Provider and Variable Scaffolding

Lay down `versions.tf`, `variables.tf`, `outputs.tf`, and `terraform.tfvars.example` — the
skeleton that the resource files will reference.

### Tasks

- [ ] Task 1.1: Create `infra/versions.tf` — required_providers block pinning
      `digitalocean` ≥ 2.x and `github` ≥ 6.x; Terraform ≥ 1.5 required_version
- [ ] Task 1.2: Create `infra/variables.tf` — declare all input variables:
      `do_token`, `do_spaces_access_id`, `do_spaces_secret_key`, `do_ssh_key_fingerprint`,
      `gh_token`, `gh_owner`, `gh_repo`, `droplet_name`, `region`, `droplet_size`
      (with sensible defaults for name/region/size)
- [ ] Task 1.3: Create `infra/outputs.tf` — `droplet_ip`, `spaces_bucket_name`
- [ ] Task 1.4: Create `infra/terraform.tfvars.example` — all required vars with placeholder
      values and inline comments explaining each

### Verification

- [ ] `terraform init` succeeds (providers download)
- [ ] `terraform validate` passes with no resources yet (empty plan)

---

## Phase 2: Core Resources

Create `infra/main.tf` with Droplet, Spaces bucket, and Firewall resources.

### Tasks

- [ ] Task 2.1: Add `terraform { backend "s3" { ... } }` block to `infra/main.tf` — Spaces
      backend using `do_spaces_access_id` / `do_spaces_secret_key` env vars, bucket
      `lob-online-games`, key `tfstate/terraform.tfstate`, endpoint
      `https://nyc3.digitaloceanspaces.com`, region `us-east-1` (DO Spaces S3-compat alias)
- [ ] Task 2.2: Add `provider "digitalocean"` block referencing `var.do_token`
- [ ] Task 2.3: Add `digitalocean_droplet "lob_online"` resource — Ubuntu 22.04 (`ubuntu-22-04-x64`),
      `var.droplet_size` (default `s-2vcpu-4gb`), `var.region` (default `nyc3`),
      `ssh_keys = [var.do_ssh_key_fingerprint]`, `user_data = file("cloud-init.yaml")`
- [ ] Task 2.4: Add `digitalocean_spaces_bucket "game_state"` resource — name
      `lob-online-games`, region `var.region`, acl `private`
- [ ] Task 2.5: Add `digitalocean_firewall "lob_online"` resource — inbound TCP rules for
      ports 22, 80, 3000 (all sources); outbound all traffic

### Verification

- [ ] `terraform validate` passes
- [ ] `terraform plan` (with valid tfvars) shows 3 resources to create

---

## Phase 3: GitHub Secret Wiring

Create `infra/github.tf` to wire `DO_DROPLET_IP`, `DO_SSH_USER`, `DO_SSH_KEY` into the
GitHub repo as Actions secrets.

### Tasks

- [ ] Task 3.1: Add `provider "github"` block — `token = var.gh_token`, `owner = var.gh_owner`
- [ ] Task 3.2: Add `github_actions_secret "droplet_ip"` — secret name `DO_DROPLET_IP`,
      plaintext value `digitalocean_droplet.lob_online.ipv4_address`
- [ ] Task 3.3: Add `github_actions_secret "ssh_user"` — secret name `DO_SSH_USER`,
      plaintext value `"root"` (DO Ubuntu droplets use root by default)
- [ ] Task 3.4: Add `github_actions_secret "ssh_key"` — secret name `DO_SSH_KEY`,
      plaintext value `var.do_ssh_private_key` (new variable: the private key content,
      sensitive = true); add `do_ssh_private_key` to `variables.tf` and `terraform.tfvars.example`

### Verification

- [ ] `terraform validate` passes
- [ ] `terraform plan` shows 3 `github_actions_secret` resources

---

## Phase 4: cloud-init Bootstrap

Create `infra/cloud-init.yaml` — the Droplet user-data script that produces a ready-to-serve
app server on first boot.

### Tasks

- [ ] Task 4.1: Create `infra/cloud-init.yaml` — `#cloud-config` header; `packages` block
      installs `nginx`; `runcmd` steps: 1. Install Node 20 via NodeSource setup script 2. `npm install -g pm2` 3. `git clone https://github.com/ashitaka-emishi/lob-online.git /opt/lob-online` 4. `cd /opt/lob-online && npm install --omit=dev` 5. Write `/opt/lob-online/.env.production` placeholder (operator must populate manually) 6. `pm2 start ecosystem.config.cjs --env production && pm2 startup && pm2 save` 7. Write minimal nginx config proxying `localhost:3000` → port 80 8. `systemctl enable nginx && systemctl start nginx`

### Verification

- [ ] `cloud-init schema --config-file infra/cloud-init.yaml` validates (if cloud-utils installed)
- [ ] YAML parses without error

---

## Phase 5: .gitignore and Housekeeping

### Tasks

- [ ] Task 5.1: Add Terraform artifact entries to `.gitignore`:
      `infra/.terraform/`, `infra/*.tfstate`, `infra/*.tfstate.backup`, `infra/terraform.tfvars`
- [ ] Task 5.2: Run `terraform fmt` in `infra/` to canonicalize HCL formatting
- [ ] Task 5.3: Run `terraform validate` final check

### Verification

- [ ] `git status` shows `infra/terraform.tfvars` as ignored (if file exists)
- [ ] `terraform fmt -check` exits 0

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `terraform validate` passes
- [ ] `terraform fmt -check` passes
- [ ] `npm run test` still green (no app code changed)
- [ ] `terraform.tfvars` gitignored; `terraform.tfvars.example` committed
- [ ] Ready for `/team-review`

---

_Generated by Conductor on 2026-06-23._
