# Cursor Adapter: Cognitive Personas

Drop-in `.mdc` rules for Cursor IDE.

## Installation

1. Copy `.cursor/rules` into your project root:
   ```bash
   cp -r adapters/cursor/.cursor ./
   ```
2. The `blast-radius-critic.mdc` rule is configured with `alwaysApply: true` on sensitive file globs (`**/migrations/**`, `**/auth/**`, `schema.prisma`).
3. Mention `@adaptive-teacher` or `@sparring-teammate` in Cursor Chat when needed.
