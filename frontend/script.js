document.addEventListener('DOMContentLoaded', () => {
    // Configuración de la URL del backend (cámbiala si tu backend está en produccion)
    const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : 'https://tu-backend-produccion.com';
    
    const apiKeyModal = document.getElementById('apiKeyModal');
    const apiKeyValue = document.getElementById('apiKeyValue');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const apiKeyError = document.getElementById('apiKeyError');
    const chatContainer = document.querySelector('.chat-container');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');

    let messages = [];

    const checkApiKey = () => {
        const apiKey = sessionStorage.getItem('deepseekApiKey');
        if (apiKey) {
            apiKeyModal.classList.add('hidden');
            chatContainer.classList.remove('blurred');
            userInput.focus();
        } else {
            apiKeyModal.classList.remove('hidden');
            chatContainer.classList.add('blurred');
            apiKeyValue.focus();
        }
    };

    saveApiKeyBtn.addEventListener('click', () => {
        const key = apiKeyValue.value.trim();
        if (key) {
            sessionStorage.setItem('deepseekApiKey', key);
            apiKeyError.style.display = 'none';
            checkApiKey();
        } else {
            apiKeyError.style.display = 'block';
        }
    });

    apiKeyValue.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveApiKeyBtn.click();
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('deepseekApiKey');
        apiKeyValue.value = '';
        checkApiKey();
    });

    const parseMarkdown = (text) => {
        if (!text) return '';
        return text
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br/>');
    };

    const addMessage = (role, content) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (role === 'bot') {
            contentDiv.innerHTML = parseMarkdown(content);
        } else if (role === 'user') {
            contentDiv.textContent = content;
        } else if (role === 'system') {
            contentDiv.textContent = content;
        }
        
        messageDiv.appendChild(contentDiv);
        chatBox.appendChild(messageDiv);
        scrollToBottom();
        
        if (role === 'user') {
            messages.push({ role: 'user', content });
        } else if (role === 'bot') {
            messages.push({ role: 'assistant', content });
        }
    };

    const addLoadingIndicator = () => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message loading-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        chatBox.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv;
    };

    const scrollToBottom = () => {
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    const setInputState = (disabled) => {
        userInput.disabled = disabled;
        sendBtn.disabled = disabled;
        if (!disabled) userInput.focus();
    };

    const sendMessage = async () => {
        const text = userInput.value.trim();
        if (!text) return;
        
        const apiKey = sessionStorage.getItem('deepseekApiKey');
        if (!apiKey) {
            checkApiKey();
            return;
        }

        addMessage('user', text);
        userInput.value = '';
        setInputState(true);

        const loadingEl = addLoadingIndicator();

        try {
            const apiMessages = [...messages];
            // Make sure the first message configures the system nicely
            if (apiMessages.length === 1 && apiMessages[0].role === 'user') {
                apiMessages.unshift({ role: 'system', content: 'You are a helpful AI assistant powered by DeepSeek.' });
            } else if (apiMessages.length > 0 && apiMessages[0].role !== 'system') {
                apiMessages.unshift({ role: 'system', content: 'You are a helpful AI assistant powered by DeepSeek.' });
            }

            const response = await fetch(`${BACKEND_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ messages: apiMessages })
            });

            const data = await response.json();
            
            loadingEl.remove();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            addMessage('bot', data.reply.content);
            
        } catch (error) {
            loadingEl.remove();
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message bot-message error';
            errorDiv.innerHTML = `<div class="message-content" style="color: #ef4444;">Error: ${error.message}</div>`;
            chatBox.appendChild(errorDiv);
            scrollToBottom();
            
            if (error.message.toLowerCase().includes('api key') || error.message.includes('401')) {
                setTimeout(() => {
                    sessionStorage.removeItem('deepseekApiKey');
                    checkApiKey();
                }, 2000);
            }
        } finally {
            setInputState(false);
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    checkApiKey();
});
