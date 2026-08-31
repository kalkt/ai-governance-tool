# CLAUDE.md

Claude Code reads this file by name. The actual agent instructions for this
repo live in [`AGENTS.md`](./AGENTS.md) — read that file, not this one.

(This is a plain pointer file, not a symlink: `core.symlinks` is `false` on
this repo, which on a Windows checkout would turn a real symlink into a
9-byte text file containing just the string `AGENTS.md` — no actual
content. A real file avoids that failure mode.)

For project context, current architecture, research findings, and the
Build checklist, read `ai-governance-tool-backlog.md` in full before doing
any work here — same as `AGENTS.md` says.
