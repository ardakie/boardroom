const fs = require('fs');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

const url = 'https://github.com/git-for-windows/git/releases/download/v2.41.0.windows.1/MinGit-2.41.0-64-bit.zip';
const dest = path.join(__dirname, 'mingit.zip');

const file = fs.createWriteStream(dest);
https.get(url, function(response) {
  if (response.statusCode === 302) {
    https.get(response.headers.location, function(res) {
      res.pipe(file);
      file.on('finish', function() {
        file.close();
        console.log('Downloaded MinGit. Unzipping...');
        execSync('powershell -Command "Expand-Archive -Force mingit.zip -DestinationPath mingit"', { stdio: 'inherit' });
        console.log('Unzipped.');
      });
    });
  }
});
