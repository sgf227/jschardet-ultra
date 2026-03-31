# jschardet-ultra

Universal character encoding detection for JavaScript. Supports **100+ encodings** including CJK, Unicode, Windows code pages, ISO-8859, IBM/DOS, Macintosh, KOI8 and more.

Built on top of [jschardet-eastasia](https://github.com/jiangzhuo/jschardet-eastasia)'s Mozilla Universal Charset Detector engine, enhanced with comprehensive single-byte encoding support via [iconv-lite](https://github.com/ashtuchkin/iconv-lite).

## Compared to jschardet-eastasia

| Feature | jschardet-eastasia | jschardet-ultra |
|---------|-------------------|-----------------|
| Encodings supported | ~16 | 100+ |
| CJK detection accuracy | High | Same (reuses original engine) |
| Single-byte encodings | ❌ Not active | ✅ Full support |
| Windows code pages | ❌ | ✅ 10 encodings |
| ISO-8859 series | ❌ | ✅ 15 encodings |
| IBM/DOS code pages | ❌ | ✅ 28 encodings |
| Macintosh encodings | ❌ | ✅ 11 encodings |
| KOI8 series | ❌ | ✅ 4 encodings |
| Module system | CommonJS (IIFE) | CommonJS (class-based) |
| Test framework | QUnit (browser) | Jest (Node.js) |
| Dependencies | None | iconv-lite |

## Installation

```bash
npm install jschardet-ultra
```

## Usage

```javascript
const jschardet = require('jschardet-ultra');

// Detect from Buffer
const buf = fs.readFileSync('some-file.txt');
jschardet.detect(buf);
// { encoding: 'utf-8', confidence: 0.99 }

// Detect from binary string
jschardet.detect('\xEF\xBB\xBFHello');
// { encoding: 'utf-8', confidence: 1.0 }

// Check encoding support
jschardet.encodingExists('windows-1251'); // true

// Normalize encoding name
jschardet.normalizeEncoding('sjis'); // 'shift_jis'
```

## Detection Architecture

```
Input Data
  ├─ Layer 1: BOM Detection → UTF-8/16/32 (confidence=1.0)
  ├─ Layer 2: ESC Sequence → ISO-2022-*, HZ-GB-2312
  ├─ Layer 3: Multi-byte Statistical → CJK encodings (Mozilla prober engine)
  └─ Layer 4: Single-byte Smart Detection
       ├─ Profile matching (byte signature + invalid byte exclusion)
       ├─ iconv-lite decode + Unicode range language verification
       ├─ DBCS roundtrip validation (fallback for short multi-byte text)
       └─ Brute-force roundtrip (last resort)
```

When MBCS prober confidence is below 0.80, single-byte detection also runs and the best result wins. This prevents false positives on short text where multi-byte byte patterns overlap with single-byte encodings.

## Supported Encodings

### Unicode
- UTF-8 (with or without BOM)
- UTF-16 LE/BE (with BOM)
- UTF-32 LE/BE (with BOM)
- ASCII

### CJK Multi-byte (DBCS)
- **Chinese**: GB2312, GBK, GB18030, Big5, CP950, CP936, HZ-GB-2312, ISO-2022-CN
- **Japanese**: Shift_JIS, CP932, EUC-JP, ISO-2022-JP
- **Korean**: EUC-KR, CP949, ISO-2022-KR

### Windows Code Pages
- windows-874 (Thai), windows-1250 (Central European), windows-1251 (Cyrillic)
- windows-1252 (Western), windows-1253 (Greek), windows-1254 (Turkish)
- windows-1255 (Hebrew), windows-1256 (Arabic), windows-1257 (Baltic)
- windows-1258 (Vietnamese)

### ISO-8859 Series
- ISO-8859-1 through ISO-8859-16 (except 12)

### IBM/DOS Code Pages
- CP437, CP737, CP775, CP808, CP850, CP852, CP855, CP856, CP857, CP858
- CP860–866, CP869, CP922, CP720, CP1046, CP1124–1163

### Macintosh
- MacRoman, MacCyrillic, MacGreek, MacTurkish, MacIceland
- MacCentEuro, MacCroatian, MacRomania, MacUkraine, MacThai

### KOI8 Series
- KOI8-R, KOI8-U, KOI8-RU, KOI8-T

### Other
- ARMSCII-8, RK1048, TCVN, Georgian, PT154, VISCII, TIS-620, etc.

## API

### `jschardet.detect(input)`

Detect the encoding of a Buffer or binary string.

- **input**: `Buffer` or `string`
- **returns**: `{ encoding: string | null, confidence: number }`

### `jschardet.detectAll(input)`

Detect encoding with all candidates and their confidence levels.

- **returns**: `Array<{ encoding: string, confidence: number }>` sorted by confidence

### `jschardet.encodingExists(name)`

Check if an encoding is supported.

### `jschardet.normalizeEncoding(name)`

Normalize an encoding name to its canonical form (e.g. `'sjis'` → `'shift_jis'`).

## Test Results

| Category | Count | Pass Rate |
|----------|-------|-----------|
| BOM detection | 6 | 100% |
| Pure ASCII | 5 | 100% |
| Boundary conditions | 7 | 71% (3-byte edge cases) |
| CJK long text | 7 | 100% |
| CJK short text | 6 | 83% (single char edge) |
| Cyrillic encodings | 5 | 100% |
| Western encodings | 3 | 100% |
| Greek/Hebrew/Arabic/Thai | 5 | 100% |
| Mixed content | 3 | 100% |
| Large data (15KB+) | 4 | 100% |
| Special byte sequences | 3 | 100% |
| **Total** | **54** | **96.3%** |

66-encoding round test: **66/66 (100%)**

### Known Limitations

- Extremely short text (< 4 bytes) may be unreliable — there simply isn't enough statistical data
- Encodings within the same language family (e.g. windows-1252 vs ISO-8859-1, or CP437 vs CP850) share nearly identical byte ranges and are inherently ambiguous
- Depends on iconv-lite (~300KB) unlike the zero-dependency original

## Project Structure

```
jschardet-ultra/
├── index.js                     # Root entry
├── src/
│   ├── index.js                 # Main API
│   ├── constants.js             # Detection constants
│   ├── universal-detector.js    # Core detection engine
│   ├── coding-state-machine.js  # Byte state machine
│   ├── charset-group-prober.js  # Group prober base
│   ├── encoding-aliases.js      # Alias resolver
│   ├── probers/                 # Encoding probers
│   │   ├── charset-prober.js
│   │   ├── mb-charset-prober.js
│   │   ├── utf8-prober.js
│   │   ├── esc-prober.js
│   │   ├── jp-probers.js
│   │   ├── cjk-probers.js
│   │   └── mbcs-group-prober.js
│   └── models/                  # Statistical models
│       ├── mbcssm.js            # Multi-byte state machines
│       ├── escsm.js             # ESC state machines
│       ├── chardistribution.js  # Char distribution
│       └── *freq.js             # Frequency tables
├── test/
│   ├── detect.test.js           # Jest unit tests
│   ├── run-round-test.js        # 66-encoding round test
│   └── comprehensive-test.js    # 54-item comprehensive + boundary test
└── test-results/                # Test result JSON files
```

## License

MIT (new code) + LGPL-2.1 (original Mozilla chardet engine)
