# One-time import blocks to bring existing Azure resources into state.
# Remove this file after the first successful tofu apply.

import {
  to = azurerm_resource_group.app
  id = "/subscriptions/aee0cbd2-8074-4001-b610-0f8edb4eaa3c/resourceGroups/bender-world-rg"
}

import {
  to = azurerm_static_web_app.app
  id = "/subscriptions/aee0cbd2-8074-4001-b610-0f8edb4eaa3c/resourceGroups/bender-world-rg/providers/Microsoft.Web/staticSites/bender-world-app"
}

import {
  to = azurerm_dns_cname_record.frontend
  id = "/subscriptions/aee0cbd2-8074-4001-b610-0f8edb4eaa3c/resourceGroups/infra/providers/Microsoft.Network/dnsZones/romaine.life/CNAME/bender"
}

import {
  to = azurerm_static_web_app_custom_domain.frontend
  id = "/subscriptions/aee0cbd2-8074-4001-b610-0f8edb4eaa3c/resourceGroups/bender-world-rg/providers/Microsoft.Web/staticSites/bender-world-app/customDomains/bender.romaine.life"
}
