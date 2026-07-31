# Design system

## Direction

AI Overviews should feel like a native capability of the degoog results page,
not a separate product or chatbot. Its hierarchy follows the interactions seen
in Google AI Overviews: visual context, answer, compact access to sources, and
then conversation.

## Foundations

- **Color:** use only degoog theme variables (`--bg`, `--bg-hover`,
  `--text-primary`, `--text-secondary`, `--text-link`, `--border`,
  `--border-light`, `--primary`, and `--danger`).
- **Typography:** inherit degoog's typeface; use `1rem` for headings,
  `0.925rem/1.65` for body text, and `0.75rem` for metadata.
- **Spacing:** use a primary `1rem` rhythm, with compact controls between
  `0.4rem` and `0.85rem`.
- **Shape:** use moderate radii from `0.5rem` to `1rem`; reserve circles for
  avatars, numbers, and the close button, and the pill shape for the compact
  trigger.
- **Motion:** use `160ms` color transitions and a restrained skeleton; disable
  every animation with `prefers-reduced-motion`.

## Components

### Panel

Reuse `degoog-panel`, `degoog-panel--slot`, and
`degoog-panel--slot-body-padded`. The plugin should not introduce a dramatic
background, shadow, or border that competes with the theme.

### Answer

Markdown content passes through degoog's sanitized renderer. A long preview is
limited to `13rem`, with a full-width button that reveals the remainder.
Citations are replaced with DOM elements after rendering and use the degoog
badge.

### Images

A horizontal gallery of up to four thumbnails precedes the answer when results
provide them. URLs are always converted into signed degoog image-proxy URLs, so
the browser never requests images directly from third-party websites. A failed
image is removed without leaving a broken frame.

### Code

Fenced Markdown blocks receive a header with the language, a copy button, and
non-selectable line numbers. Copying preserves the original code without the
line numbers.

### Sources

A compact button shows up to three stacked avatars and the source count. It
opens a centered dialog on desktop and a bottom drawer on mobile, with the
domain, title, snippet, and citation number. Optional thumbnails use the same
signed proxy as the gallery; a domain initial provides the fallback.

### Conversation

The conversation appears only when the answer is ready or expanded. User
messages use `--bg-hover`; answers remain in the normal typographic flow so that
the panel does not turn into a chat interface.

### AI Mode

The full-page view is a search and reading workspace, not full-screen messaging.
The question becomes the session title; the synthesis remains in a `75ch`
column, while sources occupy a fixed side register on desktop and move below the
answer on mobile. A compact bar starts a new search while the follow-up composer
remains accessible at the bottom of the viewport.

An **AI Mode** action is also present inside the degoog home and results search
bars. It uses degoog's native search-bar action styling, opens AI Mode directly,
and carries over the current query when the field is not empty.

The empty state uses one central question and short examples. It contains no
commercial content or invented history. Color, typography, surfaces, focus
treatment, and proxied thumbnails reuse the degoog system. The page avoids
stacked chat bubbles: each follow-up becomes a new reading section separated by
a line.

### States

- **Loading:** three skeleton lines.
- **Reasoning:** a bounded secondary text region, hidden when the first final
  text arrives.
- **Error:** a compact message and retry button, or complete removal when the
  corresponding option is enabled.
- **Success:** copy, optional expansion, gallery, source drawer, and follow-up
  question.

## Accessibility

Streaming regions use `aria-live` and `aria-busy`; errors use `role="alert"`.
Every control is native, keyboard-accessible, and has a visible focus treatment
based on `--primary`. External links include `noopener noreferrer`. The drawer
is a `dialog` element, closes with Escape, and restores focus to its trigger.
