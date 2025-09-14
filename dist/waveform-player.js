(() => {
  // src/js/utils.js
  function parseDataAttributes(element) {
    const options = {};
    if (element.dataset.url) options.url = element.dataset.url;
    if (element.dataset.height) options.height = parseInt(element.dataset.height);
    if (element.dataset.samples) options.samples = parseInt(element.dataset.samples);
    if (element.dataset.preload) {
      options.preload = element.dataset.preload;
    }
    if (element.dataset.waveformStyle) options.waveformStyle = element.dataset.waveformStyle;
    if (element.dataset.barWidth) options.barWidth = parseInt(element.dataset.barWidth);
    if (element.dataset.barSpacing) options.barSpacing = parseInt(element.dataset.barSpacing);
    if (element.dataset.colorPreset) options.colorPreset = element.dataset.colorPreset;
    if (element.dataset.waveformColor) options.waveformColor = element.dataset.waveformColor;
    if (element.dataset.progressColor) options.progressColor = element.dataset.progressColor;
    if (element.dataset.buttonColor) options.buttonColor = element.dataset.buttonColor;
    if (element.dataset.buttonHoverColor) options.buttonHoverColor = element.dataset.buttonHoverColor;
    if (element.dataset.textColor) options.textColor = element.dataset.textColor;
    if (element.dataset.textSecondaryColor) options.textSecondaryColor = element.dataset.textSecondaryColor;
    if (element.dataset.backgroundColor) options.backgroundColor = element.dataset.backgroundColor;
    if (element.dataset.borderColor) options.borderColor = element.dataset.borderColor;
    if (element.dataset.color) options.waveformColor = element.dataset.color;
    if (element.dataset.theme) options.colorPreset = element.dataset.theme;
    if (element.dataset.autoplay) options.autoplay = element.dataset.autoplay === "true";
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
    return options;
  }
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  function generateId(url) {
    const str = url || Math.random().toString();
    return btoa(str.substring(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
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
  function drawBars(ctx, canvas, peaks, progress, options) {
    const dpr = window.devicePixelRatio || 1;
    const barWidth = options.barWidth * dpr;
    const barSpacing = options.barSpacing * dpr;
    const barCount = Math.floor(canvas.width / (barWidth + barSpacing));
    const resampledPeaks = resampleData(peaks, barCount);
    const height = canvas.height;
    const progressWidth = progress * canvas.width;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < resampledPeaks.length; i++) {
      const x = i * (barWidth + barSpacing);
      if (x + barWidth > canvas.width) break;
      const peakHeight = resampledPeaks[i] * height * 0.9;
      const y = height - peakHeight;
      ctx.fillStyle = options.color;
      ctx.fillRect(x, y, barWidth, peakHeight);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, progressWidth, height);
    ctx.clip();
    for (let i = 0; i < resampledPeaks.length; i++) {
      const x = i * (barWidth + barSpacing);
      if (x > progressWidth) break;
      const peakHeight = resampledPeaks[i] * height * 0.9;
      const y = height - peakHeight;
      ctx.fillStyle = options.progressColor;
      ctx.fillRect(x, y, barWidth, peakHeight);
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < resampledPeaks.length; i++) {
      const x = i * (barWidth + barSpacing);
      if (x + barWidth > canvas.width) break;
      const peakHeight = resampledPeaks[i] * height * 0.45;
      ctx.fillStyle = options.color;
      ctx.fillRect(x, centerY - peakHeight, barWidth, peakHeight);
      ctx.fillRect(x, centerY, barWidth, peakHeight);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, progressWidth, height);
    ctx.clip();
    for (let i = 0; i < resampledPeaks.length; i++) {
      const x = i * (barWidth + barSpacing);
      if (x > progressWidth) break;
      const peakHeight = resampledPeaks[i] * height * 0.45;
      ctx.fillStyle = options.progressColor;
      ctx.fillRect(x, centerY - peakHeight, barWidth, peakHeight);
      ctx.fillRect(x, centerY, barWidth, peakHeight);
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < resampledPeaks.length; i++) {
      const x = i * (barWidth + barSpacing);
      if (x + barWidth > canvas.width) break;
      const peakHeight = resampledPeaks[i] * height * 0.9;
      const blockCount = Math.floor(peakHeight / (blockSize + blockGap));
      ctx.fillStyle = x < progressWidth ? options.progressColor : options.color;
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < resampledPeaks.length; i++) {
      const x = i * (barWidth + barSpacing) + barWidth / 2;
      if (x > canvas.width) break;
      const peakHeight = resampledPeaks[i] * height * 0.9;
      ctx.fillStyle = x < progressWidth ? options.progressColor : options.color;
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
    "mirror": drawMirror,
    // SoundCloud-style symmetrical
    "line": drawLine,
    // Smooth oscilloscope wave
    "blocks": drawBlocks,
    // LED meter segmented
    "dots": drawDots,
    // Circular points
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
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      let peaks = extractPeaks(audioBuffer, samples);
      peaks = normalizePeaks(peaks);
      let bpm = null;
      if (shouldDetectBPM) {
        bpm = await detectBPM(audioBuffer);
      }
      audioContext.close();
      return { peaks, bpm };
    } catch (error) {
      console.error("Failed to generate waveform:", error);
      throw error;
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
  var DEFAULT_OPTIONS = {
    // Core settings
    url: "",
    height: 60,
    samples: 200,
    preload: "metadata",
    // Playback
    playbackRate: 1,
    showPlaybackSpeed: false,
    playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    // Available speeds
    // Default waveform style
    waveformStyle: "mirror",
    barWidth: 2,
    barSpacing: 0,
    // Color preset (dark/light or null for custom)
    colorPreset: "dark",
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
    showTime: true,
    showHoverTime: false,
    showBPM: false,
    singlePlay: true,
    playOnSeek: true,
    enableMediaSession: true,
    // Markers
    markers: [],
    showMarkers: true,
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
      const styleDefaults = STYLE_DEFAULTS[this.options.waveformStyle];
      if (styleDefaults) {
        if (dataOptions.barWidth === void 0 && options.barWidth === void 0) {
          this.options.barWidth = styleDefaults.barWidth;
        }
        if (dataOptions.barSpacing === void 0 && options.barSpacing === void 0) {
          this.options.barSpacing = styleDefaults.barSpacing;
        }
      }
      this.options.waveformColor = this.options.waveformColor || "rgba(255, 255, 255, 0.3)";
      this.options.progressColor = this.options.progressColor || "rgba(255, 255, 255, 0.9)";
      this.options.buttonColor = this.options.buttonColor || "rgba(255, 255, 255, 0.9)";
      this.options.textColor = this.options.textColor || "#ffffff";
      this.options.textSecondaryColor = this.options.textSecondaryColor || "rgba(255, 255, 255, 0.6)";
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
      this.id = this.container.id || generateId(this.options.url);
      _WaveformPlayer.instances.set(this.id, this);
      this.init();
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
      this.bindEvents();
      this.setupResizeObserver();
      requestAnimationFrame(() => {
        this.resizeCanvas();
        if (this.options.url) {
          this.load(this.options.url).then(() => {
            if (this.options.autoplay) {
              this.play();
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
      this.container.innerHTML = `
  <div class="waveform-player-inner">
    <div class="waveform-body">
      <div class="waveform-track">
        <button class="waveform-btn" aria-label="Play/Pause" style="
            border-color: ${this.options.buttonColor};
            color: ${this.options.buttonColor};
        ">
          <span class="waveform-icon-play">${this.options.playIcon}</span>
          <span class="waveform-icon-pause" style="display:none;">${this.options.pauseIcon}</span>
        </button>
        
        <div class="waveform-container">
          <canvas></canvas>
          <div class="waveform-markers"></div>
          <div class="waveform-loading" style="display:none;"></div>
          <div class="waveform-error" style="display:none;">
            <span class="waveform-error-text">Unable to load audio</span>
          </div>
        </div>
      </div>
      
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
     */
    createAudio() {
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
      if (this.options.playbackRate && this.options.playbackRate !== 1) {
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
      });
      document.addEventListener("click", () => {
        speedMenu.style.display = "none";
      });
      speedMenu.addEventListener("click", (e) => {
        e.stopPropagation();
        if (e.target.classList.contains("speed-option")) {
          const rate = parseFloat(e.target.dataset.rate);
          this.setPlaybackRate(rate);
          speedMenu.style.display = "none";
        }
      });
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
      });
      this.container.addEventListener("keydown", (e) => {
        if (document.activeElement !== this.container) return;
        const key = e.key;
        const currentTime = this.audio.currentTime;
        if (key >= "0" && key <= "9") {
          e.preventDefault();
          this.seekToPercent(parseInt(key) / 10);
          return;
        }
        const actions = {
          " ": () => this.togglePlay(),
          "ArrowLeft": () => this.seekTo(Math.max(0, currentTime - 5)),
          "ArrowRight": () => this.seekTo(Math.min(this.audio.duration, currentTime + 5)),
          "ArrowUp": () => this.setVolume(Math.min(1, this.audio.volume + 0.1)),
          "ArrowDown": () => this.setVolume(Math.max(0, this.audio.volume - 0.1)),
          "m": () => this.audio.muted = !this.audio.muted,
          "M": () => this.audio.muted = !this.audio.muted
        };
        if (actions[key]) {
          e.preventDefault();
          actions[key]();
        }
      });
    }
    /**
     * Initialize Media Session API for system media controls
     * @private
     */
    initMediaSession() {
      if (!("mediaSession" in navigator) || !this.options.enableMediaSession) return;
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
      this.playBtn.addEventListener("click", () => this.togglePlay());
      this.audio.addEventListener("loadstart", () => this.setLoading(true));
      this.audio.addEventListener("loadedmetadata", () => this.onMetadataLoaded());
      this.audio.addEventListener("canplay", () => this.setLoading(false));
      this.audio.addEventListener("play", () => this.onPlay());
      this.audio.addEventListener("pause", () => this.onPause());
      this.audio.addEventListener("ended", () => this.onEnded());
      this.audio.addEventListener("error", (e) => this.onError(e));
      this.canvas.addEventListener("click", (e) => this.handleCanvasClick(e));
      window.addEventListener("resize", debounce(() => this.resizeCanvas(), 100));
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
        const title = this.options.title || extractTitleFromUrl(url);
        if (this.titleEl) {
          this.titleEl.textContent = title;
        }
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
      this.audio.src = "";
      this.audio.load();
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
      if (options.preload) {
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
      if (options.markers) {
        this.options.markers = options.markers;
      }
      await this.load(url);
      this.play();
    }
    // ============================================
    // Visualization
    // ============================================
    /**
     * Set waveform data
     * @private
     */
    setWaveformData(data) {
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
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width * dpr;
      this.canvas.height = this.options.height * dpr;
      this.canvas.style.height = this.options.height + "px";
      this.canvas.parentElement.style.height = this.options.height + "px";
      this.drawWaveform();
    }
    /**
     * Render markers on the waveform
     * @private
     */
    renderMarkers() {
      if (!this.options.showMarkers || !this.options.markers?.length || !this.markersContainer) return;
      this.markersContainer.innerHTML = "";
      if (!this.audio || !this.audio.duration || this.audio.duration === 0) {
        return;
      }
      this.options.markers.forEach((marker, index) => {
        const position = marker.time / this.audio.duration * 100;
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
      if (!this.audio.duration) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const targetPercent = Math.max(0, Math.min(1, x / rect.width));
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
    }
    /**
     * Handle metadata loaded
     * @private
     */
    onMetadataLoaded() {
      if (this.totalTimeEl) {
        this.totalTimeEl.textContent = formatTime(this.audio.duration);
      }
      this.renderMarkers();
    }
    /**
     * Handle play event
     * @private
     */
    onPlay() {
      this.isPlaying = true;
      this.playBtn.classList.add("playing");
      const playIcon = this.playBtn.querySelector(".waveform-icon-play");
      const pauseIcon = this.playBtn.querySelector(".waveform-icon-pause");
      if (playIcon) playIcon.style.display = "none";
      if (pauseIcon) pauseIcon.style.display = "flex";
      this.startSmoothUpdate();
      if (this.options.onPlay) {
        this.options.onPlay(this);
      }
    }
    /**
     * Handle pause event
     * @private
     */
    onPause() {
      this.isPlaying = false;
      this.playBtn.classList.remove("playing");
      const playIcon = this.playBtn.querySelector(".waveform-icon-play");
      const pauseIcon = this.playBtn.querySelector(".waveform-icon-pause");
      if (playIcon) playIcon.style.display = "flex";
      if (pauseIcon) pauseIcon.style.display = "none";
      this.stopSmoothUpdate();
      if (this.options.onPause) {
        this.options.onPause(this);
      }
    }
    /**
     * Handle ended event
     * @private
     */
    onEnded() {
      this.progress = 0;
      this.audio.currentTime = 0;
      this.drawWaveform();
      if (this.currentTimeEl) {
        this.currentTimeEl.textContent = "0:00";
      }
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
        if (this.isPlaying && this.audio.duration) {
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
      if (!this.audio.duration) return;
      const newProgress = this.audio.currentTime / this.audio.duration;
      if (Math.abs(newProgress - this.progress) > 1e-3) {
        this.progress = newProgress;
        this.drawWaveform();
      }
      if (this.currentTimeEl) {
        this.currentTimeEl.textContent = formatTime(this.audio.currentTime);
      }
      if (this.options.onTimeUpdate) {
        this.options.onTimeUpdate(this.audio.currentTime, this.audio.duration, this);
      }
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
     * Play audio
     */
    play() {
      if (this.options.singlePlay && _WaveformPlayer.currentlyPlaying && _WaveformPlayer.currentlyPlaying !== this) {
        _WaveformPlayer.currentlyPlaying.pause();
      }
      _WaveformPlayer.currentlyPlaying = this;
      this.audio.play();
    }
    /**
     * Pause audio
     */
    pause() {
      if (_WaveformPlayer.currentlyPlaying === this) {
        _WaveformPlayer.currentlyPlaying = null;
      }
      this.audio.pause();
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
      this.pause();
      this.stopSmoothUpdate();
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      _WaveformPlayer.instances.delete(this.id);
      if (this.audio) {
        this.audio.src = "";
      }
      this.container.innerHTML = "";
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
})();
