# Free Connector Integration Plan for OffMeta

Goal: Connect the Lovable connectors that are free-tier-friendly and materially useful for OffMeta (MTG card search), avoiding monthly fees.

## Recommended connectors

### 1. Google Search Console (free)
- Already used in the project for sitemap submission and indexing health.
- Keep connected to monitor the traffic decline and request re-crawls.
- Runtime value: SEO diagnostics, sitemap submission, indexing alerts.

### 2. Google Analytics 4 (free)
- Standard web analytics with no monthly fee.
- Useful for tracking traffic sources, bounce rate, and search engagement.
- Runtime value: Traffic trends, user acquisition, page performance.

### 3. PostHog (free tier)
- Product analytics with a generous free tier.
- Better than GA for event-based product insights (search queries, zero-result events, card clicks).
- Runtime value: Funnel analysis, event tracking, feature usage.

### 4. GitHub (free for public repos)
- Read/manage issues for user feedback and bug tracking.
- Could power a "Report an issue" flow that creates a GitHub issue.
- Runtime value: Public feedback board, bug tracking.

### 5. Resend (free tier)
- Transactional email (3,000 emails/month free, 100/day cap).
- Useful for password reset, welcome emails, and rare admin alerts.
- Only if you need email beyond what Lovable Email already provides.

## Connectors to skip for now

- CRMs (HubSpot, Salesforce, Zoho, Pipedrive): OffMeta has no sales pipeline.
- E-commerce (Shopify, Stripe, Paddle, WooCommerce): No paid products yet.
- HR/recruiting (Ashby, Workday): Not applicable.
- Maps (Google Maps, Mapbox): Not relevant for card search.
- Social APIs (TikTok, X, LinkedIn): Nice for marketing, but not core product.
- Data warehouses (Snowflake, BigQuery, Databricks): Overkill for current scale.
- App User Connectors (Gmail, Notion, Slack, etc.): Not needed unless users must connect their own accounts to search cards.

## Implementation order

1. Verify Google Search Console connection is still linked and healthy.
2. Link Google Analytics 4 and add the measurement ID to `index.html`.
3. Link PostHog and add the project key/site key to the client analytics loader.
4. Link GitHub and add a lightweight "Report an issue" edge function (optional).
5. Link Resend only if you want custom transactional email beyond Lovable Email.

## Notes

- Lovable Cloud and Lovable AI Gateway are already built-in and free-tier-supported.
- Each connector link must be followed by deploying affected edge functions if backend code is added.
- All secret keys should be stored via Lovable Secrets, never hardcoded.
