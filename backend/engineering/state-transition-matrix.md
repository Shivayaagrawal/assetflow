# State Transition Matrix — Asset

```mermaid
stateDiagram-v2
  [*] --> AVAILABLE
  AVAILABLE --> ALLOCATED: allocate
  AVAILABLE --> UNDER_MAINTENANCE: maintenance approved
  AVAILABLE --> RESERVED: booking confirmed
  ALLOCATED --> AVAILABLE: return
  UNDER_MAINTENANCE --> AVAILABLE: resolve
  RESERVED --> AVAILABLE: booking completed
  AVAILABLE --> LOST: audit missing on close
  LOST --> RETIRED: retire
  RETIRED --> [*]
  DISPOSED --> [*]
```

| Current | Next | Allowed |
|---------|------|---------|
| AVAILABLE | ALLOCATED | Yes |
| AVAILABLE | UNDER_MAINTENANCE | Yes |
| AVAILABLE | RESERVED | Yes |
| ALLOCATED | AVAILABLE | Yes |
| UNDER_MAINTENANCE | AVAILABLE | Yes |
| LOST | RETIRED | Yes |
| RETIRED | Any | No |
| DISPOSED | Any | No |

Terminal states (`RETIRED`, `DISPOSED`) are immutable.

**Code:** enforced by `AssetStateMachine` in `src/modules/asset/domain/asset-state-machine.ts`. Services call `AssetStateMachine.assertTransition(from, to)` before `updateStatus`.
