const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors())
app.use(express.json());

app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;
    const apiKey = req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
    }

    try {
        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://api.deepseek.com',
        });

        const response = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: messages,
        });

        res.json({ reply: response.choices[0].message });
    } catch (error) {
        console.error('API Error:', error.message || error);
        res.status(error.status || 500).json({ error: error.message || 'An error occurred while communicating with DeepSeek API' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
