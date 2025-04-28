document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load sidebar first
        await loadSidebar();
        
        // Then load footer
        await loadFooter();
        
        // Load modals and their scripts
        await loadModals();

        await loadChatComponent();

        setupUploadListener();
        
        // No cargar el dashboard por defecto, ya que se maneja en index.html
        console.log('App initialized');
        
    } catch (error) {
        console.error('Error during initial load:', error);
    }
});

// Load chat component
async function loadChatComponent() {
    try {
        const response = await fetch('src/components/chat.html');
        const html = await response.text();
        const chatContainer = document.getElementById('chat-component');
        if (chatContainer) {
            chatContainer.innerHTML = html;
            // Cargar el script del chat después de que el HTML esté cargado
            const script = document.createElement('script');
            script.src = 'src/js/chat.js';
            script.onload = () => {
                console.log('Chat script loaded successfully');
                // Inicializar el chat después de que el script esté cargado
                if (typeof ChatBot === 'function') {
                    window.chatBot = new ChatBot();
                }
            };
            document.body.appendChild(script);
        }
    } catch (error) {
        console.error('Error loading chat component:', error);
    }
}

async function loadModals() {
    try {
        const modalsContainer = document.getElementById('modals-container');
        if (!modalsContainer) {
            console.error('Modals container not found');
            return;
        }

        // Load modals HTML in parallel
        const [searchModalHtml, addDocumentModalHtml] = await Promise.all([
            fetch('src/components/modals/SearchModal.html').then(r => r.text()),
            fetch('src/components/modals/AddDocumentModal.html').then(r => r.text())
        ]);

        // Combine modals HTML
        modalsContainer.innerHTML = searchModalHtml + addDocumentModalHtml;

        // Wait for DOM to update
        await new Promise(resolve => setTimeout(resolve, 0));

        // Load modal scripts
        await Promise.all([
            loadScript('src/js/modals/search-modal.js'),
            loadScript('src/js/modals/add-document.js')
        ]);

        // Wait for scripts to initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify modals are initialized
        if (window.searchModal && window.addDocumentModal) {
            console.log('Modals initialized successfully');
            
            // Add event listeners for modal triggers
            document.querySelectorAll('[data-modal="search"]').forEach(button => {
                button.addEventListener('click', () => window.searchModal.show());
            });

            document.querySelectorAll('[data-modal="add-document"]').forEach(button => {
                button.addEventListener('click', () => window.addDocumentModal.show());
            });
        } else {
            console.error('Failed to initialize modals');
        }

    } catch (error) {
        console.error('Error loading modals:', error);
    }
}

async function loadPage(pageName) {
    const contentDiv = document.getElementById('content');
    if (!contentDiv) {
        console.error('Content div not found');
        return;
    }

    try {
        // Obtener parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const documentId = urlParams.get('id');

        console.log(`Loading page: ${pageName}, documentId: ${documentId}`);

        // Cargar el sidebar y el footer
        await ensureSidebarLoaded();
        await loadFooter();

        // Cargar el contenido HTML de la página
        await loadHTMLContent(pageName, contentDiv);

        // Esperar a que el DOM se actualice
        await new Promise(resolve => setTimeout(resolve, 500));

        // Manejar páginas especiales
        if (pageName === 'dashboard') {
            await loadDashboardData();
        } else if (pageName === 'document' && documentId) {
            // Cargar el script de documento
            await loadScript('src/js/document.js');
            // Esperar a que el script se cargue
            await new Promise(resolve => setTimeout(resolve, 500));
            // Inicializar la página de documento
            if (typeof initializeDocumentPage === 'function') {
                initializeDocumentPage();
            } else {
                console.error('initializeDocumentPage function not found');
            }
        } else if (pageName === 'directory') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            await loadScript('src/js/directory.js');
        }

        // Inicializar modales
        initializeModals();
    } catch (error) {
        console.error(`Error loading page ${pageName}:`, error);
        contentDiv.innerHTML = '<div class="p-4">Error cargando la página</div>';
    }
}

async function loadHTMLContent(pageName, container) {
    try {
        console.log(`Loading HTML content for page: ${pageName}`);
        const response = await fetch(`src/pages/${pageName}.html`);
        if (!response.ok) {
            throw new Error(`Error loading HTML: ${response.status} ${response.statusText}`);
        }
        const html = await response.text();
        container.innerHTML = html;
        console.log(`HTML content loaded for page: ${pageName}`);
    } catch (error) {
        console.error(`Error loading HTML content for ${pageName}:`, error);
        throw error;
    }
}

// ---------------- FUNCIONES AUXILIARES ---------------- //

async function ensureSidebarLoaded() {
    const sidebarContainer = document.getElementById('sidebarContainer');
    if (sidebarContainer && !sidebarContainer.children.length) {
        await loadSidebar();
    }
}

async function handleSpecialPages(pageName) {
    if (pageName === 'directory') {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        await loadScript('src/js/directory.js');
        console.log('Directory page scripts loaded');
    }
}

async function loadPageScript(pageName) {
    const script = document.createElement('script');
    script.src = `src/js/${pageName}.js`;
    script.onerror = () => script.remove();
    document.body.appendChild(script);
}

function setupUploadListener() {
    const submitButton = document.getElementById('upload-file');

    if (!submitButton) {
        console.error('Botón de subida no encontrado');
        return;
    }

    // La lógica de subida de documentos se ha movido a add-document.js
    console.log('La lógica de subida de documentos se ha movido a add-document.js');
}

async function loadDashboardData() {
    const endpoint = "https://4d83ign91j.execute-api.us-east-1.amazonaws.com/dev/dashboard";

    try {
        const response = await fetch(endpoint);
        const data = await response.json();

        console.log(data);
        updateStats(data);
        renderFileTypeDistribution(data.file_type_summary);
        renderRecentDocuments(data.recent_documents);
        renderRecentActivity(data.last_added, data.last_updated);
    } catch (error) {
        console.error("Error al cargar el dashboard:", error);
    }
}

// ---------------- COMPONENTES DEL DASHBOARD ---------------- //

function updateStats(data) {
    const elements = {
        totalDocs: document.getElementById("stat-total-docs"),
        activeDocs: document.getElementById("stat-active-docs"),
        pendingDocs: document.getElementById("stat-pending-docs"),
        expiringDocs: document.getElementById("stat-expiring-docs")
    };

    // Verificar si estamos en la página del dashboard
    if (!elements.totalDocs || !elements.activeDocs || !elements.pendingDocs || !elements.expiringDocs) {
        console.log('No estamos en la página del dashboard, omitiendo actualización de estadísticas');
        return;
    }

    // Actualizar solo los elementos que existen
    if (elements.totalDocs) elements.totalDocs.textContent = data.total_documents;
    if (elements.activeDocs) elements.activeDocs.textContent = data.active_documents;
    if (elements.pendingDocs) elements.pendingDocs.textContent = data.pending_documents;
    if (elements.expiringDocs) elements.expiringDocs.textContent = data.expiring_documents;
}

function renderFileTypeDistribution(summary) {
    const container = document.getElementById("file-type-dist");
    if (!container) {
        console.log('No estamos en la página del dashboard, omitiendo renderizado de distribución de tipos de archivo');
        return;
    }

    container.innerHTML = "";

    const total = Object.values(summary).reduce((a, b) => a + b, 0);

    for (const [type, count] of Object.entries(summary)) {
        const percent = ((count / total) * 100).toFixed(1);
        const color = getFileTypeColor(type);
        container.innerHTML += `
            <div>
                <div class="flex justify-between mb-1">
                    <span class="text-sm font-medium text-gray-700">${type.toUpperCase()}</span>
                    <span class="text-sm text-gray-500">${percent}%</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="${color} h-2 rounded-full" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    }
}

function getFileTypeColor(type) {
    switch (type) {
        case "pdf": return "bg-blue-600";
        case "jpeg": return "bg-green-600";
        case "png": return "bg-yellow-500";
        default: return "bg-gray-400";
    }
}

function renderRecentDocuments(documents) {
    const container = document.getElementById("recent-documents-body");
    container.innerHTML = "";

    documents.forEach(doc => {
        const ext = doc.extension || doc.type?.split("/")[1] || "file";
        const icon = getFileIconClass(ext);
        const date = new Date(doc.updated_at).toLocaleString("es-ES", {
            hour: "2-digit", minute: "2-digit", day: "numeric", month: "short"
        });
        const badge = getStatusBadge(doc.status);

        container.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="py-4">
                    <div class="flex items-center">
                        <i class="${icon} mr-3 text-lg"></i>
                        <a href="index.html?page=document&id=${doc.id}" class="text-sm font-medium text-gray-800 hover:text-blue-600 cursor-pointer">${doc.name}</a>
                    </div>
                </td>
                <td class="py-4 text-sm text-gray-500">${ext.toUpperCase()}</td>
                <td class="py-4 text-sm text-gray-500">${date}</td>
                <td class="py-4">${badge}</td>
                <td class="py-4 text-right">
                    <button onclick="previewDocument('${doc.id}')" class="text-blue-600 hover:text-blue-800" title="Visualizar documento">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function getFileIconClass(ext) {
    switch (ext) {
        case "pdf": return "fas fa-file-pdf text-red-500";
        case "doc":
        case "docx": return "fas fa-file-word text-blue-500";
        case "xls":
        case "xlsx": return "fas fa-file-excel text-green-500";
        case "jpeg":
        case "jpg": return "fas fa-file-image text-pink-500";
        case "png": return "fas fa-file-image text-yellow-500";
        default: return "fas fa-file text-gray-400";
    }
}

function getStatusBadge(status) {
    const colors = {
        "Activo": "bg-green-100 text-green-800",
        "En Revisión": "bg-yellow-100 text-yellow-800",
        "Compartido": "bg-blue-100 text-blue-800",
        "Procesado": "bg-indigo-100 text-indigo-800"
    };
    const color = colors[status] || "bg-gray-100 text-gray-800";
    return `<span class="px-2 py-1 text-xs font-medium rounded-full ${color}">${status}</span>`;
}

function renderRecentActivity(lastAdded, lastUpdated) {
    const container = document.getElementById("recent-activity");
    container.innerHTML = "";

    if (lastAdded) {
        container.innerHTML += createActivityItem(
            "fas fa-file-upload",
            "bg-blue-50",
            "text-blue-600",
            "Nuevo documento agregado",
            lastAdded.name,
            lastAdded.upload_date,
            lastAdded.id
        );
    }

    if (lastUpdated) {
        container.innerHTML += createActivityItem(
            "fas fa-edit",
            "bg-green-50",
            "text-green-600",
            "Documento actualizado",
            lastUpdated.name,
            lastUpdated.updated_at,
            lastUpdated.id
        );
    }
}

function createActivityItem(iconClass, bgClass, textColorClass, title, filename, dateString, documentId) {
    return `
        <div class="flex items-start">
            <div class="w-10 h-10 rounded-full ${bgClass} flex items-center justify-center flex-shrink-0">
                <i class="${iconClass} ${textColorClass} text-lg"></i>
            </div>
            <div class="ml-4">
                <p class="text-sm font-medium text-gray-800">${title}</p>
                <a href="#" onclick="loadPage('document', '${documentId}'); return false;" class="text-xs text-blue-600 hover:text-blue-800 hover:underline">${filename}</a>
                <p class="text-xs text-gray-400 mt-1">${timeAgo(dateString)}</p>
            </div>
        </div>
    `;
}

function timeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Hace unos segundos";
    if (minutes < 60) return `Hace ${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} horas`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} días`;
}

// Helper function to load scripts in order
async function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`Script loaded: ${src}`);
            resolve();
        };
        script.onerror = () => {
            console.error(`Error loading script: ${src}`);
            reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script);
    });
}

function initializeModals() {
    console.log('Initializing modals...');
    
    // Handle add document button click
    const addDocumentBtn = document.getElementById('add-document-btn');
    if (addDocumentBtn) {
        addDocumentBtn.addEventListener('click', () => {
            console.log('Add document button clicked');
            if (window.addDocumentModal && typeof window.addDocumentModal.show === 'function') {
                window.addDocumentModal.show();
            } else {
                console.error('Add document modal not properly initialized');
            }
        });
    }
    
    // Handle search button click
    const searchButton = document.querySelector('.search-button');
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            console.log('Search button clicked');
            if (window.searchModal && typeof window.searchModal.show === 'function') {
                window.searchModal.show();
            } else {
                console.error('Search modal not properly initialized');
            }
        });
    }
    
    console.log('Modals initialized');
}

function openModal(modalType) {
    const modal = document.getElementById(`${modalType}-modal`);
    if (modal) {
        console.log('Opening modal:', modalType);
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        console.error('Modal not found:', modalType);
    }
}

function closeModal(modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Form handlers
 

async function handleSearch(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        console.log('Searching with criteria:', Object.fromEntries(formData));
        showNotification('Búsqueda completada', 'success');
        closeModal(e.target.closest('.modal'));
    } catch (error) {
        showNotification('Error al realizar la búsqueda', 'error');
    }
}

function initializeFileUpload() {
    const dropZone = document.querySelector('.border-dashed');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
}

// File drag and drop handlers
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    e.target.classList.add('border-blue-500', 'bg-blue-50');
}

function unhighlight(e) {
    e.target.classList.remove('border-blue-500', 'bg-blue-50');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    const fileInput = document.getElementById('documentFile');
    if (fileInput) {
        fileInput.files = files;
        showNotification(`Archivo "${files[0].name}" listo para subir`, 'info');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        'bg-blue-500'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Load sidebar
async function loadSidebar() {
    try {
        const response = await fetch('src/components/sidebar.html');
        const html = await response.text();
        document.getElementById('sidebarContainer').innerHTML = html;
        
        // Initialize sidebar functionality
        initializeSidebar();
    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

// Initialize sidebar functionality
function initializeSidebar() {
    const toggleButton = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    const menuItems = document.querySelectorAll('.menu-item');
    
    // Only proceed if we have both the sidebar and toggle button
    if (!sidebar || !toggleButton) {
        console.warn('Sidebar elements not found, skipping initialization');
        return;
    }
    
    // Toggle sidebar
    toggleButton.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const toggleIcon = toggleButton.querySelector('i');
        if (toggleIcon) {
            toggleIcon.classList.toggle('fa-chevron-left');
            toggleIcon.classList.toggle('fa-chevron-right');
        }
    });
    
    // Handle menu item clicks
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all items
            menuItems.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            const page = item.dataset.page;
            const modalType = item.dataset.modal;
            
            if (page) {
                loadPage(page);
            } else if (modalType) {
                console.log(`Trying to open modal: ${modalType}`);
                
                // Handle specific modal types
                if (modalType === 'add-document' && window.addDocumentModal) {
                    window.addDocumentModal.show();
                } else if (modalType === 'search' && window.searchModal) {
                    window.searchModal.show();
                } else {
                    console.error(`Modal ${modalType} not initialized or found`);
                }
            }
        });
    });
}

// Load footer
async function loadFooter() {
    try {
        const response = await fetch('src/components/footer.html');
        const html = await response.text();
        document.getElementById('footerContainer').innerHTML = html;
        
        // Initialize footer functionality
        initializeFooter();
    } catch (error) {
        console.error('Error loading footer:', error);
    }
}

// Initialize footer functionality
function initializeFooter() {
    const footerItems = document.querySelectorAll('#footerContainer .menu-item');
    
    footerItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all items
            footerItems.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            const page = item.dataset.page;
            if (page) {
                loadPage(page);
            }
        });
    });
}

// Función para visualizar el documento en el panel
function previewDocument(documentId) {
    console.log('Preview document:', documentId);
    // Aquí implementaremos la lógica para visualizar el documento en el panel
    // Por ahora solo mostramos un mensaje
    showNotification('Funcionalidad de visualización en desarrollo', 'info');
} 





