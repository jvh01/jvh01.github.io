const fetch = require('node-fetch');
const {isProdEnv} = require('./env.js');


// Collab room
const DEV_HOOK = 'https://discordapp.com/api/webhooks/493397697730969620/UuT90WGu-_JGNfKFTiiKgA0vhn3tz-i4WuX7kLBBvay57TvZLAmHE7txs4mIedQFdSkO';

// Challenge room
const CHALLENGE_NOTIFIER = 'https://discordapp.com/api/webhooks/392064778526261248/MKdy9TdI7AUTUZ_a7CEOr7u9HsRbDAIwSfXq85SYWt2PS9cLaWXtM8aFYBOgOVhQIqtc';

const hookurl = isProdEnv() ? CHALLENGE_NOTIFIER : DEV_HOOK;


// https://anidiotsguide_old.gitbooks.io/discord-js-bot-guide/content/examples/using-embeds-in-messages.html
function sendNewChallengeNotification(
  challengeName, challengeUrl, reward, problemType, rankingType, duration, statement,
  authorUsername, authorAvatar, featured, challengeId
  ) {
  console.log('Sending discord notification.');
  fetch(hookurl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: '<@&493536203447074826>',
      embeds: [
      {
        color: 0xfebe1e,
        title: challengeName,
        url: challengeUrl,
        description: statement,
        author: {
          name: authorUsername,
          icon_url: authorAvatar
        },
        fields: [
          {
            name: "Reward",
            value: reward,
            inline: true,
          },
          {
            name: "Duration",
            value: duration,
            inline: true,
          },
          {
            name: "Featured",
            value: featured,
            inline: true,
          },
          {
            name: "Problem Type",
            value: problemType,
            inline: true,
          },
          {
            name: "Ranking Type",
            value: rankingType,
            inline: true,
          },
          {
            name: "Challenge ID",
            value: challengeId,
            inline: true,
          },
        ],
        footer: {
          text: 'Have suggestions? Bug reports? Send them to @builder',
          icon_url: 'https://cdn.discordapp.com/emojis/493515691941560333.png?v=1'
        },
        timestamp: new Date(),
      }
    ]})
  }).then((response) => {
    console.debug(response);
  });
}

function sendMessage(message) {
  console.log('Sending discord message.');
  fetch(hookurl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: message
    })
  }).then((response) => {
    console.debug(response);
  });
}

module.exports = {
    sendNewChallengeNotification,
    sendMessage,
};
