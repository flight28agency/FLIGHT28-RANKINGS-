const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { TikTokLiveConnection } = require("tiktok-live-connector");
const WebSocket = require("ws");
const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://flight28agency.github.io");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const creators = [
  "crymakesvideos",
  "frcohen40",
  "__eacxo",
  "kaitlynnalexx13"
];

const liveCreators = new Set();
const processedGiftEvents = new Map();
app.use(express.static(__dirname));

app.get("/health", (req, res) => {
  res.json({ status: "Flight28 tracker online" });
});

async function saveGift(username, gift) {
  const diamonds =
    Number(gift.diamondCount || 0) *
    Number(gift.repeatCount || 1);

  if (diamonds <= 0) return;

  const { error } = await supabase
    .from("gift_events")
    .insert({
      creator_username: username,
      diamonds,
      gift_name: gift.giftName || "TikTok Gift"
    });

  if (error) {
    console.error(`Supabase error for ${username}:`, error.message);
    return;
  }

  console.log(`${username} +${diamonds} diamonds`);
}

function connectCreator(username) {
  const wsUrl =
    `wss://ws.eulerstream.com?uniqueId=${encodeURIComponent(username)}&apiKey=${encodeURIComponent(process.env.EULER_API_KEY)}`;

  const ws = new WebSocket(wsUrl);

  ws.on("open", () => {
    console.log(`WebSocket opened for @${username}`);
    liveCreators.add(username);
  });

ws.on("message", data => {
  try {
    const payload = JSON.parse(data.toString());

    if (payload && payload.messages) {
      payload.messages.forEach(msg => {
     const eventType =
  msg.event ||
  msg.type ||
  msg.eventType ||
  msg.method ||
  msg.messageType ||
  "UNKNOWN";

if (eventType.toLowerCase().includes("gift")) {
  const gift = msg.data || msg;
  
  const eventId =
  gift.msgId ||
  gift.messageId ||
  gift.common?.msgId ||
  msg.msgId ||
  msg.messageId;

}

  const giftName =
    gift.giftDetails?.giftName ||
    "TikTok Gift";

  const diamondCount = Number(
    gift.giftDetails?.diamondCount || 0
  );

 const repeatCount = Number(
  gift.repeatCount || 1
);

const key = `${username}:${giftName}:${diamondCount}:${repeatCount}`;

if (processedGiftEvents.has(key)) {
   return;
 }

processedGiftEvents.set(key, Date.now());

setTimeout(() => {
  processedGiftEvents.delete(key);
}, 60000);

// TikTok combo gifts send cumulative repeat counts.
// TikTok combo gifts send cumulative repeat counts.
// Count each event as ONE gift so we don't double-count the combo.
const diamonds = diamondCount;

console.log(
  `GIFT @${username}: ${giftName} | ${diamondCount} x ${repeatCount} = ${diamonds}`
);

if (diamonds > 0) {
  saveGift(username, {
    diamondCount,
    repeatCount: 1,
    giftName
  });
}
});
} catch (err) {
  console.log(`Could not parse event for @${username}:`, err.message);
}
  console.log(`Could not parse event for @${username}:`, err.message);
}

  ws.on("close", (code, reason) => {
    console.log(`WebSocket closed for @${username}:`, code, reason.toString());
    liveCreators.delete(username);
  });

  ws.on("error", err => {
    console.log(`WebSocket error for @${username}:`, err.message);
  });
}
creators.forEach(connectCreator);

app.get("/api/leaderboard", async (req, res) => {
  const { data, error } = await supabase
    .from("gift_events")
    .select("creator_username, diamonds, created_at");

  if (error) {
    console.error("Leaderboard error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  const totals = {};

  for (const gift of data || []) {
    const username = gift.creator_username;

    if (!totals[username]) {
      totals[username] = 0;
    }

    totals[username] += Number(gift.diamonds || 0);
  }

  const leaderboard = Object.entries(totals)
    .map(([username, diamonds]) => ({
username,
diamonds,
live: liveCreators.has(username)
    }))
    .sort((a, b) => b.diamonds - a.diamonds);

  res.json(leaderboard);
});

app.listen(PORT, () => {
  console.log(`Flight28 tracker running on port ${PORT}`);
});
