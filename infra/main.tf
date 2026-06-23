provider "digitalocean" {
  token             = var.do_token
  spaces_access_id  = var.do_spaces_access_id
  spaces_secret_key = var.do_spaces_secret_key
}

resource "digitalocean_droplet" "lob_online" {
  name     = var.droplet_name
  image    = "ubuntu-22-04-x64"
  size     = var.droplet_size
  region   = var.region
  ssh_keys = [var.do_ssh_key_fingerprint]
  user_data = file("${path.module}/cloud-init.yaml")

  tags = ["lob-online", "production"]
}

resource "digitalocean_spaces_bucket" "game_state" {
  name   = "lob-online-games"
  region = var.region
  acl    = "private"

  versioning {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "digitalocean_firewall" "lob_online" {
  name        = "lob-online-prod"
  droplet_ids = [digitalocean_droplet.lob_online.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Port 3000 is NOT opened publicly — nginx proxies it from 127.0.0.1.
  # Exposing 3000 directly would bypass the nginx layer.

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
