# Discord Build Log via GitHub Actions

This repository includes three GitHub Actions workflows that post to Discord via `DISCORD_WEBHOOK_URL`:

- `.github/workflows/discord-pr-approvals.yml` — posts when a PR review is submitted as `approved`.
- `.github/workflows/discord-pr-merged.yml` — posts when a PR is merged.
- `.github/workflows/discord-ci-status.yml` — posts CI pass/fail for the `CI` workflow on the default branch.

## Setup

1. **Create a read-only Discord channel** (for example `⚙️・build-log`).
   - Allow members to view.
   - Deny member send permissions.
   - Allow only the webhook to post.
2. **Create a Discord webhook** for that channel.
   - In Discord: Channel Settings → Integrations → Webhooks → New Webhook.
   - Copy the webhook URL.
3. **Add the webhook URL as a GitHub Actions secret**.
   - In GitHub: Repository Settings → Secrets and variables → Actions → New repository secret.
   - Name: `DISCORD_WEBHOOK_URL`
   - Value: your Discord webhook URL.

## Message formats

Approval:

```text
✅ **PR Approved** in `OWNER/REPO`
**#<num>:** <title>
**Approver:** <approver> • **Author:** <author>
**Branch:** `<head>` → `<base>`
<pr_url>
```

Merged:

```text
🚀 **PR Merged** in `OWNER/REPO`
**#<num>:** <title>
**Merged by:** <actor>
**Branch:** `<head>` → `<base>`
<pr_url>
```

CI:

```text
✅/❌ **CI <Passed/Failed>** in `OWNER/REPO`
**Workflow:** <workflow_name>
**Branch:** `<branch>`
**Commit:** `<sha_short>`
<run_url>
```

## How to test

1. Open a test PR.
2. Submit an **Approve** review on that PR and confirm the approval message appears in Discord.
3. Merge the PR and confirm the merged message appears in Discord.
4. Let CI run on the default branch and confirm a pass/fail CI message appears.

## Notes

- Workflows fail fast with a clear message if `DISCORD_WEBHOOK_URL` is missing.
- Webhook secrets are never printed to logs.
