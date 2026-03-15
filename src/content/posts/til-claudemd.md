---
title: CLAUDE.md best practices
description: Documenting my evolving understanding of CLAUDE.md files
pubDate: 2026-03-15T22:59:32.000Z
tags:
  - til
draft: false
---

*Note: this will post will evolve as I learn more about CLAUDE.md files, best practices, and how those things evolve over time.*

## Key ideas
1. **Structure:** create a CLAUDE.md in ~/.claude/ (loads globally), then add domain- and project-level files relative to where you keep your work.
2. **Creation:** let Claude write them.
3. **Upkeep:** keep them lean.

## ✱ Structure: where to organize CLAUDE.md files
```plaintext
~/.claude/CLAUDE.md (global, loads everywhere)
└ universal identity, communication preferences, and behavioral rules
└ location (macOS): your home folder
└ in Terminal, view with: cd ~/.claude/ && open .

[domain]/CLAUDE.md (shared context across related projects)
├ domain conventions, constraints, dependencies
├ optional, but useful if projects share context
└ location: relative to wherever you keep your work

[domain]/[project]/CLAUDE.md (current goals, active constraints)
├ current goals, active constraints, key dates
└ location: relative to wherever you keep your work
```

### Examples
**My global CLAUDE.md file** ([view on GitHub](https://github.com/kylejohnston/dotfiles/blob/main/claude/CLAUDE.md)) contains frontend development princples, and an instruction to capture lessons as I guide the system, like when I make corrections, cite preferences, etc. 

**A project-level CLAUDE.md** might explain the purpose of the project, plus how to build, test, deploy, etc. And if the project-level file conflicts with the global file, the more specific file takes priority.  

For example, if I started a project that uses Next.js (which would conflict with my global frontend development principles to avoid frameworks), the project-level CLAUDE.md is more specific, so it takes priority.

## ✱ Creation: how to write CLAUDE.md files
*Excerpts from Hannah Stulberg's extensive [guide to Claude Code](https://hannahstulberg.substack.com/p/claude-code-for-everything-the-best-personal-assistant-remembers-everything-about-you)*

### Method 1: Plan mode interview
Use this when you have context in your head but no docs:
```plaintext
I want to generate a CLAUDE.md file for [folder name]. Interview me to understand what you’d need to work effectively there. Ask me questions about the project, the people involved, and how I want things done. Then draft the file based on my answers.
```
### Method 2: Load the docs, then generate
Use this when you have existing documentation, but no CLAUDE.md:
```plaintext
Read through the files in [folder name] and generate a CLAUDE.md file for that folder. Focus on what you’d need to know to work effectively there: what this is, who’s involved, key decisions that have been made, and where to find things.
```
### Method 3: Generate from a session
Use this when you've finished a working session:
```
We just did a lot of work in this area. Generate a CLAUDE.md file for this folder based on everything we covered. Focus on context that would be useful at the start of any future session here, and ask me about any context you’re not sure is relevant to future work.
```

## ✱ Upkeep: keeping CLAUDE.md lean

**After a big working session.** Before you close the session, ask:
```plaintext
Based on the work we just did, does the CLAUDE.md for [folder name] need to be updated with any new context?
```

**When you keep re-explaining the same thing**  
If you find yourself giving Claude the same context at the start of every session—who someone is, what a project is about, how you want something done—that context belongs in a CLAUDE.md file. Tell Claude to add it:
```plaintext
I keep having to explain [X] every session. Update the CLAUDE.md for [folder name] so you have that context automatically.
```

**Let Claude sort it out**
```plaintext
Look at the CLAUDE.md files in this project. Are any of them too long, redundant, or loading context that I probably don’t need every session? Suggest how to trim them down.
```

## *Sources*
- [Anthropic Docs: Understanding system prompts](https://platform.claude.com/docs/en/agent-sdk/modifying-system-prompts#method-1-claude-md-files-project-level-instructions)
- [Claude Code for Everything](https://hannahstulberg.substack.com/p/claude-code-for-everything-finally) by Hannah Stulberg — a comprehensive, step-by-step guide. A great place to start if you're new to Claude Code or want to deepen your knowledge.
- [reddit: Claude Code is a beast](https://www.reddit.com/r/ClaudeAI/comments/1oivjvm/claude_code_is_a_beast_tips_from_6_months_of/) — assumes a lot of domain knowledge, but sparked my curiosity about this topic.
