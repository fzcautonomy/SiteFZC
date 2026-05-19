const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const cursorLight = document.querySelector(".cursor-light");
const canvas = document.querySelector("#networkCanvas");
const ctx = canvas.getContext("2d");
const scrollProgressEl = document.querySelector(".scroll-progress");
const consoleLines = document.querySelectorAll("[data-console-line]");
const sections = document.querySelectorAll("section[id]");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let points = [];
let animationFrame;
let pointerThrottle = 0;

// ── Header scroll state ──
function setHeaderState() {
  header.classList.toggle("scrolled", window.scrollY > 18);
}

// ── Mobile nav ──
function closeNav() {
  document.body.classList.remove("nav-open");
  navToggle.setAttribute("aria-expanded", "false");
}

navToggle.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) closeNav();
});

window.addEventListener("scroll", setHeaderState, { passive: true });
setHeaderState();

// ── Scroll progress bar ──
function updateScrollProgress() {
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? window.scrollY / docHeight : 0;
  scrollProgressEl.style.transform = `scaleX(${progress})`;
}

window.addEventListener("scroll", updateScrollProgress, { passive: true });
updateScrollProgress();

// ── Active nav section highlight ──
function updateActiveNav() {
  const scrollMid = window.scrollY + window.innerHeight * 0.38;
  sections.forEach((section) => {
    const link = document.querySelector(`.site-nav a[href="#${section.id}"]`);
    if (!link) return;
    const active = scrollMid >= section.offsetTop && scrollMid < section.offsetTop + section.offsetHeight;
    link.classList.toggle("active", active);
  });
}

window.addEventListener("scroll", updateActiveNav, { passive: true });
updateActiveNav();

// ── Cursor light + magnetic buttons (throttled at ~60 fps) ──
if (!prefersReducedMotion) {
  window.addEventListener("pointermove", (event) => {
    const now = Date.now();
    if (now - pointerThrottle < 16) return;
    pointerThrottle = now;
    cursorLight.style.opacity = "1";
    cursorLight.style.left = `${event.clientX}px`;
    cursorLight.style.top = `${event.clientY}px`;
  }, { passive: true });

  document.querySelectorAll(".magnetic").forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate(${x * 0.08}px, ${y * 0.12}px) translateY(-3px)`;
    });

    button.addEventListener("pointerleave", () => {
      button.style.transform = "";
    });
  });
}

// ── Reveal on scroll ──
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// ── Number counter animation ──
function animateCounter(el, target, duration = 1400) {
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
    el.textContent = Math.round(eased * target);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target, parseInt(entry.target.dataset.counter, 10));
        counterObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.6 }
);

document.querySelectorAll("[data-counter]").forEach((el) => counterObserver.observe(el));

// ── Console live cycling ──
if (consoleLines.length > 0 && !prefersReducedMotion) {
  let activeIndex = 0;
  setInterval(() => {
    consoleLines[activeIndex].classList.remove("active");
    activeIndex = (activeIndex + 1) % consoleLines.length;
    consoleLines[activeIndex].classList.add("active");
  }, 1800);
}

// ── Canvas network animation ──
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const isMobile = w < 760;
  const count = isMobile
    ? Math.round(Math.min(30, Math.max(16, w / 28)))
    : Math.round(Math.min(90, Math.max(38, w / 22)));

  points = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.34,
    vy: (Math.random() - 0.5) * 0.34,
    size: Math.random() * 1.7 + 0.6,
  }));
}

function drawNetwork() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const maxDist = 130;
  const maxDistSq = maxDist * maxDist;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(78, 231, 255, 0.72)";
  ctx.strokeStyle = "rgba(78, 231, 255, 0.14)";
  ctx.lineWidth = 1;

  for (const p of points) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const distSq = dx * dx + dy * dy;
      if (distSq < maxDistSq) {
        ctx.globalAlpha = 1 - Math.sqrt(distSq) / maxDist;
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
  animationFrame = requestAnimationFrame(drawNetwork);
}

if (!prefersReducedMotion) {
  resizeCanvas();
  drawNetwork();

  let resizeTimer;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(animationFrame);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeCanvas();
      drawNetwork();
    }, 150);
  });
} else {
  canvas.remove();
  cursorLight.remove();
}
