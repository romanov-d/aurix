const fs = require('fs');
const https = require('https');

const logos = {
  'mercedes.svg': 'https://upload.wikimedia.org/wikipedia/commons/9/90/Mercedes-Logo.svg',
  'lexus.svg': 'https://upload.wikimedia.org/wikipedia/commons/0/06/Lexus_logo.svg',
  'rolls-royce.svg': 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Rolls-Royce_Motor_Cars_logo.svg',
  'bmw.svg': 'https://upload.wikimedia.org/wikipedia/commons/4/44/BMW.svg',
  'lamborghini.svg': 'https://upload.wikimedia.org/wikipedia/en/d/df/Lamborghini_Logo.svg',
  'ferrari.svg': 'https://upload.wikimedia.org/wikipedia/en/d/d1/Ferrari-Logo.svg',
  'porsche.svg': 'https://upload.wikimedia.org/wikipedia/en/8/8c/Porsche_logo.svg',
};

Object.entries(logos).forEach(([filename, url]) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      https.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2) => {
        res2.pipe(fs.createWriteStream(`public/${filename}`));
      });
    } else {
      res.pipe(fs.createWriteStream(`public/${filename}`));
    }
  }).on('error', (e) => console.error(`Error downloading ${filename}: ${e.message}`));
});
