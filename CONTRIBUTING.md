# Contributing to FabricFlow

Thank you for your interest in contributing to **FabricFlow**.

This project tracks garment manufacturing workflows and inventory. Contributions that improve reliability, usability, security, and maintainability are welcome.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Branching and Commits](#branching-and-commits)
- [Pull Request Checklist](#pull-request-checklist)
- [Coding Guidelines](#coding-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct
By participating, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Development Setup
1. Fork the repository.
2. Clone your fork locally.
3. Install dependencies for both applications.

```bash
cd backend
npm install

cd ../frontend
npm install
```

4. Copy environment templates and fill required values:

```bash
cd backend
cp .env.example .env

cd ../frontend
cp .env.example .env
```

5. Start backend and frontend in separate terminals.

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm start
```

## Branching and Commits
- Create a feature branch from `main`.
- Use clear branch names, e.g.:
  - `feat/add-stage-validation`
  - `fix/report-export-timezone`
- Write focused, descriptive commits.

Recommended commit format:
- `feat: add customer filter to reports`
- `fix: prevent negative inventory movement`
- `docs: improve setup instructions`

## Pull Request Checklist
Before opening a PR:
- [ ] Code builds/runs locally
- [ ] No secrets or `.env` files committed
- [ ] Documentation updated (README or docs when applicable)
- [ ] Changes are scoped and easy to review
- [ ] PR title and description clearly explain the change

## Coding Guidelines
- Keep functions small and readable.
- Use descriptive variable and function names.
- Avoid hardcoding values when configuration is appropriate.
- Preserve existing API contracts unless the PR clearly documents breaking changes.
- Handle errors explicitly and return useful messages.

## Reporting Bugs
Open an issue with:
- What happened
- Expected behavior
- Steps to reproduce
- Screenshots/logs (if applicable)
- Environment details (OS, browser, Node version)

## Suggesting Features
Open an issue describing:
- The problem being solved
- Proposed solution
- Alternatives considered
- Any impact on existing workflows

---

Thanks for helping make FabricFlow better.