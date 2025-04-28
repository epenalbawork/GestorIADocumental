// Función auxiliar para convertir URLs de S3 a CloudFront
function convertS3UrlToCloudFront(url) {
    if (!url) return url;
    
    // Verificar si la URL es de S3
    const isS3Url = url.includes('s3.amazonaws.com') || url.includes('amazonaws.com');
    
    if (isS3Url) {
        try {
            // Extraer la ruta relativa del objeto
            let s3Path = '';
            if (url.includes('.com/')) {
                s3Path = url.split('.com/')[1];
            } else if (url.includes('.amazonaws.com/')) {
                s3Path = url.split('.amazonaws.com/')[1];
            }
            
            // Eliminar 'original/' del inicio si existe
            if (s3Path && s3Path.startsWith('original/')) {
                s3Path = s3Path.substring('original/'.length);
            }
            
            // Si encontramos una ruta, reemplazar con URL de CloudFront
            if (s3Path) {
                const cloudfrontDomain = 'd31rk6l704xpk7.cloudfront.net';
                
                // Codificar la ruta, pero mantener las barras diagonales (/)
                const encodedPath = s3Path.split('/').map(segment => encodeURIComponent(segment)).join('/');
                
                const newUrl = `https://${cloudfrontDomain}/${encodedPath}`;
                console.log('URL convertida a CloudFront:', newUrl);
                return newUrl;
            }
        } catch (error) {
            console.error('Error al convertir URL a CloudFront:', error);
        }
    }
    
    return url; // Devolver la URL original si no se pudo convertir
}
// Función para inicializar la página de documento
function initializeDocumentPage() {
    console.log('Initializing document page...');
    // Get document ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const documentId = urlParams.get('id');

    if (!documentId) {
        showError('No se proporcionó un ID de documento');
        return;
    }

    console.log('Loading document with ID:', documentId);
    // Load document data
    loadDocumentData(documentId);
}

async function loadDocumentData(documentId) {
    try {
        console.log('Fetching document data for ID:', documentId);
        const response = await fetch(`https://4d83ign91j.execute-api.us-east-1.amazonaws.com/dev/documents/${documentId}`);
        
        if (!response.ok) {
            console.error('Error response:', response.status, response.statusText);
            throw new Error(`Error al cargar el documento: ${response.status} ${response.statusText}`);
        }

        const docData = await response.json();
        console.log('Document data received:', docData);
        
        if (!docData) {
            throw new Error('No se recibieron datos del documento');
        }

        updateDocumentUI(docData);
    } catch (error) {
        console.error('Error loading document:', error);
        showError(`Error al cargar los datos del documento: ${error.message}`);
    }
}

function updateDocumentUI(docData) {
    try {
        console.log('Updating UI with document:', docData);
        
        // Función auxiliar para actualizar un elemento de forma segura
        function updateElement(id, value, defaultValue = '') {
            const element = window.document.getElementById(id);
            if (element) {
                element.textContent = value || defaultValue;
            } else {
                console.warn(`Element not found: ${id}`);
            }
        }

        // Actualizar elementos básicos
        updateElement('document-title', docData.name, 'Sin título');
        updateElement('document-status', docData.status, 'Sin estado');
        updateElement('document-type', docData.type, 'Sin tipo');
        updateElement('document-upload-date', docData.upload_date ? new Date(docData.upload_date).toLocaleString() : null, 'Sin fecha de subida');
        updateElement('document-updated-date', docData.updated_at ? new Date(docData.updated_at).toLocaleString() : null, 'Sin fecha de actualización');
        updateElement('document-description', docData.description, 'Sin descripción');

        // Update document preview
        const previewContainer = window.document.getElementById('document-preview');
        if (previewContainer) {
            updateDocumentPreview(docData);
        } else {
            console.warn('Preview container not found');
        }

        // Update tags
        const tagsContainer = window.document.getElementById('document-tags');
        if (tagsContainer && docData.tags) {
            updateTags(docData.tags);
        }

        // Update entities
        const entitiesContainer = window.document.getElementById('document-entities');
        if (entitiesContainer && docData.entities_json) {
            updateEntities(docData.entities_json);
        }

        // Set up download button
        if (docData.s3_public_url) {
            setupDownloadButton(docData.s3_public_url);
        }

        console.log('UI updated successfully');
    } catch (error) {
        console.error('Error updating UI:', error);
        showError(`Error al actualizar la interfaz: ${error.message}`);
    }
}

function updateDocumentPreview(docData) {
    const previewContainer = window.document.getElementById('document-preview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    // Convertir la URL de S3 a CloudFront
    let documentUrl = convertS3UrlToCloudFront(docData.s3_public_url);

    if (docData.type && (docData.type.includes('pdf') || docData.type.includes('application/pdf'))) {
        // Crear un mensaje informativo
        

        // Usar Google Docs Viewer para mostrar el PDF
        const googlePdfViewer = `https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`;
        
        // Crear iframe para mostrar el PDF
        const iframe = window.document.createElement('iframe');
        iframe.className = 'w-full h-full border-0';
          // Para dejar espacio para el mensaje
        
        // Usar Google Docs Viewer como método principal
        iframe.src = googlePdfViewer;
        
        // Agregar evento de carga para mostrar mensaje si falla
        iframe.onload = () => {
            console.log('Iframe cargado correctamente');
        };
        
        iframe.onerror = () => {
            console.error('Error al cargar el iframe');
            previewContainer.innerHTML = `
                <div class="text-center py-10">
                    <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
                    <p class="text-gray-700">No se pudo cargar la vista previa del documento.</p>
                    <a href="${documentUrl}" target="_blank" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Abrir documento en nueva pestaña
                    </a>
                </div>
            `;
        };
        
        previewContainer.appendChild(iframe);
    } else {
        // Mostrar mensaje para formatos no soportados
        previewContainer.innerHTML = `
            <div class="text-center py-10">
                <i class="fas fa-file-alt text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-600">Formato no soportado para vista previa</p>
                <a href="${documentUrl}" target="_blank" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Abrir documento
                </a>
            </div>
        `;
    }
}
function updateTags(tags) {
    const tagsContainer = window.document.getElementById('document-tags');
    if (!tagsContainer) return;

    tagsContainer.innerHTML = '';

    tags.forEach(tag => {
        const tagElement = window.document.createElement('span');
        tagElement.className = 'px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm';
        tagElement.textContent = tag.name;
        tagsContainer.appendChild(tagElement);
    });
}

function updateEntities(entities) {
    const entitiesContainer = window.document.getElementById('document-entities');
    if (!entitiesContainer) return;

    entitiesContainer.innerHTML = '';

    // Group entities by type
    const groupedEntities = entities.reduce((acc, entity) => {
        if (!acc[entity.Type]) {
            acc[entity.Type] = [];
        }
        acc[entity.Type].push(entity);
        return acc;
    }, {});

    // Create sections for each entity type
    Object.entries(groupedEntities).forEach(([type, entities]) => {
        const section = window.document.createElement('div');
        section.className = 'mb-4';
        
        const typeHeader = window.document.createElement('h3');
        typeHeader.className = 'text-sm font-medium text-gray-700 mb-2';
        typeHeader.textContent = type;
        
        const entitiesList = window.document.createElement('div');
        entitiesList.className = 'flex flex-wrap gap-2';
        
        entities.forEach(entity => {
            const entityElement = window.document.createElement('span');
            entityElement.className = 'px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm';
            entityElement.textContent = entity.Text;
            entitiesList.appendChild(entityElement);
        });
        
        section.appendChild(typeHeader);
        section.appendChild(entitiesList);
        entitiesContainer.appendChild(section);
    });
}

function setupDownloadButton(url) {
    // Convertir URL antes de asignarla al botón de descarga
    const cloudFrontUrl = convertS3UrlToCloudFront(url);
    
    const downloadButton = window.document.querySelector('button:has(i.fa-download)');
    if (downloadButton) {
        downloadButton.addEventListener('click', () => {
            window.open(cloudFrontUrl, '_blank');
        });
    }
}

function showError(message) {
    console.error('Showing error:', message);
    const contentDiv = window.document.getElementById('content');
    if (contentDiv) {
        contentDiv.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
                    <h2 class="text-xl font-semibold text-gray-900 mb-2">Error</h2>
                    <p class="text-gray-600">${message}</p>
                    <button onclick="window.history.back()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Volver
                    </button>
                </div>
            </div>
        `;
    } else {
        console.error('Content div not found');
    }
}

// Función para visualizar el documento en el panel
function previewDocument(documentId, documentUrl) {
    console.log('Preview document:', documentId, documentUrl);
    
    // Convertir URL de S3 a CloudFront
    const cloudFrontUrl = convertS3UrlToCloudFront(documentUrl);
    
    // Cargar el documento en el panel de vista previa
    if (window.documentViewer) {
        window.documentViewer.loadPdf(cloudFrontUrl);
    } else {
        console.log('DocumentViewer no disponible para preview');
        showNotification('Vista previa no disponible en este momento', 'warning');
    }
}

// Función para cargar los detalles del documento
async function loadDocumentDetails(documentId) {
    try {
        const response = await fetch(`https://4d83ign91j.execute-api.us-east-1.amazonaws.com/dev/documents/${documentId}`);
        if (!response.ok) {
            throw new Error('Error al cargar los detalles del documento');
        }
        const document = await response.json();
        
        // Actualizar la información del documento
        document.getElementById('documentName').textContent = document.name;
        document.getElementById('documentType').textContent = document.type;
        document.getElementById('documentStatus').textContent = document.status;
        document.getElementById('documentUploadDate').textContent = new Date(document.upload_date).toLocaleDateString();
        document.getElementById('documentDescription').textContent = document.description || 'Sin descripción';
        
        // Si hay una URL del documento, cargar la vista previa
        if (document.s3_public_url) {
            previewDocument(documentId, document.s3_public_url);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cargar los detalles del documento', 'error');
    }
}

// Cargar los detalles del documento cuando la página esté lista
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const documentId = urlParams.get('id');
    if (documentId) {
        loadDocumentDetails(documentId);
    }
});

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDocumentPage);
} else {
    initializeDocumentPage();
} 