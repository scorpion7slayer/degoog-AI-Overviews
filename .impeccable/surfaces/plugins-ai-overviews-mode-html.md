---
version: 1
slug: "plugins-ai-overviews-mode-html"
primary_target: "plugins/ai-overviews/mode.html"
related_targets: ["plugins/ai-overviews/mode.css","plugins/ai-overviews/mode.js"]
---

Scope: `plugins/ai-overviews/mode.html`, the full-page AI Mode opened from an AI Overview.
Mode: Operate.
Audience: degoog users who want to move from a concise overview into deeper, source-grounded exploration.
Job: search the web through degoog, read a synthesized answer, inspect sources, and ask follow-up questions without losing context.
Primary task: submit or inherit a question, then continue the same research thread.
Content and proof: degoog result snippets, proxied result images, numbered citations, provider identity, and explicit AI fallibility.
Constraints: reuse the configured provider and server-only LLM pipeline; use the installed `ctx.apiBase`; no invented history, voice, upload, or persistence.
Direction: open research canvas with the question as title, answer at 75ch, a sticky source register on desktop, and sources below the answer on mobile.
Memorable moment: one click from the compact Overview carries the existing question and sources into a spacious research session.
Unresolved: file, image, voice input and persistent history are possible future additions.
