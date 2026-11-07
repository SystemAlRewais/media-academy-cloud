# Media Academy Cloud — Google Apps Script backend

This backend uses a **private Google Sheet only as its storage layer**. Students never receive the spreadsheet URL or access to the sheet. The owner/admin creates student accounts from the admin portal; there is no public student registration.

## One-time setup

1. Create a **new blank Google Spreadsheet** and keep its sharing set to **Restricted**. Do not share it with students.
2. Open **Extensions → Apps Script** from that spreadsheet.
3. Replace the contents of `Code.gs` with the complete code in this repository's `backend/Code.gs`.
4. In Apps Script, open **Project Settings → Script Properties** and add:
   - `SPREADSHEET_ID`: the ID from the new spreadsheet URL (between `/d/` and `/edit`).
   - `BOOTSTRAP_EMAIL`: the private owner email address.
   - `BOOTSTRAP_PASSWORD`: a new, unique password of at least 12 characters. Do not reuse the old demo password.
5. In the Apps Script editor, choose `setupInitialOwner` and click **Run** once. Approve the requested Google permissions. This creates the database tabs, the first Owner account (username: `Owner`), four default cohorts, and their forums. It does **not** create any student account.
6. Choose **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone** (required because the student website is hosted separately on GitHub Pages; the app itself still requires a valid account/session for private data).
   - Deploy and copy the URL ending in `/exec`.
7. Put that exact URL into `appsScriptUrl` in `src/config.js`. Commit the change to `main`; GitHub Actions will build and publish the site.
8. Owner portal: open the website with `?panel=owner` at the end of its address. Sign in with username `Owner` and the private password set in Script Properties. Do not share this admin link or password with students.

## Database tabs

Running `setupInitialOwner` creates all required tabs and headers: Institutions, Users, Cohorts, Departments, Subjects, Enrollments, Content, Lectures, AttendanceSessions, Attendance, Exams, Grades, Announcements, ForumRooms, ForumPosts, ForumReplies, ForumReactions, Discipline, Messages, SupportTickets, Roles, AuditLog, and Settings.

The initial cohort IDs are `cohort-1` through `cohort-4`. New student accounts are created only by an authorized administrator from the portal and must be assigned to an active cohort.

## Access and security

- Keep the spreadsheet **Restricted**. Never publish it or share it with students.
- Owner and manager passwords are salted and hashed; plaintext passwords are not written to the sheet.
- Student passwords are set by an administrator and are never returned by the API.
- Admin-only actions are checked on the Apps Script server, not just hidden in the UI.
- Student records, grades, attendance, discipline history, course content, announcements, and cohort forums are scoped to the student's institution and/or cohort as appropriate.
- Five failed login attempts temporarily lock that login identifier for 15 minutes.
- Sessions are stored in Script Cache and expire after six hours.
- The web app must be reachable by the external GitHub Pages client. The spreadsheet itself remains private. Do not treat the obscurity of the admin URL as the security boundary; the server-side role check is the security boundary.

## API transport and limits

The frontend uses JSONP GET requests so Apps Script ContentService redirects can be handled by browsers without relying on custom CORS response headers. This is a lightweight academy backend, not a high-volume chat server. Keep requests small; forum updates currently poll. Apps Script quotas and URL length limits apply. Do not store large binary files in cells; store files in Drive and keep only approved file links in Sheets.
