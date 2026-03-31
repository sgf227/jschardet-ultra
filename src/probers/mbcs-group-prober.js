'use strict';

const CharSetGroupProber = require('../charset-group-prober');
const UTF8Prober = require('./utf8-prober');
const { SJISProber, EUCJPProber } = require('./jp-probers');
const { Big5Prober, GB2312Prober, EUCKRProber, EUCTWProber } = require('./cjk-probers');

/**
 * MBCSGroupProber - Groups all multi-byte charset probers.
 */
class MBCSGroupProber extends CharSetGroupProber {
  constructor() {
    super();
    this._probers = [
      new UTF8Prober(),
      new SJISProber(),
      new EUCJPProber(),
      new GB2312Prober(),
      new EUCKRProber(),
      new Big5Prober(),
      new EUCTWProber()
    ];
    this.reset();
  }
}

module.exports = MBCSGroupProber;
