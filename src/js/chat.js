class ChatBot {
    constructor() {
        this.chatContainer = document.getElementById('chatContainer');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatForm = document.getElementById('chatForm');
        this.chatInput = document.getElementById('chatInput');
        this.toggleButton = document.getElementById('toggleChat');
        this.isMinimized = true;
 
        if (!this.chatContainer || !this.chatMessages || !this.chatForm || !this.chatInput || !this.toggleButton) {
            console.error('Chat elements not found');
            return;
        }
 
        this.initialize();
    }
 
    initialize() {
        // Event Listeners
        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleSubmit(e);
        });
       
        this.toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleChat();
        });
 
        // Hacer que el encabezado del chat también pueda expandir/colapsar el chat
        const chatHeader = document.querySelector('#chatHeader');
        if (chatHeader) {
            chatHeader.addEventListener('click', (e) => {
                // Solo ejecutar si el clic no fue en un botón dentro del header
                if (!e.target.closest('button')) {
                    this.toggleChat();
                }
            });
        }
 
        // También agregar un listener para el botón de enviar
        const sendButton = this.chatForm.querySelector('button[type="submit"]');
        if (sendButton) {
            sendButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleSubmit(e);
            });
        }
 
        // Prevenir que el formulario se envíe al presionar Enter
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleSubmit(e);
            }
        });
 
        // Expandir el chat si hay un parámetro en la URL
        if (window.location.search.includes('openchat=true')) {
            this.isMinimized = true; // Lo ponemos a true para que toggleChat() lo invierta
            this.toggleChat();
        }
    }
 
    async handleSubmit(e) {
        e.preventDefault();
        e.stopPropagation();
        const question = this.chatInput.value.trim();
       
        if (!question) return;
 
        // Add user message to chat
        this.addMessage(question, 'user');
        this.chatInput.value = '';
 
        try {
            // Show typing indicator
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) {
                typingIndicator.classList.remove('hidden');
                typingIndicator.innerHTML = `
                    <div class="flex items-center p-3">
                        <div class="flex-shrink-0 mr-2">
                            <i class="fas fa-robot text-blue-500"></i>
                        </div>
                        <div class="text-gray-500 text-sm flex items-center">
                            <span>Escribiendo</span>
                            <span class="flex ml-1">
                                <span class="typing-dot"></span>
                                <span class="typing-dot"></span>
                                <span class="typing-dot"></span>
                            </span>
                        </div>
                    </div>
                `;
            } else {
                // Fallback if typingIndicator not found
                const loadingMessage = this.addMessage('Pensando...', 'bot', true);
            }
 
            // Call API
            const response = await fetch('https://jgo71eb2mk.execute-api.us-east-1.amazonaws.com/dev/Ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question })
            });
 
            if (!response.ok) {
                throw new Error('Error en la respuesta de la API');
            }
 
            const responseText = await response.text();
            console.log('Raw response:', responseText); // Para debugging
           
            let data;
            try {
                // Primero parseamos el string JSON exterior
                const outerData = JSON.parse(responseText);
                // Luego parseamos el string JSON interior
                data = JSON.parse(outerData.body);
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                throw new Error('Error al procesar la respuesta del servidor');
            }
           
            // Remove typing indicator
            if (typingIndicator) {
                typingIndicator.classList.add('hidden');
            } else {
                // Remove loading message if it exists
                const loadingMessage = document.getElementById('loading-message');
                if (loadingMessage) loadingMessage.remove();
            }
           
            // Add bot response with formatting
            this.addMessage(data.answer || 'Lo siento, no pude procesar tu pregunta.', 'bot');
 
            // Si el chat está minimizado, expandirlo para mostrar la respuesta
            if (this.isMinimized) {
                this.toggleChat();
            }
        } catch (error) {
            console.error('Error:', error);
           
            // Remove typing indicator
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) {
                typingIndicator.classList.add('hidden');
            } else {
                // Remove loading message if it exists
                const loadingMessage = document.getElementById('loading-message');
                if (loadingMessage) loadingMessage.remove();
            }
           
            this.addMessage('Lo siento, hubo un error al procesar tu pregunta.', 'bot');
        }
    }
 
    addMessage(text, sender, isTemporary = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `rounded-lg p-3 max-w-[80%] message-animation ${
            sender === 'user'
                ? 'bg-blue-600 text-white ml-auto'
                : 'bg-white border border-gray-100 shadow-sm'
        }`;
       
        // Formatear texto para respuestas del bot con estructura específica
        if (sender === 'bot' && !isTemporary) {
            // Verificar si el texto contiene resultados de documentos (lista)
            if (text.includes('Resultados:') && text.includes('documentos')) {
                this.formatDocumentList(text, messageDiv);
            }
            // Detectar si es una respuesta de documento de identidad o detalle de documento
            else if ((text.includes('DOCUMENTO:') && text.includes('TITULAR:') && text.includes('ESTADO:')) ||
                     (text.includes('Titular:') && text.includes('Estado:') && text.includes('Vencimiento:'))) {
                this.formatDocumentDetail(text, messageDiv);
            } else {
                // Para mensajes normales, aplicar formato de saltos de línea y enlaces clicables
                const formattedText = this.formatTextWithLinks(text.replace(/\n/g, '<br>'));
                messageDiv.innerHTML = `
                    <div class="flex items-start">
                        <div class="flex-shrink-0 mr-2">
                            <i class="fas fa-robot text-blue-500"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-800">${formattedText}</p>
                        </div>
                    </div>
                `;
            }
        } else {
            // Mensajes del usuario o temporales
            messageDiv.innerHTML = `<p class="text-sm">${text}</p>`;
           
            if (sender === 'user') {
                // Añadir icono de usuario
                const userIcon = document.createElement('div');
                userIcon.className = 'flex justify-end items-center mb-1';
                userIcon.innerHTML = `<span class="text-xs text-white opacity-70">Tú</span>`;
                messageDiv.prepend(userIcon);
            }
        }
       
        if (isTemporary) {
            messageDiv.id = 'loading-message';
        }
       
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
       
        return messageDiv;
    }
   
    // Función para convertir URLs en texto a enlaces clicables
    formatTextWithLinks(text) {
        // Regex para detectar URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, url => `<a href="${url}" target="_blank" class="text-blue-600 hover:underline">${url} <i class="fas fa-external-link-alt text-xs"></i></a>`);
    }
   
    formatDocumentList(text, container) {
        // Extracción del número total de documentos
        const countMatch = text.match(/Resultados: (\d+) documentos/);
        const documentCount = countMatch ? countMatch[1] : 0;
       
        // Separar las líneas para procesar cada documento
        const lines = text.split('\n');
       
        let formattedHTML = `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="flex items-center justify-between p-4 border-b border-gray-200">
                    <div class="flex items-center">
                        <i class="fas fa-folder-open text-blue-500 mr-2"></i>
                        <h3 class="font-medium text-blue-700">Resultados de Búsqueda</h3>
                    </div>
                    <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">${documentCount} documentos</span>
                </div>
                <div>
        `;
       
        // Procesar cada línea que contenga información de documento
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || !line.includes('|')) continue;
           
            // Extraer nombre, fecha y URL
            let docName, docDate, docUrl;
           
            // Comprobar si la línea tiene URL
            if (line.includes('URL:')) {
                const parts = line.split('|');
                docName = parts[0].replace('•', '').trim();
                docDate = parts[1].replace('Fecha:', '').trim();
               
                // Extraer URL si está presente
                const urlMatch = line.match(/URL: (https?:\/\/[^\s]+)/);
                docUrl = urlMatch ? urlMatch[1] : '#';
            } else {
                // Formato antiguo sin URL
                const docMatch = line.match(/^• (.*) \| Fecha: (.*)/);
                if (!docMatch) continue;
               
                [, docName, docDate] = docMatch;
                docUrl = '#';
            }
           
            // Determinar un ícono basado en el nombre del documento (lógica simplificada)
            let icon = 'fa-file-alt';
            let iconColor = 'text-blue-600';
           
            if (docName.toLowerCase().includes('cédula') || docName.toLowerCase().includes('cedula')) {
                icon = 'fa-id-card';
            } else if (docName.toLowerCase().includes('contrato')) {
                icon = 'fa-file-contract';
            } else if (docName.toLowerCase().includes('birth') || docName.toLowerCase().includes('nacimiento')) {
                icon = 'fa-birthday-cake';
            } else if (docName.toLowerCase().includes('gestor')) {
                icon = 'fa-user-cog';
            } else if (docName.toLowerCase().includes('formulario')) {
                icon = 'fa-file-alt';
            }
           
            // Formatear fecha en formato más legible si es posible
            let formattedDate = docDate;
            try {
                const dateObj = new Date(docDate);
                if (!isNaN(dateObj.getTime())) {
                    formattedDate = dateObj.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            } catch (e) {
                console.error('Error formatting date:', e);
            }
           
            // Crear un elemento visualmente atractivo para cada documento
            formattedHTML += `
                <a href="${docUrl}" target="_blank" class="block">
                    <div class="flex items-center p-4 hover:bg-gray-50 border-b border-gray-200 transition-colors duration-200">
                        <div class="${iconColor} mr-3">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-medium text-gray-900">${docName}</div>
                            <div class="text-sm text-gray-500">
                                <i class="far fa-calendar-alt mr-1"></i>${formattedDate}
                            </div>
                        </div>
                        <div class="text-blue-500">
                            <i class="fas fa-external-link-alt"></i>
                        </div>
                    </div>
                </a>
            `;
        }
       
        formattedHTML += `
                </div>
            </div>
        `;
       
        container.innerHTML = formattedHTML;
    }
   
    formatDocumentDetail(text, container) {
        let docTitle = '';
        let titular = '';
        let identificacion = '';
        let estado = '';
        let vencimiento = '';
        let diasRestantes = '';
        let docLink = '#';
       
        // Extraer información basado en el formato del texto
        const lines = text.split('\n');
       
        // Primer enfoque: Para respuestas con formato "DOCUMENTO:", "TITULAR:", etc.
        if (text.includes('DOCUMENTO:')) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
               
                if (line.includes('DOCUMENTO:')) {
                    docTitle = line.replace('DOCUMENTO:', '').trim();
                }
                else if (line.includes('TITULAR:')) {
                    const parts = line.split('|');
                    titular = parts[0].replace('TITULAR:', '').trim();
                    identificacion = parts.length > 1 ? parts[1].trim() : '';
                }
                else if (line.includes('ESTADO:')) {
                    const parts = line.split('|');
                    estado = parts[0].replace('ESTADO:', '').trim();
                    vencimiento = parts.length > 1 ? parts[1].replace('VENCIMIENTO:', '').trim() : '';
                }
                else if (line.includes('La cédula se encuentra') || line.includes('días')) {
                    diasRestantes = line.trim();
                }
                else if (line.includes('Ver documento:')) {
                    const linkMatch = line.match(/(https:\/\/\S+)/);
                    docLink = linkMatch ? linkMatch[1] : '#';
                }
            }
        }
        // Segundo enfoque: Para respuestas con formato "Titular:", "Estado:", etc.
        else {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
               
                if (line.startsWith('Titular:')) {
                    titular = line.replace('Titular:', '').trim();
                }
                else if (line.startsWith('Identificación:')) {
                    identificacion = line.replace('Identificación:', '').trim();
                }
                else if (line.startsWith('Estado:')) {
                    estado = line.replace('Estado:', '').trim();
                }
                else if (line.startsWith('Vencimiento:')) {
                    vencimiento = line.replace('Vencimiento:', '').trim();
                }
                else if ((line.includes('Vence en') || line.includes('días'))) {
                    diasRestantes = line.trim();
                }
                else if (line.includes('Ver documento:')) {
                    const linkMatch = line.match(/(https:\/\/\S+)/);
                    docLink = linkMatch ? linkMatch[1] : '#';
                }
                // El título del documento puede ser la primera línea no identificada
                else if (!docTitle && !line.includes(':')) {
                    docTitle = line.trim();
                }
            }
        }
       
        // Determinar colores e íconos basados en el estado
        let estadoClass = 'text-gray-600';
        let estadoIcon = 'fa-info-circle text-gray-500';
       
        if (estado.toUpperCase() === 'VIGENTE') {
            estadoClass = 'text-green-600 font-medium';
            estadoIcon = 'fa-check-circle text-green-500';
        }
        else if (estado.toUpperCase() === 'VENCIDA' || estado.toUpperCase() === 'VENCIDO') {
            estadoClass = 'text-red-600 font-medium';
            estadoIcon = 'fa-times-circle text-red-500';
        }
        else if (estado.toUpperCase().includes('PRÓXIMA') || estado.toUpperCase().includes('PROXIMA')) {
            estadoClass = 'text-amber-600 font-medium';
            estadoIcon = 'fa-exclamation-triangle text-amber-500';
        }
       
        // Determinar icono del documento
        let docIcon = 'fa-file-alt';
        if (docTitle.toLowerCase().includes('cédula') || docTitle.toLowerCase().includes('cedula')) {
            docIcon = 'fa-id-card';
        } else if (docTitle.toLowerCase().includes('contrato')) {
            docIcon = 'fa-file-contract';
        } else if (docTitle.toLowerCase().includes('birth') || docTitle.toLowerCase().includes('nacimiento')) {
            docIcon = 'fa-birthday-cake';
        } else if (docTitle.toLowerCase().includes('gestor')) {
            docIcon = 'fa-user-cog';
        }
       
        // Crear el HTML para el documento (siguiendo el estilo de las imágenes proporcionadas)
        let formattedHTML = `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="flex items-center p-4 border-b border-gray-200">
                    <i class="fas ${docIcon} text-blue-600 mr-2"></i>
                    <span class="font-medium text-blue-700">${docTitle || 'Documento'}</span>
                </div>
               
                <div class="p-4 space-y-4">
                    <div class="flex items-start">
                        <i class="fas fa-user text-gray-400 mt-1 mr-3 w-5"></i>
                        <div>
                            <div class="text-gray-700">Titular:</div>
                            <div class="font-medium">${titular}</div>
                        </div>
                    </div>
                   
                    <div class="flex items-start">
                        <i class="fas fa-id-card text-gray-400 mt-1 mr-3 w-5"></i>
                        <div>
                            <div class="text-gray-700">Identificación:</div>
                            <div class="font-medium">${identificacion || 'No disponible'}</div>
                        </div>
                    </div>
                   
                    <div class="flex items-start">
                        <i class="fas ${estadoIcon} mt-1 mr-3 w-5"></i>
                        <div>
                            <div class="text-gray-700">Estado:</div>
                            <div class="${estadoClass}">${estado}</div>
                        </div>
                    </div>
                   
                    <div class="flex items-start">
                        <i class="fas fa-calendar-alt text-gray-400 mt-1 mr-3 w-5"></i>
                        <div>
                            <div class="text-gray-700">Vencimiento:</div>
                            <div class="font-medium">${vencimiento}</div>
                        </div>
                    </div>
                   
                    ${diasRestantes ? `<div class="text-gray-700 mt-1">${diasRestantes}</div>` : ''}
                   
                    <div class="mt-4">
                        <a href="${docLink}" target="_blank" class="inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors duration-200">
                            <i class="fas fa-external-link-alt mr-2"></i>
                            Ver documento
                        </a>
                    </div>
                </div>
            </div>
        `;
       
        container.innerHTML = formattedHTML;
    }
 
    toggleChat() {
        this.isMinimized = !this.isMinimized;
       
        if (this.isMinimized) {
            this.chatContainer.style.height = '60px';
            this.toggleButton.innerHTML = '<i class="fas fa-plus"></i>';
            this.chatContainer.classList.add('chat-minimized');
            this.chatContainer.classList.remove('chat-expanded');
        } else {
            this.chatContainer.style.height = '500px';
            this.toggleButton.innerHTML = '<i class="fas fa-minus"></i>';
            this.chatContainer.classList.add('chat-expanded');
            this.chatContainer.classList.remove('chat-minimized');
           
            // Desplazar al final para ver los mensajes más recientes
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }
 
    // Método público para configurar un mensaje de bienvenida personalizado
    setWelcomeMessage(message) {
        // Primero, verificamos si hay mensajes en el chat
        if (this.chatMessages.children.length === 0) {
            // Si no hay mensajes, agregamos el mensaje de bienvenida
            const welcomeMessage = message || '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?';
            this.addMessage(welcomeMessage, 'bot');
        }
    }
 
    // Método para limpiar el historial de chat
    clearChat() {
        // Eliminar todos los mensajes
        while (this.chatMessages.firstChild) {
            this.chatMessages.removeChild(this.chatMessages.firstChild);
        }
       
        // Agregar mensaje de bienvenida nuevamente
        this.setWelcomeMessage();
    }
}
 
// Initialize chat when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.chatBot) {
        window.chatBot = new ChatBot();
       
        // Configurar mensaje de bienvenida (opcional)
        // window.chatBot.setWelcomeMessage('¡Hola! Estoy aquí para ayudarte con tus documentos.');
    }
 
    // Agregar el botón de limpiar chat (opcional)
    const clearButton = document.getElementById('clearChat');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (window.chatBot) {
                window.chatBot.clearChat();
            }
        });
    }
});