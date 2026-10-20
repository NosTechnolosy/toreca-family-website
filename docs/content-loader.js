(() => {
  "use strict";

  const FALLBACK = {
    id: "buyback-fallback",
    imageUrl: "./assets/kaitori-hyo.jpg",
    displayDate: "2026/06/28",
    alt: "ポケモンカード BOX 買取表（更新日 2026/06/28）"
  };

  const setStatus = (message) => {
    const status = document.querySelector("[data-buyback-status]");
    if (status) status.textContent = message;
  };

  const normalizeImages = (buyback) => {
    if (Array.isArray(buyback?.images)) {
      return buyback.images.slice(0, 5).filter((item) =>
        item && typeof item.imageUrl === "string" && item.imageUrl &&
        typeof item.displayDate === "string" && typeof item.alt === "string"
      );
    }
    if (
      buyback && typeof buyback.imageUrl === "string" && buyback.imageUrl &&
      typeof buyback.displayDate === "string" && typeof buyback.alt === "string"
    ) {
      return [{
        id: "buyback-legacy",
        imageUrl: buyback.imageUrl,
        displayDate: buyback.displayDate,
        alt: buyback.alt
      }];
    }
    return [];
  };

  const createSlide = (item, index, count) => {
    const slide = document.createElement("article");
    slide.className = "tf-buyback-slide";
    slide.dataset.buybackSlide = "";
    slide.setAttribute("aria-label", `買取表 ${index + 1} / ${count}`);

    const button = document.createElement("button");
    button.className = "tf-buyback-visual";
    button.type = "button";
    button.dataset.buybackOpen = "";
    button.setAttribute("aria-label", `${item.alt}を拡大表示`);

    const frame = document.createElement("span");
    frame.className = "tf-buyback-frame";
    const image = document.createElement("img");
    image.src = new URL(item.imageUrl, document.baseURI).href;
    image.alt = item.alt;
    image.loading = index === 0 ? "eager" : "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => setStatus("一部の買取表画像を読み込めませんでした。"), { once: true });
    frame.append(image);
    button.append(frame);

    const mascot = document.createElement("img");
    mascot.className = "tf-mascot tf-buyback-mascot";
    mascot.src = "assets/mascot-peek.png";
    mascot.alt = "";
    mascot.setAttribute("aria-hidden", "true");
    slide.append(button, mascot);
    return slide;
  };

  const initCarousel = (items) => {
    const region = document.querySelector("[data-buyback-region]");
    const carousel = document.querySelector("[data-buyback-carousel]");
    const track = document.querySelector("[data-buyback-track]");
    const dots = document.querySelector("[data-buyback-dots]");
    const date = document.querySelector("[data-buyback-date]");
    const modal = document.querySelector("[data-buyback-modal]");
    const modalImage = document.querySelector("[data-buyback-modal-image]");
    if (!region || !carousel || !track || !dots || !modal || !modalImage) return;

    if (!items.length) {
      region.hidden = true;
      return;
    }
    region.hidden = false;
    track.replaceChildren(...items.map((item, itemIndex) => createSlide(item, itemIndex, items.length)));
    dots.replaceChildren();

    const slides = Array.from(track.querySelectorAll("[data-buyback-slide]"));
    const multiple = slides.length > 1;
    carousel.classList.toggle("is-multiple", multiple);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    if (reduceMotion) track.style.transition = "none";

    let index = 0;
    let timer = 0;
    let hovering = false;
    let modalOpen = false;
    let touchStartX = null;

    const stop = () => {
      if (timer) window.clearTimeout(timer);
      timer = 0;
    };
    const start = () => {
      stop();
      if (!multiple || reduceMotion || hovering || modalOpen || document.hidden) return;
      timer = window.setTimeout(() => show(index + 1, false), 5000);
    };
    const show = (next, manual = true) => {
      index = (next + slides.length) % slides.length;
      track.style.transform = `translate3d(${-100 * index}%,0,0)`;
      slides.forEach((slide, slideIndex) => {
        const inactive = slideIndex !== index;
        slide.setAttribute("aria-hidden", String(inactive));
        const button = slide.querySelector("[data-buyback-open]");
        if (button) button.tabIndex = inactive ? -1 : 0;
      });
      Array.from(dots.children).forEach((dot, dotIndex) =>
        dot.setAttribute("aria-current", String(dotIndex === index))
      );
      if (date) date.textContent = items[index].displayDate;
      if (manual) stop();
      start();
    };

    if (multiple) {
      items.forEach((item, dotIndex) => {
        const dot = document.createElement("button");
        dot.className = "tf-buyback-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", `${dotIndex + 1}枚目の買取表を表示`);
        dot.addEventListener("click", () => show(dotIndex));
        dots.append(dot);
      });
    }

    carousel.querySelector("[data-buyback-prev]")?.addEventListener("click", () => show(index - 1));
    carousel.querySelector("[data-buyback-next]")?.addEventListener("click", () => show(index + 1));
    carousel.addEventListener("mouseenter", () => { hovering = true; stop(); });
    carousel.addEventListener("mouseleave", () => { hovering = false; start(); });
    carousel.addEventListener("touchstart", (event) => {
      if (event.touches.length === 1) touchStartX = event.touches[0].clientX;
    }, { passive: true });
    carousel.addEventListener("touchend", (event) => {
      if (touchStartX === null || !event.changedTouches[0]) return;
      const distance = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(distance) > 45) show(index + (distance < 0 ? 1 : -1));
    }, { passive: true });

    let pinchDistance = 0;
    let scale = 1;
    const resetZoom = () => {
      pinchDistance = 0;
      scale = 1;
      modalImage.style.transform = "scale(1)";
    };
    const closeModal = () => {
      modalOpen = false;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("tf-buyback-modal-open");
      resetZoom();
      start();
    };
    const openModal = (slideIndex) => {
      index = slideIndex;
      modalOpen = true;
      stop();
      modalImage.src = new URL(items[index].imageUrl, document.baseURI).href;
      modalImage.alt = items[index].alt;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("tf-buyback-modal-open");
      modal.querySelector("[data-buyback-close]")?.focus();
    };
    slides.forEach((slide, slideIndex) =>
      slide.querySelector("[data-buyback-open]")?.addEventListener("click", () => openModal(slideIndex))
    );
    modal.querySelector("[data-buyback-close]")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modalOpen) closeModal();
    });
    modalImage.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 2) return;
      pinchDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
    }, { passive: true });
    modalImage.addEventListener("touchmove", (event) => {
      if (event.touches.length !== 2 || !pinchDistance) return;
      const nextDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      scale = Math.min(4, Math.max(1, scale * (nextDistance / pinchDistance)));
      pinchDistance = nextDistance;
      modalImage.style.transform = `scale(${scale})`;
    }, { passive: true });
    modalImage.addEventListener("touchend", () => { pinchDistance = 0; }, { passive: true });
    document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
    show(0, false);
  };

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const response = await fetch("./data/site-content.json", {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const content = await response.json();
      const images = normalizeImages(content?.buybackTable);
      initCarousel(images);
      setStatus("");
    } catch {
      initCarousel([FALLBACK]);
      setStatus("最新の買取表を読み込めませんでした。時間をおいて再度お試しください。");
    }
  });
})();
