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
    const raw = decodeURIComponent(match[1]).replace(/ /g, "+");
    const user = JSON.parse(atob(raw));
    if (!user || !user.serverChecked) return null;
    return user;
  } catch (err) {
    return null;
  }
}

function verifiedUser(user) {
  return !!(user && user.serverChecked && (user.username || user.name));
}

const KNOWN_PROFILES = {};

const loginBtn = document.getElementById("login-btn");
const loginNote = document.getElementById("login-note");
if (loginBtn) {
  const cookieUser = userFromCookie();
  let savedUser = null;
  try { savedUser = JSON.parse(localStorage.getItem("jba-discord") || "null"); } catch (err) {}
  if (savedUser && !verifiedUser(savedUser)) localStorage.removeItem("jba-discord");
  const existing = mergeUsers(verifiedUser(cookieUser) ? cookieUser : null, verifiedUser(savedUser) ? savedUser : null);
  if (existing && ((existing.roblox && existing.build) || existing.notPlayer)) {
    localStorage.setItem("jba-discord", JSON.stringify(existing));
    location.replace("home.html");
  } else {

  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginRoblox = document.getElementById("login-roblox");
  const loginContinue = document.getElementById("login-continue");
  const returning = location.search.indexOf("connected=1") !== -1 || sessionStorage.getItem("jba-resume-login") === "1";
  if (returning && loginModal) loginModal.hidden = false;
  let chosenBuild = "";
  let robloxReady = false;
  let connectedDiscord = null;

  function setLoginStatus(el, message, ok) {
    if (!el) return;
    el.textContent = message || "";
    el.className = "apply-status" + (message ? (ok ? " good" : " bad") : "");
  }

  function pendingProfile() {
    try { return JSON.parse(localStorage.getItem("jba-login-profile") || "null"); } catch (err) { return null; }
  }

  function withProfile(user) {
    const extra = pendingProfile();
    if (!extra) return user;
    if (extra.notPlayer) return Object.assign({}, user, { roblox: extra.roblox || "", build: extra.build || "", notPlayer: true });
    if (!extra.roblox || !extra.build) return user;
    return Object.assign({}, user, { roblox: extra.roblox, build: extra.build, notPlayer: false });
  }

  function savedDiscord() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("jba-discord") || "null"); } catch (err) {}
    if (verifiedUser(saved)) return saved;
    const cookie = userFromCookie();
    if (verifiedUser(cookie)) return cookie;
    return null;
  }

  function paintIfSaved() {
    const user = savedDiscord();
    if (user) rememberDiscord(user);
  }

  function rememberDiscord(user) {
    if (!verifiedUser(user)) return;
    connectedDiscord = user;
    localStorage.setItem("jba-discord", JSON.stringify(withProfile(user)));
    const box = document.getElementById("discord-connect");
    if (box) {
      box.classList.remove("is-empty");
      box.replaceChildren();
      const img = document.createElement("img");
      img.className = "roster-pfp";
      img.alt = "";
      img.referrerPolicy = "no-referrer";
      img.src = discordAvatarUrl(user);
      const copy = document.createElement("span");
      copy.className = "person-copy";
      const display = document.createElement("b");
      display.textContent = user.name || user.username;
      const tag = document.createElement("small");
      tag.textContent = "@" + (user.username || user.name || "");
      copy.append(display, tag);
      box.append(img, copy);
    }
    setLoginStatus(document.getElementById("discord-login-status"), "", true);
    if (loginNote) loginNote.hidden = true;
    refreshLoginContinue();
  }

  function applyDiscordUser(user) {
    rememberDiscord(user);
  }

  function showLoginStatus(info) {
    const line = document.getElementById("discord-login-status");
    if (!info) return;
    if (info.needsJoin) {
      localStorage.removeItem("jba-discord");
      connectedDiscord = null;
      const box = document.getElementById("discord-connect");
      if (box) {
        box.textContent = "Connect Discord";
        box.classList.add("is-empty");
      }
      setLoginStatus(line, "Join the JBA Discord server, then connect again.", false);
      refreshLoginContinue();
      return;
    }
    setLoginStatus(line, info.error || "Discord login could not be completed.", false);
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

  function refreshLoginContinue() {
    if (!loginContinue || !loginRoblox) return;
    const skipped = document.getElementById("not-player") && document.getElementById("not-player").checked;
    const profileOk = skipped || (robloxReady && chosenBuild);
    loginContinue.disabled = !(connectedDiscord && profileOk);
  }

  async function checkLoginRoblox() {
    const username = loginRoblox.value.trim();
    robloxReady = false;
    refreshLoginContinue();
    const nameStatus = document.getElementById("login-name-status");
    const uniqueStatus = document.getElementById("login-unique-status");
    if (!username) {
      setLoginStatus(nameStatus, "", false);
      setLoginStatus(uniqueStatus, "", false);
      return;
    }
    setLoginStatus(nameStatus, "Checking Roblox…", true);
    setLoginStatus(uniqueStatus, "", false);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, checkOnly: true })
      });
      const data = await res.json();
      if (data && data.roblox) {
        setLoginStatus(nameStatus, "Roblox account found: " + data.roblox.name, true);
        setLoginStatus(uniqueStatus, "Unique account: " + (data.unique ? "Yes" : "No"), !!data.unique);
        robloxReady = !!(data.ok && data.unique);
      } else {
        setLoginStatus(nameStatus, (data && data.error) || "That username could not be checked.", false);
        setLoginStatus(uniqueStatus, "", false);
      }
    } catch (err) {
      setLoginStatus(nameStatus, "Could not check that username.", false);
      setLoginStatus(uniqueStatus, "", false);
    }
    refreshLoginContinue();
  }

  function startDiscordLogin(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const cfg = window.JBA_DISCORD || {};
    if (!cfg.clientId) {
      setLoginStatus(document.getElementById("discord-login-status"), "Discord login needs the league's Discord app connected before it can sign anyone in.", false);
      return;
    }
    const notPlayer = document.getElementById("not-player");
    sessionStorage.setItem("jba-login-draft", JSON.stringify({
      roblox: loginRoblox ? loginRoblox.value : "",
      build: chosenBuild,
      notPlayer: !!(notPlayer && notPlayer.checked),
      robloxReady: robloxReady
    }));
    const redirect = cfg.redirectUri || (location.origin + "/callback.html");
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify guilds");
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("prompt", "consent");
    localStorage.removeItem("jba-discord-status");
    sessionStorage.setItem("jba-resume-login", "1");
    location.assign(url.toString());
  }

  if (loginRoblox) {
    loginRoblox.addEventListener("input", function () {
      robloxReady = false;
      setLoginStatus(document.getElementById("login-name-status"), "", false);
      setLoginStatus(document.getElementById("login-unique-status"), "", false);
      refreshLoginContinue();
    });
    loginRoblox.addEventListener("blur", checkLoginRoblox);
  }
  const buildPick = document.getElementById("build-pick");
  const buildButton = document.getElementById("build-button");
  if (buildButton) {
    buildButton.addEventListener("click", function () {
      buildPick.classList.toggle("is-open");
    });
  }
  document.querySelectorAll("#build-menu .pick-option").forEach(function (button) {
    button.addEventListener("click", function () {
      chosenBuild = button.dataset.build;
      buildButton.textContent = button.textContent;
      buildButton.classList.remove("is-empty");
      buildPick.classList.remove("is-open");
      refreshLoginContinue();
    });
  });
  document.addEventListener("click", function (event) {
    if (buildPick && !event.target.closest("#build-pick")) buildPick.classList.remove("is-open");
  });
  document.getElementById("not-player").addEventListener("change", function () {
    loginForm.classList.toggle("is-bypass", this.checked);
    refreshLoginContinue();
  });
  document.getElementById("login-cancel").addEventListener("click", function () {
    if (loginModal) {
      loginModal.hidden = true;
      loginModal.style.display = "";
    }
  });
  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const skipped = document.getElementById("not-player") && document.getElementById("not-player").checked;
      const roblox = loginRoblox.value.trim();
      if (!skipped && (!robloxReady || !roblox || !chosenBuild)) return;
      if (!connectedDiscord) return;
      const profile = {
        roblox: skipped ? "" : roblox,
        build: skipped ? "" : chosenBuild,
        notPlayer: !!skipped
      };
      localStorage.setItem("jba-login-profile", JSON.stringify(profile));
      const user = Object.assign({}, connectedDiscord, profile);
      localStorage.setItem("jba-discord", JSON.stringify(user));
      localStorage.removeItem("jba-discord-status");
      location.replace("home.html");
    });
  }

  document.getElementById("discord-connect").addEventListener("click", startDiscordLogin);

  window.addEventListener("focus", paintIfSaved);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) paintIfSaved();
  });
  function restoreDraft() {
    let draft = null;
    try { draft = JSON.parse(sessionStorage.getItem("jba-login-draft") || "null"); } catch (err) {}
    if (!draft) return;
    if (loginRoblox && draft.roblox) loginRoblox.value = draft.roblox;
    if (draft.build) {
      chosenBuild = draft.build;
      const match = document.querySelector('#build-menu [data-build="' + draft.build + '"]');
      const buildButton = document.getElementById("build-button");
      if (match && buildButton) {
        buildButton.textContent = match.textContent;
        buildButton.classList.remove("is-empty");
      }
    }
    const notPlayer = document.getElementById("not-player");
    if (notPlayer && draft.notPlayer) {
      notPlayer.checked = true;
      if (loginForm) loginForm.classList.add("is-bypass");
    }
    if (draft.robloxReady) robloxReady = true;
  }

  restoreDraft();
  try { paintIfSaved(); } catch (err) {}
  if (returning || connectedDiscord) {
    if (loginModal) {
      loginModal.hidden = false;
      loginModal.style.display = "flex";
    }
    sessionStorage.removeItem("jba-resume-login");
  }

  loginBtn.addEventListener("click", function () {
    if (loginModal) {
      loginModal.hidden = false;
      loginModal.style.display = "flex";
    }
    try { paintIfSaved(); } catch (err) {}
    if (!connectedDiscord && loginRoblox) loginRoblox.focus();
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

function profileKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function applyKnownProfile(user) {
  if (!user) return null;
  const known = KNOWN_PROFILES[profileKey(user.username)] || KNOWN_PROFILES[profileKey(user.name)];
  if (!known) return user;
  return {
    id: user.id || known.id,
    username: user.username || known.username,
    name: user.name || known.name,
    avatar: user.avatar || known.avatar,
    serverChecked: user.serverChecked,
    checkedAt: user.checkedAt
  };
}

function mergeUsers(primary, extra) {
  if (!primary && !extra) return null;
  const base = primary || {};
  const add = extra || {};
  return applyKnownProfile({
    id: base.id || add.id,
    username: base.username || add.username,
    name: base.name || add.name,
    avatar: base.avatar || add.avatar,
    serverChecked: base.serverChecked || add.serverChecked,
    checkedAt: base.checkedAt || add.checkedAt
  });
}

function isMoistbagle(user) {
  if (!user) return false;
  const names = [user.username, user.name].filter(Boolean).join(" ").toLowerCase().replace(/\s+/g, "");
  return names.indexOf("moistbagle") !== -1;
}

function fillMoistbagleAvatar() {
  const img = document.querySelector(".leader-feature img.discord-pfp");
  if (!img) return;
  const known = KNOWN_PROFILES.themoistbagle;
  if (!known) return;
  img.src = discordAvatarUrl(known);
  img.referrerPolicy = "no-referrer";
}

function readDiscordUser() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem("jba-discord") || "null");
  } catch (err) {}
  return mergeUsers(saved, userFromCookie());
}

function showNavUser() {
  const el = document.getElementById("nav-user");
  if (!el) return;
  const user = readDiscordUser();
  const label = user && user.serverChecked && (user.username || user.name);
  if (!label) {
    el.hidden = false;
    el.className = "nav-user nav-login";
    el.textContent = "";
    const link = document.createElement("a");
    link.href = "index.html";
    link.textContent = "LOG IN";
    el.appendChild(link);
    return;
  }
  el.className = "nav-user";
  const url = discordAvatarUrl(user);
  if (url) {
    const pic = document.createElement("img");
    pic.src = url;
    pic.alt = "";
    pic.className = "nav-avatar";
    pic.referrerPolicy = "no-referrer";
    if (user.id) pic.setAttribute("data-discord-id", user.id);
    el.appendChild(pic);
  }
  el.appendChild(document.createTextNode(label));
}

function refreshDiscordAvatars() {
  const nodes = document.querySelectorAll("[data-discord-id]");
  const ids = [];
  nodes.forEach(function (node) {
    const id = node.getAttribute("data-discord-id");
    if (id && ids.indexOf(id) === -1) ids.push(id);
  });
  if (!ids.length) return;
  fetch("/api/avatars?ids=" + encodeURIComponent(ids.join(",")))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      const avatars = data && data.avatars ? data.avatars : {};
      nodes.forEach(function (node) {
        const url = avatars[node.getAttribute("data-discord-id")];
        if (!url) return;
        if (node.tagName === "IMG") {
          node.src = url;
          node.referrerPolicy = "no-referrer";
        }
      });
    })
    .catch(function () {});
}

function markNav() {
  const file = (location.pathname.split("/").pop() || "home.html").toLowerCase();
  const groups = {
    "home.html": ["home"],
    "rules.html": ["league", "rules"],
    "teams.html": ["league", "teams"],
    "players.html": ["league", "players"],
    "staff.html": ["league", "staff"],
    "standings.html": ["standings", "divisional"],
    "power-rankings.html": ["standings", "power"],
    "playoff.html": ["standings", "playoff"],
    "schedule.html": ["games", "schedule"],
    "scores.html": ["games", "scores"],
    "team-stats.html": ["statistics", "team-stats"],
    "player-stats.html": ["statistics", "player-stats"],
    "records.html": ["statistics", "records"],
    "mvp.html": ["awards", "mvp"],
    "all-stars.html": ["awards", "all-stars"],
    "hall-of-fame.html": ["awards", "hall"],
    "signins.html": ["signins"]
  };
  const keys = groups[file] || (file === "news.html" ? ["news"] : []);
  document.querySelectorAll("[data-nav]").forEach(function (link) {
    if (keys.indexOf(link.getAttribute("data-nav")) !== -1) link.classList.add("active");
  });
}

showNavUser();
fillMoistbagleAvatar();
refreshDiscordAvatars();
markNav();

