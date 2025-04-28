// Check if AddDocumentModal is already defined
if (typeof window.AddDocumentModal === 'undefined') {
    class AddDocumentModal {
        constructor() {
            this.initialize();
            this.uploadAttempts = 0;
            this.maxUploadAttempts = 3;
        }

        initialize() {
            this.modal = document.getElementById('add-document-modal');
            if (!this.modal) {
                console.error('Add document modal element not found');
                return;
            }

            this.form = this.modal.querySelector('#add-document-form');
            this.closeButton = this.modal.querySelector('button[aria-label="Cerrar"]');
            this.cancelButton = this.modal.querySelector('button:has(i.fa-times)');
            this.uploadButton = this.modal.querySelector('button:has(i.fa-upload)');
            this.fileInput = this.modal.querySelector('#file-upload');
            this.fileDropArea = this.modal.querySelector('#file-drop-area');
            this.titleInput = this.modal.querySelector('#document-title');
         
            this.descriptionInput = this.modal.querySelector('#document-description');
         

            if (!this.form || !this.closeButton || !this.cancelButton || !this.uploadButton || 
                !this.fileInput || !this.fileDropArea || !this.titleInput || 
                !this.descriptionInput  ) {
                console.error('One or more modal elements not found');
                return;
            }

            this.initializeEventListeners();
            this.initializeCharacterCounters();
            console.log('AddDocumentModal initialized');
        }

        initializeCharacterCounters() {
            // Title character counter
            const titleCounter = document.createElement('div');
            titleCounter.className = 'text-xs text-gray-500 mt-1 text-right';
            titleCounter.id = 'title-counter';
            this.titleInput.parentNode.appendChild(titleCounter);
            this.updateTitleCounter();

            // Description character counter
            const descCounter = document.createElement('div');
            descCounter.className = 'text-xs text-gray-500 mt-1 text-right';
            descCounter.id = 'description-counter';
            this.descriptionInput.parentNode.appendChild(descCounter);
            this.updateDescriptionCounter();
        }

        updateTitleCounter() {
            const counter = document.getElementById('title-counter');
            const currentLength = this.titleInput.value.length;
            const maxLength = 100;
            counter.textContent = `${currentLength}/${maxLength} caracteres`;
            counter.classList.toggle('text-red-500', currentLength > maxLength);
        }

        updateDescriptionCounter() {
            const counter = document.getElementById('description-counter');
            const currentLength = this.descriptionInput.value.length;
            const maxLength = 500;
            counter.textContent = `${currentLength}/${maxLength} caracteres`;
            counter.classList.toggle('text-red-500', currentLength > maxLength);
        }

        initializeEventListeners() {
            // Close modal when clicking the close button
            this.closeButton.addEventListener('click', () => this.hide());

            // Close modal when clicking outside
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });

            // Handle form submission
            this.uploadButton.addEventListener('click', () => {
                if (this.validateForm()) {
                    this.handleUpload();
                }
            });

            // Cancel button
            this.cancelButton.addEventListener('click', () => {
                this.hide();
            });

            // File input change
            this.fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });

            // Input validation
            this.titleInput.addEventListener('input', () => {
                this.validateTitle();
                this.updateTitleCounter();
            });

            this.descriptionInput.addEventListener('input', () => {
                this.validateDescription();
                this.updateDescriptionCounter();
            });

       
            // Drag and drop events
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                this.fileDropArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                this.fileDropArea.addEventListener(eventName, () => {
                    this.fileDropArea.classList.add('border-blue-500', 'bg-blue-50');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                this.fileDropArea.addEventListener(eventName, () => {
                    this.fileDropArea.classList.remove('border-blue-500', 'bg-blue-50');
                });
            });

            this.fileDropArea.addEventListener('drop', (e) => {
                this.fileInput.files = e.dataTransfer.files;
                this.handleFileSelect(e);
            });
        }

        validateForm() {
            const isTitleValid = this.validateTitle();
         
            const isFileValid = this.validateFile();
            const isDescriptionValid = this.validateDescription();
          

            return isTitleValid &&   isFileValid && isDescriptionValid ;
        }

        validateTitle() {
            const title = this.titleInput.value.trim();
            const isValid = title.length >= 3 && title.length <= 100;
            const hasSpecialChars = /[<>{}[\]\\^~]/.test(title);
            
            this.titleInput.classList.toggle('border-red-500', !isValid || hasSpecialChars);
            this.titleInput.classList.toggle('focus:ring-red-500', !isValid || hasSpecialChars);
            
            if (!isValid) {
                this.showNotification('El título debe tener entre 3 y 100 caracteres', 'error');
                return false;
            }
            
            if (hasSpecialChars) {
                this.showNotification('El título no puede contener caracteres especiales', 'error');
                return false;
            }
            
            return true;
        }

        validateDescription() {
            const description = this.descriptionInput.value.trim();
            const isValid = description.length <= 500;
            
            this.descriptionInput.classList.toggle('border-red-500', !isValid);
            this.descriptionInput.classList.toggle('focus:ring-red-500', !isValid);
            
            if (!isValid) {
                this.showNotification('La descripción no puede exceder los 500 caracteres', 'error');
            }
            
            return isValid;
        }
 
        validateFile() {
            const file = this.fileInput.files[0];
            if (!file) {
                this.showNotification('Por favor selecciona un archivo', 'error');
                return false;
            }

            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                this.showNotification('El archivo excede el tamaño máximo de 10MB', 'error');
                return false;
            }

            const validTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!validTypes.includes(fileExtension)) {
                this.showNotification('Tipo de archivo no permitido', 'error');
                return false;
            }

            return true;
        }

        show() {
            if (!this.modal) {
                this.initialize();
            }
            this.modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            this.titleInput.focus();
        }

        hide() {
            if (!this.modal) {
                this.initialize();
            }
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
            this.form.reset();
            this.clearFileInfo();
            this.uploadAttempts = 0;
        }

        clearFileInfo() {
            const fileInfo = this.fileDropArea.querySelector('.file-info');
            if (fileInfo) {
                fileInfo.remove();
            }
            const preview = this.fileDropArea.querySelector('.file-preview');
            if (preview) {
                preview.remove();
            }
        }

        async handleFileSelect(event) {
            const files = event.target.files || event.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                
                if (!this.validateFile()) {
                    return;
                }

                // Update UI to show selected file
                this.clearFileInfo();
                const fileInfo = document.createElement('div');
                fileInfo.className = 'file-info mt-2 text-sm text-gray-600';
                fileInfo.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <i class="fas fa-file-alt mr-2"></i>
                            <span>${file.name}</span>
                        </div>
                        <span class="text-xs text-gray-500">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                `;
                this.fileDropArea.appendChild(fileInfo);

                // Show preview for PDF files
                if (file.name.toLowerCase().endsWith('.pdf')) {
                    await this.showPdfPreview(file);
                }
            }
        }

        async showPdfPreview(file) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({scale: 0.5});
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                const preview = document.createElement('div');
                preview.className = 'file-preview mt-4 border rounded-lg overflow-hidden';
                preview.appendChild(canvas);
                this.fileDropArea.appendChild(preview);
            } catch (error) {
                console.error('Error generating PDF preview:', error);
            }
        }

        setLoading(isLoading) {
            this.uploadButton.disabled = isLoading;
            this.uploadButton.innerHTML = isLoading ? 
                '<i class="fas fa-spinner fa-spin mr-2"></i>Subiendo...' : 
                '<i class="fas fa-upload mr-2"></i>Subir Documento';
            
            // Disable other inputs during upload
            const inputs = this.modal.querySelectorAll('input, select, textarea, button');
            inputs.forEach(input => {
                if (input !== this.uploadButton) {
                    input.disabled = isLoading;
                }
            });
        }

        async handleUpload() {
            if (!this.validateForm()) {
                return;
            }
        
            const formData = new FormData(this.form);
            this.setLoading(true);
            this.uploadAttempts = 0;
        
            try {
                await this.attemptUpload(formData);
            } catch (error) {
                console.error('Error uploading file:', error);
                this.showNotification('Error al subir el documento: ' + error.message, 'error');
            } finally {
                this.setLoading(false);
            }
        }

        async attemptUpload(formData) {
            // debugger;
            this.uploadAttempts++;
            this.showNotification(`Subiendo documento... (Intento ${this.uploadAttempts}/${this.maxUploadAttempts})`, 'info');
        
            const file = this.fileInput.files[0];
            const documentTitle = this.titleInput.value.trim();
            const documentDescription = this.descriptionInput.value.trim();
        
            const apiFormData = new FormData();
            apiFormData.append('file', file);
            apiFormData.append('documentTitle', documentTitle);
            apiFormData.append('documentDescription', documentDescription);
        
            console.log('Enviando datos a la API:', {
                fileName: file.name,
                fileSize: file.size,
                documentTitle,
                documentDescription
            });
        
            try {
                const progressBar = document.getElementById('upload-progress');
                if (progressBar) {
                    let width = 0;
                    const interval = setInterval(() => {
                        width += Math.random() * 10;
                        if (width >= 90) clearInterval(interval);
                        progressBar.style.width = `${Math.min(width, 90)}%`;
                    }, 300);
                }
        
                const response = await fetch('https://fn4563j0jk.execute-api.us-east-1.amazonaws.com/Dev/upload-document', {
                    method: 'POST',
                    body: apiFormData,
                    headers: {
                        'Accept': 'application/json',
                    },
                    mode: 'cors'
                });
        
                console.log('--- FETCH STATUS ---');
                console.log('status:', response.status);
                console.log('ok:', response.ok);
                console.log('statusText:', response.statusText);
        
                // Aquí tomamos decisiones
                if (response.status === 202) {
                    console.log('Documento recibido y en procesamiento.');
                    if (progressBar) progressBar.style.width = '100%';
                    this.showNotification('Documento recibido correctamente. Procesándose en segundo plano.', 'success');
                    this.hide();
                    window.location.reload();
                    return;
                }
        
                if (!response.ok) {
                    const responseBody = await response.json().catch(() => ({}));
                    console.error('Respuesta error no-202:', responseBody);
                    throw new Error(responseBody.message || `Error del servidor: ${response.status} ${response.statusText}`);
                }
        
                const responseBody = await response.json();
                console.log('Respuesta OK:', responseBody);
        
                if (responseBody.message && responseBody.document_id) {
                    if (progressBar) progressBar.style.width = '100%';
                    this.showNotification(responseBody.message, 'success');
                    this.hide();
                    window.location.reload();
                } else {
                    throw new Error('Respuesta del servidor inválida.');
                }
        
            } catch (error) {
                console.error('Error uploading file:', error);
                console.error('Stack trace:', error.stack);
        
                if (this.uploadAttempts < this.maxUploadAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return this.attemptUpload(formData);
                }
        
                let errorMessage = 'Error al subir documento: ';
                if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                    errorMessage += 'No se pudo conectar con el servidor. Tu documento podría estar procesándose en segundo plano.';
                } else if (error.message.includes('CORS')) {
                    errorMessage += 'Error de CORS. Por favor, contacta al administrador del sistema.';
                } else {
                    errorMessage += error.message;
                }
        
                this.showNotification(errorMessage, 'error');
        
                if (error.name !== 'TypeError' && !error.message.includes('Failed to fetch')) {
                    throw error;
                }
            }
        }
        

        showNotification(message, type = 'success') {
            // Remove any existing notifications
            const existingNotifications = document.querySelectorAll('.notification');
            existingNotifications.forEach(notification => notification.remove());

            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
                type === 'success' ? 'bg-green-500' : 
                type === 'error' ? 'bg-red-500' : 
                'bg-blue-500'
            } text-white transform transition-all duration-300 ease-in-out`;
            
            notification.innerHTML = `
                <div class="flex items-center">
                    <i class="fas ${
                        type === 'success' ? 'fa-check-circle' : 
                        type === 'error' ? 'fa-exclamation-circle' : 
                        'fa-info-circle'
                    } mr-2"></i>
                    <span>${message}</span>
                </div>
            `;

            // Add to DOM
            document.body.appendChild(notification);

            // Trigger animation
            setTimeout(() => {
                notification.classList.add('opacity-0', 'translate-y-2');
            }, 2500);

            // Remove after 3 seconds
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    }

    // Initialize and expose globally
    window.addDocumentModal = new AddDocumentModal();
}