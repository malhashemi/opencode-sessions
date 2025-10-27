---
description: Clone an external repository to .extern/ for pattern study and implementation reference
argument-hint: "[clone-command-or-url] [purpose]"
agent: "build"
---

## Variables

### Static Variables

EXTERN_DIR: ".extern/"
CATALOG_FILE: ".extern/catalog.yaml"

### Dynamic Variables

- ARGUMENTS = $ARGUMENTS
  argument-hint: "[clone-command-or-url] [purpose]"

CLONE_INPUT: [first argument - the clone command, URL, or URL with fragment]
PURPOSE: [second argument - why this external repository is being added]

## Instructions

You are adding an external repository to the local extern directory for pattern study and learning purposes.

### Phase 1: Parse Clone Input

Intelligently parse {{CLONE_INPUT}} to extract:

- Repository URL
- Organization name and repository name
- Branch/tag (if specified)
- Any special git clone flags (--single-branch, --depth, etc.)

**Handle these input formats flexibly:**

- Full git clone command: `git clone --branch v6-alpha --single-branch https://github.com/org/repo`
- Just a URL: `https://github.com/org/repo`
- URL with fragment: `https://github.com/org/repo#branch-name`
- SSH URL: `git@github.com:org/repo.git`

**Extract the directory name** from the URL:

- Include organization name to avoid conflicts: `org-repo` (lowercase kebab-case)
- Example: `https://github.com/facebook/react` → `facebook-react`
- Example: `https://github.com/vercel/next.js` → `vercel-next-js`

### Phase 2: Setup Catalog

1. **Ensure .extern/ directory exists:**
   - If not, create it: `mkdir -p {{EXTERN_DIR}}`

2. **Check if catalog.yaml exists:**
   - If {{CATALOG_FILE}} does NOT exist, create it with this initial structure:

   ```yaml
   # External Repositories Catalog
   # This file tracks locally cloned external repositories and their associated research
   # Note: This file is gitignored - each developer maintains their own extern library

   references: []
   ```

   - If it DOES exist, read it to check the current state

### Phase 3: Clone the Repository

1. **Check if the repository already exists:**
   - Look in the catalog for an entry with `status: "active"` and matching path
   - If found and directory exists, skip cloning and note it already exists
   - If found in catalog but directory is missing, update status to "removed" and proceed with fresh clone

2. **Execute the clone:**
   - Clone to: `{{EXTERN_DIR}}[org-repo]/`
   - Use the parsed flags and branch information from Phase 1
   - If no specific flags were provided, use: `git clone --single-branch --depth 1` for a lightweight clone

3. **Verify clone success:**
   - Check if the directory was created
   - Check if it contains a valid git repository

### Phase 4: Update Catalog

1. **Add or update the entry for this repository:**
   - Read the current catalog
   - If an entry exists with status "removed" for this repo, update it to "active" and clear `date_removed`
   - If no entry exists, create a new one
   - Structure:

   ```yaml
   - name: "[ORG/REPO]"
     path: "{{EXTERN_DIR}}[org-repo]/"
     source: "[the exact clone command that was executed]"
     purpose: "{{PURPOSE}}"
     status: "active"
     date_added: "YYYY-MM-DD"
     date_removed: null
     research_documents: []
   ```

2. **Write the updated catalog back to {{CATALOG_FILE}}**

3. **Sync catalog with filesystem:**
   - Run: `just extern-sync`
   - This automatically:
     - Marks missing directories as "removed"
     - Adds any untracked directories to the catalog
     - Ensures catalog stays in sync with reality

### Phase 5: Confirmation

Present a summary to the user:

```
✅ External repository added successfully!

**Repository**: [org/repo]
**Location**: {{EXTERN_DIR}}[org-repo]/
**Purpose**: {{PURPOSE}}

The catalog has been updated and synced.

**Next steps:**
- View all extern repos: `just extern`
- Research this repository: Use session_new_run("/researcher/research-extern [org-repo] [question]")

**Example research command:**
session_new_run("/researcher/research-extern [org-repo] 'How does this implement error handling?'")
```

## Important Notes

- **Catalog creation**: If this is the first external repo being added, the catalog.yaml will be created automatically with empty references array
- **Organization naming**: Directory names include org to avoid conflicts (e.g., `facebook-react`, `vercel-next-js`)
- **Catalog maintenance**: A Python script in `.extern/scripts/manage_catalog.py` handles catalog sync via `just extern-sync` - it automatically:
  - Marks missing directories as "removed"
  - Adds untracked directories to the catalog
  - Keeps catalog in sync with filesystem
- **Personal library**: The catalog is gitignored - each developer maintains their own extern collection
- **Shared research**: While extern repos are personal, research outputs are saved to thoughts/shared/extern/repos/ and shared with the team
- **Flexible input**: Accept whatever format the user provides and parse it intelligently
- **Just commands**: Users can run `just extern` to list all repos or `just extern-sync` to manually sync the catalog
