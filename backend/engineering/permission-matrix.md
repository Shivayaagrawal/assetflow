# Permission Matrix

```mermaid
flowchart LR
  Session --> Policy
  Policy --> Action["Allowed Action"]
```

| Action | Admin | Asset Manager | Dept Head | Employee |
|--------|-------|---------------|-----------|----------|
| Register asset | Yes | Yes | No | No |
| Allocate asset | Yes | Yes | No | No |
| Return asset | Yes | Yes | Yes | Yes |
| Book resource | Yes | Yes | Yes | Yes |
| Approve maintenance | Yes | Yes | Dept only | No |
| Run audit | Yes | Yes | No | No |
| Manage org setup | Yes | No | No | No |
| View dept assets | All | All | Own dept | Own |

Department Head scope enforced via `DepartmentPolicy` and `assertDepartmentAccess`.
