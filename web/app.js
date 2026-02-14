const STORAGE_KEY = "stocko.financeEntries.v1";
const categories = ["食費", "日用品", "交通", "光熱費", "通信", "その他"];

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function calcBalance(entries) {
  return entries.reduce((sum, e) => (e.type === "income" ? sum + e.amount : sum - e.amount), 0);
}

function renderBalance(entries) {
  const el = document.querySelector('[data-testid="balance"]');
  if (!el) return;
  el.textContent = `¥${calcBalance(entries).toLocaleString()}`;
}

function createCell(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

function renderTable(entries, onEdit, onDelete) {
  const body = document.querySelector("#entryRows");
  const empty = document.querySelector("#emptyState");
  if (!body) return;

  body.innerHTML = "";
  if (entries.length === 0) {
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";

  for (const entry of entries) {
    const tr = document.createElement("tr");

    tr.appendChild(createCell(entry.date));
    tr.appendChild(createCell(entry.type === "income" ? "収入" : "支出"));
    tr.appendChild(createCell(String(entry.category ?? "")));
    tr.appendChild(createCell(String(entry.title ?? "")));

    const amountTd = document.createElement("td");
    amountTd.className = entry.type === "income" ? "income" : "expense";
    amountTd.textContent = `${entry.type === "income" ? "+" : "-"}¥${Number(entry.amount).toLocaleString()}`;
    tr.appendChild(amountTd);

    const actionTd = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "編集";
    editBtn.dataset.edit = entry.id;
    editBtn.onclick = () => onEdit(entry.id);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "削除";
    deleteBtn.dataset.delete = entry.id;
    deleteBtn.onclick = () => onDelete(entry.id);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    actionTd.appendChild(actions);
    tr.appendChild(actionTd);

    body.appendChild(tr);
  }
}

function populateCategory(select) {
  for (const c of categories) {
    const option = document.createElement("option");
    option.value = c;
    option.textContent = c;
    select.appendChild(option);
  }
}

function init() {
  let entries = loadEntries().sort((a, b) => b.date.localeCompare(a.date));
  const form = document.querySelector("#entryForm");
  const categorySelect = document.querySelector("#category");
  const cancelBtn = document.querySelector("#cancelEdit");
  const editingId = { value: null };

  if (categorySelect && categorySelect.options.length === 0) populateCategory(categorySelect);

  const refresh = () => {
    entries = entries.sort((a, b) => b.date.localeCompare(a.date));
    saveEntries(entries);
    renderBalance(entries);
    renderTable(entries, handleEdit, handleDelete);
  };

  const resetForm = () => {
    if (!form) return;
    form.reset();
    form.type.value = "expense";
    form.date.value = new Date().toISOString().slice(0, 10);
    form.category.value = "食費";
    editingId.value = null;
    if (cancelBtn) cancelBtn.style.display = "none";
  };

  const handleEdit = (id) => {
    const item = entries.find((e) => e.id === id);
    if (!item || !form) return;
    form.type.value = item.type;
    form.title.value = item.title;
    form.amount.value = String(item.amount);
    form.category.value = item.category;
    form.date.value = item.date;
    form.note.value = item.note || "";
    editingId.value = id;
    if (cancelBtn) cancelBtn.style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    entries = entries.filter((e) => e.id !== id);
    if (editingId.value === id) resetForm();
    refresh();
  };

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const newEntry = {
        id: editingId.value || crypto.randomUUID(),
        type: data.get("type"),
        title: data.get("title"),
        amount: Number(data.get("amount")),
        category: data.get("category"),
        date: data.get("date"),
        note: data.get("note")
      };
      if (!newEntry.title || newEntry.amount <= 0 || Number.isNaN(newEntry.amount)) return;
      if (editingId.value) entries = entries.map((e) => (e.id === editingId.value ? newEntry : e));
      else entries.unshift(newEntry);
      resetForm();
      refresh();
    });
  }

  if (cancelBtn) cancelBtn.onclick = resetForm;

  refresh();
  if (form) resetForm();
}

document.addEventListener("DOMContentLoaded", init);
