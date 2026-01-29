document.addEventListener("DOMContentLoaded", () => {
  // Mobile Navigation Logic
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-bar__menu");
  const navLinks = document.querySelectorAll(".nav-bar__link");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("open");
      const icon = navToggle.querySelector("i");
      if (navMenu.classList.contains("open")) {
        icon.classList.replace("ph-list", "ph-x");
      } else {
        icon.classList.replace("ph-x", "ph-list");
      }
    });

    // Close menu when link is clicked
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("open");
        const icon = navToggle.querySelector("i");
        icon.classList.replace("ph-x", "ph-list");
      });
    });
  }

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
