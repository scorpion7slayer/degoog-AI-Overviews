# Product

## Register

product

## Users

Degoog instance owners who want an answer-first search experience without depending on Google AI Overviews. They configure their own local model, cloud provider, or compatible gateway and expect search-result citations to remain inspectable.

## Product Purpose

Generate a concise, source-grounded overview above Degoog search results, then let the user expand the answer or ask a follow-up. Success means the overview feels native to Degoog, starts streaming quickly, cites the exact search results it used, and keeps provider credentials and requests on the Degoog server.

## Brand Personality

Native, trustworthy, and direct. The interaction should carry the useful parts of Google AI Overviews—answer-first synthesis, scannable structure, visible sources, and follow-up exploration—without copying Google branding or hiding uncertainty.

## Anti-references

- A separate SaaS dashboard bolted onto Degoog.
- Decorative “AI” visuals, gradients, glass cards, or chat-bot theatrics.
- Answers that invent citations, conceal missing evidence, or treat search snippets as trusted instructions.
- Provider presets that imply unsupported access, especially a direct Cursor inference API that does not exist.

## Design Principles

- Evidence stays one click away: factual claims use inline citations tied to visible result sources.
- Degoog remains the product: reuse its slot, panel, input, badge, color, and theme vocabulary.
- Fast before fancy: stream useful text immediately and keep reasoning or loading states quiet.
- Honest configuration: prefill only documented endpoints and explain provider-specific limitations.
- Private by architecture: call providers server-side and avoid client requests to third-party assets.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Preserve keyboard operation, visible focus, semantic controls, screen-reader status updates, sufficient contrast through Degoog theme variables, and a reduced-motion path for every transition.
