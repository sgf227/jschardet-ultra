'use strict';

const Constants = require('../constants');

/**
 * Base class for all charset probers.
 */
class CharSetProber {
  constructor() {
    this._state = Constants.detecting;
  }

  reset() {
    this._state = Constants.detecting;
  }

  getCharsetName() {
    return null;
  }

  feed(buf) {
    // Override in subclass
  }

  getState() {
    return this._state;
  }

  getConfidence() {
    return 0.0;
  }

  filterHighBitOnly(buf) {
    return buf.replace(/[\x00-\x7F]+/g, ' ');
  }

  filterWithoutEnglishLetters(buf) {
    return buf.replace(/[A-Za-z]+/g, ' ');
  }
}

module.exports = CharSetProber;
