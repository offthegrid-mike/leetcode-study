# Claude Code Instructions

## Branching Rules

**Never commit directly to `main`.** All changes — features, fixes, data updates, refactors — must be committed to a new feature branch first. Create a branch before making any changes, and submit work via pull request or have the user explicitly merge it.

Example:
```bash
git checkout -b feature/your-feature-name
# make changes, commit
# do NOT push to main directly
```
