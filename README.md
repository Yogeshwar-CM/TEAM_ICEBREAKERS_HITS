# Collaborative AI-Driven Real-Time Online Code Editor

## Introduction

Welcome to the Collaborative AI-Driven Real-Time Online Code Editor project. This application allows users to collaborate on coding tasks in real-time, with support for multiple programming languages and integrated AI suggestions.

## About the Project

This project features:
- **Real-Time Collaboration:** Users can create or join coding rooms and collaborate in real-time.
- **AI Integration:** Get AI-driven code suggestions and assistance.
- **Language Support:** Supports Python, Java, C++, C, and JavaScript.
- **Editor:** Utilizes Monaco Editor for code editing.

## Video Demo

Click to download the project demo video: [Download TEAM_ICEBREAKERS_Demo.mp4](TEAM_ICEBREAKERS_HITS/Video/TEAM_ICEBREAKERS_Demo.mp4)

## Tech Used

- **Backend:** Node.js, Express.js, MongoDB
- **Frontend:** React, Tailwind CSS, React Bootstrap, Monaco Editor
- **AI Integration:** Groq (llama-3.1-70b-versatile)
- **Real-Time Communication:** WebSockets (Socket.io)

## How to Install and Set Up

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Yogeshwar-CM/TEAM_ICEBREAKERS_HITS.git
   cd TEAM_ICEBREAKERS_HITS
   ```
2. **Install Dependencies**

For both server and client:
cd into both server and client separately and execute the following
  ```bash
    npm install
  ```

3. **Set Up Groq API Key**
   - Get your free API key from [Groq Console](https://console.groq.com/keys)
   - Create a `.env` file in the `server` directory:
   ```bash
   cd server
   cp .env.example .env
   ```
   - Add your Groq API key to the `.env` file:
   ```
   GROQ_API_KEY=your_api_key_here
   ```

4. **Start the Server**
   ```bash
   cd server
   npm start
   ```
5. **Start the Client**
   ```bash
   cd ../client
   npm start
    ```
6. **Contributions Welcome**

Contributions are welcome! Feel free to submit issues or pull requests to help improve the project.
   
