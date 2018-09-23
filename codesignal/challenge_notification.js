const {Connection} = require('./connection');
const {sendNewChallengeNotification} = require('./discord_webhook.js')

log = console.log

/** Default connection for general requests */
Connection.general = new Connection({
  username: process.env.CSUSER,
  passHash: process.env.CSPASS,
});

// Challenge list monitoring
var lastChallengeId = null;

function checkLatestChallenge() {
  var data = {
    msg: 'method',
    method: 'getUserFeed',
    params: [{
      type: 'challenges',
      tab: 'all',
      difficulty: 'all',
      generalType: 'all',
      offset: 0,
      limit: 1
    }]
  };

  Connection.general.send(data, (response) => {
    const challenge = response.feed[0].challenge;
    if (lastChallengeId == challenge.taskId) return;

    log(challenge);

    lastChallengeId = challenge.taskId;
    const secondsElapsed = (Date.now() - challenge.date) / 1000;

    if (secondsElapsed < 60) {
      sendNewChallengeNotification(
        challenge.name,
        `https://app.codesignal.com/challenge/${challenge._id}`,
        `${challenge.reward} coins`,
        `${challenge.generalType} - ${challenge.type}`,
        `${challenge.duration / 1000 / 3600 / 24} days`,
      );
    }
  });
}

Connection.general.on('connect', () => {setInterval(checkLatestChallenge, 2000)});