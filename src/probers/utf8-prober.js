'use strict';

const Constants = require('../constants');
const CharSetProber = require('./charset-prober');
const CodingStateMachine = require('../coding-state-machine');
const mbcssm = require('../models/mbcssm');

/**
 * UTF8Prober - Probes for UTF-8 encoding.
 */
class UTF8Prober extends CharSetProber {
  constructor() {
    super();
    this._codingSM = new CodingStateMachine(mbcssm.UTF8SMModel);
    this._numOfMBChar = 0;
  }

  reset() {
    super.reset();
    this._codingSM.reset();
    this._numOfMBChar = 0;
  }

  getCharsetName() {
    return 'UTF-8';
  }

  feed(buf) {
    for (let i = 0; i < buf.length; i++) {
      const codingState = this._codingSM.nextState(buf[i]);
      if (codingState === Constants.error) {
        this._state = Constants.notMe;
        break;
      } else if (codingState === Constants.itsMe) {
        this._state = Constants.foundIt;
        break;
      } else if (codingState === Constants.start) {
        if (this._codingSM.getCurrentCharLen() >= 2) {
          this._numOfMBChar++;
        }
      }
    }

    if (this.getState() === Constants.detecting) {
      if (this.getConfidence() > Constants.SHORTCUT_THRESHOLD) {
        this._state = Constants.foundIt;
      }
    }

    return this.getState();
  }

  getConfidence() {
    const ONE_CHAR_PROB = 0.5;
    let unlike = 0.99;
    if (this._numOfMBChar < 6) {
      for (let i = 0; i < this._numOfMBChar; i++) {
        unlike *= ONE_CHAR_PROB;
      }
      return 1 - unlike;
    } else {
      return unlike;
    }
  }
}

module.exports = UTF8Prober;
