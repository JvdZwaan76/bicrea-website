# BIC REA Website — Deployment & Rollback Runbook

## Architecture
- Source: static HTML/CSS/JS, git-versioned, branch `main`.
- Host: Cloudflare Pages, auto-deploys on push to `origin/main`.
- Build time: ~30–45s after push before live at https://bicrea.com.
- Repo: GitHub (`JvdZwaan76/bicrea-website`).

## Standard deployment
1. `git checkout main && git fetch origin && git pull origin main`
2. Edit using the guarded pattern: edit -> verify with grep -> commit only if verification passes -> revert on failure.
3. `git add <files> && git commit -m "..." && git push origin main`
4. Wait ~45s, smoke-test: `curl -sL https://bicrea.com/<page> | grep -c '<expected>'`

## Pre-deploy checklist
- [ ] On main, tree clean, not behind origin.
- [ ] Backup taken BEFORE any sitewide change.
- [ ] Record current good commit: `git rev-parse HEAD`.
- [ ] Sitewide find/replace: whitelist bicrea.com domain, @bicrea email,
      BICREA_Capabilities filename, bicrea-ga4-id / bicrea-privacy-request-endpoint
      meta, BICREA_PERSONAS JS.

## ROLLBACK

### A. Bad change just pushed (PREFERRED, non-destructive)
git checkout main && git pull origin main
git revert --no-edit HEAD            # or <bad-hash>
git push origin main

### B. Roll back several commits to a known-good hash
git revert --no-edit <good-hash>..HEAD
git push origin main

### C. Emergency hard reset (REWRITES HISTORY — last resort)
git reset --hard <good-hash>
git push --force-with-lease origin main

### D. Restore from backup archive (git broken)
ls -lt ~/Backups/bicrea/
tar -xzf bicrea-website-<timestamp>.tar.gz -C /tmp
# read BACKUP_MANIFEST.txt, confirm commit hash, restore, recommit, push.

### E. Cloudflare build broken (source is fine)
Cloudflare dashboard -> Pages -> bicrea -> Deployments ->
"Rollback to this deployment" on last known-good. Instant, no git change.

## Post-rollback verification (ALWAYS)
curl -sL https://bicrea.com/about   | grep -c 'BIC REA'
curl -sL https://bicrea.com/about   | grep -ic 'jasper\|zwaan'   # must be 0
curl -sL https://bicrea.com/contact | grep -c '805'              # must be 0

## Invariants (must hold after every deploy)
- No one-word BICREA in visible copy (domain/email/filename/JS excepted).
- Phone = (310) 963-1569 only; no (805).
- Owner name (Jasper / van der Zwaan) appears NOWHERE in any HTML.
- BIC REA LLC only in schema name + og:site_name; plain BIC REA elsewhere.

## Backup cadence
- Mandatory before any sitewide change. Otherwise weekly / after each batch.
- Keep last 5 archives. Test-restore one monthly.
- Backup targets: ~/Backups/bicrea + iCloud Drive/BICREA-Backups.
