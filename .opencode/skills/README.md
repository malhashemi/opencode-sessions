# OpenCode Skills

This directory contains skills that extend Claude's capabilities following Anthropic's Agent Skills Specification (v1.0).

## What are Skills?

Skills are modular, self-contained packages that provide specialized knowledge, workflows, and tools. They transform Claude from a general-purpose agent into a specialized agent equipped with domain expertise.

## Directory Structure

```
.opencode/skills/
├── skill-creator/       - Guide for creating new skills
│   ├── SKILL.md        - Required skill definition
│   ├── scripts/        - Helper scripts
│   └── LICENSE.txt     - License information
└── your-skill/         - Your custom skill
    ├── SKILL.md        - Required skill definition
    ├── scripts/        - Optional: Executable code
    ├── references/     - Optional: Documentation
    └── assets/         - Optional: Templates, images, etc.
```

## How Skills Work

1. **Discovery**: Plugin scans for `SKILL.md` files at startup
2. **Validation**: Each skill is validated against the spec
3. **Registration**: A tool is created for each skill: `skills_{{skill_name}}`
4. **Invocation**: Claude calls the skill tool to get instructions
5. **Execution**: Claude follows the skill's instructions with available tools

## Creating a Skill

See the `skill-creator` skill for detailed guidance:

```bash
# Use the skill-creator skill for help
# In OpenCode, invoke: skills_skill_creator
```

## Skill Naming

- Directory name: `my-skill` (lowercase with hyphens)
- Frontmatter name: Must match directory name exactly
- Tool name: `skills_my_skill` (auto-generated)
- Nested skills: `skills_category_subcategory_skill`

## Supporting Files

Skills can include supporting files with relative paths:

```markdown
For details, read `references/api-docs.md`.
To execute, run `scripts/deploy.sh`.
For templates, see `assets/template.html`.
```

The plugin provides base directory context so Claude can resolve these paths correctly.

## Global Skills

Skills in `~/.opencode/skills/` are available across all projects.

## Examples

See existing skills in this directory for examples:
- `skill-creator/` - Simple skill with scripts
- (Add your skills here)

## References

- [Anthropic Skills Specification](https://github.com/anthropics/skills)
- [OpenCode Plugin Documentation](../.opencode/docs/plugins.mdx)
