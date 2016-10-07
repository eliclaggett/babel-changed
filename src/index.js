#!/usr/bin/env node

import fileEntryCache from 'file-entry-cache';
import sum from 'hash-sum';
import uniq from 'lodash.uniq';
import glob from 'glob';
import pty from 'pty.js';

const key = 'stat_'+sum(process.cwd());

const node = process.argv[0];
const runonly = process.argv[1];
const src = process.argv[2];
const cmd = 'babel';
const options = process.argv.slice(3);

let files = glob.sync(`${src}/**/*.js*`);
if (!files.length) files = [files];

files = uniq(files);

const cache = fileEntryCache.create(key);

const updated = cache.getUpdatedFiles(files);

console.log(`${updated.length} modified files.`);

let newArgs = null;

if (updated && updated.length > 0) {
  newArgs = [src, '--only', updated.join(',')].concat(options);
} else {
  console.log('Nothing to do.');
  process.exit(0);
}

console.log('> babel ' + newArgs.join(' '));

let fileCount = 0;

const term = pty.spawn(cmd, newArgs, {
  name: process.env.TERM,
  cols: 80,
  rows: 25,
  cwd: process.cwd(),
  env: process.env
});

term.on('data', data => {
  process.stdout.write(data.toString());
});

term.on('exit', async () => {
  cache.reconcile();
});
