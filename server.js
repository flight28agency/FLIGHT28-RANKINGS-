const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { TikTokLiveConnection } = require("tiktok-live-connector");
const app = express();
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
  const connection = new TikTokLiveConnection(username, {
    enableExtendedGiftInfo: true
  });

  connection.connect()
    .then(state => {
      console.log(`Connected to @${username}`, state.roomId);
    })
    .catch(err => {
      console.log(`@${username} offline/unavailable:`, err.message);
    });

  connection.on("gift", gift => {
    // Streakable gifts fire multiple events. Only save when streak ends.
    if (gift.giftType === 1 && !gift.repeatEnd) return;

    saveGift(username, gift);
  });

  connection.on("disconnected", () => {
    console.log(`Disconnected from @${username}`);

    setTimeout(() => {
      connectCreator(username);
    }, 30000);
  });
}

creators.forEach(connectCreator);

app.listen(PORT, () => {
  console.log(`Flight28 tracker running on port ${PORT}`);
});
