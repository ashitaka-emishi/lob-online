# lob-online Production Provisioning Guide

This directory contains Terraform configuration that provisions the lob-online production
environment on DigitalOcean. After one manual bootstrap step (creating the Terraform state
bucket), a single `terraform apply` creates the Droplet, Spaces game-state bucket, Firewall,
and wires GitHub Actions secrets.

> **Two buckets, two purposes:**
>
> - `lob-online-tfstate` — holds Terraform state. Created manually once; never managed by Terraform.
> - `lob-online-games` — holds production game saves. Managed by Terraform; has `prevent_destroy`.

---

## Prerequisites

Install the following tools before proceeding:

| Tool              | Version | Install                                                                                                           |
| ----------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| Terraform         | ≥ 1.5   | `brew install terraform` (macOS) or [terraform.io/downloads](https://developer.hashicorp.com/terraform/downloads) |
| DO CLI (optional) | any     | `brew install doctl` — useful for listing SSH key fingerprints                                                    |

You also need the following credentials. Gather these before starting:

| Credential                       | Where to get it                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DO personal access token         | [cloud.digitalocean.com/account/api/tokens](https://cloud.digitalocean.com/account/api/tokens) — enable read+write                                                                                                                                                                                                                                                                                                                         |
| DO Spaces access key ID + secret | [cloud.digitalocean.com/account/api/spaces-keys](https://cloud.digitalocean.com/account/api/spaces-keys) — create a new key pair                                                                                                                                                                                                                                                                                                           |
| SSH key fingerprint (MD5 format) | Key must already be uploaded to DO. Find it at [cloud.digitalocean.com/account/security](https://cloud.digitalocean.com/account/security), or run: `doctl compute ssh-key list` to see all registered keys with their fingerprints. To derive locally: `ssh-keygen -E md5 -lf ~/.ssh/<your_key>.pub \| awk '{print $2}' \| sed 's/MD5://'` (replace `<your_key>` with your actual key filename — `id_rsa`, `id_ed25519`, `id_ecdsa`, etc.) |
| SSH private key content          | The full PEM content of the private key registered in DO, including `-----BEGIN` / `-----END` lines                                                                                                                                                                                                                                                                                                                                        |
| GitHub personal access token     | [github.com/settings/tokens](https://github.com/settings/tokens) — classic token with **repo** scope (needed to write Actions secrets). Fine-grained alternative: `secrets: write` on lob-online only.                                                                                                                                                                                                                                     |

---

## Step 1 — Create the Terraform state bucket (one-time bootstrap)

The Terraform state is stored in the `lob-online-tfstate` Spaces bucket. This bucket is
**not** managed by Terraform — it must exist before `terraform init` can connect to the backend.

Create it manually in the DO console:

1. Go to [cloud.digitalocean.com/spaces](https://cloud.digitalocean.com/spaces)
2. Click **Create a Space**
3. Region: **NYC3**
4. Name: **`lob-online-tfstate`**
5. File listing: **Restricted**
6. Click **Create a Space**

> If you are re-provisioning on a new machine and the bucket already exists, skip this step —
> the existing state file is reused automatically.

---

## Step 2 — Populate `terraform.tfvars`

Copy the example file and fill in your values:

```bash
cp infra/terraform.tfvars.example infra/terraform.tfvars
```

Open `infra/terraform.tfvars` and replace every `REPLACE_ME` placeholder:

```hcl
do_token               = "dop_v1_..."
do_spaces_access_id    = "..."
do_spaces_secret_key   = "..."
do_ssh_key_fingerprint = "aa:bb:cc:..."   # MD5 fingerprint from DO console or doctl
do_ssh_private_key     = <<-EOT
  -----BEGIN OPENSSH PRIVATE KEY-----
  ...
  -----END OPENSSH PRIVATE KEY-----
EOT
gh_token               = "ghp_..."
gh_owner               = "ashitaka-emishi"
gh_repo                = "lob-online"
```

> `terraform.tfvars` is gitignored — it will never be committed.

---

## Step 3 — Export Spaces credentials for the backend

The Terraform S3 backend reads credentials from environment variables, not from `tfvars`.
Export your Spaces key pair before running `terraform init`:

```bash
export AWS_ACCESS_KEY_ID="<your do_spaces_access_id>"
export AWS_SECRET_ACCESS_KEY="<your do_spaces_secret_key>"
```

Add these to your shell profile if you plan to run Terraform frequently.

---

## Step 4 — Initialize Terraform

```bash
cd infra
terraform init
```

Expected output includes:

```text
Initializing the backend...
Successfully configured the backend "s3"!

Initializing provider plugins...
- Installing digitalocean/digitalocean v2.x.x...
- Installing integrations/github v6.x.x...

Terraform has been successfully initialized!
```

If you see `Error: Failed to get existing workspaces`, the `lob-online-tfstate` bucket does
not exist yet — go back to Step 1.

---

## Step 5 — Review the plan

```bash
terraform plan
```

A fresh provision will show **5 resources to add**:

| Resource                                | What it creates                                |
| --------------------------------------- | ---------------------------------------------- |
| `digitalocean_droplet.lob_online`       | Ubuntu 22.04, 2 vCPU / 4 GB Droplet in NYC3    |
| `digitalocean_spaces_bucket.game_state` | `lob-online-games` bucket (private, versioned) |
| `digitalocean_firewall.lob_online`      | Firewall: inbound 22/80, outbound all          |
| `github_actions_secret.droplet_ip`      | `DO_DROPLET_IP` secret in the repo             |
| `github_actions_secret.ssh_user`        | `DO_SSH_USER` secret (`lob`)                   |
| `github_actions_secret.ssh_key`         | `DO_SSH_KEY` secret (your private key)         |

> Note: GitHub Actions secrets are **write-only** — Terraform cannot read their current
> values back, so the plan may show no-op refreshes on those resources. That is normal.

Verify the plan looks correct before applying.

---

## Step 6 — Apply

```bash
terraform apply
```

Type `yes` at the confirmation prompt. Provisioning takes 60–120 seconds (Droplet boot +
cloud-init). At the end you will see:

```text
Outputs:

droplet_ip         = "xxx.xxx.xxx.xxx"
spaces_bucket_name = "lob-online-games"
```

The Droplet's cloud-init bootstrap script runs in the background after apply returns. Check
its status before proceeding to Step 7:

```bash
ssh root@<droplet_ip> "cloud-init status --wait && tail -50 /var/log/bootstrap.log"
```

This blocks until cloud-init finishes and prints the bootstrap log. Look for
`Bootstrap complete` at the end. If it failed, the log will show the exact step that errored.

---

## Step 7 — Populate `.env` on the Droplet

Cloud-init writes a placeholder `.env` to `/opt/lob-online/app/`. SSH in and fill in the
real values:

```bash
ssh root@<droplet_ip>
nano /opt/lob-online/app/.env
```

Set every variable (match names exactly — these are what the app reads):

```env
NODE_ENV=production
PORT=3000
CLIENT_ORIGIN=https://<your-domain-or-droplet-ip>
APP_URL=https://<your-domain-or-droplet-ip>
JWT_SECRET=<generate with: openssl rand -hex 32>
JWT_EXPIRES_IN=7d
SQLITE_PATH=/opt/lob-online/app/data/lob.db
SPACES_KEY=<do_spaces_access_id>
SPACES_SECRET=<do_spaces_secret_key>
SPACES_BUCKET=lob-online-games
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_FORCE_PATH_STYLE=false
DISCORD_CLIENT_ID=<from Discord developer portal>
DISCORD_CLIENT_SECRET=<from Discord developer portal>
DISCORD_CALLBACK_URL=https://<your-domain-or-droplet-ip>/auth/discord/callback
```

After saving, start the app for the first time:

```bash
cd /opt/lob-online/app
sudo -u lob pm2 start ecosystem.config.cjs --env production
sudo -u lob pm2 save
pm2 status   # confirm "lob-online" shows "online"
```

---

## Step 8 — Verify the deployment

```bash
# From your local machine
curl http://<droplet_ip>/
# Should return the Vue app HTML (200 OK)

# Confirm game state persistence
curl -X POST http://<droplet_ip>/api/v1/games  # create a game
pm2 restart lob-online                          # restart the server
# Game should still be retrievable after restart
```

Then push a commit to `master` and watch the `deploy.yml` GitHub Actions workflow run green.

---

## Day-2 Operations

### Re-provisioning on a new machine

1. Install Terraform
2. Clone the repo
3. Repeat Steps 2–4 (the existing state file in `lob-online-tfstate` is picked up automatically)
4. Run `terraform plan` — should show no changes to the Droplet/bucket/firewall. GitHub
   secret resources may show no-op refreshes (their values are write-only and can't be diffed).

### Destroying the environment

```bash
terraform destroy
```

> **Warning:** This deletes the Droplet, Spaces game-state bucket (`lob-online-games` and its
> game save objects), and the Firewall. Because `lob-online-games` has `prevent_destroy = true`,
> you must first remove that protection by editing `main.tf` before destroy will succeed.
>
> The Terraform **state** bucket (`lob-online-tfstate`) is **not** managed by Terraform and
> will **not** be destroyed — delete it manually from the DO console if desired.
>
> Export any game data you want to keep before destroying:
> `aws s3 sync s3://lob-online-games ./backup/ --endpoint https://nyc3.digitaloceanspaces.com`

### Updating a single resource

```bash
# Example: resize the Droplet
# 1. Edit terraform.tfvars:  droplet_size = "s-4vcpu-8gb"
# 2. Preview:
terraform plan
# 3. Apply (Droplet resize requires a reboot — expect ~30 s downtime):
terraform apply
```

### Viewing current outputs

```bash
terraform output
```

---

## Security Notes

- **SSH port 22 is open to 0.0.0.0/0.** For a hardened setup, restrict `source_addresses`
  in the firewall inbound rule for port 22 to your known admin IP(s).
- **The app runs as an unprivileged `lob` user** (not root). PM2 is managed by that user.
  Root SSH is still needed for initial bootstrap; you can disable root SSH login after Step 7.
- **The SSH private key is stored in Terraform state** (the Spaces `lob-online-tfstate` bucket).
  Protect that bucket with a tightly scoped Spaces key and treat it as a secret store.
- **No TLS is configured.** The site is served over HTTP only. For production, provision a
  certificate (certbot on the Droplet, or a DO managed load balancer) and add port 443 to the
  firewall before handling real user data.

---

## Troubleshooting

| Symptom                                                        | Likely cause                                                                                                       | Fix                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `Error: No valid credential sources found` on `terraform init` | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` not exported                                                         | Export the Spaces key pair (Step 3)                                  |
| `Error: 404 Not Found` on backend bucket                       | `lob-online-tfstate` bucket not created                                                                            | Complete Step 1                                                      |
| `Error: 401 Unauthorized` on DO provider                       | Bad or expired DO token                                                                                            | Regenerate at DO console                                             |
| `Error: 403 Forbidden` on GitHub provider                      | PAT missing `repo` scope                                                                                           | Regenerate GitHub token with correct scopes                          |
| `cloud-init status --wait` times out                           | Still running; network install can take 3–5 min                                                                    | Wait longer; check `/var/log/bootstrap.log`                          |
| Bootstrap failed midway                                        | Error in a runcmd step                                                                                             | Read `/var/log/bootstrap.log` for the exact failed command           |
| App not running after Step 7                                   | PM2 not yet started                                                                                                | Run the `pm2 start` command in Step 7                                |
| `pm2 logs lob-online` shows startup crash                      | Missing or wrong `.env` variable                                                                                   | Check `/opt/lob-online/app/.env` against the variable list in Step 7 |
| nginx returns 502                                              | PM2 app not running or crashed                                                                                     | `sudo -u lob pm2 status`; check `pm2 logs lob-online`                |
| `deploy.yml` SSH connection refused                            | appleboy/ssh-action accepts the host key automatically on first connect; if it fails, the Droplet may not be ready | Wait for cloud-init to complete, then re-run the workflow            |
