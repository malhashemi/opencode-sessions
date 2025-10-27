#!/usr/bin/env python3
"""Unit tests for manage_catalog.py

Run with: pytest test_manage_catalog.py
Or: just test-extern
"""

# /// script
# dependencies = [
#   "pytest>=7.0",
#   "pyyaml>=6.0",
# ]
# ///

import sys
from pathlib import Path
from unittest.mock import patch

import pytest
import yaml

# Import the module under test
sys.path.insert(0, str(Path(__file__).parent))
import manage_catalog


@pytest.fixture
def temp_extern_dir(tmp_path):
    """Create a temporary .extern directory structure."""
    extern_dir = tmp_path / ".extern"
    extern_dir.mkdir()
    
    # Create scripts directory (should be excluded)
    scripts_dir = extern_dir / "scripts"
    scripts_dir.mkdir()
    
    return extern_dir


@pytest.fixture
def sample_catalog():
    """Sample catalog data."""
    return {
        "references": [
            {
                "name": "FACEBOOK/REACT",
                "path": ".extern/facebook-react/",
                "source": "git clone https://github.com/facebook/react",
                "purpose": "Study hooks implementation",
                "status": "active",
                "date_added": "2025-01-01",
                "date_removed": None,
                "research_documents": []
            },
            {
                "name": "VERCEL/NEXT",
                "path": ".extern/vercel-next/",
                "source": "git clone https://github.com/vercel/next",
                "purpose": "Study SSR patterns",
                "status": "removed",
                "date_added": "2025-01-01",
                "date_removed": "2025-01-15",
                "research_documents": []
            }
        ]
    }


@pytest.fixture
def mock_extern_dir(temp_extern_dir, monkeypatch):
    """Mock the EXTERN_DIR global variable."""
    monkeypatch.setattr(manage_catalog, "EXTERN_DIR", temp_extern_dir)
    monkeypatch.setattr(manage_catalog, "CATALOG_FILE", temp_extern_dir / "catalog.yaml")
    return temp_extern_dir


class TestLoadCatalog:
    """Tests for load_catalog()"""
    
    def test_load_empty_catalog(self, mock_extern_dir):
        """Should return empty structure if catalog doesn't exist."""
        result = manage_catalog.load_catalog()
        assert result == {"references": []}
    
    def test_load_existing_catalog(self, mock_extern_dir, sample_catalog):
        """Should load existing catalog."""
        catalog_file = mock_extern_dir / "catalog.yaml"
        with open(catalog_file, "w") as f:
            yaml.dump(sample_catalog, f)
        
        result = manage_catalog.load_catalog()
        assert result == sample_catalog
        assert len(result["references"]) == 2


class TestSaveCatalog:
    """Tests for save_catalog()"""
    
    def test_save_catalog(self, mock_extern_dir, sample_catalog):
        """Should save catalog to file."""
        manage_catalog.save_catalog(sample_catalog)
        
        catalog_file = mock_extern_dir / "catalog.yaml"
        assert catalog_file.exists()
        
        with open(catalog_file) as f:
            loaded = yaml.safe_load(f)
        
        assert loaded == sample_catalog


class TestGetDirectoryRepos:
    """Tests for get_directory_repos()"""
    
    def test_get_empty_repos(self, mock_extern_dir):
        """Should return empty set when no repos exist."""
        result = manage_catalog.get_directory_repos()
        assert result == set()
    
    def test_get_repos_excludes_special_dirs(self, mock_extern_dir):
        """Should exclude scripts and __pycache__ directories."""
        # Create various directories
        (mock_extern_dir / "facebook-react").mkdir()
        (mock_extern_dir / "vercel-next").mkdir()
        (mock_extern_dir / "__pycache__").mkdir()
        (mock_extern_dir / ".hidden").mkdir()
        
        result = manage_catalog.get_directory_repos()
        
        assert result == {"facebook-react", "vercel-next"}
        assert "scripts" not in result
        assert "__pycache__" not in result
        assert ".hidden" not in result


class TestSyncCatalog:
    """Tests for sync_catalog()"""
    
    def test_sync_adds_new_repos(self, mock_extern_dir):
        """Should add new directories to catalog."""
        # Create a repo directory
        (mock_extern_dir / "facebook-react").mkdir()
        
        added, removed, restored = manage_catalog.sync_catalog()
        
        assert added == ["facebook-react"]
        assert removed == []
        assert restored == []
        
        # Verify catalog was created
        catalog = manage_catalog.load_catalog()
        assert len(catalog["references"]) == 1
        assert catalog["references"][0]["path"] == ".extern/facebook-react/"
    
    def test_sync_marks_missing_as_removed(self, mock_extern_dir, sample_catalog):
        """Should mark active repos as removed if directory is missing."""
        # Save catalog with active repo
        manage_catalog.save_catalog(sample_catalog)
        
        # Don't create the directory - it's missing
        added, removed, restored = manage_catalog.sync_catalog()
        
        assert added == []
        assert "facebook-react" in removed
        assert restored == []
        
        # Verify status changed
        catalog = manage_catalog.load_catalog()
        fb_react = [r for r in catalog["references"] if "facebook-react" in r["path"]][0]
        assert fb_react["status"] == "removed"
        assert fb_react["date_removed"] is not None
    
    def test_sync_restores_removed_repos(self, mock_extern_dir, sample_catalog):
        """Should restore removed repos if directory reappears."""
        # Save catalog with removed repo
        manage_catalog.save_catalog(sample_catalog)
        
        # Create the directory for the active repo (so it doesn't get marked as removed)
        (mock_extern_dir / "facebook-react").mkdir()
        
        # Create the directory for the removed repo (should restore it)
        (mock_extern_dir / "vercel-next").mkdir()
        
        added, removed, restored = manage_catalog.sync_catalog()
        
        assert added == []
        assert removed == []
        assert restored == ["vercel-next"]
        
        # Verify status changed back to active
        catalog = manage_catalog.load_catalog()
        vercel_next = [r for r in catalog["references"] if "vercel-next" in r["path"]][0]
        assert vercel_next["status"] == "active"
        assert vercel_next["date_removed"] is None


class TestFindRepoMatches:
    """Tests for find_repo_matches()"""
    
    def test_exact_match(self, sample_catalog):
        """Should return exact match first."""
        references = sample_catalog["references"]
        matches = manage_catalog.find_repo_matches("facebook-react", references)
        
        assert len(matches) == 1
        assert matches[0][0] == "facebook-react"
    
    def test_partial_match(self, sample_catalog):
        """Should find partial matches."""
        references = sample_catalog["references"]
        matches = manage_catalog.find_repo_matches("react", references)
        
        assert len(matches) == 1
        assert matches[0][0] == "facebook-react"
    
    def test_multiple_matches(self, sample_catalog):
        """Should return all matching repos."""
        # Add another react repo
        sample_catalog["references"].append({
            "name": "MICROSOFT/REACT",
            "path": ".extern/microsoft-react/",
            "status": "active",
            "date_added": "2025-01-01"
        })
        
        references = sample_catalog["references"]
        matches = manage_catalog.find_repo_matches("react", references)
        
        assert len(matches) == 2
        dir_names = [m[0] for m in matches]
        assert "facebook-react" in dir_names
        assert "microsoft-react" in dir_names
    
    def test_no_match(self, sample_catalog):
        """Should return empty list for no matches."""
        references = sample_catalog["references"]
        matches = manage_catalog.find_repo_matches("nonexistent", references)
        
        assert matches == []


class TestSelectRepoFromMatches:
    """Tests for select_repo_from_matches()"""
    
    def test_user_selection(self, sample_catalog):
        """Should return selected repo on valid input."""
        references = sample_catalog["references"]
        matches = [(Path(r["path"]).name, r) for r in references]
        
        with patch('builtins.input', return_value='1'):
            result = manage_catalog.select_repo_from_matches(matches, "react")
        
        assert result is not None
        assert result[0] == "facebook-react"
    
    def test_user_cancellation(self, sample_catalog):
        """Should return None when user cancels."""
        references = sample_catalog["references"]
        matches = [(Path(r["path"]).name, r) for r in references]
        
        with patch('builtins.input', return_value='0'):
            result = manage_catalog.select_repo_from_matches(matches, "react")
        
        assert result is None


class TestRemoveRepo:
    """Tests for remove_repo()"""
    
    def test_remove_existing_repo(self, mock_extern_dir, sample_catalog):
        """Should remove repo directory and mark as removed."""
        # Setup
        manage_catalog.save_catalog(sample_catalog)
        repo_dir = mock_extern_dir / "facebook-react"
        repo_dir.mkdir()
        
        # Execute
        manage_catalog.remove_repo("facebook-react")
        
        # Verify directory removed
        assert not repo_dir.exists()
        
        # Verify catalog updated
        catalog = manage_catalog.load_catalog()
        fb_react = [r for r in catalog["references"] if "facebook-react" in r["path"]][0]
        assert fb_react["status"] == "removed"
        assert fb_react["date_removed"] is not None
    
    def test_remove_nonexistent_repo(self, mock_extern_dir, sample_catalog):
        """Should exit with error for nonexistent repo."""
        manage_catalog.save_catalog(sample_catalog)
        
        with pytest.raises(SystemExit) as exc_info:
            manage_catalog.remove_repo("nonexistent-repo")
        
        assert exc_info.value.code == 1


class TestDeleteRepo:
    """Tests for delete_repo()"""
    
    def test_delete_with_confirmation(self, mock_extern_dir, sample_catalog):
        """Should delete repo from catalog after confirmation."""
        # Setup
        manage_catalog.save_catalog(sample_catalog)
        repo_dir = mock_extern_dir / "facebook-react"
        repo_dir.mkdir()
        
        # Mock user confirmation
        with patch('builtins.input', return_value='yes'):
            manage_catalog.delete_repo("facebook-react")
        
        # Verify directory removed
        assert not repo_dir.exists()
        
        # Verify completely removed from catalog
        catalog = manage_catalog.load_catalog()
        fb_react = [r for r in catalog["references"] if "facebook-react" in r["path"]]
        assert len(fb_react) == 0
    
    def test_delete_cancelled(self, mock_extern_dir, sample_catalog):
        """Should not delete if user cancels."""
        # Setup
        manage_catalog.save_catalog(sample_catalog)
        original_count = len(sample_catalog["references"])
        
        # Mock user cancellation
        with pytest.raises(SystemExit) as exc_info:
            with patch('builtins.input', return_value='no'):
                manage_catalog.delete_repo("facebook-react")
        
        assert exc_info.value.code == 0
        
        # Verify catalog unchanged
        catalog = manage_catalog.load_catalog()
        assert len(catalog["references"]) == original_count


class TestCompletions:
    """Tests for completions()"""
    
    def test_completions_output(self, mock_extern_dir, sample_catalog, capsys):
        """Should output repo names one per line."""
        manage_catalog.save_catalog(sample_catalog)
        
        manage_catalog.completions()
        
        captured = capsys.readouterr()
        lines = captured.out.strip().split('\n')
        
        assert "facebook-react" in lines
        assert "vercel-next" in lines


class TestListReferences:
    """Tests for list_references()"""
    
    def test_list_empty(self, mock_extern_dir, capsys):
        """Should show empty message when no repos exist."""
        manage_catalog.list_references()
        
        captured = capsys.readouterr()
        assert "No external repositories" in captured.out
    
    def test_list_with_repos(self, mock_extern_dir, sample_catalog, capsys):
        """Should display repo information."""
        manage_catalog.save_catalog(sample_catalog)
        
        manage_catalog.list_references()
        
        captured = capsys.readouterr()
        assert "facebook-react" in captured.out
        assert "FACEBOOK/REACT" in captured.out
        assert "vercel-next" in captured.out
        assert "Study hooks implementation" in captured.out


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
