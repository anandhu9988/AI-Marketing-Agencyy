@echo off
cd /d "C:\Users\vjsud\ai\repo\employees\social-media-employee"
call "C:\Users\vjsud\AppData\Roaming\npm\claude.cmd" -p "Read C:/Users/vjsud/ai/repo/employees/social-media-employee/routines/soc-calendar-standup/SKILL.md and follow it." --permission-mode acceptEdits --output-format json < nul > "C:\Users\vjsud\ai\repo\employees\social-media-employee\run\soc-calendar-standup.last.json"
if errorlevel 1 node "C:\Users\vjsud\ai\repo\employees\social-media-employee\scripts\runlog.mjs" --failed-run soc-calendar-standup --exit-code %errorlevel%
