const {Connection} = require('./connection');
const {sendNewChallengeNotification} = require('./discord_webhook.js')
const {ellipsis} = require('./utils.js')

var log = console.log

/** Default connection for general requests */
Connection.general = new Connection({
  username: 'user',  // credentials are not required for checking challenges
  passHash: '123',
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
      limit: 2
    }]
  };

  Connection.general.send(data, (response) => {
    const challenge = response.feed[1].challenge;

    log(`Latest challenge: ${challenge._id}`);

    if (lastChallengeId == challenge.taskId) return;

    log(challenge);

    lastChallengeId = challenge.taskId;
    const secondsElapsed = (Date.now() - challenge.date) / 1000;

    if (secondsElapsed < 60) {
      sendNewChallengeNotification(
        challenge.name,
        `https://app.codesignal.com/challenge/${challenge._id}`,
        `${challenge.reward} coins`,
        `${challenge.generalType} / ${challenge.type}`,
        `${challenge.duration / 1000 / 3600 / 24} days`,
        ellipsis(challenge.task.description, 2048)
      );
    }
  });
}

Connection.general.on('connect', () => {setInterval(checkLatestChallenge, 2000)});
