resource "azurerm_resource_group" "app" {
  name     = "bender-world-rg"
  location = var.location
}
