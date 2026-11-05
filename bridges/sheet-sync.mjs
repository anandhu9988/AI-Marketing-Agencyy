#!/usr/bin/env node
// Bridge 1: AI Employees run logs  ->  Google Sheet ledger
//
// Every AI Employee appends one JSON line to <its folder>/runlog.jsonl after each run.
// This script reads all 8 run logs, turns every NEW run into a ledger row
//   [Timestamp | Agent Name | Task Performed | Output Status]
// and POSTs the rows to the Google Apps Script web app (sheet-bridge.gs),
// which appends them to the shared Google Sheet.
//
// Usage:
//   node sheet-sync.mjs            send new rows to the Sheet
//   node sheet-sync.mjs --dry-run  only print the rows, send nothing
//
// It remembers how many lines of each run log it already sent in .bridge-state.json,
// so running it twice never creates duplicate rows.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(here, "agency.config.json");
const statePath = path.join(here, ".bridge-state.json");
const dryRun = process.argv.includes("--dry-run");

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : {};

// Turn one run record into one ledger row.
function toRow(agent, record) {
  const firstOutput = (record.outputs && record.outputs[0]) || "";
  const task = firstOutput ? `${record.routine}: ${firstOutput}` : record.routine;
  return {
    timestamp: record.end || record.start,
    agent,
    task: task.slice(0, 300),
    status: record.status,          // ok | partial | failed | skipped-...
    key: `${record.routine}|${record.period}|${record.end}`, // used by the Sheet to skip duplicates
  };
}

const rows = [];
const newState = { ...state };

for (const emp of config.employees) {
  const logPath = path.resolve(here, emp.folder, "runlog.jsonl");
  if (!fs.existsSync(logPath)) {
    console.log(`- ${emp.agent}: no runlog.jsonl yet (has it run once?)`);
    continue;
  }
  const lines = fs.readFileSync(logPath, "utf8").split("\n").filter((l) => l.trim());
  const alreadySent = state[logPath] || 0;
  const fresh = lines.slice(alreadySent);
  for (const line of fresh) {
    try {
      rows.push(toRow(emp.agent, JSON.parse(line)));
    } catch {
      console.log(`  skipped a line that is not valid JSON in ${logPath}`);
    }
  }
  newState[logPath] = lines.length;
  console.log(`- ${emp.agent}: ${fresh.length} new run(s)`);
}

if (rows.length === 0) {
  console.log("Nothing new to send.");
  process.exit(0);
}

if (dryRun) {
  console.table(rows.map(({ key, ...r }) => r));
  console.log(`Dry run: ${rows.length} row(s) would be sent. Nothing was sent.`);
  process.exit(0);
}

const res = await fetch(config.webAppUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ secret: config.secret, rows }),
  redirect: "follow",
});
const text = await res.text();
if (!res.ok || !text.includes('"ok":true')) {
  console.error("The Sheet did not accept the rows:", res.status, text.slice(0, 300));
  process.exit(1);
}
fs.writeFileSync(statePath, JSON.stringify(newState, null, 2));
console.log(`Sent ${rows.length} row(s) to the Google Sheet ledger. ${text}`);
