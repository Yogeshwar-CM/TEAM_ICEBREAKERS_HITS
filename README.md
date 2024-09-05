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

Watch the project in action here: [TEAM_ICEBREAKERS_Demo.mp4](TEAM_ICEBREAKERS_HITS/Video/TEAM_ICEBREAKERS_Demo.mp4)

## Tech Used

- **Backend:** Node.js, Express.js, MongoDB
- **Frontend:** React, Tailwind CSS, React Bootstrap, Monaco Editor
- **AI Integration:** Ollama
- **Real-Time Communication:** WebSockets (Socket.io)

## How to Install and Set Up

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Yogeshwar-CM/TEAM_ICEBREAKERS_HITS.git
   cd TEAM_ICEBREAKERS_HITS
   ```
2. **Install Dependencies**

For both server and client:
cd into both server and client seperately and execute the following
  ```bash
    npm install
  ```

3. **Start the Ollama Model**
   If you dont have it already, You can download it from [Ollama](https://ollama.com).
   Once installed, open another terminal and run
   ```bash
   ollama start
   ```
   to run ollama locally in your system

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
   
