
export const getHtmlTemplate = (title: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${title}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app-container">
        <div id="loader" class="loader">Carregando...</div>
    </div>
    <div id="audio-controls" style="display: none;">
        <button id="play-pause-btn">Play</button>
        <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0.5">
    </div>
    <script src="app.js"></script>
</body>
</html>
`;

export const getCssTemplate = () => `
body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; font-family: sans-serif; color: white; }
#app-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.page { position: absolute; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0; transition: opacity 0.5s ease-in-out; visibility: hidden; }
.page.active { opacity: 1; visibility: visible; }
.page-background { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
.hotspot { position: absolute; cursor: pointer; }
.loader { font-size: 1.5rem; }
#audio-controls { position: fixed; bottom: 15px; right: 15px; display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); padding: 8px; border-radius: 50px; z-index: 100; }
#play-pause-btn { background: none; border: 2px solid white; color: white; border-radius: 50%; width: 40px; height: 40px; font-size: 10px; cursor: pointer; }
#volume-slider { width: 80px; cursor: pointer; }
`;

export const getJsTemplate = () => `
document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app-container');
    const loader = document.getElementById('loader');
    const audioControls = document.getElementById('audio-controls');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const volumeSlider = document.getElementById('volume-slider');
    
    let config;
    let currentPageId = 'cover';
    let backgroundAudio;
    let userHasInteracted = false;
    let originalVolume = 0.5;

    async function init() {
        try {
            const response = await fetch('config.json');
            config = await response.json();
            await preloadAssets();
            setupBackgroundMusic();
            renderApp();
            loader.style.display = 'none';
        } catch (error) {
            console.error('Failed to initialize invitation:', error);
            loader.textContent = 'Erro ao carregar.';
        }
    }
    
    function preloadAssets() {
        const promises = [];
        config.pages.forEach(page => {
            if (page.background && page.background.src) {
                const promise = new Promise((resolve, reject) => {
                    const el = page.background.type === 'video' ? document.createElement('video') : new Image();
                    el.onload = el.oncanplaythrough = resolve;
                    el.onerror = reject;
                    el.src = page.background.src;
                });
                promises.push(promise);
            }
        });
        if (config.settings.backgroundMusic && config.settings.backgroundMusic.src) {
            const promise = new Promise((resolve, reject) => {
                 const audioEl = new Audio();
                 audioEl.oncanplaythrough = resolve;
                 audioEl.onerror = reject;
                 audioEl.src = config.settings.backgroundMusic.src;
            });
            promises.push(promise);
        }
        return Promise.all(promises);
    }

    function setupBackgroundMusic() {
        const musicSettings = config.settings.backgroundMusic;
        if (!musicSettings || !musicSettings.src) {
            audioControls.style.display = 'none';
            return;
        }

        backgroundAudio = new Audio(musicSettings.src);
        originalVolume = musicSettings.volume ?? 0.5;
        backgroundAudio.volume = originalVolume;
        backgroundAudio.loop = musicSettings.loop ?? true;

        audioControls.style.display = 'flex';
        volumeSlider.value = backgroundAudio.volume;
        
        playPauseBtn.onclick = () => {
            if (backgroundAudio.paused) {
                backgroundAudio.play();
            } else {
                backgroundAudio.pause();
            }
        };

        volumeSlider.oninput = (e) => {
            const newVolume = parseFloat(e.target.value);
            backgroundAudio.volume = newVolume;
            originalVolume = newVolume;
        };
        
        backgroundAudio.onplay = () => { playPauseBtn.textContent = 'Pause'; };
        backgroundAudio.onpause = () => { playPauseBtn.textContent = 'Play'; };
    }
    
    function playMusicOnInteraction() {
        const musicSettings = config.settings.backgroundMusic;
        if (!backgroundAudio || userHasInteracted || !musicSettings.autoplay) return;
        
        userHasInteracted = true;
        backgroundAudio.play().catch(e => console.error("Background music play failed:", e));
    }

    function renderPage(pageId) {
        const existingPageEl = appContainer.querySelector('.page');
        if (existingPageEl) {
            const oldVideo = existingPageEl.querySelector('video');
            if (oldVideo) {
                oldVideo.onplay = null;
                oldVideo.onpause = null;
                oldVideo.onended = null;
            }
            if (oldVideo && backgroundAudio && config.settings.backgroundMusic.duckOnVideo) {
                 backgroundAudio.volume = originalVolume;
            }
        }

        const pageData = config.pages.find(p => p.id === pageId);
        if (!pageData) return;
        
        const pageEl = document.createElement('div');
        pageEl.className = 'page';
        pageEl.id = \`page-\${pageData.id}\`;

        if (pageData.background && pageData.background.src) {
            if (pageData.background.type === 'image') {
                pageEl.style.backgroundImage = \`url(\${pageData.background.src})\`;
            } else if (pageData.background.type === 'video') {
                const videoEl = document.createElement('video');
                videoEl.src = pageData.background.src;
                videoEl.className = 'page-background';
                
                const settings = pageData.background.videoSettings || {};
                videoEl.autoplay = settings.autoplay ?? true;
                videoEl.loop = settings.loop ?? true;
                videoEl.muted = settings.muted ?? true;
                videoEl.controls = settings.controls ?? false;
                videoEl.playsInline = true;

                if (backgroundAudio) {
                    const musicSettings = config.settings.backgroundMusic;
                    videoEl.onplay = () => {
                        if (musicSettings.stopOnVideo) {
                            backgroundAudio.pause();
                        } else if (musicSettings.duckOnVideo) {
                            backgroundAudio.volume = originalVolume * (musicSettings.duckVolume ?? 0.2);
                        }
                    };
                    videoEl.onpause = videoEl.onended = () => {
                        if (musicSettings.stopOnVideo && userHasInteracted) {
                           backgroundAudio.play();
                       } else if (musicSettings.duckOnVideo) {
                           backgroundAudio.volume = originalVolume;
                       }
                   };
                }
                
                pageEl.appendChild(videoEl);
            }
        }
        
        pageData.hotspots.forEach(hotspot => {
            const hotspotEl = document.createElement('div');
            hotspotEl.className = 'hotspot';
            hotspotEl.id = \`hotspot-\${hotspot.id}\`;
            hotspotEl.style.left = \`\${hotspot.rect.x}%\`;
            hotspotEl.style.top = \`\${hotspot.rect.y}%\`;
            hotspotEl.style.width = \`\${hotspot.rect.width}%\`;
            hotspotEl.style.height = \`\${hotspot.rect.height}%\`;
            
            if (pageData.background.type === 'video' && hotspot.showAfterVideoEnd) {
                 hotspotEl.style.visibility = 'hidden';
            }

            hotspotEl.addEventListener('click', () => {
                playMusicOnInteraction();
                handleAction(hotspot.action);
            });
            pageEl.appendChild(hotspotEl);
        });

        const oldPage = document.querySelector('.page.active');
        if(oldPage) oldPage.classList.remove('active');

        appContainer.appendChild(pageEl);

        setTimeout(() => {
            const video = pageEl.querySelector('video');
            if (video && video.autoplay) video.play().catch(e => {});
            pageEl.classList.add('active');
            if (oldPage) oldPage.remove();
        }, 50);

        currentPageId = pageId;
    }
    
    function handleAction(action) {
        switch(action.type) {
            case 'navigate': renderPage(action.targetPageId); break;
            case 'externalLink': window.open(action.url, action.newTab ? '_blank' : '_self'); break;
        }
    }

    function renderApp() {
        appContainer.innerHTML = '';
        renderPage(currentPageId);
    }

    init();
});
`;