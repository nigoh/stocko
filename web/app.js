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
  return entries.reduce((sum, e) => e.type === "income" ? sum + e.amount : sum - e.amount, 0);
}

function renderBalance(entries) {
  const el = document.querySelector('[data-testid="balance"]');
  if (!el) return;
  el.textContent = `¥${calcBalance(entries).toLocaleString()}`;
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
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.type === "income" ? "収入" : "支出"}</td>
      <td>${entry.category}</td>
      <td>${entry.title}</td>
      <td class="${entry.type === "income" ? "income" : "expense"}">${entry.type === "income" ? "+" : "-"}¥${entry.amount.toLocaleString()}</td>
      <td><div class="actions"><button data-edit="${entry.id}">編集</button><button data-delete="${entry.id}">削除</button></div></td>`;
    body.appendChild(tr);
  }
  body.querySelectorAll("button[data-edit]").forEach((btn) => btn.onclick = () => onEdit(btn.dataset.edit));
  body.querySelectorAll("button[data-delete]").forEach((btn) => btn.onclick = () => onDelete(btn.dataset.delete));
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
  let entries = loadEntries().sort((a,b)=>b.date.localeCompare(a.date));
  const form = document.querySelector("#entryForm");
  const categorySelect = document.querySelector("#category");
  const cancelBtn = document.querySelector("#cancelEdit");
  const editingId = { value: null };

  if (categorySelect && categorySelect.options.length === 0) populateCategory(categorySelect);

  const refresh = () => {
    entries = entries.sort((a,b)=>b.date.localeCompare(a.date));
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
      if (editingId.value) entries = entries.map((e) => e.id === editingId.value ? newEntry : e);
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
