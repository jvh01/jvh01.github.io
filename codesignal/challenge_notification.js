const {Connection} = require('./connection');
const {sendNewChallengeNotification} = require('./discord_webhook.js');
const {GetUsersRequest} = require('./users.js');
const {ellipsis} = require('./utils.js');

var log = console.log

/** Default connection for general requests */
Connection.general = new Connection({
  username: 'user',  // credentials are not required for checking challenges
  passHash: '123',
});

// Challenge list monitoring
var seenChallengeIds = new Set();

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

    if (!challenge.taskId) return;

    log(`Latest challenge: ${challenge._id}`);

    if (seenChallengeIds.has(challenge.taskId)) return;

    log(challenge);

    lastChallengeId = challenge.taskId;
    const secondsElapsed = (Date.now() - challenge.date) / 1000;

    if (secondsElapsed < 60) {
      Connection.general.send(
        GetUsersRequest([challenge.authorId]),
        (response) => {
          const {username, avatar} = response[0];
          if (seenChallengeIds.has(challenge.taskId)) return;
          sendNewChallengeNotification(
            challenge.name,
            `https://app.codesignal.com/challenge/${challenge._id}`,
            `${challenge.reward} coins`,
            challenge.generalType,
            challenge.type,
            `${challenge.duration / 1000 / 3600 / 24} days`,
            ellipsis(challenge.task.description, 2048),
            username,
            avatar,
            challenge.featured,
            `[${challenge._id}](https://app.codesignal.com/challenge/${challenge._id})`,
          );
          seenChallengeIds.add(challenge.taskId);
        }
      )
    }
  });
}

Connection.general.on('connect', () => {setInterval(checkLatestChallenge, 2500)});
