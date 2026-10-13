const STORAGE_KEY = "activity-tracker-v1";

const COLORS = [
  ["#1d4e89", "Blue"],
  ["#1f7a4d", "Green"],
  ["#9d3454", "Rose"],
  ["#5140a0", "Purple"],
  ["#0f766e", "Teal"],
  ["#3f6212", "Olive"],
  ["#0e7490", "Cyan"],
  ["#9a3412", "Rust"],
];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const monthName = new Intl.DateTimeFormat("en", { month: "long" });
const longDate = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const els = {
  list: document.querySelector("#activity-list"),
  empty: document.querySelector("#empty"),
  tracker: document.querySelector("#tracker"),
  months: document.querySelector("#months"),
  name: document.querySelector("#activity-name"),
  colors: document.querySelector("#colors"),
  year: document.querySelector("#year-label"),
  markToday: document.querySelector("#mark-today"),
  statYear: document.querySelector("#stat-year"),
  statStreak: document.querySelector("#stat-streak"),
  statLongest: document.querySelector("#stat-longest"),
  status: document.querySelector("#status"),
  remove: document.querySelector("#remove"),
  removeConfirm: document.querySelector("#remove-confirm"),
  removeCopy: document.querySelector("#remove-copy"),
  backupMsg: document.querySelector("#backup-msg"),
  newName: document.querySelector("#new-name"),
};

let year = new Date().getFullYear();
let state = load();

function fresh() {
  return { activities: [], marks: {}, selectedId: null };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    return sanitize(JSON.parse(raw));
  } catch {
    return fresh();
  }
}

function sanitize(data) {
  const next = fresh();
  if (!data || !Array.isArray(data.activities)) return next;
  const seen = new Set();
  for (const item of data.activities) {
    if (!item || typeof item.id !== "string" || seen.has(item.id)) continue;
    const name = cleanName(item.name);
    if (!name) continue;
    const known = COLORS.some(([color]) => color === item.color);
    const color = known ? item.color : COLORS[next.activities.length % COLORS.length][0];
    next.activities.push({ id: item.id, name, color });
    seen.add(item.id);
    const rawMarks = data.marks && Array.isArray(data.marks[item.id]) ? data.marks[item.id] : [];
    next.marks[item.id] = [...new Set(rawMarks.filter(isYmd))].sort();
  }
  next.selectedId = seen.has(data.selectedId) ? data.selectedId : next.activities[0]?.id ?? null;
  return next;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cleanName(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
}

function isYmd(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(value, amount) {
  const date = parseYmd(value);
  date.setDate(date.getDate() + amount);
  return ymd(date);
}

function current() {
  return state.activities.find((activity) => activity.id === state.selectedId) ?? null;
}

function marksFor(id) {
  return new Set(state.marks[id] ?? []);
}

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function nextColor() {
  const used = new Set(state.activities.map((activity) => activity.color));
  return COLORS.find(([color]) => !used.has(color))?.[0] ?? COLORS[state.activities.length % COLORS.length][0];
}

function yearCount(id, viewYear) {
  const prefix = `${viewYear}-`;
  return (state.marks[id] ?? []).reduce((count, date) => count + (date.startsWith(prefix) ? 1 : 0), 0);
}

function streaks(dates) {
  const unique = [...new Set(dates)].sort();
  if (unique.length === 0) return { current: 0, longest: 0 };
  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const gap = Math.round((parseYmd(unique[i]) - parseYmd(unique[i - 1])) / 86400000);
    if (gap === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else if (gap > 1) {
      run = 1;
    }
  }
  const today = ymd(new Date());
  let cursor = null;
  const set = new Set(unique);
  if (set.has(today)) cursor = today;
  else if (set.has(addDays(today, -1))) cursor = addDays(today, -1);
  let currentStreak = 0;
  while (cursor && set.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }
  return { current: currentStreak, longest };
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function hideRemoveConfirm() {
  els.removeConfirm.hidden = true;
  els.remove.hidden = false;
}

function render() {
  const activity = current();
  const hasActivities = state.activities.length > 0;
  els.empty.hidden = hasActivities;
  els.tracker.hidden = !hasActivities;
  renderList();
  if (!activity) {
    document.title = "Activity tracker";
    return;
  }
  els.tracker.style.setProperty("--stamp", activity.color);
  if (document.activeElement !== els.name) els.name.value = activity.name;
  document.title = `${activity.name} · Activity tracker`;
  els.year.textContent = String(year);
  renderColors(activity);
  renderStats(activity);
  renderMarkToday(activity);
  renderCalendar(activity);
  hideRemoveConfirm();
}

function renderList() {
  els.list.replaceChildren();
  for (const activity of state.activities) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "activity";
    button.dataset.id = activity.id;
    button.style.setProperty("--stamp", activity.color);
    if (activity.id === state.selectedId) button.setAttribute("aria-current", "true");
    button.setAttribute("aria-label", `${activity.name}, ${plural(yearCount(activity.id, year), "day")} in ${year}`);

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.setAttribute("aria-hidden", "true");

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = activity.name;

    const count = document.createElement("span");
    count.className = "count";
    count.textContent = String(yearCount(activity.id, year));

    button.append(swatch, name, count);
    item.append(button);
    els.list.append(item);
  }
}

function renderColors(activity) {
  els.colors.replaceChildren();
  for (const [color, name] of COLORS) {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "radio";
    button.style.setProperty("--c", color);
    button.setAttribute("aria-checked", color === activity.color ? "true" : "false");
    button.setAttribute("aria-label", name);
    button.dataset.color = color;
    els.colors.append(button);
  }
}

function renderStats(activity) {
  const dates = state.marks[activity.id] ?? [];
  const count = yearCount(activity.id, year);
  const { current: currentStreak, longest } = streaks(dates);
  els.statYear.innerHTML = `<strong>${count}</strong> ${count === 1 ? "day" : "days"} in ${year}`;
  els.statStreak.textContent = currentStreak === 0 ? "No streak right now" : `${currentStreak}-day streak`;
  els.statLongest.textContent =
    longest === 0 ? "No longest streak yet" : `Longest streak ${plural(longest, "day")}`;
}

function renderMarkToday(activity) {
  const today = ymd(new Date());
  const marked = marksFor(activity.id).has(today);
  els.markToday.textContent = marked ? "Unmark today" : "Mark today";
  els.markToday.classList.toggle("is-on", marked);
  els.markToday.setAttribute("aria-pressed", marked ? "true" : "false");
}

function renderCalendar(activity) {
  const marks = marksFor(activity.id);
  const today = ymd(new Date());
  els.months.replaceChildren();
  els.months.setAttribute("aria-label", `${year} for ${activity.name}`);
  let tabDate = today.startsWith(String(year)) ? today : `${year}-01-01`;
  if (!marks.has(tabDate) && !today.startsWith(String(year))) tabDate = `${year}-01-01`;

  for (let month = 0; month < 12; month += 1) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.className = "month-name";
    const first = new Date(year, month, 1);
    heading.textContent = monthName.format(first);
    section.setAttribute("aria-label", `${monthName.format(first)} ${year}`);

    const weekdays = document.createElement("div");
    weekdays.className = "weekdays";
    weekdays.setAttribute("aria-hidden", "true");
    for (const label of WEEKDAYS) {
      const cell = document.createElement("span");
      cell.className = "weekday";
      cell.textContent = label;
      weekdays.append(cell);
    }

    const grid = document.createElement("div");
    grid.className = "month-grid";
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < startPad; i += 1) {
      const pad = document.createElement("span");
      pad.className = "pad";
      grid.append(pad);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = ymd(date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "day";
      button.dataset.date = key;
      button.textContent = String(day);
      button.tabIndex = key === tabDate ? 0 : -1;
      paintDay(button, marks.has(key), date);
      grid.append(button);
    }
    section.append(heading, weekdays, grid);
    els.months.append(section);
  }
}

function paintDay(button, marked, date = parseYmd(button.dataset.date)) {
  const key = button.dataset.date;
  const today = ymd(new Date());
  button.setAttribute("aria-pressed", marked ? "true" : "false");
  button.classList.toggle("is-today", key === today);
  button.classList.toggle("is-future", key > today);
  const activity = current();
  const stateLabel = marked ? "marked" : "not marked";
  button.setAttribute("aria-label", `${longDate.format(date)}, ${stateLabel} for ${activity?.name ?? "activity"}`);
}

function updateCount(id) {
  const button = els.list.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (!button) return;
  const activity = state.activities.find((item) => item.id === id);
  const count = yearCount(id, year);
  button.querySelector(".count").textContent = String(count);
  button.setAttribute("aria-label", `${activity.name}, ${plural(count, "day")} in ${year}`);
}

function selectActivity(id) {
  if (id === state.selectedId) return;
  state.selectedId = id;
  save();
  els.status.textContent = "";
  render();
}

function addActivity(name) {
  const clean = cleanName(name);
  if (!clean) return;
  const activity = {
    id: uid(),
    name: clean,
    color: nextColor(),
  };
  state.activities.push(activity);
  state.marks[activity.id] = [];
  state.selectedId = activity.id;
  save();
  els.newName.value = "";
  els.status.textContent = "";
  render();
  els.markToday.focus();
}

function toggleDate(date) {
  const activity = current();
  if (!activity) return;
  const marks = marksFor(activity.id);
  const marked = !marks.has(date);
  if (marked) marks.add(date);
  else marks.delete(date);
  state.marks[activity.id] = [...marks].sort();
  save();
  const button = els.months.querySelector(`[data-date="${date}"]`);
  if (button) paintDay(button, marked);
  renderStats(activity);
  renderMarkToday(activity);
  updateCount(activity.id);
  const verb = marked ? "Marked" : "Cleared";
  els.status.textContent = `${verb} ${longDate.format(parseYmd(date))} for ${activity.name}.`;
}

function setYear(next) {
  year = next;
  els.status.textContent = "";
  render();
}

document.querySelector("#add-form").addEventListener("submit", (event) => {
  event.preventDefault();
  addActivity(els.newName.value);
});

els.list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  selectActivity(button.dataset.id);
});

els.name.addEventListener("input", () => {
  const activity = current();
  if (!activity) return;
  activity.name = els.name.value.slice(0, 48);
  const label = els.list.querySelector(`[data-id="${CSS.escape(activity.id)}"] .name`);
  if (label) label.textContent = activity.name || "Untitled";
  document.title = activity.name ? `${activity.name} · Activity tracker` : "Activity tracker";
  save();
});

els.name.addEventListener("blur", () => {
  const activity = current();
  if (!activity) return;
  activity.name = cleanName(activity.name) || "Untitled";
  els.name.value = activity.name;
  save();
  renderList();
  renderCalendar(activity);
});

els.colors.addEventListener("click", (event) => {
  const button = event.target.closest("[data-color]");
  if (!button) return;
  const activity = current();
  if (!activity) return;
  activity.color = button.dataset.color;
  save();
  els.tracker.style.setProperty("--stamp", activity.color);
  renderColors(activity);
  const row = els.list.querySelector(`[data-id="${CSS.escape(activity.id)}"]`);
  if (row) row.style.setProperty("--stamp", activity.color);
});

document.querySelector("#prev-year").addEventListener("click", () => setYear(year - 1));
document.querySelector("#next-year").addEventListener("click", () => setYear(year + 1));

els.markToday.addEventListener("click", () => {
  const todayYear = new Date().getFullYear();
  if (year !== todayYear) setYear(todayYear);
  toggleDate(ymd(new Date()));
});

els.months.addEventListener("click", (event) => {
  const button = event.target.closest(".day");
  if (!button) return;
  toggleDate(button.dataset.date);
});

els.months.addEventListener("keydown", (event) => {
  const button = event.target.closest(".day");
  if (!button) return;
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
  if (!step) return;
  event.preventDefault();
  const next = els.months.querySelector(`[data-date="${addDays(button.dataset.date, step)}"]`);
  if (!next) return;
  button.tabIndex = -1;
  next.tabIndex = 0;
  next.focus();
});

els.remove.addEventListener("click", () => {
  const activity = current();
  if (!activity) return;
  els.remove.hidden = true;
  els.removeConfirm.hidden = false;
  els.removeCopy.textContent = `Remove ${activity.name} and every day marked for it?`;
  document.querySelector("#confirm-remove").focus();
});

document.querySelector("#cancel-remove").addEventListener("click", () => {
  hideRemoveConfirm();
  els.remove.focus();
});

document.querySelector("#confirm-remove").addEventListener("click", () => {
  const activity = current();
  if (!activity) return;
  const index = state.activities.findIndex((item) => item.id === activity.id);
  state.activities.splice(index, 1);
  delete state.marks[activity.id];
  const neighbor = state.activities[index] ?? state.activities[index - 1] ?? null;
  state.selectedId = neighbor?.id ?? null;
  save();
  els.status.textContent = "";
  render();
  if (!state.activities.length) els.newName.focus();
});

document.querySelector("#export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const today = ymd(new Date());
  link.href = url;
  link.download = `activity-tracker-${today}.json`;
  link.click();
  URL.revokeObjectURL(url);
  els.backupMsg.textContent = "Backup downloaded.";
});

document.querySelector("#import").addEventListener("change", async (event) => {
  const input = event.target;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const next = sanitize(parsed);
    if (!next.activities.length) {
      els.backupMsg.textContent = "That file has no activities to restore.";
      return;
    }
    const replacing = state.activities.length > 0;
    if (replacing) {
      const ok = window.confirm("Replace the activities saved in this browser with this backup?");
      if (!ok) {
        els.backupMsg.textContent = "Restore cancelled.";
        return;
      }
    }
    state = next;
    save();
    year = new Date().getFullYear();
    els.status.textContent = "";
    render();
    els.backupMsg.textContent = `Restored ${plural(next.activities.length, "activity")}.`;
  } catch {
    els.backupMsg.textContent = "That file could not be read. Choose a backup from this tracker.";
  }
});

render();
if (!state.activities.length) els.newName.focus();
