(function () {
  "use strict";

  var previousWidth = window.innerWidth;
  var resizeTimer = null;

  function closeMobileNavigation() {
    document.querySelectorAll(".tf-nav-open").forEach(function (nav) {
      nav.classList.remove("tf-nav-open");
    });
  }

  function syncViewport() {
    var currentWidth = window.innerWidth;
    if (Math.abs(currentWidth - previousWidth) >= 80) {
      closeMobileNavigation();
    }
    previousWidth = currentWidth;
  }

  function scheduleSync() {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(syncViewport, 120);
  }

  window.addEventListener("resize", scheduleSync, { passive: true });
  window.addEventListener("orientationchange", function () {
    closeMobileNavigation();
    scheduleSync();
  }, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleSync, { passive: true });
  }
}());
