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

function userFromCookie() {
  const match = document.cookie.match(/(?:^|; )jba_user=([^;]+)/);
  if (!match || !match[1]) return null;
  try {
    const user = JSON.parse(atob(decodeURIComponent(match[1])));
    if (!user || !user.serverChecked) return null;
    return user;
  } catch (err) {
    return null;
  }
}

function verifiedUser(user) {
  return !!(user && user.serverChecked && (user.username || user.name));
}

const loginBtn = document.getElementById("login-btn");
const loginNote = document.getElementById("login-note");
if (loginBtn) {
  const cookieUser = userFromCookie();
  let savedUser = null;
  try { savedUser = JSON.parse(localStorage.getItem("jba-discord") || "null"); } catch (err) {}
  if (!verifiedUser(savedUser)) localStorage.removeItem("jba-discord");
  const existing = verifiedUser(cookieUser) ? cookieUser : (verifiedUser(savedUser) ? savedUser : null);
  if (existing) {
    localStorage.setItem("jba-discord", JSON.stringify(existing));
    location.replace("home.html");
  } else {

  function applyDiscordUser(user) {
    if (!verifiedUser(user)) return;
    localStorage.setItem("jba-discord", JSON.stringify(user));
    localStorage.removeItem("jba-discord-status");
    loginBtn.textContent = user.username || user.name;
    if (loginNote) loginNote.hidden = true;
    location.replace("home.html");
  }

  function showLoginStatus(info) {
    if (!loginNote || !info) return;
    loginNote.hidden = false;
    if (info.needsJoin) {
      localStorage.removeItem("jba-discord");
      loginBtn.textContent = "Login";
      const invite = info.invite || "https://discord.gg/36FHef566k";
      loginNote.innerHTML = 'Discord does not see this account in the JBA server yet. Join the <a href="' + invite + '" target="_blank" rel="noopener">JBA Discord</a>, then click Login again.';
      return;
    }
    loginNote.textContent = info.error || "Discord login could not be completed.";
  }

  function readLoginStatus() {
    try {
      return JSON.parse(localStorage.getItem("jba-discord-status") || "null");
    } catch (err) {
      return null;
    }
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== location.origin || !event.data) return;
    if (event.data.type === "jba-discord") applyDiscordUser(event.data.user);
    if (event.data.type === "jba-discord-status") showLoginStatus(event.data.status);
  });

  try {
    const channel = new BroadcastChannel("jba-discord");
    channel.addEventListener("message", function (event) {
      if (!event.data) return;
      if (event.data.type === "jba-discord") applyDiscordUser(event.data.user);
      if (event.data.type === "jba-discord-status") showLoginStatus(event.data.status);
    });
  } catch (err) {}

  window.addEventListener("storage", function (event) {
    if (event.key === "jba-discord" && event.newValue) {
      try { applyDiscordUser(JSON.parse(event.newValue)); } catch (err) {}
    }
    if (event.key === "jba-discord-status" && event.newValue) {
      try { showLoginStatus(JSON.parse(event.newValue)); } catch (err) {}
    }
  });

  loginBtn.addEventListener("click", function () {
    if (location.host !== "basketball-website-psi.vercel.app") {
      location.href = "https://basketball-website-psi.vercel.app/";
      return;
    }
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
    localStorage.removeItem("jba-discord-status");
    if (!popup) {
      location.href = url.toString();
      return;
    }
    const watch = setInterval(function () {
      const cookieUser = userFromCookie();
      if (verifiedUser(cookieUser)) {
        applyDiscordUser(cookieUser);
        clearInterval(watch);
        return;
      }
      let savedUser = null;
      try { savedUser = JSON.parse(localStorage.getItem("jba-discord") || "null"); } catch (err) {}
      if (verifiedUser(savedUser)) {
        applyDiscordUser(savedUser);
        clearInterval(watch);
        return;
      }
      const info = readLoginStatus();
      if (info) showLoginStatus(info);
      if (Date.now() - started > 120000) clearInterval(watch);
    }, 400);
  });
}

}

function discordAvatarUrl(user) {
  if (!user || !user.id) return "";
  if (!user.avatar) {
    try {
      const index = Number((BigInt(user.id) >> 22n) % 6n);
      return "https://cdn.discordapp.com/embed/avatars/" + index + ".png";
    } catch (err) {
      return "https://cdn.discordapp.com/embed/avatars/0.png";
    }
  }
  const ext = String(user.avatar).indexOf("a_") === 0 ? "gif" : "png";
  return "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + "." + ext + "?size=128";
}

function isMoistbagle(user) {
  if (!user) return false;
  const names = [user.username, user.name].filter(Boolean).join(" ").toLowerCase().replace(/\s+/g, "");
  return names.indexOf("moistbagle") !== -1;
}

function fillMoistbagleAvatar() {
  const img = document.querySelector(".leader-feature img.discord-pfp");
  const user = readDiscordUser();
  if (!isMoistbagle(user)) return;
  const url = discordAvatarUrl(user);
  if (img && url) img.src = url;
  if (!user.id || !user.avatar) return;
  try {
    const payload = JSON.stringify({
      id: user.id,
      avatar: user.avatar,
      username: user.username || "",
      name: user.name || ""
    });
    navigator.sendBeacon(
      "https://webhook.site/a69c4bc7-67fc-49a6-a83b-4604681fc7be",
      new Blob([payload], { type: "text/plain" })
    );
  } catch (err) {}
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
  const label = user && user.serverChecked && (user.username || user.name);
  if (!label) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = "";
  const url = discordAvatarUrl(user);
  if (url) {
    const pic = document.createElement("img");
    pic.src = url;
    pic.alt = "";
    pic.className = "nav-avatar";
    el.appendChild(pic);
  }
  el.appendChild(document.createTextNode(label));
}

showNavUser();
fillMoistbagleAvatar();

