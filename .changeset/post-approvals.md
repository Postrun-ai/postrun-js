---
'@postrun/js': minor
'@postrun/react': minor
---

Post approval chains. `postsApprove` and `postsReject` (plus their TanStack Query mutation options) approve or reject a post's current approval step, and `profilesSetApprovalSteps` sets a profile's default steps. Posts and profiles gain `approval_steps`, and tokens gain the `posts:approve` scope. `zTokensMintBodyChecked` adds the one rule the spec can't express: a token with `posts:approve` must name its `sub`.
