# Copilot Instructions

## Project Context

- Read `MEMORY.md` before making project changes. Consult the relevant files under `notes/` when a task touches the production roadmap, readiness audit, error handling, or phase status.
- Keep project memory factual: distinguish code that exists from behavior verified in a running or deployed environment, and do not record credentials or other secrets.
- Respect the scope controls in `notes/implementation-roadmap.md`; a documented roadmap phase requires explicit user approval before implementation.

## Memory Maintenance

CRITICAL RULE: Whenever a change, update, bug fix, or new feature is implemented in this project during our conversation, you (the AI) must automatically prompt me to update the `MEMORY.md` file, or directly write/suggest the exact markdown updates needed to keep the project memory 100% up-to-date in real-time.

Operationally, update `MEMORY.md` directly in the same task when practical. If the change does not warrant a memory edit or the edit cannot be made, explicitly prompt the user and include the exact markdown addition or replacement needed. Keep the update scoped to durable architecture, behavior, dependency, workflow, or verification facts; do not add temporary details or secrets.