provider "github" {
  token = var.gh_token
  owner = var.gh_owner
}

resource "github_actions_secret" "droplet_ip" {
  repository      = var.gh_repo
  secret_name     = "DO_DROPLET_IP"
  plaintext_value = digitalocean_droplet.lob_online.ipv4_address
}

resource "github_actions_secret" "ssh_user" {
  repository      = var.gh_repo
  secret_name     = "DO_SSH_USER"
  plaintext_value = var.ssh_user
}

resource "github_actions_secret" "ssh_key" {
  repository      = var.gh_repo
  secret_name     = "DO_SSH_KEY"
  plaintext_value = var.do_ssh_private_key
}
