const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');
const tmp = require('tmp');

const {isProdEnv} = require('./env.js');


const hookurl = isProdEnv() ? process.env.DISCORD_CHALLENGE : process.env.DISCORD_COLLAB;


// https://anidiotsguide_old.gitbooks.io/discord-js-bot-guide/content/examples/using-embeds-in-messages.html
function sendNewChallengeNotification(
  challengeName, challengeUrl, reward, problemType, rankingType, duration, statement,
  authorUsername, authorAvatar, visibility, challengeId, difficulty, discord_tag
  ) {
  console.log('Sending discord notification.');
  fetch(hookurl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: discord_tag,
      embeds: [
      {
        color: visibility === 'community' ? 0xabfe1e : 0xfebe1e,
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
            value: reward || '-',
            inline: true,
          },
          {
            name: "Duration",
            value: duration || '-',
            inline: true,
          },
          {
            name: "Visibility",
            value: visibility || '-',
            inline: true,
          },
          {
            name: "Problem Type",
            value: problemType || '-',
            inline: true,
          },
          {
            name: "Ranking Type",
            value: rankingType || '-',
            inline: true,
          },
          {
            name: "Difficulty",
            value: difficulty || '-',
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

function sendProblemStatementFile(challengeName, data) {
  console.log('Sending file to discord');
  tmp.file(
    {prefix: challengeName + '-problemstatement-', postfix: '.html'},
    function (err, path, fd, cleanupCallback) {
      if (err) throw err;

      console.log("File: ", path);
      console.log("Filedescriptor: ", fd);
      fs.writeFileSync(path, data);

      var form  = new FormData();

      form.append('payload_json', JSON.stringify({
        content: 'Problem Statement',
      }));
      form.append('file', fs.createReadStream(path));
      console.log(form);

      fetch(hookurl, {
        method: 'POST',
        body: form
      }).then((response) => {
        console.debug(response);
      });

      cleanupCallback();
  });
}

function sendTestCasesFile(challengeName, data) {
  console.log('Sending file to discord');
  tmp.file(
    {prefix: challengeName + '-testcases-', postfix: '.txt'},
    function (err, path, fd, cleanupCallback) {
      if (err) throw err;

      console.log("File: ", path);
      console.log("Filedescriptor: ", fd);
      fs.writeFileSync(path, data);

      var form  = new FormData();

      form.append('payload_json', JSON.stringify({
        content: 'Sample Test Cases',
      }));
      form.append('file', fs.createReadStream(path));
      console.log(form);

      fetch(hookurl, {
        method: 'POST',
        body: form
      }).then((response) => {
        console.debug(response);
      });

    cleanupCallback();
  });
}

module.exports = {
    sendTestCasesFile,
    sendMessage,
    sendNewChallengeNotification,
    sendProblemStatementFile,
};
