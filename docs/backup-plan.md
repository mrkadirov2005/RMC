# Backup Plan — RMC Production

**Status:** Planning only. Nothing described here has been implemented — no cron job, no S3 bucket, no IAM role exists yet. This is the spec to review before anything gets built.

**Why now:** a direct check of the production server found **zero backup mechanism of any kind** — no crontab, no backup scripts, no AWS Backup / snapshot automation. If the EC2 instance or its disk were lost right now, the only recoverable asset would be whatever's on GitHub; the databases and any un-pushed server-side config would be gone.

## 1. What's actually on the server (verified, not assumed)

| Component | Where it lives | Size | Currently backed up? |
|---|---|---|---|
| PostgreSQL data | Docker volume `rmc_postgres_data` | ~84 MB | No |
| MongoDB data (request logs) | Docker volume `rmc_mongo_data` | ~575 MB | No |
| Application code | GitHub (`mrkadirov2005/RMC`, public) | — | Yes, via git |
| `bot/.env` | Server disk only | small | **No — not in git, no other copy** |
| nginx + Let's Encrypt TLS config | Server disk only | small | No |
| `docker-compose.yml` (as actually deployed, including any local edits) | Server disk + git | small | Yes, once committed |

The total data footprint is small — well under 1 GB combined. That matters: it means a lean, low-cost backup approach is the right fit here, not enterprise-grade continuous-replication tooling built for terabyte databases.

### Two things found during this check that aren't backup issues, but are worth flagging

1. **`service/.env`, `service/.env.save`, `service/.env_back`, `ui/.env`, and `ui/.env.development` are committed to git** in this repo, which is **public**. If any of these contain real secrets (DB passwords, JWT signing key, API keys) rather than placeholder/example values, those secrets are already publicly exposed on GitHub right now. This is a security issue independent of backups — I did not open these files to check their contents, and I'd recommend treating it as urgent: rotate anything real in them and remove them from git history. Happy to help with that as a separate task if you want it.
2. **~70 orphaned/anonymous Docker volumes** (0 bytes, 0 links) are sitting on the server from past `docker compose` runs under a different project name (`service_*` vs the current `rmc_*` prefix). They hold no data and aren't a backup risk, but they're disk clutter worth pruning (`docker volume prune`) at some point.

## 2. Recommended approach

Given the actual scale here, the right-sized design is **three tiers**, not a single silver-bullet tool:

### Tier 1 — Daily logical backups (the primary safety net)

- Nightly `pg_dump` (custom/compressed format) of PostgreSQL and `mongodump --gzip --archive` of MongoDB, each run via `docker exec` against the running containers — no downtime, no replica needed at this scale.
- Upload both, plus a copy of `bot/.env` and the live `docker-compose.yml`, to a dedicated S3 bucket, one dated prefix per day.
- This is the tier that answers "a table got deleted by mistake this afternoon" or "we need last Tuesday's data."

### Tier 2 — Weekly EBS snapshot (whole-instance safety net)

- A snapshot of the entire EC2 root volume, weekly. At ~20 GB used, this is trivially cheap and covers things Tier 1 doesn't: OS-level corruption, a botched `docker compose` run, accidentally terminating the instance, nginx/TLS config drift.
- This is the tier that answers "the whole server is gone or broken, start over from here" rather than "restore one database."

### Tier 3 — Restore testing (the tier almost everyone skips)

- Monthly: pull the latest S3 dump down, restore it into a throwaway Postgres/Mongo container, and spot-check it (row counts, a few known records). A backup that has never been restored is a hope, not a backup — this is the step that converts one into the other.

### Why not pgBackRest / WAL-archiving / AWS Backup service for everything?

Those tools exist for terabyte-scale databases where point-in-time recovery down to the second matters and daily full dumps would be too slow or too large. At ~660 MB combined, a daily full logical dump takes seconds and costs pennies to store — reaching for continuous WAL archiving here would be solving a problem this deployment doesn't have. Worth revisiting if the data volume grows by orders of magnitude.

## 3. What needs to happen before this can be built

1. **An S3 bucket** (e.g. `rmc-backups`) in whatever AWS region the instance is in.
2. **An IAM role** with write-only (`PutObject`) permission scoped to just that bucket, attached to the EC2 instance as an instance profile — so the backup script never needs an AWS access key sitting on disk. *(I checked: the instance currently has no AWS CLI installed and didn't respond to the instance-metadata endpoint, so this needs to be set up in the AWS Console — I don't have AWS account access to do it myself.)*
3. **A retention window decision** — see open questions below. I'd default to 30–60 days of daily dumps plus indefinite monthly EBS snapshots, but this app stores student/financial records, and some jurisdictions have minimum retention requirements for that kind of data that should override my default.
4. **A place for failure alerts to go.** The project already runs a Telegram bot (`crm_telegram_bot`) — routing a "backup failed" ping through that is the path of least new infrastructure, but email or another channel works too.

## 4. Implementation sketch (for review, not yet built)

- One shell script (`scripts/backup.sh`, or wherever you'd rather it live) that: dumps Postgres, dumps Mongo, tars `bot/.env` + `docker-compose.yml`, uploads all three to S3 under a `YYYY-MM-DD/` prefix, and pings a failure alert if any step exits non-zero.
- One cron entry running it nightly (e.g. 03:00 server time).
- An S3 lifecycle rule expiring objects past the agreed retention window, so storage cost never grows unbounded.
- A separate, much smaller EventBridge rule or cron + AWS CLI call for the weekly EBS snapshot.

None of this is installed. I'd want to confirm the bucket name/region, retention window, and alert channel with you before writing and running anything on the production server.

## 5. Cost estimate

At this data volume, the entire setup should run **well under $5/month**:
- S3 storage for daily dumps at this size: a few cents/month even keeping 60 days of history.
- Weekly EBS snapshots of a ~20 GB-used volume: roughly $1–2/month (snapshots are incremental — only changed blocks are stored after the first one).

## 6. Open questions before implementation

1. **Retention:** does any of this data (student records, payments) have a legal minimum retention period in your jurisdiction that should set the window instead of a default 30–60 days?
2. **AWS access:** do you have Console access to create the S3 bucket and IAM role yourself, or would you rather walk through that together?
3. **Alerting:** Telegram bot, email, or something else for backup-failure notifications?
4. **The committed-secrets finding (§1):** want that treated as a follow-up task now, or later?

Once these are answered, the next step is a short, separate implementation pass — the script, the cron entry, and one end-to-end restore test to prove it actually works — not a large change, but one I'd want to do deliberately rather than bundle into this planning doc.
