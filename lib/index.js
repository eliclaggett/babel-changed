#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _fileEntryCache = _interopRequireDefault(require("file-entry-cache"));

var _hashSum = _interopRequireDefault(require("hash-sum"));

var _lodash = _interopRequireDefault(require("lodash.uniq"));

var _glob = _interopRequireDefault(require("glob"));

var _flatCache = require("flat-cache");

var pty = require('node-pty');

var key = 'stat_' + (0, _hashSum["default"])(process.cwd());
var node = process.argv[0];
var runonly = process.argv[1];
var src = process.argv[2];
var path = '';

if (src == '--reset') {
  console.log('Clearing file stats so next run will include all files..');
  console.log(path);

  try {
    (0, _flatCache.clearCacheById)(key);
  } catch (e) {
    console.log('Problem clearing cache:', e);
    process.exit(0);
  }

  console.log('File entry Cache cleared.');
  process.exit(0);
}

var cmd = 'babel';
var options = process.argv.slice(3);
var numOptions = options.length;
var useChecksum = false;

for (var i = 0; i < numOptions; i++) {
  if (options[i] == '--checksum') {
    useChecksum = true;
    options.splice(i, 1);
  }
}

var files = _glob["default"].sync("".concat(src, "/**/*.js*"));

if (!files.length) files = [files];
files = (0, _lodash["default"])(files);

var cache = _fileEntryCache["default"].create(key, null, useChecksum);

var updated = cache.getUpdatedFiles(files);
console.log("".concat(updated.length, " modified files."));
var newArgs = null;

if (updated && updated.length > 0) {
  newArgs = [src, '--only', updated.join(',')].concat(options);
} else {
  console.log('Nothing to do.');
  process.exit(0);
}

console.log('> babel ' + newArgs.join(' '));
var fileCount = 0;
var term = pty.spawn(cmd, newArgs, {
  name: process.env.TERM,
  cols: 80,
  rows: 25,
  cwd: process.cwd(),
  env: process.env
});
term.on('data', function (data) {
  process.stdout.write(data);
});
term.on('exit', function (code) {
  console.log('babel-changed detected exit code ', code);
  if (code * 1 == 0) cache.reconcile();
  process.exit(code);
});