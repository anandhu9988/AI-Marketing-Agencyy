/**
 * Bridge 2 + 3: Google Apps Script attached to the ledger Google Sheet.
 *
 * Setup (once):
 *  1. Open the Google Sheet  ->  Extensions  ->  Apps Script. Paste this whole file.
 *  2. Set SECRET below to the same string as "secret" in agency.config.json,
 *     and REPORT_EMAIL to the inbox that should get the daily brief.
 *  3. Run setup() once from the editor and accept the permissions.
 *  4. Deploy  ->  New deployment  ->  Web app. Execute as: Me. Who has access: Anyone.
 *     Copy the web app URL into "webAppUrl" in agency.config.json.
 */

const SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING';
const REPORT_EMAIL = 'your.name@example.com';
const SHEET_NAME = 'Ledger';
const HEADERS = ['Timestamp', 'Agent Name', 'Task Performed', 'Output Status', 'Key'];

/** Run once: creates the Ledger tab with headers and the daily email trigger. */
function setup() {
  const sheet = getLedger_();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'sendDailyBrief')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendDailyBrief').timeBased().everyDays(1).atHour(8).create();
  sheet.getRange('A1').setNote('Rows are written by sheet-sync.mjs. Do not edit column E.');
}

/** Bridge 2: receives rows from sheet-sync.mjs and appends them to the Ledger. */
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.secret !== SECRET) return json_({ ok: false, error: 'bad secret' });

  const sheet = getLedger_();
  const lastRow = sheet.getLastRow();
  const existingKeys = lastRow > 1
    ? new Set(sheet.getRange(2, 5, lastRow - 1, 1).getValues().map(r => r[0]))
    : new Set();

  const newRows = (body.rows || [])
    .filter(r => !existingKeys.has(r.key))
    .map(r => [new Date(r.timestamp), r.agent, r.task, r.status, r.key]);

  if (newRows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, HEADERS.length).setValues(newRows);
  }
  return json_({ ok: true, added: newRows.length, skippedDuplicates: (body.rows || []).length - newRows.length });
}

/** Bridge 3: the daily status bulletin, emailed every morning by the trigger. */
function sendDailyBrief() {
  const sheet = getLedger_();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const data = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues()
    : [];
  const recent = data.filter(r => r[0] instanceof Date && r[0] >= since);

  const count = s => recent.filter(r => String(r[3]) === s).length;
  const ok = count('ok'), partial = count('partial'), failed = count('failed');
  const other = recent.length - ok - partial - failed;
  const colour = s => s === 'ok' ? '#1e7e34' : s === 'failed' ? '#c0392b' : '#b7791f';

  const rowsHtml = recent.map(r =>
    `<tr><td>${Utilities.formatDate(r[0], Session.getScriptTimeZone(), 'HH:mm')}</td>` +
    `<td>${r[1]}</td><td>${r[2]}</td>` +
    `<td style="color:${colour(String(r[3]))};font-weight:bold">${r[3]}</td></tr>`).join('');

  const html =
    `<h2>AI Marketing Agency: daily brief</h2>` +
    `<p><b>${recent.length}</b> runs in the last 24 hours: ` +
    `<b style="color:#1e7e34">${ok} ok</b>, <b style="color:#b7791f">${partial} partial</b>, ` +
    `<b style="color:#c0392b">${failed} failed</b>, ${other} skipped.</p>` +
    (recent.length
      ? `<table border="1" cellpadding="6" style="border-collapse:collapse">` +
        `<tr><th>Time</th><th>Agent</th><th>Task</th><th>Status</th></tr>${rowsHtml}</table>`
      : `<p>No runs were logged. Check that the machine was awake and the agents are logged in.</p>`) +
    `<p><a href="${SpreadsheetApp.getActive().getUrl()}">Open the full ledger</a></p>`;

  MailApp.sendEmail({
    to: REPORT_EMAIL,
    subject: `[AI Agency] Daily brief: ${ok} ok, ${failed} failed`,
    htmlBody: html,
  });
}

function getLedger_() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
