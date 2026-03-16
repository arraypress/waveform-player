/**
 * Persistent Player Demo
 * Fixed bottom player with queue management
 */

var bottomPlayer = null;
var currentTrackEl = null;
var isPlaying = false;
var queue = [];
var queueHistory = [];
var currentQueueIndex = -1;
var queueOpen = false;

// Track library
var tracks = {
    'wings': {
        url: 'assets/audio/pluck-wings.mp3',
        title: 'Midnight Wings',
        artist: 'Ambient Dreams',
        duration: '0:10'
    },
    'desire': {
        url: 'assets/audio/pluck-desire.mp3',
        title: 'Electric Desire',
        artist: 'Synthwave Nights',
        duration: '0:10'
    },
    'lovely': {
        url: 'assets/audio/pluck-lovely.mp3',
        title: 'Lovely Moments',
        artist: 'Chill Vibes',
        duration: '0:10'
    },
    'icarus': {
        url: 'assets/audio/pluck-icarus.mp3',
        title: 'Icarus Rising',
        artist: 'Epic Journey',
        duration: '0:10'
    },
    'pieces': {
        url: 'assets/audio/pluck-pieces-of-you.mp3',
        title: 'Pieces of You',
        artist: 'Late Night Sessions',
        duration: '0:10'
    },
    'small-moments': {
        url: 'assets/audio/pluck-small-moments.mp3',
        title: 'Small Moments',
        artist: 'Acoustic Tales',
        duration: '0:10'
    },
    'luminous': {
        url: 'assets/audio/pluck-luminous.mp3',
        title: 'Luminous',
        artist: 'Deep Focus',
        duration: '0:10'
    },
    'nocturne': {
        url: 'assets/audio/pluck-nocturne.mp3',
        title: 'Nocturne',
        artist: 'Piano Moods',
        duration: '0:10'
    },
    'sine': {
        url: 'assets/audio/pluck-sine.mp3',
        title: 'Sine Wave',
        artist: 'Electronic Lab',
        duration: '0:10'
    },
    'got-me-thinking': {
        url: 'assets/audio/pluck-got-me-thinking.mp3',
        title: 'Got Me Thinking',
        artist: 'Lo-Fi Beats',
        duration: '0:10'
    }
};

document.addEventListener('DOMContentLoaded', function () {
    initBottomPlayer();
    bindTrackCards();
});

/**
 * Initialize the bottom persistent player
 */
function initBottomPlayer() {
    var container = document.getElementById('bottom-waveform');
    if (!container) return;

    bottomPlayer = new WaveformPlayer(container, {
        showControls: false,
        showInfo: false,
        waveformStyle: 'bars',
        barWidth: 2,
        barSpacing: 1,
        height: 40,
        waveformColor: 'rgba(168, 85, 247, 0.3)',
        progressColor: 'rgba(168, 85, 247, 0.9)',
        onPlay: function () {
            isPlaying = true;
            updatePlayState();
        },
        onPause: function () {
            isPlaying = false;
            updatePlayState();
        },
        onEnd: function () {
            isPlaying = false;
            updatePlayState();
            playNextTrack();
        }
    });
}

/**
 * Bind click events to all track cards
 */
function bindTrackCards() {
    document.querySelectorAll('.track-card[data-track]').forEach(function (card) {
        card.addEventListener('click', function () {
            var trackId = this.getAttribute('data-track');
            playTrack(trackId, this);
        });
    });

    // Also handle featured track
    var featured = document.querySelector('.featured-track[data-track]');
    if (featured) {
        featured.addEventListener('click', function () {
            var trackId = this.getAttribute('data-track');
            playTrack(trackId, this);
        });
    }
}

/**
 * Play a track by ID
 */
function playTrack(trackId, cardEl) {
    var track = tracks[trackId];
    if (!track || !bottomPlayer) return;

    var isSameTrack = currentTrackEl === cardEl;

    // If clicking the same track, toggle play/pause
    if (isSameTrack && currentTrackEl) {
        bottomPlayer.togglePlay();
        return;
    }

    // Update track card states
    document.querySelectorAll('.track-card.now-playing, .featured-track.now-playing').forEach(function (el) {
        el.classList.remove('now-playing', 'is-playing');
    });
    currentTrackEl = cardEl;
    if (cardEl) {
        cardEl.classList.add('now-playing');
    }

    // Show the bottom player
    document.getElementById('bottom-player').classList.add('active');

    // Update bottom player info
    document.getElementById('bp-title').textContent = track.title;
    document.getElementById('bp-artist').textContent = track.artist;

    // Add to queue if not already there
    addToQueue(trackId);

    // Load and play
    bottomPlayer.loadTrack(track.url, track.title, track.artist);
}

/**
 * Add track to queue
 */
function addToQueue(trackId) {
    // Check if already in queue
    var existingIndex = -1;
    for (var i = 0; i < queue.length; i++) {
        if (queue[i] === trackId) {
            existingIndex = i;
            break;
        }
    }

    if (existingIndex >= 0) {
        // Track exists, just update the current index
        // Move played tracks to history
        if (currentQueueIndex >= 0 && currentQueueIndex < queue.length) {
            var oldId = queue[currentQueueIndex];
            if (queueHistory.indexOf(oldId) === -1) {
                queueHistory.push(oldId);
            }
        }
        currentQueueIndex = existingIndex;
    } else {
        // New track, add after current position
        if (currentQueueIndex >= 0 && currentQueueIndex < queue.length) {
            var oldId = queue[currentQueueIndex];
            if (queueHistory.indexOf(oldId) === -1) {
                queueHistory.push(oldId);
            }
        }
        queue.push(trackId);
        currentQueueIndex = queue.length - 1;
    }

    renderQueue();
}

/**
 * Toggle play/pause from the bottom player button
 */
function toggleBottomPlay() {
    if (!bottomPlayer) return;
    bottomPlayer.togglePlay();
}

/**
 * Play previous track
 */
function playPrevTrack() {
    if (currentQueueIndex > 0) {
        currentQueueIndex--;
        var trackId = queue[currentQueueIndex];
        loadQueueTrack(trackId);
    }
}

/**
 * Play next track
 */
function playNextTrack() {
    if (currentQueueIndex < queue.length - 1) {
        // Move current to history
        if (currentQueueIndex >= 0) {
            var oldId = queue[currentQueueIndex];
            if (queueHistory.indexOf(oldId) === -1) {
                queueHistory.push(oldId);
            }
        }
        currentQueueIndex++;
        var trackId = queue[currentQueueIndex];
        loadQueueTrack(trackId);
    }
}

/**
 * Load a track from the queue by ID
 */
function loadQueueTrack(trackId) {
    var track = tracks[trackId];
    if (!track || !bottomPlayer) return;

    // Update card highlighting
    document.querySelectorAll('.track-card.now-playing, .featured-track.now-playing').forEach(function (el) {
        el.classList.remove('now-playing', 'is-playing');
    });

    // Find the matching card in the page
    var card = document.querySelector('.track-card[data-track="' + trackId + '"]');
    currentTrackEl = card;
    if (card) {
        card.classList.add('now-playing');
    }

    // Update bottom player info
    document.getElementById('bp-title').textContent = track.title;
    document.getElementById('bp-artist').textContent = track.artist;

    // Load and play
    bottomPlayer.loadTrack(track.url, track.title, track.artist);
    renderQueue();
}

/**
 * Play a specific queue item by index
 */
function playQueueItem(index) {
    if (index < 0 || index >= queue.length) return;

    // Move current to history
    if (currentQueueIndex >= 0 && currentQueueIndex !== index) {
        var oldId = queue[currentQueueIndex];
        if (queueHistory.indexOf(oldId) === -1) {
            queueHistory.push(oldId);
        }
    }

    currentQueueIndex = index;
    var trackId = queue[index];
    loadQueueTrack(trackId);
}

/**
 * Replay a track from history
 */
function replayTrack(trackId) {
    // Remove from history
    var histIndex = queueHistory.indexOf(trackId);
    if (histIndex >= 0) {
        queueHistory.splice(histIndex, 1);
    }

    // Move current to history
    if (currentQueueIndex >= 0) {
        var oldId = queue[currentQueueIndex];
        if (queueHistory.indexOf(oldId) === -1) {
            queueHistory.push(oldId);
        }
    }

    // Find in queue or add it
    var queueIndex = queue.indexOf(trackId);
    if (queueIndex >= 0) {
        currentQueueIndex = queueIndex;
    } else {
        queue.push(trackId);
        currentQueueIndex = queue.length - 1;
    }

    loadQueueTrack(trackId);
}

/**
 * Remove a track from the queue
 */
function removeFromQueue(index, event) {
    if (event) {
        event.stopPropagation();
    }

    if (index < 0 || index >= queue.length) return;

    // Don't remove the currently playing track
    if (index === currentQueueIndex) return;

    queue.splice(index, 1);

    // Adjust current index if needed
    if (index < currentQueueIndex) {
        currentQueueIndex--;
    }

    renderQueue();
}

/**
 * Remove a track from history
 */
function removeFromHistory(trackId, event) {
    if (event) {
        event.stopPropagation();
    }

    var index = queueHistory.indexOf(trackId);
    if (index >= 0) {
        queueHistory.splice(index, 1);
    }

    renderQueue();
}

/**
 * Clear the entire queue (except current)
 */
function clearQueue() {
    var currentId = queue[currentQueueIndex];

    queue = currentId ? [currentId] : [];
    currentQueueIndex = currentId ? 0 : -1;
    queueHistory = [];

    renderQueue();
}

/**
 * Clear play history
 */
function clearHistory() {
    queueHistory = [];
    renderQueue();
}

/**
 * Toggle queue panel visibility
 */
function toggleQueue() {
    queueOpen = !queueOpen;
    var panel = document.getElementById('queue-panel');
    var btn = document.getElementById('bp-queue-btn');

    if (queueOpen) {
        panel.classList.add('open');
        btn.classList.add('queue-open');
    } else {
        panel.classList.remove('open');
        btn.classList.remove('queue-open');
    }
}

/**
 * Render the queue panel contents
 */
function renderQueue() {
    var body = document.getElementById('queue-body');
    var countEl = document.getElementById('queue-count');
    if (!body) return;

    var upNext = queue.length - 1 - currentQueueIndex;
    if (upNext < 0) upNext = 0;

    if (countEl) {
        countEl.textContent = upNext;
    }

    // Empty state
    if (queue.length === 0 && queueHistory.length === 0) {
        body.innerHTML = '<div class="queue-empty"><i class="ti ti-playlist"></i><p>Queue is empty<br>Click a track to start listening</p></div>';
        return;
    }

    var html = '';

    // Now playing
    if (currentQueueIndex >= 0 && currentQueueIndex < queue.length) {
        var currentId = queue[currentQueueIndex];
        var currentTrack = tracks[currentId];
        if (currentTrack) {
            html += '<div class="queue-section-label">Now Playing</div>';
            html += '<div class="queue-item queue-current">';
            html += '<div class="queue-item-number"><i class="ti ti-volume"></i></div>';
            html += '<div class="queue-item-info">';
            html += '<div class="queue-item-title">' + currentTrack.title + '</div>';
            html += '<div class="queue-item-artist">' + currentTrack.artist + '</div>';
            html += '</div>';
            html += '</div>';
        }
    }

    // Up next
    var hasUpNext = false;
    for (var i = currentQueueIndex + 1; i < queue.length; i++) {
        if (!hasUpNext) {
            html += '<div class="queue-section-label">Up Next</div>';
            hasUpNext = true;
        }
        var id = queue[i];
        var t = tracks[id];
        if (!t) continue;

        html += '<div class="queue-item" onclick="playQueueItem(' + i + ')">';
        html += '<div class="queue-item-number">' + (i - currentQueueIndex) + '</div>';
        html += '<div class="queue-item-info">';
        html += '<div class="queue-item-title">' + t.title + '</div>';
        html += '<div class="queue-item-artist">' + t.artist + '</div>';
        html += '</div>';
        html += '<div class="queue-item-actions">';
        html += '<button class="queue-item-btn remove-btn" onclick="removeFromQueue(' + i + ', event)" title="Remove"><i class="ti ti-x"></i></button>';
        html += '</div>';
        html += '</div>';
    }

    // History
    if (queueHistory.length > 0) {
        html += '<div class="queue-section-label">Recently Played</div>';
        for (var j = queueHistory.length - 1; j >= 0; j--) {
            var hId = queueHistory[j];
            var hTrack = tracks[hId];
            if (!hTrack) continue;

            html += '<div class="queue-item queue-played" onclick="replayTrack(\'' + hId + '\')">';
            html += '<div class="queue-item-number"><i class="ti ti-check"></i></div>';
            html += '<div class="queue-item-info">';
            html += '<div class="queue-item-title">' + hTrack.title + '</div>';
            html += '<div class="queue-item-artist">' + hTrack.artist + '</div>';
            html += '</div>';
            html += '<div class="queue-item-actions">';
            html += '<button class="queue-item-btn" onclick="replayTrack(\'' + hId + '\')" title="Play again"><i class="ti ti-refresh"></i></button>';
            html += '<button class="queue-item-btn remove-btn" onclick="removeFromHistory(\'' + hId + '\', event)" title="Remove"><i class="ti ti-x"></i></button>';
            html += '</div>';
            html += '</div>';
        }
    }

    body.innerHTML = html;
}

/**
 * Update play/pause visual state everywhere
 */
function updatePlayState() {
    // Update bottom player button
    var playBtn = document.getElementById('bp-play-btn');
    if (playBtn) {
        if (isPlaying) {
            playBtn.innerHTML = '<i class="ti ti-player-pause"></i>';
        } else {
            playBtn.innerHTML = '<i class="ti ti-player-play"></i>';
        }
    }

    // Update track card state
    if (currentTrackEl) {
        if (isPlaying) {
            currentTrackEl.classList.add('is-playing');
        } else {
            currentTrackEl.classList.remove('is-playing');
        }
    }
}