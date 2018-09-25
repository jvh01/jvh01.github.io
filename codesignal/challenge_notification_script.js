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

var log = console.log

/** Default connection for general requests */
Connection.general = new Connection({
  username: null,  // credentials are not required for checking challenges
  passHash: null,
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

    log(`Latest taskId: ${challenge.taskId}`);

    console.log('checking seen taskIds', seenChallengeIds);
    if (seenChallengeIds.has(challenge.taskId)) return;
    seenChallengeIds.add(challenge.taskId);
    console.log('updated seenChallengeIds', seenChallengeIds);

    const secondsElapsed = (Date.now() - challenge.date) / 1000;
    console.log('secondsElapsed:', secondsElapsed);

    if (secondsElapsed < 60) {
      Connection.general.send(
        GetUsersRequest([challenge.authorId]),
        (response) => {
          const {username, avatar} = response[0];
          Connection.general.send(
            GetDetailsRequest(challenge._id),
            (response) => {
              const {description, difficulty, io: {input, output}} = response.task;

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
                `${difficulty}`
              );

              const problem = description + '\n\n'
              + input.map(param=> (`${param.name} {${param.type}} ${param.description}\n\n`))
              + `output {${output.type}} ${output.description}\n`;
              sendProblemStatementFile(challenge.name, problem);

              Connection.general.send(
                GetSampleTestsByTaskIdRequest(challenge.taskId),
                (tests) => {
                  data = '';
                  tests.map(test => {
                    if (!test.isHidden && !test.truncated) {
                      data += `${JSON.stringify(test.input)}\n${JSON.stringify(test.output)}\n\n`;
                    }
                  });
                  sendTestCasesFile(challenge.name, data);
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

if (!isProdEnv()) {
  Connection.general.on('connect', () => {setInterval(checkLatestChallenge, 3000)});
} else {
  Connection.general.on('connect', checkLatestChallenge);
}
