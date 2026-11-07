# Claude Code Adapter: Cognitive Personas

Drop-in configuration for using the Cognitive Persona triad within Claude Code.

## Quickstart

1. **Install Output Styles:**
   Copy the `.claude/` directory to your project root or `~/.claude/`:
   ```bash
   cp -r adapters/claude-code/.claude ./
   ```

2. **Activate In-Session:**
   - Switch style via Claude Code:
     - `/output-style adaptive-teacher`
     - `/output-style blast-radius-critic`
     - `/output-style sparring-teammate`

3. **Or Add to `CLAUDE.md`:**
   Merge the instructions from [CLAUDE.md](CLAUDE.md) into your root project instructions.
