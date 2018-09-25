const nodemon = require('nodemon');
const fs = require('fs');
const {isProdEnv} = require('./env.js');

nodemon({
  script: isProdEnv() ? '/root/codebase/codesignal/challenge_notification_script.js' : './challenge_notification_script.js',
  ext: 'js json',
  stdout: !isProdEnv() // important: this tells nodemon not to output to console
}).on('readable', function() { // the `readable` event indicates that data is ready to pick up
  console.log(isProdEnv());
  if (isProdEnv()) {
    this.stdout.pipe(fs.createWriteStream('/root/logs/challenge_out.txt'));
    this.stderr.pipe(fs.createWriteStream('/root/logs/challenge_err.txt'));
  }
});
