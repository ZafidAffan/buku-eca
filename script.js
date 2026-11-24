/**
 * E-Book Interaktif - Pure Flipbook Script
 * Menggunakan engine StPageFlip (HTML5 Paper Flip Animation)
 * Dilengkapi Web Audio API Synthesizer Suara Kertas & Navigasi Styled Icons
 */

document.addEventListener('DOMContentLoaded', () => {
    const flipbookEl = document.getElementById('flipbook');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const bottomPrevBtn = document.getElementById('btn-prev');
    const bottomNextBtn = document.getElementById('btn-next');
    const btnFirst = document.getElementById('btn-first');
    const btnLast = document.getElementById('btn-last');
    const btnPlay = document.getElementById('btn-play');
    const btnSound = document.getElementById('btn-sound');
    const btnMusic = document.getElementById('btn-music');
    const bgmAudio = document.getElementById('bgm-audio');
    const btnZoom = document.getElementById('btn-zoom');
    const pageSlider = document.getElementById('page-slider');
    const pageCurrentEl = document.getElementById('page-current');
    const pageTotalEl = document.getElementById('page-total');
    const tocBtn = document.getElementById('toc-btn');
    const tocModal = document.getElementById('toc-modal');
    const closeTocBtn = document.getElementById('close-toc-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const bookContainer = document.querySelector('.book-container');

    let pageFlip = null;
    let isSoundEnabled = true;
    let isPlaying = false;
    let playInterval = null;
    let isZoomed = false;

    // --------------------------------------------------------------------------
    // Template SVG Vector Icons untuk Kontrol Dinamis
    // --------------------------------------------------------------------------
    const ICONS = {
        play: `
            <svg class="app-icon icon-play" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4"></polygon>
            </svg>
        `,
        pause: `
            <svg class="app-icon icon-pause" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                <rect x="14" y="4" width="4" height="16" rx="1"></rect>
            </svg>
        `,
        volumeOn: `
            <svg class="app-icon icon-volume" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
        `,
        volumeOff: `
            <svg class="app-icon icon-volume-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
        `,
        zoomIn: `
            <svg class="app-icon icon-zoom" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
        `,
        zoomOut: `
            <svg class="app-icon icon-zoom-out" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
        `,
        maximize: `
            <svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
        `,
        minimize: `
            <svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M14 4h6m0 0v6m0-6l-7 7M4 10h6m0 0V4m0 6L3 3"></path>
            </svg>
        `
    };

    // --------------------------------------------------------------------------
    // 1. Audio Synthesizer: Suara Gemerisik Kertas Nyata (Web Audio API)
    // --------------------------------------------------------------------------
    let audioCtx = null;

    function playPaperTurnSound() {
        if (!isSoundEnabled) return;
        try {
            if (!audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioCtx = new AudioContext();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const duration = 0.35;
            const bufferSize = audioCtx.sampleRate * duration;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);

            // Synthesize pink/brown textured noise for paper friction
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + (0.05 * white)) / 1.05;
                lastOut = data[i];
            }

            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;

            // Bandpass filter to match crisp paper rustle frequency
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, audioCtx.currentTime);
            filter.Q.setValueAtTime(1.8, audioCtx.currentTime);

            // Amplitude envelope: quick swell and gentle decay
            const gain = audioCtx.createGain();
            const now = audioCtx.currentTime;
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.exponentialRampToValueAtTime(0.28, now + 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            noise.start(now);
            noise.stop(now + duration);
        } catch (e) {
            console.warn('Audio synthesis not supported or blocked:', e);
        }
    }

    // --------------------------------------------------------------------------
    // 2. Inisialisasi Engine Flipbook (StPageFlip)
    // --------------------------------------------------------------------------
    if (typeof St !== 'undefined' && St.PageFlip) {
        pageFlip = new St.PageFlip(flipbookEl, {
            width: 460,
            height: 640,
            size: 'stretch',
            minWidth: 320,
            maxWidth: 620,
            minHeight: 460,
            maxHeight: 820,
            maxShadowOpacity: 0.65,
            showCover: true,
            mobileScrollSupport: false,
            usePortrait: true,
            flippingTime: 850
        });

        // Muat halaman dari elemen HTML
        pageFlip.loadFromHTML(document.querySelectorAll('.page'));

        const totalPages = pageFlip.getPageCount();
        pageTotalEl.textContent = totalPages;
        pageSlider.max = totalPages - 1;

        // Event saat halaman bergeser (flip)
        pageFlip.on('flip', (e) => {
            playPaperTurnSound();
            updateNavigationUI(e.data);
        });

        // Event saat inisialisasi selesai
        pageFlip.on('init', (e) => {
            updateNavigationUI(e.data.page);
        });
    } else {
        console.error('Library StPageFlip tidak ditemukan.');
    }

    // --------------------------------------------------------------------------
    // 3. Update Tampilan Indikator Halaman & Kontrol Navigasi
    // --------------------------------------------------------------------------
    function updateNavigationUI(pageIndex) {
        if (!pageFlip) return;
        pageSlider.value = pageIndex;
        const total = pageFlip.getPageCount();
        const orientation = pageFlip.getOrientation();

        // Tampilan angka halaman ganda atau tunggal
        if (pageIndex === 0) {
            pageCurrentEl.textContent = 'Cover';
        } else if (pageIndex >= total - 1) {
            pageCurrentEl.textContent = 'Belakang';
        } else {
            if (orientation === 'landscape') {
                const left = pageIndex % 2 === 1 ? pageIndex : pageIndex - 1;
                const right = left + 1;
                pageCurrentEl.textContent = `${left}-${Math.min(right, total)}`;
            } else {
                pageCurrentEl.textContent = `${pageIndex + 1}`;
            }
        }

        // Status tombol Panah Kiri / Kanan
        prevBtn.disabled = (pageIndex <= 0);
        bottomPrevBtn.disabled = (pageIndex <= 0);
        btnFirst.disabled = (pageIndex <= 0);

        nextBtn.disabled = (pageIndex >= total - 1);
        bottomNextBtn.disabled = (pageIndex >= total - 1);
        btnLast.disabled = (pageIndex >= total - 1);
    }

    // --------------------------------------------------------------------------
    // 4. Interaksi Tombol & Slider Navigasi
    // --------------------------------------------------------------------------
    function turnNext() {
        if (pageFlip) pageFlip.flipNext();
    }

    function turnPrev() {
        if (pageFlip) pageFlip.flipPrev();
    }

    nextBtn.addEventListener('click', turnNext);
    prevBtn.addEventListener('click', turnPrev);
    bottomNextBtn.addEventListener('click', turnNext);
    bottomPrevBtn.addEventListener('click', turnPrev);

    btnFirst.addEventListener('click', () => {
        if (pageFlip) pageFlip.flip(0);
    });

    btnLast.addEventListener('click', () => {
        if (pageFlip) pageFlip.flip(pageFlip.getPageCount() - 1);
    });

    pageSlider.addEventListener('input', (e) => {
        const targetPage = parseInt(e.target.value, 10);
        if (pageFlip) pageFlip.flip(targetPage);
    });

    // Navigasi Keyboard (Panah Kiri & Kanan)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
            turnNext();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            turnPrev();
        } else if (e.key === 'Home') {
            if (pageFlip) pageFlip.flip(0);
        } else if (e.key === 'End') {
            if (pageFlip) pageFlip.flip(pageFlip.getPageCount() - 1);
        }
    });

    // Global jump function untuk pemanggilan dari HTML (Daftar Isi)
    window.jumpTo = function(pageIndex) {
        if (pageFlip) {
            pageFlip.flip(pageIndex);
            closeToc();
        }
    };

    // --------------------------------------------------------------------------
    // 5. Autoplay (Mode Putar Otomatis)
    // --------------------------------------------------------------------------
    btnPlay.addEventListener('click', () => {
        if (!isPlaying) {
            isPlaying = true;
            btnPlay.innerHTML = ICONS.pause;
            btnPlay.classList.add('active');
            btnPlay.title = 'Hentikan Putar Otomatis';
            playInterval = setInterval(() => {
                if (!pageFlip) return;
                if (pageFlip.getCurrentPageIndex() >= pageFlip.getPageCount() - 1) {
                    pageFlip.flip(0);
                } else {
                    pageFlip.flipNext();
                }
            }, 3800);
        } else {
            stopAutoplay();
        }
    });

    function stopAutoplay() {
        isPlaying = false;
        clearInterval(playInterval);
        btnPlay.innerHTML = ICONS.play;
        btnPlay.classList.remove('active');
        btnPlay.title = 'Putar Otomatis';
    }

    // --------------------------------------------------------------------------
    // 6. Tombol Suara Kertas (Mute / Unmute)
    // --------------------------------------------------------------------------
    btnSound.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        if (isSoundEnabled) {
            btnSound.innerHTML = ICONS.volumeOn;
            btnSound.classList.add('active');
            btnSound.title = 'Efek Suara Kertas (Aktif)';
            playPaperTurnSound();
        } else {
            btnSound.innerHTML = ICONS.volumeOff;
            btnSound.classList.remove('active');
            btnSound.title = 'Efek Suara Kertas (Bisu)';
        }
    });

    // --------------------------------------------------------------------------
    // 7. Musik Latar Belakang (Background Music / BGM)
    // --------------------------------------------------------------------------
    let isBgmPlaying = false;
    if (bgmAudio && btnMusic) {
        bgmAudio.volume = 0.35; // Volume latar belakang lembut

        function playBgm() {
            bgmAudio.play().then(() => {
                isBgmPlaying = true;
                btnMusic.classList.add('active');
                btnMusic.title = 'Musik Latar (Sedang Diputar)';
            }).catch(() => {
                isBgmPlaying = false;
                btnMusic.classList.remove('active');
            });
        }

        function pauseBgm() {
            bgmAudio.pause();
            isBgmPlaying = false;
            btnMusic.classList.remove('active');
            btnMusic.title = 'Musik Latar (Klik untuk Putar)';
        }

        btnMusic.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isBgmPlaying) {
                pauseBgm();
            } else {
                playBgm();
            }
        });

        // Autoplay setelah interaksi pertama pengguna (kebijakan browser)
        const autoStartBgm = () => {
            if (!isBgmPlaying) {
                playBgm();
            }
            window.removeEventListener('click', autoStartBgm);
            window.removeEventListener('keydown', autoStartBgm);
        };
        window.addEventListener('click', autoStartBgm, { once: true });
        window.addEventListener('keydown', autoStartBgm, { once: true });
    }

    // --------------------------------------------------------------------------
    // 8. Zoom & Fullscreen
    // --------------------------------------------------------------------------
    btnZoom.addEventListener('click', () => {
        isZoomed = !isZoomed;
        if (isZoomed) {
            bookContainer.style.transform = 'scale(1.15)';
            btnZoom.innerHTML = ICONS.zoomOut;
            btnZoom.classList.add('active');
            btnZoom.title = 'Kembalikan Ukuran Normal';
        } else {
            bookContainer.style.transform = 'scale(1)';
            btnZoom.innerHTML = ICONS.zoomIn;
            btnZoom.classList.remove('active');
            btnZoom.title = 'Perbesar Tampilan';
        }
    });

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    function toggleFullscreen() {
        const fsIconWrap = fullscreenBtn.querySelector('.fs-icon-wrap');
        const fsText = fullscreenBtn.querySelector('.fs-text');

        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
            if (fsIconWrap) fsIconWrap.innerHTML = ICONS.minimize;
            if (fsText) fsText.textContent = 'Keluar Layar Penuh';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                if (fsIconWrap) fsIconWrap.innerHTML = ICONS.maximize;
                if (fsText) fsText.textContent = 'Fullscreen';
            }
        }
    }

    document.addEventListener('fullscreenchange', () => {
        const fsIconWrap = fullscreenBtn.querySelector('.fs-icon-wrap');
        const fsText = fullscreenBtn.querySelector('.fs-text');
        if (!document.fullscreenElement) {
            if (fsIconWrap) fsIconWrap.innerHTML = ICONS.maximize;
            if (fsText) fsText.textContent = 'Fullscreen';
        }
    });

    // --------------------------------------------------------------------------
    // 8. Modal Daftar Isi (Table of Contents)
    // --------------------------------------------------------------------------
    function openToc() {
        tocModal.classList.add('active');
    }

    function closeToc() {
        tocModal.classList.remove('active');
    }

    tocBtn.addEventListener('click', openToc);
    closeTocBtn.addEventListener('click', closeToc);
    tocModal.addEventListener('click', (e) => {
        if (e.target === tocModal) closeToc();
    });

    // --------------------------------------------------------------------------
    // 9. Animasi Kelopak Bunga Berjatuhan (Sakura Petals Generator)
    // --------------------------------------------------------------------------
    function createPetals() {
        const container = document.getElementById('petals-container');
        if (!container) return;
        const petalCount = 18;

        for (let i = 0; i < petalCount; i++) {
            const petal = document.createElement('div');
            petal.className = 'petal';

            const size = Math.random() * 14 + 10;
            const startLeft = Math.random() * 100;
            const duration = Math.random() * 7 + 8;
            const delay = Math.random() * 8;
            const opacity = Math.random() * 0.4 + 0.45;

            petal.style.width = `${size}px`;
            petal.style.height = `${size * 1.3}px`;
            petal.style.left = `${startLeft}vw`;
            petal.style.animationDuration = `${duration}s`;
            petal.style.animationDelay = `${delay}s`;
            petal.style.opacity = opacity;

            container.appendChild(petal);
        }
    }

    createPetals();
});
