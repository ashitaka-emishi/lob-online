output "droplet_ip" {
  description = "Public IPv4 address of the lob-online production Droplet"
  value       = digitalocean_droplet.lob_online.ipv4_address
}

output "spaces_bucket_name" {
  description = "Name of the DigitalOcean Spaces bucket used for game state"
  value       = digitalocean_spaces_bucket.game_state.name
}
