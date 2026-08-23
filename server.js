const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://flight28agency.github.io"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
  next();
});


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
const processedEvents = new Set();



app.get("/health", (req, res) => {
  res.json({
    status: "Flight28 tracker online"
  });
});



async function saveGift(username, giftName, diamonds) {

  if (!diamonds || diamonds <= 0) return;


  const { error } = await supabase
    .from("gift_events")
    .insert({
      creator_username: username,
      diamonds,
      gift_name: giftName
    });


  if (error) {
    console.log(
      "Supabase error:",
      error.message
    );
    return;
  }


  console.log(
    `${username} +${diamonds} diamonds`
  );
}





function connectCreator(username) {

  const wsUrl =
    "wss://ws.eulerstream.com" +
    `?apiKey=${encodeURIComponent(process.env.EULER_API_KEY)}` +
    `&uniqueId=${encodeURIComponent(username)}` +
    "&schemaVersion=v2" +
    "&features.bundleEvents=true" +
    "&features.rawMessages=false" +
    "&features.normalizeUniqueId=true";


  const ws = new WebSocket(wsUrl);



  ws.on("open", () => {

    console.log(
      `Connected to @${username}`
    );

  });



  ws.on("message", (data) => {

    try {

      const payload =
        JSON.parse(data.toString());


      if (!payload.messages) {
        return;
      }


      payload.messages.forEach((event) => {


        const type =
          event.type ||
          event.event ||
          "";


        console.log(
          `@${username} EVENT:`,
          type
        );


        if (
          type
            .toLowerCase()
            .includes("live")
        ) {
          liveCreators.add(username);
        }



        if (
          !type
            .toLowerCase()
            .includes("gift")
        ) {
          return;
        }



        const gift =
          event.data || event;



        const giftName =
          gift.giftName ||
          gift.giftDetails?.giftName ||
          "TikTok Gift";



        const diamonds =
          Number(
            gift.diamondCount ||
            gift.giftDetails?.diamondCount ||
            0
          );



        const id =
          `${username}-${giftName}-${diamonds}`;



        if (processedEvents.has(id)) {
          return;
        }


        processedEvents.add(id);



        console.log(
          `GIFT @${username}: ${giftName} ${diamonds}`
        );



        saveGift(
          username,
          giftName,
          diamonds
        );


      });


    } catch (err) {

      console.log(
        "Parse error:",
        err.message
      );

    }

  });



  ws.on("close", (code) => {

    console.log(
      `Disconnected @${username} code ${code}`
    );

    liveCreators.delete(username);

  });



  ws.on("error", (err) => {

    console.log(
      `WebSocket error @${username}:`,
      err.message
    );

  });

}




creators.forEach(connectCreator);






app.get("/api/leaderboard", async (req, res) => {


  const { data, error } =
    await supabase
      .from("gift_events")
      .select(
        "creator_username, diamonds, created_at"
      );



  if (error) {

    return res
      .status(500)
      .json({
        error: error.message
      });

  }



  const totals = {};



  for (const row of data || []) {

    if (!totals[row.creator_username]) {
      totals[row.creator_username] = 0;
    }


    totals[row.creator_username] +=
      Number(row.diamonds || 0);

  }




  const leaderboard =
    Object.entries(totals)
      .map(([username, diamonds]) => ({
        username,
        diamonds,
        live: liveCreators.has(username)
      }))
      .sort(
        (a, b) =>
          b.diamonds - a.diamonds
      );



  res.json(leaderboard);


});






app.listen(PORT, () => {

  console.log(
    `Flight28 tracker running on port ${PORT}`
  );

});
