# External Repositories Directory Guide

## Purpose

This directory includes any repositories that we clone to learn certain patterns or to understand how certain features are implemented. **They are not parts of the project itself** - they are reference material for study and learning.

## When to Use This Directory

If you are finding yourself here, then you are probably looking to do some research-related tasks to understand certain patterns or implementation approaches used in external projects.

This directory is best suited when researcher-type agents are looking into implementation details, architectural patterns, or coding conventions from other codebases.

## Suitable Agents for This Directory

The following agents are well-equipped to work with external repositories:

- **codebase-pattern-finder**: Excellent for finding similar implementations and usage examples across the external codebase
- **codebase-analyzer**: Deep dives into implementation details and technical workings with precise file:line references
- **codebase-locator**: Finds WHERE files and components live by purpose or feature
- **web-search-researcher**: Use when you need additional context about the external project from external sources

## Current Inventory

See `@catalog.yaml` for the current list of cloned external repositories, their purposes, and associated research documents.

## Quick Start Commands

### Adding a New External Repository

If you are looking for a specific repo that doesn't exist here, you can request it to be cloned using your session management tool:

```
session_new_run("/researcher/add-extern [clone-command-or-url] [purpose]")
```

**IMPORTANT - This runs asynchronously in a new session:**

- The command will NOT give you immediate feedback
- The repository will be cloned and set up in the background
- Do NOT wait for it to complete
- Simply report to the user that you've requested the external repository
- The new session will handle cloning, catalog updates, and setup

**Example:**

```
session_new_run("/researcher/add-extern https://github.com/org/repo 'Error handling conventions and module structure patterns'")
```

**What to tell the user:**
"I've requested that `org/repo` be added to the extern directory in a new session. Once complete, you can research it with `/researcher/research-extern`."

### Researching an External Repository

If you are accessing this directory and you find the repo you are looking for but you are not one of the suitable agents listed above, delegate to the researcher agent using session management tools:

```
session_new_run("/researcher/research-extern [repo-name] [research-question]")
```

**Run in a new session** to ensure the researcher agent handles the investigation with full context.

**Example:**

```
session_new_run("/researcher/research-extern example-repo 'How does this repo handle error propagation across modules?'")
```

### Viewing Current External Repositories

To see what external repositories are currently available, run:

```bash
just extern
```

This will show active and removed external repositories along with their associated research documents.

## Research Output Location

All research conducted on external repositories is saved to:

```
thoughts/shared/extern/repos/[repo-name]/
```

This ensures that research insights are:

- Tracked in version control
- Shared with the team
- Discoverable through the catalog
- Preserved even if individual developers don't have the external repo cloned locally

## Important Notes

- **Personal Libraries**: Each developer maintains their own set of cloned external repos (not tracked in git)
- **Shared Research**: Research outputs are tracked and shared with the team via thoughts/
- **Catalog Entries**: The catalog.yaml tracks what's available locally and points to shared research
- **Stay Focused**: These are reference materials for learning - they should not become dependencies of the main project
