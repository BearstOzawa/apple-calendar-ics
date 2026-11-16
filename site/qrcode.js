"use strict";

(function exposeQrSvg(globalScope) {
  // ISO/IEC 18004 QR Code encoder (Byte mode, ECC Level L, Versions 1..10, max 271 bytes)
  const VERSION_SPECS = [
    null,
    { total: 26, ecPerBlock: 7, blocks: [1, 19, 0, 0], align: [] },
    { total: 44, ecPerBlock: 10, blocks: [1, 34, 0, 0], align: [6, 18] },
    { total: 70, ecPerBlock: 15, blocks: [1, 55, 0, 0], align: [6, 22] },
    { total: 100, ecPerBlock: 20, blocks: [1, 80, 0, 0], align: [6, 26] },
    { total: 134, ecPerBlock: 26, blocks: [1, 108, 0, 0], align: [6, 30] },
    { total: 172, ecPerBlock: 18, blocks: [2, 68, 0, 0], align: [6, 34] },
    { total: 196, ecPerBlock: 20, blocks: [2, 78, 0, 0], align: [6, 22, 38] },
    { total: 242, ecPerBlock: 24, blocks: [2, 97, 0, 0], align: [6, 24, 42] },
    { total: 292, ecPerBlock: 30, blocks: [2, 116, 0, 0], align: [6, 26, 46] },
    { total: 346, ecPerBlock: 18, blocks: [2, 68, 2, 69], align: [6, 28, 50] },
  ];

  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (function initGalois() {
    let x = 1;
    for (let i = 0; i < 255; i += 1) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(degree) {
    let poly = new Uint8Array([1]);
    for (let i = 0; i < degree; i += 1) {
      const next = new Uint8Array(poly.length + 1);
      const factor = GF_EXP[i];
      for (let j = 0; j < poly.length; j += 1) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecLen) {
    const gen = rsGeneratorPoly(ecLen);
    const rem = new Uint8Array(ecLen);
    for (let i = 0; i < data.length; i += 1) {
      const factor = data[i] ^ rem[0];
      rem.copyWithin(0, 1);
      rem[ecLen - 1] = 0;
      if (factor !== 0) {
        for (let j = 0; j < ecLen; j += 1) {
          rem[j] ^= gfMul(gen[j + 1], factor);
        }
      }
    }
    return rem;
  }

  function pickVersion(byteLength) {
    for (let v = 1; v <= 10; v += 1) {
      const spec = VERSION_SPECS[v];
      const [g1, c1, g2, c2] = spec.blocks;
      const dataCodewords = g1 * c1 + g2 * c2;
      const headerBits = v <= 9 ? 12 : 20;
      const capacity = Math.floor((dataCodewords * 8 - headerBits) / 8);
      if (byteLength <= capacity) return { version: v, spec, dataCodewords };
    }
    throw new Error("QR payload exceeds version 10 capacity");
  }

  function buildCodewords(bytes, version, spec, dataCodewords) {
    const bits = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i -= 1) bits.push((val >>> i) & 1);
    };
    pushBits(0b0100, 4);
    pushBits(bytes.length, version <= 9 ? 8 : 16);
    for (const b of bytes) pushBits(b, 8);

    const maxBits = dataCodewords * 8;
    const terminator = Math.min(4, maxBits - bits.length);
    for (let i = 0; i < terminator; i += 1) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const data = new Uint8Array(dataCodewords);
    for (let i = 0; i < bits.length / 8; i += 1) {
      let val = 0;
      for (let b = 0; b < 8; b += 1) val = (val << 1) | bits[i * 8 + b];
      data[i] = val;
    }
    let padIdx = bits.length / 8;
    let toggle = true;
    while (padIdx < dataCodewords) {
      data[padIdx] = toggle ? 0xec : 0x11;
      toggle = !toggle;
      padIdx += 1;
    }

    const [g1, c1, g2, c2] = spec.blocks;
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (let i = 0; i < g1; i += 1) {
      const block = data.slice(offset, offset + c1);
      offset += c1;
      dataBlocks.push(block);
      ecBlocks.push(rsEncode(block, spec.ecPerBlock));
    }
    for (let i = 0; i < g2; i += 1) {
      const block = data.slice(offset, offset + c2);
      offset += c2;
      dataBlocks.push(block);
      ecBlocks.push(rsEncode(block, spec.ecPerBlock));
    }

    const interleaved = [];
    const maxDataLen = Math.max(c1, c2);
    for (let col = 0; col < maxDataLen; col += 1) {
      for (const block of dataBlocks) {
        if (col < block.length) interleaved.push(block[col]);
      }
    }
    for (let col = 0; col < spec.ecPerBlock; col += 1) {
      for (const block of ecBlocks) interleaved.push(block[col]);
    }
    return interleaved;
  }

  function createMatrix(version, alignCenters) {
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Uint8Array(size));
    const isFunc = Array.from({ length: size }, () => new Uint8Array(size));

    const setFunc = (r, c, dark) => {
      if (r < 0 || c < 0 || r >= size || c >= size) return;
      modules[r][c] = dark ? 1 : 0;
      isFunc[r][c] = 1;
    };

    const drawFinder = (top, left) => {
      for (let dr = -1; dr <= 7; dr += 1) {
        for (let dc = -1; dc <= 7; dc += 1) {
          const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
          const isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const isCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          setFunc(top + dr, left + dc, inOuter && (isBorder || isCenter));
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    for (let i = 8; i < size - 8; i += 1) {
      setFunc(6, i, i % 2 === 0);
      setFunc(i, 6, i % 2 === 0);
    }

    for (const r of alignCenters) {
      for (const c of alignCenters) {
        if (
          (r <= 8 && c <= 8) ||
          (r <= 8 && c >= size - 8) ||
          (r >= size - 8 && c <= 8)
        ) {
          continue;
        }
        for (let dr = -2; dr <= 2; dr += 1) {
          for (let dc = -2; dc <= 2; dc += 1) {
            setFunc(
              r + dr,
              c + dc,
              Math.max(Math.abs(dr), Math.abs(dc)) !== 1,
            );
          }
        }
      }
    }

    for (let i = 0; i < 9; i += 1) {
      if (i !== 6) {
        isFunc[8][i] = 1;
        isFunc[i][8] = 1;
      }
    }
    for (let i = 0; i < 8; i += 1) {
      isFunc[8][size - 1 - i] = 1;
      isFunc[size - 1 - i][8] = 1;
    }
    setFunc(size - 8, 8, true);

    if (version >= 7) {
      let rem = version;
      for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const vBits = (version << 12) | rem;
      for (let i = 0; i < 18; i += 1) {
        const dark = ((vBits >>> i) & 1) === 1;
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFunc(a, b, dark);
        setFunc(b, a, dark);
      }
    }

    return { size, modules, isFunc };
  }

  function writeFormatBits(modules, size, mask) {
    const data = (0b01 << 3) | mask; // ECC Level L = 01
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i += 1) modules[8][i] = (bits >>> i) & 1;
    modules[8][7] = (bits >>> 6) & 1;
    modules[8][8] = (bits >>> 7) & 1;
    modules[7][8] = (bits >>> 8) & 1;
    for (let i = 9; i < 15; i += 1) modules[14 - i][8] = (bits >>> i) & 1;

    for (let i = 0; i < 8; i += 1) modules[8][size - 1 - i] = (bits >>> i) & 1;
    for (let i = 8; i < 15; i += 1) modules[size - 15 + i][8] = (bits >>> i) & 1;
    modules[size - 8][8] = 1;
  }

  function maskBit(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  }

  function penaltyScore(modules, size) {
    let score = 0;
    for (let r = 0; r < size; r += 1) {
      let runColor = modules[r][0];
      let runLen = 1;
      for (let c = 1; c < size; c += 1) {
        if (modules[r][c] === runColor) {
          runLen += 1;
          if (runLen === 5) score += 3;
          else if (runLen > 5) score += 1;
        } else {
          runColor = modules[r][c];
          runLen = 1;
        }
      }
    }
    for (let c = 0; c < size; c += 1) {
      let runColor = modules[0][c];
      let runLen = 1;
      for (let r = 1; r < size; r += 1) {
        if (modules[r][c] === runColor) {
          runLen += 1;
          if (runLen === 5) score += 3;
          else if (runLen > 5) score += 1;
        } else {
          runColor = modules[r][c];
          runLen = 1;
        }
      }
    }
    for (let r = 0; r < size - 1; r += 1) {
      for (let c = 0; c < size - 1; c += 1) {
        const v = modules[r][c];
        if (
          v === modules[r][c + 1] &&
          v === modules[r + 1][c] &&
          v === modules[r + 1][c + 1]
        ) {
          score += 3;
        }
      }
    }
    return score;
  }

  function encodeMatrix(text) {
    const bytes = new TextEncoder().encode(String(text));
    const { version, spec, dataCodewords } = pickVersion(bytes.length);
    const codewords = buildCodewords(bytes, version, spec, dataCodewords);
    const { size, modules, isFunc } = createMatrix(version, spec.align);

    let bitIndex = 0;
    const totalBits = codewords.length * 8;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert += 1) {
        const r = upward ? size - 1 - vert : vert;
        for (let j = 0; j < 2; j += 1) {
          const c = right - j;
          if (!isFunc[r][c]) {
            let dark = 0;
            if (bitIndex < totalBits) {
              dark = (codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1;
              bitIndex += 1;
            }
            modules[r][c] = dark;
          }
        }
      }
      upward = !upward;
    }

    let bestMask = 0;
    let bestScore = Infinity;
    let bestModules = null;

    for (let mask = 0; mask < 8; mask += 1) {
      const candidate = modules.map((row) => Uint8Array.from(row));
      for (let r = 0; r < size; r += 1) {
        for (let c = 0; c < size; c += 1) {
          if (!isFunc[r][c] && maskBit(mask, r, c)) {
            candidate[r][c] ^= 1;
          }
        }
      }
      writeFormatBits(candidate, size, mask);
      const score = penaltyScore(candidate, size);
      if (score < bestScore) {
        bestScore = score;
        bestMask = mask;
        bestModules = candidate;
      }
    }

    return { size, version, mask: bestMask, modules: bestModules };
  }

  function renderSvg(text, options = {}) {
    const { size, modules } = encodeMatrix(text);
    const margin = options.margin ?? 2;
    const total = size + margin * 2;
    let path = "";
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (modules[r][c]) {
          path += `M${c + margin},${r + margin}h1v1h-1z`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="订阅二维码"><rect width="${total}" height="${total}" rx="2.5" fill="#ffffff"/><path d="${path}" fill="#14161a"/></svg>`;
  }

  const api = { encodeMatrix, renderSvg };
  globalScope.QrSvg = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
