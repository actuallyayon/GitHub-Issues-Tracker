const API_BASE  = "https://phi-lab-server.vercel.app/api/v1/lab";
const container = document.getElementById("issuesContainer");
let allIssues = [];
let activeTab = "all";
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year:  "numeric",
    month: "numeric",
    day:   "numeric",
  });
}
function pillClass(priority) {
  const p = (priority || "").toLowerCase();
  if (p === "high")   return "pill-high";
  if (p === "medium") return "pill-medium";
  return "pill-low";
}
function pillSolidClass(priority) {
  const p = (priority || "").toLowerCase();
  if (p === "high")   return "pill-solid-high";
  if (p === "medium") return "pill-solid-medium";
  return "pill-solid-low";
}
function chipClass(label) {
  const l = (label || "").toLowerCase();
  if (l.includes("bug"))         return "chip chip-bug";
  if (l.includes("help"))        return "chip chip-help";
  if (l.includes("enhancement")) return "chip chip-enhancement";
  if (l.includes("doc"))         return "chip chip-docs";
  if (l.includes("good"))        return "chip chip-good";
  return "chip chip-default";
}
function chipIconImg(label) {
  const l = (label || "").toLowerCase();
  if (l.includes("bug"))         return `<img src="assets/bug.png"     alt="bug"         class="w-4 h-4 flex-shrink-0" />`;
  if (l.includes("help"))        return `<img src="assets/help.png" alt="help wanted" class="w-4 h-4 flex-shrink-0" />`;
  if (l.includes("enhancement")) return `<img src="assets/enhance.png" alt="enhancement" class="w-4 h-4 flex-shrink-0" />`;
  if (l.includes("documentation")) return `<img src="assets/doc.svg" alt="doc" class="w-4 h-4 flex-shrink-0" />`;
  if (l.includes("good first issue")) return `<img src="assets/good.svg" alt="good" class="w-4 h-4 flex-shrink-0" />`;
  /* fallback for other labels — use help-wanted icon */
  return `<img src="assets/Vector__1_.png" alt="${label}" class="w-3 h-3 flex-shrink-0" />`;
}
function labelTag(label) {
  return `<span class="${chipClass(label)}">
    ${chipIconImg(label)}${label.toUpperCase()}
  </span>`;
}
function statusIcon(status) {
  if (status === "open") {
    return `<img src="assets/open.png"      alt="Open"   class="w-6 h-6 flex-shrink-0" />`;
  }
  return   `<img src="assets/close.png"  alt="Closed" class="w-6 h-6 flex-shrink-0" />`;
}
function showLoading(message = "Loading issues...") {
  container.innerHTML = `
    <div class="col-span-4 flex items-center justify-center py-20 gap-3">
      <div class="spinner"></div>
      <span class="text-sm text-gray-400">${message}</span>
    </div>`;
}
async function loadIssues() {
  showLoading("Loading issues...");
  try {
    const res  = await fetch(`${API_BASE}/issues`);
    const data = await res.json();
    allIssues  = data.data || [];
    displayIssues(allIssues);
  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <p class="col-span-4 text-center text-red-500 py-16">
        Failed to load issues. Check your connection.
      </p>`;
  }
}
function displayIssues(data) {
  document.getElementById("issueCount").textContent =
    data.length + " Issue" + (data.length !== 1 ? "s" : "");

  if (!data.length) {
    container.innerHTML = `
      <p class="col-span-4 text-center text-gray-400 py-20 text-sm">No issues found.</p>`;
    return;
  }
  container.innerHTML = data.map((issue) => {
    const pri        = (issue.priority || "").toUpperCase();
    const labelsHtml = (issue.labels || []).map(labelTag).join("");
    return `
      <div class="issue-card ${issue.status}" data-id="${issue.id}">
        <div class="flex items-center justify-between">
          ${statusIcon(issue.status)}
          <span class="pill ${pillClass(issue.priority)}">${pri}</span>
        </div>
        <h3 class="font-bold text-gray-900 text-[14px] mt-2 leading-snug line-clamp-2">
          ${issue.title}
        </h3>
        <p class="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">
          ${(issue.description || "").slice(0, 90)}…
        </p>
        <!-- Label chips with PNG icons -->
        <div class="flex flex-wrap gap-1 mt-2 min-h-[22px]">
          ${labelsHtml}
        </div>
        <div class="border-t border-gray-100 mt-2 pt-2">
          <p class="text-xs text-gray-400">
            #${issue.id} by
            <span class="font-medium text-gray-500">${issue.author}</span>
          </p>
          <p class="text-xs text-gray-400">${formatDate(issue.createdAt)}</p>
        </div>
      </div>`;
  }).join("");
  container.querySelectorAll(".issue-card").forEach((card) => {
    card.addEventListener("click", () => openModal(Number(card.dataset.id)));
  });
}
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("activeTab"));
    tab.classList.add("activeTab");
    activeTab = tab.dataset.status;
    showLoading("Loading...");
    setTimeout(() => {
      const filtered =
        activeTab === "all"
          ? allIssues
          : allIssues.filter((i) => i.status === activeTab);
      displayIssues(filtered);
    }, 200);
  });
});
document.getElementById("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});
async function doSearch() {
  const q = document.getElementById("searchInput").value.trim();
  if (!q) { displayIssues(allIssues); return; }
  showLoading("Searching...");
  try {
    const res  = await fetch(`${API_BASE}/issues/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    displayIssues(data.data || []);
  } catch (err) {
    console.error(err);
    displayIssues(
      allIssues.filter((i) =>
        i.title.toLowerCase().includes(q.toLowerCase()) ||
        (i.description || "").toLowerCase().includes(q.toLowerCase())
      )
    );
  }
}
async function openModal(id) {
  const overlay = document.getElementById("detailModal");
  overlay.classList.add("show");
  document.getElementById("detailLoader").style.display = "flex";
  document.getElementById("detailContent").classList.add("hidden");
  try {
    const res   = await fetch(`${API_BASE}/issue/${id}`);
    const data  = await res.json();
    const issue = data.data;
    document.getElementById("modalTitle").textContent = issue.title;
    const statusBadge = document.getElementById("modalStatusBadge");
    if (issue.status === "open") {
      statusBadge.textContent = "Opened";
      statusBadge.className   = "text-xs font-semibold px-3 py-1.5 rounded-full bg-green-500 text-white";
    } else {
      statusBadge.textContent = "Closed";
      statusBadge.className   = "text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-500 text-white";
    }
    const action = issue.status === "open" ? "Opened by" : "Closed by";
    document.getElementById("modalAuthorLine").textContent = `${action} ${issue.author}`;
    document.getElementById("modalDateLine").textContent   = formatDate(issue.createdAt);
    document.getElementById("modalLabels").innerHTML =
      (issue.labels || []).map(labelTag).join("");
    document.getElementById("modalDesc").textContent = issue.description;
    document.getElementById("modalAssignee").textContent = issue.assignee || "Unassigned";
    const priBadge    = document.getElementById("modalPriorityBadge");
    priBadge.textContent = (issue.priority || "").toUpperCase();
    priBadge.className   = pillSolidClass(issue.priority);
    document.getElementById("detailLoader").style.display = "none";
    document.getElementById("detailContent").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    document.getElementById("detailLoader").innerHTML =
      `<p class="text-red-500 text-sm py-4 text-center">Failed to load issue details.</p>`;
  }
}
document.getElementById("closeModal").addEventListener("click", closeDetailModal);
document.getElementById("detailModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("detailModal")) closeDetailModal();
});
function closeDetailModal() {
  document.getElementById("detailModal").classList.remove("show");
}
document.getElementById("newIssueBtn").addEventListener("click", () => {
  document.getElementById("newIssueModal").classList.add("show");
});
document.getElementById("closeNewIssue").addEventListener("click", closeCreateModal);
document.getElementById("newIssueModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("newIssueModal")) closeCreateModal();
});
function closeCreateModal() {
  document.getElementById("newIssueModal").classList.remove("show");
}
document.getElementById("submitIssueBtn").addEventListener("click", () => {
  const title = document.getElementById("issueTitle").value.trim();
  const desc  = document.getElementById("issueDesc").value.trim();
  const errEl = document.getElementById("newIssueError");

  if (!title || !desc) { errEl.classList.remove("hidden"); return; }
  errEl.classList.add("hidden");

  const newIssue = {
    id:          allIssues.length + 1,
    title,
    description: desc,
    priority:    document.getElementById("issuePriority").value,
    labels:      document.getElementById("issueLabels").value
                   .split(",").map((l) => l.trim()).filter(Boolean),
    status:      "open",
    author:      "admin",
    assignee:    "",
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  allIssues.unshift(newIssue);
  closeCreateModal();

  const filtered =
    activeTab === "all"
      ? allIssues
      : allIssues.filter((i) => i.status === activeTab);
  displayIssues(filtered);

  ["issueTitle", "issueDesc", "issueLabels"].forEach(
    (id) => (document.getElementById(id).value = "")
  );
  document.getElementById("issuePriority").value = "high";
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeDetailModal();
  closeCreateModal();
});
loadIssues();