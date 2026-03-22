// Track data — waveforms loaded from JSON files via data-wb-waveform="waveforms/file.json"
const TRACKS = [
    { file: 'pluck-desire', title: 'Electric Desire', artist: 'Synthwave Nights', bpm: '128', key: 'Am', price: '$29.99', cover: '01', fav: true },
    { file: 'pluck-lovely', title: 'Lovely Moments', artist: 'Chill Vibes', bpm: '90', key: 'C', price: '$19.99', cover: '02', fav: true },
    { file: 'pluck-icarus', title: 'Icarus Rising', artist: 'Epic Journey', bpm: '140', key: 'Em', price: '$34.99', cover: '03' },
    { file: 'pluck-pieces-of-you', title: 'Pieces of You', artist: 'Late Night Sessions', bpm: '110', key: 'Gm', price: '$24.99', cover: '04' },
    { file: 'pluck-wings', title: 'Wings', artist: 'Skybound', bpm: '120', key: 'D', price: '$22.99', cover: '05' },
    { file: 'pluck-nocturne', title: 'Nocturne', artist: 'Midnight Piano', bpm: '72', key: 'F', price: '$17.99', cover: '06' },
    { file: 'pluck-luminous', title: 'Luminous', artist: 'Ambient Works', bpm: '100', key: 'Bb', price: '$21.99', cover: '07' },
    { file: 'pluck-sine', title: 'Sine', artist: 'Digital Waves', bpm: '130', key: 'Eb', price: '$18.99', cover: '08' },
    { file: 'pluck-small-moments', title: 'Small Moments', artist: 'Lo-Fi Sessions', bpm: '85', key: 'G', price: '$15.99', cover: '09' },
    { file: 'pluck-got-me-thinking', title: 'Got Me Thinking', artist: 'Deep House Co.', bpm: '88', key: 'Cm', price: '$23.99', cover: '10' },
    { file: 'keys-house-piano', title: 'House Piano', artist: 'Keys Pack', bpm: '124', key: 'Am', price: '$16.99', cover: '11' },
    { file: 'pad-seacrest', title: 'Seacrest', artist: 'Pad Collection', bpm: '100', key: 'Dm', price: '$14.99', cover: '12' },
    { file: 'lead-surprise-kiss', title: 'Surprise Kiss', artist: 'Lead Pack', bpm: '128', key: 'F', price: '$19.99', cover: '13' },
    { file: 'lead-red-woods', title: 'Red Woods', artist: 'Nature Sounds', bpm: '95', key: 'Ab', price: '$26.99', cover: '14' },
    { file: 'pluck-bus-605', title: 'Bus 605', artist: 'Urban Beats', bpm: '115', key: 'Fm', price: '$20.99', cover: '15' },
    { file: 'pluck-spaces-in-between', title: 'Spaces In Between', artist: 'Atmospheric', bpm: '108', key: 'Db', price: '$28.99', cover: '16' },
    { file: 'pluck-plank', title: 'Plank', artist: 'Minimal House', bpm: '122', key: 'Gm', price: '$13.99', cover: '17' },
    { file: 'pluck-too-young', title: 'Too Young', artist: 'Nostalgic Vibes', bpm: '98', key: 'Cm', price: '$17.99', cover: '18' },
    { file: 'keys-electric-piano', title: 'Electric Piano', artist: 'Keys Pack', bpm: '122', key: 'Bb', price: '$15.99', cover: '19' },
    { file: 'lead-too-young', title: 'Too Young Lead', artist: 'Lead Pack', bpm: '98', key: 'Cm', price: '$18.99', cover: '20' },
    { file: 'pad-reach', title: 'Reach', artist: 'Pad Collection', bpm: '105', key: 'F', price: '$16.99', cover: '21' },
    { file: 'pad-too-young', title: 'Too Young Pad', artist: 'Pad Collection', bpm: '98', key: 'Cm', price: '$14.99', cover: '22' },
    { file: 'choir-colorize', title: 'Colorize', artist: 'Vocal Textures', bpm: '110', key: 'D', price: '$32.99', cover: '23' },
    { file: 'drum-loop', title: 'Drum Loop', artist: 'Rhythm Pack', bpm: '124', key: '\u2014', price: '$9.99', cover: '24' },
];

function storeCard(t, i) {
    var id = 'track-' + String(i + 1).padStart(3, '0');
    return '<div class="store-card wb-card-highlight" data-wb-play'
        + ' data-url="assets/audio/' + t.file + '.mp3"'
        + ' data-id="' + id + '"'
        + ' data-title="' + t.title + '"'
        + ' data-artist="' + t.artist + '"'
        + ' data-bpm="' + t.bpm + '"'
        + ' data-key="' + t.key + '"'
        + ' data-artwork="assets/img/store-covers/cover-' + t.cover + '.webp"'
        + ' data-wb-waveform="assets/waveforms/' + t.file + '.json"'
        + (t.fav ? ' data-wb-favorited="true"' : '')
        + ' data-link="bar-product.html">'
        + '<div class="store-art">'
        + '<img src="assets/img/store-covers/cover-' + t.cover + '.webp" alt="' + t.title + '" loading="lazy">'
        + '<div class="store-play-overlay">'
        + '<span class="wb-icon-swap">'
        + '<span class="wb-show-play"><span class="wbi wbi-play"></span></span>'
        + '<span class="wb-show-pause"><span class="wbi wbi-pause"></span></span>'
        + '</span></div></div>'
        + '<div class="store-body">'
        + '<a href="bar-product.html" class="store-title-link wb-accent-current">' + t.title + '</a>'
        + '<div class="store-artist">' + t.artist + '</div>'
        + '<div class="store-meta">'
        + '<span class="store-tag store-tag-bpm">' + t.bpm + ' BPM</span>'
        + '<span class="store-tag store-tag-key">' + t.key + '</span>'
        + '<span class="store-price">' + t.price + '</span>'
        + '</div>'
        + '<div class="store-actions">'
        + '<button class="store-btn store-btn-fav">'
        + '<span class="wb-hide-if-fav"><span class="wbi wbi-heart"></span> Save</span>'
        + '<span class="wb-show-if-fav"><span class="wbi wbi-heart-filled" style="color:#ef4444"></span> Saved</span>'
        + '</button>'
        + '<button class="store-btn store-btn-cart">'
        + '<span class="wb-hide-if-cart"><span class="wbi wbi-cart"></span> Cart</span>'
        + '<span class="wb-show-if-cart"><span class="wbi wbi-cart-check" style="color:#4ade80"></span> In Cart</span>'
        + '</button>'
        + '<button class="store-btn store-btn-queue" data-wb-queue'
        + ' data-url="assets/audio/' + t.file + '.mp3"'
        + ' data-id="' + id + '"'
        + ' data-title="' + t.title + '"'
        + ' data-artist="' + t.artist + '">'
        + '<span class="wbi wbi-queue"></span> Queue'
        + '</button>'
        + '</div></div></div>';
}

function tableRow(t, i) {
    return '<tr data-wb-play'
        + ' data-url="assets/audio/' + t.file + '.mp3"'
        + ' data-id="table-' + String(i + 1).padStart(3, '0') + '"'
        + ' data-title="' + t.title + '"'
        + ' data-artist="' + t.artist + '"'
        + ' data-bpm="' + t.bpm + '"'
        + ' data-key="' + t.key + '"'
        + ' data-artwork="assets/img/store-covers/cover-' + t.cover + '.webp"'
        + ' data-wb-waveform="assets/waveforms/' + t.file + '.json">'
        + '<td><span class="wb-eq-bars"><span></span><span></span><span></span><span></span></span></td>'
        + '<td class="fav-cell"><span class="wbi wbi-heart fav-indicator"></span></td>'
        + '<td class="sample-name wb-accent-current">' + t.title + '</td>'
        + '<td class="sample-artist">' + t.artist + '</td>'
        + '<td>' + t.bpm + '</td>'
        + '<td>' + t.key + '</td>'
        + '</tr>';
}

document.addEventListener('DOMContentLoaded', function() {
    var grid = document.getElementById('store-grid');
    if (grid) grid.innerHTML = TRACKS.map(storeCard).join('');

    var tbody = document.getElementById('sample-tbody');
    if (tbody) tbody.innerHTML = TRACKS.map(tableRow).join('');

    // Tabs
    document.querySelectorAll('.bar-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.bar-tab').forEach(function(t) { t.classList.remove('active'); });
            document.querySelectorAll('.bar-panel').forEach(function(p) { p.classList.remove('active'); });
            tab.classList.add('active');
            document.getElementById(tab.dataset.panel).classList.add('active');
        });
    });

    // Init WaveformBar
    WaveformBar.init({
        waveformStyle: 'seekbar',
        waveformHeight: 32,
        barWidth: 2,
        barSpacing: 2,
        showMeta: true,
        markerColor: 'rgba(168, 85, 247, 0.4)',
        actions: { favorite: { endpoint: '#' }, cart: { endpoint: '#' } }
    });
});