---
description: "Add emojis and visual enhancements to markdown documents without modifying originals"
argument-hint: "[file-path]"
agent: "build"
---

## Instructions

Take the markdown file at path: FILE_PATH: `$ARGUMENTS`

Read it completely and create a beautified version with strategic emojis and visual enhancements. Save the enhanced version as a NEW file with "\_beautified" suffix.

### Enhancement Rules

1. **🎯 Headers**:
   - Add contextual emojis to all headers
   - H1: Bold, impactful emojis (🚀, 🎯, 💡, 🌟)
   - H2: Section-appropriate emojis (📊, 🔧, 📋, 🎨)
   - H3: Subtle, specific emojis

2. **📝 Lists**:
   - Bullet lists: Add emojis that match content
   - Numbered lists: Keep numbers but add emojis after important items
   - Checklists: ✅ for completed, ⬜ for uncompleted

3. **📊 Tables**:
   - Add emoji column if appropriate
   - Use visual indicators (✅, ❌, ⚠️, 🔄)
   - Keep data intact, just enhance headers

4. **💬 Quotes & Callouts**:
   - Blockquotes: Add inspiring emoji at start
   - Note blocks: 📝 NOTE:
   - Warning blocks: ⚠️ WARNING:
   - Success blocks: ✅ SUCCESS:

5. **🎨 Code Blocks**:
   - Add language emoji in comment (🐍 Python, 📜 JavaScript, 🦀 Rust)
   - Keep code untouched
   - Add visual separators around important sections

6. **🔗 Special Sections**:
   - Requirements: Use ✅, 💡, 🎁, 🚫 for MoSCoW
   - Status: Use 🟢, 🟡, 🔴 for RAG
   - Workflow: Add step emojis (1️⃣, 2️⃣, 3️⃣ or 🎯, ⚙️, ✅)

### Visual Enhancement Guidelines

- **Strategic, not excessive** - 1-2 emojis per section max
- **Contextually appropriate** - Match emoji to content meaning
- **Maintain readability** - Never sacrifice clarity for visuals
- **Professional tone** - Fun but not childish
- **Consistent style** - Use similar emoji sets throughout

### Process

1. Read the entire original file
2. Apply enhancements following the rules above
3. Save enhanced version with "\_beautified" suffix in same directory
4. Display comparison snippet showing before/after
5. Report: "✨ Beautified document saved to: [path]"

### CRITICAL Rules

- **NEVER modify the original file**
- **ALWAYS create new file with "\_beautified" suffix**
- **PRESERVE all original content exactly**
- **Only ADD visual elements, never remove**

If file doesn't exist or can't be read, report error clearly.

Example output message:

```
✨ Document beautified successfully!
📁 Original: thoughts/architectures/paster.md
🎨 Enhanced: thoughts/architectures/paster_beautified.md
📊 Added: 47 emojis across 12 sections
```
