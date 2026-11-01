const STORAGE_KEY = "pulse.tasks.v1";
const STREAK_KEY = "pulse.streak.v1";

const state = {
  tasks: loadTasks(),
  filter: "all",
  view: "dashboard",
};

const els = {
  date: document.getElementById("todayDate"),
  welcome: document.getElementById("welcomeMessage"),
  openCount: document.getElementById("openCount"),
  streak: document.getElementById("streakValue"),
  statTotal: document.getElementById("statTotal"),
  statDone: document.getElementById("statDone"),
  statHigh: document.getElementById("statHigh"),
  progressFill: document.getElementById("progressFill"),
  progressBar: document.getElementById("progressBar"),
  progressPercent: document.getElementById("progressPercent"),
  progressCopy: document.getElementById("progressCopy"),
  dashboardTasks: document.getElementById("dashboardTasks"),
  taskList: document.getElementById("taskList"),
  form: document.getElementById("taskForm"),
  title: document.getElementById("taskTitle"),
  priority: document.getElementById("taskPriority"),
  donut: document.getElementById("donut"),
  donutLabel: document.getElementById("donutLabel"),
  legendDone: document.getElementById("legendDone"),
  legendOpen: document.getElementById("legendOpen"),
  barHigh: document.getElementById("barHigh"),
  barMedium: document.getElementById("barMedium"),
  barLow: document.getElementById("barLow"),
  barHighLabel: document.getElementById("barHighLabel"),
  barMediumLabel: document.getElementById("barMediumLabel"),
  barLowLabel: document.getElementById("barLowLabel"),
  sidebar: document.getElementById("sidebar"),
  backdrop: document.getElementById("backdrop"),
  menuBtn: document.getElementById("menuBtn"),
};

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === view);
  });
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    const active = panel.dataset.viewPanel === view;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
  closeSidebar();
}

function openSidebar() {
  els.sidebar.classList.add("is-open");
  els.backdrop.hidden = false;
}

function closeSidebar() {
  els.sidebar.classList.remove("is-open");
  els.backdrop.hidden = true;
}

function counts() {
  const total = state.tasks.length;
  const done = state.tasks.filter((t) => t.done).length;
  const open = total - done;
  const high = state.tasks.filter((t) => !t.done && t.priority === "high").length;
  const byPriority = {
    high: state.tasks.filter((t) => t.priority === "high").length,
    medium: state.tasks.filter((t) => t.priority === "medium").length,
    low: state.tasks.filter((t) => t.priority === "low").length,
  };
  return { total, done, open, high, byPriority };
}

function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  let streak = { count: 0, last: null };
  try {
    streak = JSON.parse(localStorage.getItem(STREAK_KEY)) || streak;
  } catch {
    streak = { count: 0, last: null };
  }

  const completedToday = state.tasks.some((t) => t.done && t.completedOn === today);
  if (completedToday && streak.last !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    streak.count = streak.last === yKey ? streak.count + 1 : 1;
    streak.last = today;
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  }

  const label = streak.count === 1 ? "1 day" : `${streak.count} days`;
  els.streak.textContent = label;
}

function taskItem(task) {
  const li = document.createElement("li");
  li.className = `task${task.done ? " is-done" : ""}`;
  li.innerHTML = `
    <button class="check${task.done ? " is-on" : ""}" type="button" data-action="toggle" data-id="${task.id}" aria-label="Mark complete">
      <svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>
    </button>
    <div>
      <p class="task-title"></p>
      <span class="priority ${task.priority}">${task.priority} priority</span>
    </div>
    <button class="delete-btn" type="button" data-action="delete" data-id="${task.id}" aria-label="Delete task">✕</button>
  `;
  li.querySelector(".task-title").textContent = task.title;
  return li;
}

function renderList(target, tasks, emptyText) {
  target.replaceChildren();
  if (!tasks.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = emptyText;
    target.append(empty);
    return;
  }
  tasks.forEach((task) => target.append(taskItem(task)));
}

function render() {
  const { total, done, open, high, byPriority } = counts();
  const percent = total ? Math.round((done / total) * 100) : 0;

  els.date.textContent = formatDate(new Date());
  els.welcome.textContent = `${greeting()} — let’s make today count.`;
  els.openCount.textContent = `${open} open`;
  els.statTotal.textContent = String(total);
  els.statDone.textContent = String(done);
  els.statHigh.textContent = String(high);
  els.progressFill.style.width = `${percent}%`;
  els.progressBar.setAttribute("aria-valuenow", String(percent));
  els.progressPercent.textContent = `${percent}%`;
  els.progressCopy.textContent = total
    ? `${done} of ${total} tasks complete.`
    : "Add a task to start tracking.";

  const upcoming = state.tasks
    .filter((t) => !t.done)
    .sort((a, b) => rank(b.priority) - rank(a.priority))
    .slice(0, 4);
  renderList(els.dashboardTasks, upcoming, "No open tasks. You’re clear.");

  const filtered = state.tasks.filter((t) => {
    if (state.filter === "open") return !t.done;
    if (state.filter === "done") return t.done;
    return true;
  });
  renderList(els.taskList, filtered, "Nothing here yet.");

  els.donut.style.background = `conic-gradient(var(--teal) ${percent * 3.6}deg, #0e1620 0deg)`;
  els.donutLabel.textContent = `${percent}%`;
  els.legendDone.textContent = String(done);
  els.legendOpen.textContent = String(open);

  const maxPri = Math.max(byPriority.high, byPriority.medium, byPriority.low, 1);
  els.barHigh.style.width = `${(byPriority.high / maxPri) * 100}%`;
  els.barMedium.style.width = `${(byPriority.medium / maxPri) * 100}%`;
  els.barLow.style.width = `${(byPriority.low / maxPri) * 100}%`;
  els.barHighLabel.textContent = String(byPriority.high);
  els.barMediumLabel.textContent = String(byPriority.medium);
  els.barLowLabel.textContent = String(byPriority.low);

  updateStreak();
}

function rank(priority) {
  return { high: 3, medium: 2, low: 1 }[priority] || 0;
}

function addTask(title, priority) {
  state.tasks.unshift({
    id: uid(),
    title: title.trim(),
    priority,
    done: false,
    createdAt: Date.now(),
    completedOn: null,
  });
  saveTasks();
  render();
}

function toggleTask(id) {
  const today = new Date().toISOString().slice(0, 10);
  state.tasks = state.tasks.map((task) => {
    if (task.id !== id) return task;
    const done = !task.done;
    return { ...task, done, completedOn: done ? today : null };
  });
  saveTasks();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  saveTasks();
  render();
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = els.title.value.trim();
  if (!title) return;
  addTask(title, els.priority.value);
  els.form.reset();
  els.priority.value = "medium";
  els.title.focus();
});

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) {
    setView(nav.dataset.view);
    return;
  }

  const filter = event.target.closest("[data-filter]");
  if (filter) {
    state.filter = filter.dataset.filter;
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn === filter);
    });
    render();
    return;
  }

  const actionBtn = event.target.closest("[data-action]");
  if (actionBtn) {
    const { action, id } = actionBtn.dataset;
    if (action === "toggle") toggleTask(id);
    if (action === "delete") deleteTask(id);
  }
});

els.menuBtn.addEventListener("click", openSidebar);
els.backdrop.addEventListener("click", closeSidebar);

setView("dashboard");
render();
