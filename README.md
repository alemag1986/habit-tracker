# Habit tracker

A year-at-a-glance activity tracker for marking the days you did something. Track as many activities as you want. Everything stays in your browser until you download a backup.

## Features

- **Many activities** — running, reading, practice, or anything else, each with its own calendar
- **Full-year view** — twelve month grids; click a day to mark or clear it
- **Mark today** — one click for the current day
- **Streaks** — current streak and longest streak per activity
- **Colors** — pick a color for each activity so they are easy to tell apart
- **Year navigation** — flip through past and future years to fill in older days
- **Backup and restore** — download a JSON file, or restore one later
- **No account** — data is stored in `localStorage` on this device

## Run it

Serve the folder with any static file server, then open the URL in a browser:

```bash
python3 -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/).

You can also open `index.html` directly in a browser. A local server is more reliable for some browsers.

## How to use

1. Type an activity name in the sidebar and click **Add**.
2. Click days on the calendar when you did that activity, or use **Mark today**.
3. Switch activities in the sidebar to see each one’s own marked days.
4. Rename an activity by editing the large title; change its color with the dots underneath.
5. Use **Download backup** if you want a portable copy of your data.

## Tech

Plain HTML, CSS, and JavaScript. No build step and no backend.
