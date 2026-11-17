if (location.hostname.endsWith(".vercel.app") && location.hostname !== "basketball-website-psi.vercel.app") {
  location.replace("https://basketball-website-psi.vercel.app" + location.pathname + location.search + location.hash);
}

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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const JBA_WIPED_AT = 1794535416056;

function clearStoredLogin() {
  localStorage.removeItem("jba-session");
  localStorage.removeItem("jba-discord");
  localStorage.removeItem("jba-login-profile");
  localStorage.removeItem("jba-signins");
  document.cookie = "jba_user=; Path=/; Max-Age=0; SameSite=Lax";
}

function wipedLogin(user) {
  if (!JBA_WIPED_AT || !user || !user.id || !profileComplete(user)) return false;
  return !user.connectedAt || Number(user.connectedAt) < JBA_WIPED_AT;
}

function profileComplete(user) {
  return !!((user && user.roblox && user.build) || (user && user.notPlayer));
}

function sessionFresh(user) {
  return !!(user && user.connectedAt && (Date.now() - Number(user.connectedAt) < WEEK_MS));
}

function readWeekSession() {
  let session = null;
  try { session = JSON.parse(localStorage.getItem("jba-session") || "null"); } catch (err) {}
  if (!(session && session.id && profileComplete(session) && sessionFresh(session))) {
    try { session = JSON.parse(localStorage.getItem("jba-discord") || "null"); } catch (err) { session = null; }
  }
  if (!(session && session.id && profileComplete(session))) {
    const cookie = userFromCookie();
    if (cookie && cookie.id && profileComplete(cookie)) session = cookie;
  }
  if (!session || !session.id || !profileComplete(session) || wipedLogin(session)) return null;
  if (!session.connectedAt) session.connectedAt = Date.now();
  if (!sessionFresh(session)) return null;
  session.serverChecked = true;
  return session;
}

function saveWeekSession(user) {
  if (!user || !user.id || !profileComplete(user)) return null;
  const session = {
    id: String(user.id),
    username: user.username || "",
    name: user.name || user.username || "",
    avatar: user.avatar || "",
    roblox: user.roblox || "",
    build: user.build || "",
    robloxId: user.robloxId ? String(user.robloxId) : "",
    notPlayer: !!user.notPlayer,
    serverChecked: true,
    createdAt: Number(user.createdAt) || Number(user.connectedAt) || Date.now(),
    connectedAt: Number(user.connectedAt) || Date.now()
  };
  localStorage.setItem("jba-session", JSON.stringify(session));
  localStorage.setItem("jba-discord", JSON.stringify(session));
  localStorage.setItem("jba-login-profile", JSON.stringify({
    roblox: session.roblox,
    build: session.build,
    notPlayer: session.notPlayer
  }));
  writeUserCookie(session);
  return session;
}

function writeUserCookie(user) {
  if (!user || !user.id) return;
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify({
    id: user.id,
    username: user.username || "",
    name: user.name || user.username || "",
    avatar: user.avatar || "",
    roblox: user.roblox || "",
    build: user.build || "",
    robloxId: user.robloxId ? String(user.robloxId) : "",
    notPlayer: !!user.notPlayer,
    serverChecked: true,
    createdAt: Number(user.createdAt) || Number(user.connectedAt) || Date.now(),
    connectedAt: Number(user.connectedAt) || Date.now()
  }))));
  document.cookie = "jba_user=" + encodeURIComponent(payload) + "; Path=/; Max-Age=604800; SameSite=Lax";
}

function publishSignin(user) {
  if (!user || !user.id) return Promise.resolve();
  rememberLocalSignin(user);
  writeUserCookie(user);
  localStorage.setItem("jba-discord", JSON.stringify(user));
  if (profileComplete(user)) saveWeekSession(user);
  const save = fetch("/api/signins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: user.id,
      username: user.username || "",
      name: user.name || user.username || "",
      avatar: user.avatar || "",
      roblox: user.roblox || "",
      build: user.build || "",
      robloxId: user.robloxId ? String(user.robloxId) : "",
      notPlayer: !!user.notPlayer,
      createdAt: Number(user.createdAt) || Number(user.connectedAt) || Date.now(),
      connectedAt: Number(user.connectedAt) || Date.now()
    })
  }).then(function (res) {
    if (!res.ok) throw new Error("save");
  });
  return save;
}

function rememberLocalSignin(user) {
  if (!user || !user.id) return;
  let list = [];
  try { list = JSON.parse(localStorage.getItem("jba-signins") || "[]"); } catch (err) {}
  if (!Array.isArray(list)) list = [];
  const record = {
    id: String(user.id),
    username: user.username || "",
    name: user.name || user.username || "",
    avatar: user.avatar || "",
    roblox: user.roblox || "",
    build: user.build || "",
    robloxId: user.robloxId ? String(user.robloxId) : "",
    notPlayer: !!user.notPlayer,
    status: user.status || "Free Agent",
    createdAt: Number(user.createdAt) || Number(user.connectedAt) || Date.now(),
    connectedAt: Number(user.connectedAt) || Date.now()
  };
  list = list.filter(function (player) { return String(player.id) !== record.id; });
  list.push(record);
  localStorage.setItem("jba-signins", JSON.stringify(list));
}

(function expireLogin() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("jba-session") || localStorage.getItem("jba-discord") || "null"); } catch (err) {}
  const cookie = userFromCookie();
  if (wipedLogin(saved) || wipedLogin(cookie)) {
    clearStoredLogin();
    return;
  }
  const kept = readWeekSession();
  if (kept) {
    saveWeekSession(kept);
    return;
  }
  saved = null;
  try { saved = JSON.parse(localStorage.getItem("jba-session") || localStorage.getItem("jba-discord") || "null"); } catch (err) {}
  if (!profileComplete(saved)) return;
  localStorage.removeItem("jba-session");
  localStorage.removeItem("jba-discord");
  localStorage.removeItem("jba-login-profile");
  document.cookie = "jba_user=; Path=/; Max-Age=0; SameSite=Lax";
})();

const KNOWN_PROFILES = {};

const loginBtn = document.getElementById("login-btn");
const loginNote = document.getElementById("login-note");
if (loginBtn) {
  const cookieUser = userFromCookie();
  let savedUser = null;
  try { savedUser = JSON.parse(localStorage.getItem("jba-discord") || "null"); } catch (err) {}
  if (savedUser && !verifiedUser(savedUser)) localStorage.removeItem("jba-discord");
  const existing = mergeUsers(verifiedUser(cookieUser) ? cookieUser : null, verifiedUser(savedUser) ? savedUser : null);
  if (existing && !verifiedUser(existing)) localStorage.removeItem("jba-discord");

  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginRoblox = document.getElementById("login-roblox");
  const loginContinue = document.getElementById("login-continue");
  const returning = location.search.indexOf("connected=1") !== -1 || sessionStorage.getItem("jba-resume-login") === "1";
  if (returning && loginModal) loginModal.hidden = false;
  let chosenBuild = "";
  let robloxReady = false;
  let loginRobloxId = "";
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

  function localSignin(user) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem("jba-signins") || "[]"); } catch (err) {}
    if (!Array.isArray(list) || !user) return null;
    return list.find(function (player) { return String(player.id) === String(user.id); }) || null;
  }

  function enterLeague(user, found, republish) {
    const next = Object.assign({}, user, {
      roblox: found.roblox || "",
      build: found.build || "",
      notPlayer: !!found.notPlayer,
      connectedAt: Date.now(),
      serverChecked: true,
      name: user.name || found.name,
      username: user.username || found.username,
      avatar: user.avatar || found.avatar || "",
      id: user.id || found.id
    });
    localStorage.setItem("jba-discord", JSON.stringify(next));
    localStorage.setItem("jba-login-profile", JSON.stringify({
      roblox: next.roblox,
      build: next.build,
      notPlayer: next.notPlayer
    }));
    rememberLocalSignin(next);
    writeUserCookie(next);
    saveWeekSession(next);
    if (republish === false) {
      location.replace("home.html");
      return;
    }
    publishSignin(next).then(function () {
      location.replace("home.html");
    }).catch(function () {
      const status = document.getElementById("discord-login-status");
      if (status) {
        status.textContent = "Could not save this login. Try again.";
        status.className = "apply-status bad";
      }
    });
  }

  function rememberDiscord(user) {
    if (!verifiedUser(user)) return;
    const kept = readWeekSession();
    if (kept && String(kept.id) === String(user.id)) user = Object.assign({}, user, kept);
    connectedDiscord = user;
    const merged = withProfile(user);
    if (profileComplete(merged)) saveWeekSession(Object.assign({}, merged, { connectedAt: merged.connectedAt || Date.now(), serverChecked: true }));
    else localStorage.setItem("jba-discord", JSON.stringify(merged));
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
    resumeKnownAccount(merged);
  }

  let resumeStarted = false;
  async function resumeKnownAccount(user) {
    if (resumeStarted || !user || !user.id) return;
    const kept = readWeekSession();
    if (kept && String(kept.id) === String(user.id)) {
      saveWeekSession(Object.assign({}, user, kept));
      location.replace("home.html");
      return;
    }
    resumeStarted = true;
    let found = null;
    let reachable = true;
    try {
      const res = await fetch("/api/signins");
      if (!res.ok) throw new Error("list");
      const data = await res.json();
      found = (data.players || []).find(function (player) { return String(player.id) === String(user.id); }) || null;
    } catch (err) {
      reachable = false;
    }
    if (found && profileComplete(found)) {
      enterLeague(user, found, false);
      return;
    }
    if (profileComplete(user) && sessionFresh(user)) {
      location.replace("home.html");
      return;
    }
    resumeStarted = false;
    if (!reachable || (profileComplete(user) && sessionFresh(user))) {
      if (profileComplete(user) && sessionFresh(user)) {
        saveWeekSession(user);
        location.replace("home.html");
      } else if (loginForm && !profileComplete(user)) showSignupForm();
      return;
    }
    localStorage.removeItem("jba-login-profile");
    localStorage.removeItem("jba-signins");
    document.cookie = "jba_user=; Path=/; Max-Age=0; SameSite=Lax";
    const bare = {
      id: user.id,
      username: user.username || "",
      name: user.name || user.username || "",
      avatar: user.avatar || "",
      serverChecked: true,
      connectedAt: Date.now()
    };
    localStorage.setItem("jba-discord", JSON.stringify(bare));
    connectedDiscord = bare;
    showSignupForm();
  }

  function showSignupForm() {
    if (loginForm) loginForm.classList.add("is-new");
    const title = document.getElementById("login-title");
    if (title) title.textContent = "Sign Up";
    if (loginModal) {
      loginModal.hidden = false;
      loginModal.style.display = "flex";
    }
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
    loginRobloxId = "";
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
        loginRobloxId = String(data.roblox.id || "");
        if (data.roblox.name) loginRoblox.value = data.roblox.name;
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
    localStorage.removeItem("jba-discord-status");
    sessionStorage.setItem("jba-resume-login", "1");
    location.assign(url.toString());
  }

  if (loginRoblox) {
    loginRoblox.addEventListener("input", function () {
      robloxReady = false;
      loginRobloxId = "";
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
        robloxId: skipped ? "" : loginRobloxId,
        build: skipped ? "" : chosenBuild,
        notPlayer: !!skipped
      };
      const user = Object.assign({}, connectedDiscord, profile, { connectedAt: Date.now(), serverChecked: true });
      localStorage.setItem("jba-login-profile", JSON.stringify(profile));
      localStorage.setItem("jba-discord", JSON.stringify(user));
      localStorage.removeItem("jba-discord-status");
      rememberLocalSignin(user);
      writeUserCookie(user);
      loginContinue.disabled = true;
      publishSignin(user).then(function () {
        location.replace("home.html");
      }).catch(function () {
        loginContinue.disabled = false;
        setLoginStatus(document.getElementById("discord-login-status"), "Could not save this login. Try again.", false);
      });
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

  loginBtn.addEventListener("click", function (event) {
    startDiscordLogin(event);
  });
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
    roblox: base.roblox || add.roblox || "",
    build: base.build || add.build || "",
    notPlayer: !!(base.notPlayer || add.notPlayer),
    connectedAt: base.connectedAt || add.connectedAt || 0,
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
  const session = readWeekSession();
  if (session) return session;
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem("jba-discord") || "null");
  } catch (err) {}
  return mergeUsers(saved, userFromCookie());
}

function accountRoles(player) {
  const roles = Object.assign({ owner: false, admin: false, official: false }, player && player.roles);
  const username = String(player && player.username || "").toLowerCase();
  const name = String(player && player.name || "").toLowerCase();
  if (username === "guerrilla" || name === "guerrilla") {
    roles.owner = true;
    roles.admin = true;
  }
  return roles;
}

function accountMarks(player) {
  const roles = accountRoles(player);
  const marks = document.createElement("span");
  marks.className = "account-marks";
  function logo(emoji, title) {
    const mark = document.createElement("span");
    mark.className = "role-emoji";
    mark.textContent = emoji;
    mark.title = title;
    mark.setAttribute("aria-label", title);
    marks.appendChild(mark);
  }
  if (roles.owner) logo("👑", "Owner");
  else if (roles.admin) logo("🔰", "Admin");
  if (roles.official) logo("🏁", "Official");
  return marks.childNodes.length ? marks : null;
}

function canSubmitBoxScore() {
  const roles = accountRoles(readDiscordUser());
  return !!(roles.owner || roles.admin || roles.official);
}

function canResetBoxScore() {
  const roles = accountRoles(readDiscordUser());
  return !!(roles.owner || roles.admin);
}

function isOwnerAccount(user) {
  if (!user) return false;
  const username = String(user.username || "").toLowerCase();
  const name = String(user.name || "").toLowerCase();
  return username === "guerrilla" || name === "guerrilla" || !!(user.roles && user.roles.owner);
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
  el.hidden = false;
  el.className = "nav-user nav-drop";
  el.replaceChildren();
  const url = discordAvatarUrl(user);
  if (url) {
    const pic = document.createElement("img");
    pic.src = url;
    pic.alt = "";
    pic.className = "nav-avatar";
    pic.referrerPolicy = "no-referrer";
    pic.width = 26;
    pic.height = 26;
    pic.style.cssText = "width:26px;height:26px;min-width:26px;border-radius:50%;object-fit:cover;display:block;";
    if (user.id) pic.setAttribute("data-discord-id", user.id);
    el.appendChild(pic);
  }
  const name = document.createElement("span");
  name.className = "nav-user-name";
  name.textContent = String(user.name || user.username || label);
  name.style.cssText = "color:#fff;font-size:15px;font-weight:700;line-height:1;display:inline-block;";
  el.appendChild(name);
  if (isOwnerAccount(user)) {
    const owner = document.createElement("span");
    owner.className = "role-emoji";
    owner.textContent = "👑";
    owner.title = "Owner";
    owner.setAttribute("aria-label", "Owner");
    el.appendChild(owner);
  }
  const menu = document.createElement("span");
  menu.className = "nav-menu";
  const profile = document.createElement("a");
  profile.href = "profile.html";
  profile.textContent = "View Profile";
  const logout = document.createElement("button");
  logout.type = "button";
  logout.className = "nav-logout";
  logout.textContent = "Logout";
  logout.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    openLogoutConfirm();
  });
  menu.append(profile, logout);
  el.appendChild(menu);
  document.dispatchEvent(new Event("jba-user"));
}

function openLogoutConfirm() {
  if (document.getElementById("logout-modal")) return;
  const modal = document.createElement("div");
  modal.id = "logout-modal";
  modal.className = "logout-modal";
  modal.innerHTML = '<div class="logout-card"><p>Log out?</p><span>You will need to sign in again.</span><div><button type="button" class="cta-btn" id="logout-yes">Log out</button><button type="button" id="logout-no">Cancel</button></div></div>';
  document.body.appendChild(modal);
  function close() { modal.remove(); }
  modal.addEventListener("click", function (event) {
    if (event.target === modal) close();
  });
  document.getElementById("logout-no").addEventListener("click", close);
  document.getElementById("logout-yes").addEventListener("click", function () {
    clearStoredLogin();
    try { sessionStorage.removeItem("jba-resume-login"); } catch (err) {}
    location.replace("index.html");
  });
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
    "view-score.html": ["games", "scores"],
    "team-stats.html": ["statistics", "team-stats"],
    "player-stats.html": ["statistics", "player-stats"],
    "records.html": ["statistics", "records"],
    "mvp.html": ["awards", "mvp"],
    "all-stars.html": ["awards", "all-stars"],
    "hall-of-fame.html": ["awards", "hall"]
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
setupProfile();
syncRobloxNames();
gateScoreAccess();

function gateScoreAccess() {
  const file = (location.pathname.split("/").pop() || "home.html").toLowerCase();
  const canSubmit = canSubmitBoxScore();
  const canReset = canResetBoxScore();
  if (file === "scores.html") {
    if (!canSubmit) document.querySelectorAll(".final-edit").forEach(function (node) { node.remove(); });
    if (!canReset) document.querySelectorAll(".final-reset").forEach(function (node) { node.remove(); });
    let requests = [];
    try { requests = JSON.parse(localStorage.getItem("jba-reset-requests") || "[]"); } catch (err) {}
    if (!Array.isArray(requests)) requests = [];
    if (canSubmit && !canReset) {
      document.querySelectorAll(".final-card").forEach(function (card) {
        const state = card.querySelector(".final-state");
        if (!state || (state.textContent !== "FINAL" && state.textContent !== "FORFEIT")) return;
        const edit = card.querySelector(".final-edit");
        if (!edit || card.querySelector(".final-request")) return;
        const id = card.getAttribute("data-game") || "";
        const pending = requests.some(function (item) { return item.id === id; });
        const button = document.createElement("button");
        button.type = "button";
        button.className = "final-request";
        button.textContent = pending ? "Requested" : "Request reset";
        button.disabled = pending;
        button.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          const me = readDiscordUser();
          requests = requests.filter(function (item) { return item.id !== id; });
          requests.push({ id: id, by: me && (me.name || me.username) || "Official", at: Date.now() });
          localStorage.setItem("jba-reset-requests", JSON.stringify(requests));
          button.textContent = "Requested";
          button.disabled = true;
        });
        edit.insertAdjacentElement("afterend", button);
      });
    }
    if (canReset) {
      requests.forEach(function (item) {
        const card = document.querySelector('.final-card[data-game="' + item.id + '"]');
        if (!card || card.querySelector(".reset-note")) return;
        const note = document.createElement("span");
        note.className = "reset-note";
        note.textContent = "Reset requested";
        const status = card.querySelector(".final-status");
        if (status) status.appendChild(note);
      });
    }
  }
  if (file === "boxscore.html" && !canSubmit) {
    const form = document.getElementById("box-form");
    const lead = document.getElementById("box-lead");
    if (form) form.hidden = true;
    if (lead) lead.textContent = "Only an official, an admin, or the owner can submit a box score.";
  }
}

function syncRobloxNames() {
  const user = readDiscordUser();
  if (!user || !user.id) return;
  fetch("/api/signins").then(function (res) { return res.json(); }).then(function (data) {
    const found = (data.players || []).find(function (player) { return String(player.id) === String(user.id); });
    if (!found) return;
    const next = Object.assign({}, user, {
      username: found.username || user.username,
      name: found.name || user.name,
      avatar: found.avatar || user.avatar,
      roblox: found.roblox || user.roblox,
      robloxId: found.robloxId || user.robloxId || "",
      roles: found.roles || user.roles || null
    });
    const same = next.username === user.username && next.name === user.name && (next.avatar || "") === (user.avatar || "") && next.roblox === (user.roblox || "") && String(next.robloxId || "") === String(user.robloxId || "") && JSON.stringify(next.roles || null) === JSON.stringify(user.roles || null);
    if (!same) {
      saveWeekSession(next);
      rememberLocalSignin(next);
      showNavUser();
    }
    const input = document.getElementById("profile-roblox");
    if (input && user.roblox && input.value.trim().toLowerCase() === String(user.roblox).toLowerCase()) input.value = next.roblox;
    const discordName = document.querySelector("#profile-discord b");
    const discordTag = document.querySelector("#profile-discord small");
    const discordImg = document.querySelector("#profile-discord img");
    if (discordName) discordName.textContent = next.name || next.username;
    if (discordTag) discordTag.textContent = "@" + (next.username || "");
    if (discordImg) discordImg.src = discordAvatarUrl(next);
  }).catch(function () {});
}

function setupProfile() {
  const form = document.getElementById("profile-form");
  if (!form) return;
  const gate = document.getElementById("profile-gate");
  const user = readDiscordUser();
  if (!user || !user.serverChecked || !(user.username || user.name)) {
    form.hidden = true;
    if (gate) gate.hidden = false;
    return;
  }
  const discord = document.getElementById("profile-discord");
  const img = document.createElement("img");
  img.className = "roster-pfp";
  img.alt = "";
  img.referrerPolicy = "no-referrer";
  img.src = discordAvatarUrl(user);
  const copy = document.createElement("span");
  const name = document.createElement("b");
  name.textContent = user.name || user.username;
  const tag = document.createElement("small");
  tag.textContent = "@" + (user.username || "");
  copy.appendChild(name);
  copy.appendChild(tag);
  discord.appendChild(img);
  discord.appendChild(copy);

  const roblox = document.getElementById("profile-roblox");
  const buildButton = document.getElementById("profile-build-button");
  const buildPick = document.getElementById("profile-build-pick");
  const notPlayer = document.getElementById("profile-not-player");
  const saveStatus = document.getElementById("profile-save-status");
  let chosenBuild = user.build || "";
  let robloxReady = !!(user.roblox && user.build) || !!user.notPlayer;
  let profileRobloxId = user.robloxId ? String(user.robloxId) : "";
  const labels = { Guard: "GUARD — PG / SG", Wing: "WING — SG / SF", Forward: "FORWARD — SF / PF", Big: "BIG — C / PF" };

  if (roblox && user.roblox) roblox.value = user.roblox;
  if (chosenBuild && buildButton) {
    buildButton.textContent = labels[chosenBuild] || chosenBuild;
    buildButton.classList.remove("is-empty");
  }
  if (notPlayer && user.notPlayer) {
    notPlayer.checked = true;
    form.classList.add("is-bypass");
  }

  function setStatus(el, message, ok) {
    if (!el) return;
    el.textContent = message || "";
    el.className = "apply-status" + (message ? (ok ? " good" : " bad") : "");
  }

  function refreshSave() {
    const skipped = notPlayer && notPlayer.checked;
    document.getElementById("profile-save").disabled = !(skipped || (robloxReady && chosenBuild && roblox.value.trim()));
  }

  async function checkRoblox() {
    const username = roblox.value.trim();
    robloxReady = false;
    refreshSave();
    if (!username) {
      setStatus(document.getElementById("profile-name-status"), "", false);
      setStatus(document.getElementById("profile-unique-status"), "", false);
      return;
    }
    if (user.roblox && username.toLowerCase() === String(user.roblox).toLowerCase()) {
      setStatus(document.getElementById("profile-name-status"), "Roblox account found: " + username, true);
      setStatus(document.getElementById("profile-unique-status"), "Unique account: Yes", true);
      robloxReady = true;
      refreshSave();
      return;
    }
    setStatus(document.getElementById("profile-name-status"), "Checking Roblox…", true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, checkOnly: true })
      });
      const data = await res.json();
      if (data && data.roblox) {
        profileRobloxId = String(data.roblox.id || "");
        if (data.roblox.name) roblox.value = data.roblox.name;
        setStatus(document.getElementById("profile-name-status"), "Roblox account found: " + data.roblox.name, true);
        setStatus(document.getElementById("profile-unique-status"), "Unique account: " + (data.unique ? "Yes" : "No"), !!data.unique);
        robloxReady = !!(data.ok && data.unique);
      } else {
        setStatus(document.getElementById("profile-name-status"), (data && data.error) || "That username could not be checked.", false);
        setStatus(document.getElementById("profile-unique-status"), "", false);
      }
    } catch (err) {
      setStatus(document.getElementById("profile-name-status"), "Could not check that username.", false);
    }
    refreshSave();
  }

  roblox.addEventListener("input", function () {
    robloxReady = false;
    if (roblox.value.trim().toLowerCase() !== String(user.roblox || "").toLowerCase()) profileRobloxId = "";
    setStatus(document.getElementById("profile-name-status"), "", false);
    setStatus(document.getElementById("profile-unique-status"), "", false);
    refreshSave();
  });
  roblox.addEventListener("blur", checkRoblox);
  buildButton.addEventListener("click", function () {
    buildPick.classList.toggle("is-open");
  });
  document.querySelectorAll("#profile-build-menu .pick-option").forEach(function (button) {
    button.addEventListener("click", function () {
      chosenBuild = button.dataset.build;
      buildButton.textContent = button.textContent;
      buildButton.classList.remove("is-empty");
      buildPick.classList.remove("is-open");
      refreshSave();
    });
  });
  document.addEventListener("click", function (event) {
    if (buildPick && !event.target.closest("#profile-build-pick")) buildPick.classList.remove("is-open");
  });
  notPlayer.addEventListener("change", function () {
    form.classList.toggle("is-bypass", this.checked);
    refreshSave();
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const skipped = notPlayer.checked;
    if (!skipped && (!robloxReady || !chosenBuild)) return;
    const next = Object.assign({}, user, {
      roblox: skipped ? "" : roblox.value.trim(),
      robloxId: skipped ? "" : profileRobloxId,
      build: skipped ? "" : chosenBuild,
      notPlayer: skipped,
      serverChecked: true,
      createdAt: user.createdAt || user.connectedAt || Date.now(),
      connectedAt: user.connectedAt || Date.now()
    });
    saveWeekSession(next);
    rememberLocalSignin(next);
    setStatus(saveStatus, "Saving…", true);
    fetch("/api/signins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: next.id,
        username: next.username,
        name: next.name || next.username,
        avatar: next.avatar || "",
        roblox: next.roblox,
        robloxId: next.robloxId || "",
        build: next.build,
        notPlayer: next.notPlayer,
        createdAt: next.createdAt,
        connectedAt: next.connectedAt
      })
    }).then(function (res) {
      if (!res.ok) throw new Error("save");
      setStatus(saveStatus, "Settings saved.", true);
    }).catch(function () {
      setStatus(saveStatus, "Saved on this device. The league list will update when the save goes through.", false);
    });
  });
  refreshSave();
}

(function keepWeekLogin() {
  const kept = readWeekSession();
  const path = location.pathname || "/";
  const start = path === "/" || path.endsWith("/index.html");
  if (kept) {
    saveWeekSession(kept);
    if (start) location.replace("home.html");
    return;
  }
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("jba-discord") || "null"); } catch (err) {}
  const cookie = userFromCookie();
  if ((!saved || !saved.id) && cookie) saved = cookie;
  if (!saved || !saved.id) return;
  fetch("/api/signins").then(function (res) {
    if (!res.ok) throw new Error("list");
    return res.json();
  }).then(function (data) {
    const found = (data.players || []).find(function (player) { return String(player.id) === String(saved.id); });
    if (!found || !profileComplete(found)) return;
    const next = saveWeekSession(Object.assign({}, found, saved, {
      roblox: saved.roblox || found.roblox || "",
      build: saved.build || found.build || "",
      notPlayer: saved.notPlayer || found.notPlayer,
      createdAt: saved.createdAt || found.createdAt || saved.connectedAt || found.connectedAt,
      serverChecked: true,
      connectedAt: saved.connectedAt || found.connectedAt || Date.now()
    }));
    if (!next) return;
    if (start) location.replace("home.html");
    document.dispatchEvent(new Event("jba-user"));
    if (typeof showNavUser === "function") showNavUser();
  }).catch(function () {});
})();

(function gateApplication() {
  function onApply() {
    var path = location.pathname || "";
    return path === "/apply" || path.endsWith("/apply.html");
  }
  if (onApply() && !readWeekSession()) location.replace("index.html");
  document.querySelectorAll('a[href="apply.html"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (readWeekSession()) return;
      event.preventDefault();
      location.href = "index.html";
    });
  });
})();

(function paintStandings() {
  var divisionTables = document.querySelectorAll(".division-table:not(.power-table)");
  var homeTables = document.querySelectorAll(".conf-table");
  if (!divisionTables.length && !homeTables.length) return;

  var confOf = {
    "Duke Blue Devils": "ACC",
    "Miami Hurricanes": "ACC",
    "North Carolina Tar Heels": "ACC",
    "Virginia Cavaliers": "ACC",
    "Florida Gators": "SEC",
    "Georgia Bulldogs": "SEC",
    "Kentucky Wildcats": "SEC",
    "LSU Tigers": "SEC",
    "Michigan Wolverines": "BIG-10",
    "Ohio State Buckeyes": "BIG-10",
    "Oregon Ducks": "BIG-10",
    "UCLA Bruins": "BIG-10",
    "Arizona Wildcats": "BIG-12",
    "Baylor Bears": "BIG-12",
    "Houston Cougars": "BIG-12",
    "Kansas Jayhawks": "BIG-12"
  };

  function blank() {
    return { w: 0, l: 0, dw: 0, dl: 0, hw: 0, hl: 0, aw: 0, al: 0, pf: 0, pa: 0, scored: 0, results: [] };
  }
  var teams = {};
  Object.keys(confOf).forEach(function (name) { teams[name] = blank(); });

  var saved = {};
  try { saved = JSON.parse(localStorage.getItem("jba-boxscores") || "{}"); } catch (err) { saved = {}; }

  function whenKey(meta) {
    if (!meta || !meta.date) return "";
    var h = parseInt(meta.hour, 10);
    var m = parseInt(meta.minute, 10);
    if (!isFinite(h)) h = 0;
    if (!isFinite(m)) m = 0;
    if (String(meta.hour || "").trim() === "") return meta.date + "T00:00";
    return meta.date + "T" + (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }
  function sideResult(score, other) {
    if (score === "W" || score === "FFW") return "W";
    if (score === "L" || score === "FFL") return "L";
    var n = Number(score);
    var m = Number(other);
    if (!isFinite(n) || !isFinite(m)) return "";
    if (n > m) return "W";
    if (n < m) return "L";
    return "T";
  }
  function isForfeit(game) {
    if (!game) return false;
    if (game.forfeit) return true;
    return [game.awayScore, game.homeScore].some(function (score) {
      return score === "W" || score === "L" || score === "FFW" || score === "FFL";
    });
  }

  var games = [];
  Object.keys(saved).forEach(function (id) {
    var game = saved[id];
    if (!game) return;
    var legacy = game.submitted == null && game.awayScore !== "" && game.homeScore !== "" && game.awayScore != null && game.homeScore != null;
    if (!(game.submitted === true || legacy)) return;
    var parts = String(id).split("|");
    if (parts.length < 3 || !teams[parts[1]] || !teams[parts[2]]) return;
    games.push({ id: id, week: Number(parts[0]) || 0, away: parts[1], home: parts[2], game: game });
  });
  games.sort(function (a, b) {
    var da = whenKey(a.game.meta);
    var db = whenKey(b.game.meta);
    if (!da && !db) return a.week - b.week || (a.id < b.id ? -1 : 1);
    if (!da) return 1;
    if (!db) return -1;
    if (da !== db) return da < db ? -1 : 1;
    return a.week - b.week || (a.id < b.id ? -1 : 1);
  });

  games.forEach(function (item) {
    var game = item.game;
    var forfeit = isForfeit(game);
    var awayRes = sideResult(game.awayScore, game.homeScore);
    var homeRes = sideResult(game.homeScore, game.awayScore);
    if (forfeit && game.forfeitTeam === "away") { awayRes = "L"; homeRes = "W"; }
    if (forfeit && game.forfeitTeam === "home") { awayRes = "W"; homeRes = "L"; }
    function addResult(name, result, atHome) {
      if (result !== "W" && result !== "L") return;
      var team = teams[name];
      if (result === "W") team.w += 1;
      else team.l += 1;
      if (atHome) {
        if (result === "W") team.hw += 1;
        else team.hl += 1;
      } else if (result === "W") team.aw += 1;
      else team.al += 1;
      if (confOf[item.away] === confOf[item.home]) {
        if (result === "W") team.dw += 1;
        else team.dl += 1;
      }
      team.results.push(result);
    }
    addResult(item.away, awayRes, false);
    addResult(item.home, homeRes, true);
    if (!forfeit) {
      var awayPts = Number(game.awayScore);
      var homePts = Number(game.homeScore);
      if (isFinite(awayPts) && isFinite(homePts)) {
        teams[item.away].pf += awayPts;
        teams[item.away].pa += homePts;
        teams[item.away].scored += 1;
        teams[item.home].pf += homePts;
        teams[item.home].pa += awayPts;
        teams[item.home].scored += 1;
      }
    }
  });

  function pct(w, l) {
    return w + l ? w / (w + l) : null;
  }
  function pctText(w, l) {
    var value = pct(w, l);
    if (value == null) return "-";
    if (value === 1) return "1.000";
    return value.toFixed(3).replace(/^0/, "");
  }
  function streak(list) {
    if (!list.length) return "-";
    var last = list[list.length - 1];
    var count = 0;
    var i;
    for (i = list.length - 1; i >= 0 && list[i] === last; i -= 1) count += 1;
    return last + count;
  }
  function oneDecimal(value) {
    return (Math.round(value * 10) / 10).toFixed(1);
  }
  function diffText(team) {
    if (!team.scored) return "-";
    var diff = team.pf - team.pa;
    return diff > 0 ? "+" + diff : String(diff);
  }
  function line(name) {
    var team = teams[name];
    return {
      name: name,
      rec: team.w + "-" + team.l,
      wpct: pctText(team.w, team.l),
      strk: streak(team.results),
      ppg: team.scored ? oneDecimal(team.pf / team.scored) : "-",
      oppppg: team.scored ? oneDecimal(team.pa / team.scored) : "-",
      diff: diffText(team),
      division: team.dw + "-" + team.dl,
      home: team.hw + "-" + team.hl,
      away: team.aw + "-" + team.al
    };
  }
  function rankNames(names) {
    function bucket(team) {
      var games = team.w + team.l;
      if (!games) return 1;
      return team.w / games >= 0.5 ? 0 : 2;
    }
    function rate(team) {
      var games = team.w + team.l;
      return games ? team.w / games : 0;
    }
    var ranked = names.slice().sort(function (a, b) {
      var ta = teams[a];
      var tb = teams[b];
      var ba = bucket(ta);
      var bb = bucket(tb);
      if (ba !== bb) return ba - bb;
      var pa = rate(ta);
      var pb = rate(tb);
      if (pa !== pb) return pb - pa;
      if (ta.w !== tb.w) return tb.w - ta.w;
      if (ta.l !== tb.l) return ta.l - tb.l;
      var da = ta.scored ? ta.pf - ta.pa : 0;
      var db = tb.scored ? tb.pf - tb.pa : 0;
      if (da !== db) return db - da;
      return a.localeCompare(b);
    });
    var leader = teams[ranked[0]];
    return ranked.map(function (name, index) {
      var team = teams[name];
      var behind = ((leader.w - team.w) + (team.l - leader.l)) / 2;
      var row = line(name);
      row.rk = String(index + 1);
      row.gb = behind <= 0 ? "-" : behind.toFixed(1);
      return row;
    });
  }
  function teamName(row) {
    var name = row.querySelector(".conf-team span");
    return name ? name.textContent.trim() : "";
  }
  function writeDivision(table) {
    var body = table.tBodies[0];
    if (!body) return;
    var rows = Array.prototype.slice.call(body.rows);
    var byName = {};
    rankNames(rows.map(teamName).filter(Boolean)).forEach(function (row) { byName[row.name] = row; });
    rows.sort(function (a, b) { return Number(byName[teamName(a)].rk) - Number(byName[teamName(b)].rk); });
    rows.forEach(function (row) {
      var data = byName[teamName(row)];
      Array.prototype.forEach.call(table.tHead.rows[0].cells, function (th, index) {
        var key = th.getAttribute("data-sort");
        if (key && key !== "team" && data[key] != null) row.cells[index].textContent = data[key];
      });
      body.appendChild(row);
    });
  }
  function writeHome(table) {
    var body = table.tBodies[0];
    if (!body) return;
    var rows = Array.prototype.slice.call(body.rows);
    var byName = {};
    rankNames(rows.map(teamName).filter(Boolean)).forEach(function (row) { byName[row.name] = row; });
    rows.sort(function (a, b) { return Number(byName[teamName(a)].rk) - Number(byName[teamName(b)].rk); });
    rows.forEach(function (row) {
      var data = byName[teamName(row)];
      row.cells[0].textContent = data.rk;
      row.cells[2].textContent = data.rec;
      row.cells[3].textContent = data.wpct;
      row.cells[4].textContent = data.gb;
      body.appendChild(row);
    });
  }
  Array.prototype.forEach.call(divisionTables, writeDivision);
  Array.prototype.forEach.call(homeTables, writeHome);
})();

(function paintHomeFinals() {
  var list = document.querySelector(".home-board .score-list");
  if (!list) return;
  var slots = Array.prototype.slice.call(list.querySelectorAll(".score-game"));
  if (!slots.length) return;
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem("jba-boxscores") || "{}"); } catch (err) { saved = {}; }

  function prettyDate(iso) {
    var parts = String(iso || "").split("-");
    if (parts.length !== 3) return "";
    return Number(parts[1]) + "/" + Number(parts[2]) + "/" + parts[0];
  }
  function prettyTime(hour, minute) {
    if (hour == null || String(hour).trim() === "") return "";
    var h = parseInt(hour, 10);
    if (!isFinite(h)) return "";
    var m = parseInt(minute, 10);
    if (!isFinite(m)) m = 0;
    var suffix = h >= 12 ? "PM" : "AM";
    return (h % 12 || 12) + ":" + (m < 10 ? "0" : "") + m + " " + suffix;
  }
  function whenKey(meta) {
    if (!meta || !meta.date) return "";
    var h = parseInt(meta.hour, 10);
    var m = parseInt(meta.minute, 10);
    if (!isFinite(h)) h = 0;
    if (!isFinite(m)) m = 0;
    if (String(meta.hour || "").trim() === "") return meta.date + "T00:00";
    return meta.date + "T" + (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }
  function streamHref(value) {
    var raw = String(value || "").trim();
    if (!raw) return "";
    if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
    try {
      var url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return url.href;
    } catch (err) {
      return "";
    }
  }
  function isForfeit(game) {
    if (!game) return false;
    if (game.forfeit) return true;
    return [game.awayScore, game.homeScore].some(function (score) {
      return score === "W" || score === "L" || score === "FFW" || score === "FFL";
    });
  }
  function sideMark(game, side) {
    var score = side === "away" ? game.awayScore : game.homeScore;
    var other = side === "away" ? game.homeScore : game.awayScore;
    if (isForfeit(game)) {
      if (game.forfeitTeam === side || score === "L" || score === "FFL") return "FFL";
      return "FFW";
    }
    return score == null || score === "" ? "—" : String(score);
  }
  function sideKind(game, side) {
    if (isForfeit(game)) return sideMark(game, side) === "FFL" ? "is-loss" : "is-win";
    var away = Number(game.awayScore);
    var home = Number(game.homeScore);
    if (!isFinite(away) || !isFinite(home) || away === home) return "";
    var win = side === "away" ? away > home : home > away;
    return win ? "is-win" : "is-loss";
  }

  var logos = {
    "Arizona Wildcats": "arizona.png",
    "Baylor Bears": "baylor.png",
    "Duke Blue Devils": "duke.png",
    "Florida Gators": "florida.png",
    "Georgia Bulldogs": "georgia.png",
    "Houston Cougars": "houston.png",
    "Kansas Jayhawks": "kansas.png",
    "Kentucky Wildcats": "kentucky.png",
    "LSU Tigers": "lsu.png",
    "Miami Hurricanes": "miami.png",
    "Michigan Wolverines": "michigan.png",
    "North Carolina Tar Heels": "unc.png",
    "Ohio State Buckeyes": "ohiostate.png",
    "Oregon Ducks": "oregon.png",
    "UCLA Bruins": "ucla.png",
    "Virginia Cavaliers": "virginia.png"
  };
  var games = [];
  Object.keys(saved).forEach(function (id) {
    var game = saved[id];
    if (!game) return;
    var legacy = game.submitted == null && game.awayScore !== "" && game.homeScore !== "" && game.awayScore != null && game.homeScore != null;
    if (!(game.submitted === true || legacy)) return;
    var parts = String(id).split("|");
    if (parts.length < 3) return;
    games.push({ id: id, week: parts[0], away: parts[1], home: parts[2], game: game, when: whenKey(game.meta) });
  });
  games = games.filter(function (item) { return !isForfeit(item.game); });
  games.sort(function (a, b) {
    if (a.when !== b.when) {
      if (!a.when) return 1;
      if (!b.when) return -1;
      return a.when < b.when ? 1 : -1;
    }
    return Number(b.week) - Number(a.week);
  });
  var latest = games.slice(0, slots.length);
  latest.sort(function (a, b) {
    if (a.when !== b.when) {
      if (!a.when) return 1;
      if (!b.when) return -1;
      return a.when < b.when ? -1 : 1;
    }
    return Number(a.week) - Number(b.week);
  });

  slots.forEach(function (card, index) {
    var item = latest[index];
    if (!item) return;
    var game = item.game;
    var meta = game.meta || {};
    var label = isForfeit(game) ? "FORFEIT" : "FINAL";
    var detail = "— Week " + item.week + ", " + (meta.date ? prettyDate(meta.date) : "TBD");
    var time = prettyTime(meta.hour, meta.minute);
    if (time) detail += ", @ " + time;
    card.className = "score-game is-posted";
    card.innerHTML = "";
    var head = document.createElement("span");
    head.className = "final";
    var copy = document.createElement("span");
    copy.className = "final-copy";
    var word = document.createElement("b");
    word.className = "final-word";
    word.textContent = label;
    var metaEl = document.createElement("span");
    metaEl.className = "final-meta";
    metaEl.textContent = detail;
    copy.append(word, metaEl);
    head.appendChild(copy);
    var links = document.createElement("span");
    links.className = "stream-links";
    [["youtube", "youtube.svg", "YouTube"], ["twitch", "twitch.svg", "Twitch"]].forEach(function (entry) {
      var href = streamHref(meta[entry[0]]);
      if (!href) return;
      var link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener";
      link.setAttribute("aria-label", entry[2]);
      link.innerHTML = '<img src="' + entry[1] + '" alt="">';
      links.appendChild(link);
    });
    if (links.childNodes.length) {
      var end = document.createElement("span");
      end.className = "final-end";
      end.appendChild(links);
      head.appendChild(end);
    }
    card.appendChild(head);
    card.classList.add("is-viewable");
    card.addEventListener("click", function (event) {
      if (event.target.closest("a, button")) return;
      location.href = "view-score.html?week=" + encodeURIComponent(item.week) + "&away=" + encodeURIComponent(item.away) + "&home=" + encodeURIComponent(item.home);
    });
    [["away", item.away], ["home", item.home]].forEach(function (side) {
      var name = document.createElement("span");
      name.className = "home-club";
      var img = document.createElement("img");
      img.src = logos[side[1]] || "";
      img.alt = "";
      var text = document.createElement("span");
      text.textContent = side[1];
      name.append(img, text);
      var score = document.createElement("strong");
      score.textContent = sideMark(game, side[0]);
      var kind = sideKind(game, side[0]);
      if (kind) score.className = kind;
      card.append(name, score);
    });
  });
})();

(function markRivalries() {
  var games = document.querySelectorAll(".sched-game");
  if (!games.length) return;
  var conf = {
    "Duke Blue Devils": "ACC",
    "Miami Hurricanes": "ACC",
    "North Carolina Tar Heels": "ACC",
    "Virginia Cavaliers": "ACC",
    "Florida Gators": "SEC",
    "Georgia Bulldogs": "SEC",
    "Kentucky Wildcats": "SEC",
    "LSU Tigers": "SEC",
    "Michigan Wolverines": "BIG-10",
    "Ohio State Buckeyes": "BIG-10",
    "Oregon Ducks": "BIG-10",
    "UCLA Bruins": "BIG-10",
    "Arizona Wildcats": "BIG-12",
    "Baylor Bears": "BIG-12",
    "Houston Cougars": "BIG-12",
    "Kansas Jayhawks": "BIG-12"
  };
  var marks = { ACC: "acc.png", SEC: "sec.png", "BIG-10": "big10.png", "BIG-12": "big12.png" };
  games.forEach(function (game) {
    var away = game.getAttribute("data-away");
    var home = game.getAttribute("data-home");
    if (!conf[away] || conf[away] !== conf[home]) return;
    var when = game.querySelector(".sched-when");
    if (!when || when.querySelector(".sched-rival")) return;
    var badge = document.createElement("span");
    badge.className = "sched-rival";
    badge.innerHTML = '<img src="' + marks[conf[away]] + '" alt="">RIVALRY';
    when.appendChild(badge);
  });
})();

(function paintHomeLeaders() {
  var cards = document.querySelectorAll(".home-board .leader-card");
  if (!cards.length) return;
  var TEAMS = {
    "Arizona Wildcats": ["ARZ", "arizona.png"],
    "Baylor Bears": ["BAY", "baylor.png"],
    "Duke Blue Devils": ["DUKE", "duke.png"],
    "Florida Gators": ["FL", "florida.png"],
    "Georgia Bulldogs": ["GEO", "georgia.png"],
    "Houston Cougars": ["HOU", "houston.png"],
    "Kansas Jayhawks": ["KAN", "kansas.png"],
    "Kentucky Wildcats": ["KEN", "kentucky.png"],
    "LSU Tigers": ["LSU", "lsu.png"],
    "Miami Hurricanes": ["MIA", "miami.png"],
    "Michigan Wolverines": ["MICH", "michigan.png"],
    "North Carolina Tar Heels": ["NC", "unc.png"],
    "Ohio State Buckeyes": ["OHST", "ohiostate.png"],
    "Oregon Ducks": ["OR", "oregon.png"],
    "UCLA Bruins": ["UCLA", "ucla.png"],
    "Virginia Cavaliers": ["VIR", "virginia.png"]
  };
  var KEYS = ["pts", "reb", "ast", "gmsc"];
  function isForfeit(game) {
    if (!game || game.forfeit) return true;
    return [game.awayScore, game.homeScore].some(function (score) {
      return score === "FFW" || score === "FFL" || score === "W" || score === "L";
    });
  }
  function avatar(player) {
    if (player && player.avatar && player.id) return "https://cdn.discordapp.com/avatars/" + player.id + "/" + player.avatar + ".png?size=64";
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
  function collect() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem("jba-boxscores") || "{}"); } catch (err) { saved = {}; }
    var bag = {};
    Object.keys(saved).forEach(function (id) {
      var game = saved[id];
      if (!game || game.submitted !== true || isForfeit(game)) return;
      (game.lines || []).forEach(function (line) {
        if (!line || !line.id) return;
        var row = bag[line.id] || { id: String(line.id), name: line.name || "Unknown", games: 0, pts: 0, reb: 0, ast: 0, gmsc: 0 };
        row.name = line.name || row.name;
        row.games += 1;
        row.pts += Number(line.pts) || 0;
        row.reb += Number(line.reb) || 0;
        row.ast += Number(line.ast) || 0;
        row.gmsc += Number(line.gmsc) || 0;
        bag[line.id] = row;
      });
    });
    return Object.keys(bag).map(function (id) { return bag[id]; });
  }
  function fill(card, rows, key) {
    var feature = card.querySelector(".leader-feature");
    var rest = card.querySelector(".leader-rest");
    if (!feature || !rest) return;
    var ranked = rows.slice().sort(function (a, b) {
      var av = a.games ? a[key] / a.games : -1;
      var bv = b.games ? b[key] / b.games : -1;
      return bv - av;
    }).slice(0, 5);
    function value(row) {
      if (!row || !row.games) return "—";
      return (row[key] / row.games).toFixed(1);
    }
    function identity(row) {
      var account = row && row.account;
      var roblox = account && account.roblox ? account.roblox : (row ? ((account && (account.name || account.username)) || row.name) : "—");
      var team = account ? String(account.team || account.teamName || "").trim() : "";
      var tag = account && account.username ? "@" + account.username : "";
      return { roblox: roblox || "—", team: team || "—", tag: tag };
    }
    function nameBlock(row) {
      var who = identity(row);
      var wrap = document.createElement("div");
      wrap.className = "leader-feature-name";
      var title = document.createElement("b");
      title.textContent = who.roblox;
      var team = document.createElement("small");
      team.textContent = who.team;
      wrap.append(title, team);
      var tag = document.createElement("span");
      tag.className = "leader-tag";
      tag.textContent = who.tag;
      return { wrap: wrap, tag: tag };
    }
    var top = ranked[0];
    feature.innerHTML = "";
    var face = document.createElement("span");
    face.className = "discord-pfp";
    if (top) face.style.backgroundImage = "url('" + avatar(top.account) + "')";
    var named = nameBlock(top);
    var stat = document.createElement("span");
    stat.className = "leader-stat";
    stat.textContent = value(top);
    feature.append(face, named.wrap, named.tag, stat);
    rest.innerHTML = "";
    for (var i = 1; i < 5; i += 1) {
      var row = ranked[i];
      var li = document.createElement("li");
      var place = document.createElement("span");
      place.textContent = String(i + 1);
      var pfp = document.createElement("span");
      pfp.className = "discord-pfp";
      if (row) pfp.style.backgroundImage = "url('" + avatar(row.account) + "')";
      var copy = nameBlock(row);
      var num = document.createElement("span");
      num.textContent = value(row);
      li.append(place, pfp, copy.wrap, copy.tag, num);
      rest.appendChild(li);
    }
  }
  var rows = collect();
  try {
    var cached = JSON.parse(localStorage.getItem("jba-directory") || "[]");
    var byCache = {};
    (cached || []).forEach(function (player) { if (player && player.id) byCache[String(player.id)] = player; });
    if (Object.keys(byCache).length) {
      rows.forEach(function (row) { row.account = byCache[row.id] || null; });
      cards.forEach(function (card, index) { fill(card, rows, KEYS[index] || "pts"); });
    }
  } catch (err) {}
  fetch("/api/signins?t=" + Date.now()).then(function (res) { return res.json(); }).then(function (data) {
    var byId = {};
    (data.players || []).forEach(function (player) { if (player && player.id) byId[String(player.id)] = player; });
    try { localStorage.setItem("jba-directory", JSON.stringify(data.players || [])); } catch (err) {}
    rows.forEach(function (row) { row.account = byId[row.id] || null; });
    cards.forEach(function (card, index) { fill(card, rows, KEYS[index] || "pts"); });
  }).catch(function () {
    cards.forEach(function (card, index) { fill(card, rows, KEYS[index] || "pts"); });
  });
})();

