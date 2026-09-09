// ============================================================================
// Possiber Landing Page — Main Entry Point
// ============================================================================

// ---------------------------------------------------------------------------
// Billing Toggle (index.html only)
// ---------------------------------------------------------------------------
function initBillingToggle() {
  const sw = document.getElementById("billingSwitch");
  const segM = document.querySelector(".seg-monthly");
  const segY = document.querySelector(".seg-yearly");
  const ctaPro = document.getElementById("cta-pro");
  if (!sw) return;

  sw.addEventListener("click", () => {
    const yearly = document.body.classList.toggle("yearly");
    sw.setAttribute("aria-checked", yearly ? "true" : "false");
    segM.classList.toggle("active", !yearly);
    segY.classList.toggle("active", yearly);
    if (ctaPro) {
      ctaPro.setAttribute(
        "href",
        yearly ? "checkout.html?plan=annual" : "checkout.html?monthly"
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Supabase Auth (index.html only)
// ---------------------------------------------------------------------------
function initSupabaseAuth() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  if (typeof window.supabase === "undefined") return;

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const CHECKOUT_URL = "checkout.html";

  async function getSession() {
    const result = await supabase.auth.getSession();
    return result.data.session;
  }

  async function signInWithGoogle() {
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (result.error) console.error("Auth error:", result.error);
  }

  async function openCheckout(plan) {
    const session = await getSession();
    if (!session) {
      await signInWithGoogle();
      return;
    }
    const uid = session.user.id;
    const email = session.user.email || "";
    const url = new URL(CHECKOUT_URL, window.location.origin);
    url.searchParams.set("plan", plan);
    url.searchParams.set("uid", uid);
    url.searchParams.set("email", email);
    window.open(url.toString(), "_blank");
  }

  function wireButtons() {
    const ctaPro = document.getElementById("cta-pro");
    if (ctaPro) {
      ctaPro.addEventListener("click", (e) => {
        e.preventDefault();
        const plan = ctaPro.getAttribute("href").includes("annual") ? "annual" : "monthly";
        openCheckout(plan);
      });
    }
    const ctaLifetime = document.querySelector('a[href="checkout.html?plan=lifetime"]');
    if (ctaLifetime) {
      ctaLifetime.addEventListener("click", (e) => {
        e.preventDefault();
        openCheckout("lifetime");
      });
    }
    const navSignin = document.getElementById("nav-signin");
    if (navSignin) {
      navSignin.addEventListener("click", (e) => {
        e.preventDefault();
        signInWithGoogle();
      });
    }
  }

  async function handleCallback() {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  handleCallback().then(wireButtons);
}

// ---------------------------------------------------------------------------
// Paddle Checkout (checkout.html only)
// ---------------------------------------------------------------------------
function initPaddleCheckout() {
  const PADDLE_ENV = import.meta.env.VITE_PADDLE_ENV || "production";
  const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;

  if (!PADDLE_CLIENT_TOKEN) return;

  const PLANS = {
    monthly:  import.meta.env.VITE_PADDLE_PRICE_MONTHLY,
    annual:   import.meta.env.VITE_PADDLE_PRICE_ANNUAL,
    lifetime: import.meta.env.VITE_PADDLE_PRICE_LIFETIME,
  };

  const PLAN_LABELS = {
    monthly:  "Possiber Pro (monthly)",
    annual:   "Possiber Pro (annual)",
    lifetime: "Possiber Pro (lifetime)",
  };

  function show(stateId) {
    for (const id of ["state-loading", "state-closed", "state-success", "state-error"]) {
      document.getElementById(id).classList.toggle("hidden", id !== stateId);
    }
  }

  function fail(msg) {
    document.getElementById("error-message").textContent = msg;
    show("state-error");
  }

  const qs = new URLSearchParams(location.search);
  const plan = (qs.get("plan") || "").toLowerCase();
  const uid = qs.get("uid") || "";
  const email = qs.get("email") || "";
  const priceId = qs.get("price_id") || PLANS[plan];

  document.getElementById("plan-label").textContent = PLAN_LABELS[plan] || "Possiber Pro";

  function openCheckout() {
    const items = [{ priceId: priceId, quantity: 1 }];
    const customData = {};
    if (uid) customData.supabase_user_id = uid;
    if (email) customData.email = email;

    Paddle.Checkout.open({
      items: items,
      customer: email ? { email: email } : undefined,
      customData: customData,
      settings: {
        displayMode: "overlay",
        theme: "dark",
        allowLogout: !email,
      },
    });
  }

  document.getElementById("reopen-btn").addEventListener("click", openCheckout);

  // Boot
  if (!plan && !qs.get("price_id")) {
    return fail("No plan was selected. Please return and pick a plan.");
  }
  if (!priceId) {
    return fail('Unknown plan "' + plan + '". Please return and try again.');
  }
  if (PADDLE_CLIENT_TOKEN.startsWith("PASTE_")) {
    return fail("This checkout isn't fully configured yet. Add your Paddle token to .env.");
  }
  if (typeof Paddle === "undefined") {
    return fail("The payment library failed to load. Please check your connection and refresh.");
  }

  try {
    if (PADDLE_ENV === "sandbox") {
      Paddle.Environment.set("sandbox");
    }
    Paddle.Initialize({
      token: PADDLE_CLIENT_TOKEN,
      eventCallback: (evt) => {
        switch (evt && evt.name) {
          case "checkout.completed":
            show("state-success");
            break;
          case "checkout.closed":
            if (document.getElementById("state-success").classList.contains("hidden")) {
              show("state-closed");
            }
            break;
          case "checkout.error":
            fail("The payment couldn't be completed. No charge was made. Please try again.");
            break;
        }
      },
    });
    openCheckout();
  } catch (e) {
    fail("Couldn't start the checkout: " + (e && e.message ? e.message : e));
  }
}

// ---------------------------------------------------------------------------
// Reveal Animations — fade-up on scroll for [data-reveal] elements
// ---------------------------------------------------------------------------
function initRevealAnimations() {
  const els = document.querySelectorAll("[data-reveal]");
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-in");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 }
  );

  els.forEach((el) => observer.observe(el));
}

// ---------------------------------------------------------------------------
// Section Tracking — highlights active nav link based on scroll position
// ---------------------------------------------------------------------------
function initSectionTracking() {
  const sections = document.querySelectorAll("section[id], header[id]");
  const navLinks = document.querySelectorAll(".nav-link[data-section]");
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach((link) => {
            link.classList.toggle("active", link.dataset.section === id);
          });
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );

  sections.forEach((section) => observer.observe(section));
}

// ---------------------------------------------------------------------------
// Page Transitions — fade out → scroll → instant appear
// ---------------------------------------------------------------------------
function initPageTransitions() {
  const overlay = document.getElementById("page-overlay");
  const navLinks = document.querySelectorAll("[data-section]");
  if (!overlay || !navLinks.length) return;

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.dataset.section;
      const target = document.getElementById(targetId);
      if (!target) return;

      // Fade in overlay
      overlay.classList.add("active");

      // After fade completes, scroll and remove overlay
      setTimeout(() => {
        target.scrollIntoView({ behavior: "instant" });
        overlay.classList.remove("active");
      }, 300);
    });
  });
}

// ---------------------------------------------------------------------------
// Router: detect page and init
// ---------------------------------------------------------------------------
const page = document.documentElement.dataset.page;

if (page === "index") {
  initBillingToggle();
  initSupabaseAuth();
  initSectionTracking();
  initRevealAnimations();
  initPageTransitions();
} else if (page === "checkout") {
  initPaddleCheckout();
}
