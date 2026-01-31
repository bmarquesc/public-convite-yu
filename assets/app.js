
"use strict";

const e = React.createElement;

// --- DB SERVICE (IndexedDB) ---
const DB_NAME = "InvitationEditorDB";
const DB_VERSION = 1;
const STORE_USERS = "users";
const ADMIN_EMAIL = "admin@example.com";

let dbPromise = null;

function getDb() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(new Error("Erro ao abrir o IndexedDB."));
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_USERS)) {
                    db.createObjectStore(STORE_USERS, { keyPath: "email" });
                }
            };
        });
    }
    return dbPromise;
}

async function dbRequest(storeName, mode, action) {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = action(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

const db = {
    getUser: (email) => dbRequest(STORE_USERS, "readonly", store => store.get(email)),
    getAllUsers: () => dbRequest(STORE_USERS, "readonly", store => store.getAll()),
    addUser: (user) => dbRequest(STORE_USERS, "readwrite", store => store.add(user)),
    updateUser: (user) => dbRequest(STORE_USERS, "readwrite", store => store.put(user)),
    deleteUser: (email) => dbRequest(STORE_USERS, "readwrite", store => store.delete(email)),
    initAdmin: async () => {
        const admin = await db.getUser(ADMIN_EMAIL);
        if (!admin) {
            console.log("Nenhum administrador encontrado, criando um padrão.");
            const passwordHash = await hashPassword('admin123');
            await db.addUser({
                email: ADMIN_EMAIL,
                passwordHash,
                role: 'admin',
                status: 'APPROVED'
            });
            console.log(`Administrador criado com e-mail ${ADMIN_EMAIL} e senha 'admin123'. Por favor, altere a senha.`);
        }
    }
};


// --- CRYPTO UTILS ---
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateTempPassword(length = 12) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// --- FILE UTILS ---
const handleFileUpload = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({ src: e.target?.result });
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};

// --- VIEWER TEMPLATES ---
const getHtmlTemplate = (title) => `
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

const getCssTemplate = () => `
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

const getJsTemplate = () => `
document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app-container');
    const loader = document.getElementById('loader');
    const audioControls = document.getElementById('audio-controls');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const volumeSlider = document.getElementById('volume-slider');
    let config, currentPageId = 'cover', backgroundAudio, userHasInteracted = false, originalVolume = 0.5;

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
        if (!musicSettings || !musicSettings.src) { audioControls.style.display = 'none'; return; }
        backgroundAudio = new Audio(musicSettings.src);
        originalVolume = musicSettings.volume ?? 0.5;
        backgroundAudio.volume = originalVolume;
        backgroundAudio.loop = musicSettings.loop ?? true;
        audioControls.style.display = 'flex';
        volumeSlider.value = backgroundAudio.volume;
        playPauseBtn.onclick = () => { backgroundAudio.paused ? backgroundAudio.play() : backgroundAudio.pause(); };
        volumeSlider.oninput = (e) => { backgroundAudio.volume = originalVolume = parseFloat(e.target.value); };
        backgroundAudio.onplay = () => { playPauseBtn.textContent = 'Pause'; };
        backgroundAudio.onpause = () => { playPauseBtn.textContent = 'Play'; };
    }
    function playMusicOnInteraction() {
        const musicSettings = config.settings.backgroundMusic;
        if (!backgroundAudio || userHasInteracted || !musicSettings.autoplay) return;
        userHasInteracted = true;
        backgroundAudio.play().catch(e => console.error("BG music play failed:", e));
    }
    function renderPage(pageId) {
        const existingPageEl = appContainer.querySelector('.page');
        if (existingPageEl) {
            const oldVideo = existingPageEl.querySelector('video');
            if (oldVideo) { oldVideo.onplay = oldVideo.onpause = oldVideo.onended = null; }
            if (oldVideo && backgroundAudio && config.settings.backgroundMusic.duckOnVideo) { backgroundAudio.volume = originalVolume; }
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

                videoEl.onended = () => {
                    pageData.hotspots.forEach(hotspot => {
                        if (hotspot.showAfterVideoEnd) {
                            const hotspotEl = document.getElementById(\`hotspot-\${hotspot.id}\`);
                            if (hotspotEl) hotspotEl.style.visibility = 'visible';
                        }
                    });
                };
                
                if (backgroundAudio) {
                    const musicSettings = config.settings.backgroundMusic;
                    videoEl.onplay = () => {
                        if (musicSettings.stopOnVideo) { backgroundAudio.pause(); } 
                        else if (musicSettings.duckOnVideo) { backgroundAudio.volume = originalVolume * (musicSettings.duckVolume ?? 0.2); }
                    };
                    videoEl.onpause = videoEl.onended = () => {
                       if (musicSettings.stopOnVideo && userHasInteracted) { backgroundAudio.play(); } 
                       else if (musicSettings.duckOnVideo) { backgroundAudio.volume = originalVolume; }
                   };
                }
                pageEl.appendChild(videoEl);
            }
        }
        pageData.hotspots.forEach(hotspot => {
            const hotspotEl = document.createElement('div');
            hotspotEl.className = 'hotspot';
            hotspotEl.id = \`hotspot-\${hotspot.id}\`;
            Object.assign(hotspotEl.style, { left: \`\${hotspot.rect.x}%\`, top: \`\${hotspot.rect.y}%\`, width: \`\${hotspot.rect.width}%\`, height: \`\${hotspot.rect.height}%\` });
            if (pageData.background.type === 'video' && hotspot.showAfterVideoEnd) { hotspotEl.style.visibility = 'hidden'; }
            hotspotEl.addEventListener('click', () => { playMusicOnInteraction(); handleAction(hotspot.action); });
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
        if (action.type === 'navigate') { renderPage(action.targetPageId); }
        else if (action.type === 'externalLink') { window.open(action.url, action.newTab ? '_blank' : '_self'); }
    }
    function renderApp() { appContainer.innerHTML = ''; renderPage(currentPageId); }
    init();
});
`;

// --- EXPORT SERVICE ---
async function fileToUin8Array(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function exportToZip(project) {
  if (typeof JSZip === 'undefined') throw new Error('JSZip library is not loaded.');
  const zip = new JSZip();
  const assetsFolder = zip.folder("assets");
  if (!assetsFolder) throw new Error("Could not create assets folder in zip.");
  
  const processedProject = JSON.parse(JSON.stringify(project));
  const assetMap = new Map();
  let assetCounter = 0;

  for (const page of processedProject.pages) {
    const originalPage = project.pages.find(p => p.id === page.id);
    if (originalPage?.background.file) {
      const file = originalPage.background.file;
      let path = assetMap.get(file);
      if (!path) {
          const extension = file.name.split('.').pop() || 'bin';
          path = `media_${assetCounter++}.${extension}`;
          assetMap.set(file, path);
          const content = await fileToUin8Array(file);
          assetsFolder.file(path, content);
      }
      page.background.src = `assets/${path}`;
      delete page.background.file;
    }
  }

  if (project.settings.backgroundMusic?.file) {
    const file = project.settings.backgroundMusic.file;
    let path = assetMap.get(file);
    if (!path) {
        const extension = file.name.split('.').pop() || 'mp3';
        path = `music_${assetCounter++}.${extension}`;
        assetMap.set(file, path);
        const content = await fileToUin8Array(file);
        assetsFolder.file(path, content);
    }
    processedProject.settings.backgroundMusic.src = `assets/${path}`;
    delete processedProject.settings.backgroundMusic.file;
  }
  
  for (const page of processedProject.pages) {
      for (const hotspot of page.hotspots) {
          if (hotspot.action.type === 'rsvp') {
              if (processedProject.settings.confirmationMode === 'whatsapp') {
                  const number = processedProject.settings.whatsapp.number.replace(/\D/g, '');
                  const message = encodeURIComponent(processedProject.settings.whatsapp.message);
                  hotspot.action = { type: 'externalLink', url: `https://wa.me/${number}?text=${message}`, newTab: true };
              } else {
                  hotspot.action = { type: 'externalLink', url: processedProject.settings.formUrl, newTab: true };
              }
          } else if (hotspot.action.type === 'map') {
              hotspot.action = { type: 'externalLink', url: processedProject.settings.mapUrl, newTab: true };
          }
      }
  }

  zip.file("config.json", JSON.stringify(processedProject, null, 2));
  zip.file("index.html", getHtmlTemplate(project.name));
  zip.file("style.css", getCssTemplate());
  zip.file("app.js", getJsTemplate());

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = "convite-interativo.zip";
  a.click();
  URL.revokeObjectURL(url);
}

// --- CONSTANTS ---
const ConfirmationMode = { WHATSAPP: 'whatsapp', FORM: 'form' };
const COVER_PAGE = { id: 'cover', name: 'Tela 1: Carta', type: 'cover', background: { type: 'image', src: 'https://picsum.photos/seed/cover/540/960' }, hotspots: [{ id: 'hotspot_cover_1', name: 'Abrir Convite', rect: { x: 30, y: 70, width: 40, height: 10 }, action: { type: 'navigate', targetPageId: 'video' } }]};
const VIDEO_PAGE = { id: 'video', name: 'Tela 2: Vídeo', type: 'video', background: { type: 'video', src: '', videoSettings: { autoplay: true, loop: true, muted: true, controls: false } }, hotspots: [{ id: 'hotspot_video_1', name: 'Continuar', rect: { x: 30, y: 80, width: 40, height: 10 }, action: { type: 'navigate', targetPageId: 'hub' }, showAfterVideoEnd: false }]};
const HUB_PAGE = { id: 'hub', name: 'Tela HUB: Principal', type: 'hub', background: { type: 'image', src: 'https://picsum.photos/seed/hub/540/960' }, hotspots: [{ id: 'hotspot_hub_1', name: 'Confirmar Presença', rect: { x: 25, y: 60, width: 50, height: 8 }, action: { type: 'rsvp' } }, { id: 'hotspot_hub_2', name: 'Local da Festa', rect: { x: 25, y: 70, width: 50, height: 8 }, action: { type: 'map' } }, { id: 'hotspot_hub_3', name: 'Sugestão de Presente', rect: { x: 25, y: 80, width: 50, height: 8 }, action: { type: 'externalLink', url: '', newTab: true } }]};
const INITIAL_PROJECT = { name: 'Novo Convite', pages: [COVER_PAGE, VIDEO_PAGE, HUB_PAGE], settings: { mapUrl: '', confirmationMode: ConfirmationMode.WHATSAPP, whatsapp: { number: '5511999999999', message: 'Olá! Confirmo minha presença no evento.' }, formUrl: '', backgroundMusic: { src: '', volume: 0.5, loop: true, autoplay: true, stopOnVideo: false, duckOnVideo: false, duckVolume: 0.2 }}};

// --- AUTH CONTEXT ---
const AuthContext = React.createContext(null);

function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = React.useState(() => {
        try {
            const user = sessionStorage.getItem("currentUser");
            return user ? JSON.parse(user) : null;
        } catch {
            return null;
        }
    });

    const login = (user) => {
        sessionStorage.setItem("currentUser", JSON.stringify(user));
        setCurrentUser(user);
    };

    const logout = () => {
        sessionStorage.removeItem("currentUser");
        setCurrentUser(null);
        window.location.hash = "#/login";
    };

    const updateUserInSession = (updatedUserPartial) => {
        if (currentUser) {
            const newUser = { ...currentUser, ...updatedUserPartial };
            sessionStorage.setItem("currentUser", JSON.stringify(newUser));
            setCurrentUser(newUser);
        }
    };

    return e(AuthContext.Provider, { value: { currentUser, login, logout, updateUserInSession } }, children);
}


// --- EDITOR COMPONENTS ---
const ProjectContext = React.createContext(null);

function Header() {
  const projectContext = React.useContext(ProjectContext);
  const authContext = React.useContext(AuthContext);

  if (!projectContext || !authContext) return null;
  const { project, updateProject } = projectContext;
  const { currentUser, logout } = authContext;

  const handleSaveProject = () => {
    const projectData = JSON.stringify(project, null, 2);
    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'convite-interativo.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedProject = JSON.parse(e.target?.result);
          updateProject(loadedProject);
        } catch (error) {
          console.error("Error parsing project file:", error);
          alert("Arquivo de projeto inválido.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExport = async () => {
    try {
        await exportToZip(project);
    } catch (error) {
        console.error("Failed to export project:", error);
        alert(`Erro ao exportar o projeto: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return e(
    'header', { className: "flex items-center justify-between p-3 bg-white border-b border-rose-200 shadow-sm" },
    e('div', { className: "flex items-center gap-3" },
      e('img', { src: "https://img.icons8.com/nolan/64/love-letter.png", alt: "logo", className: "w-8 h-8" }),
      e('h1', { className: "text-xl font-bold text-pink-900" }, "Editor de Convites Interativos")
    ),
    e('div', { className: "flex items-center gap-2" },
      currentUser?.role === 'admin' && e('a', { href: "#/admin", className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors shadow-sm" },
        e('i', { 'data-lucide': 'shield', className: "w-4 h-4" }), " Admin"
      ),
      e('label', { className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 cursor-pointer transition-colors shadow-sm" },
        e('i', { 'data-lucide': 'upload', className: "w-4 h-4" }), " Carregar",
        e('input', { type: "file", accept: ".json", className: "hidden", onChange: handleLoadProject })
      ),
      e('button', { onClick: handleSaveProject, className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors shadow-sm" },
        e('i', { 'data-lucide': 'save', className: "w-4 h-4" }), " Salvar"
      ),
      e('button', { onClick: handleExport, className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors shadow-sm" },
        e('i', { 'data-lucide': 'file-archive', className: "w-4 h-4" }), " Exportar"
      ),
      e('button', { onClick: logout, className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-pink-700 bg-pink-100 rounded-lg hover:bg-pink-200 transition-colors shadow-sm" },
        e('i', { 'data-lucide': 'log-out', className: "w-4 h-4" }), " Sair"
      )
    )
  );
}

function ScreenList() {
    const context = React.useContext(ProjectContext);
    if (!context) return null;

    const { project, selectedPageId, setSelectedPageId, addHotspot, addPage, deletePage, updatePage, duplicatePage, reorderPage } = context;

    const pageIcons = {
        cover: e('i', { 'data-lucide': 'file-text', className: "w-4 h-4 text-blue-400" }),
        video: e('i', { 'data-lucide': 'file-video', className: "w-4 h-4 text-purple-400" }),
        hub: e('i', { 'data-lucide': 'layout-grid', className: "w-4 h-4 text-green-400" }),
        internal: e('i', { 'data-lucide': 'file-text', className: "w-4 h-4 text-gray-400" }),
    };

    const handleCreateInternalPage = () => {
        const pageName = prompt("Nome da nova página interna (ex: Traje):");
        if (pageName && pageName.trim()) {
            const newPage = addPage(pageName.trim(), 'internal');
            const hotspotAction = { type: 'navigate', targetPageId: newPage.id };
            addHotspot('hub', { name: pageName, action: hotspotAction });
            setSelectedPageId(newPage.id);
        }
    };
    
    const handleAddPreset = (type) => {
        if(type === 'page') {
            handleCreateInternalPage();
            return;
        }

        let preset = {};
        switch (type) {
            case 'link': preset = { name: 'Link Externo', action: { type: 'externalLink', url: 'https://', newTab: true } }; break;
            case 'rsvp': preset = { name: 'Confirmar Presença', action: { type: 'rsvp' } }; break;
            case 'map': preset = { name: 'Local da Festa', action: { type: 'map' } }; break;
        }
        addHotspot(selectedPageId, preset);
    };
    
    const handleAddNewPage = () => {
        const pageName = prompt("Nome da nova página:");
        if (pageName && pageName.trim()) {
            const newPage = addPage(pageName.trim(), 'blank');
            setSelectedPageId(newPage.id);
        }
    };
    
    const handleRenamePage = (pageId, currentName) => {
        const newName = prompt("Novo nome da página:", currentName);
        if (newName && newName.trim()) {
            updatePage(pageId, { name: newName.trim() });
        }
    };

    return e('div', { className: "p-4 space-y-4" },
        e('div', null,
            e('h3', { className: "text-xs font-bold uppercase text-pink-900/60 mb-2 flex justify-between items-center" },
                e('span', null, "Páginas do Convite"),
                e('button', { onClick: handleAddNewPage, className: "p-1 text-pink-600 hover:text-pink-800", title: "Adicionar nova página em branco" },
                    e('i', { 'data-lucide': 'plus', className: 'w-4 h-4' })
                )
            ),
            e('ul', { className: "space-y-1" },
                project.pages.map((page, index) => e('li', { key: page.id, className: `flex items-center group ${selectedPageId === page.id ? 'bg-pink-100' : ''} rounded-lg` },
                    e('button', { onClick: () => setSelectedPageId(page.id), className: `flex items-center gap-2 w-full text-left p-2 rounded-lg transition-colors ${ selectedPageId === page.id ? 'text-pink-800 font-semibold' : 'hover:bg-rose-100/50 text-slate-600' }`},
                        pageIcons[page.type],
                        e('span', { className: "flex-1 truncate text-sm" }, page.name)
                    ),
                    e('div', { className: "flex items-center pr-1 opacity-0 group-hover:opacity-100 transition-opacity" },
                        e('button', { onClick: () => reorderPage(page.id, 'up'), disabled: index === 0, className: "p-1 text-slate-500 hover:text-pink-600 disabled:opacity-20", title: "Mover para cima" }, e('i', { 'data-lucide': 'arrow-up', className: 'w-3.5 h-3.5' })),
                        e('button', { onClick: () => reorderPage(page.id, 'down'), disabled: index === project.pages.length - 1, className: "p-1 text-slate-500 hover:text-pink-600 disabled:opacity-20", title: "Mover para baixo" }, e('i', { 'data-lucide': 'arrow-down', className: 'w-3.5 h-3.5' })),
                        e('button', { onClick: () => duplicatePage(page.id), className: "p-1 text-slate-500 hover:text-pink-600", title: "Duplicar página" }, e('i', { 'data-lucide': 'copy', className: 'w-3.5 h-3.5' })),
                        e('button', { onClick: () => handleRenamePage(page.id, page.name), className: "p-1 text-slate-500 hover:text-pink-600", title: "Renomear página" }, e('i', { 'data-lucide': 'edit', className: 'w-3.5 h-3.5' })),
                        (page.type !== 'cover' && page.type !== 'hub' && page.type !== 'video') && e('button', { onClick: () => deletePage(page.id), className: "p-1 text-slate-500 hover:text-red-600", title: "Excluir página" },
                             e('i', { 'data-lucide': 'trash-2', className: 'w-3.5 h-3.5' })
                        )
                    )
                ))
            )
        ),
        e('div', null,
            e('h3', { className: "text-xs font-bold uppercase text-pink-900/60 mb-2" }, "Adicionar Botão (Preset)"),
            e('div', { className: "grid grid-cols-2 gap-2 text-sm" },
                e('button', { onClick: () => handleAddPreset('link'), className: "flex items-center gap-2 p-2 bg-rose-100 rounded-lg hover:bg-rose-200 text-slate-700 transition-colors" }, e('i', { 'data-lucide': 'link', className: 'w-4 h-4' }), " Abrir Link"),
                e('button', { onClick: () => handleAddPreset('page'), className: "flex items-center gap-2 p-2 bg-rose-100 rounded-lg hover:bg-rose-200 text-slate-700 transition-colors" }, e('i', { 'data-lucide': 'file-plus-2', className: 'w-4 h-4' }), " Página Interna"),
                e('button', { onClick: () => handleAddPreset('rsvp'), className: "flex items-center gap-2 p-2 bg-rose-100 rounded-lg hover:bg-rose-200 text-slate-700 transition-colors" }, e('i', { 'data-lucide': 'check-square', className: 'w-4 h-4' }), " Confirmar"),
                e('button', { onClick: () => handleAddPreset('map'), className: "flex items-center gap-2 p-2 bg-rose-100 rounded-lg hover:bg-rose-200 text-slate-700 transition-colors" }, e('i', { 'data-lucide': 'map-pin', className: 'w-4 h-4' }), " Mapa")
            )
        )
    );
}

function SettingsPanel() {
  const context = React.useContext(ProjectContext);
  if (!context) return null;
  
  const { project, updateProject } = context;
  const { settings } = project;
  const audioRef = React.useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('whatsapp.')) {
        const key = name.split('.')[1];
        updateProject({ ...project, settings: { ...settings, whatsapp: { ...settings.whatsapp, [key]: value } } });
    } else {
        updateProject({ ...project, settings: { ...settings, [name]: value } });
    }
  };

  const handleMusicSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = type === 'checkbox' ? checked : value;
    if (name === 'volume' || name === 'duckVolume') val = parseFloat(value) / 100;
    updateProject({ ...project, settings: { ...settings, backgroundMusic: { ...settings.backgroundMusic, [name]: val } } });
  };

  const handleMusicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { src } = await handleFileUpload(file);
      updateProject({ ...project, settings: { ...settings, backgroundMusic: { ...settings.backgroundMusic, src, file } } });
    }
  };

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.backgroundMusic.volume;
      if (settings.backgroundMusic.src && !settings.backgroundMusic.src.startsWith('blob:')) audioRef.current.load();
    }
  }, [settings.backgroundMusic.src, settings.backgroundMusic.volume]);

  return e('div', { className: "p-4 space-y-6 text-sm" },
    e('h3', { className: "text-lg font-semibold text-pink-900 mb-4" }, "Configurações Globais"),
    e('div', null,
      e('label', { className: "block text-slate-600 font-medium mb-1" }, "URL Google Maps"),
      e('input', { type: "text", name: "mapUrl", value: settings.mapUrl, onChange: handleChange, className: "w-full bg-white border border-rose-200 rounded-lg px-3 py-2" })
    ),
    e('div', { className: "p-3 bg-rose-100/50 rounded-lg space-y-4" },
      e('h4', { className: "font-semibold text-pink-800" }, "Música de Fundo"),
      e('input', { type: "file", accept: "audio/*", onChange: handleMusicUpload, className: "w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600" }),
      settings.backgroundMusic.src && e('div', null,
        e('audio', { ref: audioRef, src: settings.backgroundMusic.src, controls: true, className: "w-full h-8 mt-2" }),
        e('div', { className: "space-y-2 mt-2" },
            e('div', { className: "flex items-center justify-between" }, e('label', null, "Volume"), e('span', null, Math.round(settings.backgroundMusic.volume * 100))),
            e('input', { type: "range", min: 0, max: 100, name: 'volume', value: settings.backgroundMusic.volume * 100, onChange: handleMusicSettingsChange, className: "w-full" }),
            e('label', { className: "flex items-center gap-2" }, e('input', { type: "checkbox", name: "loop", checked: settings.backgroundMusic.loop, onChange: handleMusicSettingsChange, className: "rounded text-pink-600" }), "Loop"),
            e('label', { className: "flex items-center gap-2" }, e('input', { type: "checkbox", name: "autoplay", checked: settings.backgroundMusic.autoplay, onChange: handleMusicSettingsChange, className: "rounded text-pink-600" }), "Autoplay"),
            e('label', { className: "flex items-center gap-2" }, e('input', { type: "checkbox", name: "stopOnVideo", checked: settings.backgroundMusic.stopOnVideo, onChange: handleMusicSettingsChange, className: "rounded text-pink-600" }), "Parar no vídeo"),
            e('label', { className: "flex items-center gap-2" }, e('input', { type: "checkbox", name: "duckOnVideo", checked: settings.backgroundMusic.duckOnVideo, onChange: handleMusicSettingsChange, className: "rounded text-pink-600" }), "Reduzir no vídeo"),
            settings.backgroundMusic.duckOnVideo && e('div', null,
                e('div', { className: "flex items-center justify-between" }, e('label', null, "Volume reduzido"), e('span', null, `${Math.round(settings.backgroundMusic.duckVolume * 100)}%`)),
                e('input', { type: "range", min: 0, max: 100, name: 'duckVolume', value: settings.backgroundMusic.duckVolume * 100, onChange: handleMusicSettingsChange, className: "w-full" })
            )
        )
      )
    ),
    e('div', null,
      e('label', { className: "block text-slate-600 font-medium mb-1" }, "Modo de Confirmação"),
      e('select', { name: "confirmationMode", value: settings.confirmationMode, onChange: handleChange, className: "w-full bg-white border border-rose-200 rounded-lg px-3 py-2" },
        e('option', { value: ConfirmationMode.WHATSAPP }, "WhatsApp"),
        e('option', { value: ConfirmationMode.FORM }, "Formulário")
      )
    ),
    settings.confirmationMode === ConfirmationMode.WHATSAPP && e('div', { className: "p-3 bg-rose-100/50 rounded-lg space-y-4" },
      e('h4', { className: "font-semibold text-pink-800" }, "WhatsApp"),
      e('div', null, e('label', { className: "block" }, "Número"), e('input', { type: "tel", name: "whatsapp.number", value: settings.whatsapp.number, onChange: handleChange, className: "w-full bg-white border-rose-200 rounded-lg px-3 py-2" })),
      e('div', null, e('label', { className: "block" }, "Mensagem"), e('textarea', { name: "whatsapp.message", value: settings.whatsapp.message, onChange: handleChange, rows: 3, className: "w-full bg-white border-rose-200 rounded-lg px-3 py-2" }))
    ),
    settings.confirmationMode === ConfirmationMode.FORM && e('div', { className: "p-3 bg-rose-100/50 rounded-lg space-y-4" },
      e('h4', { className: "font-semibold text-pink-800" }, "Formulário"),
      e('div', null, e('label', { className: "block" }, "URL"), e('input', { type: "url", name: "formUrl", value: settings.formUrl, onChange: handleChange, className: "w-full bg-white border-rose-200 rounded-lg px-3 py-2" }))
    )
  );
}

function Sidebar() {
  const [activeTab, setActiveTab] = React.useState('screens');
  return e('aside', { className: "w-80 bg-white border-r border-rose-200 flex flex-col" },
    e('div', { className: "flex border-b border-rose-200" },
      e('button', { onClick: () => setActiveTab('screens'), className: `flex-1 p-3 text-sm font-semibold ${activeTab === 'screens' ? 'bg-rose-100 text-pink-700' : 'hover:bg-rose-100/50'}` }, "Telas"),
      e('button', { onClick: () => setActiveTab('settings'), className: `flex-1 p-3 text-sm font-semibold ${activeTab === 'settings' ? 'bg-rose-100 text-pink-700' : 'hover:bg-rose-100/50'}` }, "Configs")
    ),
    e('div', { className: "flex-1 overflow-y-auto" },
      activeTab === 'screens' && e(ScreenList),
      activeTab === 'settings' && e(SettingsPanel)
    )
  );
}

function PageEditor({ page }) {
    const { updatePage } = React.useContext(ProjectContext);
    const handleBackgroundChange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const { src } = await handleFileUpload(file);
            const type = file.type.startsWith('video') ? 'video' : 'image';
            const newBackground = { ...page.background, type, src, file, videoSettings: type === 'video' ? (page.background.videoSettings || { autoplay: true, loop: true, muted: true, controls: false }) : undefined };
            updatePage(page.id, { background: newBackground });
        }
    };
    const handleVideoSettingsChange = (e) => {
        const { name, checked } = e.target;
        if (page.background.type === 'video') updatePage(page.id, { background: { ...page.background, videoSettings: { ...(page.background.videoSettings ?? {}), [name]: checked } } });
    };
    return e('div', { className: "space-y-4 text-sm" },
        e('div', null, e('label', { className: "block" }, "Nome"), e('input', { type: "text", value: page.name, onChange: (e) => updatePage(page.id, { name: e.target.value }), className: "w-full bg-white border border-rose-200 rounded-lg px-3 py-2" })),
        e('div', null, e('label', { className: "block" }, "Fundo"), e('input', { type: "file", accept: "image/*,video/mp4", onChange: handleBackgroundChange, className: "w-full" })),
        page.background.src && e('span', { className: "text-xs text-green-600" }, "Arquivo carregado."),
        page.background.type === 'video' && e('div', { className: "p-3 bg-rose-100/50 rounded-lg space-y-2" },
            e('h4', { className: "font-semibold" }, "Opções Vídeo"),
            e('label', { className: "flex items-center gap-2" }, e('input', { type: "checkbox", name: "autoplay", checked: page.background.videoSettings?.autoplay ?? true, onChange: handleVideoSettingsChange }), "Autoplay"),
            e('label', { className: "flex items-center gap-2" }, e('input', { type: "checkbox", name: "loop", checked: page.background.videoSettings?.loop ?? true, onChange: handleVideoSettingsChange }), "Loop"),
            e('label', { className: "flex items-center gap-2" }, e('input', { type: "checkbox", name: "muted", checked: page.background.videoSettings?.muted ?? true, onChange: handleVideoSettingsChange }), "Mudo"),
            e('label', { className: "flex items-center gap-2" }, e('input', { type: "checkbox", name: "controls", checked: page.background.videoSettings?.controls ?? false, onChange: handleVideoSettingsChange }), "Controles")
        )
    );
}

function HotspotEditor({ page, hotspot }) {
    const { project, updateHotspot, deleteHotspot, duplicateHotspot } = React.useContext(ProjectContext);
    const isInvalid = hotspot.action.type === 'navigate' && hotspot.action.invalid;
    const handleHotspotChange = (updates) => updateHotspot(page.id, hotspot.id, updates);
    const handleActionChange = (action) => handleHotspotChange({ action });
    const handleNavActionChange = (targetPageId) => handleActionChange({ type: 'navigate', targetPageId, invalid: false });
    return e('div', { className: "space-y-4 text-sm" },
        isInvalid && e('div', { className: "p-3 mb-2 text-sm text-red-800 bg-red-100 rounded-lg" }, e('h4', { className: 'font-bold' }, "Ação Inválida"), e('p', null, "A página de destino foi excluída. Escolha uma nova.")),
        e('div', null, e('label', { className: "block" }, "Nome"), e('input', { type: "text", value: hotspot.name, onChange: e => handleHotspotChange({ name: e.target.value }), className: "w-full border rounded p-1" })),
        e('div', null,
            e('label', { className: "block" }, "Ação"),
            e('select', { value: hotspot.action.type, disabled: ['rsvp', 'map'].includes(hotspot.action.type), onChange: e => { const type = e.target.value; if (type === 'navigate') handleActionChange({ type, targetPageId: 'hub' }); if (type === 'externalLink') handleActionChange({ type, url: '', newTab: true }); }, className: "w-full border rounded p-1" },
                e('option', { value: "navigate" }, "Navegar"), e('option', { value: "externalLink" }, "Link Externo"),
                e('option', { value: "rsvp", disabled: true }, "Confirmar"), e('option', { value: "map", disabled: true }, "Mapa")
            )
        ),
        hotspot.action.type === 'navigate' && e('div', null, e('label', { className: "block" }, "Destino"), e('select', { value: hotspot.action.targetPageId, onChange: e => handleNavActionChange(e.target.value), className: `w-full border rounded p-1 ${isInvalid ? 'border-red-500' : ''}` }, project.pages.map(p => e('option', { key: p.id, value: p.id }, p.name)))),
        hotspot.action.type === 'externalLink' && e('div', { className: "space-y-2" },
            e('input', { type: "url", value: hotspot.action.url, onChange: e => handleActionChange({ ...hotspot.action, url: e.target.value }), className: "w-full border rounded p-1" }),
            e('label', { className: "flex items-center gap-2" }, e('input', { type: "checkbox", checked: hotspot.action.newTab, onChange: e => handleActionChange({ ...hotspot.action, newTab: e.target.checked }) }), "Nova aba")
        ),
        page.background.type === 'video' && e('label', { className: "flex items-center gap-2" }, e('input', { type: "checkbox", checked: !!hotspot.showAfterVideoEnd, onChange: e => handleHotspotChange({ showAfterVideoEnd: e.target.checked }) }), "Aparecer após vídeo"),
        e('div', { className: "flex gap-2 pt-2 border-t" },
            e('button', { onClick: () => duplicateHotspot(page.id, hotspot.id), className: "flex-1 p-2 bg-slate-500 text-white rounded" }, "Duplicar"),
            e('button', { onClick: () => deleteHotspot(page.id, hotspot.id), className: "flex-1 p-2 bg-pink-600 text-white rounded" }, "Excluir")
        )
    );
}

function PropertiesPanel() {
    const context = React.useContext(ProjectContext);
    if (!context) return null;
    const { project, selectedPageId } = context;
    const selectedPage = project.pages.find(p => p.id === selectedPageId);
    const selectedHotspot = selectedPage?.hotspots.find(h => h.id === context.selectedHotspotId);
    if (!selectedPage) return e('aside', { className: "w-80" });
    return e('aside', { className: "w-80 bg-white border-l p-4 overflow-y-auto" },
        e('h3', { className: "text-lg font-semibold mb-4" }, "Propriedades"),
        !selectedHotspot ? e(PageEditor, { page: selectedPage }) : e(HotspotEditor, { page: selectedPage, hotspot: selectedHotspot })
    );
}

function HotspotComponent({ hotspot, pageId, previewRef }) {
  const { selectedHotspotId, setSelectedHotspotId, updateHotspot } = React.useContext(ProjectContext);
  const [dragState, setDragState] = React.useState(null);
  const isSelected = selectedHotspotId === hotspot.id;
  const isInvalid = hotspot.action.type === 'navigate' && hotspot.action.invalid;

  const handleMouseDown = (e, type) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedHotspotId(hotspot.id);
    if (previewRef.current) setDragState({ type, startX: e.clientX, startY: e.clientY, initialRect: hotspot.rect });
  };
  
  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragState || !previewRef.current) return;
      const previewBounds = previewRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragState.startX) / previewBounds.width) * 100, dy = ((e.clientY - dragState.startY) / previewBounds.height) * 100;
      let newRect = { ...dragState.initialRect };
      switch (dragState.type) {
        case 'move': newRect.x += dx; newRect.y += dy; break;
        case 'resize-br': newRect.width += dx; newRect.height += dy; break;
        case 'resize-bl': newRect.x += dx; newRect.width -= dx; newRect.height += dy; break;
        case 'resize-tr': newRect.y += dy; newRect.width += dx; newRect.height -= dy; break;
        case 'resize-tl': newRect.x += dx; newRect.y += dy; newRect.width -= dx; newRect.height -= dy; break;
      }
      newRect.x = Math.max(0, Math.min(100 - newRect.width, newRect.x));
      newRect.y = Math.max(0, Math.min(100 - newRect.height, newRect.y));
      newRect.width = Math.max(5, Math.min(100 - newRect.x, newRect.width));
      newRect.height = Math.max(5, Math.min(100 - newRect.y, newRect.height));
      updateHotspot(pageId, hotspot.id, { rect: newRect });
    };
    const handleMouseUp = () => setDragState(null);
    if (dragState) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [dragState, pageId, hotspot.id, previewRef, updateHotspot]);

  const borderStyle = isInvalid ? 'border-2 border-red-500 bg-red-500/30' : isSelected ? 'border-2 border-pink-500 bg-pink-500/30' : 'border border-dashed border-pink-900/50';
  const resizeHandleClasses = 'absolute bg-white border-2 border-pink-500 w-3 h-3 -m-1.5 rounded-full';

  return e('div', {
      className: `absolute select-none cursor-move rounded-md ${borderStyle}`,
      style: { left: `${hotspot.rect.x}%`, top: `${hotspot.rect.y}%`, width: `${hotspot.rect.width}%`, height: `${hotspot.rect.height}%` },
      onMouseDown: (e) => handleMouseDown(e, 'move'),
      onClick: e => { e.stopPropagation(); setSelectedHotspotId(hotspot.id); },
      title: isInvalid ? 'Ação inválida' : hotspot.name
    },
    e('div', { className: "w-full h-full flex items-center justify-center p-1" }, e('span', { className: `text-white text-xs truncate px-1 py-0.5 rounded ${isInvalid ? 'bg-red-800/80' : 'bg-pink-900/70'}` }, hotspot.name)),
    isSelected && !isInvalid && e(React.Fragment, null,
      e('div', { className: `${resizeHandleClasses} top-0 left-0 cursor-nwse-resize`, onMouseDown: (e) => handleMouseDown(e, 'resize-tl') }),
      e('div', { className: `${resizeHandleClasses} top-0 right-0 cursor-nesw-resize`, onMouseDown: (e) => handleMouseDown(e, 'resize-tr') }),
      e('div', { className: `${resizeHandleClasses} bottom-0 left-0 cursor-nesw-resize`, onMouseDown: (e) => handleMouseDown(e, 'resize-bl') }),
      e('div', { className: `${resizeHandleClasses} bottom-0 right-0 cursor-nwse-resize`, onMouseDown: (e) => handleMouseDown(e, 'resize-br') })
    )
  );
}

function Preview() {
  const { project, selectedPageId, setSelectedHotspotId } = React.useContext(ProjectContext);
  const previewRef = React.useRef(null);
  const currentPage = project.pages.find(p => p.id === selectedPageId);
  if (!currentPage) return e('div', { className: "aspect-[9/16] w-full max-w-sm bg-gray-700" }, "Página não encontrada.");
  const { background, id: pageId, hotspots } = currentPage;
  return e('div', { className: "aspect-[9/16] w-full max-w-sm bg-gray-700 rounded-lg shadow-2xl overflow-hidden relative", ref: previewRef, onClick: (e) => { if (e.target === previewRef.current) setSelectedHotspotId(null); } },
    background.type === 'image' && background.src && e('img', { src: background.src, className: "absolute w-full h-full object-cover" }),
    background.type === 'video' && background.src && e('video', { key: background.src, src: background.src, className: "absolute w-full h-full object-cover", ...background.videoSettings, playsInline: true }),
    !background.src && e('div', { className: "w-full h-full flex items-center justify-center bg-gray-600" }, e('p', { className: "text-center p-4" }, "Envie uma imagem ou vídeo.")),
    hotspots.map(hotspot => e(HotspotComponent, { key: hotspot.id, hotspot, pageId, previewRef }))
  );
}

function EditorComponent() {
  const [project, setProject] = React.useState(INITIAL_PROJECT);
  const [selectedPageId, setSelectedPageId] = React.useState('cover');
  const [selectedHotspotId, setSelectedHotspotId] = React.useState(null);
  
  const updateProject = React.useCallback(p => setProject(p), []);
  const updatePage = React.useCallback((pageId, pageUpdate) => setProject(p => ({ ...p, pages: p.pages.map(pg => pg.id === pageId ? { ...pg, ...pageUpdate } : pg) })), []);
  const addPage = React.useCallback((name, template) => {
    const newPageId = `page_${Date.now()}`;
    let hotspots = template === 'internal' ? [{ id: `hotspot_${Date.now()}`, name: 'Voltar', rect: { x: 5, y: 5, width: 20, height: 8 }, action: { type: 'navigate', targetPageId: 'hub' } }] : [];
    const newPage = { id: newPageId, name, type: 'internal', background: { type: 'image', src: '' }, hotspots };
    setProject(p => ({ ...p, pages: [...p.pages, newPage] }));
    return newPage;
  }, []);
  const deletePage = React.useCallback((pageId) => {
    setProject(p => {
        if (p.pages.length <= 1 || !confirm("Tem certeza?")) return p;
        const newPages = p.pages.filter(pg => pg.id !== pageId);
        const cleanedPages = newPages.map(pg => ({...pg, hotspots: pg.hotspots.map(h => h.action.type === 'navigate' && h.action.targetPageId === pageId ? { ...h, action: { ...h.action, invalid: true } } : h)}));
        if (selectedPageId === pageId) setSelectedPageId(cleanedPages[0]?.id || null);
        return { ...p, pages: cleanedPages };
    });
  }, [selectedPageId]);
  const duplicatePage = React.useCallback((pageId) => setProject(p => {
    const pageToDuplicate = p.pages.find(pg => pg.id === pageId); if (!pageToDuplicate) return p;
    const newPageId = `page_${Date.now()}`;
    const newPage = { ...pageToDuplicate, id: newPageId, name: `${pageToDuplicate.name} (Cópia)`, hotspots: pageToDuplicate.hotspots.map((h, i) => ({ ...h, id: `hotspot_${newPageId}_${i}` })) };
    const originalIndex = p.pages.findIndex(pg => pg.id === pageId);
    const newPages = [...p.pages]; newPages.splice(originalIndex + 1, 0, newPage);
    return { ...p, pages: newPages };
  }), []);
  const reorderPage = React.useCallback((pageId, direction) => setProject(p => {
    const pages = [...p.pages]; const index = pages.findIndex(pg => pg.id === pageId);
    if (index === -1) return p; const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pages.length) return p;
    const [movedPage] = pages.splice(index, 1); pages.splice(newIndex, 0, movedPage);
    return { ...p, pages };
  }), []);
  const addHotspot = React.useCallback((pageId, hotspot) => {
    const newHotspotId = `hotspot_${Date.now()}`;
    setProject(p => ({ ...p, pages: p.pages.map(pg => pg.id === pageId ? { ...pg, hotspots: [...pg.hotspots, { id: newHotspotId, name: 'Novo Botão', rect: { x: 40, y: 40, width: 20, height: 10 }, action: { type: 'externalLink', url: '', newTab: true }, ...hotspot }] } : pg) }));
    setSelectedHotspotId(newHotspotId);
  }, []);
  const updateHotspot = React.useCallback((pageId, hotspotId, hotspotUpdate) => setProject(p => ({ ...p, pages: p.pages.map(pg => pg.id === pageId ? { ...pg, hotspots: pg.hotspots.map(h => h.id === hotspotId ? { ...h, ...hotspotUpdate } : h) } : pg) })), []);
  const deleteHotspot = React.useCallback((pageId, hotspotId) => { setProject(p => ({ ...p, pages: p.pages.map(pg => pg.id === pageId ? { ...pg, hotspots: pg.hotspots.filter(h => h.id !== hotspotId) } : pg) })); setSelectedHotspotId(null); }, []);
  const duplicateHotspot = React.useCallback((pageId, hotspotId) => setProject(p => {
    const page = p.pages.find(pg => pg.id === pageId); const hotspot = page?.hotspots.find(h => h.id === hotspotId); if (!page || !hotspot) return p;
    const newHotspot = { ...hotspot, id: `hotspot_${Date.now()}`, rect: { ...hotspot.rect, y: hotspot.rect.y + 5 } };
    return { ...p, pages: p.pages.map(pg => pg.id === pageId ? { ...pg, hotspots: [...pg.hotspots, newHotspot] } : pg) };
  }), []);

  const contextValue = { project, updateProject, updatePage, addPage, deletePage, duplicatePage, reorderPage, addHotspot, updateHotspot, deleteHotspot, duplicateHotspot, selectedPageId, setSelectedPageId, selectedHotspotId, setSelectedHotspotId };
  return e(ProjectContext.Provider, { value: contextValue }, e('div', { className: "flex flex-col h-screen" }, e(Header), e('div', { className: "flex flex-1 overflow-hidden" }, e(Sidebar), e('main', { className: "flex-1 flex items-center justify-center p-4 bg-rose-200/30" }, e(Preview)), e(PropertiesPanel))));
}


// --- AUTH COMPONENTS ---
function LoginPage() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const authContext = React.useContext(AuthContext);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        if (!email || !password) { setError('Preencha todos os campos.'); return; }
        try {
            const user = await db.getUser(email);
            if (!user) { setError('E-mail ou senha inválidos.'); return; }
            const passwordHash = await hashPassword(password);
            if (user.passwordHash !== passwordHash) { setError('E-mail ou senha inválidos.'); return; }
            authContext?.login(user);
        } catch (err) { setError('Ocorreu um erro.'); console.error(err); }
    };
    return e('div', { className: "flex items-center justify-center min-h-screen bg-rose-50" }, e('div', { className: "w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl" },
        e('div', { className: "text-center" }, e('img', { src: "https://img.icons8.com/nolan/64/love-letter.png", alt: "logo", className: "w-16 h-16 mx-auto" }), e('h1', { className: "text-3xl font-bold mt-2" }, "Bem-vindo(a)"), e('p', { className: "text-slate-500" }, "Faça login para continuar")),
        e('form', { onSubmit: handleSubmit, className: "space-y-4" },
            e('div', null, e('label', { className: "block" }, "E-mail"), e('input', { type: "email", value: email, onChange: e => setEmail(e.target.value), className: "w-full p-2 mt-1 border rounded" })),
            e('div', { className: 'relative' }, e('label', { className: "block" }, "Senha"), e('input', { type: showPassword ? "text" : "password", value: password, onChange: e => setPassword(e.target.value), className: "w-full p-2 mt-1 border rounded" }), e('button', { type: 'button', onClick: () => setShowPassword(!showPassword), className: 'absolute right-3 top-9' }, e('i', { 'data-lucide': showPassword ? 'eye-off' : 'eye' }))),
            error && e('p', { className: "text-sm text-red-600" }, error),
            e('button', { type: "submit", className: "w-full p-2 font-semibold text-white bg-pink-500 rounded" }, "Entrar")
        ),
        e('div', { className: "text-center text-sm" }, e('p', null, "Não tem conta? ", e('a', { href: "#/register", className: "text-pink-600" }, "Cadastre-se")), e('p', { className: 'mt-2' }, "Esqueceu a senha? ", e('span', { className: "cursor-help", title: "Contate o admin" }, "Solicite ao admin")))
    ));
}

function RegisterPage() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');
    
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(''); setSuccess('');
        if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
        if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
        try {
            const existingUser = await db.getUser(email);
            if (existingUser) { setError('Este e-mail já está em uso.'); return; }
            const passwordHash = await hashPassword(password);
            await db.addUser({ email, passwordHash, role: 'user', status: 'PENDING' });
            setSuccess('Cadastro realizado! Aguarde a aprovação de um administrador.');
            setEmail(''); setPassword(''); setConfirmPassword('');
        } catch (err) { setError('Ocorreu um erro.'); console.error(err); }
    };

    return e('div', { className: "flex items-center justify-center min-h-screen bg-rose-50" }, e('div', { className: "w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl" },
        e('div', { className: "text-center" }, e('h1', { className: "text-3xl font-bold" }, "Criar Conta")),
        success ? e('div', { className: 'text-center text-green-700' }, e('p', null, success), e('a', { href: "#/login", className: 'font-bold' }, " Voltar para Login")) :
        e('form', { onSubmit: handleSubmit, className: "space-y-4" },
            e('div', null, e('label', null, "E-mail"), e('input', { type: "email", value: email, onChange: e => setEmail(e.target.value), className: "w-full p-2 border rounded" })),
            e('div', null, e('label', null, "Senha"), e('input', { type: "password", value: password, onChange: e => setPassword(e.target.value), className: "w-full p-2 border rounded" })),
            e('div', null, e('label', null, "Confirmar Senha"), e('input', { type: "password", value: confirmPassword, onChange: e => setConfirmPassword(e.target.value), className: "w-full p-2 border rounded" })),
            error && e('p', { className: "text-red-600" }, error),
            e('button', { type: "submit", className: "w-full p-2 text-white bg-pink-500 rounded" }, "Cadastrar")
        ),
        e('div', { className: "text-center" }, e('p', null, "Já tem conta? ", e('a', { href: "#/login", className: "text-pink-600" }, "Faça login")))
    ));
}

function AdminPage() {
    const [users, setUsers] = React.useState([]);
    const fetchUsers = React.useCallback(async () => setUsers(await db.getAllUsers()), []);
    React.useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleUpdateStatus = async (email, status) => { const user = await db.getUser(email); if (user) { await db.updateUser({ ...user, status }); fetchUsers(); } };
    const handleDeleteUser = async (email) => { if (confirm(`Excluir ${email}?`)) { await db.deleteUser(email); fetchUsers(); } };
    const handleResetPassword = async (email) => {
        const tempPassword = generateTempPassword();
        if (confirm(`Gerar nova senha para ${email}?`)) {
            const user = await db.getUser(email);
            if (user) {
                const passwordHash = await hashPassword(tempPassword);
                await db.updateUser({ ...user, passwordHash, mustChangePassword: true });
                alert(`Senha temporária para ${email}:\n\n${tempPassword}`);
                fetchUsers();
            }
        }
    };
    
    return e('div', { className: "p-8" },
        e('div', { className: 'flex items-center mb-6' }, e('a', { href: '#/editor', className: 'p-2 rounded-full hover:bg-slate-200' }, e('i', { 'data-lucide': 'arrow-left' })), e('h1', { className: "text-2xl font-semibold ml-4" }, "Painel de Administração")),
        e('div', { className: 'overflow-x-auto' }, e('table', { className: 'min-w-full' },
            e('thead', { className: 'bg-rose-100' }, e('tr', null, e('th', { className: 'p-3' }, "E-mail"), e('th', { className: 'p-3' }, "Status"), e('th', { className: 'p-3' }, "Ações"))),
            e('tbody', { className: 'bg-white' }, users.map(user => e('tr', { key: user.email },
                e('td', { className: 'p-3' }, user.email, user.role === 'admin' && e('span', { className: 'font-bold text-blue-600' }, ' (Admin)')),
                e('td', { className: 'p-3' }, e('span', { className: 'px-2 py-1 rounded-full text-xs' }, user.status)),
                e('td', { className: 'p-3 space-x-2' }, user.role !== 'admin' && e(React.Fragment, null,
                    user.status === 'PENDING' && e('button', { onClick: () => handleUpdateStatus(user.email, 'APPROVED') }, 'Aprovar'),
                    user.status === 'APPROVED' && e('button', { onClick: () => handleUpdateStatus(user.email, 'BLOCKED') }, 'Bloquear'),
                    user.status === 'BLOCKED' && e('button', { onClick: () => handleUpdateStatus(user.email, 'APPROVED') }, 'Desbloquear'),
                    e('button', { onClick: () => handleResetPassword(user.email) }, 'Resetar Senha'),
                    e('button', { onClick: () => handleDeleteUser(user.email) }, 'Excluir')
                ))
            )))
        ))
    );
}

function ChangePasswordPage() {
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');
    const authContext = React.useContext(AuthContext);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return; }
        if (newPassword.length < 6) { setError('Senha muito curta.'); return; }
        if (!authContext?.currentUser) { setError('Nenhum usuário logado.'); return; }
        try {
            const passwordHash = await hashPassword(newPassword);
            const updatedUser = { ...authContext.currentUser, passwordHash, mustChangePassword: false };
            await db.updateUser(updatedUser);
            authContext.updateUserInSession(updatedUser);
            setSuccess('Senha alterada com sucesso!');
        } catch (err) { setError('Erro ao alterar a senha.'); console.error(err); }
    };
    
    return e('div', { className: "flex items-center justify-center min-h-screen" }, e('div', { className: "w-full max-w-md p-8 bg-white rounded shadow-md" },
        e('h1', { className: "text-2xl font-bold text-center" }, "Alterar Senha"),
        success ? e('p', { className: 'text-green-600 text-center' }, success) :
        e('form', { onSubmit: handleSubmit, className: 'space-y-4 mt-4' },
            e('div', null, e('label', null, "Nova Senha"), e('input', { type: 'password', value: newPassword, onChange: e => setNewPassword(e.target.value), className: 'w-full p-2 border rounded' })),
            e('div', null, e('label', null, "Confirmar Senha"), e('input', { type: 'password', value: confirmPassword, onChange: e => setConfirmPassword(e.target.value), className: 'w-full p-2 border rounded' })),
            error && e('p', { className: 'text-red-600' }, error),
            e('button', { type: 'submit', className: 'w-full p-2 text-white bg-pink-500 rounded' }, "Salvar")
        )
    ));
}


// --- MAIN APP ROUTER ---
function AppRouter() {
    const [route, setRoute] = React.useState(window.location.hash || '#/login');
    const { currentUser, logout } = React.useContext(AuthContext);

    React.useEffect(() => {
        const handleHashChange = () => setRoute(window.location.hash);
        window.addEventListener('hashchange', handleHashChange);
        db.initAdmin();
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    React.useEffect(() => {
        if (currentUser) {
            if (currentUser.mustChangePassword) {
                if (route !== '#/change-password') window.location.hash = '#/change-password';
            } else if (route === '#/login' || route === '#/register' || !route || route === '#/') {
                window.location.hash = '#/editor';
            }
        } else {
             if (route !== '#/register') {
                window.location.hash = '#/login';
            }
        }
    }, [currentUser, route]);
    
    React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

    const renderRoute = () => {
        if (currentUser) {
            if (currentUser.mustChangePassword) return e(ChangePasswordPage);
            switch (currentUser.status) {
                case 'PENDING': return e('div', {className: 'text-center p-8'}, e('h1', null, "Aguardando aprovação"), e('p', null, "Sua conta precisa ser aprovada."), e('button', {onClick: logout}, "Voltar"));
                case 'BLOCKED': return e('div', {className: 'text-center p-8'}, e('h1', null, "Conta Bloqueada"), e('button', {onClick: logout}, "Voltar"));
                case 'APPROVED':
                    if (currentUser.role === 'admin' && route === "#/admin") return e(AdminPage);
                    if (route.startsWith('#/editor') || route === '') return e(EditorComponent);
                    return e(EditorComponent);
            }
        }
        if (route === '#/register') return e(RegisterPage);
        return e(LoginPage);
    };

    return e('div', { className: "bg-rose-50 min-h-screen" }, renderRoute());
}

function App() {
  return e(AuthProvider, null, e(AppRouter));
}

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(e(React.StrictMode, null, e(App)));
