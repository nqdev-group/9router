# .rtk/ — local runtime/scratch data

Generic local scratch space for runtime state, caches, and logs that shouldn't be committed. Contents are git-ignored (see `.gitignore` in this directory); only this file and `.gitignore` itself are tracked.

**Not related to:**
- `open-sse/rtk/` — the real "Request Token-Killer" tool-result compression engine (see root `AGENTS.md`'s "Token-saving engines" table and `open-sse/AGENTS.md`).
- The personal `rtk` ("Rust Token Killer") CLI tool some contributors may have installed globally for their own Claude Code token-usage analytics — unrelated to this project.

The name collision is unfortunate but intentional (kept as specified when this directory was created) — don't assume anything under `.rtk/` interacts with either of the above.
