var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/js/index.js
var index_exports = {};
__export(index_exports, {
  WaveformPlayer: () => WaveformPlayer,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// src/js/utils.js
function parseColorValue(value) {
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      return JSON.parse(value);
    } catch (e) {
    }
  }
  return value;
}
function parseDataAttributes(element) {
  const options = {};
  if (element.dataset.url) options.url = element.dataset.url;
  if (element.dataset.height) options.height = parseInt(element.dataset.height);
  if (element.dataset.samples) options.samples = parseInt(element.dataset.samples);
  if (element.dataset.preload) {
    options.preload = element.dataset.preload;
  }
  if (element.dataset.audioMode) options.audioMode = element.dataset.audioMode;
  if (element.dataset.waveformStyle) options.waveformStyle = element.dataset.waveformStyle;
  if (element.dataset.barWidth) options.barWidth = parseInt(element.dataset.barWidth);
  if (element.dataset.barSpacing) options.barSpacing = parseInt(element.dataset.barSpacing);
  if (element.dataset.barRadius) options.barRadius = parseInt(element.dataset.barRadius);
  if (element.dataset.buttonAlign) options.buttonAlign = element.dataset.buttonAlign;
  if (element.dataset.colorPreset) options.colorPreset = element.dataset.colorPreset;
  if (element.dataset.waveformColor) options.waveformColor = parseColorValue(element.dataset.waveformColor);
  if (element.dataset.progressColor) options.progressColor = parseColorValue(element.dataset.progressColor);
  if (element.dataset.buttonColor) options.buttonColor = element.dataset.buttonColor;
  if (element.dataset.buttonHoverColor) options.buttonHoverColor = element.dataset.buttonHoverColor;
  if (element.dataset.textColor) options.textColor = element.dataset.textColor;
  if (element.dataset.textSecondaryColor) options.textSecondaryColor = element.dataset.textSecondaryColor;
  if (element.dataset.backgroundColor) options.backgroundColor = element.dataset.backgroundColor;
  if (element.dataset.borderColor) options.borderColor = element.dataset.borderColor;
  if (element.dataset.color) options.waveformColor = element.dataset.color;
  if (element.dataset.theme) options.colorPreset = element.dataset.theme;
  if (element.dataset.autoplay) options.autoplay = element.dataset.autoplay === "true";
  if (element.dataset.showControls !== void 0) options.showControls = element.dataset.showControls === "true";
  if (element.dataset.showInfo !== void 0) options.showInfo = element.dataset.showInfo === "true";
  if (element.dataset.showTime) options.showTime = element.dataset.showTime === "true";
  if (element.dataset.showHoverTime) options.showHoverTime = element.dataset.showHoverTime === "true";
  if (element.dataset.showBpm) options.showBPM = element.dataset.showBpm === "true";
  if (element.dataset.singlePlay) options.singlePlay = element.dataset.singlePlay === "true";
  if (element.dataset.playOnSeek) options.playOnSeek = element.dataset.playOnSeek === "true";
  if (element.dataset.title) options.title = element.dataset.title;
  if (element.dataset.subtitle) options.subtitle = element.dataset.subtitle;
  if (element.dataset.album) options.album = element.dataset.album;
  if (element.dataset.artwork) options.artwork = element.dataset.artwork;
  if (element.dataset.waveform) options.waveform = element.dataset.waveform;
  if (element.dataset.markers) {
    try {
      options.markers = JSON.parse(element.dataset.markers);
    } catch (e) {
      console.warn("Invalid markers JSON:", e);
    }
  }
  if (element.dataset.playbackRate) {
    options.playbackRate = parseFloat(element.dataset.playbackRate);
  }
  if (element.dataset.showPlaybackSpeed !== void 0) {
    options.showPlaybackSpeed = element.dataset.showPlaybackSpeed === "true";
  }
  if (element.dataset.playbackRates) {
    try {
      options.playbackRates = JSON.parse(element.dataset.playbackRates);
    } catch (e) {
      console.warn("Invalid playbackRates JSON:", e);
    }
  }
  if (element.dataset.enableMediaSession !== void 0) {
    options.enableMediaSession = element.dataset.enableMediaSession === "true";
  }
  if (element.dataset.showMarkers !== void 0) {
    options.showMarkers = element.dataset.showMarkers === "true";
  }
  if (element.dataset.accessibleSeek !== void 0) {
    options.accessibleSeek = element.dataset.accessibleSeek === "true";
  }
  if (element.dataset.seekLabel) options.seekLabel = element.dataset.seekLabel;
  if (element.dataset.playIcon) options.playIcon = element.dataset.playIcon;
  if (element.dataset.pauseIcon) options.pauseIcon = element.dataset.pauseIcon;
  return options;
}
function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor(seconds % 3600 / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
var idCounter = 0;
function generateId(url) {
  const str = url || "audio";
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i) | 0;
  }
  return `wp_${(hash >>> 0).toString(36)}_${(idCounter++).toString(36)}`;
}
function extractTitleFromUrl(url) {
  if (!url) return "Audio";
  const parts = url.split("/");
  const filename = parts[parts.length - 1];
  const name = filename.split(".")[0];
  return name.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
function mergeOptions(...sources) {
  const result = {};
  for (const source of sources) {
    for (const key in source) {
      if (source[key] !== null && source[key] !== void 0) {
        result[key] = source[key];
      }
    }
  }
  return result;
}
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
function resampleData(data, targetLength) {
  if (data.length === targetLength) return data;
  if (data.length === 0 || targetLength === 0) return [];
  const result = [];
  if (targetLength > data.length) {
    const ratio = (data.length - 1) / (targetLength - 1);
    for (let i = 0; i < targetLength; i++) {
      const index = i * ratio;
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const fraction = index - lower;
      if (upper >= data.length) {
        result.push(data[data.length - 1]);
      } else if (lower === upper) {
        result.push(data[lower]);
      } else {
        const value = data[lower] * (1 - fraction) + data[upper] * fraction;
        result.push(value);
      }
    }
  } else {
    const bucketSize = data.length / targetLength;
    for (let i = 0; i < targetLength; i++) {
      const start = Math.floor(i * bucketSize);
      const end = Math.floor((i + 1) * bucketSize);
      let max = 0;
      let count = 0;
      for (let j = start; j <= end && j < data.length; j++) {
        if (data[j] > max) {
          max = data[j];
        }
        count++;
      }
      if (count === 0) {
        const nearestIndex = Math.min(Math.round(i * bucketSize), data.length - 1);
        max = data[nearestIndex];
      }
      result.push(max);
    }
  }
  return result;
}

// src/js/drawing.js
function makeFill(ctx, value, height) {
  if (!Array.isArray(value)) return value;
  if (value.length === 1) return value[0];
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  value.forEach((c, i) => grad.addColorStop(i / (value.length - 1), c));
  return grad;
}
function fillBar(ctx, x, y, w, h, radii) {
  const any = Array.isArray(radii) ? radii.some((r) => r > 0) : radii > 0;
  if (any && typeof ctx.roundRect === "function") {
    const max = Math.min(w / 2, Math.abs(h) / 2);
    const clamp = (r) => Math.max(0, Math.min(r, max));
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Array.isArray(radii) ? radii.map(clamp) : clamp(radii));
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
}
function barRadiusPx(options, dpr) {
  return (options.barRadius || 0) * dpr;
}
function barRadii(options, dpr) {
  const r = barRadiusPx(options, dpr);
  return [r, r, 0, 0];
}
function drawBars(ctx, canvas, peaks, progress, options) {
  const dpr = window.devicePixelRatio || 1;
  const barWidth = options.barWidth * dpr;
  const barSpacing = options.barSpacing * dpr;
  const barCount = Math.floor(canvas.width / (barWidth + barSpacing));
  const resampledPeaks = resampleData(peaks, barCount);
  const height = canvas.height;
  const progressWidth = progress * canvas.width;
  const radii = barRadii(options, dpr);
  const baseFill = makeFill(ctx, options.color, height);
  const progFill = makeFill(ctx, options.progressColor, height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = baseFill;
  for (let i = 0; i < resampledPeaks.length; i++) {
    const x = i * (barWidth + barSpacing);
    if (x + barWidth > canvas.width) break;
    const peakHeight = resampledPeaks[i] * height * 0.9;
    const y = height - peakHeight;
    fillBar(ctx, x, y, barWidth, peakHeight, radii);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, progressWidth, height);
  ctx.clip();
  ctx.fillStyle = progFill;
  for (let i = 0; i < resampledPeaks.length; i++) {
    const x = i * (barWidth + barSpacing);
    if (x > progressWidth) break;
    const peakHeight = resampledPeaks[i] * height * 0.9;
    const y = height - peakHeight;
    fillBar(ctx, x, y, barWidth, peakHeight, radii);
  }
  ctx.restore();
}
function drawMirror(ctx, canvas, peaks, progress, options) {
  const dpr = window.devicePixelRatio || 1;
  const barWidth = options.barWidth * dpr;
  const barSpacing = options.barSpacing * dpr;
  const barCount = Math.floor(canvas.width / (barWidth + barSpacing));
  const resampledPeaks = resampleData(peaks, barCount);
  const height = canvas.height;
  const centerY = height / 2;
  const progressWidth = progress * canvas.width;
  const r = barRadiusPx(options, dpr);
  const topRadii = [r, r, 0, 0];
  const botRadii = [0, 0, r, r];
  const baseFill = makeFill(ctx, options.color, height);
  const progFill = makeFill(ctx, options.progressColor, height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = baseFill;
  for (let i = 0; i < resampledPeaks.length; i++) {
    const x = i * (barWidth + barSpacing);
    if (x + barWidth > canvas.width) break;
    const peakHeight = resampledPeaks[i] * height * 0.45;
    fillBar(ctx, x, centerY - peakHeight, barWidth, peakHeight, topRadii);
    fillBar(ctx, x, centerY, barWidth, peakHeight, botRadii);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, progressWidth, height);
  ctx.clip();
  ctx.fillStyle = progFill;
  for (let i = 0; i < resampledPeaks.length; i++) {
    const x = i * (barWidth + barSpacing);
    if (x > progressWidth) break;
    const peakHeight = resampledPeaks[i] * height * 0.45;
    fillBar(ctx, x, centerY - peakHeight, barWidth, peakHeight, topRadii);
    fillBar(ctx, x, centerY, barWidth, peakHeight, botRadii);
  }
  ctx.restore();
}
function drawLine(ctx, canvas, peaks, progress, options) {
  const width = canvas.width;
  const height = canvas.height;
  const centerY = height / 2;
  const amplitude = height * 0.35;
  ctx.clearRect(0, 0, width, height);
  const drawCurve = (color, lineWidth, endProgress = 1, addGlow = false) => {
    if (addGlow) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    const points = [];
    const samples = Math.floor(peaks.length * endProgress);
    for (let i = 0; i < samples; i++) {
      const x = i / (peaks.length - 1) * width;
      const peakValue = peaks[i];
      const waveOffset = Math.sin(i * 0.1) * peakValue;
      const y = centerY + waveOffset * amplitude;
      points.push({ x, y });
    }
    for (let i = 0; i < points.length - 1; i++) {
      const cp1x = points[i].x + (points[i + 1].x - points[i].x) * 0.5;
      const cp1y = points[i].y;
      const cp2x = points[i + 1].x - (points[i + 1].x - points[i].x) * 0.5;
      const cp2y = points[i + 1].y;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i + 1].x, points[i + 1].y);
    }
    ctx.stroke();
    if (addGlow) {
      ctx.shadowBlur = 0;
    }
  };
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(width, centerY);
  ctx.stroke();
  for (let i = 0; i <= 10; i++) {
    const x = width / 10 * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  drawCurve(options.color, 2, 1, false);
  if (progress > 0) {
    drawCurve(options.progressColor, 3, progress, true);
  }
}
function drawBlocks(ctx, canvas, peaks, progress, options) {
  const dpr = window.devicePixelRatio || 1;
  const barWidth = (options.barWidth || 3) * dpr;
  const barSpacing = (options.barSpacing || 1) * dpr;
  const barCount = Math.floor(canvas.width / (barWidth + barSpacing));
  const resampledPeaks = resampleData(peaks, barCount);
  const height = canvas.height;
  const blockSize = 4 * dpr;
  const blockGap = 2 * dpr;
  const progressWidth = progress * canvas.width;
  const centerY = height / 2;
  const baseFill = makeFill(ctx, options.color, height);
  const progFill = makeFill(ctx, options.progressColor, height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < resampledPeaks.length; i++) {
    const x = i * (barWidth + barSpacing);
    if (x + barWidth > canvas.width) break;
    const peakHeight = resampledPeaks[i] * height * 0.9;
    const blockCount = Math.floor(peakHeight / (blockSize + blockGap));
    ctx.fillStyle = x < progressWidth ? progFill : baseFill;
    for (let j = 0; j < blockCount; j++) {
      const blockOffset = j * (blockSize + blockGap);
      ctx.fillRect(x, centerY - blockOffset - blockSize, barWidth, blockSize);
      if (j > 0) {
        ctx.fillRect(x, centerY + blockOffset, barWidth, blockSize);
      }
    }
  }
}
function drawDots(ctx, canvas, peaks, progress, options) {
  const dpr = window.devicePixelRatio || 1;
  const barWidth = (options.barWidth || 2) * dpr;
  const barSpacing = (options.barSpacing || 3) * dpr;
  const barCount = Math.floor(canvas.width / (barWidth + barSpacing));
  const resampledPeaks = resampleData(peaks, barCount);
  const height = canvas.height;
  const dotRadius = Math.max(1.5 * dpr, barWidth / 2);
  const progressWidth = progress * canvas.width;
  const centerY = height / 2;
  const baseFill = makeFill(ctx, options.color, height);
  const progFill = makeFill(ctx, options.progressColor, height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < resampledPeaks.length; i++) {
    const x = i * (barWidth + barSpacing) + barWidth / 2;
    if (x > canvas.width) break;
    const peakHeight = resampledPeaks[i] * height * 0.9;
    ctx.fillStyle = x < progressWidth ? progFill : baseFill;
    ctx.beginPath();
    ctx.arc(x, centerY - peakHeight / 2, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, centerY + peakHeight / 2, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawSeekbar(ctx, canvas, peaks, progress, options) {
  const width = canvas.width;
  const height = canvas.height;
  const centerY = height / 2;
  const barHeight = 4;
  const borderRadius = barHeight / 2;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = options.color || "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.moveTo(borderRadius, centerY - barHeight / 2);
  ctx.lineTo(width - borderRadius, centerY - barHeight / 2);
  ctx.arc(width - borderRadius, centerY, barHeight / 2, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(borderRadius, centerY + barHeight / 2);
  ctx.arc(borderRadius, centerY, barHeight / 2, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  if (progress > 0) {
    const progressWidth = Math.max(borderRadius * 2, progress * width);
    ctx.shadowBlur = 8;
    ctx.shadowColor = options.progressColor;
    ctx.fillStyle = options.progressColor || "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.moveTo(borderRadius, centerY - barHeight / 2);
    ctx.lineTo(progressWidth - borderRadius, centerY - barHeight / 2);
    ctx.arc(progressWidth - borderRadius, centerY, barHeight / 2, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(borderRadius, centerY + barHeight / 2);
    ctx.arc(borderRadius, centerY, barHeight / 2, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    const handleRadius = 8;
    const handleX = progressWidth;
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(handleX, centerY, handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = options.progressColor || "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(handleX, centerY, handleRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
var DRAWING_STYLES = {
  "bars": drawBars,
  // Classic vertical bars
  "bar": drawBars,
  "mirror": drawMirror,
  // SoundCloud-style symmetrical
  "line": drawLine,
  // Smooth oscilloscope wave
  "blocks": drawBlocks,
  // LED meter segmented
  "block": drawBlocks,
  "dots": drawDots,
  // Circular points
  "dot": drawDots,
  "seekbar": drawSeekbar
  // Simple progress bar (no waveform)
};
function draw(ctx, canvas, peaks, progress, options) {
  const drawFunc = DRAWING_STYLES[options.waveformStyle] || drawBars;
  drawFunc(ctx, canvas, peaks, progress, options);
}

// src/js/bpm.js
function detectBPM(buffer) {
  try {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const onsets = detectOnsets(channelData, sampleRate);
    if (onsets.length < 2) return 120;
    const intervals = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push((onsets[i] - onsets[i - 1]) / sampleRate);
    }
    const tempoGroups = {};
    intervals.forEach((interval) => {
      const tempo = 60 / interval;
      const bucket = Math.round(tempo / 3) * 3;
      if (bucket > 60 && bucket < 200) {
        tempoGroups[bucket] = (tempoGroups[bucket] || 0) + 1;
      }
    });
    let maxCount = 0;
    let detectedBPM = 120;
    for (const [tempo, count] of Object.entries(tempoGroups)) {
      if (count > maxCount) {
        maxCount = count;
        detectedBPM = parseInt(tempo);
      }
    }
    if (detectedBPM < 70 && tempoGroups[detectedBPM * 2]) {
      detectedBPM *= 2;
    } else if (detectedBPM > 160 && tempoGroups[Math.round(detectedBPM / 2)]) {
      detectedBPM = Math.round(detectedBPM / 2);
    }
    return detectedBPM - 1;
  } catch (e) {
    console.warn("BPM detection failed:", e);
    return null;
  }
}
function detectOnsets(channelData, sampleRate) {
  const windowSize = 2048;
  const hopSize = windowSize / 2;
  const onsets = [];
  let previousEnergy = 0;
  for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
    let energy = 0;
    for (let j = i; j < i + windowSize; j++) {
      energy += channelData[j] * channelData[j];
    }
    energy = energy / windowSize;
    const energyDiff = energy - previousEnergy;
    const threshold = previousEnergy * 1.8 + 0.01;
    if (energyDiff > threshold && energy > 0.01) {
      const lastOnset = onsets[onsets.length - 1] || 0;
      const minDistance = sampleRate * 0.15;
      if (i - lastOnset > minDistance) {
        onsets.push(i);
      }
    }
    previousEnergy = energy * 0.8 + previousEnergy * 0.2;
  }
  return onsets;
}

// src/js/audio.js
function extractPeaks(buffer, samples = 200) {
  const sampleSize = buffer.length / samples;
  const sampleStep = ~~(sampleSize / 10) || 1;
  const channels = buffer.numberOfChannels;
  const peaks = [];
  for (let c = 0; c < channels; c++) {
    const chan = buffer.getChannelData(c);
    for (let i = 0; i < samples; i++) {
      const start = ~~(i * sampleSize);
      const end = ~~(start + sampleSize);
      let min = 0;
      let max = 0;
      for (let j = start; j < end; j += sampleStep) {
        const value = chan[j];
        if (value > max) max = value;
        if (value < min) min = value;
      }
      const peak = Math.max(Math.abs(max), Math.abs(min));
      if (c === 0 || peak > peaks[i]) {
        peaks[i] = peak;
      }
    }
  }
  const maxPeak = Math.max(...peaks);
  return maxPeak > 0 ? peaks.map((peak) => peak / maxPeak) : peaks;
}
async function generateWaveform(url, samples = 200, shouldDetectBPM = false) {
  let audioContext;
  try {
    const AudioCtx = window.AudioContext || /** @type {any} */
    window.webkitAudioContext;
    audioContext = new AudioCtx();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    let peaks = extractPeaks(audioBuffer, samples);
    peaks = normalizePeaks(peaks);
    let bpm = null;
    if (shouldDetectBPM) {
      bpm = detectBPM(audioBuffer);
    }
    return { peaks, bpm };
  } catch (error) {
    console.error("Failed to generate waveform:", error);
    throw error;
  } finally {
    if (audioContext) audioContext.close();
  }
}
function generatePlaceholderWaveform(samples = 200) {
  const data = [];
  for (let i = 0; i < samples; i++) {
    const base = Math.random() * 0.5 + 0.3;
    const variation = Math.sin(i / samples * Math.PI * 4) * 0.2;
    data.push(Math.max(0.1, Math.min(1, base + variation)));
  }
  return data;
}
function normalizePeaks(peaks, targetMax = 0.95) {
  const maxPeak = Math.max(...peaks);
  if (maxPeak === 0 || maxPeak > targetMax) return peaks;
  const scaleFactor = targetMax / maxPeak;
  return peaks.map((peak) => peak * scaleFactor);
}

// src/js/themes.js
function detectColorScheme() {
  const root = document.documentElement;
  const body = document.body;
  if (root.classList.contains("dark") || root.classList.contains("dark-mode") || root.classList.contains("theme-dark") || root.getAttribute("data-theme") === "dark" || root.getAttribute("data-color-scheme") === "dark" || body.classList.contains("dark") || body.classList.contains("dark-mode") || body.getAttribute("data-theme") === "dark") {
    return "dark";
  }
  if (root.classList.contains("light") || root.classList.contains("light-mode") || root.classList.contains("theme-light") || root.getAttribute("data-theme") === "light" || root.getAttribute("data-color-scheme") === "light" || body.classList.contains("light") || body.classList.contains("light-mode") || body.getAttribute("data-theme") === "light") {
    return "light";
  }
  try {
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const rgb = bodyBg.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      const [r, g, b] = rgb.map(Number);
      const brightness = (r * 299 + g * 587 + b * 114) / 1e3;
      if (brightness > 128) {
        return "light";
      } else if (brightness < 128) {
        return "dark";
      }
    }
  } catch (e) {
  }
  if (window.matchMedia) {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  }
  return "dark";
}
var COLOR_PRESETS = {
  dark: {
    waveformColor: "rgba(255, 255, 255, 0.3)",
    progressColor: "rgba(255, 255, 255, 0.9)",
    buttonColor: "rgba(255, 255, 255, 0.9)",
    buttonHoverColor: "rgba(255, 255, 255, 1)",
    textColor: "#ffffff",
    textSecondaryColor: "rgba(255, 255, 255, 0.6)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  light: {
    waveformColor: "rgba(0, 0, 0, 0.2)",
    progressColor: "rgba(0, 0, 0, 0.8)",
    buttonColor: "rgba(0, 0, 0, 0.8)",
    buttonHoverColor: "rgba(0, 0, 0, 0.9)",
    textColor: "#333333",
    textSecondaryColor: "rgba(0, 0, 0, 0.6)",
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderColor: "rgba(0, 0, 0, 0.1)"
  }
};
function getColorPreset(presetName) {
  if (presetName && COLOR_PRESETS[presetName]) {
    return COLOR_PRESETS[presetName];
  }
  const detected = detectColorScheme();
  return COLOR_PRESETS[detected];
}
var DEFAULT_OPTIONS = {
  // Core settings
  url: "",
  height: 60,
  samples: 200,
  preload: "metadata",
  // Audio mode — 'self' = player owns the <audio> element (default, current
  // behavior). 'external' = player is a visualization-only surface; no audio
  // element is created, play() dispatches `waveformplayer:request-play`
  // instead of calling audio.play(), and setPlayingState/setProgress are
  // expected to be driven by an external controller (e.g. WaveformBar).
  audioMode: "self",
  // Playback
  playbackRate: 1,
  showPlaybackSpeed: false,
  playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
  // Layout Options
  buttonAlign: "auto",
  // Default waveform style
  waveformStyle: "mirror",
  barWidth: 2,
  barSpacing: 0,
  // Rounded bar caps (px). 0 = square (default). Applies to bars/mirror.
  barRadius: 0,
  // Color preset: null = auto-detect, 'dark' = force dark, 'light' = force light
  colorPreset: null,
  // Individual color overrides (null means use preset)
  waveformColor: null,
  progressColor: null,
  buttonColor: null,
  buttonHoverColor: null,
  textColor: null,
  textSecondaryColor: null,
  backgroundColor: null,
  borderColor: null,
  // Features
  autoplay: false,
  showControls: true,
  showInfo: true,
  showTime: true,
  showHoverTime: false,
  showBPM: false,
  singlePlay: true,
  playOnSeek: true,
  enableMediaSession: true,
  // Markers
  markers: [],
  showMarkers: true,
  // Accessibility — expose the waveform as a keyboard-operable slider
  // (role="slider" + ARIA value attributes + arrow/page/home/end seeking).
  // seekLabel sets the slider's accessible name; when null it falls back
  // to the track title, then 'Seek'.
  accessibleSeek: true,
  seekLabel: null,
  // Content
  title: null,
  subtitle: null,
  artwork: null,
  album: "",
  // Icons (SVG)
  playIcon: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5v14l11-7z"/></svg>',
  pauseIcon: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  // Callbacks
  onLoad: null,
  onPlay: null,
  onPause: null,
  onEnd: null,
  onError: null,
  onTimeUpdate: null
};
var STYLE_DEFAULTS = {
  bars: { barWidth: 3, barSpacing: 1 },
  mirror: { barWidth: 2, barSpacing: 0 },
  line: { barWidth: 2, barSpacing: 0 },
  blocks: { barWidth: 4, barSpacing: 2 },
  dots: { barWidth: 3, barSpacing: 3 },
  seekbar: { barWidth: 1, barSpacing: 0 }
};

// src/js/core.js
var SEEK_STEP_SECONDS = 5;
var SEEK_PAGE_SECONDS = 10;
var WaveformPlayer = class _WaveformPlayer {
  /** @type {Map<string, WaveformPlayer>} */
  static instances = /* @__PURE__ */ new Map();
  /** @type {WaveformPlayer|null} */
  static currentlyPlaying = null;
  /**
   * Create a new WaveformPlayer instance
   * @param {string|HTMLElement} container - Container element or selector
   * @param {Object} options - Player options
   */
  constructor(container, options = {}) {
    this.container = typeof container === "string" ? document.querySelector(container) : container;
    if (!this.container) {
      throw new Error("WaveformPlayer: Container element not found");
    }
    const dataOptions = parseDataAttributes(this.container);
    this.options = mergeOptions(DEFAULT_OPTIONS, dataOptions, options);
    const preset = getColorPreset(this.options.colorPreset);
    for (const [key, value] of Object.entries(preset)) {
      if (this.options[key] === null || this.options[key] === void 0) {
        this.options[key] = value;
      }
    }
    const styleDefaults = STYLE_DEFAULTS[this.options.waveformStyle];
    if (styleDefaults) {
      if (dataOptions.barWidth === void 0 && options.barWidth === void 0) {
        this.options.barWidth = styleDefaults.barWidth;
      }
      if (dataOptions.barSpacing === void 0 && options.barSpacing === void 0) {
        this.options.barSpacing = styleDefaults.barSpacing;
      }
    }
    this.audio = null;
    this.canvas = null;
    this.ctx = null;
    this.waveformData = [];
    this.progress = 0;
    this.isPlaying = false;
    this.isLoading = false;
    this.hasError = false;
    this.updateTimer = null;
    this.resizeObserver = null;
    this._ac = new AbortController();
    this.id = this.container.id || generateId(this.options.url);
    _WaveformPlayer.instances.set(this.id, this);
    this.init();
    setTimeout(() => {
      this.container.dispatchEvent(new CustomEvent("waveformplayer:ready", {
        bubbles: true,
        detail: { player: this, url: this.options.url }
      }));
    }, 100);
  }
  // ============================================
  // Initialization
  // ============================================
  /**
   * Initialize the player
   * @private
   */
  init() {
    this.createDOM();
    this.createAudio();
    this.initPlaybackSpeed();
    this.initKeyboardControls();
    this.initSeekControl();
    this.bindEvents();
    this.setupResizeObserver();
    requestAnimationFrame(() => {
      this.resizeCanvas();
      if (this.options.url) {
        this.load(this.options.url).then(() => {
          if (this.options.autoplay) {
            this.play()?.catch(() => {
            });
          }
        }).catch((error) => {
          console.error("Failed to load audio:", error);
        });
      }
    });
  }
  /**
   * Create DOM elements
   * @private
   */
  createDOM() {
    this.container.innerHTML = "";
    this.container.className = "waveform-player";
    let buttonAlign = this.options.buttonAlign;
    if (buttonAlign === "auto") {
      const style = this.options.waveformStyle;
      if (style === "bars") {
        buttonAlign = "bottom";
      } else {
        buttonAlign = "center";
      }
    }
    const buttonHTML = this.options.showControls ? `
        <button class="waveform-btn" aria-label="Play/Pause" style="
            border-color: ${this.options.buttonColor};
            color: ${this.options.buttonColor};
        ">
          <span class="waveform-icon-play">${this.options.playIcon}</span>
          <span class="waveform-icon-pause" style="display:none;">${this.options.pauseIcon}</span>
        </button>
        ` : "";
    const infoHTML = this.options.showInfo ? `
      <div class="waveform-info">
        ${this.options.artwork ? `
          <img class="waveform-artwork" src="${this.options.artwork}" alt="Album artwork" style="
            width: 40px;
            height: 40px;
            border-radius: 4px;
            object-fit: cover;
            flex-shrink: 0;
          ">
        ` : ""}
        <div class="waveform-text">
          <span class="waveform-title" style="color: ${this.options.textColor};"></span>
          ${this.options.subtitle ? `<span class="waveform-subtitle" style="color: ${this.options.textSecondaryColor};">${this.options.subtitle}</span>` : ""}
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          ${this.options.showBPM ? `
            <span class="waveform-bpm" style="color: ${this.options.textSecondaryColor}; display: none;">
              <span class="bpm-value">--</span> BPM
            </span>
          ` : ""}
          ${this.options.showPlaybackSpeed ? `
            <div class="waveform-speed">
              <button class="speed-btn" aria-label="Playback speed">
                <span class="speed-value">1x</span>
              </button>
              <div class="speed-menu" style="display: none;">
                ${this.options.playbackRates.map(
      (rate) => `<button class="speed-option" data-rate="${rate}">${rate}x</button>`
    ).join("")}
              </div>
            </div>
          ` : ""}
          ${this.options.showTime ? `
            <span class="waveform-time" style="color: ${this.options.textSecondaryColor};">
              <span class="time-current">0:00</span> / <span class="time-total">0:00</span>
            </span>
          ` : ""}
        </div>
      </div>
        ` : "";
    this.container.innerHTML = `
  <div class="waveform-player-inner">
    <div class="waveform-body">
      <div class="waveform-track waveform-align-${buttonAlign}">
        ${buttonHTML}
        
        <div class="waveform-container">
          <canvas></canvas>
          <div class="waveform-markers"></div>
          <div class="waveform-loading" style="display:none;"></div>
          <div class="waveform-error" style="display:none;" role="alert">
            <span class="waveform-error-text">Unable to load audio</span>
          </div>
        </div>
      </div>
      
      ${infoHTML}
    </div>
  </div>
`;
    this.playBtn = this.container.querySelector(".waveform-btn");
    this.canvas = this.container.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.titleEl = this.container.querySelector(".waveform-title");
    this.subtitleEl = this.container.querySelector(".waveform-subtitle");
    this.artworkEl = this.container.querySelector(".waveform-artwork");
    this.currentTimeEl = this.container.querySelector(".time-current");
    this.totalTimeEl = this.container.querySelector(".time-total");
    this.bpmEl = this.container.querySelector(".waveform-bpm");
    this.bpmValueEl = this.container.querySelector(".bpm-value");
    this.loadingEl = this.container.querySelector(".waveform-loading");
    this.errorEl = this.container.querySelector(".waveform-error");
    this.markersContainer = this.container.querySelector(".waveform-markers");
    this.speedBtn = this.container.querySelector(".speed-btn");
    this.speedMenu = this.container.querySelector(".speed-menu");
    this.resizeCanvas();
  }
  /**
   * Create audio element
   * @private
   *
   * No-op in `audioMode: 'external'` — the player has no audio of its
   * own; an external controller (e.g. WaveformBar) owns playback and
   * pushes state in via setPlayingState() / setProgress(). The
   * `this.audio` field stays null in that mode; downstream code must
   * null-check it.
   */
  createAudio() {
    if (this.options.audioMode === "external") {
      this.audio = null;
      return;
    }
    this.audio = new Audio();
    this.audio.preload = this.options.preload || "metadata";
    this.audio.crossOrigin = "anonymous";
  }
  // ============================================
  // Feature Initialization
  // ============================================
  /**
   * Initialize playback speed controls
   * @private
   */
  initPlaybackSpeed() {
    if (this.audio && this.options.playbackRate && this.options.playbackRate !== 1) {
      this.audio.playbackRate = this.options.playbackRate;
    }
    if (this.options.showPlaybackSpeed) {
      this.initSpeedControls();
    }
  }
  /**
   * Initialize speed control UI
   * @private
   */
  initSpeedControls() {
    const speedBtn = this.container.querySelector(".speed-btn");
    const speedMenu = this.container.querySelector(".speed-menu");
    if (!speedBtn || !speedMenu) return;
    speedBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      speedMenu.style.display = speedMenu.style.display === "none" ? "block" : "none";
    }, { signal: this._ac.signal });
    document.addEventListener("click", () => {
      speedMenu.style.display = "none";
    }, { signal: this._ac.signal });
    speedMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.target.classList.contains("speed-option")) {
        const rate = parseFloat(e.target.dataset.rate);
        this.setPlaybackRate(rate);
        speedMenu.style.display = "none";
      }
    }, { signal: this._ac.signal });
    this.updateSpeedUI();
  }
  /**
   * Initialize keyboard controls
   * @private
   */
  initKeyboardControls() {
    this.container.setAttribute("tabindex", "-1");
    this.container.addEventListener("click", () => {
      _WaveformPlayer.getAllInstances().forEach((player) => {
        if (player !== this) {
          player.container.setAttribute("tabindex", "-1");
        }
      });
      this.container.setAttribute("tabindex", "0");
      this.container.focus();
    }, { signal: this._ac.signal });
    this.container.addEventListener("keydown", (e) => {
      if (document.activeElement !== this.container) return;
      const key = e.key;
      const hasAudio = !!this.audio;
      const currentTime = hasAudio ? this.audio.currentTime : 0;
      if (hasAudio && key >= "0" && key <= "9") {
        e.preventDefault();
        this.seekToPercent(parseInt(key) / 10);
        return;
      }
      const actions = {
        " ": () => this.togglePlay()
      };
      if (hasAudio) {
        actions["ArrowLeft"] = () => this.seekTo(Math.max(0, currentTime - 5));
        actions["ArrowRight"] = () => this.seekTo(Math.min(this.audio.duration, currentTime + 5));
        actions["ArrowUp"] = () => this.setVolume(Math.min(1, this.audio.volume + 0.1));
        actions["ArrowDown"] = () => this.setVolume(Math.max(0, this.audio.volume - 0.1));
        actions["m"] = actions["M"] = () => this.audio.muted = !this.audio.muted;
      }
      if (actions[key]) {
        e.preventDefault();
        actions[key]();
      }
    }, { signal: this._ac.signal });
  }
  /**
   * Expose the waveform as an accessible, keyboard-operable slider.
   *
   * Adds role="slider" + ARIA value attributes to the waveform surface,
   * makes it focusable in the tab order, and handles the standard slider
   * keys (arrows, Page Up/Down, Home/End) to seek. Works in both self and
   * external audio modes. Opt out with `accessibleSeek: false`.
   * @private
   */
  initSeekControl() {
    if (!this.options.accessibleSeek) return;
    this.seekEl = this.container.querySelector(".waveform-container");
    if (!this.seekEl) return;
    this.seekEl.setAttribute("role", "slider");
    this.seekEl.setAttribute("tabindex", "0");
    this.seekEl.setAttribute("aria-valuemin", "0");
    this.applySeekLabel();
    this.updateSeekAccessibility();
    this.seekEl.addEventListener("keydown", (e) => {
      const duration = this.getSeekDuration();
      if (!duration) return;
      const current = this.getSeekCurrentTime();
      let target;
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          target = current - SEEK_STEP_SECONDS;
          break;
        case "ArrowRight":
        case "ArrowUp":
          target = current + SEEK_STEP_SECONDS;
          break;
        case "PageDown":
          target = current - SEEK_PAGE_SECONDS;
          break;
        case "PageUp":
          target = current + SEEK_PAGE_SECONDS;
          break;
        case "Home":
          target = 0;
          break;
        case "End":
          target = duration;
          break;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
      this.seekToSeconds(target);
    }, { signal: this._ac.signal });
  }
  /**
   * Total seekable duration in seconds, regardless of audio mode.
   * @returns {number}
   * @private
   */
  getSeekDuration() {
    if (this.options.audioMode === "external") {
      return this._extDuration || 0;
    }
    return this.audio && Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }
  /**
   * Current playback position in seconds, regardless of audio mode.
   * @returns {number}
   * @private
   */
  getSeekCurrentTime() {
    if (this.options.audioMode === "external") {
      return this.progress * (this._extDuration || 0);
    }
    return this.audio && Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
  }
  /**
   * Seek the slider to an absolute time, clamped to the track length.
   * Routes through the external controller in external mode.
   * @param {number} seconds - Target time in seconds.
   * @private
   */
  seekToSeconds(seconds) {
    const duration = this.getSeekDuration();
    if (!duration) return;
    const clamped = Math.max(0, Math.min(seconds, duration));
    if (this.options.audioMode === "external") {
      const percent = clamped / duration;
      const evt = new CustomEvent("waveformplayer:request-seek", {
        bubbles: true,
        cancelable: true,
        detail: { ...this._buildTrackDetail(), percent }
      });
      this.container.dispatchEvent(evt);
      if (!evt.defaultPrevented) {
        this.progress = percent;
        this.drawWaveform?.();
      }
      this.updateSeekAccessibility();
      return;
    }
    this.seekTo(clamped);
  }
  /**
   * Set the slider's accessible name from `seekLabel`, falling back to the
   * track title, then a generic 'Seek'.
   * @private
   */
  applySeekLabel(title = this.options.title) {
    if (!this.seekEl) return;
    const label = this.options.seekLabel || title || "Seek";
    this.seekEl.setAttribute("aria-label", label);
  }
  /**
   * Keep the slider's ARIA value attributes in sync with playback.
   * @private
   */
  updateSeekAccessibility() {
    if (!this.seekEl) return;
    const duration = this.getSeekDuration();
    const current = Math.min(this.getSeekCurrentTime(), duration);
    this.seekEl.setAttribute("aria-valuemax", String(Math.round(duration)));
    this.seekEl.setAttribute("aria-valuenow", String(Math.round(current)));
    this.seekEl.setAttribute(
      "aria-valuetext",
      `${formatTime(current)} of ${formatTime(duration)}`
    );
  }
  /**
   * Initialize Media Session API for system media controls
   * @private
   */
  initMediaSession() {
    if (!("mediaSession" in navigator) || !this.options.enableMediaSession) return;
    if (!this.audio) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: this.options.title || "Unknown Track",
      artist: this.options.subtitle || "",
      album: this.options.album || "",
      artwork: this.options.artwork ? [
        { src: this.options.artwork, sizes: "512x512", type: "image/jpeg" }
      ] : []
    });
    navigator.mediaSession.setActionHandler("play", () => this.play());
    navigator.mediaSession.setActionHandler("pause", () => this.pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      this.seekTo(Math.max(0, this.audio.currentTime - 10));
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      this.seekTo(Math.min(this.audio.duration, this.audio.currentTime + 10));
    });
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== null) {
        this.seekTo(details.seekTime);
      }
    });
  }
  // ============================================
  // Event Binding
  // ============================================
  /**
   * Bind event listeners
   * @private
   */
  bindEvents() {
    if (this.playBtn) {
      this.playBtn.addEventListener("click", () => this.togglePlay());
    }
    if (this.audio) {
      this.audio.addEventListener("loadstart", () => this.setLoading(true));
      this.audio.addEventListener("loadedmetadata", () => this.onMetadataLoaded());
      this.audio.addEventListener("canplay", () => this.setLoading(false));
      this.audio.addEventListener("play", () => this.onPlay());
      this.audio.addEventListener("pause", () => this.onPause());
      this.audio.addEventListener("ended", () => this.onEnded());
      this.audio.addEventListener("error", (e) => this.onError(e));
    }
    this.canvas.addEventListener("click", (e) => this.handleCanvasClick(e));
    this.resizeHandler = debounce(() => this.resizeCanvas(), 100);
    window.addEventListener("resize", this.resizeHandler);
  }
  /**
   * Setup resize observer
   * @private
   */
  setupResizeObserver() {
    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
      });
      if (this.canvas?.parentElement) {
        this.resizeObserver.observe(this.canvas.parentElement);
      }
    }
  }
  // ============================================
  // Audio Loading
  // ============================================
  /**
   * Load audio file
   * @param {string} url - Audio URL
   * @returns {Promise<void>}
   */
  async load(url) {
    try {
      this.setLoading(true);
      this.progress = 0;
      this.hasError = false;
      if (this.audio) {
        this.audio.src = url;
        await new Promise((resolve, reject) => {
          const metadataHandler = () => {
            this.audio.removeEventListener("loadedmetadata", metadataHandler);
            this.audio.removeEventListener("error", errorHandler);
            resolve();
          };
          const errorHandler = (e) => {
            this.audio.removeEventListener("loadedmetadata", metadataHandler);
            this.audio.removeEventListener("error", errorHandler);
            reject(e);
          };
          this.audio.addEventListener("loadedmetadata", metadataHandler);
          this.audio.addEventListener("error", errorHandler);
        });
      }
      const title = this.options.title || extractTitleFromUrl(url);
      if (this.titleEl) {
        this.titleEl.textContent = title;
      }
      this.applySeekLabel(title);
      if (this.options.waveform) {
        this.setWaveformData(this.options.waveform);
      } else {
        try {
          const result = await generateWaveform(url, this.options.samples, this.options.showBPM);
          this.waveformData = result.peaks;
          if (result.bpm) {
            this.detectedBPM = result.bpm;
            this.updateBPMDisplay();
          }
        } catch (error) {
          console.warn("Using placeholder waveform:", error);
          this.waveformData = generatePlaceholderWaveform(this.options.samples);
        }
      }
      this.drawWaveform();
      this.renderMarkers();
      this.initMediaSession();
      if (this.options.onLoad) {
        this.options.onLoad(this);
      }
    } catch (error) {
      console.error("Failed to load audio:", error);
      this.onError(error);
    } finally {
      this.setLoading(false);
    }
  }
  /**
   * Load a new track
   * @param {string} url - Audio URL
   * @param {string} [title] - Track title
   * @param {string} [subtitle] - Track subtitle
   * @param {Object} [options] - Additional options
   * @returns {Promise<void>}
   */
  async loadTrack(url, title = null, subtitle = null, options = {}) {
    if (this.isPlaying) {
      this.pause();
    }
    if (this.audio) {
      this.audio.src = "";
      this.audio.load();
    }
    this.hasError = false;
    if (this.errorEl) {
      this.errorEl.style.display = "none";
    }
    if (this.canvas) {
      this.canvas.style.opacity = "1";
    }
    if (this.playBtn) {
      this.playBtn.disabled = false;
    }
    this.progress = 0;
    this.waveformData = [];
    this.options = mergeOptions(this.options, {
      url,
      title: title || this.options.title,
      subtitle: subtitle || this.options.subtitle,
      ...options
    });
    if (options.preload && this.audio) {
      this.audio.preload = options.preload;
    }
    if (this.subtitleEl) {
      if (subtitle) {
        this.subtitleEl.textContent = subtitle;
        this.subtitleEl.style.display = "";
      } else if (subtitle === "") {
        this.subtitleEl.style.display = "none";
      }
    }
    if (options.artwork && this.artworkEl) {
      this.artworkEl.src = options.artwork;
    }
    this.options.markers = options.markers || [];
    await this.load(url);
    this.play().catch(() => {
    });
  }
  // ============================================
  // Visualization
  // ============================================
  /**
   * Set waveform data
   * @private
   */
  setWaveformData(data) {
    if (typeof data === "string" && data.trim().endsWith(".json")) {
      fetch(data.trim()).then((r) => r.json()).then((json) => {
        this.waveformData = Array.isArray(json) ? json : json.peaks || [];
        if (json.markers && !this.options.markers?.length) {
          this.options.markers = json.markers;
          this.renderMarkers();
        }
        this.drawWaveform();
      }).catch(() => {
      });
      return;
    }
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        this.waveformData = Array.isArray(parsed) ? parsed : [];
      } catch {
        this.waveformData = data.split(",").map(Number);
      }
    } else {
      this.waveformData = Array.isArray(data) ? data : [];
    }
    this.drawWaveform();
  }
  /**
   * Draw waveform
   * @private
   */
  drawWaveform() {
    if (!this.ctx || this.waveformData.length === 0) return;
    draw(this.ctx, this.canvas, this.waveformData, this.progress, {
      ...this.options,
      waveformStyle: this.options.waveformStyle || "bars",
      color: this.options.waveformColor,
      progressColor: this.options.progressColor
    });
  }
  /**
   * Resize canvas
   * @private
   */
  resizeCanvas() {
    if (!this.canvas || this.isDestroying) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = this.options.height * dpr;
    this.canvas.parentElement.style.height = this.options.height + "px";
    this.drawWaveform();
  }
  /**
   * Render markers on the waveform
   * @private
   */
  renderMarkers() {
    if (!this.markersContainer) return;
    this.markersContainer.innerHTML = "";
    if (!this.options.showMarkers || !this.options.markers?.length) return;
    const duration = this.getSeekDuration();
    if (!duration) {
      return;
    }
    this.options.markers.forEach((marker, index) => {
      if (marker.time > duration) {
        console.warn(`Marker "${marker.label}" at ${marker.time}s exceeds audio duration of ${duration}s`);
        return;
      }
      const position = marker.time / duration * 100;
      const markerEl = document.createElement("button");
      markerEl.className = "waveform-marker";
      markerEl.style.left = `${position}%`;
      markerEl.style.backgroundColor = marker.color || "rgba(255, 255, 255, 0.5)";
      markerEl.setAttribute("aria-label", marker.label);
      markerEl.setAttribute("data-time", marker.time);
      const tooltip = document.createElement("span");
      tooltip.className = "waveform-marker-tooltip";
      tooltip.textContent = marker.label;
      markerEl.appendChild(tooltip);
      markerEl.addEventListener("click", (e) => {
        e.stopPropagation();
        this.seekTo(marker.time);
        if (this.options.playOnSeek && !this.isPlaying) {
          this.play();
        }
      });
      this.markersContainer.appendChild(markerEl);
    });
  }
  // ============================================
  // Event Handlers
  // ============================================
  /**
   * Handle canvas click
   * @private
   */
  handleCanvasClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const targetPercent = Math.max(0, Math.min(1, x / rect.width));
    if (this.options.audioMode === "external") {
      const evt = new CustomEvent("waveformplayer:request-seek", {
        bubbles: true,
        cancelable: true,
        detail: { ...this._buildTrackDetail(), percent: targetPercent }
      });
      this.container.dispatchEvent(evt);
      if (!evt.defaultPrevented) {
        this.progress = targetPercent;
        this.drawWaveform?.();
      }
      return;
    }
    if (!this.audio || !this.audio.duration) return;
    this.seekToPercent(targetPercent);
  }
  /**
   * Set loading state
   * @private
   */
  setLoading(loading) {
    this.isLoading = loading;
    if (this.loadingEl) {
      this.loadingEl.style.display = loading ? "block" : "none";
    }
    if (this.seekEl) {
      this.seekEl.setAttribute("aria-busy", loading ? "true" : "false");
    }
  }
  /**
   * Handle metadata loaded
   * @private
   */
  onMetadataLoaded() {
    if (this.isDestroying) return;
    if (this.totalTimeEl) {
      this.totalTimeEl.textContent = formatTime(this.audio.duration);
    }
    this.renderMarkers();
    this.updateSeekAccessibility();
  }
  /**
   * Handle play event
   * @private
   */
  onPlay() {
    if (this.isDestroying) return;
    this.isPlaying = true;
    if (this.playBtn) {
      this.playBtn.classList.add("playing");
      const playIcon = this.playBtn.querySelector(".waveform-icon-play");
      const pauseIcon = this.playBtn.querySelector(".waveform-icon-pause");
      if (playIcon) playIcon.style.display = "none";
      if (pauseIcon) pauseIcon.style.display = "flex";
    }
    this.startSmoothUpdate();
    this.container.dispatchEvent(new CustomEvent("waveformplayer:play", {
      bubbles: true,
      detail: { player: this, url: this.options.url }
    }));
    if (this.options.onPlay) {
      this.options.onPlay(this);
    }
  }
  /**
   * Handle pause event
   * @private
   */
  onPause() {
    if (this.isDestroying) return;
    this.isPlaying = false;
    if (this.playBtn) {
      this.playBtn.classList.remove("playing");
      const playIcon = this.playBtn.querySelector(".waveform-icon-play");
      const pauseIcon = this.playBtn.querySelector(".waveform-icon-pause");
      if (playIcon) playIcon.style.display = "flex";
      if (pauseIcon) pauseIcon.style.display = "none";
    }
    this.stopSmoothUpdate();
    this.container.dispatchEvent(new CustomEvent("waveformplayer:pause", {
      bubbles: true,
      detail: { player: this, url: this.options.url }
    }));
    if (this.options.onPause) {
      this.options.onPause(this);
    }
  }
  /**
   * Handle ended event
   * @private
   */
  onEnded() {
    if (this.isDestroying) return;
    this.progress = 0;
    this.audio.currentTime = 0;
    this.drawWaveform();
    if (this.currentTimeEl) {
      this.currentTimeEl.textContent = "0:00";
    }
    this.container.dispatchEvent(new CustomEvent("waveformplayer:ended", {
      bubbles: true,
      detail: { player: this, url: this.options.url }
    }));
    this.onPause();
    if (this.options.onEnd) {
      this.options.onEnd(this);
    }
  }
  /**
   * Handle error event
   * @private
   */
  onError(error) {
    if (this.isDestroying) return;
    console.error("Audio error:", error);
    this.hasError = true;
    this.setLoading(false);
    if (this.errorEl) {
      this.errorEl.style.display = "flex";
    }
    if (this.canvas) {
      this.canvas.style.opacity = "0.2";
    }
    if (this.playBtn) {
      this.playBtn.disabled = true;
    }
    if (this.options.onError) {
      this.options.onError(error, this);
    }
  }
  // ============================================
  // Progress Updates
  // ============================================
  /**
   * Start smooth update animation
   * @private
   */
  startSmoothUpdate() {
    this.stopSmoothUpdate();
    const update = () => {
      if (this.isPlaying && this.audio && this.audio.duration) {
        this.updateProgress();
        this.updateTimer = requestAnimationFrame(update);
      }
    };
    this.updateTimer = requestAnimationFrame(update);
  }
  /**
   * Stop smooth update animation
   * @private
   */
  stopSmoothUpdate() {
    if (this.updateTimer) {
      cancelAnimationFrame(this.updateTimer);
      this.updateTimer = null;
    }
  }
  /**
   * Update progress
   * @private
   */
  updateProgress() {
    if (!this.audio || !this.audio.duration) return;
    const newProgress = this.audio.currentTime / this.audio.duration;
    if (Math.abs(newProgress - this.progress) > 1e-3) {
      this.progress = newProgress;
      this.drawWaveform();
    }
    if (this.currentTimeEl) {
      this.currentTimeEl.textContent = formatTime(this.audio.currentTime);
    }
    this.container.dispatchEvent(new CustomEvent("waveformplayer:timeupdate", {
      bubbles: true,
      detail: {
        player: this,
        currentTime: this.audio.currentTime,
        duration: this.audio.duration,
        progress: this.progress,
        url: this.options.url
      }
    }));
    if (this.options.onTimeUpdate) {
      this.options.onTimeUpdate(this.audio.currentTime, this.audio.duration, this);
    }
    this.updateSeekAccessibility();
  }
  // ============================================
  // UI Updates
  // ============================================
  /**
   * Update BPM display
   * @private
   */
  updateBPMDisplay() {
    if (this.bpmEl && this.bpmValueEl && this.detectedBPM) {
      this.bpmValueEl.textContent = Math.round(this.detectedBPM);
      this.bpmEl.style.display = "inline-flex";
    }
  }
  /**
   * Update speed UI to reflect current rate
   * @private
   */
  updateSpeedUI() {
    if (!this.audio) return;
    const speedValue = this.container.querySelector(".speed-value");
    if (speedValue) {
      const rate = this.audio.playbackRate;
      speedValue.textContent = rate === 1 ? "1x" : `${rate}x`;
    }
    this.container.querySelectorAll(".speed-option").forEach((btn) => {
      btn.classList.toggle("active", parseFloat(btn.dataset.rate) === this.audio.playbackRate);
    });
  }
  // ============================================
  // Public API
  // ============================================
  /**
   * Play audio.
   *
   * In `audioMode: 'self'` (default): calls the underlying <audio>
   * element's play(). Returns the promise from HTMLMediaElement.play().
   *
   * In `audioMode: 'external'`: dispatches a cancelable
   * `waveformplayer:request-play` event with the track metadata and
   * does NOT touch any audio element. Returns `undefined`. An external
   * controller (e.g. WaveformBar) listens for this event and starts
   * playback on its own audio source, then pushes state back via
   * setPlayingState() / setProgress(). Calling preventDefault() on
   * the event lets the controller veto the play (state is unchanged).
   *
   * @return {Promise|undefined}
   */
  play() {
    if (this.options.singlePlay && _WaveformPlayer.currentlyPlaying && _WaveformPlayer.currentlyPlaying !== this) {
      _WaveformPlayer.currentlyPlaying.pause();
    }
    if (this.options.audioMode === "external") {
      const evt = new CustomEvent("waveformplayer:request-play", {
        bubbles: true,
        cancelable: true,
        detail: this._buildTrackDetail()
      });
      this.container.dispatchEvent(evt);
      if (!evt.defaultPrevented) {
        _WaveformPlayer.currentlyPlaying = this;
      }
      return void 0;
    }
    _WaveformPlayer.currentlyPlaying = this;
    return this.audio.play();
  }
  /**
   * Pause audio.
   *
   * In `audioMode: 'external'`, dispatches `waveformplayer:request-pause`
   * (cancelable) and does NOT touch any audio element. See play().
   */
  pause() {
    if (_WaveformPlayer.currentlyPlaying === this) {
      _WaveformPlayer.currentlyPlaying = null;
    }
    if (this.options.audioMode === "external") {
      this.container.dispatchEvent(new CustomEvent("waveformplayer:request-pause", {
        bubbles: true,
        cancelable: true,
        detail: this._buildTrackDetail()
      }));
      return;
    }
    this.audio.pause();
  }
  /**
   * Build the track detail object dispatched by request-play /
   * request-pause events in external audio mode. Mirrors the shape
   * WaveformBar.play() accepts so a controller can forward it
   * directly: `WaveformBar.play(event.detail)`.
   *
   * @private
   * @return {{url:string,title:?string,subtitle:?string,artist:?string,artwork:?string,player:WaveformPlayer}}
   */
  _buildTrackDetail() {
    return {
      url: this.options.url,
      title: this.options.title,
      subtitle: this.options.subtitle,
      artist: this.options.artist,
      artwork: this.options.artwork,
      id: this.id,
      player: this
    };
  }
  /**
   * External-mode state pump: flip the play/pause visual state without
   * touching audio. Mirrors what onPlay()/onPause() do but skips the
   * audio-element interactions. Safe to call repeatedly — idempotent.
   *
   * @param {boolean} playing
   */
  setPlayingState(playing) {
    const wasPlaying = this.isPlaying;
    this.isPlaying = !!playing;
    if (this.playBtn) {
      this.playBtn.classList.toggle("playing", this.isPlaying);
      const playIcon = this.playBtn.querySelector(".waveform-icon-play");
      const pauseIcon = this.playBtn.querySelector(".waveform-icon-pause");
      if (playIcon) playIcon.style.display = this.isPlaying ? "none" : "flex";
      if (pauseIcon) pauseIcon.style.display = this.isPlaying ? "flex" : "none";
    }
    if (this.isPlaying && !wasPlaying) {
      this.startSmoothUpdate?.();
      this.container.dispatchEvent(new CustomEvent("waveformplayer:play", {
        bubbles: true,
        detail: { player: this, url: this.options.url }
      }));
      if (this.options.onPlay) this.options.onPlay(this);
    } else if (!this.isPlaying && wasPlaying) {
      this.stopSmoothUpdate?.();
      this.container.dispatchEvent(new CustomEvent("waveformplayer:pause", {
        bubbles: true,
        detail: { player: this, url: this.options.url }
      }));
      if (this.options.onPause) this.options.onPause(this);
    }
  }
  /**
   * External-mode state pump: update the visualization's progress
   * from an external clock (e.g. WaveformBar's audio element's
   * timeupdate). Drives the canvas redraw + the time displays.
   *
   * @param {number} currentTime  Current playback position in seconds.
   * @param {number} duration     Total track duration in seconds.
   */
  setProgress(currentTime, duration) {
    if (!duration || duration <= 0) return;
    this.progress = Math.max(0, Math.min(1, currentTime / duration));
    if (this.currentTimeEl) this.currentTimeEl.textContent = formatTime(currentTime);
    this._extDuration = duration;
    if (this.totalTimeEl && (!this.totalTimeEl.dataset._extSet || this.totalTimeEl.dataset._extDur !== String(duration))) {
      this.totalTimeEl.textContent = formatTime(duration);
      this.totalTimeEl.dataset._extSet = "1";
      this.totalTimeEl.dataset._extDur = String(duration);
    }
    this.drawWaveform?.();
    this.container.dispatchEvent(new CustomEvent("waveformplayer:timeupdate", {
      bubbles: true,
      detail: { player: this, currentTime, duration, progress: this.progress, url: this.options.url }
    }));
    if (this.options.onTimeUpdate) this.options.onTimeUpdate(currentTime, duration, this);
    this.updateSeekAccessibility();
  }
  /**
   * Toggle play/pause
   */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  /**
   * Seek to time in seconds
   * @param {number} seconds - Time in seconds
   */
  seekTo(seconds) {
    if (this.audio && this.audio.duration) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
      this.updateProgress();
    }
  }
  /**
   * Seek to percentage
   * @param {number} percent - Percentage (0-1)
   */
  seekToPercent(percent) {
    if (this.audio && this.audio.duration) {
      this.audio.currentTime = this.audio.duration * Math.max(0, Math.min(1, percent));
      this.updateProgress();
    }
  }
  /**
   * Set volume
   * @param {number} volume - Volume (0-1)
   */
  setVolume(volume) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }
  /**
   * Set playback rate
   * @param {number} rate - Playback rate (0.5 to 2)
   */
  setPlaybackRate(rate) {
    if (!this.audio) return;
    const clampedRate = Math.max(0.5, Math.min(2, rate));
    this.audio.playbackRate = clampedRate;
    this.options.playbackRate = clampedRate;
    this.updateSpeedUI();
  }
  /**
   * Destroy player instance
   */
  destroy() {
    this.isDestroying = true;
    this.pause();
    this.stopSmoothUpdate();
    this._ac?.abort();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    _WaveformPlayer.instances.delete(this.id);
    if (_WaveformPlayer.currentlyPlaying === this) {
      _WaveformPlayer.currentlyPlaying = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio.load();
      this.audio = null;
    }
    this.container.innerHTML = "";
    this.canvas = null;
    this.ctx = null;
    this.playBtn = null;
    this.waveformData = [];
  }
  // ============================================
  // Static Methods
  // ============================================
  /**
   * Get player instance by ID, element, or element ID
   * @param {string|HTMLElement} idOrElement - Player ID, element, or element ID
   * @returns {WaveformPlayer|undefined}
   */
  static getInstance(idOrElement) {
    if (typeof idOrElement === "string") {
      const instance = this.instances.get(idOrElement);
      if (instance) return instance;
      const element = document.getElementById(idOrElement);
      if (element) {
        return Array.from(this.instances.values()).find((p) => p.container === element);
      }
    }
    if (idOrElement instanceof HTMLElement) {
      return Array.from(this.instances.values()).find((p) => p.container === idOrElement);
    }
    return void 0;
  }
  /**
   * Get all player instances
   * @returns {WaveformPlayer[]}
   */
  static getAllInstances() {
    return Array.from(this.instances.values());
  }
  /**
   * Destroy all player instances
   */
  static destroyAll() {
    this.instances.forEach((player) => player.destroy());
    this.instances.clear();
  }
  /**
   * Generate waveform data from audio URL
   * @static
   * @param {string} url - Audio URL
   * @param {number} samples - Number of samples
   * @returns {Promise<number[]>} Waveform peak data
   */
  static async generateWaveformData(url, samples = 200) {
    try {
      const result = await generateWaveform(url, samples);
      return result.peaks;
    } catch (error) {
      console.error("Failed to generate waveform:", error);
      throw error;
    }
  }
  /**
   * Derive a peaks-JSON URL from an audio URL by swapping the
   * extension. Strict counterpart to `generateWaveformData()`:
   * `generateWaveformData` decodes the audio at runtime,
   * `getPeaksUrl` assumes you generated the peaks at build time
   * (e.g. with `@arraypress/waveform-gen`) and stored the JSON
   * alongside the audio file.
   *
   * Use the result as the `waveform` option — the player detects
   * the `.json` suffix, `fetch()`es the file, and skips the Web
   * Audio decode pass entirely. Big perf win on catalogues with
   * many tracks (saves ~1-5s decode per file on slow connections).
   *
   * Recognised extensions: mp3, wav, ogg, flac, m4a, aac.
   * Preserves query strings + URL fragments. Returns `undefined`
   * for unrecognised inputs so callers can pass through
   * unconditionally:
   *
   *     new WaveformPlayer('#el', {
   *       url: track.audioUrl,
   *       waveform: WaveformPlayer.getPeaksUrl(track.audioUrl),
   *     });
   *
   * @static
   * @param {string|undefined|null} audioUrl - Audio file URL.
   * @returns {string|undefined} Peaks JSON URL, or `undefined`
   *   when the input is empty / has no recognised audio extension.
   *
   * @example
   * WaveformPlayer.getPeaksUrl('/audio/track.mp3')
   * // '/audio/track.json'
   *
   * WaveformPlayer.getPeaksUrl('/audio/track.wav?v=2')
   * // '/audio/track.json?v=2'
   *
   * WaveformPlayer.getPeaksUrl(undefined)
   * // undefined
   */
  static getPeaksUrl(audioUrl) {
    if (!audioUrl) return void 0;
    const swapped = audioUrl.replace(
      /\.(mp3|wav|ogg|flac|m4a|aac)(\?[^#]*)?(#.*)?$/i,
      ".json$2$3"
    );
    return swapped === audioUrl ? void 0 : swapped;
  }
};

// src/js/index.js
function autoInit() {
  if (typeof document === "undefined") return;
  const elements = document.querySelectorAll("[data-waveform-player]");
  elements.forEach((element) => {
    if (element.dataset.waveformInitialized === "true") return;
    try {
      new WaveformPlayer(element);
      element.dataset.waveformInitialized = "true";
    } catch (error) {
      console.error("Failed to initialize WaveformPlayer:", error, element);
    }
  });
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
}
WaveformPlayer.init = autoInit;
if (typeof window !== "undefined") {
  window.WaveformPlayer = WaveformPlayer;
}
var index_default = WaveformPlayer;
