---
description: "Validate implementation plan execution, verify success criteria, and identify deviations"
argument-hint: "[plan-path]"
---

# Validate Plan

You are tasked with validating that an implementation plan was correctly executed, verifying all success criteria and identifying any deviations or issues.

## Variables

### Static Variables

PLANS_DIR: "thoughts/shared/plans/"
VALIDATE_DIR: "thoughts/shared/validate/"
METADATA_SCRIPT: "scripts/spec_metadata.sh"
SYNC_COMMAND: "thoughts sync"
FILENAME_TEMPLATE: "YYYY-MM-DD_HH-MM-SS_topic.md"

### Dynamic Variables

PLAN_PATH: $ARGUMENTS

### Git Commands

GIT_LOG_CMD: "git log --oneline -n 20"
GIT_DIFF_CMD: "git diff HEAD~N..HEAD"
GIT_ROOT_CMD: "git rev-parse --show-toplevel"

### Verification Commands

CMD_MAKE_CHECK: "make check test"
CMD_MAKE_BUILD: "make build"
CMD_MAKE_TEST: "make test"
CMD_MAKE_LINT: "make lint"

### Research Agents

AGENT_CODEBASE_ANALYZER: "codebase-analyzer"
AGENT_CODEBASE_LOCATOR: "codebase-locator"
AGENT_CODEBASE_PATTERN: "codebase-pattern-finder"

## Instructions

### Initial Setup

When invoked:

1. **Determine context** - Are you in an existing conversation or starting fresh?
   - If existing: Review what was implemented in this session
   - If fresh: Need to discover what was done through git and codebase analysis

2. **Locate the plan**:
   - If {{PLAN_PATH}} provided, use it
   - Otherwise, search recent commits for plan references or ask user

3. **Gather implementation evidence**:

   ```bash
   # Check recent commits
   GIT_LOG_CMD
   GIT_DIFF_CMD  # Where N covers implementation commits

   # Run comprehensive checks
   cd $(GIT_ROOT_CMD) && CMD_MAKE_CHECK
   ```

### Working with Existing Context

If you were part of the implementation:

- Review the conversation history
- Check your todo list for what was completed
- Focus validation on work done in this session
- Be honest about any shortcuts or incomplete items

### Important Guidelines

1. **Be thorough but practical** - Focus on what matters
2. **Run all automated checks** - Don't skip verification commands
3. **Document everything** - Both successes and issues
4. **Think critically** - Question if the implementation truly solves the problem
5. **Consider maintenance** - Will this be maintainable long-term?

### Validation Checklist

Always verify:

- [ ] All phases marked complete are actually done
- [ ] Automated tests pass
- [ ] Code follows existing patterns
- [ ] No regressions introduced
- [ ] Error handling is robust
- [ ] Documentation updated if needed
- [ ] Manual test steps are clear

### Relationship to Other Commands

Recommended workflow:

1. `/implement_plan` - Execute the implementation
2. `/commit` - Create atomic commits for changes
3. `/validate_plan` - Verify implementation correctness
4. `/describe_pr` - Generate PR description

The validation works best after commits are made, as it can analyze the git history to understand what was implemented.

## Workflow

### Step 1: Context Discovery

If starting fresh or need more context:

1. **Read the implementation plan** completely
2. **Identify what should have changed**:
   - List all files that should be modified
   - Note all success criteria (automated and manual)
   - Identify key functionality to verify

3. **Spawn parallel research tasks** to discover implementation:

   ```
   Task 1 - Verify database changes:
   Use AGENT_CODEBASE_LOCATOR to find migration files.
   Use AGENT_CODEBASE_ANALYZER to check schema changes.
   Return: What was implemented vs what plan specified

   Task 2 - Verify code changes:
   Use AGENT_CODEBASE_LOCATOR to find all modified files related to [feature].
   Use AGENT_CODEBASE_ANALYZER to compare actual changes to plan.
   Return: File-by-file comparison of planned vs actual

   Task 3 - Verify test coverage:
   Use AGENT_CODEBASE_PATTERN to check if tests were added/modified.
   Run test commands and capture results.
   Return: Test status and any missing coverage
   ```

### Step 2: Systematic Validation

For each phase in the plan:

1. **Check completion status**:
   - Look for checkmarks in the plan (- [x])
   - Verify the actual code matches claimed completion

2. **Run automated verification**:
   - Execute each command from "Automated Verification"
   - Document pass/fail status with ✓/✗
   - If failures, investigate root cause

3. **Assess manual criteria**:
   - List what needs manual testing
   - Provide clear steps for user verification

4. **Think deeply about edge cases**:
   - Were error conditions handled?
   - Are there missing validations?
   - Could the implementation break existing functionality?

### Step 3: Generate Validation Report

#### Gather metadata for the validation document

- Run the METADATA_SCRIPT to generate all relevant metadata
- Filename: `VALIDATE_DIR/FILENAME_TEMPLATE`

#### Generate comprehensive validation report

- Use the metadata gathered in the previous
- Structure the document with YAML frontmatter followed by content:

```markdown
---
date: [Current date and time with timezone in ISO format]
QA: [QA name from thoughts status]
git_commit: [Current commit hash]
branch: [Current branch name]
repository: [Repository name]
plan: [Plan Name]
tags: [validation, plan, relevant-component-names]
status: complete
last_updated: [Current date in YYYY-MM-DD format]
last_updated_by: [Quality Assurance Name]
---

# Validation Report: [Plan Name]

## Implementation Status

✓ Phase 1: [Name] - Fully implemented
✓ Phase 2: [Name] - Fully implemented
⚠️ Phase 3: [Name] - Partially implemented (see issues)

## Automated Verification Results

✓ Build passes: `CMD_MAKE_BUILD`
✓ Tests pass: `CMD_MAKE_TEST`
✗ Linting issues: `CMD_MAKE_LINT` (3 warnings)

## Code Review Findings

#### Matches Plan:

- Database migration correctly adds [table]
- API endpoints implement specified methods
- Error handling follows plan

#### Deviations from Plan:

- Used different variable names in [file:line]
- Added extra validation in [file:line] (improvement)

#### Potential Issues:

- Missing index on foreign key could impact performance
- No rollback handling in migration

## Manual Testing Required:

1. UI functionality:
   - [ ] Verify [feature] appears correctly
   - [ ] Test error states with invalid input

2. Integration:
   - [ ] Confirm works with existing [component]
   - [ ] Check performance with large datasets

## Recommendations:

- Address linting warnings before merge
- Consider adding integration test for [scenario]
- Document new API endpoints
```

### Step 4: Sync and Report

1. **Save the validation report** to VALIDATE_DIR
2. **Run SYNC_COMMAND** to sync the thoughts directory
3. **Present findings** to user with:
   - Summary of validation status
   - Critical issues that need attention
   - Path to full validation report
   - Next steps recommendation

Remember: Good validation catches issues before they reach production. Be constructive but thorough in identifying gaps or improvements.
