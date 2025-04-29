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
            // Show loading state
            const loadingMessage = this.addMessage('Pensando...', 'bot', true);
 
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
           
            // Remove loading message
            loadingMessage.remove();
           
            // Add bot response
            this.addMessage(data.answer || 'Lo siento, no pude procesar tu pregunta.', 'bot');
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('Lo siento, hubo un error al procesar tu pregunta.', 'bot');
        }
    }
 
    addMessage(text, sender, isTemporary = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `rounded-lg p-3 max-w-[80%] ${
            sender === 'user'
                ? 'bg-blue-600 text-white ml-auto'
                : 'bg-gray-100 text-gray-800'
        }`;
       
        messageDiv.innerHTML = `<p class="text-sm">${text}</p>`;
       
        if (isTemporary) {
            messageDiv.id = 'loading-message';
        }
       
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
       
        return messageDiv;
    }
 
    toggleChat() {
        this.isMinimized = !this.isMinimized;
       
        if (this.isMinimized) {
            this.chatContainer.style.height = '60px';
            this.toggleButton.innerHTML = '<i class="fas fa-plus"></i>';
        } else {
            this.chatContainer.style.height = '500px';
            this.toggleButton.innerHTML = '<i class="fas fa-minus"></i>';
        }
    }
}
 
// Initialize chat when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.chatBot) {
        window.chatBot = new ChatBot();
    }
});