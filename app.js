/* ============================================
   Flow — Work Management
   Firestore-backed task board with celebrations
   ============================================ */

// ---- Firebase Config ----
// Replace these values with your own Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDgTdYlGQkj3iwOtT8MLHSP-bB377cdgVM",
  authDomain: "work-management-778b2.firebaseapp.com",
  projectId: "work-management-778b2",
  storageBucket: "work-management-778b2.firebasestorage.app",
  messagingSenderId: "224261169207",
  appId: "1:224261169207:web:02ae724a70bc1dd4dddfb2",
  measurementId: "G-TP2X54EF09"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const tasksRef = db.collection("tasks");

// ---- DOM Elements ----
const taskInput = document.getElementById("task-input");
const assigneeInput = document.getElementById("task-assignee");
const deadlineInput = document.getElementById("task-deadline");
const deadlineToggle = document.getElementById("deadline-toggle");
const deadlineLabel = document.getElementById("deadline-label");
const deadlinePill = document.getElementById("deadline-pill");
const addBtn = document.getElementById("add-task-btn");
const todoList = document.getElementById("todo-list");
const inProgressList = document.getElementById("in-progress-list");
const doneList = document.getElementById("done-list");
const confettiCanvas = document.getElementById("confetti-canvas");
const celebrationToast = document.getElementById("celebration-toast");
const template = document.getElementById("task-template");

const listMap = {
  "todo": todoList,
  "in-progress": inProgressList,
  "done": doneList
};

const statusOrder = ["todo", "in-progress", "done"];

const celebrationMessages = [
  "Task completed. Great work.",
  "Nailed it. Keep going.",
  "Another one done. On fire.",
  "Mission accomplished.",
  "Crushing it. Well done.",
  "That's how it's done.",
  "Task complete. Nice.",
  "You're unstoppable.",
  "Fantastic work. Keep it up.",
  "Done and dusted."
];

// ---- Input Handling ----
taskInput.addEventListener("input", () => {
  addBtn.disabled = !taskInput.value.trim();
});

taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && taskInput.value.trim()) {
    addTask();
  }
});

assigneeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && taskInput.value.trim()) {
    addTask();
  }
});

// Deadline toggle — click icon to open native picker
deadlineToggle.addEventListener("click", () => {
  deadlineInput.showPicker ? deadlineInput.showPicker() : deadlineInput.click();
});

deadlineInput.addEventListener("change", () => {
  if (deadlineInput.value) {
    const d = new Date(deadlineInput.value);
    deadlineLabel.textContent = d.toLocaleDateString("en-US", {
      month: "short", day: "numeric"
    }) + ", " + d.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit"
    });
    deadlinePill.style.display = "";
  } else {
    clearDeadline();
  }
});

// Click the pill to clear the deadline
deadlinePill.addEventListener("click", clearDeadline);

function clearDeadline() {
  deadlineInput.value = "";
  deadlineLabel.textContent = "";
  deadlinePill.style.display = "none";
}

addBtn.addEventListener("click", addTask);

// ---- Add Task ----
function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  const assignee = assigneeInput.value.trim();
  const deadlineVal = deadlineInput.value;
  const deadline = deadlineVal ? new Date(deadlineVal).toISOString() : null;

  tasksRef.add({
    text,
    assignee,
    status: "todo",
    deadline,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    order: Date.now()
  });

  taskInput.value = "";
  assigneeInput.value = "";
  clearDeadline();
  addBtn.disabled = true;
  taskInput.focus();

  // Button micro-interaction
  addBtn.style.transform = "scale(0.93)";
  setTimeout(() => { addBtn.style.transform = ""; }, 150);
}

// ---- Move Task ----
function moveTask(taskId, newStatus, prevStatus) {
  // Celebrate immediately — don't wait for server
  if (newStatus === "done" && prevStatus !== "done") {
    celebrate();
  }

  tasksRef.doc(taskId).update({
    status: newStatus,
    order: Date.now()
  }).catch(err => {
    console.error("Failed to move task:", err);
  });
}

// ---- Delete Task ----
function deleteTask(taskId) {
  const card = document.querySelector(`[data-id="${taskId}"]`);
  if (card) {
    card.style.transition = "all 300ms cubic-bezier(0.4, 0, 1, 1)";
    card.style.opacity = "0";
    card.style.transform = "scale(0.9) translateY(-10px)";
    setTimeout(() => {
      tasksRef.doc(taskId).delete();
    }, 280);
  } else {
    tasksRef.doc(taskId).delete();
  }
}

// ---- Render Task Card ----
function createTaskCard(doc) {
  const data = doc.data();
  const clone = template.content.cloneNode(true);
  const card = clone.querySelector(".task-card");

  card.dataset.id = doc.id;
  card.dataset.status = data.status;

  card.querySelector(".task-text").textContent = data.text;

  // Assignee
  const badge = card.querySelector(".task-assignee-badge");
  if (data.assignee) {
    badge.textContent = data.assignee;
    badge.classList.add("visible");
  }

  // Time
  const timeEl = card.querySelector(".task-time");
  if (data.createdAt) {
    timeEl.textContent = formatTime(data.createdAt.toDate());
  } else {
    timeEl.textContent = "just now";
  }

  // Deadline countdown
  const countdownEl = card.querySelector(".task-countdown");
  if (data.deadline && data.status !== "done") {
    countdownEl.style.display = "";
    countdownEl.dataset.deadline = data.deadline;
    updateCountdown(countdownEl);
  }

  // Done styling
  if (data.status === "done") {
    card.classList.add("done-card");
  }

  // Move buttons
  const moveBack = card.querySelector(".move-back");
  const moveForward = card.querySelector(".move-forward");
  const deleteBtn = card.querySelector(".delete-btn");

  const currentIdx = statusOrder.indexOf(data.status);

  // Prevent draggable card from swallowing button clicks
  [moveBack, moveForward, deleteBtn].forEach(btn => {
    btn.setAttribute("draggable", "false");
  });

  moveBack.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentIdx > 0) {
      moveTask(doc.id, statusOrder[currentIdx - 1], data.status);
    }
  });

  moveForward.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentIdx < statusOrder.length - 1) {
      moveTask(doc.id, statusOrder[currentIdx + 1], data.status);
    }
  });

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    deleteTask(doc.id);
  });

  // Drag events
  card.addEventListener("dragstart", (e) => {
    // Don't start drag from buttons
    if (e.target.closest("button")) {
      e.preventDefault();
      return;
    }
    card.classList.add("dragging");
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: doc.id, status: data.status }));
    e.dataTransfer.effectAllowed = "move";
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    document.querySelectorAll(".column").forEach(col => col.classList.remove("drag-over"));
    document.querySelectorAll(".task-list").forEach(list => list.classList.remove("drag-over-list"));
  });

  return clone;
}

// ---- Format Time ----
function formatTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---- Drag & Drop (listen on entire column for robust drop zones) ----
document.querySelectorAll(".column").forEach(column => {
  const list = column.querySelector(".task-list");

  column.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    list.classList.add("drag-over-list");
    column.classList.add("drag-over");
  });

  column.addEventListener("dragleave", (e) => {
    if (!column.contains(e.relatedTarget)) {
      list.classList.remove("drag-over-list");
      column.classList.remove("drag-over");
    }
  });

  column.addEventListener("drop", (e) => {
    e.preventDefault();
    list.classList.remove("drag-over-list");
    column.classList.remove("drag-over");

    const raw = e.dataTransfer.getData("text/plain");
    const newStatus = column.dataset.status;

    try {
      const { id, status: prevStatus } = JSON.parse(raw);
      if (id && newStatus && newStatus !== prevStatus) {
        moveTask(id, newStatus, prevStatus);
      }
    } catch (_) { }

  });
});

// ---- Empty States ----
function renderEmptyState(status) {
  const icons = {
    "todo": `<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="6" y="4" width="20" height="24" rx="3" stroke="currentColor" stroke-width="1.5"/>
      <path d="M11 12H21M11 16H21M11 20H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    "in-progress": `<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="11" stroke="currentColor" stroke-width="1.5"/>
      <path d="M16 10V16L20 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    "done": `<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="11" stroke="currentColor" stroke-width="1.5"/>
      <path d="M11 16.5L14.5 20L21 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  };
  const texts = {
    "todo": "No tasks yet.\nAdd one above to get started.",
    "in-progress": "Nothing in progress.\nDrag a task here to begin.",
    "done": "No completed tasks yet.\nFinish something to celebrate."
  };
  const div = document.createElement("div");
  div.className = "empty-state";
  div.innerHTML = `
    <div class="empty-state-icon">${icons[status]}</div>
    <div class="empty-state-text">${texts[status]}</div>
  `;
  return div;
}

// ---- Real-time Listener ----
tasksRef.orderBy("order", "asc").onSnapshot((snapshot) => {
  const tasks = { "todo": [], "in-progress": [], "done": [] };

  snapshot.forEach(doc => {
    const data = doc.data();
    if (tasks[data.status]) {
      tasks[data.status].push(doc);
    }
  });

  // Render each column
  for (const [status, docs] of Object.entries(tasks)) {
    const list = listMap[status];
    list.innerHTML = "";

    if (docs.length === 0) {
      list.appendChild(renderEmptyState(status));
    } else {
      docs.forEach(doc => {
        list.appendChild(createTaskCard(doc));
      });
    }

    // Update counts
    const countEl = document.getElementById(`${status}-count`);
    if (countEl) countEl.textContent = docs.length;
  }
});

// ---- Celebration System ----
function celebrate() {
  // Show toast
  const msg = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
  celebrationToast.querySelector(".celebration-text").textContent = msg;
  celebrationToast.classList.add("show");
  setTimeout(() => celebrationToast.classList.remove("show"), 3000);

  // Fire confetti
  launchConfetti();
}

// ---- Confetti Engine (realistic strip physics) ----
function launchConfetti() {
  const ctx = confettiCanvas.getContext("2d");
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  const W = confettiCanvas.width;
  const H = confettiCanvas.height;
  const particles = [];
  const colors = ["#6366f1", "#a855f7", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#f472b6", "#fbbf24"];
  const GRAVITY = 0.12;
  const AIR_DRAG = 0.02;
  const FLUTTER_SPEED = 0.06;
  const COUNT = 120;

  // Spawn from two burst points (left-center and right-center)
  for (let i = 0; i < COUNT; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const originX = W / 2 + side * (W * 0.15 + Math.random() * W * 0.1);
    const originY = H * 0.45 + (Math.random() - 0.5) * H * 0.1;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    const speed = 6 + Math.random() * 10;

    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
      vy: Math.sin(angle) * speed * (0.8 + Math.random() * 0.5),
      // Confetti strip dimensions
      w: 4 + Math.random() * 5,
      h: 8 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      // 3D rotation angles
      tiltAngle: Math.random() * Math.PI * 2,
      tiltSpeed: (Math.random() - 0.5) * 0.15,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: FLUTTER_SPEED + Math.random() * 0.04,
      // Fluttering drift
      driftAmplitude: 0.5 + Math.random() * 1.5,
      opacity: 1,
      life: 0,
      maxLife: 200 + Math.random() * 120
    });
  }

  let frame;
  function animate() {
    ctx.clearRect(0, 0, W, H);

    let alive = false;
    for (const p of particles) {
      p.life++;
      if (p.life > p.maxLife) continue;
      alive = true;

      // Gravity
      p.vy += GRAVITY;

      // Air resistance (more on horizontal)
      p.vx *= (1 - AIR_DRAG);
      p.vy *= (1 - AIR_DRAG * 0.5);

      // Flutter — sinusoidal horizontal drift simulates air catching the strip
      p.wobble += p.wobbleSpeed;
      const flutter = Math.sin(p.wobble) * p.driftAmplitude;
      p.x += p.vx + flutter;
      p.y += p.vy;

      // 3D tumble
      p.tiltAngle += p.tiltSpeed;

      // Fade out near end of life
      const fadeStart = p.maxLife * 0.7;
      p.opacity = p.life > fadeStart
        ? 1 - (p.life - fadeStart) / (p.maxLife - fadeStart)
        : 1;

      // Simulate 3D rotation by scaling width (tilt toward/away from viewer)
      const tiltCos = Math.cos(p.tiltAngle);
      const apparentW = p.w * Math.abs(tiltCos);
      // Secondary wobble for twist
      const twistCos = Math.cos(p.wobble * 0.7);
      const apparentH = p.h * (0.6 + 0.4 * Math.abs(twistCos));

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(p.wobble * 0.5) * 0.6 + p.tiltAngle * 0.3);
      ctx.globalAlpha = Math.max(0, p.opacity);

      // Draw the confetti strip with a subtle shading for 3D feel
      ctx.fillStyle = p.color;
      ctx.fillRect(-apparentW / 2, -apparentH / 2, apparentW, apparentH);

      // Shading side (darker strip to simulate fold/depth)
      if (tiltCos > 0.1) {
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(-apparentW / 2, -apparentH / 2, apparentW * 0.4, apparentH);
      }

      ctx.restore();
    }

    if (alive) {
      frame = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, W, H);
      cancelAnimationFrame(frame);
    }
  }

  animate();
}

// ---- Window Resize for Confetti ----
window.addEventListener("resize", () => {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
});

// ---- Countdown System ----
function updateCountdown(el) {
  const deadline = new Date(el.dataset.deadline);
  const now = new Date();
  const diff = deadline - now;

  // Remove old urgency classes
  el.classList.remove("urgency-relaxed", "urgency-upcoming", "urgency-urgent", "urgency-critical", "urgency-overdue");

  if (diff <= 0) {
    // Overdue
    const absDiff = Math.abs(diff);
    const h = Math.floor(absDiff / 3600000);
    const m = Math.floor((absDiff % 3600000) / 60000);
    el.querySelector(".countdown-text").textContent = `OVERDUE by ${h}h ${m}m`;
    el.classList.add("urgency-overdue");
    return;
  }

  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  let text;
  if (days > 0) {
    text = `${days}d ${hrs}h ${mins}m ${secs}s`;
  } else if (hrs > 0) {
    text = `${hrs}h ${mins}m ${secs}s`;
  } else {
    text = `${mins}m ${secs}s`;
  }

  el.querySelector(".countdown-text").textContent = text;

  // Urgency tiers
  const hoursLeft = diff / 3600000;
  if (hoursLeft > 24) {
    el.classList.add("urgency-relaxed");
  } else if (hoursLeft > 6) {
    el.classList.add("urgency-upcoming");
  } else if (hoursLeft > 1) {
    el.classList.add("urgency-urgent");
  } else {
    el.classList.add("urgency-critical");
  }
}

// Tick every second
setInterval(() => {
  document.querySelectorAll(".task-countdown[data-deadline]").forEach(el => {
    if (el.dataset.deadline) {
      updateCountdown(el);
    }
  });
}, 1000);
