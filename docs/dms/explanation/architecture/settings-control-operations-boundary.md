# DMS Settings / Control / Operations Boundary

> Status: launch architecture baseline
> Last updated: 2026-07-06
> Scope: DMS-owned system settings, control, operations, and the boundary with Admin/platform settings.

## Decision summary

The corrected SSOO rule is:

- Admin owns SSOO platform/base settings, control, and operations.
- Each domain app owns its own domain-specific system settings, control, and operations.
- DMS owns DMS-specific system settings, control, and operations.

In Korean shorthand: 플랫폼 공통은 Admin, 도메인 세부 시스템 설정/제어/운영은 각 도메인 앱. DMS의 세부 시스템 설정/제어/운영은 DMS.

This prevents two opposite mistakes:

1. Putting all settings/control/operations into Admin just because the word “system” appears.
2. Putting common account/profile/org/AI/security settings into DMS just because DMS has a settings screen.

## DMS-owned surfaces

DMS owns the settings/control/operations that directly govern document-domain behavior:

| Area | DMS responsibility | Notes |
| --- | --- | --- |
| Document repository | document Git binding observability, publish/sync state, working tree status | Runtime paths/remotes are masked when sensitive. Deploy/runtime config may still be the actual source for immutable bindings. |
| Storage | attachment/reference/image storage policy, local/NAS/SharePoint provider usage inside DMS | Organization-level Microsoft tenant policy remains Admin-owned. |
| Ingest | DMS ingest queue path/status/defaults, document intake behavior | Common integration policy is not stored as a DMS secret/config. |
| Uploads | DMS attachment/image/text extraction upload limits | Applies to document-domain uploads only. |
| Search/indexing | result count, chunking, overlap, semantic threshold, summary concurrency | Provider/model routing remains AI Control Plane-owned. |
| Document AI assist | DMS context limits, file/image attachment limits, DMS capability consumption | DMS can consume capability mappings, not own global provider/model/persona/agent definitions. |
| Extraction | document text/image/PDF extraction limits | Domain policy, not common AI provider ownership. |
| Access workflow | document permission request/approval, document-only grants, owner/author document responsibility | Organization roles/app access grants remain Admin-owned. |
| Templates | DMS document template management and template runtime location | Domain template lifecycle belongs in DMS. |
| Runtime operations | DMS health/status/read-only diagnostics that help operate the document domain | Admin may summarize or link to these, but the control owner is DMS. |
| Personal document preferences | author fallback, viewer zoom, sidebar defaults | Does not replace account security or SNS profile identity. Legacy workspace keys may still be read by the shell but are not a visible settings form. |

## Access model

- Authenticated users may open this settings surface for **내 설정**.
- Only an admin account may open or mutate **문서 시스템 설정**, **문서 운영·진단 runtime details**, and **문서 관리** sections in the settings tab page.
- Non-admin users must not see the system settings scope, system menu rows, or system search results in the settings tab page.
- The `dms.settings.manage` permission is an admin-only system settings capability, not a prerequisite for personal DMS preferences.
- The DMS settings API returns `config.personal` for authenticated users, but returns `config.system`, `docDir`, and runtime snapshots only when `access.canManageSystem=true`.

## Admin-owned surfaces

Admin owns platform/base settings, control, and operations:

- user creation/invitation/suspension/deactivation
- organization/company/department/position hierarchy
- roles, permissions, app access grants, operator policy
- platform audit and cross-app administration
- organization-level SSO/Microsoft tenant policy
- AI Control Plane ownership when the AI surface is platform-wide

Admin may expose platform-wide summaries or links when the operator needs orientation, but the current baseline removes Admin-owned DMS observation pages. DMS diagnostics, controls, and document-domain policies remain in DMS.

## DMS screen IA

The DMS settings screen should keep this grouping:

| Group | Ownership meaning |
| --- | --- |
| 문서 운영·진단 | DMS-owned runtime/operational status, mostly read-only or constrained by runtime config |
| 문서 시스템 설정 | DMS-owned editable document-domain policies |
| 문서 관리 | DMS-owned domain management actions such as document access workflow and templates |
| 내 문서 환경 설정 | current-user document preferences only |

## Implementation rules

- Do not add account/password/MFA/profile forms to DMS settings.
- Do not add organization hierarchy, app access grants, or role administration to DMS settings.
- Do not add global AI provider/model/persona/soul/agent management to DMS settings.
- Do not move DMS repository/storage/search/index/template/access/runtime controls to Admin merely because they are “system settings.”
- Do not add Admin `/dms/*` observation pages as a parallel DMS control/diagnostic surface in the current baseline.
- If a cross-app link points to a surface that is not implemented yet, mark it as planned instead of pretending the route exists.
- Do not use `dms.settings.manage` to block the settings entry point itself; use it only for DMS system/admin settings capabilities.

## Acceptance criteria

- Common architecture docs state the corrected Admin/domain split.
- DMS docs list every DMS-owned settings/control/operations area above.
- DMS settings UI exposes 문서 운영·진단 / 문서 시스템 설정 / 문서 관리 / 내 문서 환경 설정.
- Admin navigation does not expose DMS-owned observation/control pages in the current baseline.
- Non-admin DMS users can open and save personal DMS preferences, while the settings tab page hides system scope/menu/search entries and system updates return 403.
- Build/preflight and Docker runtime checks are run before closeout.

## Changelog

| 날짜 | 변경 내용 |
| --- | --- |
| 2026-07-06 | Admin DMS 관측 route baseline 을 제거하고 DMS 운영·진단/시스템 설정/관리/개인 설정 4개 surface 기준으로 갱신 |
| 2026-06-10 | DMS settings access model 을 personal entry 허용 + admin-only system/runtime 관리로 명시 |
| 2026-06-10 | Admin/platform vs DMS/domain-specific settings-control-operations boundary 정본 신설 |
