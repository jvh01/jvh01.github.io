const {Connection} = require('./connection');
const {sendNewChallengeNotification} = require('./discord_webhook.js')

var log = console.log

/** Default connection for general requests */
Connection.general = new Connection({
  username: process.env.CSUSER,
  passHash: process.env.CSPASS,
});

// Challenge list monitoring
var lastChallengeId = null;

function getSubmissions(challengeId, taskId, limit, offset) {
  
  var data = {
    msg: 'method',
    method: 'taskLeaderboardService.getSubmissions',
    params: [
    {
        context:{
            mode: "challenge",
            challengeId: challengeId
        },
        taskId: taskId,
        language: ""
    },
    {
        skip: offset,
        sort: ["chars","asc"],
    },
    "XgQc8EMgdYyzSLK2S"
    ]
  };

  Connection.general.send(data, (response) => {
    console.log(response);
  });
}

Connection.general.on('connect', getSubmissions);
