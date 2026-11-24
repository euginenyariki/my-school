# Schola

A small, local-first school operations dashboard. It replaces a folder of disconnected static HTML pages with one usable app for the daily admin jobs: the student registry, attendance, fee balances and a weekly timetable.

## Why it exists

This repo started life as a set of unconnected school website mockups (`school.html`, `student.html`, `login.html`, …). It has been rebuilt as a real, working tool: no build step, no account, no backend and no secrets — just open it and use it.

## Features

- **Overview** — enrolled learners, today's attendance, outstanding fees and weekly attendance trend
- **Students** — searchable/filterable registry with add, edit, remove and per-class filters
- **Attendance** — one-tap present/absent register that updates the weekly chart
- **Fees** — term fee, paid amount, balance and status with CSV export
- **Timetable** — a clean weekly grid for Form 2A
- **Local persistence** — changes survive reloads via `localStorage`
- **Dark mode** and responsive layout for phone and desktop

## Run it

```bash
# just open index.html in a browser
xdg-open index.html      # Linux
open index.html          # macOS
```

Or serve it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Data & privacy

Everything is stored in your browser's `localStorage` under `schola:v1`. Nothing is uploaded. Use **Reset demo data** in the sidebar to restore the sample learners.

## Stack

Vanilla HTML, CSS and JavaScript. No dependencies, no tracking, no API keys.

## License

MIT — see [LICENSE](LICENSE).
