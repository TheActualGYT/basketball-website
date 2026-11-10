// Smooth scroll for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Simple animation on team cards
document.querySelectorAll('.team-card').forEach(card => {
  card.addEventListener('click', () => {
    card.style.transform = 'scale(1.05)';
    setTimeout(() => {
      card.style.transform = '';
    }, 200);
  });
});

console.log('Hoops Central loaded! Let\'s ball.');

const loginBtn = document.getElementById("login-btn");
const loginNote = document.getElementById("login-note");
if (loginBtn) {
  const saved = localStorage.getItem("jba-discord");
  if (saved) {
    try {
      const user = JSON.parse(saved);
      loginBtn.textContent = user.name || user.username || "Discord connected";
    } catch (err) {
      localStorage.removeItem("jba-discord");
    }
  }

  function applyDiscordUser(user) {
    if (!user || user.needsJoin) return;
    localStorage.setItem("jba-discord", JSON.stringify(user));
    loginBtn.textContent = user.name || user.username || "Discord connected";
    if (loginNote) loginNote.hidden = true;
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== location.origin) return;
    if (!event.data || event.data.type !== "jba-discord") return;
    applyDiscordUser(event.data.user);
  });

  window.addEventListener("storage", function (event) {
    if (event.key !== "jba-discord" || !event.newValue) return;
    try {
      applyDiscordUser(JSON.parse(event.newValue));
    } catch (err) {}
  });

  loginBtn.addEventListener("click", function () {
    const cfg = window.JBA_DISCORD || {};
    if (!cfg.clientId) {
      if (loginNote) {
        loginNote.hidden = false;
        loginNote.textContent = "Discord login needs the league's Discord app connected before it can sign anyone in.";
      }
      return;
    }
    const redirect = cfg.redirectUri || (location.origin + "/callback.html");
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify guilds");
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("prompt", "consent");
    const width = 480;
    const height = 760;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    const popup = window.open(
      url.toString(),
      "jba-discord-login",
      "popup=yes,width=" + width + ",height=" + height + ",left=" + left + ",top=" + top
    );
    if (!popup) {
      location.href = url.toString();
      return;
    }
    const watch = setInterval(function () {
      const saved = localStorage.getItem("jba-discord");
      if (saved) {
        try { applyDiscordUser(JSON.parse(saved)); } catch (err) {}
        clearInterval(watch);
        return;
      }
      if (popup.closed) clearInterval(watch);
    }, 400);
  });
}

function readDiscordUser() {
  try {
    return JSON.parse(localStorage.getItem("jba-discord") || "null");
  } catch (err) {
    return null;
  }
}

function showNavUser() {
  const el = document.getElementById("nav-user");
  if (!el) return;
  const user = readDiscordUser();
  const label = user && (user.username || user.name);
  if (!label) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = label;
}

showNavUser();
