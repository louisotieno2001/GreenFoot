require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const pgp = require('pg-promise')();
const openai = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// OpenAI API key
openai.apiKey = process.env.OPENAI_API_KEY;

// Configure PostgreSQL database connection using environment variables
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbConnection = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
const db = pgp(dbConnection);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to interact with ChatGPT
app.post('/completions', async (req, res) => {
    const apiUrl = 'https://api.openai.com/v1/engines/davinci/completions'

    function ChatCompletion() {

    }

    try {
        const response = await apiUrl.ChatCompletion().create({ model: 'gpt-3.5-turbo', messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: query }] });
        console.log(response);

        if (response.ok) {
            const result = await response.json();
            displayChatGPTResponse(result.response);
        } else {
            console.error('Error in ChatGPT response:', response.statusText);
            alert('Failed to get a response from ChatGPT.');
        }
    } catch (error) {
        console.error('Error sending query to ChatGPT:', error);
        alert('An error occurred. Please try again later.');
    }
});

// Route to handle user registration
app.post('/register', async (req, res) => {
    const userData = req.body;

    try {
        // Insert user data into the database
        const query = `
            INSERT INTO users (username, password, email, phone, region, township, transport, energy, waste_management, energy_sources, fashion, diet)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
        const values = [
            userData.username,
            userData.password,
            userData.email,
            userData.phone,
            userData.region,
            userData.township,
            JSON.stringify(userData.transport),
            JSON.stringify(userData.energy),
            JSON.stringify(userData.wasteManagement),
            JSON.stringify(userData.energySources),
            JSON.stringify(userData.fashion),
            JSON.stringify(userData.diet),
        ];

        await db.none(query, values); // Execute the query using 'none' method

        res.status(201).send('User registered successfully');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Internal server error');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Query the database to verify the credentials
        const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);

        if (user) {
            res.status(200).json({ message: 'Login successful' });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/chatgpt', async (req, res) => {
    const { query } = req.body;

    try {
        // Call a function to send the query to ChatGPT and get the response
        const chatGPTResponse = await sendToChatGPT(query);

        // You can save the user query and ChatGPT response to the database if needed
        await saveChatInteraction(query, chatGPTResponse);

        // Send the ChatGPT response back to the frontend
        res.json({ response: chatGPTResponse });
    } catch (error) {
        console.error('Error in /api/chatgpt:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Function to send the query to ChatGPT
async function sendToChatGPT(query) {
    // Make a request to the OpenAI API or use any method you prefer
    // Replace 'your-model-id' with the actual model ID you want to use
    const apiUrl = 'https://api.openai.com/v1/engines/davinci/completions'
    const response = await openai.Completion.create({
        engine: 'text-davinci-002', // Specify the engine
        prompt: query,
        max_tokens: 100, // Adjust the max tokens as needed
    });

    return response.choices[0].text.trim();
}

// Function to save the user query and ChatGPT response to the database
async function saveChatInteraction(userQuery, chatGPTResponse) {
    const timestamp = new Date().toISOString();

    try {
        // Use the db object to execute SQL queries
        await db.none(
            'INSERT INTO chat_interactions (user_query, chatgpt_response, timestamp) VALUES ($1, $2, $3)',
            [userQuery, chatGPTResponse, timestamp]
        );
    } catch (error) {
        console.error('Error saving chat interaction to database:', error);
        throw error;
    }
}

// Route to fetch user data
app.get('/renderData', async (req, res) => {
    try {
        // Query to fetch user data from the database
        const userDataQuery = 'SELECT * FROM users'; // Customize this query as per your database schema

        // Execute the query
        const userData = await db.any(userDataQuery);
        // console.log(userData);
        // Send the fetched user data as JSON response
        res.json(userData);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});