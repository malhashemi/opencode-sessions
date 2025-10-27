# List all available recipes
default:
    @just --list

# Manage extern catalog - list all external repositories (default)
extern:
    @uv run .extern/scripts/manage_catalog.py list

# Sync the extern catalog with filesystem
extern-sync:
    @uv run .extern/scripts/manage_catalog.py sync

# Remove an external repository (marks as removed in catalog, preserves research)
extern-remove repo:
    @uv run .extern/scripts/manage_catalog.py remove {{repo}}

# Delete an external repository from catalog entirely (with confirmation, preserves research)
extern-delete repo:
    @uv run .extern/scripts/manage_catalog.py delete {{repo}}

# Run unit tests for extern catalog management
test-extern:
    @echo "Running extern catalog tests..."
    @uv run .extern/scripts/test_manage_catalog.py
