# Google Apps Script backend

This folder contains the Apps Script source. Copy `Code.gs` into a new Apps Script project attached to the private Google Sheet.

## Setup sequence

1. Create a private Google Sheet for the academy database.
2. In Apps Script, add `Code.gs` and set the project manifest from `appsscript.json`.
3. In **Project Settings → Script Properties**, set:
   - `SPREADSHEET_ID`: the spreadsheet ID (the part between `/d/` and `/edit`).
   - `BOOTSTRAP_EMAIL`: the owner's login email.
   - `BOOTSTRAP_PASSWORD`: a temporary strong password of at least 12 characters.
4. Run `setupInitialOwner()` once and authorize it. This creates all tabs and the first owner. The temporary password property is deleted after successful creation.
5. Deploy as a Web App, execute as the owner, and restrict access according to the intended audience. Keep the spreadsheet private.
6. Put the resulting `/exec` URL into `src/config.js` as `appsScriptUrl`.

## Tables

The setup function creates the schema tabs automatically: Institutions, Users, Cohorts, Departments, Subjects, Enrollments, Content, Lectures, AttendanceSessions, Attendance, Exams, Grades, Announcements, ForumRooms, ForumPosts, ForumReplies, ForumReactions, Discipline, Messages, SupportTickets, Roles, AuditLog, Settings.

## API transport

The frontend uses JSONP GET requests so Apps Script ContentService redirects can be handled by browsers without relying on custom CORS response headers. Keep requests small; this is a lightweight academy backend, not a high-volume chat server. Forum updates currently poll every 8 seconds. For true push/live chat at scale, add Firebase or Supabase Realtime while retaining Sheets as the reporting/administrative source of truth.

## Security notes

- The spreadsheet must remain private.
- Passwords are salted and SHA-256 hashed; plaintext passwords are never written to a sheet.
- Sessions are held in Script Cache and expire after six hours.
- Never expose discipline records to other students.
- Production deployment should add rate limiting, stronger password hashing (e.g. PBKDF2 where available), account recovery, stricter role permissions, input validation, and an external realtime service.
- Apps Script quotas and JSONP URL length limit the scale and size of requests. Do not store large binary files in cells; store files in Drive and only keep restricted file IDs/URLs in Sheets.
