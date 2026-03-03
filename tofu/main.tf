resource "azurerm_resource_group" "app" {
  name     = "bender-world-rg"
  location = var.location
}

resource "terraform_data" "cd_webhook_trigger" {
  input = var.spacelift_commit_sha
}
