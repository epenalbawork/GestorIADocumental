// Check if SearchModal is already defined
if (typeof window.SearchModal === 'undefined') {
    class SearchModal {
        constructor() {
            this.initialize();
        }

        initialize() {
            this.modal = document.getElementById('searchModal');
            if (!this.modal) {
                console.error('Search modal element not found');
                return;
            }

            this.form = this.modal.querySelector('#searchForm');
            this.closeButton = this.modal.querySelector('button[aria-label="Cerrar"]');
            this.clearButton = this.modal.querySelector('button:has(i.fa-times)');
            this.searchButton = this.modal.querySelector('button:has(i.fa-search)');
            this.toggleAdvancedButton = this.modal.querySelector('#toggleAdvancedOptions');
            this.advancedOptions = this.modal.querySelector('#advancedOptions');

            if (!this.form || !this.closeButton || !this.clearButton || !this.searchButton || 
                !this.toggleAdvancedButton || !this.advancedOptions) {
                console.error('One or more modal elements not found');
                return;
            }

            this.initializeEventListeners();
            console.log('SearchModal initialized');
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

            // Clear form
            this.clearButton.addEventListener('click', () => {
                this.form.reset();
                this.hideAdvancedOptions();
            });

            // Toggle advanced options
            this.toggleAdvancedButton.addEventListener('click', () => {
                this.toggleAdvancedOptions();
            });

            // Handle form submission
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSearch();
            });

            // Date validation
            const dateFrom = this.modal.querySelector('#searchDateFrom');
            const dateTo = this.modal.querySelector('#searchDateTo');

            dateFrom.addEventListener('change', () => {
                if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
                    this.showNotification('La fecha desde no puede ser mayor que la fecha hasta', 'error');
                    dateFrom.value = '';
                }
            });

            dateTo.addEventListener('change', () => {
                if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
                    this.showNotification('La fecha hasta no puede ser menor que la fecha desde', 'error');
                    dateTo.value = '';
                }
            });
        }

        show() {
            if (!this.modal) {
                this.initialize();
            }
            this.modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            this.modal.querySelector('#searchTitle').focus();
        }

        hide() {
            if (!this.modal) {
                this.initialize();
            }
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
            this.hideAdvancedOptions();
        }

        toggleAdvancedOptions() {
            const isHidden = this.advancedOptions.classList.contains('hidden');
            this.advancedOptions.classList.toggle('hidden', !isHidden);
            this.toggleAdvancedButton.querySelector('i').classList.toggle('fa-chevron-down', isHidden);
            this.toggleAdvancedButton.querySelector('i').classList.toggle('fa-chevron-up', !isHidden);
        }

        hideAdvancedOptions() {
            this.advancedOptions.classList.add('hidden');
            this.toggleAdvancedButton.querySelector('i').classList.remove('fa-chevron-up');
            this.toggleAdvancedButton.querySelector('i').classList.add('fa-chevron-down');
        }

        async handleSearch() {
            // debugger;
            const formData = new FormData(this.form);

            // Helper to format dates
            const formatDateTime = (dateStr) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                return date.toISOString().slice(0, 19); // Keep 'YYYY-MM-DDTHH:mm:ss'
            };
        
            // Convert FormData to a plain object
            const body = {
                title: formData.get('title') || '',
                category: formData.get('type') || '',
                date_from: formData.get('dateFrom') || '',
                date_to: formData.get('dateTo') || '',
                tags: formData.get('tags') || '',
                status: formData.get('status') || '',
                content: formData.get('content') || ''
            };
        
            try {
                this.showNotification('Buscando documentos...', 'info');
        
                const response = await fetch('https://jgo71eb2mk.execute-api.us-east-1.amazonaws.com/dev/search-document', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
        
                if (!response.ok) {
                    throw new Error('Error en la respuesta del servidor');
                }
        
                const data = await response.json(); 
                console.log('Resultados de búsqueda:', data.body);

                // Guardar los resultados de búsqueda en localStorage
                localStorage.setItem('searchResults', data.body);


                // Redirigir a la página directory
                window.location.href = 'index.html?page=directory';

                this.showNotification('Búsqueda completada', 'success');
                this.hide();
        
                // Aquí puedes actualizar los resultados de la página con "data" (esto esta actualizando la página y no los resultados)
                // this.updateSearchResults(data);
            } catch (error) {
                console.error('Error searching documents:', error);
                this.showNotification('Error al realizar la búsqueda', 'error');
            }
        }
        

        updateSearchResults(params) {
            // Here you would typically update the search results in the main page
            // For now, we'll just reload the page with the search parameters
            const url = new URL(window.location.href);
            url.search = params.toString();
            window.location.href = url.toString();
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
    window.searchModal = new SearchModal();
} 