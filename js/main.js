const burger = document.getElementById("navBurger");
const mobileNav = document.getElementById("navMobile");

burger.addEventListener("click", () => {
  mobileNav.classList.toggle("is-open");
});

mobileNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => mobileNav.classList.remove("is-open"));
});

// Hero scroll animation: --hp is scrubbed by scroll position (0 at top, 1 when
// the hero has mostly scrolled away), so the hero only moves while scrolling.
const hero = document.getElementById("hero");
let heroTicking = false;

function updateHero() {
  heroTicking = false;
  const range = hero.offsetHeight * 0.6;
  const p = Math.min(Math.max(window.scrollY / range, 0), 1);
  hero.style.setProperty("--hp", p.toFixed(4));
}

window.addEventListener("scroll", () => {
  if (!heroTicking) {
    heroTicking = true;
    requestAnimationFrame(updateHero);
  }
}, { passive: true });
updateHero();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Logo marquee: clone the set once so the track can loop seamlessly at -50%.
const logoTrack = document.querySelector(".logos__track");
const logoSet = logoTrack.querySelector(".logos__set");
const logoClone = logoSet.cloneNode(true);
logoClone.setAttribute("aria-hidden", "true");
logoClone.querySelectorAll("img").forEach((img) => (img.alt = ""));
logoTrack.appendChild(logoClone);

// Halftone dot field behind the hero: dot size follows slow drifting waves,
// and dots swell around the cursor.
const dotsCanvas = document.getElementById("heroDots");
const dotsCtx = dotsCanvas.getContext("2d");
const DOT_GAP = 16;
const pointer = { x: -9999, y: -9999 };
let dotsW = 0;
let dotsH = 0;
let dotsVisible = true;

function resizeDots() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  dotsW = dotsCanvas.clientWidth;
  dotsH = dotsCanvas.clientHeight;
  dotsCanvas.width = dotsW * dpr;
  dotsCanvas.height = dotsH * dpr;
  dotsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawDots(t) {
  dotsCtx.clearRect(0, 0, dotsW, dotsH);
  const cx = dotsW / 2;
  const cy = dotsH * 0.32;
  for (let y = DOT_GAP / 2; y < dotsH; y += DOT_GAP) {
    for (let x = DOT_GAP / 2; x < dotsW; x += DOT_GAP) {
      const wave =
        Math.sin(x * 0.012 + t * 0.6) * Math.cos(y * 0.016 - t * 0.4) +
        Math.sin((x + y) * 0.006 + t * 0.3);
      // keep the area behind the headline quiet
      const dx = (x - cx) / (dotsW * 0.32);
      const dy = (y - cy) / (dotsH * 0.38);
      const calm = Math.min(Math.sqrt(dx * dx + dy * dy), 1);
      const pd = Math.hypot(x - pointer.x, y - pointer.y);
      const swell = Math.max(0, 1 - pd / 140);

      const v = Math.max(0, (wave + 2) / 4) * calm + swell * 0.9;
      const r = 0.6 + v * 2.6;
      // blue on the left fading to pink on the right, like the wash
      const mix = x / dotsW;
      const red = Math.round(91 + (255 - 91) * mix);
      const green = Math.round(94 + (92 - 94) * mix);
      const blue = Math.round(244 + (147 - 244) * mix);
      dotsCtx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${0.12 + v * 0.45})`;
      dotsCtx.beginPath();
      dotsCtx.arc(x, y, r, 0, Math.PI * 2);
      dotsCtx.fill();
    }
  }
}

function dotsLoop(now) {
  if (dotsVisible) drawDots(now / 1000);
  requestAnimationFrame(dotsLoop);
}

resizeDots();
window.addEventListener("resize", resizeDots);
hero.addEventListener("pointermove", (e) => {
  const rect = dotsCanvas.getBoundingClientRect();
  pointer.x = e.clientX - rect.left;
  pointer.y = e.clientY - rect.top;
});
hero.addEventListener("pointerleave", () => {
  pointer.x = pointer.y = -9999;
});
new IntersectionObserver(([entry]) => (dotsVisible = entry.isIntersecting)).observe(hero);
if (reduceMotion) drawDots(0);
else requestAnimationFrame(dotsLoop);

// Odometer: each digit is a vertical reel of 0-9 that rolls to its value.
const counter = document.getElementById("eventsCounter");

function buildOdometer(el, text) {
  el.textContent = "";
  const label = document.createElement("span");
  label.className = "sr-only";
  label.textContent = text;
  el.appendChild(label);
  [...text].forEach((ch, i) => {
    const slot = document.createElement("span");
    slot.className = "odometer__digit";
    slot.setAttribute("aria-hidden", "true");
    if (/\d/.test(ch)) {
      const reel = document.createElement("span");
      reel.className = "odometer__reel";
      reel.style.setProperty("--delay", `${i * 0.12}s`);
      reel.innerHTML = "0123456789".split("").map((d) => `<span>${d}</span>`).join("");
      slot.appendChild(reel);
    } else {
      slot.textContent = ch;
    }
    el.appendChild(slot);
  });
}

function setOdometer(el, text) {
  el.querySelector(".sr-only").textContent = text;
  const reels = el.querySelectorAll(".odometer__reel");
  [...text.replace(/\D/g, "")].forEach((d, i) => reels[i]?.style.setProperty("--n", d));
}

buildOdometer(counter, counter.dataset.value);
if (!reduceMotion) {
  // roll up from 0 on load, then drift like a live metric
  setTimeout(() => setOdometer(counter, counter.dataset.value), 300);
  setInterval(() => {
    const live = (1.1 + Math.random() * 0.3).toFixed(1);
    setOdometer(counter, live);
  }, 3500);
} else {
  setOdometer(counter, counter.dataset.value);
}

// Word-by-word reveal + squiggle draw, scrubbed by scroll.
const wordTargets = [...document.querySelectorAll("[data-word-reveal]")].map((el) => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
      } else {
        const span = document.createElement("span");
        span.className = "word";
        span.textContent = part;
        frag.appendChild(span);
      }
    });
    node.replaceWith(frag);
  });
  return { el, words: [...el.querySelectorAll(".word")], squiggle: el.querySelector(".squiggle") };
});

function updateWordReveal() {
  const vh = window.innerHeight;
  wordTargets.forEach(({ el, words, squiggle }) => {
    const top = el.getBoundingClientRect().top;
    // 0 when the heading enters at 90% of the viewport, 1 by the time it reaches 45%
    const p = reduceMotion ? 1 : Math.min(Math.max((vh * 0.9 - top) / (vh * 0.45), 0), 1);
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
    if (squiggle) squiggle.style.setProperty("--draw", Math.max(0, (p - 0.75) / 0.25).toFixed(3));
  });
}

window.addEventListener("scroll", () => requestAnimationFrame(updateWordReveal), { passive: true });
updateWordReveal();

// Blur-up entrance for cards and blocks, staggered within each group.
if (!reduceMotion) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  [".feature-card", ".stat", ".price-card", ".product__visual", ".product__text", ".pricing .section-title", ".cta__inner"].forEach(
    (selector) => {
      document.querySelectorAll(selector).forEach((el, i) => {
        el.classList.add("reveal");
        el.style.setProperty("--reveal-delay", `${i * 0.1}s`);
        revealObserver.observe(el);
      });
    }
  );
}

// Product checklist: auto-advances every 5s (progress line in CSS),
// and reshuffles the chart bars to match the selected item.
const checklist = document.getElementById("productChecklist");
const checkItems = [...checklist.querySelectorAll("li")];
const chartBars = [...document.querySelectorAll(".product .mock__bars div")];
const barSets = [
  [40, 65, 30, 80, 50, 90],
  [85, 35, 70, 25, 60, 45],
  [30, 50, 90, 60, 75, 40],
];
let checkIndex = 0;

function activateCheck(i) {
  checkIndex = i;
  checkItems.forEach((li, j) => {
    li.classList.remove("is-active");
    if (j === i) {
      void li.offsetWidth; // restart the progress animation
      li.classList.add("is-active");
    }
  });
  chartBars.forEach((bar, j) => (bar.style.height = `${barSets[i][j]}%`));
}

checkItems.forEach((li, i) => {
  li.addEventListener("click", () => activateCheck(i));
  li.addEventListener("animationend", () => activateCheck((checkIndex + 1) % checkItems.length));
});
activateCheck(0);

// Pricing: annual/monthly toggle swaps prices and the "Save" pill.
const billingToggle = document.getElementById("billingToggle");

function updateBilling() {
  const period = billingToggle.checked ? "yearly" : "monthly";
  document.querySelectorAll(".pricing [data-monthly]").forEach((el) => {
    el.textContent = el.dataset[period];
  });
  document.querySelectorAll(".pricing [data-yearly-only]").forEach((el) => {
    el.hidden = period !== "yearly";
  });
}

billingToggle.addEventListener("change", updateBilling);
updateBilling();
