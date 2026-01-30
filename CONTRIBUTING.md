# Contributing to Simpel CRM

First off, thank you for considering contributing to Simpel CRM! 🎉

## Code of Conduct

Be kind and respectful. We're all here to build something useful together.

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating a bug report, please check if the issue already exists.

**Great bug reports include:**
- A clear, descriptive title
- Steps to reproduce the behavior
- Expected behavior vs what actually happened
- Screenshots if applicable
- Your environment (OS, app version)

### 💡 Suggesting Features

We love feature suggestions! Please open an issue and include:
- A clear description of the feature
- The problem it solves
- Any implementation ideas you have

### 🔧 Pull Requests

1. Fork the repo and create your branch from `master`
2. Make your changes
3. Ensure the code passes all checks (`npm run lint`, `npm run type-check`)
4. Write a clear PR description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/crm-local.git
cd crm-local

# Install dependencies
npm install

# Start dev servers
npm run dev
```

## Code Style

### TypeScript
- Strict mode is enabled — no `any` types
- Use proper typing for all functions and variables

### Vue Components
- Use `<script setup lang="ts">` syntax
- **No custom CSS** — use Naive UI components exclusively
- All text must use i18n (`t('key')`)

### Commits
We use emoji prefixes for commits:
- ✨ `:sparkles:` — New feature
- 🐛 `:bug:` — Bug fix
- 📝 `:memo:` — Documentation
- ♻️ `:recycle:` — Refactor
- 🎨 `:art:` — Style/formatting
- ⚡ `:zap:` — Performance
- 🔧 `:wrench:` — Configuration

### Database Changes

If you change DTOs in `packages/shared/src/dto/`:
1. Check if it's a breaking change
2. Create a migration in `packages/backend/src/migrations/`
3. Update the version constant

## Project Structure

```
packages/
├── shared/     # DTOs, types, utilities (used by both BE & FE)
├── backend/    # Express.js API server
└── frontend/   # Vue 3 + Electron desktop app
```

## Testing

```bash
# Run backend tests
npm run test -w @crm-local/backend

# Type check all packages
npm run type-check
```

## Questions?

Feel free to open an issue with your question. We're happy to help!
