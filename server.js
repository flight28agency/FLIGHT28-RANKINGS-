const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");
const axios = require("axios");

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


console.log(
  "Supabase URL loaded:",
  !!process.env.SUPABASE_URL
);

console.log(
  "Service key loaded:",
  !!process.env.SUPABASE_SERVICE_ROLE_KEY
);


let creators = [];


/*
LOAD CREATORS
*/

async function loadCreators() {

  const { data, error } =
    await supabase
      .from("creators")
      .select(
        "username, avatar_url"
      );


  if (error) {

    console.log(
      "Creator load error:",
      error.message
    );

    return;
  }


  creators = data.map(
    (creator) =>
      creator.username
  );


  console.log(
    "Loaded creators:",
    creators
  );
}


/*
UPDATE CREATOR AVATARS
*/

async function updateCreatorAvatars() {

  const {
    data: creatorsData,
    error
  } =
    await supabase
      .from("creators")
      .select(
        "id, username, avatar_url"
      );


  if (error) {

    console.log(
      "Avatar load error:",
      error.message
    );

    return;
  }


  for (
    const creator of creatorsData
  ) {

    try {

      if (creator.avatar_url) {
        continue;
      }


      const response =
        await axios.get(
          `https://www.tiktok.com/@${creator.username}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0"
            }
          }
        );


      const html =
        response.data;


      const match =
        html.match(
          /"avatarLarger":"(.*?)"/
        );


      if (!match) {

        console.log(
          `No avatar found for @${creator.username}`
        );

        continue;
      }


      const avatarUrl =
        match[1].replace(
          /\\u002F/g,
          "/"
        );


      await supabase
        .from("creators")
        .update({

          avatar_url:
            avatarUrl,

          avatar_updated_at:
            new Date()

        })
        .eq(
          "id",
          creator.id
        );


      console.log(
        `Updated avatar @${creator.username}`
      );


    } catch (err) {

      console.log(
        `Avatar error @${creator.username}:`,
        err.message
      );

    }
  }
}


/*
CONNECTION TRACKING
*/

const liveCreators =
  new Set();

const processedEvents =
  new Map();

const creatorConnections =
  new Map();

const reconnectTimers =
  new Map();


/*
SAVE DAILY RANKING HISTORY
*/

async function saveDailyHistory() {

  const { data, error } =
    await supabase
      .from("daily_leaderboard")
      .select(
        "username, daily_diamonds"
      )
      .order(
        "daily_diamonds",
        {
          ascending: false
        }
      );


  if (error) {

    console.log(
      "Daily history load error:",
      error.message
    );

    return;
  }


  const today =
    new Date()
      .toISOString()
      .split("T")[0];


  const rows =
    data.map(
      (creator, index) => ({

        username:
          creator.username,

        diamonds:
          Number(
            creator.daily_diamonds ||
            0
          ),

        rank:
          index + 1,

        date:
          today

      })
    );


  if (
    rows.length === 0
  ) {

    console.log(
      "No daily rankings to save."
    );

    return;
  }


  const {
    error: insertError
  } =
    await supabase
      .from("daily_history")
      .insert(rows);


  if (insertError) {

    console.log(
      "Daily history save error:",
      insertError.message
    );

    return;
  }


  console.log(
    "Daily ranking history saved."
  );
}


/*
RESET DAILY LEADERBOARD
*/

async function resetDailyLeaderboard() {

  const { error } =
    await supabase
      .from("daily_leaderboard")
      .update({

        daily_diamonds: 0,

        updated_at:
          new Date()

      });


  if (error) {

    console.log(
      "Daily reset error:",
      error.message
    );

    return;
  }


  console.log(
    "Daily leaderboard reset."
  );
}


/*
RESET WEEKLY LEADERBOARD
*/

async function resetWeeklyLeaderboard() {

  const { error } =
    await supabase
      .from("daily_leaderboard")
      .update({

        weekly_diamonds: 0,

        updated_at:
          new Date()

      });


  if (error) {

    console.log(
      "Weekly reset error:",
      error.message
    );

    return;
  }


  console.log(
    "Weekly leaderboard reset."
  );
}


/*
HEALTH CHECK
*/

app.get(
  "/health",
  (req, res) => {

    res.json({
      status:
        "Flight28 tracker online"
    });

  }
);


/*
SAVE GIFT + UPDATE LEADERBOARD
*/

async function saveGift(
  username,
  giftName,
  diamonds
) {

  diamonds =
    Number(
      diamonds || 0
    );


  if (
    diamonds <= 0
  ) {
    return;
  }


  /*
  SAVE GIFT EVENT
  */

  const { error } =
    await supabase
      .from("gift_events")
      .insert({

        creator_username:
          username,

        diamonds:
          diamonds,

        gift_name:
          giftName ||
          "TikTok Gift"

      });


  if (error) {

    console.log(
      `Supabase gift error @${username}:`,
      error.message
    );

    return;
  }


  /*
  GET CURRENT TOTALS
  */

  const {
    data: existing,
    error: findError
  } =
    await supabase
      .from("daily_leaderboard")
      .select(
        "daily_diamonds, weekly_diamonds"
      )
      .eq(
        "username",
        username
      )
      .maybeSingle();


  if (findError) {

    console.log(
      "Leaderboard lookup error:",
      findError.message
    );

  }


  /*
  UPDATE EXISTING CREATOR
  */

  if (existing) {

    await supabase
      .from("daily_leaderboard")
      .update({

        daily_diamonds:
          Number(
            existing.daily_diamonds ||
            0
          ) +
          diamonds,

        weekly_diamonds:
          Number(
            existing.weekly_diamonds ||
            0
          ) +
          diamonds,

        updated_at:
          new Date()

      })
      .eq(
        "username",
        username
      );


  } else {

    /*
    CREATE CREATOR LEADERBOARD ROW
    */

    await supabase
      .from("daily_leaderboard")
      .insert({

        username:
          username,

        daily_diamonds:
          diamonds,

        weekly_diamonds:
          diamonds,

        updated_at:
          new Date()

      });

  }


  console.log(
    `${username} +${diamonds} diamonds`
  );
}


/*
SCHEDULE RECONNECT
*/

function scheduleReconnect(
  username,
  delay = 30000
) {

  if (
    reconnectTimers.has(
      username
    )
  ) {
    return;
  }


  console.log(
    `Retrying @${username} in ${delay / 1000} seconds`
  );


  const timer =
    setTimeout(
      () => {

        reconnectTimers.delete(
          username
        );

        connectCreator(
          username
        );

      },
      delay
    );


  reconnectTimers.set(
    username,
    timer
  );
}


/*
CONNECT CREATOR TO EULERSTREAM
*/

function connectCreator(
  username
) {

  const oldConnection =
    creatorConnections.get(
      username
    );


  if (
    oldConnection &&
    (
      oldConnection.readyState ===
        WebSocket.OPEN ||
      oldConnection.readyState ===
        WebSocket.CONNECTING
    )
  ) {

    return;
  }


  const wsUrl =
    "wss://ws.eulerstream.com" +
    `?apiKey=${encodeURIComponent(process.env.EULER_API_KEY)}` +
    `&uniqueId=${encodeURIComponent(username)}` +
    "&schemaVersion=v2" +
    "&features.bundleEvents=true" +
    "&features.rawMessages=false" +
    "&features.normalizeUniqueId=true";


  const ws =
    new WebSocket(
      wsUrl
    );


  creatorConnections.set(
    username,
    ws
  );


  /*
  CONNECTED
  */

  ws.on(
    "open",
    () => {

      console.log(
        `Connected to @${username}`
      );

    }
  );


  /*
  RECEIVE TIKTOK EVENTS
  */

  ws.on(
    "message",
    (data) => {

      try {

        const payload =
          JSON.parse(
            data.toString()
          );


        if (
          !Array.isArray(
            payload.messages
          )
        ) {

          return;
        }


        for (
          const event of
          payload.messages
        ) {

          const type =
            String(
              event.type ||
              event.event ||
              ""
            );


          const lowerType =
            type.toLowerCase();


          /*
          MARK CREATOR LIVE
          */

          if (
            lowerType.includes(
              "liveintro"
            ) ||
            lowerType.includes(
              "roommessage"
            ) ||
            lowerType.includes(
              "roomuserseq"
            ) ||
            lowerType.includes(
              "member"
            ) ||
            lowerType.includes(
              "gift"
            )
          ) {

            liveCreators.add(
              username
            );

          }


          /*
          IGNORE NON-GIFT EVENTS
          */

          if (
            !lowerType.includes(
              "gift"
            )
          ) {

            continue;
          }


          const gift =
            event.data ||
            event;


          const giftDetails =
            gift.giftDetails ||
            gift.gift ||
            {};


          const giftName =
            gift.giftName ||
            giftDetails.giftName ||
            giftDetails.name ||
            "TikTok Gift";


          const diamondCount =
            Number(
              gift.diamondCount ||
              giftDetails.diamondCount ||
              giftDetails.diamond_count ||
              0
            );


          if (
            diamondCount <= 0
          ) {

            continue;
          }


          const messageId =
            gift.msgId ||
            gift.messageId ||
            gift.common?.msgId ||
            event.msgId ||
            event.messageId ||
            null;


          const repeatCount =
            Number(
              gift.repeatCount ||
              gift.repeat_count ||
              1
            );


          const repeatEnd =
            gift.repeatEnd ??
            gift.repeat_end ??
            gift.isFinal ??
            gift.is_final ??
            true;


          /*
          WAIT FOR FINAL STREAK EVENT
          */

          if (
            repeatCount > 1 &&
            repeatEnd === false
          ) {

            continue;
          }


          /*
          BUILD UNIQUE EVENT KEY
          */

          const eventKey =
            messageId
              ? `${username}:${messageId}`
              : `${username}:${giftName}:${diamondCount}:${repeatCount}`;


          /*
          PREVENT DUPLICATE GIFTS
          */

          if (
            processedEvents.has(
              eventKey
            )
          ) {

            continue;
          }


          processedEvents.set(
            eventKey,
            Date.now()
          );


          setTimeout(
            () => {

              processedEvents.delete(
                eventKey
              );

            },
            120000
          );


          /*
          IMPORTANT:
          DO NOT MULTIPLY BY REPEAT COUNT
          */

          const totalDiamonds =
            diamondCount;


          console.log(
            `GIFT @${username}: ${giftName} ${totalDiamonds}`
          );


          saveGift(
            username,
            giftName,
            totalDiamonds
          );

        }


      } catch (err) {

        console.log(
          `Message error @${username}:`,
          err.message
        );

      }

    }
  );


  /*
  CONNECTION CLOSED
  */

  ws.on(
    "close",
    (code) => {

      creatorConnections.delete(
        username
      );


      liveCreators.delete(
        username
      );


      /*
      CREATOR NOT LIVE
      */

      if (
        code === 4404
      ) {

        console.log(
          `@${username} not detected LIVE yet. Retrying automatically.`
        );


        scheduleReconnect(
          username,
          30000
        );


        return;
      }


      /*
      LIVE ENDED
      */

      if (
        code === 4005
      ) {

        console.log(
          `@${username} LIVE ended. Retrying automatically.`
        );


        scheduleReconnect(
          username,
          30000
        );


        return;
      }


      /*
      CONNECTION INACTIVE
      */

      if (
        code === 4006
      ) {

        console.log(
          `@${username} connection inactive. Reconnecting.`
        );


        scheduleReconnect(
          username,
          10000
        );


        return;
      }


      /*
      CONNECTION LIMIT
      */

      if (
        code === 4429
      ) {

        console.log(
          `@${username} connection limit reached. Retrying in 60 seconds.`
        );


        scheduleReconnect(
          username,
          60000
        );


        return;
      }


      /*
      TIKTOK CLOSED CONNECTION
      */

      if (
        code === 4500
      ) {

        console.log(
          `TikTok closed @${username} connection. Retrying.`
        );


        scheduleReconnect(
          username,
          15000
        );


        return;
      }


      /*
      UNKNOWN DISCONNECT
      */

      console.log(
        `Disconnected @${username} code ${code}. Retrying.`
      );


      scheduleReconnect(
        username,
        30000
      );

    }
  );


  /*
  WEBSOCKET ERROR
  */

  ws.on(
    "error",
    (err) => {

      console.log(
        `WebSocket error @${username}:`,
        err.message
      );

    }
  );

}


/*
LOAD CREATORS + START CONNECTIONS
*/

loadCreators()
  .then(
    async () => {

      await updateCreatorAvatars();


      for (
        let i = 0;
        i < creators.length;
        i++
      ) {

        const username =
          creators[i];


        setTimeout(
          () => {

            connectCreator(
              username
            );

          },
          i * 3000
        );

      }

    }
  );


/*
LEADERBOARD API
*/

app.get(
  "/api/leaderboard",
  async (req, res) => {

    const {
      data,
      error
    } =
      await supabase
        .from(
          "daily_leaderboard"
        )
        .select(
          "username, daily_diamonds, weekly_diamonds"
        );


    const {
      data: creatorProfiles,
      error: creatorError
    } =
      await supabase
        .from("creators")
        .select(
          "username, avatar_url, display_name"
        );


    if (error) {

      console.log(
        "Leaderboard error:",
        error.message
      );


      return res
        .status(500)
        .json({
          error:
            error.message
        });

    }


    if (creatorError) {

      console.log(
        "Creator profile error:",
        creatorError.message
      );


      return res
        .status(500)
        .json({
          error:
            creatorError.message
        });

    }


    const leaderboard =
      creators
        .map(
          (username) => {

            const creator =
              data?.find(
                (row) =>
                  row.username ===
                  username
              );


            const profile =
              creatorProfiles?.find(
                (profile) =>
                  profile.username ===
                  username
              );


            return {

              username,

              display_name:
                profile?.display_name ||
                username,

              avatar_url:
                profile?.avatar_url ||
                null,

              daily:
                creator?.daily_diamonds ||
                0,

              weekly:
                creator?.weekly_diamonds ||
                0,

              live:
                liveCreators.has(
                  username
                )

            };

          }
        )
        .sort(
          (a, b) =>
            b.daily - a.daily
        );


    res.json(
      leaderboard
    );

  }
);


/*
WEEKLY RESET TIMER
*/

setInterval(
  () => {

    const now =
      new Date();


    if (
  now.getHours() === 0 &&
  now.getMinutes() === 0
) {

  saveDailyHistory()
    .then(() => {

      resetDailyLeaderboard();

    });

}

  },
  60000
);


/*
START SERVER
*/

app.listen(
  PORT,
  () => {

    console.log(
      `Flight28 tracker running on port ${PORT}`
    );

  }
);
