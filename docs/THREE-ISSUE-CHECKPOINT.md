# Three-issue implementation checkpoint

Baseline 9698be37040cae2598b6bbd9a663d6f1293cc77e. This increment adds anonymous, publication-scoped sitemap routes (bounded at 5,000 records per source), private workspace crawler exclusions, and routes the homepage tele-veterinary CTA to the existing consultation-enabled filter. Product detail no longer falls back to a sample when the configured database returns no public product. Existing public profile and booking permissions remain unchanged.

Marketplace: current product enquiries are not sales. Store, inventory, transactional orders, payment and fulfillment remain pending; no new payment or seller privileges activated.

Appointments: existing clinic and consultation paths remain separate. Provider-wide conflict exclusion, independent booking, credential linkage, shared calendar and notification outbox require schema inspection and isolated migration tests. No claim of completed booking integration.

CI, anonymous sitemap verification, staging and all acceptance tests required before production. No production SQL or promotion.
