---
description: "Create implementation plan for a Linear ticket by researching and documenting approach"
argument-hint: "[ticket-id-or-instructions]"
---

## Variables

### Dynamic Variables

USER_INPUT: $ARGUMENTS

## PART I - Ticket Selection

**If {{USER_INPUT}} matches ticket pattern (ENG-XXXX)**:

0c. use `linear` cli to fetch {{USER_INPUT}} into thoughts: `./thoughts/shared/tickets/{{USER_INPUT}}.md`
0d. read the ticket and all comments to learn about past implementations and research, and any questions or concerns about them

**If {{USER_INPUT}} provided but not a ticket pattern**:

0.  Treat {{USER_INPUT}} as additional context/filtering criteria
0a. read .claude/commands/linear.md
0b. fetch the top 10 priority items from linear in status "ready for spec" using the MCP tools
0c. filter/prioritize based on {{USER_INPUT}} context
0d. select the highest priority SMALL or XS issue (if no SMALL or XS issues exist, EXIT IMMEDIATELY and inform the user)
0e. use `linear` cli to fetch the selected item into thoughts
0f. read the ticket and all comments, incorporating {{USER_INPUT}} context

**If no {{USER_INPUT}} provided**

0.  read .claude/commands/linear.md
0a. fetch the top 10 priority items from linear in status "ready for spec" using the MCP tools, noting all items in the `links` section
0b. select the highest priority SMALL or XS issue from the list (if no SMALL or XS issues exist, EXIT IMMEDIATELY and inform the user)
0c. use `linear` cli to fetch the selected item into thoughts with the ticket number - ./thoughts/shared/tickets/ENG-xxxx.md
0d. read the ticket and all comments to learn about past implementations and research, and any questions or concerns about them

### PART II - NEXT STEPS

think deeply

1. move the item to "plan in progress" using the MCP tools
1a. read ./claude/commands/create_plan.md
1b. determine if the item has a linked implementation plan document based on the `links` section
1d. if the plan exists, you're done, respond with a link to the ticket
1e. if the research is insufficient or has unaswered questions, create a new plan document following the instructions in ./claude/commands/create_plan.md

think deeply

2. when the plan is complete, `humanlayer thoughts sync` and attach the doc to the ticket using the MCP tools and create a terse comment with a link to it (re-read .claude/commands/linear.md if needed)
2a. move the item to "plan in review" using the MCP tools

think deeply, use TodoWrite to track your tasks. When fetching from linear, get the top 10 items by priority but only work on ONE item - specifically the highest priority SMALL or XS sized issue.

If {{USER_INPUT}} was provided as context, use it to guide your planning approach and focus areas.
