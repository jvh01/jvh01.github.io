const fetch = require("node-fetch");

const hookurl = 'https://discordapp.com/api/webhooks/392064778526261248/MKdy9TdI7AUTUZ_a7CEOr7u9HsRbDAIwSfXq85SYWt2PS9cLaWXtM8aFYBOgOVhQIqtc'

function sendNewChallengeNotification(challengeName, challengeUrl, reward, type, duration) {
  console.log('Sending discord notification.');
  fetch(hookurl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({embeds: [
    {
    color: 3447003,
    title: challengeName,
    url: challengeUrl,
    description: "A new challenge has appeared!",
    fields: [{
        name: "Reward",
        value: reward,
      },
      {
        name: "Challenge Type",
        value: type
      },
      {
        name: "Duration",
        value: duration
      }
    ],
    timestamp: new Date(),
    }
    ]})
  });
}

module.exports = {
    sendNewChallengeNotification
};
