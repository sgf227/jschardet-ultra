'use strict';

/**
 * Constants used throughout the charset detection engine.
 * Ported from Mozilla's Universal Charset Detector.
 */

const Constants = {
  // Debug mode
  _debug: false,

  // Prober states
  detecting: 0,
  foundIt: 1,
  notMe: 2,

  // State machine states
  start: 0,
  error: 1,
  itsMe: 2,

  // Thresholds
  MINIMUM_THRESHOLD: 0.20,
  SHORTCUT_THRESHOLD: 0.95
};

module.exports = Constants;
