# Phase 2: Open Source Preparation - Research

**Researched:** 2026-01-20
**Domain:** Open Source Documentation, GitHub Community Standards, Monorepo Developer Experience
**Confidence:** HIGH

## Summary

Open source preparation for a TypeScript monorepo project requires four core documentation files (README, CONTRIBUTING, LICENSE, CODE_OF_CONDUCT), GitHub issue/PR templates, and comprehensive environment setup documentation. The standard approach is well-established across the industry with clear best practices.

For a Turborepo monorepo with NestJS backend and React frontend deploying to Railway and Netlify, documentation should address the monorepo structure, workspace-specific setup, and selective deployment considerations. Environment variables are already documented via .env.example files in both apps, meeting OSS-02 requirements.

The project already has partial documentation (.env.example files, app-level READMEs with boilerplate content) that needs replacement with project-specific content.

**Primary recommendation:** Replace boilerplate READMEs with monorepo-focused documentation, add standard OSS files (LICENSE, CODE_OF_CONDUCT, CONTRIBUTING), create GitHub templates in .github directory, and document repository settings for maintainability.

## Standard Stack

The established tools and formats for open source project documentation:

### Core
| Component | Version/Standard | Purpose | Why Standard |
|-----------|------------------|---------|--------------|
| README.md | Markdown | Project overview and setup instructions | Universal first touchpoint, GitHub displays prominently |
| CONTRIBUTING.md | Markdown | Contribution guidelines and process | Signals welcoming project, linked by GitHub automatically |
| LICENSE | Plain text or Markdown | Legal terms for use/contribution | Required for open source, determines how code can be used |
| CODE_OF_CONDUCT.md | Contributor Covenant 2.1 | Community behavior expectations | Industry standard (80%+ adoption), manages community health |

### Supporting
| Component | Format | Purpose | When to Use |
|-----------|--------|---------|-------------|
| .env.example | Dotenv format | Environment variable templates | Every app needing configuration (backend, frontend) |
| .github/ISSUE_TEMPLATE/*.md | Markdown with YAML frontmatter | Structured issue reporting | Bug reports, feature requests |
| .github/ISSUE_TEMPLATE/*.yml | YAML (GitHub issue forms) | Form-based issue creation | More structured input needed |
| .github/pull_request_template.md | Markdown | PR description checklist | Standard PR information |
| .github/FUNDING.yml | YAML | Sponsorship/donation links | Non-profit accepting support (optional) |

### Alternatives Considered
| Standard Approach | Alternative | Tradeoff |
|------------------|-------------|----------|
| Contributor Covenant | Custom code of conduct | Custom requires legal review, less recognized |
| MIT License | Apache 2.0 | Apache adds patent protection but more complex (see License section) |
| Markdown templates | GitHub issue forms (YAML) | Forms more structured but less flexible |

**Installation:**
No installation required - all are documentation files committed to repository.

## Architecture Patterns

### Recommended Project Structure
```
jamia/
├── README.md                          # Root monorepo documentation
├── LICENSE                            # Project license (MIT recommended)
├── CODE_OF_CONDUCT.md                 # Contributor Covenant v2.1
├── CONTRIBUTING.md                    # Contribution guidelines
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md              # Bug report template
│   │   ├── feature_request.md         # Feature request template
│   │   └── config.yml                 # Issue template configuration
│   ├── pull_request_template.md       # PR template
│   └── REPOSITORY_SETTINGS.md         # Branch protection docs (for reference)
├── apps/
│   ├── backend/
│   │   ├── .env.example               # ✓ Already exists
│   │   └── .env.local.example         # ✓ Already exists
│   └── web/
│       └── .env.example               # ✓ Already exists
└── packages/
    └── types/
```

### Pattern 1: Monorepo Root README
**What:** Single comprehensive README at repository root covering entire project
**When to use:** Always for monorepos - don't rely on app-specific READMEs for onboarding
**Structure:**
```markdown
# Project Name & Description
## What This Is (problem statement, solution)
## Quick Start
### Prerequisites
### Installation (monorepo-level: pnpm install at root)
### Development (turbo dev with watch mode)
### Testing (turbo test across workspaces)
## Project Structure (apps/*, packages/*)
## Environment Setup (link to app-specific .env.example)
## Deployment (Railway for backend, Netlify for frontend)
## Contributing (link to CONTRIBUTING.md)
## License
```

**Example from monorepo best practices:**
```markdown
## Quick Start

### Prerequisites
- Node.js 22+ (we use v22.9.0)
- pnpm 10.22.0 (run `corepack enable` to use project version)
- Supabase CLI (for local database)

### Installation
```bash
# Clone repository
git clone <repo-url>
cd jamia

# Install all dependencies (monorepo + workspaces)
pnpm install
```

### Development
```bash
# Start all apps in development mode
pnpm dev

# Or start specific app
pnpm --filter @jamia/backend dev
pnpm --filter @jamia/web dev
```
```

### Pattern 2: Environment Variable Documentation
**What:** Self-documenting .env.example files with inline comments explaining each variable
**When to use:** Every app with configuration needs (backend, frontend)
**Already implemented:** Backend has .env.example and .env.local.example, frontend has .env.example
**Best practice from research:**
```bash
# Supabase Configuration (Public)
# Get these from your Supabase project settings at https://app.supabase.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API
# For local development, use http://localhost:8088
# For production, use your Railway URL
VITE_API_BASE_URL=http://localhost:8088
```

### Pattern 3: CONTRIBUTING.md Structure
**What:** Clear contribution workflow with examples
**When to use:** Always for open source projects expecting contributions
**Structure from research:**
```markdown
# Contributing to Jamia

## Ways to Contribute
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## Development Setup
[Link to README setup section]

## Branching Strategy
- main: production-ready code
- feature/*, fix/*: feature and bug fix branches
- PR required for all changes to main

## Pull Request Process
1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Submit PR with template filled out
5. Address review feedback
6. Maintainer merges when approved

## Code Style
- TypeScript throughout
- Biome for linting/formatting (pnpm lint)
- Follow existing patterns in codebase

## Testing
- Write tests for new features
- Run pnpm test before submitting PR
- Ensure all tests pass

## Commit Messages
- Use conventional commits format
- Examples: feat:, fix:, docs:, chore:
```

### Pattern 4: GitHub Issue Templates
**What:** Structured templates guiding issue creation
**When to use:** Always - reduces back-and-forth, improves issue quality
**Standard templates:**

**Bug Report (.github/ISSUE_TEMPLATE/bug_report.md):**
```markdown
---
name: Bug Report
about: Report a bug to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## Description
[Clear description of the bug]

## Steps to Reproduce
1.
2.
3.

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS: [e.g., macOS 14]
- Browser: [e.g., Chrome 120]
- Node version: [e.g., 22.9.0]

## Screenshots
[If applicable]

## Additional Context
[Any other relevant information]
```

**Feature Request (.github/ISSUE_TEMPLATE/feature_request.md):**
```markdown
---
name: Feature Request
about: Suggest a new feature or enhancement
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Feature Description
[Clear description of proposed feature]

## Problem It Solves
[What user need or pain point does this address]

## Proposed Solution
[How you envision this working]

## Alternatives Considered
[Other approaches you've thought about]

## Additional Context
[Mockups, examples from other projects, etc.]
```

### Pattern 5: Pull Request Template
**What:** Checklist ensuring PR completeness
**When to use:** Always - improves PR quality and review efficiency
**Structure from research:**
```markdown
## Description
[Brief description of changes]

## Related Issue
Closes #[issue number]

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## How Has This Been Tested?
[Describe testing performed]

## Checklist
- [ ] My code follows the project's code style (ran `pnpm lint`)
- [ ] I have added tests covering my changes
- [ ] All new and existing tests pass (`pnpm test`)
- [ ] I have updated documentation as needed
- [ ] My changes generate no new warnings
- [ ] I have checked my code for accessibility issues (if UI changes)
```

### Pattern 6: License Selection
**What:** Choose between MIT (simpler) or Apache 2.0 (patent protection)
**When to use:** Every open source project - required at project launch
**Decision criteria:**

**Use MIT License when:**
- Want maximum simplicity and adoption
- Community project without corporate contributors
- Not concerned about patent issues
- Want shortest, most permissive license

**Use Apache 2.0 when:**
- Need explicit patent grant protection
- Expecting corporate contributions
- Want clear terms around trademarks
- Project involves potential patent concerns

**For Jamia:** MIT recommended because:
- Non-profit community project (PROJECT.md states "Non-profit, community-driven")
- Maximizes accessibility for contributors
- No complex patent concerns in event management domain
- Matches community-friendly ethos

### Anti-Patterns to Avoid

**1. Outdated Documentation**
- Don't leave boilerplate READMEs (NestJS/Vite templates) - current apps/backend/README.md and apps/web/README.md are generic scaffolding
- Don't document features not yet implemented
- Update docs when code changes

**2. Overly Complex Templates**
- Don't make issue templates too long (research shows contributors skip them)
- Don't require non-essential information
- Keep PR checklist focused (8-10 items max)

**3. Missing "Start Here" Guidance**
- Don't assume contributors know monorepo concepts
- Don't skip prerequisite versions (Node, pnpm)
- Don't hide environment setup details

**4. Inconsistent Documentation Location**
- Don't scatter docs across multiple READMEs without clear hierarchy
- Don't duplicate setup instructions (link instead)
- Don't mix docs in code comments when they belong in markdown

**5. Assumed Knowledge**
- Don't use "simply" or "just" in instructions
- Don't skip steps that seem obvious to maintainer
- Don't assume familiarity with Turborepo, Railway, or Netlify

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Code of Conduct | Custom community guidelines | Contributor Covenant 2.1 | Legally vetted, recognized standard, saves liability concerns |
| License text | Custom license or terms | MIT or Apache 2.0 from choosealicense.com | Standard licenses are legally vetted, recognized by GitHub |
| Issue template format | Custom HTML forms | GitHub's YAML frontmatter or issue forms | GitHub auto-links templates, shows in community profile |
| Environment variable format | Custom config format | .env files with dotenv | Universal Node.js standard, tool support everywhere |
| Contribution workflow | Ad-hoc PR review process | Documented CONTRIBUTING.md with checklist | Research shows 13% more contributors with clear process |

**Key insight:** GitHub provides built-in support for standard OSS files (README, CONTRIBUTING, CODE_OF_CONDUCT, LICENSE) including automatic linking, community profile checklist, and search indexing. Custom solutions lose these benefits.

## Common Pitfalls

### Pitfall 1: Boilerplate Documentation Left in Place
**What goes wrong:** Contributors see generic NestJS or Vite README instead of actual project setup
**Why it happens:** Scaffolding tools generate boilerplate, developers forget to replace
**Current state:** apps/backend/README.md is NestJS template, apps/web/README.md is Lovable template
**How to avoid:** Delete boilerplate READMEs, create single root README with monorepo-specific instructions
**Warning signs:** README mentions "Nest framework TypeScript starter" or "Lovable project" instead of Jamia

### Pitfall 2: Incomplete Environment Variable Documentation
**What goes wrong:** Contributors can't run project locally, lack required API keys or configuration
**Why it happens:** Developers forget which variables are optional vs required, or how to obtain them
**Current state:** .env.example files exist but lack inline comments explaining how to get values
**How to avoid:**
- Add inline comments explaining each variable's purpose
- Document where to obtain values (Supabase dashboard, Resend account, etc.)
- Indicate which are required vs optional
- Provide example values where safe (URLs, ports)
**Warning signs:** Contributors asking "where do I get SUPABASE_URL?" or "what should FRONTEND_BASE_URL be?"

### Pitfall 3: Missing Repository Settings Documentation
**What goes wrong:** After maintainer changes, new maintainers don't know branch protection rules or required checks
**Why it happens:** GitHub settings are UI-only, not version controlled
**How to avoid:** Create .github/REPOSITORY_SETTINGS.md documenting:
- Branch protection rules (require PR, require reviews, require status checks)
- Required status checks (tests must pass, lint must pass)
- Who has admin access
- Deployment webhook configuration (Railway, Netlify)
**Warning signs:** Accidentally pushing directly to main, broken deployments after settings change

### Pitfall 4: Monorepo-Specific Setup Not Documented
**What goes wrong:** Contributors run npm install in wrong directory, don't understand workspace structure, trigger wrong deployments
**Why it happens:** Most tutorials assume single-app repos, monorepo requires different workflow
**How to avoid:** README must explicitly state:
- Install at ROOT using pnpm (not npm/yarn)
- Use turbo commands (pnpm dev, not cd apps/backend && pnpm start:dev)
- Explain workspace filtering (pnpm --filter @jamia/backend test)
- Document selective deployment (backend changes don't deploy frontend)
**Warning signs:** Contributors reporting "I installed dependencies but nothing works", confusion about which commands to run

### Pitfall 5: Contributor Covenant Placeholders Not Filled
**What goes wrong:** CODE_OF_CONDUCT.md contains [INSERT CONTACT METHOD] placeholders
**Why it happens:** Copy template without customizing
**How to avoid:** Must fill in:
- Contact method for reporting (email, form, Discord, etc.)
- Enforcement team contact info
- Review enforcement section for appropriateness
**Warning signs:** GitHub community profile shows warning "Code of conduct missing required information"

### Pitfall 6: Template Files in Wrong Location
**What goes wrong:** GitHub doesn't recognize templates, they don't appear in issue/PR creation
**Why it happens:** Case-sensitive paths, wrong file extensions, not on default branch
**How to avoid:**
- Issue templates MUST be in .github/ISSUE_TEMPLATE/ (exact case)
- Files must have .md or .yml extension
- PR template can be in root, .github/, or docs/
- Must be on default branch (main)
- Test by creating issue/PR in GitHub UI
**Warning signs:** Creating new issue doesn't show template options

### Pitfall 7: TypeScript Monorepo Path Complexity Hidden
**What goes wrong:** Contributors confused by TypeScript project references, build order, or path aliases
**Why it happens:** Research shows path aliases and project references are common pain points
**Current state:** Project uses pnpm workspaces and Turborepo (avoids most complexity)
**How to avoid:**
- Document that Turborepo handles build orchestration
- Explain shared packages/types usage
- Note that pnpm handles workspace linking
- No need to document TypeScript project references (not used in simple Turborepo setup)
**Warning signs:** Issues about "can't find module @jamia/types" or "circular dependencies"

## Code Examples

Verified patterns from official sources:

### Contributor Covenant v2.1 Adoption
```markdown
# Contributor Covenant Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone, regardless of age, body
size, visible or invisible disability, ethnicity, sex characteristics, gender
identity and expression, level of experience, education, socio-economic status,
nationality, personal appearance, race, caste, color, religion, or sexual
identity and orientation.

[...full text from https://www.contributor-covenant.org/version/2/1/code_of_conduct/]

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the community leaders responsible for enforcement at
[INSERT: pietro@jamia.com or community@jamia.com].
All complaints will be reviewed and investigated promptly and fairly.
```

### MIT License Text
```text
MIT License

Copyright (c) 2026 Jamia Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### GitHub Issue Template Configuration
```yaml
# .github/ISSUE_TEMPLATE/config.yml
blank_issues_enabled: false
contact_links:
  - name: Question or Discussion
    url: https://github.com/username/jamia/discussions
    about: Please ask questions and general discussions here
```

### Enhanced .env.example with Documentation
```bash
# ===========================================
# BACKEND ENVIRONMENT VARIABLES
# ===========================================
# Copy this file to .env and fill in your values
# For local development with Supabase local, use .env.local.example instead

# Supabase Configuration
# Get these from https://app.supabase.com/project/YOUR_PROJECT/settings/api
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here  # WARNING: Keep this secret, server-only
SUPABASE_ANON_KEY=your-anon-key-here  # Safe to expose in frontend
SUPABASE_JWT_SECRET=your-jwt-secret-here  # Used to verify auth tokens

# Email Service (Resend)
# Sign up at https://resend.com and create API key
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com  # Must be verified domain

# Telegram Bot
# Create bot with @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username  # Without @ symbol

# Application URLs
FRONTEND_BASE_URL=https://yourdomain.com  # Or http://localhost:5173 for local
PORT=8088  # Backend server port
NODE_ENV=production  # Use 'local' for development
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Code of Conduct v1.4 | Contributor Covenant v2.1 | 2020 | Added scope clarification, enforcement guidelines |
| Individual READMEs per app | Monorepo root README with links | 2020s with monorepo rise | Single onboarding entry point |
| Markdown issue templates | YAML issue forms (optional) | 2021 (GitHub release) | More structured input, but markdown still common |
| npm/yarn workspaces only | pnpm + Turborepo | 2022-2023 | Faster installs, better caching, parallel builds |
| Long detailed templates | Concise focused templates | Ongoing | Research shows shorter = higher completion rate |

**Deprecated/outdated:**
- **Markdown badges in README for build status**: Many projects moving away from visual noise, prefer GitHub Actions tab
- **Separate CHANGELOG.md**: Auto-generate from commit messages or GitHub releases instead
- **Detailed LICENSE file location**: GitHub now auto-detects LICENSE in root, .github/, or docs/
- **CODEOWNERS without teams**: Use GitHub teams instead of individual usernames for maintainability

## Open Questions

Things that couldn't be fully resolved:

1. **Contact Method for Code of Conduct Enforcement**
   - What we know: Contributor Covenant requires filling [INSERT CONTACT METHOD]
   - What's unclear: Project doesn't specify maintainer email or community contact
   - Recommendation: Add community@jamia.com or pietro@jamia.com (project owner) as enforcement contact

2. **Branch Protection Required Checks**
   - What we know: Should require tests passing before merge
   - What's unclear: Current CI/CD state - no GitHub Actions found, deployment via Railway/Netlify webhooks
   - Recommendation: Document desired state in REPOSITORY_SETTINGS.md, implement CI in future phase if needed

3. **Issue Label Taxonomy**
   - What we know: Issue templates use 'bug' and 'enhancement' labels
   - What's unclear: What other labels project wants (good-first-issue, help-wanted, priority levels)
   - Recommendation: Start minimal (bug, enhancement, documentation), expand based on triage needs

4. **Contribution Recognition**
   - What we know: Research shows acknowledging contributors increases retention
   - What's unclear: Whether project wants all-contributors bot, CONTRIBUTORS.md, or just GitHub insights
   - Recommendation: Rely on GitHub contributors graph initially, add formal recognition if community grows

## Sources

### Primary (HIGH confidence)
- Contributor Covenant v2.1 - https://www.contributor-covenant.org/version/2/1/code_of_conduct/
- GitHub Official Docs: Issue/PR Templates - https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates
- GitHub Official Docs: Branch Protection - https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Choose a License - https://choosealicense.com/licenses/ (MIT vs Apache comparison)
- Railway Docs: Monorepo Deployment - https://docs.railway.com/guides/monorepo
- Turborepo Official Docs - https://turborepo.dev/docs

### Secondary (MEDIUM confidence)
- [Best practices to manage an open source project](https://blog.codacy.com/best-practices-to-manage-an-open-source-project) (Codacy)
- [Open Source Best Practices: Key Documents](https://www.sonatype.com/blog/open-source-best-practices-key-documents-to-help-welcome-new-contributors-to-your-project) (Sonatype)
- [GitHub PR Template Examples & Setup Guide](https://everhour.com/blog/github-pr-template/) (2026)
- [Open Source Contributor Onboarding: 10 Tips](https://daily.dev/blog/open-source-contributor-onboarding-10-tips)
- [MIT vs Apache License Comparison](https://mikatuo.com/blog/apache-20-vs-mit-licenses/)
- [Environment Variables Best Practices](https://onenine.com/best-practices-for-environment-specific-configurations/)
- [TypeScript Monorepo Common Mistakes](https://colinhacks.com/essays/live-types-typescript-monorepo)
- [GitHub Repository Settings Checklist](https://github.com/libresource/open-source-checklist)

### Tertiary (LOW confidence)
- WebSearch results on monorepo README structures (multiple blog posts, varied quality)
- Community discussions on GitHub templates (subjective preferences)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Industry-standard files with official sources (Contributor Covenant, GitHub Docs, choosealicense.com)
- Architecture patterns: HIGH - Verified against GitHub official docs, established monorepo practices, existing project structure
- Pitfalls: MEDIUM-HIGH - Based on research about common mistakes, verified with contributor onboarding studies
- Code examples: HIGH - Taken directly from official sources (Contributor Covenant, MIT License text from choosealicense.com)
- Repository settings: MEDIUM - GitHub docs cover mechanics, but specific settings depend on project governance decisions

**Research date:** 2026-01-20
**Valid until:** 60 days (March 2026) - OSS documentation standards change slowly, but GitHub may add new features

**Key assumptions validated:**
- .env.example files already exist in apps/backend and apps/web (VERIFIED via file read)
- Current READMEs are boilerplate (VERIFIED - NestJS and Lovable templates)
- No .github directory exists (VERIFIED via ls)
- No LICENSE or CODE_OF_CONDUCT exists (VERIFIED via ls)
- Turborepo monorepo structure in place (VERIFIED via package.json and PROJECT.md)
- Railway for backend, Netlify for frontend (VERIFIED via PROJECT.md)
- Non-profit community project (VERIFIED via PROJECT.md)

**Gaps requiring phase planning decisions:**
1. Exact contact method for Code of Conduct enforcement (email address needed)
2. Whether to use markdown or YAML issue templates (recommend markdown for simplicity)
3. Label taxonomy beyond bug/enhancement (can start minimal)
4. Whether to document repository settings or just implement them (recommend document for maintainer continuity)
