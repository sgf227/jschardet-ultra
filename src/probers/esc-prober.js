'use strict';

const Constants = require('../constants');
const CharSetProber = require('./charset-prober');
const CodingStateMachine = require('../coding-state-machine');
const escsm = require('../models/escsm');

/**
 * EscCharSetProber - Probes for ESC-sequence based encodings:
 * HZ-GB-2312, ISO-2022-CN, ISO-2022-JP, ISO-2022-KR
 */
class EscCharSetProber extends CharSetProber {
  constructor() {
    super();
    this._codingSMs = [
      new CodingStateMachine(escsm.HZSMModel),
      new CodingStateMachine(escsm.ISO2022CNSMModel),
      new CodingStateMachine(escsm.ISO2022JPSMModel),
      new CodingStateMachine(escsm.ISO2022KRSMModel)
    ];
    this._activeSM = this._codingSMs.length;
    this._detectedCharset = null;
  }

  reset() {
    super.reset();
    for (const sm of this._codingSMs) {
      if (!sm) continue;
      sm.active = true;
      sm.reset();
    }
    this._activeSM = this._codingSMs.length;
    this._detectedCharset = null;
  }

  getCharsetName() {
    return this._detectedCharset;
  }

  getConfidence() {
    if (this._detectedCharset) return 0.99;
    return 0.00;
  }

  feed(buf) {
    for (let i = 0; i < buf.length; i++) {
      const c = buf[i];
      for (const sm of this._codingSMs) {
        if (!sm || !sm.active) continue;
        const codingState = sm.nextState(c);
        if (codingState === Constants.error) {
          sm.active = false;
          this._activeSM--;
          if (this._activeSM <= 0) {
            this._state = Constants.notMe;
            return this.getState();
          }
        } else if (codingState === Constants.itsMe) {
          this._state = Constants.foundIt;
          this._detectedCharset = sm.getCodingStateMachine();
          return this.getState();
        }
      }
    }
    return this.getState();
  }
}

module.exports = EscCharSetProber;
