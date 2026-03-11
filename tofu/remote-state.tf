# TODO: Replace hardcoded values with terraform_remote_state from infra-bootstrap
# once infra-bootstrap state is migrated to Azure Storage.
locals {
  infra = {
    resource_group_name = "infra"
    dns_zone_name       = "romaine.life"
  }
}
