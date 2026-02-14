const entries = [];

function balance(items) {
  return items.reduce((sum, entry) => (entry.type === "income" ? sum + entry.amount : sum - entry.amount), 0);
}

entries.push({ id: "i1", type: "income", title: "給与", amount: 300000, category: "その他", date: "2026-02-14" });
entries.push({ id: "e1", type: "expense", title: "昼食", amount: 1200, category: "食費", date: "2026-02-14" });

if (balance(entries) !== 298800) {
  throw new Error(`step4 failed: expected 298800, got ${balance(entries)}`);
}

entries[1] = { ...entries[1], amount: 1500 };
if (balance(entries) !== 298500) {
  throw new Error(`step6 failed: expected 298500, got ${balance(entries)}`);
}

entries.splice(
  entries.findIndex((item) => item.id === "i1"),
  1,
);
if (balance(entries) !== -1500) {
  throw new Error(`step7 failed: expected -1500, got ${balance(entries)}`);
}

console.log("Sprint1 scenario check passed.");
