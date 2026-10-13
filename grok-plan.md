# Make the activity tracker fully native

A native binary that still runs this HTML is a shell. Fully native means a SwiftUI rewrite. Export a JSON backup first: the `localStorage` key `activity-tracker-v1` stays in the browser and does not move.

Data to keep:

```json
{
  "activities": [{ "id": "…", "name": "…", "color": "#1d4e89" }],
  "marks": { "<id>": ["YYYY-MM-DD"] },
  "selectedId": "…"
}
```

`sanitize()` in `app.js` is the spec. Names are at most 48 characters. There are eight colors. Weeks start on Monday.

## Shell (native window, same UI)

1. Add Tauri 2 next to `index.html`. No bundler. Point `frontendDist` at this folder.
2. Download Newsreader and Public Sans and drop the Google Fonts links. The app must open with no network.
3. Replace the backup button and the file input. `<a download>` and `<input type="file">` are browser APIs. Use the Tauri save and open dialogs, and write the same JSON.
4. Move `save()` and `load()` from `localStorage` to one JSON file in the app data directory. Call `sanitize()` on read.
5. Change the sidebar line "Saved in this browser." Set the window title and a minimum size.
6. Add an icon and a bundle id, then `tauri build`. Sign and notarize the `.app` before you give it to anyone else.
7. On first launch, restore the browser backup.

iPhone needs Capacitor instead, plus safe areas and a file-picker plugin. Same HTML, same JSON. That binary is still WebKit drawing the CSS.

## Fully native (Mac)

1. Freeze the JSON schema. Do not invent a second format.
2. Model activities, a set of `YYYY-MM-DD` marks per id, and `selectedId`.
3. Store one JSON file in Application Support. Decode with the same rules as `sanitize()`.
4. Rebuild the UI: sidebar, twelve month grids, click to toggle a day, Mark today, year counts, current streak, longest streak, color dots, rename, remove with confirm.
5. Backup and restore go through save and open panels. The file must still load in the browser copy.
6. Bundle the two fonts.
7. Sandbox the app with user-selected file access for those panels. Then sign, notarize, or ship through the App Store.

iOS can share that model and use a split view. Android is a second UI.

## Open choice

Mac only, iPhone too, or the Tauri shell.
