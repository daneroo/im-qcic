# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Check the backlog when a map's frontier is empty

`needs-triage` issues don't get picked up on their own — nothing in this repo watches the label or schedules a review. When a wayfinder map's child tickets are all closed and the user asks "what's next" (or an equivalent broad question) with no other explicit target, run:

```sh
gh issue list --repo daneroo/im-qcic --label needs-triage
```

and surface anything open there as an option, rather than only reporting the map is done. This is a manual-review convention, not automation — scheduled/cron triage was explicitly considered and declined (2026-08-04) in favor of this reminder living where any agent working in this repo will read it.
