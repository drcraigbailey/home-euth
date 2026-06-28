# Offline implementation notes

## Data audit

All remote reads and writes still use the existing authenticated Supabase client, so Row Level Security remains authoritative. Cached records are partitioned by the signed-in user ID; no service key or secret is stored locally. The existing `sb_publishable_...` value is the public browser key, not a service-role key.

### Reference or mostly read-only data

| Table | Used by | Offline behaviour |
| --- | --- | --- |
| `products` | Products, Patient Detail, Admin | Cached for product/procedure choices. Admin mutations require internet. |
| `stock` | Patient Detail, Admin | Cached for display and calculations. Offline changes are never auto-applied; they become **Needs review** items. |
| `protocols` | Sedation, Patient Detail, Admin | Cached with nested `protocol_drugs`. Admin mutations require internet. |
| `protocol_drugs` | Sedation, Patient Detail, Admin | Cached separately as well as through `protocols`. Admin mutations require internet. |
| `email_templates` | Patient Detail, Admin | Cached for composing saved messages. Admin mutations require internet. |
| `company_documents` | Library | Document metadata is cached. The file itself is available offline only after the browser/app has cached that public file. Upload/delete requires internet. |
| `profiles` | Navigation, Home, Patient Detail, Admin | The current profile is included in manual/background sync. Successful page reads are also cached per user. Admin-only profile data is never placed into another user's cache. |

### User-editable/transactional data

| Table | Used by | Offline behaviour |
| --- | --- | --- |
| `clients` | Home, Clients, Client Detail, Admin | Reads fall back to cache; create/update can queue offline. Deletes require internet. |
| `patients` | Home, Clients, Patients, Client/Patient Detail, Admin | Reads fall back to cache; create/update can queue offline. Deletes require internet. |
| `sedation_records` | Patient Detail, Admin reports | Reads are cached; create/update can queue. Offline stock consequences are held for review. |
| `consent_records` | Patient Detail, Admin reports | Reads are cached; create/update can queue. Signatures remain inside the per-user local record. Deletes require internet. |
| `patient_procedures` | Patient Detail, Admin reports/invoices | Reads are cached; create/update can queue. Deletes require internet. |
| `diary_entries` | Home, Patient Detail | Reads are cached; create/update can queue. Deletes require internet. |
| `expenses` | Admin | Online-only in this first foundation because receipt upload and financial deletion need a connected, confirmed operation. |

Storage buckets found in the app are `company_documents`, `patient_documents`, and `receipts`. Storage upload/list/remove operations are intentionally still online-only. PDF and report generation remains local once its required database data and image assets have already loaded.

## Page dependencies

- Home: `profiles`, `clients`, `patients`, `diary_entries`.
- Clients: `profiles`, `clients`, `patients`; Client Detail additionally deletes related `sedation_records`, `patient_procedures`, `consent_records`, and `diary_entries` while online.
- Patients: `profiles`, `patients`, plus Client Detail relationships.
- Patient Detail: `profiles`, `patients`, `clients`, `email_templates`, `sedation_records`, `consent_records`, `products`, `patient_procedures`, `diary_entries`, `protocols`, `protocol_drugs`, and `stock`; `patient_documents` storage remains online-only.
- Sedation: `protocols` and `protocol_drugs`.
- Products: `products`.
- Library: `profiles`, `company_documents`, and the `company_documents` storage bucket.
- Admin: every table above plus `expenses` and the `receipts` bucket.

## Conflict and safety decisions

- Updates retain a base copy. They auto-sync only when the remote record still matches that base (or its `updated_at` value, where present). Otherwise the queue item becomes **Needs review**.
- Offline-created records use a temporary local ID. A create is marked as in progress before it is sent; if its outcome is uncertain, it is not blindly retried, preventing accidental duplicate clinical records.
- Parent temporary IDs are reconciled into dependent cached/queued records after a successful create (for example, a new offline patient belonging to a new offline client).
- Deletes and admin/reference edits are not queued in this phase because cascades, storage cleanup, and permissions make blind replay unsafe.
- Stock is deliberately stricter. Sedation records may be saved offline, but associated stock deductions are recorded as **Needs review** and are not automatically replayed. This prevents duplicate subtraction and avoids overwriting a remotely changed stock count.
- A saved Supabase session may open cached data offline. A new login always requires internet; authentication and RLS are not weakened.

## App shell and validation

The production web build registers a small same-origin service worker for the Vite app shell and previously loaded assets. Capacitor already packages the web shell inside Android. Supabase/API responses are not service-worker cached; structured offline data lives in IndexedDB.

Manual validation should cover: sync online, switch offline, open all priority pages, create/edit a safe record, restore connectivity, verify one remote record, and confirm any sedation stock effect appears once as **Needs review** rather than being deducted automatically.

