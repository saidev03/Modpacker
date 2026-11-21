// ESTADO GLOBAL DE LA APLICACIÓN
let selectedMods = [];
let localOverrides = []; // Archivos locales para la carpeta overrides/
let galleryImages = [];
let currentImageIndex = 0;

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

// OVERRIDES Y DRAG & DROP
const dropZone = document.getElementById('drop-zone');
const fileInputFolder = document.getElementById('file-input-folder');
const fileInputFiles = document.getElementById('file-input-files');
const overridesList = document.getElementById('overrides-list');

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
            <button onclick="addMod('${mod.project_id}', '${mod.title.replace(/'/g, "\\'")}', '${mod.icon_url || ''}')" class="add-btn bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex-shrink-0 z-10">
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
            <button onclick="addMod('${project.id}', '${project.title.replace(/'/g, "\\'")}', '${project.icon_url || ''}'); closePreview();" class="purple-gradient px-5 py-2 rounded-xl font-bold text-xs text-white hover:scale-105 transition-transform">
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
            <button onclick="removeMod(${index})" class="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1 flex-shrink-0">Quitar</button>
        `;
        addedList.appendChild(item);
    });
}

function removeMod(index) {
    selectedMods.splice(index, 1);
    updateAddedList();
}

// =========================================================================
// MOTOR INTELIGENTE DE LIMPIEZA Y REORGANIZACIÓN DE OVERRIDES
// =========================================================================

// Reglas de archivos/carpetas a ignorar (Basura, logs, executables, temporales)
const BLACKLISTED_PATTERNS = [
    // Logs y temporales
    /\/logs\//i, /\.log$/i, /\.log\.gz$/i, /\/crash-reports\//i, /\/cache\//i, /\/backups\//i, /\.tmp$/i,
    // Basura de Sistemas Operativos
    /\.ds_store$/i, /thumbs\.db$/i, /\/\.git\//i, /\/\.vscode\//i, /\/\.idea\//i,
    // Ejecutables y scripts de instalación que no deben ir dentro de un modpack
    /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.sh$/i, /\.msi$/i,
    // Perfiles y metadata pesada de Launchers
    /launcher_profiles\.json$/i, /tlauncher.*\.json$/i, /usercache\.json$/i, /usernamecache\.json$/i
];

function sanitizeAndRoutePath(rawPath, fileName) {
    // Normalizar separadores de ruta a formato Unix "/"
    let path = rawPath.replace(/\\/g, '/');

    // 1. REGLA DE FILTRADO: Verificar si el archivo está en la lista negra
    for (const pattern of BLACKLISTED_PATTERNS) {
        if (pattern.test(path)) {
            return null; // Omitir este archivo
        }
    }

    // 2. REGLA DE LIMPIEZA DE PREFIX: Remover carpetas contenedoras raíz como ".minecraft/", "overrides/", "MyModpack/"
    const commonRootFolders = ['/dot-minecraft/', '/.minecraft/', '/overrides/', '/minecraft/'];
    const lowerPath = '/' + path.toLowerCase();

    for (const root of commonRootFolders) {
        const rootIdx = lowerPath.indexOf(root);
        if (rootIdx !== -1) {
            path = path.substring(rootIdx + root.length);
            break;
        }
    }

    // Si al limpiar quedó un slash inicial, removerlo
    path = path.replace(/^\/+/, '');

    // 3. REGLA DE RUTEO INTELIGENTE: Si el archivo está en la raíz sin carpeta asignada
    if (!path.includes('/')) {
        const nameLower = fileName.toLowerCase();

        // Archivos .jar sueltos -> mods/
        if (nameLower.endsWith('.jar')) {
            return `mods/${fileName}`;
        }

        // Shaders (.zip o .fsh) sueltos -> shaderpacks/
        if (nameLower.includes('shader') || nameLower.endsWith('.fsh')) {
            return `shaderpacks/${fileName}`;
        }

        // Resourcepacks (.zip) sueltos -> resourcepacks/
        if (nameLower.endsWith('.zip') && !nameLower.includes('config')) {
            return `resourcepacks/${fileName}`;
        }

        // Archivos de configuración sueltos (txt, json, toml, cfg, ini) -> config/
        if (nameLower.endsWith('.toml') || nameLower.endsWith('.cfg') || nameLower.endsWith('.json5') || nameLower.endsWith('.ini')) {
            return `config/${fileName}`;
        }
    }

    return path;
}

function handleFiles(files) {
    let addedCount = 0;
    let skippedCount = 0;

    for (let file of files) {
        let rawPath = file.webkitRelativePath || file.name;
        let routedPath = sanitizeAndRoutePath(rawPath, file.name);

        if (!routedPath) {
            skippedCount++;
            continue; // Se ignoró por basura o ejecutable inseguro
        }

        // Evitar duplicados exactos en la lista
        if (!localOverrides.some(o => o.path === routedPath)) {
            localOverrides.push({
                path: routedPath,
                file: file
            });
            addedCount++;
        }
    }

    if (skippedCount > 0) {
        console.log(`[Smart Clean] Se auto-eliminaron ${skippedCount} archivo(s) innecesarios o basuras (logs, .exe, cache, etc.).`);
    }

    updateOverridesList();
}

function updateOverridesList() {
    statFiles.innerText = localOverrides.length;

    if (localOverrides.length === 0) {
        overridesList.innerHTML = `<p class="text-gray-600 text-xs text-center py-4">No has subido archivos locales aún.</p>`;
        return;
    }

    overridesList.innerHTML = '';
    localOverrides.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'bg-[#161925] px-2.5 py-1.5 rounded-lg border border-gray-800/80 flex justify-between items-center text-xs text-gray-300';
        el.innerHTML = `
            <div class="flex items-center gap-1.5 overflow-hidden">
                <span class="text-purple-400 text-[10px] font-bold">[AUTO]</span>
                <span class="truncate font-mono text-[11px] max-w-[210px]" title="${item.path}">${item.path}</span>
            </div>
            <button onclick="removeOverride(${index})" class="text-red-400 hover:text-red-300 font-bold ml-2">&times;</button>
        `;
        overridesList.appendChild(el);
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

// DRAG & DROP LISTENERS
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-purple-600', 'bg-purple-950/20');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-purple-600', 'bg-purple-950/20');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-purple-600', 'bg-purple-950/20');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

fileInputFolder.addEventListener('change', (e) => handleFiles(e.target.files));
fileInputFiles.addEventListener('change', (e) => handleFiles(e.target.files));

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

        // 1. Crear manifest (modrinth.index.json)
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

        indexJson.dependencies[loader] = customLoaderVer || "recommended";
        zip.file("modrinth.index.json", JSON.stringify(indexJson, null, 2));

        // 2. Procesamiento asíncrono y seguro de archivos locales (/overrides/)
        const overridesFolder = zip.folder("overrides");
        let processedFiles = 0;
        let skippedFiles = 0;

        for (const item of localOverrides) {
            try {
                const arrayBuffer = await item.file.arrayBuffer();
                overridesFolder.file(item.path, arrayBuffer);
                processedFiles++;
            } catch (fileErr) {
                console.warn(`[PackCraft Warning] No se pudo leer el archivo local: ${item.path}`, fileErr);
                skippedFiles++;
            }
        }

        if (skippedFiles > 0) {
            alert(`Aviso: ${skippedFiles} archivo(s) no pudieron ser leídos del disco y fueron omitidos, pero el resto se empaquetó correctamente.`);
        }

        // 3. Generar blob del archivo comprimido
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${packName.toLowerCase().replace(/\s+/g, '-')}-${packVer}.mrpack`;
        link.click();

        packStatus.innerText = "¡Exportado con éxito!";
    } catch (err) {
        console.error("Error al empaquetar .mrpack:", err);
        alert("Ocurrió un error inesperado al comprimir el modpack. Revisa la consola.");
        packStatus.innerText = "Error de empaquetado";
    } finally {
        btnExport.disabled = false;
        btnExport.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});
