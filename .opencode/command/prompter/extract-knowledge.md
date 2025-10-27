---
description: Extracts valuable insights from the current conversation and integrates them into a specified agent's knowledge base
argument-hint: "[agent-name]"
agent: prompter
---

## Variables

### Dynamic Variables
TARGET_AGENT: $ARGUMENTS

## Instructions

ultrathink: Analyze the current conversation for patterns, lessons, and insights that would be valuable for the specified agent, then systematically integrate them into that agent's system prompt.

## Workflow

### Phase 1: Context Analysis

1. **Read Target Agent**
   - Read the specified agent file (e.g., `.opencode/agent/{{TARGET_AGENT}}`)
   - Understand the agent's role, responsibilities, and current knowledge
   - Identify what kinds of insights would be valuable for this agent

2. **Conversation Mining**
   Analyze the conversation for:
   - Patterns discovered through experience
   - Techniques that worked well
   - Mistakes that led to learning
   - Clarifications that improved understanding
   - Workflow optimizations discovered
   - Edge cases encountered
   Filter for relevance to the target agent's domain

3. **Create Extraction Todos**
   Use **todowrite** to create systematic tracking:
   - Analyze conversation for {{agent}}-relevant patterns
   - Identify high-value insights worth preserving
   - Present findings for user approval
   - Determine optimal placement in agent's prompt
   - Craft precise wording for additions
   - Implement approved changes
   
   Update todo status with **todowrite** as each phase completes.

### Phase 2: Knowledge Extraction

1. **Present Discovered Insights**
   ```markdown
   ## Knowledge Extraction for {{Agent Name}}
   
   From this conversation, I've identified these valuable insights:
   
   ### 1. **{{Pattern/Lesson Title}}**
   {{Description of what was learned}}
   **Relevance**: {{Why this matters for this agent}}
   **Example from conversation**: {{Brief example}}
   
   ### 2. **{{Next Pattern}}**
   [Continue for all significant findings]
   
   Which of these would you like to integrate into {{agent}}'s knowledge base?
   ```

2. **⚠️ CHECKPOINT** - Await user selection of insights to keep

### Phase 3: Integration Planning

1. **Analyze Placement Options**
   For each approved insight, determine where it best fits:
   - **Philosophy**: Core principles and approaches
   - **Knowledge Base**: Reusable patterns and techniques
   - **Workflow**: Process improvements or checkpoints
   - **Learned Constraints**: Experience-based rules (create if doesn't exist)
   - **Cognitive Approach**: New triggers for deep thinking

2. **Present Integration Plan**
   ```markdown
   ## Proposed Integration Plan
   
   **Insight 1**: {{title}}
   - Target Section: {{section}}
   - Rationale: {{why this section}}
   
   **Insight 2**: {{title}}
   - Target Section: {{section}}
   - Rationale: {{why this section}}
   
   Shall we proceed with these placements?
   ```

3. **⚠️ CHECKPOINT** - Await approval of placement strategy

### Phase 4: Wording Refinement

1. **Craft Precise Wording**
   For each insight, create the exact text to add using git-style diff format (see system prompt pattern):
   ```markdown
   ## Proposed Additions
   
   ### For {{Section Name}}:
   ```diff
   @@ -{{line}},{{count}} +{{line}},{{new_count}} @@
   {{context}}
   +{{new_content}}
   {{context}}
   ```
   
   Do these wordings accurately capture the insights?
   ```

2. **⚠️ CHECKPOINT** - Await wording approval

### Phase 5: Implementation

1. **Execute Edits**
   - Add approved content to designated sections
   - Create new sections if needed (e.g., Learned Constraints)
   - Maintain template compliance throughout

2. **Verification**
   ```markdown
   ## ✅ Knowledge Integration Complete
   
   Added to {{Agent Name}}:
   - {{Section}}: {{Brief description of addition}}
   - {{Section}}: {{Brief description of addition}}
   
   These insights from our conversation are now part of {{agent}}'s operational knowledge.
   ```

## Selection Criteria

Only extract insights that are:
- **Reusable**: Will apply in future similar situations
- **Non-obvious**: Not already covered in agent's current knowledge
- **Validated**: Proven effective in this conversation
- **Relevant**: Within the agent's domain of responsibility
- **Significant**: Worth the complexity of adding to the prompt

## Note

This command focuses on experiential learning - patterns and techniques discovered through actual usage, not theoretical knowledge. The goal is continuous improvement of agents through captured experience.