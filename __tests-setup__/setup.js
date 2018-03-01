const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const mkdirp = require('mkdirp');
const { DIR } = require('./config');

module.exports = async function() {
  const browser = await puppeteer.launch();
  // store the browser instance so we can teardown it later
  global.__BROWSER__ = browser;

  // file the wsEndpoint for TestEnvironments
  mkdirp.sync(DIR);
  fs.writeFileSync(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint());
};
