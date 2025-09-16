let builderPlayer = null;
let currentConfig = {};

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(updateBuilder, 500);
    setupCodeTabs();
});

function updateBuilder() {
    const config = {
        style: document.getElementById('builder-style').value,
        barWidth: parseInt(document.getElementById('builder-width').value),
        barSpacing: parseInt(document.getElementById('builder-spacing').value),
        samples: parseInt(document.getElementById('builder-samples').value),
        height: parseInt(document.getElementById('builder-height').value),
        waveformColor: getColorWithOpacity('builder-color', 'builder-opacity'),
        progressColor: getColorWithOpacity('builder-progress', 'builder-progress-opacity'),
        buttonColor: getColorWithOpacity('builder-button', 'builder-button-opacity'),
        title: document.getElementById('builder-title').value || 'Custom Player',
        subtitle: document.getElementById('builder-subtitle').value || '',
        customUrl: document.getElementById('builder-url').value,
        showTime: document.getElementById('builder-showtime').checked,
        showBPM: document.getElementById('builder-showbpm').checked,
        showPlaybackSpeed: document.getElementById('builder-showspeed').checked,
        autoplay: document.getElementById('builder-autoplay').checked,
        enableMediaSession: document.getElementById('builder-mediasession').checked
    };

    currentConfig = config;

    document.getElementById('width-value').textContent = config.barWidth;
    document.getElementById('spacing-value').textContent = config.barSpacing;
    document.getElementById('samples-value').textContent = config.samples;
    document.getElementById('height-value').textContent = config.height;
    document.getElementById('opacity-value').textContent = document.getElementById('builder-opacity').value + '%';
    document.getElementById('progress-opacity-value').textContent = document.getElementById('builder-progress-opacity').value + '%';
    document.getElementById('button-opacity-value').textContent = document.getElementById('builder-button-opacity').value + '%';

    const audioUrl = config.customUrl || 'assets/audio/pluck-small-moments.mp3';

    const needsRecreate = !builderPlayer ||
        builderPlayer.options.url !== audioUrl ||
        builderPlayer.options.waveformStyle !== config.style;

    if (builderPlayer && needsRecreate) {
        builderPlayer.pause();
        builderPlayer.destroy();
        builderPlayer = null;
    }

    if (builderPlayer && !needsRecreate) {
        builderPlayer.options.barWidth = config.barWidth;
        builderPlayer.options.barSpacing = config.barSpacing;
        builderPlayer.options.samples = config.samples;
        builderPlayer.options.height = config.height;
        builderPlayer.options.waveformColor = config.waveformColor;
        builderPlayer.options.progressColor = config.progressColor;
        builderPlayer.options.buttonColor = config.buttonColor;
        builderPlayer.options.showTime = config.showTime;
        builderPlayer.options.showBPM = config.showBPM;
        builderPlayer.options.showPlaybackSpeed = config.showPlaybackSpeed;
        builderPlayer.options.autoplay = config.autoplay;
        builderPlayer.options.enableMediaSession = config.enableMediaSession;

        if (builderPlayer.titleEl) {
            builderPlayer.titleEl.textContent = config.title;
        }
        if (builderPlayer.subtitleEl) {
            if (config.subtitle) {
                builderPlayer.subtitleEl.textContent = config.subtitle;
                builderPlayer.subtitleEl.style.display = '';
            } else {
                builderPlayer.subtitleEl.style.display = 'none';
            }
        }

        if (builderPlayer.playBtn) {
            builderPlayer.playBtn.style.borderColor = config.buttonColor;
            builderPlayer.playBtn.style.color = config.buttonColor;
        }

        builderPlayer.resizeCanvas();
        builderPlayer.drawWaveform();
    } else {
        const container = document.getElementById('builder-player');
        container.innerHTML = '';

        builderPlayer = new WaveformPlayer(container, {
            url: audioUrl,
            waveformStyle: config.style,
            barWidth: config.barWidth,
            barSpacing: config.barSpacing,
            samples: config.samples,
            height: config.height,
            waveformColor: config.waveformColor,
            progressColor: config.progressColor,
            buttonColor: config.buttonColor,
            title: config.title,
            subtitle: config.subtitle,
            showTime: config.showTime,
            showBPM: config.showBPM,
            showPlaybackSpeed: config.showPlaybackSpeed,
            autoplay: config.autoplay,
            enableMediaSession: config.enableMediaSession
        });
    }

    updateCodeOutputs(config, audioUrl);
}

function getColorWithOpacity(colorId, opacityId) {
    const color = document.getElementById(colorId).value;
    const opacity = document.getElementById(opacityId).value / 100;

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function updateCodeOutputs(config, audioUrl) {
    document.querySelector('#builder-output-html code').textContent = generateHTMLCode(config, audioUrl);

    document.querySelector('#builder-output-javascript code').textContent = generateJavaScriptCode(config, audioUrl);

    document.querySelector('#builder-output-react code').textContent = generateReactCode(config, audioUrl);

    document.querySelector('#builder-output-vue code').textContent = generateVueCode(config, audioUrl);
}

function generateHTMLCode(config, audioUrl) {
    let attributes = [`data-url="${audioUrl}"`];

    if (config.style !== 'bars') attributes.push(`data-waveform-style="${config.style}"`);
    if (config.barWidth !== 3) attributes.push(`data-bar-width="${config.barWidth}"`);
    if (config.barSpacing !== 1) attributes.push(`data-bar-spacing="${config.barSpacing}"`);
    if (config.samples !== 200) attributes.push(`data-samples="${config.samples}"`);
    if (config.height !== 60) attributes.push(`data-height="${config.height}"`);

    attributes.push(`data-waveform-color="${config.waveformColor}"`);
    attributes.push(`data-progress-color="${config.progressColor}"`);
    attributes.push(`data-button-color="${config.buttonColor}"`);

    if (config.title) attributes.push(`data-title="${config.title}"`);
    if (config.subtitle) attributes.push(`data-subtitle="${config.subtitle}"`);

    if (!config.showTime) attributes.push(`data-show-time="false"`);
    if (config.showBPM) attributes.push(`data-show-bpm="true"`);
    if (config.showPlaybackSpeed) attributes.push(`data-show-playback-speed="true"`);
    if (config.autoplay) attributes.push(`data-autoplay="true"`);
    if (!config.enableMediaSession) attributes.push(`data-enable-media-session="false"`);

    return `<div data-waveform-player
     ${attributes.join('\n     ')}>
</div>`;
}

function generateJavaScriptCode(config, audioUrl) {
    const options = {
        url: audioUrl,
        waveformStyle: config.style,
        barWidth: config.barWidth,
        barSpacing: config.barSpacing,
        samples: config.samples,
        height: config.height,
        waveformColor: config.waveformColor,
        progressColor: config.progressColor,
        buttonColor: config.buttonColor
    };

    if (config.title) options.title = config.title;
    if (config.subtitle) options.subtitle = config.subtitle;
    if (!config.showTime) options.showTime = false;
    if (config.showBPM) options.showBPM = true;
    if (config.showPlaybackSpeed) options.showPlaybackSpeed = true;
    if (config.autoplay) options.autoplay = true;
    if (!config.enableMediaSession) options.enableMediaSession = false;

    return `const player = new WaveformPlayer('#my-player', ${JSON.stringify(options, null, 2)});`;
}

function generateReactCode(config, audioUrl) {
    return `import { useEffect, useRef } from 'react';
import WaveformPlayer from '@arraypress/waveform-player';
import '@arraypress/waveform-player/dist/waveform-player.css';

function AudioPlayer() {
    const playerRef = useRef();
    
    useEffect(() => {
        const player = new WaveformPlayer(playerRef.current, {
            url: '${audioUrl}',
            waveformStyle: '${config.style}',
            barWidth: ${config.barWidth},
            barSpacing: ${config.barSpacing},
            samples: ${config.samples},
            height: ${config.height},
            waveformColor: '${config.waveformColor}',
            progressColor: '${config.progressColor}',
            buttonColor: '${config.buttonColor}'${config.title ? `,
            title: '${config.title}'` : ''}${config.subtitle ? `,
            subtitle: '${config.subtitle}'` : ''}
        });
        
        return () => player.destroy();
    }, []);
    
    return <div ref={playerRef} />;
}`;
}

function generateVueCode(config, audioUrl) {
    return `<template>
  <div ref="player"></div>
</template>

<script>
import WaveformPlayer from '@arraypress/waveform-player';
import '@arraypress/waveform-player/dist/waveform-player.css';

export default {
  mounted() {
    this.player = new WaveformPlayer(this.$refs.player, {
      url: '${audioUrl}',
      waveformStyle: '${config.style}',
      barWidth: ${config.barWidth},
      barSpacing: ${config.barSpacing},
      samples: ${config.samples},
      height: ${config.height},
      waveformColor: '${config.waveformColor}',
      progressColor: '${config.progressColor}',
      buttonColor: '${config.buttonColor}'${config.title ? `,
      title: '${config.title}'` : ''}${config.subtitle ? `,
      subtitle: '${config.subtitle}'` : ''}
    });
  },
  beforeUnmount() {
    this.player?.destroy();
  }
}
</script>`;
}

function applyPreset(preset) {
    const presets = {
        purple: { color: '#a855f7', progress: '#a855f7', button: '#ffffff' },
        spotify: { color: '#1db954', progress: '#1db954', button: '#ffffff' },
        youtube: { color: '#ff0000', progress: '#ff0000', button: '#ffffff' },
        soundcloud: { color: '#ff5500', progress: '#ff5500', button: '#ffffff' },
        twitter: { color: '#1da1f2', progress: '#1da1f2', button: '#ffffff' },
        dark: { color: '#ffffff', progress: '#ffffff', button: '#ffffff' }
    };

    if (presets[preset]) {
        document.getElementById('builder-color').value = presets[preset].color;
        document.getElementById('builder-progress').value = presets[preset].progress;
        document.getElementById('builder-button').value = presets[preset].button;
        updateBuilder();
    }
}

function resetPlayer() {
    document.getElementById('builder-style').value = 'mirror';
    document.getElementById('builder-width').value = 2;
    document.getElementById('builder-spacing').value = 0;
    document.getElementById('builder-samples').value = 200;
    document.getElementById('builder-height').value = 60;
    document.getElementById('builder-color').value = '#a855f7';
    document.getElementById('builder-opacity').value = 30;
    document.getElementById('builder-progress').value = '#a855f7';
    document.getElementById('builder-progress-opacity').value = 90;
    document.getElementById('builder-button').value = '#ffffff';
    document.getElementById('builder-button-opacity').value = 90;
    document.getElementById('builder-title').value = 'Custom Player';
    document.getElementById('builder-subtitle').value = '';
    document.getElementById('builder-url').value = '';
    document.getElementById('builder-showtime').checked = true;
    document.getElementById('builder-showbpm').checked = false;
    document.getElementById('builder-showspeed').checked = false;
    document.getElementById('builder-autoplay').checked = false;
    document.getElementById('builder-mediasession').checked = true;

    updateBuilder();
}

function copyCode() {
    const activeTab = document.querySelector('.code-tab.active').dataset.tab;
    const code = document.querySelector(`#builder-output-${activeTab} code`).textContent;

    CommonUtils.copyToClipboard(code, document.querySelector('.code-actions .btn-primary'));
}

function setupCodeTabs() {
    const tabs = document.querySelectorAll('.code-tab');
    const outputs = document.querySelectorAll('.code-output');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            outputs.forEach(o => o.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`builder-output-${targetTab}`).classList.add('active');
        });
    });
}

async function generateWaveformData() {
    const url = document.getElementById('generator-url').value;
    const samples = parseInt(document.getElementById('generator-samples').value);
    const output = document.getElementById('waveform-output');

    if (!url) {
        output.textContent = '// Please enter an audio URL';
        return;
    }

    output.textContent = '// Generating waveform data...';

    try {
        const waveformData = await WaveformPlayer.generateWaveformData(url, samples);
        const formatted = JSON.stringify(waveformData, null, 2);
        output.textContent = `// Generated ${waveformData.length} samples\nconst waveformData = ${formatted};`;
    } catch (error) {
        output.textContent = `// Error: ${error.message}\n// Note: External URLs may fail due to CORS`;
    }
}

function copyWaveformData() {
    const output = document.getElementById('waveform-output');
    const text = output.textContent;

    CommonUtils.copyToClipboard(text, event.target.closest('.btn'));
}