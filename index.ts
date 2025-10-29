/**
 * OpenCode Session Management Plugin
 * 
 * Unified session tool with agent switching for workflow orchestration.
 * 
 * Features:
 * - Context injection (silent, no AI response)
 * - New session creation with agent selection
 * - Session compaction (token optimization)
 * - Session forking (safe experimentation)
 * - Agent-to-agent handoffs
 * - Multi-agent collaboration
 * 
 * @version 0.0.6
 * @license MIT
 * @author M. Adel Alhashemi
 * @see https://github.com/malhashemi/opencode-sessions
 */

import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { join } from "path"
import { readdir } from "fs/promises"
import { appendFileSync, mkdirSync } from "fs"
import os from "os"
import matter from "gray-matter"

/**
 * Helper function to write logs to .opencode/logs/session-plugin.log
 */
function log(message: string, data?: any): void {
  try {
    const timestamp = new Date().toISOString()
    const logDir = join(process.cwd(), ".opencode", "logs")
    const logFile = join(logDir, "session-plugin.log")
    
    // Ensure log directory exists
    try {
      mkdirSync(logDir, { recursive: true })
    } catch {}
    
    const logLine = data 
      ? `[${timestamp}] ${message}\n${JSON.stringify(data, null, 2)}\n`
      : `[${timestamp}] ${message}\n`
    
    appendFileSync(logFile, logLine)
  } catch (error) {
    // Fallback to console if file write fails
    console.error('[session-plugin] Failed to write log:', error)
  }
}

interface AgentInfo {
  name: string
  description?: string
}

/**
 * Discover primary agents by scanning agent directories for markdown files
 * and checking opencode.json for disabled agents.
 * 
 * Agent discovery process:
 * 1. Scans ~/.config/opencode/agent/ and .opencode/agent/ for .md files
 * 2. Parses YAML frontmatter to find agents with mode: "primary" or "all"
 * 3. Adds built-in agents (build, plan) if not overridden by .md files
 * 4. Checks opencode.json files for disabled agents
 * 5. Returns list of enabled primary agents
 * 
 * Note: Built-in agents (build, plan) can be:
 * - Overridden by creating build.md or plan.md files
 * - Disabled via opencode.json with { agent: { build: { disable: true } } }
 */
async function discoverAgents(projectDir: string): Promise<AgentInfo[]> {
  const agents: AgentInfo[] = []
  const disabledAgents = new Set<string>()
  
  // Determine XDG config paths
  const xdgConfigHome = process.env.XDG_CONFIG_HOME
  const xdgBase = xdgConfigHome
    ? join(xdgConfigHome, "opencode")
    : join(os.homedir(), ".config/opencode")
  
  const agentDirs = [
    join(xdgBase, "agent"),              // XDG config agents
    join(projectDir, ".opencode/agent"), // Project-local agents
  ]
  
  const configPaths = [
    join(xdgBase, "opencode.json"),              // XDG config
    join(projectDir, ".opencode/opencode.json"), // Project-local config
  ]
  
  // First, discover all primary agents from markdown files
  for (const agentDir of agentDirs) {
    try {
      const files = await readdir(agentDir)
      
      for (const file of files) {
        // Only process markdown files
        if (!file.endsWith('.md')) continue
        
        try {
          // Read file content
          const filePath = join(agentDir, file)
          const content = await Bun.file(filePath).text()
          
          // Parse YAML frontmatter
          const { data } = matter(content)
          
          // Check if this is a primary agent
          const mode = data.mode
          if (mode === "primary" || mode === "all") {
            // Extract agent name from filename (remove .md extension)
            const agentName = file.replace(/\.md$/, '')
            const agentDescription = data.description
            
            // Add to list if not already present
            if (!agents.some(a => a.name === agentName)) {
              agents.push({
                name: agentName,
                description: agentDescription
              })
            }
          }
        } catch (error) {
          // Skip files that can't be parsed
          continue
        }
      }
    } catch (error) {
      // Silently skip directories that don't exist
      // This is expected - not all paths will have agent directories
    }
  }
  
  // Add built-in agents if they weren't overridden by .md files
  for (const builtIn of ["build", "plan"]) {
    if (!agents.some(a => a.name === builtIn)) {
      agents.unshift({
        name: builtIn,
        description: builtIn === "build"
          ? "General-purpose implementation agent for building features and fixing bugs"
          : "Strategic planning agent for architecture and design decisions"
      })
    }
  }
  
  // Second, check opencode.json files for disabled agents
  for (const configPath of configPaths) {
    try {
      const file = Bun.file(configPath)
      if (await file.exists()) {
        const config = await file.json()
        
        // Check for disabled agents
        if (config.agent && typeof config.agent === "object") {
          for (const [name, agentConfig] of Object.entries(config.agent)) {
            if (typeof agentConfig === "object" && agentConfig !== null) {
              const disabled = (agentConfig as any).disable
              if (disabled) {
                disabledAgents.add(name)
              }
            }
          }
        }
      }
    } catch (error) {
      // Silently skip files that don't exist or can't be parsed
    }
  }
  
  // Filter out disabled agents
  return agents.filter(agent => !disabledAgents.has(agent.name))
}

export const SessionPlugin: Plugin = async (ctx) => {
  // Discover agents from filesystem (no blocking API calls!)
  const agents = await discoverAgents(ctx.directory)
  const agentList = agents
    .map(agent => {
      const desc = agent.description || "No description available"
      return `  • ${agent.name} - ${desc}`
    })
    .join("\n")
  
  // State machine for compaction flow
  type CompactionState = {
    phase: 'waiting_for_first_abort' | 'compacting' | 'waiting_for_compaction_complete' | 'compaction_done' | 'ready_to_send'
    providerID: string
    modelID: string
    agent?: string
    text: string
  }
  const compactionState = new Map<string, CompactionState>()
  
  // Store pending messages for agent relay communication (message mode only)
  const pendingMessages = new Map<string, { agent?: string, text: string }>()
  
  // Store tool call IDs for compact mode
  const compactCalls = new Map<string, string>() // callID -> sessionID
  
  // Store metadata for compact mode
  const compactMetadata = new Map<string, { providerID: string, modelID: string, agent?: string, text: string }>()
  
  return {
    // Hook: Before tool execution - save args for message and compact modes
    "tool.execute.before": async (input, output) => {
      if (input.tool === "session") {
        const args = output.args as { mode: string, text: string, agent?: string }
        
        if (args.mode === "message") {
          // Store message for later - will be sent on session.idle event
          pendingMessages.set(input.sessionID, {
            agent: args.agent,
            text: args.text
          })
          log('[tool.execute.before] Message mode: stored pending message', {
            sessionID: input.sessionID,
            agent: args.agent
          })
        } else if (args.mode === "compact") {
          // Track compact calls for tool.execute.after
          compactCalls.set(input.callID, input.sessionID)
          log('[tool.execute.before] Compact mode: tracked call', {
            callID: input.callID,
            sessionID: input.sessionID
          })
        }
      }
    },
    
    // Hook: After tool execution - handle compact mode with abort
    "tool.execute.after": async (input, output) => {
      const sessionID = compactCalls.get(input.callID)
      
      if (sessionID) {
        const metadata = compactMetadata.get(sessionID)
        
        if (metadata) {
          log('=== TOOL.EXECUTE.AFTER: Compact mode detected ===', {
            callID: input.callID,
            sessionID,
            metadata
          })
          
          // Store compaction state
          compactionState.set(sessionID, {
            phase: 'waiting_for_first_abort',
            providerID: metadata.providerID,
            modelID: metadata.modelID,
            agent: metadata.agent,
            text: metadata.text
          })
          
          log('[tool.execute.after] Stored compaction state', compactionState.get(sessionID))
          
          // Clean up call tracking and metadata
          compactCalls.delete(input.callID)
          compactMetadata.delete(sessionID)
          
          // Wait 100ms for agent to finish processing tool result
          log('[tool.execute.after] Waiting 100ms before first abort...')
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Abort #1: Stop the agent
          log('[tool.execute.after] Calling first abort to stop agent...')
          try {
            await ctx.client.session.abort({
              path: { id: sessionID }
            })
            log('[tool.execute.after] First abort succeeded, waiting for session.idle #1')
          } catch (error) {
            log('[tool.execute.after] First abort failed', error)
            // Clean up state on error
            compactionState.delete(sessionID)
          }
        }
      }
    },
    
    // Hook: Listen for session.idle and session.compacted events
    event: async ({ event }) => {
      // Type guard for events with sessionID
      if (!('properties' in event) || !('sessionID' in event.properties)) {
        return
      }
      
      const sessionID = event.properties.sessionID as string
      
      // ===== COMPACTION FLOW: Handle session.idle =====
      if (event.type === "session.idle") {
        const state = compactionState.get(sessionID)
        
        // IDLE #1: After first abort - start compaction
        if (state?.phase === 'waiting_for_first_abort') {
          log('=== EVENT: session.idle #1 - Starting compaction ===', { sessionID })
          state.phase = 'compacting'
          
          try {
            log('[event] Calling session.summarize', {
              providerID: state.providerID,
              modelID: state.modelID
            })
            
            await ctx.client.session.summarize({
              path: { id: sessionID },
              body: {
                providerID: state.providerID,
                modelID: state.modelID
              }
            })
            
            state.phase = 'waiting_for_compaction_complete'
            log('[event] Compaction started, waiting for session.compacted event')
          } catch (error) {
            log('[event] Compaction failed', error)
            compactionState.delete(sessionID)
          }
          return
        }
        
        // IDLE #2: After second abort - send message
        if (state?.phase === 'ready_to_send') {
          log('=== EVENT: session.idle #2 - Sending message ===', {
            sessionID,
            agent: state.agent,
            text: state.text
          })
          
          try {
            await ctx.client.session.prompt({
              path: { id: sessionID },
              body: {
                agent: state.agent,
                parts: [{ type: "text", text: state.text }]
              }
            })
            log('[event] Message sent successfully, cleaning up state')
          } catch (error) {
            log('[event] Failed to send message', error)
          } finally {
            compactionState.delete(sessionID)
          }
          return
        }
      }
      
      // ===== COMPACTION FLOW: Handle session.compacted =====
      if (event.type === "session.compacted") {
        const state = compactionState.get(sessionID)
        
        if (state?.phase === 'waiting_for_compaction_complete') {
          log('=== EVENT: session.compacted - Compaction done! ===', { sessionID })
          state.phase = 'compaction_done'
          
          // Wait 100ms for lock to fully release
          log('[event] Waiting 100ms for lock to fully release...')
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Abort #2: Ensure clean state
          log('[event] Calling second abort immediately after compaction')
          try {
            await ctx.client.session.abort({
              path: { id: sessionID }
            })
            state.phase = 'ready_to_send'
            log('[event] Second abort succeeded, ready to send message on next idle')
          } catch (error) {
            log('[event] Second abort failed', error)
            compactionState.delete(sessionID)
          }
        }
      }
      
      // ===== MESSAGE MODE: Handle session.idle for normal message relay =====
      if (event.type === "session.idle") {
        const pending = pendingMessages.get(sessionID)
        
        if (pending) {
          log('=== EVENT: session.idle - Message mode ===', {
            sessionID,
            agent: pending.agent
          })
          
          // Remove from queue
          pendingMessages.delete(sessionID)
          
          try {
            // Session is unlocked now - safe to call session.prompt with agent parameter
            await ctx.client.session.prompt({
              path: { id: sessionID },
              body: {
                agent: pending.agent,
                parts: [{ type: "text", text: pending.text }]
              }
            })
            log('[event] Message mode: message sent successfully')
          } catch (error) {
            log('[event] Message mode: failed to send message', error)
          }
        }
      }
    },
    
    tool: {
      session: tool({
        description: `Multi-agent collaboration and workflow orchestration across sessions.

THE FOUR PILLARS:

1. COLLABORATE (message) - Turn-based agent collaboration in same conversation
   Agents work together, passing the torch back and forth. Perfect for complex
   problems requiring multiple perspectives in a single thread.

2. HANDOFF (new) - Clean phase transitions with fresh context
   Complete one phase, hand off to another agent with a clean slate. No context
   baggage from previous work. Research → Implementation → Validation.

3. COMPRESS (compact) - Manual compression control with messaging and handoffs
   Trigger compaction when needed, include a message, and optionally hand off
   to a different agent. Maintain long conversations without token limits.

4. PARALLELIZE (fork) - Explore multiple approaches simultaneously
   Branch into independent sessions to try different solutions. Full primary
   agent capabilities in each fork. Compare approaches, pick the best.

AGENT PARAMETER (optional):

Specify which primary agent handles the message. Enables agent relay and handoffs.

Available primary agents:
${agentList}

If omitted, continues with current agent.

EXAMPLES:

  # COLLABORATE: Multi-agent problem solving
  session({ 
    mode: "message",
    agent: "plan",
    text: "Should we use microservices here?"
  })
  # Plan reviews, responds, can pass back to build
  
  # HANDOFF: Clean phase transition
  session({
    mode: "new",
    agent: "researcher", 
    text: "Research best practices for API design"
  })
  # Fresh session, no baggage from previous implementation work
  
  # COMPRESS: Long conversation with handoff
  session({
    mode: "compact",
    agent: "plan",
    text: "Continue architecture review"
  })
  # Compacts history, adds handoff context, plan agent responds
  
  # PARALLELIZE: Try multiple approaches
  session({
    mode: "fork",
    agent: "build",
    text: "Implement using Redux"
  })
  session({
    mode: "fork", 
    agent: "build",
    text: "Implement using Context API"
  })
  # Two independent sessions, compare results
`,
        
        args: {
          text: tool.schema.string().describe("The text to send in the session"),
          mode: tool.schema.enum(["message", "new", "compact", "fork"]).describe("How to handle the session and text"),
          agent: tool.schema.string().optional().describe("Primary agent name (e.g., 'build', 'plan') for agent switching"),
        },
        
        async execute(args, toolCtx) {
          try {
            switch(args.mode) {
              case "message":
                // Message is stored in tool.execute.before hook
                // Will be sent after session.idle event fires
                return args.agent 
                  ? `Message sent to ${args.agent} agent. They will respond in this conversation.`
                  : "Message sent. Awaiting response in this conversation."
                
              case "new":
                // Create session via SDK for agent control
                const newSession = await ctx.client.session.create({
                  body: { 
                    title: args.agent 
                      ? `Session via ${args.agent}` 
                      : "New session"
                  }
                })
                
                // Send first message with specified agent
                await ctx.client.session.prompt({
                  path: { id: newSession.data.id },
                  body: {
                    agent: args.agent || "build",
                    parts: [{ type: "text", text: args.text }]
                  }
                })
                
                return `New session created with ${args.agent || "build"} agent (ID: ${newSession.data.id})`
                
              case "compact":
                log('=== COMPACT MODE START ===')
                log('Session ID:', { sessionID: toolCtx.sessionID })
                log('Agent parameter:', { agent: args.agent })
                log('Text parameter:', { text: args.text })
                
                try {
                  // Get session messages to determine current model
                  log('Fetching session messages to determine current model...')
                  const msgs = await ctx.client.session.messages({
                    path: { id: toolCtx.sessionID }
                  })
                  
                  log('Messages fetched:', {
                    total_messages: msgs.data.length,
                    assistant_messages: msgs.data.filter(m => m.info.role === "assistant").length,
                    user_messages: msgs.data.filter(m => m.info.role === "user").length,
                  })
                  
                  // Find last assistant message to get model info
                  const assistantMsgs = msgs.data.filter(m => m.info.role === "assistant")
                  const lastAssistant = assistantMsgs[assistantMsgs.length - 1]
                  
                  if (!lastAssistant || lastAssistant.info.role !== "assistant") {
                    log('ERROR: No assistant messages found')
                    log('=== COMPACT MODE END (FAILED - NO ASSISTANT) ===\n')
                    return "Error: No assistant messages found in session. Cannot determine model for compaction."
                  }
                  
                  // Extract model info from last assistant message
                  const providerID = lastAssistant.info.providerID
                  const modelID = lastAssistant.info.modelID
                  
                  log('Using model from last assistant message:', {
                    providerID,
                    modelID,
                    mode: lastAssistant.info.mode,
                    message_id: lastAssistant.info.id
                  })
                  
                  // Inject handoff context message (survives compaction)
                  log('Injecting handoff context message...')
                  await ctx.client.session.prompt({
                    path: { id: toolCtx.sessionID },
                    body: {
                      noReply: true,
                      parts: [{
                        type: "text",
                        text: args.agent 
                          ? `[Compacting session - ${args.agent} agent will respond after completion]`
                          : "[Compacting session - response will continue after completion]"
                      }]
                    }
                  })
                  log('[tool.execute] Context message injected successfully')
                  
                  // Store metadata in map for tool.execute.after hook (using sessionID as key)
                  // DO NOT call session.summarize() here - causes SessionLockedError!
                  compactMetadata.set(toolCtx.sessionID, {
                    providerID,
                    modelID,
                    agent: args.agent,
                    text: args.text
                  })
                  
                  log('[tool.execute] Stored metadata for tool.execute.after', {
                    sessionID: toolCtx.sessionID,
                    providerID,
                    modelID,
                    agent: args.agent
                  })
                  log('=== COMPACT MODE END (returning) ===\n')
                  
                  // Return immediately - compaction will happen asynchronously via events
                  return args.agent 
                    ? `Compacting session and handing off to ${args.agent}. This will complete shortly.`
                    : `Compacting session. This will complete shortly.`
                    
                } catch (error) {
                  log('=== COMPACT MODE ERROR ===', {
                    error_type: typeof error,
                    error_name: error instanceof Error ? error.constructor.name : 'unknown',
                    error_message: error instanceof Error ? error.message : String(error),
                    error_stack: error instanceof Error ? error.stack : undefined,
                    full_error: error
                  })
                  log('=== COMPACT MODE END (FAILED) ===\n')
                  
                  throw error // Re-throw to be caught by outer try-catch
                }
                
              case "fork":
                // Use OpenCode's built-in fork API to copy message history
                const forkedSession = await ctx.client.session.fork({
                  path: { id: toolCtx.sessionID },
                  body: {}
                })
                
                // Send new message in forked session
                await ctx.client.session.prompt({
                  path: { id: forkedSession.data.id },
                  body: {
                    agent: args.agent || "build",
                    parts: [{ type: "text", text: args.text }]
                  }
                })
                
                return `Forked session with ${args.agent || "build"} agent - history preserved (ID: ${forkedSession.data.id})`
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            
            // Show toast to user
            await ctx.client.tui.showToast({
              body: {
                message: `Session operation failed: ${message}`,
                variant: "error",
              }
            })
            
            // Return error to agent
            return `Error: ${message}`
          }
        }
      })
    }
  }
}
