const nodemon = require('nodemon');
const fs = require('fs');

nodemon({
  script: 'challenge_notification_helper.js',
  ext: 'js json',
  stdout: false // important: this tells nodemon not to output to console
}).on('readable', function() { // the `readable` event indicates that data is ready to pick up
  this.stdout.pipe(fs.createWriteStream('/root/logs/challenge_out.txt'));
  this.stderr.pipe(fs.createWriteStream('/root/logs/challenge_err.txt'));
});
