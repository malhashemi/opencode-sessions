---
description: Research an external repository to understand patterns and implementations
argument-hint: "[repo-name] [research-question]"
agent: "researcher"
---

## Variables

### Static Variables

EXTERN_DIR: ".extern/"
CATALOG_FILE: ".extern/catalog.yaml"
OUTPUT_DIR_OVERRIDE: "thoughts/shared/extern/repos/"

### Dynamic Variables

- ARGUMENTS = $ARGUMENTS
  argument-hint: "[repo-name] [research-question]"

REPO_NAME: [first argument - name of the external repository (e.g., org-repo)]
RESEARCH_QUESTION: [second argument - what to research about it]

## Instructions

Conduct a comprehensive research investigation of the external repository located at `{{EXTERN_DIR}}{{REPO_NAME}}/` to answer the research question: "{{RESEARCH_QUESTION}}"

**Session Management**: This command should be invoked via session management tools when delegated from another agent:

- Use `session_new_run("/researcher/research-extern [repo-name] [question]")` to run in a fresh session
- This ensures the researcher agent has full context and proper tool access

### Research Focus

**Primary investigation target**: `{{EXTERN_DIR}}{{REPO_NAME}}/`

This is an external repository cloned for pattern study. Your investigation should focus on understanding:

- Implementation patterns and conventions
- Architectural decisions
- Code organization and structure
- Specific features or mechanisms related to the research question

### Output Location Override

**IMPORTANT**: Override your default research output location.

**Save to**: `{{OUTPUT_DIR_OVERRIDE}}{{REPO_NAME}}/`  
**NOT to**: Your default output directory (the RESEARCH_OUTPUT_DIR variable in your system prompt)

This ensures external repository research is organized separately from primary codebase research.

### Post-Research Catalog Update

After successfully completing your research and creating the research document:

1. **Read the catalog**: Load `{{CATALOG_FILE}}`

2. **Find the entry** for repository with `name` or `path` matching `{{REPO_NAME}}`

3. **Update the research_documents array**:
   - Add the path to your newly created research document
   - Path format: `{{OUTPUT_DIR_OVERRIDE}}{{REPO_NAME}}/[your-research-document-filename].md`
   - Append to the existing array (don't replace)

4. **Write the updated catalog** back to `{{CATALOG_FILE}}`

5. **Note to user**: Mention that the catalog has been updated with the new research document reference

### Example Catalog Update

If you created: `thoughts/shared/extern/repos/facebook-react/2025-10-11_hooks-implementation.md`

The catalog entry should be updated from:

```yaml
- name: "FACEBOOK/REACT"
  research_documents: []
```

To:

```yaml
- name: "FACEBOOK/REACT"
  research_documents:
    - "thoughts/shared/extern/repos/facebook-react/2025-10-11_hooks-implementation.md"
```

## Important Notes

- **Use your standard research workflow**: Follow all your normal research patterns (parallel sub-agents, synthesis, metadata, etc.)
- **Only the output location is different**: Everything else about your research process remains the same
- **Catalog is local**: The catalog.yaml is gitignored, but the research document you create is tracked and shared
- **Focus on the external repo**: While you can reference the main codebase for context or comparison, the primary investigation is the external repository
