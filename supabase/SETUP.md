# Supabase database setup (beginner guide)

Follow these steps **in order**. Do not skip ahead.

## What you have already

| Item | Status |
|------|--------|
| Supabase project connected in `.env.local` | Done |
| Website / React app | Unchanged |
| SQL migration file | Ready (not applied yet) |

## Migration files in this project

There is **one** migration file:

```
supabase/migrations/20260324000000_formulary_workflow.sql
```

That is the only SQL you need to run for the initial database.

### Is it safe to apply?

**Yes, on your new empty Supabase project**, because:

- It creates tables, types, indexes, and RLS policies
- It does **not** use `DROP TABLE` or delete existing rows
- It uses `IF NOT EXISTS` / safe enum creation so accidental re-runs are less harmful

**Do not apply it** if someone already created conflicting tables with the same names in this project. (Your earlier probe showed `public.profiles` does not exist yet, so you are clear to proceed.)

---

## Step 1 — Open the SQL (do this now)

1. On your computer, open this file in Cursor or any text editor:

   **`supabase/migrations/20260324000000_formulary_workflow.sql`**

2. Select **all** of the text (`Cmd+A`) and copy it (`Cmd+C`).

---

## Step 2 — Paste into Supabase (your next action)

1. Open your browser and go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your project (`voopcoevvbemzktakmsm`)
3. In the left sidebar, click **SQL Editor**
4. Click **New query**
5. Paste the SQL you copied
6. Click **Run** (bottom right)

Wait until you see a success message. If there is an error, copy the error text and share it before running anything else.

---

## Step 3 — Confirm tables were created

1. In the left sidebar, click **Table Editor**
2. You should see tables including:

   - `profiles`
   - `content_items`
   - `content_revisions`
   - `review_events`
   - `attachments`
   - `notifications`
   - `audit_log`

3. Open **Authentication → Policies** (or Table Editor → each table → RLS) and confirm RLS is enabled (the migration turns it on).

---

## Step 4 — Storage buckets (after Step 2 succeeds)

1. Left sidebar → **Storage**
2. Create a bucket named `formulary-drafts` → set it to **Private**
3. Create a bucket named `formulary-published` → set it to **Private**

(Do this only after the SQL succeeds.)

---

## What the migration creates (simple overview)

| Need | How it is stored |
|------|------------------|
| Administrator / Team Member roles | `profiles.role` (`administrator` or `team_member`) |
| Drug records & uploaded resources | `content_items` (+ `attachments` for files) |
| Review requests | `content_items` with status `pending-review` + `review_events` |
| Notifications | `notifications` |
| Audit log | `audit_log` |

### Publishing rules (enforced in the database)

- **Team members** can create/edit drafts and submit for review  
- **Team members cannot** set status to `approved` or `published`  
- **Administrators** can approve, publish, reject, and request changes  

---

## What not to do yet

- Do not run SQL from random tutorials that `DROP` tables  
- Do not put the **service_role** key in the React app or `.env.local`  
- Do not expect the website to fully sync content to Supabase until the app’s data layer is switched over (that is a later step)

---

## After you finish Step 2

Reply with either:

- “SQL ran successfully” and a screenshot/list of tables, **or**
- The exact error message from the SQL Editor

Then we will do the next step together (usually: create your first administrator Auth user + profile).
