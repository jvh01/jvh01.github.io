const he = require('he');
const showdown  = require('showdown');
const htmlConverter = new showdown.Converter();

const {Connection} = require('./connection');
const {
  sendTestCasesFile,
  sendNewChallengeNotification,
  sendProblemStatementFile,
} = require('./discord_webhook.js');
const {isProdEnv} = require('./env.js');
const {ellipsis} = require('./utils.js');
const {GetDetailsRequest} = require('./messages/challengeService.js');
const {GetUsersRequest} = require('./messages/userService.js');
const {GetSampleTestsByTaskIdRequest} = require('./messages/task.js');

var log = (...args) => console.log('[' + new Date().toJSON() + ']', ...args);

/** Default connection for general requests */
Connection.general = new Connection({
  username: null,  // credentials are not required for checking challenges
  passHash: null,
});

// Challenge list monitoring
var seenTaskIds = new Set();
const COMMON_CONFIG = {
  type: 'challenges',
  tab: 'all',
  difficulty: 'all',
  generalType: 'all',
  offset: 0,
  limit: 1
}

function checkLatestChallenge(config = {}, discord_tag='<tag placeholder>') {
  var data = {
    msg: 'method',
    method: 'getUserFeed',
    params: [{
      ...COMMON_CONFIG,
      ...config,
    }]
  };

  Connection.general.send(data, (response) => {
    let challenge = null;

    try {
      challenge = response.feed[0].challenge;
    } catch (err) {
      log(response);
      log(err);
      return;
    }

    if (!challenge.taskId) return;

    log(`Latest taskId: ${challenge.taskId}`);

    log('checking seenTaskIds', seenTaskIds);
    if (seenTaskIds.has(challenge.taskId)) return;
    seenTaskIds.add(challenge.taskId);
    log('updated seenTaskIds', seenTaskIds);

    const secondsElapsed = (Date.now() - challenge.date) / 1000;
    log('secondsElapsed:', secondsElapsed);

    if (secondsElapsed < 60*30) {
      Connection.general.send(
        GetUsersRequest([challenge.authorId]),
        (response) => {
          const {username, avatar} = response[0];
          Connection.general.send(
            GetDetailsRequest(challenge._id),
            (response) => {
              const {description, difficulty, io: {input, output}} = response.task;

              let problem = description + '\n'
              + input.map(param => `\`${param.name}\` {${param.type}}: ${param.description}`).join`\n`
              + `\n\noutput {${output.type}}: ${output.description}\n`;

              problem = he.decode(problem.replace(/<\/?code>/g, '`'));
              let problemHtml = '<html><head><meta charset="UTF-8"></head><body>'
                + htmlConverter.makeHtml(problem, { tables: true }) + '</body></html>';

              console.log(problem);

              sendNewChallengeNotification(
                challenge.name,
                `https://app.codesignal.com/challenge/${challenge._id}`,
                challenge.reward && `${challenge.reward} coins`,
                challenge.generalType,
                challenge.type,
                `${challenge.duration / 1000 / 3600 / 24} days`,
                ellipsis(problem, 2048),
                username,
                avatar,
                challenge.visibility,
                `[${challenge._id}](https://app.codesignal.com/challenge/${challenge._id})`,
                difficulty ? `${difficulty}` : null,
                discord_tag,
              );

              setTimeout(function() {
                sendProblemStatementFile(challenge.name, problemHtml);
              }, 500);

              Connection.general.send(
                GetSampleTestsByTaskIdRequest(challenge.taskId),
                (tests) => {
                  data = '';
                  tests.map(test => {
                    if (!test.isHidden && !test.truncated) {
                      data += `${JSON.stringify(test.input)}\n${JSON.stringify(test.output)}\n\n`;
                    }
                  });
                  setTimeout(function() {
                    sendTestCasesFile(challenge.name, data);
                  }, 1000);
                }
              );

              log(challenge);
            }
          );
        }
      )
    }
  });
}

if (isProdEnv()) {
  Connection.general.on('connect', () => {
    setInterval(function () { checkLatestChallenge({}, '<@&493536203447074826>'); }, 5000);
    setInterval(function () { checkLatestChallenge({ tab: 'community' }, '<@&547589061909413926>'); }, 9000);
  });
} else {
  Connection.general.on('connect', function () { checkLatestChallenge({}, '<official_challenge_tag>'); });
  Connection.general.on('connect', function () { checkLatestChallenge({ tab: 'community' }, '<community_challenge_tag>'); });
}
