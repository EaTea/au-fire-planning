/*
 * Builds the asset list shown on the left of every Assets mockup
 * (03a–03d).
 *
 * Each Assets screen sets data-asset on <body> to the id of the asset it
 * shows. This script fills the empty <div class="asset-list"> and marks
 * that asset as selected. Defining the list once keeps the example
 * household's figures consistent across all four screens.
 *
 * Net worth check (the numbers the list must add up to):
 *   assets  1,150 + 620 + 210 + 35 + 185 + 120 + 30 = 2,350k
 *   debts   640 (home loan) + 480 (investment loan) + 18 (car) = 1,138k
 *   net worth = 1,212k ≈ $1.21M
 *   investable = shares 245 + super 305 + cash 30 + investment property
 *   equity 140 = 720k (the home is excluded, PROP-10)
 */
(function renderAssetSidebar() {
  const groups = [
    { title: "Property", items: [
      { id: "home", name: "Home (owner-occupied)", value: "$1.15M" },
      { id: "investment-property", name: "Investment unit, Geelong", value: "$620k" },
    ] },
    { title: "Shares", items: [
      { id: "etf", name: "ETF portfolio", value: "$210k" },
      { id: "direct", name: "Direct shares", value: "$35k" },
    ] },
    { title: "Super", items: [
      { id: "super", name: "Alex", value: "$185k" },
      { id: "super-sam", name: "Sam", value: "$120k" },
    ] },
    { title: "Cash & debts", items: [
      { id: "cash", name: "Savings", value: "$30k" },
      { id: "car-loan", name: "Car loan", value: "−$18k" },
    ] },
  ];

  const selectedAsset = document.body.dataset.asset;
  const sidebar = document.querySelector(".asset-list");

  const groupHtml = groups
    .map((group) => {
      const rows = group.items
        .map((item) => {
          const selected = item.id === selectedAsset ? "on" : "";
          return `<div class="${selected}"><span>${item.name}</span><span>${item.value}</span></div>`;
        })
        .join("");
      return `<div class="group">${group.title}</div>${rows}`;
    })
    .join("");

  sidebar.innerHTML = `
    ${groupHtml}
    <div style="margin-top: 10px"><span class="btn ghost" style="width: 100%; text-align: center">+ Add asset or debt</span></div>
    <div class="group">Net worth <span class="req">OUT-1</span></div>
    <div><b>Total</b><b>$1.21M</b></div>
    <div class="muted"><span>of which investable</span><span>$720k</span></div>`;
})();
