document.addEventListener("DOMContentLoaded", () => {
  // Mobile Navigation Logic
  const navToggle = document.querySelector(".nav-toggle");
  const navClose = document.querySelector(".nav-close"); // New close button
  const navOverlay = document.getElementById("mobile-menu-overlay");
  const navLinks = document.querySelectorAll(".nav-bar__link");

  function closeMenu() {
    if (navOverlay) {
      const closeBtn = document.querySelector(".nav-close");
      if (closeBtn) closeBtn.classList.add("cutting"); // Start animation

      setTimeout(() => {
        navOverlay.classList.remove("open");
        document.body.classList.remove("no-scroll");
        if (closeBtn) closeBtn.classList.remove("cutting"); // Reset for next time
      }, 300); // Wait for scissor cut
    }
  }

  function openMenu() {
    if (navOverlay) {
      navOverlay.classList.add("open");
      document.body.classList.add("no-scroll");
    }
  }

  if (navToggle) {
    navToggle.addEventListener("click", openMenu);
  }

  if (navClose) {
    navClose.addEventListener("click", closeMenu);
  }

  // Close menu when link is clicked
  navLinks.forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
      }
    });
  }, observerOptions);

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

  // Scroll to Top Logic
  const scrollTopBtn = document.getElementById("scroll-top");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 500) {
      scrollTopBtn.classList.add("visible");
    } else {
      scrollTopBtn.classList.remove("visible");
    }
  });

  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
});
