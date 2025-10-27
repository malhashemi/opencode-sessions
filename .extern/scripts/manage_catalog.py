#!/usr/bin/env python3
"""Manage the extern catalog - sync with filesystem and list external repositories.

Usage:
    python manage_catalog.py sync                # Sync catalog with filesystem
    python manage_catalog.py list                # Display external repos in pretty format
    python manage_catalog.py remove [repo]       # Remove repo directory, mark as removed in catalog
    python manage_catalog.py delete [repo]       # Remove repo directory AND delete from catalog (with confirmation)
    python manage_catalog.py completions         # List repo names for shell completion
    python manage_catalog.py                     # Same as list
"""

# /// script
# dependencies = [
#   "pyyaml>=6.0",
# ]
# ///

import sys
import shutil
from pathlib import Path
from datetime import datetime
from typing import Any

import yaml


# Navigate to .extern/ from .extern/scripts/
EXTERN_DIR = Path(__file__).parent.parent
CATALOG_FILE = EXTERN_DIR / "catalog.yaml"


def load_catalog() -> dict[str, Any]:
    """Load the catalog file or return empty structure."""
    if not CATALOG_FILE.exists():
        return {"references": []}
    
    with open(CATALOG_FILE) as f:
        return yaml.safe_load(f) or {"references": []}


def save_catalog(catalog: dict[str, Any]) -> None:
    """Save the catalog file."""
    with open(CATALOG_FILE, "w") as f:
        yaml.dump(catalog, f, default_flow_style=False, sort_keys=False)


def get_directory_repos() -> set[str]:
    """Get all repository directories in .extern/."""
    repos = set()
    excluded = {"scripts", "__pycache__"}
    for item in EXTERN_DIR.iterdir():
        if item.is_dir() and not item.name.startswith(".") and item.name not in excluded:
            repos.add(item.name)
    return repos


def sync_catalog() -> tuple[list[str], list[str], list[str]]:
    """Sync catalog with filesystem state.
    
    Returns:
        Tuple of (added, removed, restored) repo names
    """
    catalog = load_catalog()
    references = catalog.get("references", [])
    
    # Build lookup by directory name
    catalog_entries = {}
    for ref in references:
        dir_name = Path(ref["path"]).name
        catalog_entries[dir_name] = ref
    
    # Get actual directories
    actual_repos = get_directory_repos()
    
    added = []
    removed = []
    restored = []
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Check for missing directories (should be marked removed)
    for dir_name, ref in catalog_entries.items():
        if dir_name not in actual_repos and ref.get("status") == "active":
            ref["status"] = "removed"
            ref["date_removed"] = today
            removed.append(dir_name)
    
    # Check for new directories (not in catalog)
    for dir_name in actual_repos:
        if dir_name not in catalog_entries:
            # Add new entry with empty fields
            references.append({
                "name": dir_name.upper().replace("-", " "),
                "path": f".extern/{dir_name}/",
                "source": "",
                "purpose": "",
                "status": "active",
                "date_added": today,
                "date_removed": None,
                "research_documents": []
            })
            added.append(dir_name)
        elif catalog_entries[dir_name].get("status") == "removed":
            # Directory exists but was marked removed - restore it
            catalog_entries[dir_name]["status"] = "active"
            catalog_entries[dir_name]["date_removed"] = None
            restored.append(dir_name)
    
    catalog["references"] = references
    save_catalog(catalog)
    
    return added, removed, restored


def find_repo_matches(search_term: str, references: list[dict[str, Any]]) -> list[tuple[str, dict[str, Any]]]:
    """Find repositories matching the search term.
    
    Returns list of (dir_name, ref_entry) tuples.
    """
    matches = []
    for ref in references:
        dir_name = Path(ref["path"]).name
        # Exact match
        if dir_name == search_term:
            return [(dir_name, ref)]
        # Partial match
        if search_term.lower() in dir_name.lower():
            matches.append((dir_name, ref))
    return matches


def select_repo_from_matches(matches: list[tuple[str, dict[str, Any]]], search_term: str) -> tuple[str, dict[str, Any]] | None:
    """Prompt user to select from multiple matches.
    
    Returns (dir_name, ref_entry) or None if cancelled.
    """
    print(f"\n🔍 Multiple repositories match '{search_term}':\n")
    for i, (dir_name, ref) in enumerate(matches, 1):
        status = "🟢" if ref.get("status") == "active" else "🔴"
        print(f"   {i}. {status} {dir_name} ({ref['name']})")
    
    print(f"\n   0. Cancel")
    
    while True:
        try:
            choice = input(f"\n   Select repository (0-{len(matches)}): ").strip()
            choice_num = int(choice)
            
            if choice_num == 0:
                return None
            if 1 <= choice_num <= len(matches):
                return matches[choice_num - 1]
            
            print(f"   ❌ Invalid choice. Please enter 0-{len(matches)}")
        except ValueError:
            print(f"   ❌ Invalid input. Please enter a number")
        except KeyboardInterrupt:
            print("\n   ❌ Cancelled\n")
            return None


def list_references() -> None:
    """Display external repositories in a pretty format."""
    catalog = load_catalog()
    references = catalog.get("references", [])
    
    if not references:
        print("\n📚 External Repositories Catalog\n")
        print("No external repositories have been added yet.\n")
        print("Use `/add-extern [clone-command-or-url] [purpose]` to add your first external repository.\n")
        return
    
    active_refs = [r for r in references if r.get("status") == "active"]
    removed_refs = [r for r in references if r.get("status") == "removed"]
    
    print("\n📚 External Repositories Catalog\n")
    print("=" * 64)
    
    # Active references
    for ref in active_refs:
        dir_name = Path(ref["path"]).name
        print(f"\n🟢 {dir_name}")
        print(f"   Name: {ref['name']}")
        if ref.get("purpose"):
            print(f"   Purpose: {ref['purpose']}")
        else:
            print("   Purpose: (not specified)")
        print(f"   Added: {ref['date_added']}")
        if ref.get("source"):
            print(f"   Source: {ref['source']}")
        
        research_docs = ref.get("research_documents", [])
        print(f"\n   Research Documents ({len(research_docs)}):")
        if research_docs:
            for doc in research_docs:
                print(f"   - {doc}")
        else:
            print("   - No research conducted yet")
        
        print("\n" + "-" * 64)
    
    # Removed references
    if removed_refs:
        print()
        for ref in removed_refs:
            dir_name = Path(ref["path"]).name
            print(f"\n🔴 {dir_name} (REMOVED)")
            print(f"   Name: {ref['name']}")
            if ref.get("purpose"):
                print(f"   Purpose: {ref['purpose']}")
            print(f"   Added: {ref['date_added']}")
            print(f"   Removed: {ref.get('date_removed', 'unknown')}")
            
            research_docs = ref.get("research_documents", [])
            if research_docs:
                print(f"\n   Research Documents ({len(research_docs)}):")
                for doc in research_docs:
                    print(f"   - {doc}")
            
            print("\n" + "-" * 64)
    
    # Summary
    total_research = sum(len(r.get("research_documents", [])) for r in references)
    print(f"\nSummary:")
    print(f"- Active External Repos: {len(active_refs)}")
    print(f"- Removed External Repos: {len(removed_refs)}")
    print(f"- Total Research Documents: {total_research}")
    
    print("\n" + "=" * 64)
    print("\n💡 Quick Commands:")
    print("- Add new external repo: /add-extern [clone-info] [purpose]")
    print("- Research an external repo: /research-extern [repo-name] [question]")
    print("- Sync catalog: just extern-sync")
    print("- Remove repo (mark as removed): just extern-remove [repo-name]")
    print("- Delete repo (remove from catalog): just extern-delete [repo-name]")
    print("- View catalog file: cat .extern/catalog.yaml\n")


def remove_repo(repo_name: str) -> None:
    """Remove repository directory and mark as removed in catalog.
    
    Research documents are preserved. Supports fuzzy matching.
    """
    catalog = load_catalog()
    references = catalog.get("references", [])
    
    # Find matching repositories
    matches = find_repo_matches(repo_name, references)
    
    if not matches:
        print(f"\n❌ Error: No repository matching '{repo_name}' found in catalog")
        print("   Use 'just extern' to see available repositories\n")
        sys.exit(1)
    
    # If multiple matches, ask user to select
    if len(matches) > 1:
        result = select_repo_from_matches(matches, repo_name)
        if not result:
            print("\n❌ Cancelled\n")
            sys.exit(0)
        dir_name, repo_entry = result
    else:
        dir_name, repo_entry = matches[0]
    
    repo_path = EXTERN_DIR / dir_name
    
    # Remove directory if it exists
    if repo_path.exists():
        shutil.rmtree(repo_path)
        print(f"\n🗑️  Removed directory: {repo_path}")
    else:
        print(f"\n⚠️  Directory not found: {repo_path}")
    
    # Update catalog status
    today = datetime.now().strftime("%Y-%m-%d")
    repo_entry["status"] = "removed"
    repo_entry["date_removed"] = today
    
    save_catalog(catalog)
    
    print(f"✅ Marked '{repo_entry['name']}' as removed in catalog")
    
    research_docs = repo_entry.get("research_documents", [])
    if research_docs:
        print(f"\n📚 Research documents preserved:")
        for doc in research_docs:
            print(f"   - {doc}")
    
    print()


def delete_repo(repo_name: str) -> None:
    """Remove repository directory AND delete entry from catalog.
    
    Requires confirmation. Research documents are preserved. Supports fuzzy matching.
    """
    catalog = load_catalog()
    references = catalog.get("references", [])
    
    # Find matching repositories
    matches = find_repo_matches(repo_name, references)
    
    if not matches:
        print(f"\n❌ Error: No repository matching '{repo_name}' found in catalog")
        print("   Use 'just extern' to see available repositories\n")
        sys.exit(1)
    
    # If multiple matches, ask user to select
    if len(matches) > 1:
        result = select_repo_from_matches(matches, repo_name)
        if not result:
            print("\n❌ Cancelled\n")
            sys.exit(0)
        dir_name, repo_entry = result
    else:
        dir_name, repo_entry = matches[0]
    
    # Show what will be deleted
    print(f"\n⚠️  You are about to DELETE the following:")
    print(f"   Repository: {repo_entry['name']}")
    print(f"   Path: {repo_entry['path']}")
    if repo_entry.get("purpose"):
        print(f"   Purpose: {repo_entry['purpose']}")
    
    research_docs = repo_entry.get("research_documents", [])
    if research_docs:
        print(f"\n   📚 Research documents (will be PRESERVED):")
        for doc in research_docs:
            print(f"      - {doc}")
    
    # Confirmation
    print("\n   This will:")
    print("   • Remove the repository directory from .extern/")
    print("   • Delete the entry from catalog.yaml")
    print("   • Preserve all research documents")
    
    response = input("\n   Continue? (yes/no): ").strip().lower()
    
    if response not in ["yes", "y"]:
        print("\n❌ Deletion cancelled\n")
        sys.exit(0)
    
    # Remove directory if it exists
    repo_path = EXTERN_DIR / dir_name
    if repo_path.exists():
        shutil.rmtree(repo_path)
        print(f"\n🗑️  Removed directory: {repo_path}")
    
    # Delete from catalog
    references.remove(repo_entry)
    catalog["references"] = references
    save_catalog(catalog)
    
    print(f"✅ Deleted '{repo_entry['name']}' from catalog")
    
    if research_docs:
        print(f"\n📚 Research documents preserved - cleanup separately if needed")
    
    print()


def completions() -> None:
    """Output repository names for shell completion."""
    catalog = load_catalog()
    references = catalog.get("references", [])
    
    for ref in references:
        dir_name = Path(ref["path"]).name
        print(dir_name)


def main() -> None:
    """Main entry point."""
    command = sys.argv[1] if len(sys.argv) > 1 else "list"
    
    if command == "sync":
        added, removed, restored = sync_catalog()
        print("\n🔄 Catalog sync completed:")
        if added:
            print(f"  ✅ Added: {', '.join(added)}")
        if removed:
            print(f"  ❌ Removed: {', '.join(removed)}")
        if restored:
            print(f"  🔁 Restored: {', '.join(restored)}")
        if not (added or removed or restored):
            print("  ✨ No changes needed - catalog is up to date")
        print()
    elif command == "list":
        list_references()
    elif command == "completions":
        completions()
    elif command == "remove":
        if len(sys.argv) < 3:
            print("\n❌ Error: Repository name required")
            print("   Usage: just extern-remove [repo-name]\n")
            sys.exit(1)
        remove_repo(sys.argv[2])
    elif command == "delete":
        if len(sys.argv) < 3:
            print("\n❌ Error: Repository name required")
            print("   Usage: just extern-delete [repo-name]\n")
            sys.exit(1)
        delete_repo(sys.argv[2])
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
