# Archived scripts

This directory contains archived copies of small utility and maintenance scripts that previously lived at the repository root.

Why archived?
- These scripts are mostly one-off utilities and clutter the project root.
- Archiving makes it clear they are not part of normal app runtime but are preserved for reference.

Files moved here:
- `replace.js` — text replacements for health card component
- `fix.js` — small fix used to clean up a component source
- `update_cards.js` — ad-hoc DB update script (mutates data)
- `check_referrals.js` — diagnostic DB script to inspect referrals and conditions
- `check_db.js`, `check_db.mjs`, `check_data.mjs` — various diagnostic scripts

If you rely on these scripts in automation (CI, cron), update references to point to `script/legacy` or convert them into reproducible scripts under `script/` with clear interfaces.

Note: These files were copied (not deleted) from the repo root to allow safe verification and ensure that nothing breaks unexpectedly. Before final removal, run full test suites and any relevant manual checks for report generation and DB scripts.