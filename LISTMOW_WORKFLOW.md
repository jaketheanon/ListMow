# ListMow Development Workflow and Project State

This file is the persistent working memory for the ListMow project.

Any future ChatGPT session working on ListMow must read this file before making changes. Update this file after each completed development step so the next session knows exactly where the project stopped. Yes, this is project memory in a Markdown trench coat, because apparently software projects need receipts too.

---

## Core Rule

Do not rebuild ListMow from scratch.

Do not use Windsurf-generated rewrites unless the user explicitly asks.

Work directly on the existing ListMow codebase in small, testable versions.

Each version must:

1. Modify only the files needed for that version.
2. Preserve existing user data.
3. Preserve GitHub Pages compatibility.
4. Avoid breaking the installed Android PWA.
5. Include backward-compatible IndexedDB migrations when the data model changes.
6. Keep old user history intact.
7. Update this file before stopping.
8. Tell the user exactly what changed and what the next step is.

If a task is too large, split it into versioned milestones instead of dumping a giant unstable patch into the repo.

---

## Current Repository

Repository:

```text
https://github.com/jaketheanon/ListMow
```

Live GitHub Pages app:

```text
https://jaketheanon.github.io/ListMow/
```

Current app type:

```text
Offline-first Progressive Web App
HTML / CSS / vanilla JavaScript / IndexedDB
```

---

## Current Backup Reference

Latest user-provided app backup:

```text
listmow-backup-2026-10-11.json
```

Backup timestamp:

```text
2026-10-11T04:34:07.500Z
```

Current settings from backup:

```text
roundValue: 260
savings: 1340
completedCycles: 5
```

The old app uses fixed cycle payment logic. The new system must replace that with per-property visit payments.

---

## Current Properties from Backup

Active properties:

| Property | Current Status | Interval | Mowed This Cycle | New Payment Per Paid Visit |
|---|---:|---:|---:|---:|
| Magnolia | active | 21 | true | $40 |
| 5606 Ponderosa | active | 21 | true | $40 |
| Home | active | 14 | true | $0 |
| Scott | active | 21 | false | $60 |
| Stable Pass | active | 21 | true | $40 |
| 2663 Pebble Bow | active | 21 | true | $60 |
| Hallie | active | 30 | false | $40 |
| Timberline | active | 21 | true | $80 |

Current cycle progress from backup:

```text
6 / 8 completed
```

Completed this cycle:

```text
Magnolia
5606 Ponderosa
Home
Stable Pass
2663 Pebble Bow
Timberline
```

Remaining this cycle:

```text
Scott
Hallie
```

Current unfinished-cycle earnings under the new payment model:

```text
Magnolia: $40
5606 Ponderosa: $40
Home: $0
Stable Pass: $40
2663 Pebble Bow: $60
Timberline: $80
Total: $260
```

Migration display total should initially be:

```text
Current saved earnings base: $1340
Current unfinished-cycle earnings: $260
Displayed total after migration: $1600
```

When Hallie is completed later:

```text
+$40 -> $1640
```

When Scott is completed later:

```text
+$60 -> $1700
```

After the current cycle is complete, starting a new cycle should only reset cycle completion flags. It should not add a fixed round amount anymore.

---

## Design Decision: Replace Round Payouts

Old system:

```text
Complete full cycle -> add roundValue ($260) to savings
```

New system:

```text
Record paid visit for a property -> immediately add that property's payment amount to lifetime earnings
```

Every property has an editable `paymentPerVisit`.

Default values:

```text
Default property: $40
Home: $0
Scott: $60
2663 Pebble Bow: $60
Timberline: $80
```

Payment amount changes affect future visits only. Old visit records must preserve the actual amount paid at that time.

---

## Design Decision: All Properties Are Listings

Do not use `Property Type = Listing/Home` as a major model.

All properties are homes/listings being maintained.

Use `status` instead:

```text
active
paused
sold
```

Status meanings:

### active

- Appears in mowing/visit queue.
- Counts toward current cycle.
- Can earn money.

### paused

- Does not appear in normal mowing queue.
- Does not count toward current cycle.
- Used for under contract, temporarily not needing maintenance, seller maintaining, etc.
- Should still appear in monthly property check reminders.
- Can be resumed later without losing history.

### sold

- Hidden from active workflow.
- No queue participation.
- No reminders unless explicitly added later.
- History remains permanently.

Home is not a separate property type. It is simply a property with `paymentPerVisit = 0`, unless the user later changes the model.

---

## New Core Model: Visits

ListMow should revolve around visits, not separate mow/edge histories.

A visit record should support:

```javascript
{
  id: string,
  propertyId: string,
  propertyName: string,
  date: string,
  work: [
    "mowed",
    "edged",
    "weed_eating",
    "blower_cleanup",
    "property_check",
    "no_work_needed"
  ],
  paid: boolean,
  amount: number,
  notes: string,
  cycleNumber: number,
  createdAt: string,
  updatedAt: string | null
}
```

Rules:

- Mowed visits normally default to paid.
- Edged-only visits should ask whether they are paid.
- No Work Needed should ask whether it is paid.
- Home/payment $0 should not add earnings.
- A paid visit immediately increases lifetime earnings.
- Undoing a paid visit must remove the payment.
- The app must prevent accidental duplicate paid visits for the same property in the same cycle unless the user explicitly confirms it.

---

## Required Future Features

These are approved goals, but they should be built incrementally.

### v2.0.0 - Database Migration Foundation

Status: COMPLETED.

Completed notes:

- IndexedDB upgraded to schema version 3.
- Added visits, payments, and reminders stores.
- Restoring the 2026-10-11 backup successfully recovered the user's data after the live app initially showed zeros.
- Current visible total should be $1,600 after restoring/migrating the backup.

Goal:

- Add new schema fields.
- Preserve old data.
- Add per-property payment amounts.
- Add status field.
- Add visit history arrays / stores.
- Add migration support.
- Remove dependency on fixed round payout as the future source of truth.
- Keep old UI working as much as possible until visit UI is implemented.

Expected files likely affected:

```text
js/database.js
js/settings.js
js/properties.js
js/cycle.js
```

Do not overhaul the UI in this milestone.


### v2.0.1 - Visible Cycle Progress and History Navigation Fix

Status: COMPLETED.

Goal:

- Add visible Current Cycle progress on the dashboard.
- Add visible app version label in Settings.
- Add Home button on the History screen so the user is not forced to use Android back.
- Add browser history handling so Android back navigates between app screens instead of immediately closing the installed PWA.
- Clarify legacy history entries that say `Cycle complete! +$260` by labeling them as old round payout history.
- Bump service worker cache version so the installed PWA pulls the patch.

Changed files:

```text
index.html
styles.css
js/ui.js
service-worker.js
LISTMOW_WORKFLOW.md
```

Known issue remaining:

- Full Record Visit UI is not implemented yet. That belongs to v2.1.0.

### v2.1.0 - Record Visit Workflow

Goal:

- Replace Mowed Today / Edged Today with Record Visit workflow.
- Allow selecting work performed: mowed, edged, both, no work needed, property check, etc.
- Allow date selection: today, yesterday, choose date.
- Ask payment question when appropriate.
- Add optional visit notes.
- Update lastMowed / lastEdged / lastInspection from visits.

### v2.2.0 - Active / Paused / Sold property status controls

Goal:

- Show lifetime earnings.
- Show current cycle earnings.
- Show today / month / year earnings.
- Show per-property running total.
- Preserve payment history.

### v2.3.0 - Property Timeline

Goal:

- Each property gets one timeline.
- Timeline includes visits, payments, edits, reminders, status changes, notes changes, etc.

### v2.4.0 - Paused Properties and Monthly Checks

Goal:

- Pause / resume properties.
- Paused properties do not count toward cycle.
- Monthly check reminders for paused properties.
- Status change history.

### v2.5.0 - Reminders

Goal:

- Per-property reminders.
- Reminders shown before recording a visit.
- Outstanding reminder count on dashboard/property cards.

### v2.6.0 - GPS and Directions

Goal:

- Direct Google Maps Directions button.
- Optional GPS coordinates per property.
- Optional arrival detection if supported.

---

## Migration Rules

The first migration must never erase user data.

Existing fields must be preserved:

```text
name
address
notes
interval
lastMowed
lastEdged
mowedThisCycle
archived
id
dateCreated
history
settings
```

New fields should be added safely if missing:

```javascript
status: archived ? "sold" : "active",
paymentPerVisit: computed based on property name,
lastInspection: null,
cycleCompleted: existing mowedThisCycle,
lifetimeEarned: 0,
visitHistory: [],
reminders: [],
quickAccess: {
  lockbox: "",
  gateCode: "",
  alarmCode: "",
  keyLocation: ""
},
gps: {
  lat: null,
  lng: null
}
```

Settings should preserve old values and add new ones:

```javascript
lifetimeEarningsBase: oldSettings.savings,
currentCycleEarnings: 260,
lifetimeEarningsDisplay: oldSettings.savings + currentCycleEarnings,
completedCycles: oldSettings.completedCycles,
legacyRoundValue: oldSettings.roundValue,
paymentModel: "per_visit",
schemaVersion: 3
```

The exact implementation can use different field names if the existing code demands it, but the behavior must match this document.

---

## Development Process Rule

Before starting a new coding step:

1. Read this file.
2. Inspect the current relevant source files.
3. State which version/milestone is being worked on.
4. Modify only the needed files.
5. Preserve app installability through GitHub Pages.
6. Update this file with:
   - completed work,
   - changed files,
   - current status,
   - next step,
   - any known issues.

After a version is finished:

1. Tell the user what changed.
2. Tell the user how to test it.
3. Wait for user confirmation before moving to the next milestone.

---

## Current Stopping Point

As of this file creation:

```text
Next task: Start v2.1.0 Record Visit Workflow.
v2.0.0 and v2.0.1 are complete.
Current recovery point: user should export a fresh backup after confirming v2.0.1 loads.
```

The latest known user requirements are captured in this file. Future work should continue from here, not from memory, because memory is what got humanity into password reset emails.

---

## Progress Update - v2.0.0 Database Migration Foundation

Status: COMPLETE IN LOCAL PATCH ZIP. Needs user upload/deploy to GitHub.

Completed work:

- Bumped IndexedDB from version 2 to version 3.
- Added new object stores:
  - visits
  - payments
  - reminders
- Added schema normalization for properties and settings.
- Added per-property payment defaults:
  - Home: $0
  - Scott: $60
  - 2663 Pebble Bow: $60
  - Timberline: $80
  - all others: $40
- Added property status foundation:
  - active
  - paused
  - sold
- Migrates old active/archived data into the new status model.
- Migrates current unfinished cycle earnings into the displayed savings total.
- For the current backup, migration target is:
  - base savings: $1340
  - current unfinished-cycle earnings: $260
  - displayed total after migration: $1600
- Replaces fixed round payout behavior with per-property payment behavior.
- Completing a cycle no longer adds the legacy $260 round value.
- Completing a cycle now increments completed cycle count and resets cycle flags only.
- Existing Mowed Today button now records a v2 visit and applies payment if payment has not already been recorded for that property in the current cycle.
- Existing Edged Today button now records an unpaid v2 visit.
- Backup export now includes visits, payments, and reminders.
- Restore accepts old v2 backups and migrates them to the new v3 schema.
- Service worker cache version updated so changed JS files are fetched after deploy.

Changed files:

```text
js/database.js
js/settings.js
js/properties.js
js/history.js
js/cycle.js
js/statistics.js
js/ui.js
service-worker.js
LISTMOW_WORKFLOW.md
```

Known limitations remaining after v2.0.0:

- UI labels still say Savings / Round Value in some places.
- There is not yet a full Record Visit modal.
- Payment amounts are not yet editable from the UI.
- Paused/Sold status controls are not yet exposed in the UI.
- Timeline/payment ledger screens are not yet exposed in the UI.
- GPS, directions, and reminders are not yet implemented in the UI.

Next task:

```text
v2.1.0 - Record Visit Workflow
```

Recommended test after deploying v2.0.0:

1. Open the app after deploy.
2. Confirm displayed savings becomes $1600 after migration.
3. Confirm current cycle still shows 6 / 8 complete.
4. Mark Hallie mowed and confirm total becomes $1640.
5. Mark Scott mowed and confirm total becomes $1700.
6. Confirm cycle count increments and the current cycle resets after Scott.
7. Export a backup and confirm it includes visits and payments.

---

## Progress Update - v2.0.1 Cycle Progress and History Navigation Fix

Status: DEPLOYED AND CONFIRMED WORKING BY USER.

Completed work:

- Added visible Current Cycle dashboard card.
- Added remaining-property names to the cycle progress display.
- Added History screen Home button.
- Added browser/PWA back-button screen navigation.
- Added visible app version label in Settings.
- Updated old legacy cycle-complete history display so `+$260` is labeled as an old round payout.
- Bumped service worker cache to v2.0.1.

User confirmed: working.

---

## Progress Update - v2.1.0 Record Visit Workflow

Status: DEPLOYED AND CONFIRMED WORKING BY USER.

Completed work in this package:

- Replaced the old visible Mowed Today / Edged Today buttons with one Record Visit button.
- Added Record Visit modal.
- Visit form supports:
  - mowed
  - edged
  - weed eating
  - blower cleanup
  - property check
  - no work needed
- Visit dates support:
  - today
  - yesterday
  - custom date
- Visit form supports:
  - counts toward current cycle
  - paid/unpaid
  - per-visit payment amount override
  - notes
- Paid visits immediately add to earnings.
- Paid visits create payment records.
- All visits create visit records.
- General visits update property state:
  - mowed updates lastMowed
  - edged updates lastEdged
  - property check / no work needed updates lastInspection
  - counts-toward-cycle marks the property complete for the current cycle
- Duplicate paid visits in the same cycle require explicit confirmation.
- Cycle completion still increments completed cycles and resets flags without adding fixed round payout.
- Added payment and status display to the property detail modal.
- Bumped visible app version to v2.1.0.
- Bumped service worker cache to v2.1.0.

Changed files in v2.1.0 package:

```text
index.html
styles.css
js/cycle.js
js/ui.js
service-worker.js
LISTMOW_WORKFLOW.md
CHANGELOG.md
```

Known limitations after v2.1.0:

- Payment amounts are still not editable from the property edit form.
- Visit/payment ledger screens are not yet exposed.
- Property timeline is not yet exposed.
- Reminders are not yet exposed.
- GPS/directions are not yet exposed.

Next task after v2.1.0 is deployed and confirmed:

```text
v2.2.0 - Active / Paused / Sold property status controls
```

Recommended test after deploying v2.1.0:

1. Open Settings and confirm version reads ListMow v2.1.0.
2. Open Hallie or Scott.
3. Tap Record Visit.
4. Save a mowed paid visit.
5. Confirm earnings increase by that property's amount.
6. Confirm Current Cycle progress updates.
7. Open History and confirm visit/payment entries appear.
8. Try a no-work-needed visit on another property and confirm it can count toward cycle without adding payment unless paid is checked.

---

## Progress Update - v2.2.0 Active / Paused / Sold Property Status Controls

Status: PACKAGE PREPARED. Needs user upload/deploy and testing.

Completed work in this package:

- Added explicit property status controls:
  - Set Active
  - Pause
  - Mark Sold
- Replaced the old Archive/Restore action in the property detail modal with clearer status actions.
- Added a property-list status filter that cycles through:
  - Active
  - Paused
  - Sold
- Added visible status badges on property cards.
- Active properties remain in the normal queue and current cycle.
- Paused properties are removed from the normal queue and current cycle, but can still record property-check style visits.
- Sold properties are kept for history only and cannot record new work unless set back to Active.
- Status changes clear current-cycle flags when moving a property out of Active.
- Status changes are written to History.
- Record Visit now defaults paused properties to Property Check, unpaid, and not counted toward cycle.
- Bumped visible app version to v2.2.0.
- Bumped service worker cache to v2.2.0.

Changed files in v2.2.0 package:

```text
index.html
styles.css
js/properties.js
js/history.js
js/cycle.js
js/ui.js
service-worker.js
LISTMOW_WORKFLOW.md
CHANGELOG.md
```

Known limitations after v2.2.0:

- Payment amounts are still not editable from the property edit form.
- Visit/payment ledger screens are not yet exposed.
- Property timeline is not yet exposed.
- Reminders are not yet exposed.
- GPS/directions are not yet exposed.

Next task after v2.2.0 is deployed and confirmed:

```text
v2.3.0 - Payment Ledger and Property Totals
```

Recommended test after deploying v2.2.0:

1. Open Settings and confirm version reads ListMow v2.2.0.
2. Open a safe property and set it to Paused.
3. Confirm it leaves the active queue and Current Cycle count changes.
4. Go to Properties and tap the status filter until Paused is shown.
5. Confirm the paused property appears there.
6. Open the paused property and record an unpaid Property Check.
7. Confirm earnings do not change and the active cycle does not advance.
8. Set the property back to Active and confirm it returns to the normal list.
