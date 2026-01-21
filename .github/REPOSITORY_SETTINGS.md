# Repository Settings Documentation

This document describes the recommended GitHub repository settings for Jamia. These settings are NOT version-controlled (they're UI-only), so this document serves as the source of truth for maintainers.

**Last reviewed:** 2026-01-21

## Branch Protection Rules

### Main Branch Protection

Settings for `main` branch:

**Protect matching branches:**
- ✅ Require a pull request before merging
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ❌ Require review from Code Owners (not set up yet)
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Status checks required: (none configured yet - add when CI is set up)
- ✅ Require conversation resolution before merging
- ✅ Require linear history (no merge commits)
- ❌ Do not allow bypassing the above settings (not even for admins)
- ✅ Allow force pushes: Disabled
- ✅ Allow deletions: Disabled

**Rationale:**
- PR requirement prevents direct pushes to main (all changes reviewed)
- Linear history keeps git log clean and bisectable
- Force push disabled protects history
- Status checks will be added when CI/CD is implemented

## Required Status Checks

**Current state:** No status checks configured (no CI/CD yet)

**Recommended when CI is set up:**
- `test-backend` - Backend tests must pass (pnpm --filter @jamia/backend test)
- `test-frontend` - Frontend tests must pass (pnpm --filter @jamia/web test)
- `lint` - Biome linting must pass (pnpm lint)
- `build-backend` - Backend must build successfully
- `build-frontend` - Frontend must build successfully

## Access Control

**Admin access:**
- Repository owner/maintainers only

**Write access:**
- Core contributors (if any)

**Triage/Read:**
- Community contributors (fork and PR workflow)

## Deployment Webhooks

**Railway (Backend):**
- Webhook triggered on push to `main`
- Deployment URL: [Railway project dashboard]
- Selective deployment via railway.toml watchPaths

**Netlify (Frontend):**
- Webhook triggered on push to `main`
- Deployment URL: [Netlify site dashboard]
- Selective deployment via netlify.toml ignore command

## Issue and PR Settings

**Issues:**
- ✅ Issues enabled
- Templates: Bug Report, Feature Request (in .github/ISSUE_TEMPLATE/)
- Labels: bug, enhancement, documentation, good-first-issue, help-wanted

**Pull Requests:**
- ✅ Pull requests enabled
- Template: .github/pull_request_template.md
- ✅ Allow squash merging (preferred)
- ✅ Allow merge commits (allowed)
- ❌ Allow rebase merging (disabled to enforce linear history via squash)

**Rationale for squash merging:**
- Clean commit history on main
- Each PR becomes single commit
- Preserves PR description in commit message

## Security

**Dependabot:**
- ✅ Enable Dependabot alerts
- ✅ Enable Dependabot security updates
- ✅ Enable Dependabot version updates (optional)

**Secret Scanning:**
- ✅ Enable secret scanning
- ✅ Enable push protection

**Private vulnerability reporting:**
- ✅ Enable (allows security researchers to privately report vulnerabilities)

## Discussions

**Recommended:** Enable GitHub Discussions for community questions and ideas

**Categories:**
- General - General discussions
- Ideas - Feature ideas and brainstorming
- Q&A - Questions and answers
- Show and Tell - Share your implementations

## Community Profile

GitHub's community profile should show green checkmarks for:
- ✅ Description
- ✅ README
- ✅ Code of Conduct
- ✅ Contributing guidelines
- ✅ License
- ✅ Issue templates
- ✅ Pull request template

Check: Repository > Insights > Community

## Notes for Future Maintainers

**When adding CI/CD:**
1. Update "Required Status Checks" section above
2. Configure branch protection to require new status checks
3. Test that failed checks block PR merging

**When adding collaborators:**
1. Use Teams for groups (easier than individual permissions)
2. Document team membership and access levels here
3. Review access quarterly

**When changing deployment:**
1. Update webhook URLs in this document
2. Update railway.toml or netlify.toml as needed
3. Test selective deployment still works

---

*Last updated: 2026-01-21 during Phase 02 (Open Source Preparation)*
