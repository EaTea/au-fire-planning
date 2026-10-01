import { expect, test } from "./fixtures";

// End-to-end test for the first-run welcome page and disclaimer (NFR-5, NFR-4).

test("a first visit shows the welcome page and disclaimer, and after accepting and reloading it isn't shown again", async ({
  page,
}) => {
  // Opening a deep link still lands on the welcome page first.
  await page.goto("./#/results");

  await expect(page.getByRole("heading", { level: 1, name: /Welcome/ })).toBeVisible();
  await expect(page.getByText("It isn't personal financial, tax or legal advice.")).toBeVisible();
  await expect(page.getByText("Nothing is sent anywhere.")).toBeVisible();
  await expect(page.getByText("Your data stays on this device.")).toBeVisible(); // footer

  await expect(page.getByRole("navigation", { name: "Steps" })).toBeHidden();

  await page.getByRole("button", { name: "Start planning" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Income & expenses" })).toBeVisible();

  // Wait until the acceptance is on disk, then reload.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve, reject) => {
            const openRequest = indexedDB.open("au-fire-planner");
            openRequest.onerror = () => reject(openRequest.error);
            openRequest.onsuccess = () => {
              const database = openRequest.result;
              const get = database
                .transaction("meta")
                .objectStore("meta")
                .get("disclaimerAcceptedAt");
              get.onsuccess = () => {
                database.close();
                resolve(get.result !== undefined);
              };
              get.onerror = () => reject(get.error);
            };
          }),
      ),
    )
    .toBe(true);

  await page.goto("./#/results");
  await page.reload();

  await expect(page.getByRole("heading", { level: 1, name: "Results" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start planning" })).toHaveCount(0);
});
