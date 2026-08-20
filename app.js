const creators = [
  {
    name: "MoeJet",
    username: "@moejet",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=MoeJet&backgroundColor=18181b&fontFamily=Arial",
    live: true,
    hours: {daily: 7.8, weekly: 41.2, monthly: 126.4, alltime: 2840},
    diamonds: {daily: 412800, weekly: 2134000, monthly: 6840000, alltime: 100000000},
    change: {daily: 2, weekly: 0, monthly: 1, alltime: 0}
  },
  {
    name: "Emily Anne",
    username: "@emilyanne",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Emily+Anne&backgroundColor=18181b&fontFamily=Arial",
    live: true,
    hours: {daily: 6.4, weekly: 36.5, monthly: 112.2, alltime: 1080},
    diamonds: {daily: 356400, weekly: 1865000, monthly: 4920000, alltime: 22400000},
    change: {daily: 1, weekly: 2, monthly: 0, alltime: 1}
  },
  {
    name: "Troy",
    username: "@troy",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Troy&backgroundColor=18181b&fontFamily=Arial",
    live: false,
    hours: {daily: 5.1, weekly: 32.8, monthly: 98.7, alltime: 920},
    diamonds: {daily: 291200, weekly: 1530000, monthly: 4410000, alltime: 18100000},
    change: {daily: -1, weekly: 1, monthly: 2, alltime: 0}
  },
  {
    name: "Jada",
    username: "@jada",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Jada&backgroundColor=18181b&fontFamily=Arial",
    live: false,
    hours: {daily: 4.8, weekly: 29.4, monthly: 91.2, alltime: 540},
    diamonds: {daily: 238600, weekly: 1284000, monthly: 3800000, alltime: 12600000},
    change: {daily: 3, weekly: -1, monthly: 1, alltime: 2}
  },
  {
    name: "Sarah",
    username: "@sarah",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Sarah&backgroundColor=18181b&fontFamily=Arial",
    live: true,
    hours: {daily: 4.2, weekly: 27.7, monthly: 86.8, alltime: 480},
    diamonds: {daily: 195400, weekly: 1018000, monthly: 2970000, alltime: 9400000},
    change: {daily: 1, weekly: 3, monthly: 0, alltime: 1}
  },
  {
    name: "Desii",
    username: "@desii",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Desii&backgroundColor=18181b&fontFamily=Arial",
    live: false,
    hours: {daily: 3.7, weekly: 23.1, monthly: 78.4, alltime: 410},
    diamonds: {daily: 164900, weekly: 884000, monthly: 2410000, alltime: 8100000},
    change: {daily: -2, weekly: 0, monthly: 2, alltime: -1}
  },
  {
    name: "Ark",
    username: "@ark",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Ark&backgroundColor=18181b&fontFamily=Arial",
    live: false,
    hours: {daily: 3.2, weekly: 20.8, monthly: 71.5, alltime: 360},
    diamonds: {daily: 142200, weekly: 731000, monthly: 2030000, alltime: 6700000},
    change: {daily: 2, weekly: -2, monthly: 0, alltime: 2}
  },
  {
    name: "Creator Eight",
    username: "@creator8",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Creator+Eight&backgroundColor=18181b&fontFamily=Arial",
    live: false,
    hours: {daily: 2.9, weekly: 18.5, monthly: 65.8, alltime: 320},
    diamonds: {daily: 118500, weekly: 612000, monthly: 1780000, alltime: 5200000},
    change: {daily: 0, weekly: 1, monthly: -1, alltime: 0}
  }
];

let currentPeriod = "daily";
let searchTerm = "";

const podiumEl = document.querySelector("#podium");
const rowsEl = document.querySelector("#leaderboardRows");
const rowTemplate = document.querySelector("#rowTemplate");
const periodDiamondsEl = document.querySelector("#periodDiamonds");
const liveCreatorsEl = document.querySelector("#liveCreators");
const networkCreatorsEl = document.querySelector("#networkCreators");

const formatNum = value => new Intl.NumberFormat("en-US", {maximumFractionDigits: 0}).format(value);
const compactNum = value => new Intl.NumberFormat("en-US", {notation:"compact", maximumFractionDigits:1}).format(value);

function rankedCreators() {
  return [...creators].sort((a,b) => b.diamonds[currentPeriod] - a.diamonds[currentPeriod]);
}

function getVisibleCreators() {
  return rankedCreators().filter(c => `${c.name} ${c.username}`.toLowerCase().includes(searchTerm.toLowerCase()));
}

function changeMarkup(change) {
  if (change > 0) return `<span class="change-up">▲ ${change}</span>`;
  if (change < 0) return `<span class="change-down">▼ ${Math.abs(change)}</span>`;
  return `<span>—</span>`;
}

function renderPodium() {
  const top = rankedCreators().slice(0,3);
  const displayOrder = [top[1], top[0], top[2]];
  const ranks = [2,1,3];
  podiumEl.innerHTML = "";

  displayOrder.forEach((c, i) => {
    if (!c) return;
    const rank = ranks[i];
    const card = document.createElement("article");
    card.className = `podium-card ${rank===1 ? "first" : ""}`;
    card.style.setProperty("--podiumGlow", rank===1 ? "rgba(244,59,67,.20)" : "rgba(255,255,255,.05)");
    card.innerHTML = `
      <span class="place-badge">#${rank}</span>
      <div class="podium-avatar-wrap">
        <img class="podium-avatar" src="${c.avatar}" alt="${c.name}">
        ${c.live ? `<span class="podium-live">LIVE</span>` : ""}
      </div>
      <h3>${c.name}</h3>
      <span class="handle">${c.username}</span>
      <div class="podium-score">${compactNum(c.diamonds[currentPeriod])} <span>💎</span></div>
      <span class="mini-change">${c.hours[currentPeriod]} live hrs</span>
    `;
    podiumEl.appendChild(card);
  });
}

function renderRows() {
  const visible = getVisibleCreators();
  rowsEl.innerHTML = "";

  visible.forEach((c) => {
    const actualRank = rankedCreators().findIndex(x => x.username === c.username) + 1;
    const node = rowTemplate.content.cloneNode(true);
    const row = node.querySelector(".leader-row");
    const rank = node.querySelector(".rank-cell");
    rank.textContent = `#${actualRank}`;
    if (actualRank <= 3) rank.classList.add("top-rank");

    const avatarWrap = node.querySelector(".avatar-wrap");
    if (c.live) avatarWrap.classList.add("is-live");

    const img = node.querySelector(".avatar");
    img.src = c.avatar;
    img.alt = c.name;

    node.querySelector(".display-name").textContent = c.name;
    node.querySelector(".username").textContent = c.username;
    node.querySelector(".hours-cell").textContent = `${c.hours[currentPeriod]} hrs`;
    node.querySelector(".change-cell").innerHTML = changeMarkup(c.change[currentPeriod]);
    node.querySelector(".diamond-value").textContent = formatNum(c.diamonds[currentPeriod]);

    rowsEl.appendChild(node);
  });
}

function renderStats(){
  networkCreatorsEl.textContent = creators.length;
  liveCreatorsEl.textContent = creators.filter(c => c.live).length;
  const total = creators.reduce((sum,c) => sum + c.diamonds[currentPeriod],0);
  periodDiamondsEl.textContent = compactNum(total);
}

function render(){
  renderPodium();
  renderRows();
  renderStats();
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentPeriod = tab.dataset.period;
    document.querySelector("#resetLabel").textContent =
      `${tab.textContent.toUpperCase()} RANKINGS RESET IN`;
    render();
  });
});

document.querySelector("#searchInput").addEventListener("input", e => {
  searchTerm = e.target.value;
  renderRows();
});

document.querySelector("#copyLinkBtn").addEventListener("click", async () => {
  const btn = document.querySelector("#copyLinkBtn");
  try {
    await navigator.clipboard.writeText(location.href);
    btn.textContent = "Copied";
    setTimeout(() => btn.textContent = "Share", 1500);
  } catch {
    btn.textContent = "Copy unavailable";
    setTimeout(() => btn.textContent = "Share", 1500);
  }
});

function updateCountdown() {
  const now = new Date();
  let target = new Date();

  if (currentPeriod === "daily") {
    target.setHours(24,0,0,0);
  } else if (currentPeriod === "weekly") {
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    target.setDate(now.getDate() + daysUntilMonday);
    target.setHours(0,0,0,0);
  } else if (currentPeriod === "monthly") {
    target = new Date(now.getFullYear(), now.getMonth()+1, 1);
  } else {
    document.querySelector("#countdown").textContent = "NO RESET";
    return;
  }

  let diff = Math.max(0, target-now);
  const h = Math.floor(diff / 3600000);
  diff -= h*3600000;
  const m = Math.floor(diff / 60000);
  diff -= m*60000;
  const s = Math.floor(diff / 1000);
  document.querySelector("#countdown").textContent =
    `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

setInterval(updateCountdown,1000);
updateCountdown();
render();
