# Contributing to Jamia

Thank you for your interest in contributing to Jamia! This document provides guidelines for contributing to this project.

## Ways to Contribute

- Report bugs via GitHub issues
- Suggest features or enhancements
- Submit pull requests with fixes or features
- Improve documentation
- Help answer questions in issues

## Development Setup

See the [README.md](./README.md#quick-start) for detailed setup instructions.

**Quick version:**
1. Clone repository: `git clone https://github.com/pietrodichio/jamia.git`
2. Install dependencies: `pnpm install` (at root)
3. Copy environment files: `cp apps/backend/.env.example apps/backend/.env` and `cp apps/web/.env.example apps/web/.env`
4. Fill in environment variables (see .env.example files for instructions)
5. Start development: `pnpm dev`

## Branching Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes

All changes to `main` require a pull request with review.

## Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes with clear, focused commits
4. Write or update tests as needed
5. Ensure all tests pass: `pnpm test`
6. Ensure code is formatted: `pnpm lint`
7. Submit pull request using the PR template
8. Address review feedback
9. Maintainer will merge when approved

## Code Style

- **Language:** TypeScript throughout (backend and frontend)
- **Formatting:** Biome for linting and formatting
- **Command:** Run `pnpm lint` before committing
- **Pattern:** Follow existing code patterns in the codebase

## Testing

- Write tests for new features and bug fixes
- Run tests before submitting PR: `pnpm test`
- Backend tests: Jest with supertest for e2e
- Frontend tests: (test setup in progress)

## Commit Messages

Use conventional commits format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring
- `test:` - Test changes

Examples:
- `feat(jams): add recurring event support`
- `fix(participants): handle waiting list edge case`
- `docs: update setup instructions for monorepo`

## Monorepo Structure

This project uses Turborepo with pnpm workspaces.

- `apps/backend` - NestJS backend API
- `apps/web` - React frontend
- `packages/types` - Shared TypeScript types

**Important:**
- Install dependencies at ROOT using `pnpm install`
- Run commands using Turborepo: `pnpm dev`, `pnpm test`, `pnpm lint`
- Filter to specific app: `pnpm --filter @jamia/backend test`

## Questions?

Open an issue with the question label or reach out to maintainers.

## Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).
