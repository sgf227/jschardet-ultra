'use strict';

/**
 * Encoding name normalizer and alias resolver.
 * Maps various encoding names/aliases to canonical iconv-lite names.
 */

const ENCODING_ALIASES = {
  // UTF-8
  'utf-8': 'utf-8', 'utf8': 'utf-8',

  // UTF-16
  'utf-16le': 'utf-16le', 'utf16le': 'utf-16le', 'ucs2': 'utf-16le', 'ucs-2': 'utf-16le',
  'utf-16be': 'utf-16be', 'utf16be': 'utf-16be',
  'utf-16': 'utf-16', 'utf16': 'utf-16',

  // UTF-32
  'utf-32le': 'utf-32le', 'utf32le': 'utf-32le',
  'utf-32be': 'utf-32be', 'utf32be': 'utf-32be',
  'utf-32': 'utf-32', 'utf32': 'utf-32',

  // UTF-7
  'utf-7': 'utf-7', 'utf7': 'utf-7',
  'utf-7-imap': 'utf-7-imap', 'utf7-imap': 'utf-7-imap',

  // ASCII
  'ascii': 'ascii', 'us-ascii': 'ascii',

  // Node.js internal
  'binary': 'binary', 'latin1': 'latin-1',
  'base64': 'base64', 'hex': 'hex',
  'cesu8': 'cesu-8', 'cesu-8': 'cesu-8',

  // Windows code pages
  'windows-874': 'windows-874', 'cp874': 'windows-874',
  'windows-1250': 'windows-1250', 'cp1250': 'windows-1250',
  'windows-1251': 'windows-1251', 'cp1251': 'windows-1251',
  'windows-1252': 'windows-1252', 'cp1252': 'windows-1252',
  'windows-1253': 'windows-1253', 'cp1253': 'windows-1253',
  'windows-1254': 'windows-1254', 'cp1254': 'windows-1254',
  'windows-1255': 'windows-1255', 'cp1255': 'windows-1255',
  'windows-1256': 'windows-1256', 'cp1256': 'windows-1256',
  'windows-1257': 'windows-1257', 'cp1257': 'windows-1257',
  'windows-1258': 'windows-1258', 'cp1258': 'windows-1258',

  // ISO-8859 series
  'iso-8859-1': 'iso-8859-1', 'latin-1': 'iso-8859-1',
  'iso-8859-2': 'iso-8859-2', 'latin2': 'iso-8859-2', 'latin-2': 'iso-8859-2',
  'iso-8859-3': 'iso-8859-3',
  'iso-8859-4': 'iso-8859-4',
  'iso-8859-5': 'iso-8859-5', 'cyrillic': 'iso-8859-5',
  'iso-8859-6': 'iso-8859-6', 'arabic': 'iso-8859-6',
  'iso-8859-7': 'iso-8859-7', 'greek': 'iso-8859-7',
  'iso-8859-8': 'iso-8859-8', 'hebrew': 'iso-8859-8',
  'iso-8859-9': 'iso-8859-9', 'latin5': 'iso-8859-9', 'latin-5': 'iso-8859-9', 'turkish': 'iso-8859-9',
  'iso-8859-10': 'iso-8859-10',
  'iso-8859-11': 'iso-8859-11', 'tis620': 'iso-8859-11', 'tis-620': 'iso-8859-11',
  'iso-8859-13': 'iso-8859-13',
  'iso-8859-14': 'iso-8859-14',
  'iso-8859-15': 'iso-8859-15',
  'iso-8859-16': 'iso-8859-16',

  // IBM/DOS code pages
  'cp437': 'cp437', 'cp737': 'cp737', 'cp775': 'cp775',
  'cp808': 'cp808', 'cp850': 'cp850', 'cp852': 'cp852',
  'cp855': 'cp855', 'cp856': 'cp856', 'cp857': 'cp857',
  'cp858': 'cp858', 'cp860': 'cp860', 'cp861': 'cp861',
  'cp862': 'cp862', 'cp863': 'cp863', 'cp864': 'cp864',
  'cp865': 'cp865', 'cp866': 'cp866', 'cp869': 'cp869',
  'cp922': 'cp922', 'cp720': 'cp720',
  'cp1046': 'cp1046', 'cp1124': 'cp1124', 'cp1125': 'cp1125',
  'cp1129': 'cp1129', 'cp1133': 'cp1133',
  'cp1161': 'cp1161', 'cp1162': 'cp1162', 'cp1163': 'cp1163',

  // Macintosh encodings
  'macintosh': 'macintosh', 'macroman': 'macroman',
  'macgreek': 'macgreek', 'maccyrillic': 'maccyrillic',
  'maciceland': 'maciceland', 'macturkish': 'macturkish',
  'maccenteuro': 'maccenteuro', 'maccroatian': 'maccroatian',
  'macromania': 'macromania', 'macukraine': 'macukraine',
  'macthai': 'macthai',

  // KOI8 series
  'koi8-r': 'koi8-r', 'koi8-u': 'koi8-u',
  'koi8-ru': 'koi8-ru', 'koi8-t': 'koi8-t',

  // Other single-byte
  'armscii8': 'armscii-8', 'armscii-8': 'armscii-8',
  'rk1048': 'rk1048', 'tcvn': 'tcvn',
  'georgianacademy': 'georgian-academy', 'georgian-academy': 'georgian-academy',
  'georgianps': 'georgian-ps', 'georgian-ps': 'georgian-ps',
  'pt154': 'pt154', 'viscii': 'viscii',
  'iso646cn': 'iso646-cn', 'iso646-cn': 'iso646-cn',
  'iso646jp': 'iso646-jp', 'iso646-jp': 'iso646-jp',
  'hproman8': 'hp-roman8', 'hp-roman8': 'hp-roman8',
  'mik': 'mik',

  // CJK DBCS
  'shift_jis': 'shift_jis', 'sjis': 'shift_jis', 'shiftjis': 'shift_jis',
  'cp932': 'cp932',
  'euc-jp': 'euc-jp', 'eucjp': 'euc-jp',
  'cp936': 'cp936', 'gbk': 'gbk', 'chinese': 'gbk',
  'gb18030': 'gb18030',
  'gb2312': 'gb2312', 'euc-cn': 'gb2312',
  'cp949': 'cp949', 'korean': 'cp949',
  'euc-kr': 'euc-kr', 'euckr': 'euc-kr',
  'cp950': 'cp950',
  'big5': 'big5',

  // ESC encodings
  'hz-gb-2312': 'hz-gb-2312',
  'iso-2022-cn': 'iso-2022-cn',
  'iso-2022-jp': 'iso-2022-jp',
  'iso-2022-kr': 'iso-2022-kr',

  // IBM compatibility
  'ibm866': 'cp866', 'ibm855': 'cp855',
};

/**
 * Normalize an encoding name to its canonical form.
 */
function normalizeEncoding(name) {
  if (!name) return null;
  const key = name.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return ENCODING_ALIASES[key] || ENCODING_ALIASES[name.toLowerCase()] || name.toLowerCase();
}

/**
 * Map prober detection result to standard encoding name.
 * The prober may return names like "GB2312" which we want to map to more useful names.
 */
function mapProberResult(proberName) {
  const map = {
    'UTF-8': 'utf-8',
    'SHIFT_JIS': 'shift_jis',
    'EUC-JP': 'euc-jp',
    'GB2312': 'gb2312',
    'EUC-KR': 'euc-kr',
    'Big5': 'big5',
    'EUC-TW': 'euc-tw',
    'HZ-GB-2312': 'hz-gb-2312',
    'ISO-2022-CN': 'iso-2022-cn',
    'ISO-2022-JP': 'iso-2022-jp',
    'ISO-2022-KR': 'iso-2022-kr',
    'UTF-16LE': 'utf-16le',
    'UTF-16BE': 'utf-16be',
    'UTF-32LE': 'utf-32le',
    'UTF-32BE': 'utf-32be',
    'X-ISO-10646-UCS-4-3412': 'x-iso-10646-ucs-4-3412',
    'X-ISO-10646-UCS-4-2143': 'x-iso-10646-ucs-4-2143',
    'ascii': 'ascii',
    'windows-1251': 'windows-1251',
    'KOI8-R': 'koi8-r',
    'ISO-8859-5': 'iso-8859-5',
    'x-mac-cyrillic': 'maccyrillic',
    'IBM866': 'cp866',
    'IBM855': 'cp855',
    'ISO-8859-7': 'iso-8859-7',
    'windows-1253': 'windows-1253',
    'ISO-8859-5': 'iso-8859-5',
    'windows-1251': 'windows-1251',
    'ISO-8859-2': 'iso-8859-2',
    'windows-1250': 'windows-1250',
    'TIS-620': 'tis-620',
    'windows-1255': 'windows-1255',
  };
  return map[proberName] || proberName;
}

module.exports = {
  ENCODING_ALIASES,
  normalizeEncoding,
  mapProberResult
};
