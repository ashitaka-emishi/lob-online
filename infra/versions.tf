terraform {
  required_version = ">= 1.5"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    # DigitalOcean Spaces is S3-compatible. Credentials are read from
    # AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars (set to your
    # DO Spaces key pair before running terraform init).
    #
    # This bucket (lob-online-tfstate) is intentionally NOT managed by Terraform —
    # it must be created manually once before `terraform init` and should never be
    # destroyed. It is separate from the application game-state bucket (lob-online-games).
    bucket                      = "lob-online-tfstate"
    key                         = "tfstate/terraform.tfstate"
    endpoint                    = "https://nyc3.digitaloceanspaces.com"
    region                      = "us-east-1" # required by the S3 backend; DO ignores it
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = false
  }
}
