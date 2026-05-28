/**
 * Pitch detection AudioWorklet.
 * Uses the real pitchy library (FFT-based MPM) bundled inline —
 * AudioWorklets cannot use ES module imports.
 *
 * Bundled deps:
 *   fft.js  — node_modules/fft.js/lib/fft.js
 *   pitchy  — node_modules/pitchy/index.js
 */

// ---------------------------------------------------------------------------
// fft.js (verbatim, module.exports removed)
// ---------------------------------------------------------------------------

function FFT(size) {
  this.size = size | 0;
  if (this.size <= 1 || (this.size & (this.size - 1)) !== 0)
    throw new Error('FFT size must be a power of two and bigger than 1');
  this._csize = size << 1;
  var table = new Array(this.size * 2);
  for (var i = 0; i < table.length; i += 2) {
    const angle = Math.PI * i / this.size;
    table[i] = Math.cos(angle);
    table[i + 1] = -Math.sin(angle);
  }
  this.table = table;
  var power = 0;
  for (var t = 1; this.size > t; t <<= 1) power++;
  this._width = power % 2 === 0 ? power - 1 : power;
  this._bitrev = new Array(1 << this._width);
  for (var j = 0; j < this._bitrev.length; j++) {
    this._bitrev[j] = 0;
    for (var shift = 0; shift < this._width; shift += 2) {
      var revShift = this._width - shift - 2;
      this._bitrev[j] |= ((j >>> shift) & 3) << revShift;
    }
  }
  this._out = null;
  this._data = null;
  this._inv = 0;
}
FFT.prototype.fromComplexArray = function(complex, storage) {
  var res = storage || new Array(complex.length >>> 1);
  for (var i = 0; i < complex.length; i += 2) res[i >>> 1] = complex[i];
  return res;
};
FFT.prototype.createComplexArray = function() {
  const res = new Array(this._csize);
  for (var i = 0; i < res.length; i++) res[i] = 0;
  return res;
};
FFT.prototype.toComplexArray = function(input, storage) {
  var res = storage || this.createComplexArray();
  for (var i = 0; i < res.length; i += 2) { res[i] = input[i >>> 1]; res[i + 1] = 0; }
  return res;
};
FFT.prototype.completeSpectrum = function(spectrum) {
  var size = this._csize, half = size >>> 1;
  for (var i = 2; i < half; i += 2) {
    spectrum[size - i] = spectrum[i];
    spectrum[size - i + 1] = -spectrum[i + 1];
  }
};
FFT.prototype.transform = function(out, data) {
  if (out === data) throw new Error('Input and output buffers must be different');
  this._out = out; this._data = data; this._inv = 0; this._transform4();
  this._out = null; this._data = null;
};
FFT.prototype.realTransform = function(out, data) {
  if (out === data) throw new Error('Input and output buffers must be different');
  this._out = out; this._data = data; this._inv = 0; this._realTransform4();
  this._out = null; this._data = null;
};
FFT.prototype.inverseTransform = function(out, data) {
  if (out === data) throw new Error('Input and output buffers must be different');
  this._out = out; this._data = data; this._inv = 1; this._transform4();
  for (var i = 0; i < out.length; i++) out[i] /= this.size;
  this._out = null; this._data = null;
};
FFT.prototype._transform4 = function() {
  var out = this._out, size = this._csize, width = this._width, step = 1 << width;
  var len = (size / step) << 1, outOff, t, bitrev = this._bitrev;
  if (len === 4) {
    for (outOff = 0, t = 0; outOff < size; outOff += len, t++) this._singleTransform2(outOff, bitrev[t], step);
  } else {
    for (outOff = 0, t = 0; outOff < size; outOff += len, t++) this._singleTransform4(outOff, bitrev[t], step);
  }
  var inv = this._inv ? -1 : 1, table = this.table;
  for (step >>= 2; step >= 2; step >>= 2) {
    len = (size / step) << 1;
    var quarterLen = len >>> 2;
    for (outOff = 0; outOff < size; outOff += len) {
      var limit = outOff + quarterLen;
      for (var i = outOff, k = 0; i < limit; i += 2, k += step) {
        const A = i, B = A + quarterLen, C = B + quarterLen, D = C + quarterLen;
        const Ar = out[A], Ai = out[A+1], Br = out[B], Bi = out[B+1];
        const Cr = out[C], Ci = out[C+1], Dr = out[D], Di = out[D+1];
        const MAr = Ar, MAi = Ai;
        const tBr = table[k], tBi = inv * table[k+1];
        const MBr = Br*tBr - Bi*tBi, MBi = Br*tBi + Bi*tBr;
        const tCr = table[2*k], tCi = inv * table[2*k+1];
        const MCr = Cr*tCr - Ci*tCi, MCi = Cr*tCi + Ci*tCr;
        const tDr = table[3*k], tDi = inv * table[3*k+1];
        const MDr = Dr*tDr - Di*tDi, MDi = Dr*tDi + Di*tDr;
        const T0r = MAr+MCr, T0i = MAi+MCi, T1r = MAr-MCr, T1i = MAi-MCi;
        const T2r = MBr+MDr, T2i = MBi+MDi, T3r = inv*(MBr-MDr), T3i = inv*(MBi-MDi);
        out[A] = T0r+T2r; out[A+1] = T0i+T2i;
        out[B] = T1r+T3i; out[B+1] = T1i-T3r;
        out[C] = T0r-T2r; out[C+1] = T0i-T2i;
        out[D] = T1r-T3i; out[D+1] = T1i+T3r;
      }
    }
  }
};
FFT.prototype._singleTransform2 = function(outOff, off, step) {
  const out = this._out, data = this._data;
  const eR = data[off], eI = data[off+1], oR = data[off+step], oI = data[off+step+1];
  out[outOff] = eR+oR; out[outOff+1] = eI+oI; out[outOff+2] = eR-oR; out[outOff+3] = eI-oI;
};
FFT.prototype._singleTransform4 = function(outOff, off, step) {
  const out = this._out, data = this._data, inv = this._inv ? -1 : 1;
  const s2 = step*2, s3 = step*3;
  const Ar = data[off], Ai = data[off+1], Br = data[off+step], Bi = data[off+step+1];
  const Cr = data[off+s2], Ci = data[off+s2+1], Dr = data[off+s3], Di = data[off+s3+1];
  const T0r = Ar+Cr, T0i = Ai+Ci, T1r = Ar-Cr, T1i = Ai-Ci;
  const T2r = Br+Dr, T2i = Bi+Di, T3r = inv*(Br-Dr), T3i = inv*(Bi-Di);
  out[outOff] = T0r+T2r; out[outOff+1] = T0i+T2i;
  out[outOff+2] = T1r+T3i; out[outOff+3] = T1i-T3r;
  out[outOff+4] = T0r-T2r; out[outOff+5] = T0i-T2i;
  out[outOff+6] = T1r-T3i; out[outOff+7] = T1i+T3r;
};
FFT.prototype._realTransform4 = function() {
  var out = this._out, size = this._csize, width = this._width, step = 1 << width;
  var len = (size / step) << 1, outOff, t, bitrev = this._bitrev;
  if (len === 4) {
    for (outOff = 0, t = 0; outOff < size; outOff += len, t++) this._singleRealTransform2(outOff, bitrev[t] >>> 1, step >>> 1);
  } else {
    for (outOff = 0, t = 0; outOff < size; outOff += len, t++) this._singleRealTransform4(outOff, bitrev[t] >>> 1, step >>> 1);
  }
  var inv = this._inv ? -1 : 1, table = this.table;
  for (step >>= 2; step >= 2; step >>= 2) {
    len = (size / step) << 1;
    var halfLen = len >>> 1, quarterLen = halfLen >>> 1, hqLen = quarterLen >>> 1;
    for (outOff = 0; outOff < size; outOff += len) {
      for (var i = 0, k = 0; i <= hqLen; i += 2, k += step) {
        var A = outOff+i, B = A+quarterLen, C = B+quarterLen, D = C+quarterLen;
        var Ar = out[A], Ai = out[A+1], Br = out[B], Bi = out[B+1];
        var Cr = out[C], Ci = out[C+1], Dr = out[D], Di = out[D+1];
        var MAr = Ar, MAi = Ai;
        var tBr = table[k], tBi = inv*table[k+1], MBr = Br*tBr-Bi*tBi, MBi = Br*tBi+Bi*tBr;
        var tCr = table[2*k], tCi = inv*table[2*k+1], MCr = Cr*tCr-Ci*tCi, MCi = Cr*tCi+Ci*tCr;
        var tDr = table[3*k], tDi = inv*table[3*k+1], MDr = Dr*tDr-Di*tDi, MDi = Dr*tDi+Di*tDr;
        var T0r = MAr+MCr, T0i = MAi+MCi, T1r = MAr-MCr, T1i = MAi-MCi;
        var T2r = MBr+MDr, T2i = MBi+MDi, T3r = inv*(MBr-MDr), T3i = inv*(MBi-MDi);
        out[A] = T0r+T2r; out[A+1] = T0i+T2i;
        out[B] = T1r+T3i; out[B+1] = T1i-T3r;
        if (i === 0) { out[C] = T0r-T2r; out[C+1] = T0i-T2i; continue; }
        if (i === hqLen) continue;
        var SA = outOff+quarterLen-i, SB = outOff+halfLen-i;
        out[SA] = T1r - inv*T3i; out[SA+1] = -T1i - inv*T3r;
        out[SB] = T0r - T2r;    out[SB+1] = -(T0i - T2i);
      }
    }
  }
};
FFT.prototype._singleRealTransform2 = function(outOff, off, step) {
  const out = this._out, data = this._data;
  const eR = data[off], oR = data[off+step];
  out[outOff] = eR+oR; out[outOff+1] = 0; out[outOff+2] = eR-oR; out[outOff+3] = 0;
};
FFT.prototype._singleRealTransform4 = function(outOff, off, step) {
  const out = this._out, data = this._data, inv = this._inv ? -1 : 1;
  const s2 = step*2, s3 = step*3;
  const Ar = data[off], Br = data[off+step], Cr = data[off+s2], Dr = data[off+s3];
  const T0r = Ar+Cr, T1r = Ar-Cr, T2r = Br+Dr, T3r = inv*(Br-Dr);
  out[outOff] = T0r+T2r; out[outOff+1] = 0;
  out[outOff+2] = T1r; out[outOff+3] = -T3r;
  out[outOff+4] = T0r-T2r; out[outOff+5] = 0;
  out[outOff+6] = T1r; out[outOff+7] = T3r;
};

// ---------------------------------------------------------------------------
// pitchy helpers (from node_modules/pitchy/index.js, ES exports removed)
// ---------------------------------------------------------------------------

function ceilPow2(v) {
  v--; v |= v>>1; v |= v>>2; v |= v>>4; v |= v>>8; v |= v>>16; v++;
  return v;
}

class Autocorrelator {
  constructor(inputLength, bufferSupplier) {
    if (inputLength < 1) throw new Error('Input length must be at least one');
    this._inputLength = inputLength;
    this._fft = new FFT(ceilPow2(2 * inputLength));
    this._bufferSupplier = bufferSupplier;
    this._paddedInputBuffer = bufferSupplier(this._fft.size);
    this._transformBuffer = bufferSupplier(2 * this._fft.size);
    this._inverseBuffer = bufferSupplier(2 * this._fft.size);
  }
  get inputLength() { return this._inputLength; }
  autocorrelate(input, output = this._bufferSupplier(input.length)) {
    if (input.length !== this._inputLength)
      throw new Error(`Input must have length ${this._inputLength}`);
    for (let i = 0; i < input.length; i++) this._paddedInputBuffer[i] = input[i];
    for (let i = input.length; i < this._paddedInputBuffer.length; i++) this._paddedInputBuffer[i] = 0;
    this._fft.realTransform(this._transformBuffer, this._paddedInputBuffer);
    this._fft.completeSpectrum(this._transformBuffer);
    const tb = this._transformBuffer;
    for (let i = 0; i < tb.length; i += 2) { tb[i] = tb[i]*tb[i] + tb[i+1]*tb[i+1]; tb[i+1] = 0; }
    this._fft.inverseTransform(this._inverseBuffer, this._transformBuffer);
    for (let i = 0; i < input.length; i++) output[i] = this._inverseBuffer[2*i];
    return output;
  }
}

function getKeyMaximumIndices(input) {
  const keyIndices = [];
  let lookingForMaximum = false, max = -Infinity, maxIndex = -1;
  for (let i = 1; i < input.length - 1; i++) {
    if (input[i-1] <= 0 && input[i] > 0) {
      lookingForMaximum = true; maxIndex = i; max = input[i];
    } else if (input[i-1] > 0 && input[i] <= 0) {
      lookingForMaximum = false;
      if (maxIndex !== -1) keyIndices.push(maxIndex);
    } else if (lookingForMaximum && input[i] > max) {
      max = input[i]; maxIndex = i;
    }
  }
  return keyIndices;
}

function refineResultIndex(index, data) {
  const [x0, x1, x2] = [index-1, index, index+1];
  const [y0, y1, y2] = [data[x0], data[x1], data[x2]];
  const a = y0/2 - y1 + y2/2;
  const b = -(y0/2)*(x1+x2) + y1*(x0+x2) - (y2/2)*(x0+x1);
  const c = (y0*x1*x2)/2 - y1*x0*x2 + (y2*x0*x1)/2;
  const xMax = -b / (2*a);
  const yMax = a*xMax*xMax + b*xMax + c;
  return [xMax, yMax];
}

class PitchDetector {
  _clarityThreshold = 0.85;
  _minVolumeAbsolute = 0.0;
  _maxInputAmplitude = 1.0;

  constructor(inputLength, bufferSupplier) {
    this._autocorrelator = new Autocorrelator(inputLength, bufferSupplier);
    this._nsdfBuffer = bufferSupplier(inputLength);
  }
  static forFloat32Array(inputLength) {
    return new PitchDetector(inputLength, (n) => new Float32Array(n));
  }
  get inputLength() { return this._autocorrelator.inputLength; }
  set clarityThreshold(v) { this._clarityThreshold = v; }
  set minVolumeDecibels(db) { this._minVolumeAbsolute = this._maxInputAmplitude * 10 ** (db/20); }
  findPitch(input, sampleRate) {
    if (this._belowMinimumVolume(input)) return [0, 0];
    this._nsdf(input);
    const keyIndices = getKeyMaximumIndices(this._nsdfBuffer);
    if (keyIndices.length === 0) return [0, 0];
    const nMax = Math.max(...keyIndices.map(i => this._nsdfBuffer[i]));
    const resultIndex = keyIndices.find(i => this._nsdfBuffer[i] >= this._clarityThreshold * nMax);
    if (resultIndex === undefined) return [0, 0];
    const [refined, clarity] = refineResultIndex(resultIndex, this._nsdfBuffer);
    return [sampleRate / refined, Math.min(clarity, 1.0)];
  }
  _belowMinimumVolume(input) {
    if (this._minVolumeAbsolute === 0) return false;
    let sq = 0;
    for (let i = 0; i < input.length; i++) sq += input[i] ** 2;
    return Math.sqrt(sq / input.length) < this._minVolumeAbsolute;
  }
  _nsdf(input) {
    this._autocorrelator.autocorrelate(input, this._nsdfBuffer);
    let m = 2 * this._nsdfBuffer[0];
    let i;
    for (i = 0; i < this._nsdfBuffer.length && m > 0; i++) {
      this._nsdfBuffer[i] = (2 * this._nsdfBuffer[i]) / m;
      m -= input[i] ** 2 + input[input.length - i - 1] ** 2;
    }
    for (; i < this._nsdfBuffer.length; i++) this._nsdfBuffer[i] = 0;
  }
}

// ---------------------------------------------------------------------------
// AudioWorklet processor
// ---------------------------------------------------------------------------

const BUFFER_SIZE = 2048

// Voice fundamental frequency range (covers bass to soprano + some head voice)
const VOICE_MIN_HZ = 60
const VOICE_MAX_HZ = 1100
const MEDIAN_WINDOW = 5

function freqToMidiInt(freq) {
  return Math.round(69 + 12 * Math.log2(freq / 440))
}
function midiToFreqExact(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._detector = PitchDetector.forFloat32Array(BUFFER_SIZE)
    this._detector.clarityThreshold = 0.85
    this._detector.minVolumeDecibels = -35
    this._buffer = new Float32Array(BUFFER_SIZE)
    this._cursor = 0
    this._midiWindow = new Int16Array(MEDIAN_WINDOW)
    this._clarityWindow = new Float32Array(MEDIAN_WINDOW)
    this._windowCount = 0
    this._prevMidi = -1
  }

  process(inputs) {
    const channel = inputs[0]?.[0]
    if (!channel) return true

    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._cursor++] = channel[i]

      if (this._cursor === BUFFER_SIZE) {
        const [freq, clarity] = this._detector.findPitch(this._buffer, sampleRate)

        if (freq >= VOICE_MIN_HZ && freq <= VOICE_MAX_HZ && clarity > 0) {
          const midi = freqToMidiInt(freq)

          // Reset window when pitch jumps by a whole tone or more — prevents
          // previous note bleeding into the new note's median
          if (this._prevMidi >= 0 && Math.abs(midi - this._prevMidi) >= 2) {
            this._windowCount = 0
          }
          this._prevMidi = midi

          const idx = this._windowCount % MEDIAN_WINDOW
          this._midiWindow[idx] = midi
          this._clarityWindow[idx] = clarity
          this._windowCount++

          if (this._windowCount >= 3) {
            const filled = Math.min(this._windowCount, MEDIAN_WINDOW)
            const midiSlice = Array.from(this._midiWindow.subarray(0, filled)).sort((a, b) => a - b)
            const claritySlice = Array.from(this._clarityWindow.subarray(0, filled)).sort((a, b) => a - b)
            const mid = Math.floor(filled / 2)
            this.port.postMessage({
              freq: midiToFreqExact(midiSlice[mid]),
              clarity: claritySlice[mid],
              time: currentTime,
            })
          }
        } else {
          this._windowCount = 0
          this._prevMidi = -1
        }

        // 50% overlap — better temporal resolution
        const hop = BUFFER_SIZE >> 1
        this._buffer.copyWithin(0, hop)
        this._cursor = hop
      }
    }

    return true
  }
}

registerProcessor('pitch-detector', PitchProcessor)
