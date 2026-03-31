'use strict';

const Constants = require('./constants');
const CharSetProber = require('./probers/charset-prober');

/**
 * CharSetGroupProber - manages a group of probers, running them in parallel.
 */
class CharSetGroupProber extends CharSetProber {
  constructor() {
    super();
    this._probers = [];
    this._bestGuessProber = null;
    this._activeNum = 0;
  }

  reset() {
    super.reset();
    this._activeNum = 0;
    for (const prober of this._probers) {
      if (prober) {
        prober.reset();
        prober.active = true;
        this._activeNum++;
      }
    }
    this._bestGuessProber = null;
  }

  getCharsetName() {
    if (!this._bestGuessProber) {
      this.getConfidence();
      if (!this._bestGuessProber) return null;
    }
    return this._bestGuessProber.getCharsetName();
  }

  feed(buf) {
    for (const prober of this._probers) {
      if (!prober || !prober.active) continue;
      const st = prober.feed(buf);
      if (!st) continue;
      if (st === Constants.foundIt) {
        this._bestGuessProber = prober;
        return this.getState();
      } else if (st === Constants.notMe) {
        prober.active = false;
        this._activeNum--;
        if (this._activeNum <= 0) {
          this._state = Constants.notMe;
          return this.getState();
        }
      }
    }
    return this.getState();
  }

  getConfidence() {
    const st = this.getState();
    if (st === Constants.foundIt) return 0.99;
    if (st === Constants.notMe) return 0.01;

    let bestConf = 0.0;
    this._bestGuessProber = null;
    for (const prober of this._probers) {
      if (!prober || !prober.active) continue;
      const cf = prober.getConfidence();
      if (bestConf < cf) {
        bestConf = cf;
        this._bestGuessProber = prober;
      }
    }
    if (!this._bestGuessProber) return 0.0;
    return bestConf;
  }
}

module.exports = CharSetGroupProber;
