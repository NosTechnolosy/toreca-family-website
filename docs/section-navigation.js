(() => {
  let observer;
  let stopTimer;
  let correctionTimers = [];
  let scrollFrame;

  const targetFromHash = () => {
    if (!location.hash || location.hash === "#") return null;
    try {
      return document.getElementById(decodeURIComponent(location.hash.slice(1)));
    } catch {
      return null;
    }
  };

  const scrollToSection = () => {
    const target = targetFromHash();
    if (!target || target.getBoundingClientRect().height === 0) return false;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    });
    return true;
  };

  const followHash = () => {
    observer?.disconnect();
    clearTimeout(stopTimer);
    correctionTimers.forEach(clearTimeout);
    correctionTimers = [];
    scrollToSection();

    observer = new MutationObserver(() => {
      scrollToSection();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    correctionTimers = [100, 300, 700, 1200, 1800].map((delay) =>
      setTimeout(scrollToSection, delay)
    );
    stopTimer = setTimeout(() => observer.disconnect(), 2000);
  };

  document.addEventListener("DOMContentLoaded", followHash);
  window.addEventListener("load", followHash);
  window.addEventListener("hashchange", followHash);
})();
