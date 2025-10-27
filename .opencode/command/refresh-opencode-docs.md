---
description: Downloads the latest OpenCode documentation from the official GitHub repository to keep local knowledge base up-to-date.
---

# Refresh OpenCode Documentation

Downloads the latest OpenCode documentation from the official GitHub repository to keep local knowledge base up-to-date.

## Variables

### Static Variables
GITHUB_REPO: "sst/opencode"
SOURCE_PATH: "packages/web/src/content/docs"
TARGET_DIR: ".opencode/docs"
BRANCH: "dev"

## Instructions

### Initial Setup
When invoked, this command will fetch the latest documentation files from the OpenCode repository and save them locally for reference.

### Important Notes
- Always creates `.opencode/docs` directory if it doesn't exist
- Overwrites existing files with latest versions
- Downloads all MDX files from the documentation source
- Uses GitHub CLI (gh) for efficient API access

### Configuration Details
- Requires GitHub CLI to be installed and authenticated
- Downloads from the dev branch by default
- Preserves MDX format for documentation files

## Workflow

### Step 1: Create Target Directory
Ensure the `.opencode/docs` directory exists to store documentation files.

### Step 2: Fetch File List
Use GitHub API to get the list of all MDX files in the source documentation directory.

### Step 3: Download Documentation Files
Iterate through each file and download its content:
- Fetch file content via GitHub API
- Decode base64 content
- Save to local `.opencode/docs` directory
- Provide progress feedback for each file

### Step 4: Verify Download
List the downloaded files to confirm successful retrieval and show file count/sizes.

### Step 5: Completion Summary
Report total files downloaded and confirm documentation is ready for use.