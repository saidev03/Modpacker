// ESTADO GLOBAL DE LA APLICACIÓN
let selectedMods = [];
let localOverrides = []; // { path: 'config/...', file: File }
let skippedOverrides = []; // { name: '...', reason: '...' }
let galleryImages = [];
let currentImageIndex = 0;

// Mapeo de loaders de UI/búsqueda -> claves válidas en modrinth.index.json -> dependencies
const LOADER_DEPENDENCY_MAP = {
    fabric: 'fabric-loader',
    quilt: 'quilt-loader',
    forge: 'forge',
    neoforge: 'neoforge'
};

// ELEMENTOS DEL DOM
const searchInput = document.getElementById('search-input');
const btnSearch = document.getElementById('btn-search');
const resultsList = document.getElementById('results-list');
const resultsCount = document.getElementById('results-count');
const addedList = document.getElementById('added-list');
const modCount = document.getElementById('mod-count');
const btnExport = document.getElementById('btn-export');
const statMods = document.getElementById('stat-mods');
const statFiles = document.getElementById('stat-files');
const statSkipped = document.getElementById('stat-skipped');

// OVERRIDES Y DRAG & DROP
const dropZone = document.getElementById('drop-zone');
const fileInputFolder = document.getElementById('file-input-folder');
const fileInputFiles = document.getElementById('file-input-files');
const overridesList = document.getElementById('overrides-list');
const skippedList = document.getElementById('skipped-list');

// MODAL Y LIGHTBOX
const modal = document.getElementById('preview-modal');
const closeModal = document.getElementById('close-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalAuthor = document.getElementById('modal-author');
const modalGallery = document.getElementById('modal-gallery');
const modalDescription = document.getElementById('modal-description');
const modalFooter = document.getElementById('modal-footer');

const lightbox = document.getElementById('lightbox');
const closeLightbox = document.getElementById('close-lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const prevLightbox = document.getElementById('prev-lightbox');
const nextLightbox = document.getElementById('next-lightbox');
const lightboxCounter = document.getElementById('lightbox-counter');

// SISTEMA DE PESTAÑAS
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

    document.getElementById(`tab-btn-${tabName}`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
}

// BÚSQUEDA DE MODS EN MODRINTH API
async function searchMods() {
    const query = searchInput.value.trim();
    if (!query) return;

    resultsList.innerHTML = `<div class="text-gray-500 text-xs text-center py-8">Buscando mods compatibles...</div>`;

    const mcVersion = document.getElementById('mc-version').value;
    const loader = document.getElementById('loader-type').value;

    try {
        const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=[["categories:${loader}"],["versions:${mcVersion}"],["project_type:mod"]]&limit=12`;
        const response = await fetch(url);
        const data = await response.json();
        
        resultsCount.innerText = `${data.hits.length} hallados`;
        displayResults(data.hits);
    } catch (error) {
        resultsList.innerHTML = `<div class="text-red-500 text-xs text-center py-8">Error al conectar con la API de Modrinth.</div>`;
    }
}

// RENDERIZAR RESULTADOS DE BÚSQUEDA
function displayResults(mods) {
    if (mods.length === 0) {
        resultsList.innerHTML = `<div class="text-gray-500 text-xs text-center py-8">No se encontraron mods para esta versión o loader.</div>`;
        return;
    }

    resultsList.innerHTML = '';
    mods.forEach(mod => {
        const item = document.createElement('div');
        item.className = 'mod-card bg-[#161925] p-2.5 rounded-xl border border-gray-800/80 flex justify-between items-center gap-2 hover:border-purple-600 transition-all cursor-pointer';
        
        item.innerHTML = `
            <div class="flex items-center gap-2.5 pointer-events-none overflow-hidden">
                <img src="${mod.icon_url || 'https://placehold.co/40'}" class="w-9 h-9 rounded-lg object-cover flex-shrink-0">
                <div class="text-left overflow-hidden">
                    <h4 class="font-bold text-xs text-white truncate">${mod.title}</h4>
                    <p class="text-[11px] text-gray-400 truncate">${mod.description || 'Sin descripción.'}</p>
                </div>
            </div>
            <button type="button" onclick="addMod('${mod.project_id}', '${mod.title.replace(/'/g, "\\'")}', '${mod.icon_url || ''}')" class="add-btn bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex-shrink-0 z-10">
                + Añadir
            </button>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.closest('.add-btn')) return;
            openPreview(mod.project_id);
        });

        resultsList.appendChild(item);
    });
}

// VISTA PREVIA MODAL
async function openPreview(projectId) {
    modal.classList.remove('hidden');
    modalDescription.innerHTML = "<p class='text-gray-400 italic text-xs'>Cargando detalles del proyecto...</p>";
    modalGallery.innerHTML = '';
    modalFooter.innerHTML = '';
    galleryImages = [];

    try {
        const response = await fetch(`https://api.modrinth.com/v2/project/${projectId}`);
        const project = await response.json();

        modalIcon.src = project.icon_url || 'https://placehold.co/40';
        modalTitle.innerText = project.title;
        modalAuthor.innerText = `Creado por: ${project.organization || 'Autor de Modrinth'}`;

        if (project.body) {
            let htmlContent = "";
            if (typeof marked !== 'undefined' && marked.parse) {
                htmlContent = marked.parse(project.body);
            } else {
                htmlContent = project.body.replace(/\n/g, '<br>');
            }
            modalDescription.innerHTML = htmlContent;

            modalDescription.querySelectorAll('a').forEach(el => el.className = 'text-purple-400 underline hover:text-purple-300');
            modalDescription.querySelectorAll('h1, h2, h3').forEach(el => el.className = 'text-white font-bold text-sm mt-3 mb-1 border-b border-gray-800 pb-1');
            modalDescription.querySelectorAll('ul').forEach(el => el.className = 'list-disc list-inside space-y-1 my-2 text-gray-300');
            modalDescription.querySelectorAll('code').forEach(el => el.className = 'bg-gray-900 text-purple-300 px-1 py-0.5 rounded text-[11px] font-mono');
        } else {
            modalDescription.innerHTML = "Este proyecto no incluye descripción extensa.";
        }

        if (project.gallery && project.gallery.length > 0) {
            project.gallery.forEach((img, idx) => {
                galleryImages.push(img.url);
                const imageEl = document.createElement('img');
                imageEl.src = img.url;
                imageEl.className = 'h-20 w-36 rounded-lg object-cover border border-gray-800 flex-shrink-0 hover:scale-105 hover:border-purple-600 transition-all cursor-zoom-in';
                imageEl.addEventListener('click', () => showLightbox(idx));
                modalGallery.appendChild(imageEl);
            });
        } else {
            modalGallery.innerHTML = `<span class="text-xs text-gray-600 italic">No hay fotos en la galería de este mod.</span>`;
        }

        modalFooter.innerHTML = `
            <button type="button" onclick="addMod('${project.id}', '${project.title.replace(/'/g, "\\'")}', '${project.icon_url || ''}'); closePreview();" class="purple-gradient px-5 py-2 rounded-xl font-bold text-xs text-white hover:scale-105 transition-transform">
                + Añadir a mi Modpack
            </button>
        `;
    } catch (e) {
        modalDescription.innerHTML = "<p class='text-red-500 text-xs'>Error al cargar información extendida desde Modrinth.</p>";
    }
}

// LIGHTBOX
function showLightbox(index) {
    currentImageIndex = index;
    lightboxImg.src = galleryImages[currentImageIndex];
    lightboxCounter.innerText = `${currentImageIndex + 1} / ${galleryImages.length}`;
    lightbox.classList.remove('hidden');
}

function closeLightboxView() { lightbox.classList.add('hidden'); }
function nextImage() { if (galleryImages.length > 1) showLightbox((currentImageIndex + 1) % galleryImages.length); }
function prevImage() { if (galleryImages.length > 1) showLightbox((currentImageIndex - 1 + galleryImages.length) % galleryImages.length); }

closeLightbox.addEventListener('click', closeLightboxView);
prevLightbox.addEventListener('click', (e) => { e.stopPropagation(); prevImage(); });
nextLightbox.addEventListener('click', (e) => { e.stopPropagation(); nextImage(); });
lightbox.addEventListener('click', closeLightboxView);

document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('hidden')) return;
    if (e.key === "ArrowRight") nextImage();
    if (e.key === "ArrowLeft") prevImage();
    if (e.key === "Escape") closeLightboxView();
});

function closePreview() { modal.classList.add('hidden'); }
closeModal.addEventListener('click', closePreview);
modal.addEventListener('click', (e) => { if (e.target === modal) closePreview(); });

// AÑADIR MOD MODRINTH
async function addMod(projectId, title, iconUrl) {
    if (selectedMods.some(m => m.id === projectId)) return alert("El mod ya está agregado a tu lista.");

    const mcVersion = document.getElementById('mc-version').value;
    const loader = document.getElementById('loader-type').value;

    try {
        const url = `https://api.modrinth.com/v2/project/${projectId}/version?loaders=["${loader}"]&game_versions=["${mcVersion}"]`;
        const response = await fetch(url);
        const versions = await response.json();

        if (versions.length === 0) {
            alert(`Incompatibilidad: No existe versión de "${title}" publicada para Minecraft ${mcVersion} con Loader ${loader.toUpperCase()}.`);
            return;
        }

        const bestVersion = versions[0];
        const file = bestVersion.files.find(f => f.primary) || bestVersion.files[0];

        selectedMods.push({
            id: projectId,
            title: title,
            icon: iconUrl,
            filename: file.filename,
            downloadUrl: file.url,
            hashes: file.hashes,
            size: file.size
        });

        updateAddedList();
    } catch (e) {
        alert("Error de conexión al obtener archivos del mod seleccionado.");
    }
}

function updateAddedList() {
    modCount.innerText = selectedMods.length;
    statMods.innerText = selectedMods.length;

    if (selectedMods.length === 0) {
        addedList.innerHTML = `<p class="text-gray-500 text-xs text-center py-8">No has añadido mods desde el buscador.</p>`;
        return;
    }

    addedList.innerHTML = '';
    selectedMods.forEach((mod, index) => {
        const item = document.createElement('div');
        item.className = 'bg-[#161925] p-2.5 rounded-xl border border-gray-800 flex justify-between items-center gap-2';
        item.innerHTML = `
            <div class="flex items-center gap-2.5 overflow-hidden">
                <img src="${mod.icon || 'https://placehold.co/40'}" class="w-7 h-7 rounded-lg object-cover flex-shrink-0">
                <div class="overflow-hidden">
                    <span class="font-bold text-xs text-white truncate block">${mod.title}</span>
                    <span class="text-[10px] text-gray-500 truncate block">${mod.filename}</span>
                </div>
            </div>
            <button type="button" onclick="removeMod(${index})" class="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1 flex-shrink-0">Quitar</button>
        `;
        addedList.appendChild(item);
    });
}

function removeMod(index) {
    selectedMods.splice(index, 1);
    updateAddedList();
}

// =========================================================================
// MOTOR DE LECTURA RECURSIVA, LIMPIEZA Y ACOMODO INTELIGENTE DE OVERRIDES
// =========================================================================

const KNOWN_MINECRAFT_DIRS = [
    'config',
    'defaultconfigs',
    'resourcepacks',
    'shaderpacks',
    'mods',
    'kubejs',
    'datapacks',
    'saves',
    'scripts',
    'patchouli_books',
    'schematics'
];

const SKIP_RULES = [
    { regex: /(?:^|\/)logs(?:\/|$)|\.log(?:\.gz)?$/i, reason: 'Archivo o carpeta de logs' },
    { regex: /(?:^|\/)crash-reports(?:\/|$)/i, reason: 'Carpeta de crash reports' },
    { regex: /(?:^|\/)(?:cache|caches|backups|backup)(?:\/|$)/i, reason: 'Carpeta de caché o respaldos' },
    { regex: /\.(?:tmp|temp|bak|old|swp)$/i, reason: 'Archivo temporal o de respaldo' },
    { regex: /(?:^|\/)(?:\.git|\.svn|\.vscode|\.idea)(?:\/|$)/i, reason: 'Carpeta de control de versiones o IDE' },
    { regex: /(?:^|\/)(?:\.ds_store|thumbs\.db|desktop\.ini)$/i, reason: 'Archivo oculto o del sistema operativo' },
    { regex: /\.(?:exe|bat|cmd|sh|ps1|msi|com|scr|dll|so|dylib)$/i, reason: 'Ejecutable, librería nativa o script del sistema' },
    { regex: /(?:^|\/)(?:launcher_profiles\.json|tlauncher.*\.json|usercache\.json|usernamecache\.json|servers\.dat_old)$/i, reason: 'Archivo interno de launcher o caché de sesión' }
];

function recordSkipped(name, reason) {
    const cleanName = name.replace(/\\/g, '/');
    if (!skippedOverrides.some(s => s.name === cleanName && s.reason === reason)) {
        skippedOverrides.push({ name: cleanName, reason });
    }
}

function evaluateAndRouteFile(file, explicitRelativePath = null) {
    const rawPath = (explicitRelativePath || file.webkitRelativePath || file.name || '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '');

    const fileName = file.name || rawPath.split('/').pop() || 'archivo';

    if (file.size === 0) {
        recordSkipped(rawPath || fileName, 'Archivo vacío (0 bytes)');
        return null;
    }

    for (const rule of SKIP_RULES) {
        if (rule.regex.test(rawPath) || rule.regex.test(fileName)) {
            recordSkipped(rawPath || fileName, rule.reason);
            return null;
        }
    }

    const parts = rawPath.split('/').filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
        const segmentLower = parts[i].toLowerCase();
        if (KNOWN_MINECRAFT_DIRS.includes(segmentLower)) {
            const normalizedParts = [segmentLower, ...parts.slice(i + 1)];
            return normalizedParts.join('/');
        }
    }

    const rootWrappers = ['.minecraft', 'dot-minecraft', 'minecraft', 'overrides', 'instance'];
    let cleanedParts = [...parts];
    while (cleanedParts.length > 1 && rootWrappers.includes(cleanedParts[0].toLowerCase())) {
        cleanedParts.shift();
    }

    let finalPath = cleanedParts.join('/');

    if (!finalPath.includes('/')) {
        const lowerName = fileName.toLowerCase();

        if (lowerName.endsWith('.jar')) {
            return `mods/${fileName}`;
        }
        if (lowerName.includes('shader') || lowerName.endsWith('.fsh') || lowerName.endsWith('.vsh')) {
            return `shaderpacks/${fileName}`;
        }
        if (lowerName.endsWith('.zip')) {
            return `resourcepacks/${fileName}`;
        }
        if (
            lowerName.endsWith('.toml') ||
            lowerName.endsWith('.cfg') ||
            lowerName.endsWith('.json5') ||
            lowerName.endsWith('.ini') ||
            lowerName.endsWith('.properties')
        ) {
            return `config/${fileName}`;
        }
    }

    return finalPath;
}

function addProcessedFile(file, explicitRelativePath = null) {
    const routedPath = evaluateAndRouteFile(file, explicitRelativePath);
    if (!routedPath) return;

    if (!localOverrides.some(o => o.path === routedPath)) {
        localOverrides.push({
            path: routedPath,
            file: file
        });
    }
}

function traverseEntry(entry, currentPath = '') {
    return new Promise((resolve) => {
        if (!entry) return resolve();

        if (entry.isFile) {
            entry.file(
                (file) => {
                    const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
                    addProcessedFile(file, fullPath);
                    resolve();
                },
                () => {
                    const fallbackPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                    recordSkipped(fallbackPath, 'No se pudo leer el archivo desde el sistema');
                    resolve();
                }
            );
        } else if (entry.isDirectory) {
            const dirPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            const reader = entry.createReader();
            const allEntries = [];

            const readBatch = () => {
                reader.readEntries(
                    async (entries) => {
                        if (entries.length === 0) {
                            for (const child of allEntries) {
                                await traverseEntry(child, dirPath);
                            }
                            resolve();
                        } else {
                            allEntries.push(...entries);
                            readBatch();
                        }
                    },
                    () => {
                        recordSkipped(dirPath, 'No se pudo leer el contenido de la carpeta');
                        resolve();
                    }
                );
            };

            readBatch();
        } else {
            resolve();
        }
    });
}

async function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('border-purple-600', 'bg-purple-950/20');

    const items = e.dataTransfer && e.dataTransfer.items;
    if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
        const entries = [];
        for (let i = 0; i < items.length; i++) {
            const entry = items[i].webkitGetAsEntry();
            if (entry) entries.push(entry);
        }
        for (const entry of entries) {
            await traverseEntry(entry, '');
        }
        refreshOverrideViews();
        return;
    }

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handleFileList(e.dataTransfer.files);
    }
}

function handleFileList(files) {
    for (let i = 0; i < files.length; i++) {
        addProcessedFile(files[i]);
    }
    refreshOverrideViews();
}

function refreshOverrideViews() {
    updateOverridesList();
    updateSkippedList();
}

function updateOverridesList() {
    statFiles.innerText = localOverrides.length;

    if (localOverrides.length === 0) {
        overridesList.innerHTML = `<p class="text-gray-600 text-xs text-center py-4">No has subido archivos locales válidos aún.</p>`;
        return;
    }

    overridesList.innerHTML = '';
    localOverrides.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'bg-[#161925] px-2.5 py-1.5 rounded-lg border border-gray-800/80 flex justify-between items-center text-xs text-gray-300';
        el.innerHTML = `
            <div class="flex items-center gap-1.5 overflow-hidden">
                <span class="text-purple-400 text-[10px] font-bold flex-shrink-0">overrides/</span>
                <span class="truncate font-mono text-[11px]" title="overrides/${item.path}">${item.path}</span>
            </div>
            <button type="button" onclick="removeOverride(${index})" class="text-red-400 hover:text-red-300 font-bold ml-2 flex-shrink-0">&times;</button>
        `;
        overridesList.appendChild(el);
    });
}

function updateSkippedList() {
    statSkipped.innerText = skippedOverrides.length;

    if (skippedOverrides.length === 0) {
        skippedList.innerHTML = `<p class="text-gray-600 text-xs text-center py-4">Ningún archivo omitido todavía.</p>`;
        return;
    }

    skippedList.innerHTML = '';
    skippedOverrides.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'bg-[#1a1116] px-2.5 py-1.5 rounded-lg border border-red-900/50 flex justify-between items-start gap-2 text-xs text-gray-300';
        el.innerHTML = `
            <div class="overflow-hidden">
                <div class="truncate font-mono text-[11px] text-red-200" title="${item.name}">${item.name}</div>
                <div class="text-[10px] text-red-400">Motivo: ${item.reason}</div>
            </div>
            <button type="button" onclick="removeSkipped(${index})" class="text-gray-400 hover:text-white font-bold flex-shrink-0">&times;</button>
        `;
        skippedList.appendChild(el);
    });
}

function removeOverride(index) {
    localOverrides.splice(index, 1);
    updateOverridesList();
}

function clearOverrides() {
    localOverrides = [];
    updateOverridesList();
}

function removeSkipped(index) {
    skippedOverrides.splice(index, 1);
    updateSkippedList();
}

function clearSkipped() {
    skippedOverrides = [];
    updateSkippedList();
}

// DRAG & DROP LISTENERS
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-purple-600', 'bg-purple-950/20');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-purple-600', 'bg-purple-950/20');
});

dropZone.addEventListener('drop', handleDrop);

fileInputFolder.addEventListener('change', (e) => {
    handleFileList(e.target.files);
    e.target.value = '';
});

fileInputFiles.addEventListener('change', (e) => {
    handleFileList(e.target.files);
    e.target.value = '';
});

btnSearch.addEventListener('click', searchMods);
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchMods(); });

// PROCESADOR Y EXPORTADOR BLINDADO (.MRPACK)
btnExport.addEventListener('click', async () => {
    if (selectedMods.length === 0 && localOverrides.length === 0) {
        alert("¡Tu pack está totalmente vacío! Añade mods de Modrinth o sube carpetas/archivos locales en Overrides.");
        return;
    }

    const packStatus = document.getElementById('pack-status-badge');
    const packName = document.getElementById('pack-name').value.trim() || "Modpack";
    const packAuthor = document.getElementById('pack-author').value.trim() || "Sa1xp";
    const packVer = document.getElementById('pack-version').value.trim() || "1.0.0";
    const mcVersion = document.getElementById('mc-version').value.trim() || "1.20.1";
    const loader = document.getElementById('loader-type').value;
    const summary = document.getElementById('pack-summary').value.trim() || `Modpack por ${packAuthor}`;
    const customLoaderVer = document.getElementById('loader-version').value.trim();

    packStatus.innerText = "Empaquetando en segundo plano...";
    btnExport.disabled = true;
    btnExport.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        const zip = new JSZip();

        const indexJson = {
            formatVersion: 1,
            game: "minecraft",
            versionId: packVer,
            name: packName,
            summary: summary,
            files: selectedMods.map(mod => ({
                path: `mods/${mod.filename}`,
                hashes: {
                    sha1: mod.hashes.sha1,
                    sha256: mod.hashes.sha256
                },
                env: {
                    client: "required",
                    server: "required"
                },
                downloads: [mod.downloadUrl],
                fileSize: mod.size
            })),
            dependencies: {
                minecraft: mcVersion
            }
        };

        // Clave válida de dependencia para Modrinth (.mrpack): fabric-loader, quilt-loader, forge, neoforge
        const dependencyKey = LOADER_DEPENDENCY_MAP[loader] || loader;
        indexJson.dependencies[dependencyKey] = customLoaderVer || "recommended";

        zip.file("modrinth.index.json", JSON.stringify(indexJson, null, 2));

        const overridesFolder = zip.folder("overrides");
        let processedFiles = 0;

        for (const item of localOverrides) {
            try {
                const arrayBuffer = await item.file.arrayBuffer();
                overridesFolder.file(item.path, arrayBuffer);
                processedFiles++;
            } catch (fileErr) {
                recordSkipped(`overrides/${item.path}`, 'Error al leer el archivo durante la exportación');
            }
        }

        updateSkippedList();

        if (selectedMods.length === 0 && processedFiles === 0) {
            alert("No se pudo empaquetar ningún archivo válido. Revisa la sección 'No se subieron (Motivo exacto)' en la pestaña Configs / Overrides.");
            packStatus.innerText = "Sin archivos válidos";
            return;
        }

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${packName.toLowerCase().replace(/\s+/g, '-')}-${packVer}.mrpack`;
        link.click();

        packStatus.innerText = `¡Exportado! (${processedFiles} overrides)`;
    } catch (err) {
        console.error("Error al empaquetar .mrpack:", err);
        alert("Ocurrió un error inesperado al comprimir el modpack. Revisa la consola.");
        packStatus.innerText = "Error de empaquetado";
    } finally {
        btnExport.disabled = false;
        btnExport.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});
