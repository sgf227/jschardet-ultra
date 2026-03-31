'use strict';

const Constants = require('./constants');

/**
 * CodingStateMachine - drives the state machine for a given encoding model.
 * Each model provides classTable, classFactor, stateTable, charLenTable, and name.
 */
class CodingStateMachine {
  constructor(model) {
    this._model = model;
    this._currentBytePos = 0;
    this._currentCharLen = 0;
    this._currentState = Constants.start;
    this.active = true;
  }

  reset() {
    this._currentState = Constants.start;
  }

  nextState(c) {
    const charCode = typeof c === 'string' ? c.charCodeAt(0) : c;
    const byteCls = this._model.classTable[charCode];
    if (this._currentState === Constants.start) {
      this._currentBytePos = 0;
      this._currentCharLen = this._model.charLenTable[byteCls];
    }
    this._currentState = this._model.stateTable[
      this._currentState * this._model.classFactor + byteCls
    ];
    this._currentBytePos++;
    return this._currentState;
  }

  getCurrentCharLen() {
    return this._currentCharLen;
  }

  getCodingStateMachine() {
    return this._model.name;
  }
}

module.exports = CodingStateMachine;
