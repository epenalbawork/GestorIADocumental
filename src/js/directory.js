// Document viewer module
(function() {
    // Initialize document viewer class
    class DocumentViewer {

        // Añadir esta función a tu clase DocumentViewer

        // 1. Modifica la función verifyAndFixS3Url para reemplazar URLs de S3 con CloudFront
        verifyAndFixS3Url(url) {
            console.log('Verificando URL:', url);
            
            // Verificar si la URL es de S3
            const isS3Url = url.includes('s3.amazonaws.com') || url.includes('amazonaws.com');
            
            if (isS3Url) {
                // Si la URL es de S3, convertir a CloudFront
                try {
                    // Extraer la ruta relativa del objeto
                    let s3Path = '';
                    if (url.includes('.com/')) {
                        s3Path = url.split('.com/')[1];
                    } else if (url.includes('.amazonaws.com/')) {
                        s3Path = url.split('.amazonaws.com/')[1];
                    }
                    
                    // Eliminar 'original/' del inicio si existe
                    if (s3Path.startsWith('original/')) {
                        s3Path = s3Path.substring('original/'.length);
                    }
                    
                    // Si encontramos una ruta, reemplazar con URL de CloudFront
                    if (s3Path) {
                        // Usar tu dominio de CloudFront
                        const cloudfrontDomain = 'd31rk6l704xpk7.cloudfront.net';
                        // Codificar la ruta, pero mantener las barras diagonales (/)
                        const encodedPath = s3Path.split('/').map(segment => encodeURIComponent(segment)).join('/');

                        url = `https://${cloudfrontDomain}/${encodedPath}`;
                        console.log('URL convertida a CloudFront:', url);
                    } else {
                        // Si no podemos extraer la ruta, asegurar que al menos sea HTTPS
                        if (url.startsWith('http://')) {
                            url = url.replace('http://', 'https://');
                            console.log('URL convertida a HTTPS:', url);
                        }
                    }
                } catch (error) {
                    console.error('Error al convertir URL a CloudFront:', error);
                }
            }
            
            return url;
        }

        constructor() {
            try {
                console.log('Initializing DocumentViewer...');
                
                // Get required DOM elements
                this.previewPanel = document.getElementById('previewPanel');
                this.emptyPreview = document.getElementById('emptyPreview');
                this.previewFrame = document.getElementById('previewFrame');
                
                console.log('Elements found:', {
                    previewPanel: !!this.previewPanel,
                    emptyPreview: !!this.emptyPreview,
                    previewFrame: !!this.previewFrame
                });
                
                if (!this.previewPanel) throw new Error('Preview panel element not found');
                if (!this.emptyPreview) throw new Error('Empty preview element not found');
                if (!this.previewFrame) throw new Error('Preview frame element not found');
                
                // Initialize state
                this.currentPdfDoc = null;
                this.currentPage = 1;
                this.numPages = 0;
                this.selectedDocument = null;

                // Bind methods to preserve 'this' context
                this.handleDocumentClick = this.handleDocumentClick.bind(this);
                this.handleNavigation = this.handleNavigation.bind(this);
                this.handleDownload = this.handleDownload.bind(this);
                this.handlePrint = this.handlePrint.bind(this);
                this.handleRefresh = this.handleRefresh.bind(this);
                this.showError = this.showError.bind(this);
                this.loadPdf = this.loadPdf.bind(this);

                // Set up preview controls
                this.setupPreviewControls();

                // Set up mutation observer for document table
                this.setupTableObserver();

                // Initialize directory data
                this.initializeDirectoryData();

                console.log('DocumentViewer initialized successfully');
            } catch (error) {
                console.error('DocumentViewer initialization failed:', error);
                this.showInitializationError(error.message);
            }
        }

        async initializeDirectoryData() {
            try {
                await Promise.all([
                    this.fetchDocumentsAndPopulateTable(),
                    this.loadCategories(),
                    this.loadStatuses()
                ]);
            } catch (error) {
                console.error('Error initializing directory data:', error);
                this.showError('Error al cargar los datos del directorio');
            }
        }

        async fetchDocumentsAndPopulateTable() {
            try {
                // const response = await fetch('https://4d83ign91j.execute-api.us-east-1.amazonaws.com/dev/documents');
                // if (!response.ok) {
                //     throw new Error('Error al cargar los documentos');
                // }
                // const documents = await response.json();

                let documents = [];

                const searchResults = localStorage.getItem('searchResults');
                if (searchResults) {
                    const parsed = JSON.parse(searchResults);
                    console.log('Cargando resultados de búsqueda:', parsed);

                    documents = Array.isArray(parsed) ? parsed : (parsed.body || []);

                    console.log('Documentos encontrados:', documents);
                    localStorage.removeItem('searchResults');
                } else {
                    const response = await fetch('https://4d83ign91j.execute-api.us-east-1.amazonaws.com/dev/documents');
                    if (!response.ok) {
                        throw new Error('Error al cargar los documentos');
                    }
                    documents = await response.json();
                }

                // Ordenar documentos por upload_date DESC (más recientes primero)
                documents.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
                
                // Verificar que la tabla exista
                const table = document.querySelector('#documentsTable');
                if (!table) {
                    console.error('La tabla de documentos no existe');
                    return;
                }

                // Crear el tbody si no existe
                let tableBody = table.querySelector('tbody');
                if (!tableBody) {
                    tableBody = document.createElement('tbody');
                    table.appendChild(tableBody);
                }

                // Limpiar el contenido existente
                tableBody.innerHTML = '';

                documents.forEach(doc => {
                    const row = document.createElement('tr');
                    row.classList.add('document-row', 'hover:bg-gray-50');
                    row.dataset.documentId = doc.id;
                    row.dataset.documentUrl = doc.s3_public_url;
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <i class="fas ${getFileIconClass(doc.type)} text-gray-400 mr-2"></i>
                                <a href="index.html?page=document&id=${doc.id}" class="text-blue-600 hover:text-blue-800">${doc.name}</a>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">${doc.type}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${doc.status}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${new Date(doc.upload_date).toLocaleDateString()}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <button class="preview-btn text-blue-600 hover:text-blue-800" data-doc-id="${doc.id}" title="Vista previa">
                                <i class="fas fa-file-invoice"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });

                // Inicializar DataTables
                if ($.fn.DataTable.isDataTable('#documentsTable')) {
                    $('#documentsTable').DataTable().destroy();
                }
                // $('#documentsTable').DataTable({
                //     language: {
                //         url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json'
                //     }
                // });

                        // Inicializar DataTables
                $('#documentTable').DataTable({
                    destroy: true,
                    pageLength: 25,
                    lengthChange: false,
                    ordering: true,
                    language: {
                        search: "Buscar:",
                        paginate: {
                            previous: "Anterior",
                            next: "Siguiente"
                        },
                        info: "Mostrando _START_ a _END_ de _TOTAL_ documentos",
                        infoEmpty: "No hay documentos disponibles",
                        zeroRecords: "No se encontraron resultados"
                    }
                });

                // Agregar event listener para el botón de preview
                document.querySelectorAll('.preview-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        const docId = e.currentTarget.getAttribute('data-doc-id');
                        const row = e.currentTarget.closest('tr');
                        const docUrl = row.dataset.documentUrl;
                        if (docUrl) {
                            previewDocument(docId, docUrl);
                        } else {
                            showNotification('No se encontró la URL del documento', 'error');
                        }
                    });
                });

            } catch (error) {
                console.error('Error:', error);
                showNotification('Error al cargar los documentos', 'error');
            }
        }

        async loadCategories() {
            try {
                const response = await fetch('https://4d83ign91j.execute-api.us-east-1.amazonaws.com/dev/categories');
                const categories = await response.json();

                const select = document.getElementById('document-category');
                const selectSearch = document.getElementById('searchType');

                if (select) {
                    select.innerHTML = '<option value="">Seleccionar categoría</option>';
                    categories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat.id;
                        option.textContent = cat.name;
                        select.appendChild(option);
                    });
                }

                if (selectSearch) {
                    selectSearch.innerHTML = '<option value="">Seleccionar categoría</option>';
                    categories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat.id;
                        option.textContent = cat.name;
                        selectSearch.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error al cargar categorías:', error);
                this.showError('Error al cargar las categorías');
            }
        }

        async loadStatuses() {
            try {
                const response = await fetch('https://4d83ign91j.execute-api.us-east-1.amazonaws.com/dev/statuses');
                const statuses = await response.json();

                const select = document.getElementById('searchStatus');
                if (select) {
                    select.innerHTML = '<option value="">Seleccionar estado</option>';
                    statuses.forEach(status => {
                        const option = document.createElement('option');
                        option.value = status;
                        option.textContent = status;
                        select.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error al cargar estados:', error);
                this.showError('Error al cargar los estados');
            }
        }

        setupTableObserver() {
            const tableBody = document.querySelector('#documentTable tbody');
            if (!tableBody) {
                console.error('Table body not found');
                return;
            }

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        this.updateDocumentRows();
                    }
                });
            });

            observer.observe(tableBody, {
                childList: true,
                subtree: true
            });
        }

        updateDocumentRows() {
            // Remove existing listeners
            const oldRows = document.querySelectorAll('.document-row');
            oldRows.forEach(row => {
                row.removeEventListener('click', this.handleDocumentClick);
            });

            // Add listeners to new rows
            const newRows = document.querySelectorAll('.document-row');
            newRows.forEach(row => {
                row.addEventListener('click', this.handleDocumentClick);
            });

            console.log(`Updated document rows: ${newRows.length} rows found`);
        }

        setupPreviewControls() {
            // Navigation buttons
            const prevButton = this.previewPanel.querySelector('button[title="Página anterior"]');
            const nextButton = this.previewPanel.querySelector('button[title="Página siguiente"]');
            
            if (prevButton) {
                prevButton.addEventListener('click', () => this.handleNavigation(-1));
                console.log('Previous button listener added');
            }
            
            if (nextButton) {
                nextButton.addEventListener('click', () => this.handleNavigation(1));
                console.log('Next button listener added');
            }

            // Action buttons
            const refreshButton = this.previewPanel.querySelector('button[title="Actualizar"]');
            const downloadButton = this.previewPanel.querySelector('button[title="Descargar"]');
            const printButton = this.previewPanel.querySelector('button[title="Imprimir"]');

            if (refreshButton) {
                refreshButton.addEventListener('click', this.handleRefresh);
                console.log('Refresh button listener added');
            }
            
            if (downloadButton) {
                downloadButton.addEventListener('click', this.handleDownload);
                console.log('Download button listener added');
            }
            
            if (printButton) {
                printButton.addEventListener('click', this.handlePrint);
                console.log('Print button listener added');
            }
        }

        async handleDocumentClick(event) {
            try {
                const row = event.currentTarget;
                console.log('Row clicked:', row);
                
                const documentId = row.dataset.documentId;
                let documentUrl = row.dataset.documentUrl;
                const documentName = row.querySelector('td:first-child').textContent || 'Documento';
                
                if (!documentId || !documentUrl) {
                    throw new Error('Información del documento faltante');
                }
                
                // Convertir URL de S3 a CloudFront
                documentUrl = this.verifyAndFixS3Url(documentUrl);
                
                // Continuar con la lógica original...
                window.location.href = `index.html?page=document&id=${documentId}`;
                
            } catch (error) {
                console.error('Error handling document click:', error);
                this.showError(`Error al cargar el documento: ${error.message}`);
            }
        }

        async loadPdf(url) {
            try {
               
                url = this.verifyAndFixS3Url(url);
                console.log('Loading PDF:', url);
              
                // Show loading state first
                this.showLoading('Iniciando carga del PDF...');
        
                // Intenta cargar el PDF directamente sin verificación previa
                try {
                    // Configure PDF.js
                    const loadingTask = pdfjsLib.getDocument({
                        url: url,
                        withCredentials: true,
                        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                        cMapPacked: true,
                        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
                    });
        
                    // Show loading progress
                    loadingTask.onProgress = (progress) => {
                        if (progress.total > 0) {
                            const percentage = Math.round((progress.loaded / progress.total) * 100);
                            this.showLoading(`Cargando PDF... ${percentage}%`);
                        }
                    };
                    
                    // Load the PDF document
                    const pdf = await loadingTask.promise;
                    console.log('PDF loaded, pages:', pdf.numPages);
                    
                    // Store PDF information
                    this.currentPdfDoc = pdf;
                    this.numPages = pdf.numPages;
        
                    // Prepare the preview frame
                    this.previewFrame.classList.remove('hidden');
                    this.emptyPreview.style.display = 'none';
                    
                    // Create container for the PDF viewer
                    const container = document.createElement('div');
                    container.className = 'pdf-container';
                    container.style.cssText = `
                        width: 100%;
                        height: 100%;
                        overflow-y: auto;
                        padding: 20px;
                        background: #f3f4f6;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 20px;
                    `;
                    
                    // Clear and update preview frame
                    this.previewFrame.innerHTML = '';
                    this.previewFrame.appendChild(container);
        
                    // Hide pagination controls
                    const paginationControls = this.previewPanel.querySelector('.px-4.py-2.border-b');
                    if (paginationControls) {
                        paginationControls.style.display = 'none';
                    }
                    
                    // Render all pages
                    for (let i = 1; i <= this.numPages; i++) {
                        await this.renderPage(i, container);
                    }
        
                    // Store document info for other actions
                    this.selectedDocument = {
                        url: url,
                        type: 'pdf',
                        numPages: this.numPages
                    };
                    
                } catch (error) {
                    console.error('Error cargando PDF directamente, intentando con iframe:', error);
                    
                    // Si hay error al cargar con PDF.js, intentamos con iframe como fallback
                    this.showPdfInIframe(url);
                }
                
            } catch (error) {
                console.error('Error loading PDF:', error);
                
                // Show more specific error messages
                let errorMessage = 'Error al cargar el PDF. ';
                if (error.name === 'MissingPDFException') {
                    errorMessage += 'No se pudo encontrar el archivo PDF.';
                } else if (error.name === 'UnexpectedResponseException') {
                    errorMessage += 'El servidor no respondió correctamente.';
                } else if (error.message.includes('CORS')) {
                    errorMessage += 'Error de acceso al archivo. El servidor no permite la descarga directa.';
                } else if (error.message.includes('Failed to fetch')) {
                    errorMessage += 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
                } else {
                    errorMessage += `${error.message}. Por favor, intente nuevamente.`;
                }
                
                this.showError(errorMessage);
            }
        }

        showPdfInIframe(url) {
            // 🔥 IMPORTANTE: Limpiar el previewFrame antes
            this.previewFrame.innerHTML = '';
    
            // Preparar el frame
            this.previewFrame.classList.remove('hidden');
            this.emptyPreview.style.display = 'none';
            
            // Mostrar mensaje informativo
           
            
            // Probar con Google Docs Viewer
            const googlePdfViewer = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
            
            // Crear iframe
            const iframe = document.createElement('iframe');
            iframe.style.cssText = `
                width: 100%;
                height: calc(100% - 60px);
                border: none;
                margin-top: 10px;
            `;
            
            // Usar Google Viewer directamente (más confiable)
            iframe.src = googlePdfViewer;
            this.previewFrame.appendChild(iframe);
            
            // Guardar información del documento
            this.selectedDocument = {
                url: url,
                type: 'pdf'
            };
        }

        async renderPage(pageNumber, container) {
            try {
                if (!this.currentPdfDoc) {
                    throw new Error('No PDF document loaded');
                }

                const page = await this.currentPdfDoc.getPage(pageNumber);
                
                // Create page container
                const pageContainer = document.createElement('div');
                pageContainer.className = 'pdf-page';
                pageContainer.style.cssText = `
                    background: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    margin: 0 auto;
                    position: relative;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                `;
                
                // Add hover effect
                pageContainer.addEventListener('mouseenter', () => {
                    pageContainer.style.transform = 'scale(1.02)';
                });
                
                pageContainer.addEventListener('mouseleave', () => {
                    pageContainer.style.transform = 'scale(1)';
                });
                
                // Add click handler for fullscreen
                pageContainer.addEventListener('click', () => {
                    this.toggleFullscreen(pageContainer);
                });
                
                // Create canvas for this page
                const canvas = document.createElement('canvas');
                canvas.style.cssText = `
                    display: block;
                    width: 100%;
                    height: 100%;
                `;
                
                // Calculate scale to fit the container width
                const containerWidth = container.clientWidth - 40; // 40px for padding
                const viewport = page.getViewport({ scale: 1.0 });
                const scale = containerWidth / viewport.width;
                const scaledViewport = page.getViewport({ scale });
                
                // Set canvas size
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;
                pageContainer.style.width = `${scaledViewport.width}px`;
                pageContainer.style.height = `${scaledViewport.height}px`;
                
                // Add page number indicator
                const pageNumberElement = document.createElement('div');
                pageNumberElement.className = 'page-number';
                pageNumberElement.style.cssText = `
                    position: absolute;
                    bottom: -25px;
                    left: 0;
                    right: 0;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                `;
                pageNumberElement.textContent = `Página ${pageNumber}`;
                
                // Get rendering context
                const context = canvas.getContext('2d', { alpha: false });
                context.fillStyle = 'white';
                context.fillRect(0, 0, canvas.width, canvas.height);
                
                // Render the page
                const renderContext = {
                    canvasContext: context,
                    viewport: scaledViewport,
                    enableWebGL: true
                };
                
                await page.render(renderContext).promise;
                
                // Add elements to page container
                pageContainer.appendChild(canvas);
                pageContainer.appendChild(pageNumberElement);
                
                // Add page container to main container
                container.appendChild(pageContainer);
                
                console.log(`Page ${pageNumber} rendered successfully`);
            } catch (error) {
                console.error('Error rendering page:', error);
                this.showError(`Error al renderizar la página ${pageNumber}`);
            }
        }

        toggleFullscreen(element) {
            if (!document.fullscreenElement) {
                // Create fullscreen container
                const fullscreenContainer = document.createElement('div');
                fullscreenContainer.className = 'pdf-fullscreen';
                fullscreenContainer.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.9);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    padding: 20px;
                `;
                
                // Create close button
                const closeButton = document.createElement('button');
                closeButton.className = 'close-button';
                closeButton.style.cssText = `
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    font-size: 20px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.2s;
                `;
                closeButton.innerHTML = '<i class="fas fa-times"></i>';
                closeButton.addEventListener('click', () => {
                    document.body.removeChild(fullscreenContainer);
                });
                
                // Create content container
                const contentContainer = document.createElement('div');
                contentContainer.style.cssText = `
                    max-width: 95vw;
                    max-height: 95vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow: auto;
                    background: white;
                    padding: 20px;
                    border-radius: 4px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                `;
                
                // Get the page number from the original element
                const pageNumber = parseInt(element.querySelector('.page-number').textContent.replace('Página ', ''));
                
                // Create new canvas for fullscreen
                const canvas = document.createElement('canvas');
                canvas.style.cssText = `
                    display: block;
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                `;
                
                // Create page container
                const pageContainer = document.createElement('div');
                pageContainer.className = 'pdf-page-fullscreen';
                pageContainer.style.cssText = `
                    background: white;
                    margin: 0 auto;
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                `;
                
                // Add elements to containers
                pageContainer.appendChild(canvas);
                contentContainer.appendChild(pageContainer);
                fullscreenContainer.appendChild(contentContainer);
                fullscreenContainer.appendChild(closeButton);
                
                // Add to body
                document.body.appendChild(fullscreenContainer);
                
                // Render the page in fullscreen after container is added to DOM
                setTimeout(async () => {
                    try {
                        const page = await this.currentPdfDoc.getPage(pageNumber);
                        
                        // Calculate scale to fit the container width with better proportions
                        const containerWidth = contentContainer.clientWidth - 40;
                        const viewport = page.getViewport({ scale: 1.0 });
                        
                        // Use a slightly larger scale factor
                        const scale = Math.min(
                            (containerWidth / viewport.width) * 1.8, // 1.8x scale for better quality
                            2.5 // Maximum scale to prevent excessive size
                        );
                        
                        const scaledViewport = page.getViewport({ scale });
                        
                        // Set canvas size with better proportions
                        canvas.width = scaledViewport.width;
                        canvas.height = scaledViewport.height;
                        
                        // Adjust container size to match canvas while maintaining aspect ratio
                        const aspectRatio = viewport.height / viewport.width;
                        const maxHeight = contentContainer.clientHeight - 40;
                        const calculatedHeight = scaledViewport.width * aspectRatio;
                        
                        if (calculatedHeight > maxHeight) {
                            const newScale = maxHeight / (viewport.height * scale);
                            const adjustedViewport = page.getViewport({ scale: scale * newScale });
                            canvas.width = adjustedViewport.width;
                            canvas.height = adjustedViewport.height;
                            pageContainer.style.width = `${adjustedViewport.width}px`;
                            pageContainer.style.height = `${adjustedViewport.height}px`;
                        } else {
                            pageContainer.style.width = `${scaledViewport.width}px`;
                            pageContainer.style.height = `${scaledViewport.height}px`;
                        }
                        
                        // Get rendering context with better quality settings
                        const context = canvas.getContext('2d', { 
                            alpha: false,
                            imageSmoothingEnabled: true,
                            imageSmoothingQuality: 'high'
                        });
                        
                        // Clear and prepare canvas
                        context.fillStyle = 'white';
                        context.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Render the page with high quality
                        const renderContext = {
                            canvasContext: context,
                            viewport: scaledViewport,
                            enableWebGL: true,
                            renderInteractiveForms: true
                        };
                        
                        await page.render(renderContext).promise;
                        
                        // Add page number indicator
                        const pageNumberElement = document.createElement('div');
                        pageNumberElement.className = 'page-number';
                        pageNumberElement.style.cssText = `
                            position: absolute;
                            bottom: -25px;
                            left: 0;
                            right: 0;
                            text-align: center;
                            color: #666;
                            font-size: 12px;
                        `;
                        pageNumberElement.textContent = `Página ${pageNumber}`;
                        pageContainer.appendChild(pageNumberElement);
                        
                        console.log('PDF page rendered in fullscreen mode with adjusted size');
                    } catch (error) {
                        console.error('Error rendering page in fullscreen:', error);
                        this.showError('Error al mostrar la página en pantalla completa');
                    }
                }, 0);
                
                // Add escape key handler
                const handleEscape = (event) => {
                    if (event.key === 'Escape') {
                        document.body.removeChild(fullscreenContainer);
                        document.removeEventListener('keydown', handleEscape);
                    }
                };
                
                document.addEventListener('keydown', handleEscape);
            }
        }

        showLoading(message = 'Cargando documento...') {
            const loadingHtml = `
                <div class="flex items-center justify-center h-full">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p class="text-gray-600">${message}</p>
                    </div>
                </div>
            `;
            this.previewFrame.srcdoc = loadingHtml;
        }

        async handleNavigation(delta) {
            const newPage = this.currentPage + delta;
            if (newPage >= 1 && newPage <= this.numPages) {
                this.currentPage = newPage;
                await this.renderPage(this.currentPage);
            }
        }

        handleDownload() {
            if (!this.selectedDocument) return;
            
            const link = document.createElement('a');
            link.href = this.selectedDocument.url;
            link.download = this.selectedDocument.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        handlePrint() {
            if (this.currentPdfDoc) {
                this.previewFrame.contentWindow.print();
            }
        }

        async handleRefresh() {
            if (this.selectedDocument) {
                await this.loadPdf(this.selectedDocument.url);
            }
        }

        showUnsupportedFormat() {
            this.previewFrame.contentDocument.body.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <div style="margin-bottom: 1rem;">
                        <i class="fas fa-exclamation-circle text-yellow-500 text-4xl"></i>
                    </div>
                    <h3 style="font-size: 1.25rem; font-weight: 500; margin-bottom: 0.5rem;">
                        Formato no soportado
                    </h3>
                    <p style="color: #666;">
                        La vista previa no está disponible para documentos ${this.selectedDocument.type.toUpperCase()}.
                        <br>
                        Por favor, use el botón de descarga para ver el documento.
                    </p>
                </div>
            `;
        }

        showError(message) {
            console.error('Error:', message);
            const errorHtml = `
                <div class="flex items-center justify-center h-full">
                    <div class="text-center text-red-500">
                        <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
                        <p>${message}</p>
                    </div>
                </div>
            `;
            this.previewFrame.srcdoc = errorHtml;
        }

        showInitializationError(message) {
            console.error('Initialization Error:', message);
            const errorElement = document.createElement('div');
            errorElement.className = 'text-red-500 p-4 text-center';
            errorElement.innerHTML = `
                <i class="fas fa-exclamation-circle text-4xl mb-4 block"></i>
                <p>Error de inicialización: ${message}</p>
            `;
            
            if (this.previewPanel) {
                this.previewPanel.innerHTML = '';
                this.previewPanel.appendChild(errorElement);
            } else {
                const mainContent = document.querySelector('main');
                if (mainContent) {
                    mainContent.appendChild(errorElement);
                }
            }
        }
    }

    // Initialize viewer when DOM is ready
    function initializeViewer() {
        console.log('Attempting to initialize viewer...');
        
        // Function to check if elements are available
        const checkElements = () => {
            const panel = document.getElementById('previewPanel');
            const emptyPreview = document.getElementById('emptyPreview');
            const previewFrame = document.getElementById('previewFrame');
            
            console.log('Checking elements:', {
                previewPanel: !!panel,
                emptyPreview: !!emptyPreview,
                previewFrame: !!previewFrame
            });
            
            return panel && emptyPreview && previewFrame;
        };

        // If elements are already available, initialize immediately
        if (checkElements()) {
            console.log('Elements found, initializing viewer...');
            window.documentViewer = new DocumentViewer();
            return;
        }

        // If elements are not available, wait and try again
        console.log('Elements not found, setting up observer...');
        const observer = new MutationObserver((mutations, obs) => {
            if (checkElements()) {
                console.log('Elements found after content load, initializing viewer...');
                obs.disconnect();
                window.documentViewer = new DocumentViewer();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Start initialization process
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeViewer);
    } else {
        initializeViewer();
    }

    // Función para visualizar el documento en el panel
    function previewDocument(documentId, documentUrl) {
        console.log('Preview document:', documentId, documentUrl);
    
        // Convertir URL de S3 a CloudFront si es necesario
        if (documentUrl.includes('s3.amazonaws.com') || documentUrl.includes('amazonaws.com')) {
            try {
                // Extraer la ruta relativa del objeto
                let s3Path = '';
                if (documentUrl.includes('.com/')) {
                    s3Path = documentUrl.split('.com/')[1];
                }
                
                // Eliminar 'original/' del inicio si existe
                if (s3Path.startsWith('original/')) {
                    s3Path = s3Path.substring('original/'.length);
                }
                
                // Si encontramos una ruta, reemplazar con URL de CloudFront
                if (s3Path) {
                    const cloudfrontDomain = 'd31rk6l704xpk7.cloudfront.net';
                    documentUrl = `https://${cloudfrontDomain}/${s3Path}`;
                    console.log('URL convertida a CloudFront para preview:', documentUrl);
                }
            } catch (error) {
                console.error('Error al convertir URL a CloudFront para preview:', error);
            }
        }
        
        // Obtener el tipo de archivo de la URL
        const fileExtension = documentUrl.split('.').pop().toLowerCase();
        
        // Cargar el documento en el panel de vista previa
        if (window.documentViewer) {
            if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
                // Si es una imagen, mostrarla directamente
                const previewFrame = document.getElementById('previewFrame');
                if (previewFrame) {
                    previewFrame.innerHTML = `
                        <div class="flex items-center justify-center h-full">
                            <img src="${documentUrl}" 
                                 alt="Vista previa del documento" 
                                 class="max-w-full max-h-full object-contain"
                                 style="max-height: 900px;">
                        </div>
                    `;
                }
            } else if (fileExtension === 'pdf') {
                // Si es PDF, usar el visor de PDF existente
                window.documentViewer.loadPdf(documentUrl);
            } else {
                // Para otros tipos de archivo, mostrar un mensaje
                const previewFrame = document.getElementById('previewFrame');
                if (previewFrame) {
                    previewFrame.innerHTML = `
                        <div class="text-center p-4">
                            <i class="fas fa-file-alt text-4xl text-gray-400 mb-2"></i>
                            <p class="text-gray-500">Vista previa no disponible para este tipo de archivo</p>
                            <p class="text-sm text-gray-400 mt-2">Tipo de archivo: ${fileExtension}</p>
                        </div>
                    `;
                }
            }
        } else {
            console.log('DocumentViewer no disponible para preview');
            showNotification('Vista previa no disponible en este momento', 'warning');
        }
    }

    // Función auxiliar para obtener el ícono según el tipo de archivo
    function getFileIconClass(type) {
        const ext = type?.split("/")[1] || "file";
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
})();
