# Ontology workflow module

## Directory responsibilities

- `core/`: domain types, stage definitions, prompt/message protocol, and path rules.
- `state/`: conversation-evidence derivation and local workflow checkpoints.
- `context/`: interaction bridge between chunks cards and workflow UI.
- `ui/`: top-level workflow shell and styles.
  - `ui/stages/`: one component per workflow stage.
  - `ui/shared/`: path picker and shared picker configuration.
- `index.ts`: the public entry point used by `ConversationWorkspace`.

## Dependency direction

`ui -> state/core/context`, `state -> core`, and `context -> core`.
Core modules must not import workflow UI or persistence modules.
The chunks renderer imports the leaf `context/` and `core/workflowPath` modules
directly to avoid introducing a renderer-to-UI barrel cycle.
