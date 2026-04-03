'use strict';

const jschardet = require('..');
const iconv = require('iconv-lite');

/**
 * jschardet-ultra 扩展测试
 * 覆盖更多编码、语言、边界条件和实际场景
 */

// ============ 测试文本素材 ============
const TEXTS = {
  // 中文（简繁）
  zh_long:    '维基百科是一个基于维基技术的多语言百科全书协作计划，用多种语言编写而成的网络百科全书。' +
              '维基百科由非营利组织维基媒体基金会负责运营。维基百科目前已经收录了数百万条目。',
  zh_trad:    '維基百科是自由的百科全書，全球最大的百科全書。中華民國是位於東亞的民主共和國，簡稱台灣。',
  zh_short:   '你好世界',

  // 日文
  ja_long:    'ウィキペディアはオープンコンテントの百科事典です。基本方針に賛同していただけるなら、誰でも記事を編集したり新しく作成したりできます。',
  ja_hiragana:'おはようございます。今日はいい天気ですね。よろしくお願いします。',
  ja_katakana:'コンピュータサイエンスはアルゴリズムとデータ構造を研究する学問です。',
  ja_mixed:   '日本語のテキストはひらがな、カタカナ、漢字が混在しています。',

  // 韩文
  ko_long:    '위키백과는 누구나 자유롭게 쓸 수 있는 다국어판 인터넷 백과사전입니다. 대한민국은 동아시아에 위치한 민주공화국입니다.',
  ko_short:   '한국어',

  // 俄文
  ru_long:    'Россия — самая большая страна в мире по площади территории. Столица России — Москва. Официальный язык — русский.',
  ru_medium:  'Привет мир это тест',

  // 法文
  fr_long:    'La France est un pays situé en Europe occidentale. Paris est la capitale et la plus grande ville de France. La langue officielle est le français.',
  fr_short:   'Bonjour le monde',

  // 德文
  de_long:    'Deutschland ist ein Bundesstaat in Mitteleuropa. Berlin ist die Hauptstadt und größte Stadt Deutschlands. Die Amtssprache ist Deutsch.',
  de_umlauts: 'Ärger über Öffnungszeiten der Bücherei. Über Münchner Märkte.',

  // 西班牙文
  es_long:    'España es un país soberano situado en el suroeste de Europa. Madrid es la capital y la ciudad más grande de España. El idioma oficial es el español.',

  // 葡萄牙文
  pt_long:    'Portugal é um país soberano localizado no sudoeste da Europa. Lisboa é a capital e maior cidade de Portugal. A língua oficial é o português.',

  // 意大利文
  it_long:    'L\'Italia è una repubblica parlamentare situata nell\'Europa meridionale. Roma è la capitale e la città più grande dell\'Italia. La lingua ufficiale è l\'italiano.',

  // 荷兰文
  nl_long:    'Nederland is een land in West-Europa. Amsterdam is de hoofdstad van Nederland. De officiële taal is het Nederlands.',

  // 波兰文（中欧）
  pl_long:    'Polska jest krajem w Europie Środkowej. Warszawa jest stolicą i największym miastem Polski. Język oficjalny to polski.',
  pl_chars:   'Zażółć gęślą jaźń. Szczególnie ważne są ąęśćźżłóń.',

  // 捷克文（中欧）
  cs_long:    'Česká republika je stát ve střední Evropě. Praha je hlavní město České republiky. Úřední jazyk je čeština.',

  // 土耳其文
  tr_long:    'Türkiye, Asya ve Avrupa kıtalarında toprakları bulunan ülkedir. Ankara, Türkiye\'nin başkentidir. Resmi dil Türkçedir.',

  // 希腊文
  el_long:    'Η Ελλάδα είναι χώρα στη νοτιοανατολική Ευρώπη. Η Αθήνα είναι η πρωτεύουσα της Ελλάδας. Η επίσημη γλώσσα είναι τα ελληνικά.',

  // 希伯来文
  he_long:    'ישראל היא מדינה במזרח התיכון. ירושלים היא עיר הבירה של ישראל. השפה הרשמית היא עברית.',

  // 阿拉伯文
  ar_long:    'مصر دولة عربية تقع في شمال أفريقيا. القاهرة هي عاصمة مصر وأكبر مدنها. اللغة الرسمية هي العربية.',

  // 泰文
  th_long:    'ประเทศไทยตั้งอยู่ในเอเชียตะวันออกเฉียงใต้ กรุงเทพมหานครเป็นเมืองหลวงของประเทศไทย ภาษาราชการคือภาษาไทย',

  // 越南文
  vi_long:    'Việt Nam là một quốc gia ở Đông Nam Á. Hà Nội là thủ đô của Việt Nam. Ngôn ngữ chính thức là tiếng Việt.',

  // 波罗的海语（拉脱维亚文）
  lv_long:    'Latvija ir valsts Ziemeļeiropā. Rīga ir Latvijas galvaspilsēta un lielākā pilsēta. Valsts valoda ir latviešu valoda.',

  // 特殊场景文本
  json_text:  '{"name":"张三","age":25,"city":"北京","email":"test@example.com"}',
  xml_text:   '<?xml version="1.0" encoding="UTF-8"?><root><title>测试</title></root>',
  url_text:   'https://zh.wikipedia.org/wiki/维基百科 这是一个链接',
  code_text:  'function hello() { console.log("Hello World"); return true; }',
  html_text:  '<html><head><meta charset="UTF-8"><title>测试页面</title></head><body><p>你好世界</p></body></html>',
};

let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;
const failures = [];

function test(name, inputBuf, acceptableEncodings, minConfidence) {
  totalTests++;
  const result = jschardet.detect(inputBuf);
  const enc = result.encoding;
  const conf = result.confidence;
  const passed = acceptableEncodings.includes(enc) && conf >= (minConfidence || 0);

  if (passed) {
    totalPassed++;
    console.log(`  [OK] ${name} => ${enc} (${conf.toFixed(2)})`);
  } else {
    totalFailed++;
    failures.push({ name, expected: acceptableEncodings, got: enc, conf });
    console.log(`  [FAIL] ${name} => ${enc} (${conf.toFixed(2)}) expected: [${acceptableEncodings.join(', ')}]`);
  }
}

function encode(text, encoding) {
  return iconv.encode(text, encoding);
}

console.log('='.repeat(70));
console.log('jschardet-ultra 扩展测试（更全面的编码覆盖）');
console.log('='.repeat(70));

// ============================================================
// 1. UTF-8 各类文本
// ============================================================
console.log('\n--- 1. UTF-8 各类文本 ---');
test('UTF-8 简体中文长文', encode(TEXTS.zh_long, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 繁体中文', encode(TEXTS.zh_trad, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 日文长文', encode(TEXTS.ja_long, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 日文平假名', encode(TEXTS.ja_hiragana, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 韩文长文', encode(TEXTS.ko_long, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 俄文长文', encode(TEXTS.ru_long, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 法文长文', encode(TEXTS.fr_long, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 德文长文', encode(TEXTS.de_long, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 阿拉伯文', encode(TEXTS.ar_long, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 希伯来文', encode(TEXTS.he_long, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 希腊文', encode(TEXTS.el_long, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 泰文', encode(TEXTS.th_long, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 越南文', encode(TEXTS.vi_long, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 波兰文', encode(TEXTS.pl_long, 'utf-8'), ['utf-8'], 0.9);
test('UTF-8 土耳其文', encode(TEXTS.tr_long, 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 JSON文本', encode(TEXTS.json_text, 'utf-8'), ['utf-8'], 0.5);
test('UTF-8 XML文本', encode(TEXTS.xml_text, 'utf-8'), ['utf-8'], 0.5);
test('UTF-8 HTML文本', encode(TEXTS.html_text, 'utf-8'), ['utf-8'], 0.5);

// ============================================================
// 2. UTF-16 无 BOM
// ============================================================
console.log('\n--- 2. UTF-16 无 BOM ---');
test('UTF-16LE 无BOM 中文', iconv.encode(TEXTS.zh_long, 'utf-16le'), ['utf-16le', 'UTF-16'], 0.5);
test('UTF-16BE 无BOM 中文', iconv.encode(TEXTS.zh_long, 'utf-16be'), ['utf-16be', 'UTF-16'], 0.5);
test('UTF-16LE 无BOM 日文', iconv.encode(TEXTS.ja_long, 'utf-16le'), ['utf-16le', 'UTF-16'], 0.5);
test('UTF-16LE 无BOM 英文', iconv.encode('Hello World this is a test for UTF-16LE encoding detection.', 'utf-16le'), ['utf-16le', 'UTF-16', 'ascii'], 0.3);

// ============================================================
// 3. ISO-2022 系列（7bit 转义编码）
// ============================================================
console.log('\n--- 3. ISO-2022 系列 ---');
// ISO-2022-JP: ESC $ B ... ESC ( B
const iso2022jp = Buffer.from('\x1b$B46HhK\\=,GI\x1b(B', 'binary');
test('ISO-2022-JP 原始字节', iso2022jp, ['iso-2022-jp'], 0.9);
// 更长的 ISO-2022-JP 序列
const iso2022jp2 = Buffer.from('\x1b$B@$3+$O%*!<%W%s%3%s%F%s%H$N\x1b(B', 'binary');
test('ISO-2022-JP 长序列', iso2022jp2, ['iso-2022-jp'], 0.9);

// ============================================================
// 4. CJK 多字节编码（更多变体）
// ============================================================
console.log('\n--- 4. CJK 多字节（更多变体）---');
// GB 系列
test('GB2312 长简体中文', encode(TEXTS.zh_long, 'gb2312'), ['gb2312', 'gbk', 'gb18030'], 0.9);
test('GBK 长简体中文', encode(TEXTS.zh_long, 'gbk'), ['gb2312', 'gbk', 'gb18030'], 0.9);
test('GB18030 长简体中文', encode(TEXTS.zh_long, 'gb18030'), ['gb2312', 'gbk', 'gb18030'], 0.9);
test('GB2312 JSON含中文', encode(TEXTS.json_text, 'gb2312'), ['gb2312', 'gbk', 'gb18030', 'utf-8'], 0.3);
// Big5 系列
test('Big5 繁体中文长文', encode(TEXTS.zh_trad, 'big5'), ['big5', 'cp950'], 0.9);
test('Big5 繁体 + ASCII', encode('Hello ' + TEXTS.zh_trad, 'big5'), ['big5', 'cp950'], 0.8);
// Shift_JIS 系列
test('Shift_JIS 日文长文', encode(TEXTS.ja_long, 'shift_jis'), ['shift_jis', 'cp932'], 0.9);
test('Shift_JIS 平假名', encode(TEXTS.ja_hiragana, 'shift_jis'), ['shift_jis', 'cp932'], 0.8);
test('Shift_JIS 片假名', encode(TEXTS.ja_katakana, 'shift_jis'), ['shift_jis', 'cp932'], 0.8);
test('Shift_JIS 混合文', encode(TEXTS.ja_mixed, 'shift_jis'), ['shift_jis', 'cp932'], 0.8);
test('CP932 日文', encode(TEXTS.ja_long, 'cp932'), ['shift_jis', 'cp932'], 0.9);
// EUC-JP
test('EUC-JP 日文长文', encode(TEXTS.ja_long, 'euc-jp'), ['euc-jp'], 0.9);
test('EUC-JP 平假名', encode(TEXTS.ja_hiragana, 'euc-jp'), ['euc-jp'], 0.8);
// EUC-KR
test('EUC-KR 韩文长文', encode(TEXTS.ko_long, 'euc-kr'), ['euc-kr', 'cp949'], 0.9);
test('CP949 韩文', encode(TEXTS.ko_long, 'cp949'), ['euc-kr', 'cp949'], 0.9);

// ============================================================
// 5. 西里尔编码（更多变体）
// ============================================================
console.log('\n--- 5. 西里尔编码（更多变体）---');
test('windows-1251 长俄文', encode(TEXTS.ru_long, 'windows-1251'), ['windows-1251', 'koi8-r', 'iso-8859-5'], 0.8);
test('KOI8-R 长俄文', encode(TEXTS.ru_long, 'koi8-r'), ['koi8-r', 'koi8-u', 'windows-1251', 'iso-8859-5'], 0.8);
test('KOI8-U 长俄文', encode(TEXTS.ru_long, 'koi8-u'), ['koi8-u', 'koi8-r', 'windows-1251', 'iso-8859-5'], 0.8);
test('ISO-8859-5 长俄文', encode(TEXTS.ru_long, 'iso-8859-5'), ['iso-8859-5', 'windows-1251', 'koi8-r'], 0.8);
test('CP866 长俄文', encode(TEXTS.ru_long, 'cp866'), ['cp866', 'windows-1251', 'koi8-r', 'iso-8859-5', 'cp855'], 0.5);
test('CP855 长俄文', encode(TEXTS.ru_long, 'cp855'), ['cp855', 'cp866', 'windows-1251', 'koi8-r', 'iso-8859-5'], 0.5);
test('windows-1251 中等长度俄文', encode(TEXTS.ru_medium, 'windows-1251'), ['windows-1251', 'koi8-r', 'iso-8859-5', 'cp866', 'iso-8859-13', 'iso-8859-2', 'windows-1250'], 0.3);

// ============================================================
// 6. 西欧编码（更多语言）
// ============================================================
console.log('\n--- 6. 西欧编码（更多语言）---');
// 法文
test('windows-1252 法文长文', encode(TEXTS.fr_long, 'windows-1252'), ['windows-1252', 'iso-8859-1', 'iso-8859-15'], 0.8);
test('ISO-8859-1 法文长文', encode(TEXTS.fr_long, 'iso-8859-1'), ['iso-8859-1', 'windows-1252', 'iso-8859-15'], 0.8);
test('ISO-8859-15 法文长文', encode(TEXTS.fr_long, 'iso-8859-15'), ['iso-8859-15', 'iso-8859-1', 'windows-1252'], 0.5);
// 德文
test('windows-1252 德文长文', encode(TEXTS.de_long, 'windows-1252'), ['windows-1252', 'iso-8859-1', 'iso-8859-15'], 0.8);
test('windows-1252 德文变音符', encode(TEXTS.de_umlauts, 'windows-1252'), ['windows-1252', 'iso-8859-1', 'iso-8859-15'], 0.7);
// 西班牙文
test('windows-1252 西班牙文', encode(TEXTS.es_long, 'windows-1252'), ['windows-1252', 'iso-8859-1', 'iso-8859-15'], 0.8);
test('ISO-8859-1 西班牙文', encode(TEXTS.es_long, 'iso-8859-1'), ['iso-8859-1', 'windows-1252', 'iso-8859-15'], 0.8);
// 葡萄牙文
test('windows-1252 葡萄牙文', encode(TEXTS.pt_long, 'windows-1252'), ['windows-1252', 'iso-8859-1', 'iso-8859-15'], 0.7);
// 意大利文
test('windows-1252 意大利文', encode(TEXTS.it_long, 'windows-1252'), ['windows-1252', 'iso-8859-1', 'iso-8859-15'], 0.7);
// 荷兰文
test('windows-1252 荷兰文', encode(TEXTS.nl_long, 'windows-1252'), ['windows-1252', 'iso-8859-1', 'iso-8859-15'], 0.7);

// ============================================================
// 7. 中欧编码（波兰、捷克、匈牙利等）
// ============================================================
console.log('\n--- 7. 中欧编码 ---');
test('windows-1250 波兰文', encode(TEXTS.pl_long, 'windows-1250'), ['windows-1250', 'iso-8859-2'], 0.7);
test('ISO-8859-2 波兰文', encode(TEXTS.pl_long, 'iso-8859-2'), ['iso-8859-2', 'windows-1250'], 0.7);
test('windows-1250 波兰特殊字符', encode(TEXTS.pl_chars, 'windows-1250'), ['windows-1250', 'iso-8859-2'], 0.7);
test('ISO-8859-2 捷克文', encode(TEXTS.cs_long, 'iso-8859-2'), ['iso-8859-2', 'windows-1250'], 0.7);
test('windows-1250 捷克文', encode(TEXTS.cs_long, 'windows-1250'), ['windows-1250', 'iso-8859-2'], 0.7);

// ============================================================
// 8. 土耳其编码
// ============================================================
console.log('\n--- 8. 土耳其编码 ---');
test('windows-1254 土耳其文', encode(TEXTS.tr_long, 'windows-1254'), ['windows-1254', 'iso-8859-9'], 0.7);
test('ISO-8859-9 土耳其文', encode(TEXTS.tr_long, 'iso-8859-9'), ['iso-8859-9', 'windows-1254'], 0.7);

// ============================================================
// 9. 希腊编码
// ============================================================
console.log('\n--- 9. 希腊编码 ---');
test('windows-1253 希腊文长文', encode(TEXTS.el_long, 'windows-1253'), ['windows-1253', 'iso-8859-7'], 0.8);
test('ISO-8859-7 希腊文长文', encode(TEXTS.el_long, 'iso-8859-7'), ['iso-8859-7', 'windows-1253'], 0.8);

// ============================================================
// 10. 希伯来编码
// ============================================================
console.log('\n--- 10. 希伯来编码 ---');
test('windows-1255 希伯来文长文', encode(TEXTS.he_long, 'windows-1255'), ['windows-1255', 'iso-8859-8'], 0.8);

// ============================================================
// 11. 阿拉伯编码
// ============================================================
console.log('\n--- 11. 阿拉伯编码 ---');
test('windows-1256 阿拉伯文长文', encode(TEXTS.ar_long, 'windows-1256'), ['windows-1256', 'iso-8859-6'], 0.8);

// ============================================================
// 12. 泰文编码
// ============================================================
console.log('\n--- 12. 泰文编码 ---');
test('windows-874 泰文长文', encode(TEXTS.th_long, 'windows-874'), ['windows-874', 'iso-8859-11', 'tis-620'], 0.8);
test('TIS-620 泰文', encode(TEXTS.th_long, 'tis-620'), ['tis-620', 'windows-874', 'iso-8859-11'], 0.7);

// ============================================================
// 13. 越南文编码
// ============================================================
console.log('\n--- 13. 越南文编码 ---');
test('windows-1258 越南文', encode(TEXTS.vi_long, 'windows-1258'), ['windows-1258', 'windows-1252', 'iso-8859-1', 'iso-8859-13', 'windows-1257'], 0.3);

// ============================================================
// 14. 波罗的海编码
// ============================================================
console.log('\n--- 14. 波罗的海编码 ---');
test('windows-1257 拉脱维亚文', encode(TEXTS.lv_long, 'windows-1257'), ['windows-1257', 'iso-8859-13', 'iso-8859-4'], 0.5);
test('ISO-8859-13 拉脱维亚文', encode(TEXTS.lv_long, 'iso-8859-13'), ['iso-8859-13', 'windows-1257', 'iso-8859-4'], 0.5);

// ============================================================
// 15. 大文本量测试
// ============================================================
console.log('\n--- 15. 大文本量 ---');
const bigUtf8Zh = Buffer.from((TEXTS.zh_long + '\n').repeat(50));
test('UTF-8 大文本 中文 (~15KB)', bigUtf8Zh, ['utf-8'], 0.99);

const bigGbk = iconv.encode((TEXTS.zh_long + '\n').repeat(50), 'gbk');
test('GBK 大文本 中文', bigGbk, ['gb2312', 'gbk', 'gb18030'], 0.95);

const bigSjis = iconv.encode((TEXTS.ja_long + '\n').repeat(50), 'shift_jis');
test('Shift_JIS 大文本 日文', bigSjis, ['shift_jis', 'cp932'], 0.95);

const bigEucJp = iconv.encode((TEXTS.ja_long + '\n').repeat(50), 'euc-jp');
test('EUC-JP 大文本 日文', bigEucJp, ['euc-jp'], 0.95);

const bigEucKr = iconv.encode((TEXTS.ko_long + '\n').repeat(50), 'euc-kr');
test('EUC-KR 大文本 韩文', bigEucKr, ['euc-kr', 'cp949'], 0.95);

const bigBig5 = iconv.encode((TEXTS.zh_trad + '\n').repeat(50), 'big5');
test('Big5 大文本 繁体中文', bigBig5, ['big5', 'cp950'], 0.95);

const bigRu1251 = iconv.encode((TEXTS.ru_long + '\n').repeat(50), 'windows-1251');
test('windows-1251 大文本 俄文', bigRu1251, ['windows-1251', 'koi8-r', 'iso-8859-5'], 0.9);

const bigFr = iconv.encode((TEXTS.fr_long + '\n').repeat(50), 'windows-1252');
test('windows-1252 大文本 法文', bigFr, ['windows-1252', 'iso-8859-1', 'iso-8859-15'], 0.9);

const bigEl = iconv.encode((TEXTS.el_long + '\n').repeat(50), 'windows-1253');
test('windows-1253 大文本 希腊文', bigEl, ['windows-1253', 'iso-8859-7'], 0.9);

const bigTh = iconv.encode((TEXTS.th_long + '\n').repeat(50), 'windows-874');
test('windows-874 大文本 泰文', bigTh, ['windows-874', 'iso-8859-11', 'tis-620'], 0.9);

// ============================================================
// 16. 混合内容
// ============================================================
console.log('\n--- 16. 混合内容 ---');
test('UTF-8 中英混合', encode('Hello World! ' + TEXTS.zh_long + ' End.', 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 日英混合', encode('Hello! ' + TEXTS.ja_long + ' Goodbye!', 'utf-8'), ['utf-8'], 0.99);
test('UTF-8 多语言混合', encode(TEXTS.zh_short + ' ' + TEXTS.ja_hiragana + ' ' + TEXTS.ko_short, 'utf-8'), ['utf-8'], 0.9);
test('GBK 中英混合', encode('Hello World! ' + TEXTS.zh_long, 'gbk'), ['gb2312', 'gbk', 'gb18030'], 0.8);
test('Shift_JIS 日英混合', encode('Hello! ' + TEXTS.ja_long, 'shift_jis'), ['shift_jis', 'cp932'], 0.8);
test('windows-1252 法英混合', encode('Hello! ' + TEXTS.fr_long, 'windows-1252'), ['windows-1252', 'iso-8859-1', 'iso-8859-15'], 0.7);
// ASCII主导但含少量高字节
test('ASCII主导+少量中文', encode('The quick brown fox. ' + TEXTS.zh_short + '. Jumps over.', 'utf-8'), ['utf-8', 'ascii'], 0.3);

// ============================================================
// 17. 边界条件
// ============================================================
console.log('\n--- 17. 边界条件 ---');
test('空输入', Buffer.alloc(0), [null], 0);
test('单字节 ASCII', Buffer.from([0x41]), ['ascii'], 1.0);
test('单字节 0x00', Buffer.from([0x00]), ['ascii'], 0);
test('单字节 high 0x80', Buffer.from([0x80]), [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'cp866', 'koi8-r', 'windows-1253', 'windows-1254', 'windows-1255', 'windows-1256', 'windows-1257', 'windows-1258', 'windows-874', 'iso-8859-5', 'iso-8859-7'], 0);
test('单字节 high 0xFF', Buffer.from([0xFF]), [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'cp866', 'koi8-r', 'windows-1253', 'windows-1254', 'windows-1255', 'windows-1256', 'windows-1257', 'windows-1258', 'windows-874', 'iso-8859-5', 'iso-8859-7'], 0);
test('2字节 UTF-8 中文', encode('中', 'utf-8'), ['utf-8'], 0.2);
test('4字节 UTF-8 emoji', Buffer.from([0xF0, 0x9F, 0x98, 0x80]), ['utf-8'], 0.3);
test('全 0x00 填充(100字节)', Buffer.alloc(100, 0x00), ['ascii'], 0);
test('全 0x7F 填充', Buffer.alloc(50, 0x7F), ['ascii'], 0);
test('全 0x80 填充', Buffer.alloc(50, 0x80), [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'cp866', 'koi8-r', 'iso-8859-5', 'windows-1253', 'shift_jis', 'gbk', 'gb2312', 'euc-kr', 'big5'], 0);
test('全 0xFF 填充', Buffer.alloc(50, 0xFF), [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'cp866', 'koi8-r', 'iso-8859-5', 'shift_jis', 'gbk'], 0);
test('仅换行符', Buffer.from('\n\n\n\n\n'), ['ascii'], 0);
test('仅制表符', Buffer.from('\t\t\t\t\t'), ['ascii'], 0);
test('仅空格', Buffer.from('     '), ['ascii'], 0);

// ============================================================
// 18. 实际场景文本
// ============================================================
console.log('\n--- 18. 实际场景文本 ---');
test('UTF-8 JSON含中文', encode(TEXTS.json_text, 'utf-8'), ['utf-8'], 0.5);
test('UTF-8 XML含中文', encode(TEXTS.xml_text, 'utf-8'), ['utf-8'], 0.5);
test('UTF-8 HTML含中文', encode(TEXTS.html_text, 'utf-8'), ['utf-8'], 0.5);
test('UTF-8 URL含中文', encode(TEXTS.url_text, 'utf-8'), ['utf-8'], 0.5);
test('ASCII 代码文本', Buffer.from(TEXTS.code_text), ['ascii'], 0.9);
// 模拟 CSV 文件
const csvUtf8 = encode('姓名,年龄,城市\n张三,25,北京\n李四,30,上海\n王五,28,广州\n', 'utf-8');
test('UTF-8 CSV含中文', csvUtf8, ['utf-8'], 0.9);
const csvGbk = encode('姓名,年龄,城市\n张三,25,北京\n李四,30,上海\n王五,28,广州\n', 'gbk');
test('GBK CSV含中文', csvGbk, ['gb2312', 'gbk', 'gb18030'], 0.8);
// 模拟日志文件
const logAscii = Buffer.from('[2024-01-01 12:00:00] INFO: Server started on port 8080\n[2024-01-01 12:00:01] DEBUG: Loading configuration\n');
test('ASCII 日志文件', logAscii, ['ascii'], 0.99);
// 模拟 Base64 文本
const base64Text = Buffer.from('SGVsbG8gV29ybGQhIFRoaXMgaXMgYSBiYXNlNjQgZW5jb2RlZCBzdHJpbmcuIEl0IHNob3VsZCBiZSBkZXRlY3RlZCBhcyBBU0NJSS4=');
test('Base64 文本', base64Text, ['ascii'], 0.9);

// ============================================================
// 19. 重复字节模式（高频单字节）
// ============================================================
console.log('\n--- 19. 重复/规律字节模式 ---');
// 交替 ASCII + high bytes
test('交替 ASCII+高字节(8B)', Buffer.from([0x41, 0xC0, 0x42, 0xD0, 0x43, 0xE0, 0x44, 0xF0]),
  [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'cp866', 'koi8-r', 'utf-8', 'shift_jis', 'gbk', 'windows-1258', 'windows-1250', 'iso-8859-2'], 0);
// 全高字节范围
test('全高字节 0xA0-0xFF', Buffer.from(Array.from({length: 96}, (_, i) => 0xA0 + i)),
  [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'koi8-r', 'iso-8859-5', 'windows-1253', 'iso-8859-7', 'windows-874', 'tis-620'], 0);
// 递增字节（人工构造，任何编码都是合理猜测）
test('递增字节 0x00-0xFF', Buffer.from(Array.from({length: 256}, (_, i) => i)),
  [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'koi8-r', 'ascii', 'gbk', 'gb2312', 'gb18030', 'euc-kr', 'big5', 'shift_jis', 'euc-jp'], 0);
// 高字节密集型（模拟二进制文件，任何编码都是合理猜测）
test('高字节密集(>90%)', Buffer.from(Array.from({length: 100}, (_, i) => (i % 3 === 0 ? 0x20 : 0xA0 + (i % 60)))),
  [null, 'windows-1252', 'iso-8859-1', 'windows-1251', 'koi8-r', 'iso-8859-5', 'windows-1253', 'windows-874', 'tis-620', 'iso-8859-7', 'gbk', 'gb2312', 'gb18030', 'euc-kr', 'big5', 'shift_jis', 'euc-jp'], 0);

// ============================================================
// 20. 多次检测一致性
// ============================================================
console.log('\n--- 20. 多次检测一致性 ---');
const zhBuf = encode(TEXTS.zh_long, 'gb2312');
const results = [];
for (let i = 0; i < 5; i++) results.push(jschardet.detect(zhBuf).encoding);
const allSame = results.every(r => r === results[0]);
totalTests++;
if (allSame && ['gb2312','gbk','gb18030'].includes(results[0])) {
  totalPassed++;
  console.log(`  [OK] GB2312 多次检测一致性 => ${results[0]} (5次结果一致)`);
} else {
  totalFailed++;
  failures.push({ name: 'GB2312 多次检测一致性', expected: ['gb2312','gbk','gb18030'], got: results.join(','), conf: 0 });
  console.log(`  [FAIL] GB2312 多次检测一致性 => 结果: [${results.join(',')}]`);
}

// ============================================================
// 汇总
// ============================================================
console.log('\n' + '='.repeat(70));
console.log(`总计: ${totalTests} | 通过: ${totalPassed} | 失败: ${totalFailed}`);
console.log(`通过率: ${(totalPassed / totalTests * 100).toFixed(1)}%`);
if (failures.length > 0) {
  console.log('\n失败详情:');
  for (const f of failures) {
    console.log(`  ${f.name}: got ${f.got}(${typeof f.conf === 'number' ? f.conf.toFixed(2) : f.conf}), expected [${Array.isArray(f.expected) ? f.expected.join(', ') : f.expected}]`);
  }
}
console.log('='.repeat(70));
