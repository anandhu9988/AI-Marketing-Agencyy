# AI Marketing Agency

**Course assignment: Design & Deploy an Autonomous AI Agency** · Riga Nordic University, Information Technology, 2026
Team: Anandhu Chithrakumari Sudeesan · Sudev Veliyil Jeemon · Afnan Nassar

An AI marketing agency that manages a brand's social media with eight autonomous AI employees from the
[ai-employees](https://github.com/markfulton/ai-employees) repository. One of them, the Project Manager, is tracked in a
Google Sheet ledger and sends us a daily email brief.

## The team

| # | Agency role | AI employee (folder) | Marketing tasks |
|---|---|---|---|
| 1 | Project Manager | `employees/chief-of-staff` | Reads all run logs daily, flags what stopped; our bridges log every run to the Sheet and email the brief |
| 2 | Lead Researcher | `employees/seo-employee` | Keyword and trend research; checks whether the brand appears in AI answers |
| 3 | Content Writer | `employees/social-media-employee` | Learns the brand voice, drafts posts per platform, drafts replies |
| 4 | Performance Analyst | `employees/ad-manager-employee` | Reads ad and engagement metrics; weekly creative review and change list |
| 5 | Campaign Builder | `employees/gtm-engineer` | Target audience, launch steps, weekly scoreboard |
| 6 | Technical Auditor | `employees/web-dev-employee` | Checks the brand's website and landing pages |
| 7 | Support Triage | `employees/customer-satisfaction-employee` | Sweeps the inbox, sorts messages, drafts replies |
| 8 | Outbound Strategist | `employees/sales-employee` | Finds new client brands for the agency, drafts outreach |

Every employee folder was created with the official installer (`npx ai-employees hire <employee> --to employees/<employee>`),
which writes **`.installed.json`**: the kit name, version and a fingerprint of every file. That is the proof of installation.

## Architecture

```
8 AI employees ──► runlog.jsonl (one JSON line per run, in each folder)
                        │
                        ▼
        bridges/sheet-sync.mjs        Bridge 1 (Node): reads new runs, POSTs ledger rows
                        │
                        ▼
        bridges/sheet-bridge.gs       Bridge 2 (Apps Script doPost): appends rows, skips duplicates
                        │
                        ▼
        Google Sheet "Ledger"         Timestamp | Agent Name | Task Performed | Output Status
                        │
                        ▼
        sendDailyBrief() at 08:00     Bridge 3 (Apps Script + MailApp): daily email to our inbox
```

The Chief of Staff is read-only by design (it never writes to a Sheet or sends email), so the reporting is done by our three bridges.

## Setup

1. **Machine:** Node 18+ and a logged-in AI agent (we use Claude Code: `claude auth status`).
2. **Employees:** already installed in `employees/`. Open your agent in each folder and say
   *"Install the Social Media Employee from this folder"* (and so on). Point it at our brand.
3. **Schedules:** register each routine from that employee's `SCHEDULE.md` (Claude Desktop → Routines → Local, or cron).
4. **Google Sheet:** create a Sheet → Extensions → Apps Script → paste `bridges/sheet-bridge.gs`.
   Set `SECRET` and `REPORT_EMAIL`, run `setup()`, then Deploy → Web app (Execute as: Me, Access: Anyone). Copy the URL.
5. **Bridge config:** `cp bridges/agency.config.example.json bridges/agency.config.json`, paste the web app URL and the same secret.
   (`agency.config.json` is git-ignored so the secret never reaches GitHub.)
6. **Test:** `node bridges/sheet-sync.mjs --dry-run`, then `node bridges/sheet-sync.mjs`.
7. **Automate:** run `node bridges/sheet-sync.mjs` every hour (Task Scheduler / cron). The brief arrives daily at 08:00.

## Safety

- Every post, email, publish and spend is drafted and **held for our click** until a channel is released in an employee's `RELEASES.md`.
- No employee creates accounts, enters passwords or solves captchas. We log in ourselves.
- Run records refuse secrets, emails and drafts, so the Sheet only receives counts and file paths.
- The Apps Script web app rejects any request without the shared secret.

## Submission links

- Live Google Sheet ledger: _add link_
- Daily brief emails: _see `docs/emails/`_
- Screen recording: _add link_
- Presentation: _add link_
