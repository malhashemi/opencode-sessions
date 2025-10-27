This directory contains scripts for managing external repositories cloned for pattern study and research.

## Scripts

### `manage_catalog.py`

Main script for catalog management with the following commands:

```bash
# List all external repositories
uv run manage_catalog.py list
# Or: just extern

# Sync catalog with filesystem
uv run manage_catalog.py sync
# Or: just extern-sync

# Remove a repository (soft delete - marks as removed in catalog)
uv run manage_catalog.py remove <repo-name>
# Or: just extern-remove <repo-name>

# Delete a repository (hard delete - removes from catalog entirely)
uv run manage_catalog.py delete <repo-name>
# Or: just extern-delete <repo-name>

# Get repository names for shell completion
uv run manage_catalog.py completions
```

**Fuzzy Matching**: The `remove` and `delete` commands support fuzzy matching. If you provide a partial name that matches multiple repositories, you'll be prompted to select which one.

Examples:

```bash
# If you have: facebook-react, microsoft-react, vercel-react-native
just extern-remove react
# Will show all three and ask you to choose

just extern-remove facebook-react
# Exact match - no prompt needed
```

## ZSH Tab Completion

### Quick Setup

Run this command (replace `<PROJECT_ROOT>` with your actual project path):

```bash
echo 'source <PROJECT_ROOT>/.extern/scripts/completions.zsh' >> ~/.zshrc && source ~/.zshrc
```

Example:

```bash
echo 'source <PROJECT_ROOT>/.extern/scripts/completions.zsh' >> ~/.zshrc && source ~/.zshrc
```

This will add the completion script to your `~/.zshrc` and reload your shell automatically.

### Usage

Once enabled, you can tab-complete repository names:

```bash
just extern-remove <TAB>
# Shows: facebook-react  microsoft-react  vercel-next-js

just extern-delete face<TAB>
# Completes to: facebook-react
```

### Project-Local Setup (Alternative)

If you prefer project-local completions that only activate when in the project directory, you can use direnv or similar tools:

1. Create a `.envrc` file in the project root:

```bash
source .extern/scripts/completions.zsh
```

2. Allow direnv:

```bash
direnv allow
```

## Repository Naming Convention

External repositories are named with the organization prefix to avoid conflicts:

- `github.com/facebook/react` → `facebook-react`
- `github.com/vercel/next.js` → `vercel-next-js`
- `github.com/microsoft/typescript` → `microsoft-typescript`

This ensures uniqueness when different organizations have repos with the same name.

## Output Format

When listing repositories (`just extern`), the output shows:

```
🟢 facebook-react
   Name: FACEBOOK/REACT
   Purpose: Study hooks implementation
   Added: 2025-10-11
   Source: git clone --single-branch --depth 1 https://github.com/facebook/react

   Research Documents (2):
   - thoughts/shared/extern/repos/facebook-react/2025-10-11_hooks-analysis.md
   - thoughts/shared/extern/repos/facebook-react/2025-10-12_fiber-architecture.md
```

The **directory name** (`facebook-react`) is shown prominently as the primary identifier, with the display name shown as "Name".

## Testing

### Running Tests Locally

Run the test suite using just:

```bash
just test-extern
```

Or run directly with pytest:

```bash
cd .extern/scripts
uv run pytest test_manage_catalog.py -v
```

### Test Coverage

The test suite covers:

- Catalog loading and saving
- Directory scanning and exclusions
- Sync operations (add, remove, restore)
- Fuzzy matching for repository names
- User selection from multiple matches
- Repository removal (soft delete)
- Repository deletion (hard delete with confirmation)
- Shell completion output
- Listing and display formatting

### Continuous Integration

Tests automatically run on GitHub Actions when:

- Pushing to `main` or `develop` branches
- Opening pull requests to `main` or `develop`
- Changes are made to `.extern/scripts/` or the workflow file

The CI pipeline:

1. Installs uv and Python 3.11
2. Installs just for running commands
3. Runs `just test-extern`
4. Uploads test results as artifacts
