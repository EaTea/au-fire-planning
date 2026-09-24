/*
 * Builds the shared app header for every mockup screen.
 *
 * Each screen's <body> sets data-step to the step it represents (1-7).
 * This script fills the empty <header class="app-header"> with the logo,
 * the step navigation (marking earlier steps done and the current one
 * active) and the save/export actions. Keeping the header here means the
 * step list is defined once, so all screens stay consistent when the
 * flow changes.
 */
(function renderAppHeader() {
  // The user's journey through the app, in order. See 00-user-flow.html.
  const steps = [
    "Household",
    "Income & expenses",
    "Assets",
    "Assumptions",
    "Results",
    "Projection",
    "Scenarios",
  ];

  const currentStep = Number(document.body.dataset.step || 0);
  const header = document.querySelector(".app-header");

  const stepPills = steps
    .map((name, index) => {
      const stepNumber = index + 1;
      let state = "";
      if (stepNumber < currentStep) state = "done";
      if (stepNumber === currentStep) state = "active";
      return `<span class="step ${state}"><span class="n">${stepNumber}</span>${name}</span>`;
    })
    .join("");

  header.innerHTML = `
    <span class="logo">AU FIRE Planner</span>
    <nav class="steps">${stepPills}</nav>
    <div class="header-actions">
      <span class="btn ghost">Plan: "Alex &amp; Sam" ▾</span>
      <span class="btn">Export <span class="req">OUT-7</span></span>
    </div>`;
})();
