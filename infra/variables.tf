variable "do_token" {
  description = "DigitalOcean personal access token"
  type        = string
  sensitive   = true
}

variable "do_spaces_access_id" {
  description = "DigitalOcean Spaces access key ID (also used as AWS_ACCESS_KEY_ID for the S3 backend)"
  type        = string
  sensitive   = true
}

variable "do_spaces_secret_key" {
  description = "DigitalOcean Spaces secret access key (also used as AWS_SECRET_ACCESS_KEY for the S3 backend)"
  type        = string
  sensitive   = true
}

variable "do_ssh_key_fingerprint" {
  description = "Fingerprint of the SSH key already registered in your DigitalOcean account"
  type        = string
}

variable "do_ssh_private_key" {
  description = "Content of the SSH private key (used to populate the DO_SSH_KEY GitHub Actions secret)"
  type        = string
  sensitive   = true
}

variable "gh_token" {
  description = "GitHub personal access token with repo + secrets scopes"
  type        = string
  sensitive   = true
}

variable "gh_owner" {
  description = "GitHub username or org that owns the repository"
  type        = string
  default     = "ashitaka-emishi"
}

variable "gh_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "lob-online"
}

variable "droplet_name" {
  description = "Name for the DigitalOcean Droplet"
  type        = string
  default     = "lob-online-prod"
}

variable "region" {
  description = "DigitalOcean region slug"
  type        = string
  default     = "nyc3"
  # NOTE: The S3 backend endpoint in versions.tf is hardcoded to nyc3.digitaloceanspaces.com.
  # Changing this variable moves the Droplet and app bucket to a different region but the
  # Terraform state backend and the .env SPACES_ENDPOINT in cloud-init.yaml remain on nyc3.
  # If you change region you must also update those two locations manually.
}

variable "droplet_size" {
  description = "DigitalOcean Droplet size slug"
  type        = string
  default     = "s-2vcpu-4gb"
}

variable "ssh_user" {
  description = "OS user used for SSH access and running the app via PM2"
  type        = string
  default     = "lob"
}
