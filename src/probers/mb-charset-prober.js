'use strict';

const Constants = require('../constants');
const CharSetProber = require('./charset-prober');
const CodingStateMachine = require('../coding-state-machine');

/**
 * MultiByteCharSetProber - Base class for multi-byte charset probers.
 * Uses a state machine + distribution analysis for detection.
 */
class MultiByteCharSetProber extends CharSetProber {
  constructor() {
    super();
    this._distributionAnalyzer = null;
    this._codingSM = null;
    this._lastChar = '\x00\x00';
  }

  reset() {
    super.reset();
    if (this._codingSM) this._codingSM.reset();
    if (this._distributionAnalyzer) this._distributionAnalyzer.reset();
    this._lastChar = '\x00\x00';
  }

  feed(buf) {
    const aLen = buf.length;
    for (let i = 0; i < aLen; i++) {
      const codingState = this._codingSM.nextState(buf[i]);
      if (codingState === Constants.error) {
        this._state = Constants.notMe;
        break;
      } else if (codingState === Constants.itsMe) {
        this._state = Constants.foundIt;
        break;
      } else if (codingState === Constants.start) {
        const charLen = this._codingSM.getCurrentCharLen();
        if (i === 0) {
          this._lastChar = this._lastChar[0] + buf[0];
          this._distributionAnalyzer.feed(this._lastChar, charLen);
        } else {
          this._distributionAnalyzer.feed(buf.slice(i - 1, i + 1), charLen);
        }
      }
    }

    this._lastChar = buf[aLen - 1] + this._lastChar[1];

    if (this.getState() === Constants.detecting) {
      if (this._distributionAnalyzer.gotEnoughData() &&
          this.getConfidence() > Constants.SHORTCUT_THRESHOLD) {
        this._state = Constants.foundIt;
      }
    }

    return this.getState();
  }

  getConfidence() {
    return this._distributionAnalyzer.getConfidence();
  }
}

module.exports = MultiByteCharSetProber;
