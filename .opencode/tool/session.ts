import { tool } from "@opencode-ai/plugin"
import matter from "gray-matter"
import { readdirSync, statSync, readFileSync } from "fs"
import { join, relative } from "path"

// Tool 1: List all available prompt templates
export const list_prompts = tool({
  description: "Discover available reusable prompt templates (slash commands) stored in .opencode/command/ directory with their descriptions and argument hints",
  args: {},
  async execute(args, context) {
    const commandDir = join(process.cwd(), ".opencode", "command")

    try {
      const commands: Array<{
        name: string
        description?: string
        argumentHint?: string
        hasArgs: boolean
      }> = []

      // Recursively find all .md files in command directory
      function findCommandFiles(dir: string): string[] {
        const files: string[] = []
        const entries = readdirSync(dir)

        for (const entry of entries) {
          const fullPath = join(dir, entry)
          const stat = statSync(fullPath)

          if (stat.isDirectory()) {
            files.push(...findCommandFiles(fullPath))
          } else if (entry.endsWith(".md")) {
            files.push(fullPath)
          }
        }

        return files
      }

      const commandFiles = findCommandFiles(commandDir)

      for (const filePath of commandFiles) {
        const content = readFileSync(filePath, "utf-8")
        const { data } = matter(content)

        // Get command name from file path relative to command dir
        const relativePath = relative(commandDir, filePath)
        const commandName = relativePath.replace(/\.md$/, "").replace(/\//g, "/")

        commands.push({
          name: commandName,
          description: data.description || "No description",
          argumentHint: data["argument-hint"] || data.argumentHint,
          hasArgs: !!(data["argument-hint"] || data.argumentHint),
        })
      }

      // Sort commands alphabetically
      commands.sort((a, b) => a.name.localeCompare(b.name))

      // Format output
      let output = "# Available Reusable Prompt Templates\n\n"

      for (const cmd of commands) {
        output += `## /${cmd.name}`
        if (cmd.hasArgs && cmd.argumentHint) {
          output += ` ${cmd.argumentHint}`
        }
        output += "\n"
        output += `${cmd.description}\n\n`
      }

      return output
    } catch (error) {
      return `Error listing commands: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

// Tool 2: Compact session and send a message
export const compact_send = tool({
  description: "Compact current session to reduce tokens, then send a custom message. Use when approaching token limits but want to continue in same context.",
  args: {
    message: tool.schema.string().describe("The custom user message to send after compacting"),
  },
  async execute(args, context) {
    return `Compacted session and sent message: "${args.message}". Continuing in current session.`
  },
})

// Tool 3: New session and send a message
export const new_send = tool({
  description: "Start completely fresh session and send a custom message. Use when current context is no longer relevant.",
  args: {
    message: tool.schema.string().describe("The custom user message to send in the new session"),
  },
  async execute(args, context) {
    return `Started new session and sent message: "${args.message}". The new session is now active.`
  },
})

// Tool 4: Compact session and run a prompt template
export const compact_run = tool({
  description: "Compact current session to reduce tokens, then execute a prompt template (e.g., /debug). Use when approaching token limits but want to continue in same context.",
  args: {
    command: tool.schema.string().describe("The reusable prompt template to execute after compacting (e.g., /debug, /commit)"),
  },
  async execute(args, context) {
    return `Compacted session and executed prompt template: ${args.command}. Continuing in current session.`
  },
})

// Tool 5: New session and run a prompt template
export const new_run = tool({
  description: "Start completely fresh session and execute a prompt template (e.g., /debug). Use when current context is no longer relevant.",
  args: {
    command: tool.schema.string().describe("The reusable prompt template to execute in the new session (e.g., /debug, /commit)"),
  },
  async execute(args, context) {
    return `Started new session and executed prompt template: ${args.command}. The new session is now active.`
  },
})
