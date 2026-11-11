# Creion barbă — Shopify

- Store: Luma Lift (`megashop-romania.ro`), product `gid://shopify/Product/16105364062589`, handle `creion-barba`, status DRAFT.
- Product description source: `descriere.html` (pasted into the product's description HTML).
- Standalone landing (no Luma Lift header/footer) lives on the UNPUBLISHED theme
  **"MegaShop — Creion barbă — DRAFT 11 Nov"** (`gid://shopify/OnlineStoreTheme/190677254525`),
  a duplicate of the live theme made on 2026-11-11. Files added there:
  - `layout/theme.barba.liquid` — bare layout, no header/footer groups
  - `sections/main-creion-barba.liquid` — top bar, gallery, pack picker, buy button (posts to cart, `return_to=/checkout`), renders `product.description`, sticky mobile CTA, policy footer
  - `templates/product.creion-barba.json` — uses the layout and section above
- The product has `templateSuffix: creion-barba`. On the live theme that template does not exist, so the default product template is used until the draft theme is published.
- Nothing is published. Publishing the theme and activating the product are Paul's decisions.
