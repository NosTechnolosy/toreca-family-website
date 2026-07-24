(() => {
  "use strict";

  const setStatus = (message) => {
    const status = document.querySelector("[data-buyback-status]");
    if (status) status.textContent = message;
  };

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const response = await fetch("./data/site-content.json", {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const content = await response.json();
      const buyback = content?.buybackTable;
      if (
        !buyback ||
        typeof buyback.imageUrl !== "string" ||
        typeof buyback.displayDate !== "string" ||
        typeof buyback.alt !== "string"
      ) {
        throw new Error("Invalid site content");
      }
      const image = document.querySelector("[data-buyback-image]");
      if (image) {
        image.src = new URL(buyback.imageUrl, document.baseURI).href;
        image.alt = buyback.alt;
      }
      const date = document.querySelector("[data-buyback-date]");
      if (date) date.textContent = buyback.displayDate;
      setStatus("");
    } catch {
      setStatus("最新の買取表を読み込めませんでした。時間をおいて再度お試しください。");
    }
  });
})();
