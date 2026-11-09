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

  loginBtn.addEventListener("click", function () {
    const clientId = window.JBA_DISCORD && window.JBA_DISCORD.clientId;
    if (!clientId) {
      if (loginNote) {
        loginNote.hidden = false;
        loginNote.textContent = "Discord login needs the league's Discord app connected before it can sign anyone in.";
      }
      return;
    }
    const redirect = location.origin + "/callback.html";
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify");
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("prompt", "consent");
    location.href = url.toString();
  });
}
