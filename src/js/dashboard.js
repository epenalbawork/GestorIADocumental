document.addEventListener('DOMContentLoaded', async () => {
    // Modal handling
    const modals = {
        add: document.getElementById('addDocumentModal'),
        search: document.getElementById('searchModal')
    };
 
    // Quick action buttons
    const uploadBtn = document.querySelector('button:has(.fa-upload)');
    const searchBtn = document.querySelector('button:has(.fa-search)');
    const foldersBtn = document.querySelector('button:has(.fa-folder)');
    const settingsBtn = document.querySelector('button:has(.fa-cog)');
 
    // Modal open handlers
    uploadBtn?.addEventListener('click', () => openModal('add'));
    searchBtn?.addEventListener('click', () => openModal('search'));
 
    // Close modal buttons
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });
 
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
 
    // Form submissions
    const addDocumentForm = document.getElementById('addDocumentForm');
    const searchForm = document.getElementById('searchForm');
 
    addDocumentForm?.addEventListener('submit', handleAddDocument);
    searchForm?.addEventListener('submit', handleSearch);
 
    // File drag and drop
    const dropZone = document.querySelector('.border-dashed');
    if (dropZone) {
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
   
});
 
// Modal functions
function openModal(modalType) {
    const modal = document.getElementById(`${modalType}Modal`);
    if (modal) {
        modal.classList.remove('hidden');
    }
}
 
function closeModal(modal) {
    modal.classList.add('hidden');
}
 
// Form handlers
async function handleAddDocument(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
   
    try {
        // Here you would normally send the data to your backend
        console.log('Adding document:', Object.fromEntries(formData));
       
        // Simulate success
        showNotification('Documento agregado exitosamente', 'success');
        closeModal(e.target.closest('.modal'));
        e.target.reset();
    } catch (error) {
        showNotification('Error al agregar documento', 'error');
    }
}
 
async function handleSearch(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
   
    try {
        // Here you would normally send the search request to your backend
        console.log('Searching with criteria:', Object.fromEntries(formData));
       
        // Simulate search results
        showNotification('Búsqueda completada', 'success');
        closeModal(e.target.closest('.modal'));
    } catch (error) {
        showNotification('Error al realizar la búsqueda', 'error');
    }
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