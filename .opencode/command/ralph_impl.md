---
description: "Implement a Linear ticket by setting up worktree and launching implementation session"
argument-hint: "[ticket-id-or-instructions]"
---

## Variables

### Dynamic Variables

USER_INPUT: $ARGUMENTS

## PART I - Ticket Selection

**If {{USER_INPUT}} matches ticket pattern (ENG-XXXX)**:

0c. use `linear` cli to fetch {{USER_INPUT}} into thoughts: `./thoughts/shared/tickets/{{USER_INPUT}}.md`
0d. read the ticket and all comments to understand the implementation plan and any concerns

**If {{USER_INPUT}} provided but not a ticket pattern**:

0.  Treat {{USER_INPUT}} as additional context/filtering criteria
0a. read .claude/commands/linear.md
0b. fetch the top 10 priority items from linear in status "ready for dev" using the MCP tools
0c. filter/prioritize based on {{USER_INPUT}} context
0d. select the highest priority SMALL or XS issue (if no SMALL or XS issues exist, EXIT IMMEDIATELY and inform the user)
0e. use `linear` cli to fetch the selected item into thoughts
0f. read the ticket and all comments, incorporating {{USER_INPUT}} context

**If no {{USER_INPUT}} provided**

0.  read .claude/commands/linear.md
0a. fetch the top 10 priority items from linear in status "ready for dev" using the MCP tools, noting all items in the `links` section
0b. select the highest priority SMALL or XS issue from the list (if no SMALL or XS issues exist, EXIT IMMEDIATELY and inform the user)
0c. use `linear` cli to fetch the selected item into thoughts with the ticket number - ./thoughts/shared/tickets/ENG-xxxx.md
0d. read the ticket and all comments to understand the implementation plan and any concerns

## PART II - NEXT STEPS

think deeply

1. move the item to "in dev" using the MCP tools
1a. identify the linked implementation plan document from the `links` section
1b. if no plan exists, move the ticket back to "ready for spec" and EXIT with an explanation

think deeply about the implementation

2. set up worktree for implementation:
2a. read `scripts/create_worktree.sh` and create a new worktree with the Linear branch name: `./scripts/create_worktree.sh ENG-XXXX BRANCH_NAME`
2b. launch implementation session: `npx humanlayer launch --model opus -w ~/wt/humanlayer/ENG-XXXX "/implement_plan and when you are done implementing and all tests pass, read ./claude/commands/commit.md and create a commit, then read ./claude/commands/describe_pr.md and create a PR, then add a comment to the Linear ticket with the PR link"`

think deeply, use TodoWrite to track your tasks. When fetching from linear, get the top 10 items by priority but only work on ONE item - specifically the highest priority SMALL or XS sized issue.

If {{USER_INPUT}} was provided as context, use it to inform your implementation approach and focus areas.
