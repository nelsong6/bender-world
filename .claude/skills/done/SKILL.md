---
name: done
description: Update the CLAUDE.md changelog and verify all documented descriptions reflect the current state of the code after completing a task
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Edit, Bash
---

# /done — Finalize session changes

When the user invokes `/done`, perform these steps:

## 1. Identify what changed this session

Run `git diff --name-only` and `git diff --cached --name-only` to find all modified files. Read the diffs to understand what changed and why.

## 2. Update the Change Log

Append a dated entry to the **Change Log** section at the bottom of `CLAUDE.md`. Follow the existing format:
- Use `### YYYY-MM-DD` header (use today's date; reuse the header if one already exists for today)
- Each bullet should summarize **what** changed, **why**, and any relevant context (what was tried/rejected, tradeoffs)
- Be concise but include enough detail that a future reader understands the motivation without reading the diff
- If today's date already has entries, append new bullets under the existing header — do not duplicate the header

## 3. Audit documented descriptions in CLAUDE.md

For each file that was modified this session, find its corresponding documentation in CLAUDE.md (component descriptions, interface docs, hook docs, engine module docs, etc.). Check whether the documented behavior still matches the actual code. Specifically:

- **Interfaces/types**: If fields were added, removed, or changed, update the documented interface
- **Component props**: If a component's props changed, update the props description
- **Behavioral descriptions**: If how a component or module works changed, update the prose
- **Data flow descriptions**: If the data flow between components changed (e.g., new props wired through App.tsx), update the relevant section

Only update sections that are actually stale. Do not rewrite sections that are already accurate.

## 4. Report

After making all updates, briefly list:
- Changelog entries added
- Documentation sections updated (if any)
- Any sections that look stale but you weren't confident enough to update (flag for user review)
