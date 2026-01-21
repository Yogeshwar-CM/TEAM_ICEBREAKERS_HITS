const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Groq = require("groq-sdk");
const ACTIONS = require("./Actions");
const Eval = require("open-eval");
const mongoose = require("mongoose");
const Code = require("./models/Code");
const { initTerminal } = require("./TerminalHandler");

// Load environment variables
require("dotenv").config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {};

const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
};

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL = "llama-3.1-8b-instant";
const SYSTEM_PROMPT = "Generate only code. Do not include explanations or additional text.";

const ev = new Eval();

async function generateWithGroq(prompt, systemPrompt = SYSTEM_PROMPT) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    model: GROQ_MODEL,
    temperature: 0.7,
    max_tokens: 2048,
  });
  return chatCompletion.choices[0]?.message?.content || "";
}

console.log("Groq client initialized with model:", GROQ_MODEL);

io.on("connection", (socket) => {
  console.log("Socket connected", socket.id);

  socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);

    // Initialize terminal session for this room
    try {
      initTerminal(io, socket, roomId);
    } catch (e) {
      console.error("Failed to init terminal:", e);
    }

    try {
      let roomCode = await Code.findOne({ roomId });
      if (!roomCode) {
        roomCode = new Code({ roomId });
        await roomCode.save();
      }

      const clients = getAllConnectedClients(roomId);
      clients.forEach(({ socketId }) => {
        io.to(socketId).emit(ACTIONS.JOINED, {
          clients,
          username,
          socketId: socket.id,
          code: roomCode.code,
        });
      });
    } catch (error) {
      console.error("Error handling JOIN event:", error);
    }
  });

  socket.on(ACTIONS.CODE_CHANGE, async ({ roomId, code }) => {
    try {
      await Code.findOneAndUpdate({ roomId }, { code }, { upsert: true });
      socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    } catch (error) {
      console.error("Error updating code:", error);
    }
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.COMPILE_CODE, async ({ code, language, stdin }) => {
    try {
      const languageMapping = {
        javascript: "js",
        python: "python3",
        java: "java",
        c: "c",
        cpp: "cpp",
      };
      const lang = languageMapping[language] || "text";

      const result = await ev.eval(lang, code, { stdin });

      console.log("Compilation result:", result.output);
      socket.emit(ACTIONS.COMPILATION_RESULT, {
        output: result.output,
        error: result.error || null,
      });
    } catch (error) {
      console.error("Compilation error:", error);
      socket.emit(ACTIONS.COMPILATION_RESULT, {
        error: "An error occurred while compiling the code.",
      });
    }
  });

  socket.on(ACTIONS.GENERATE_CODE, async ({ prompt }) => {
    try {
      const generatedText = await generateWithGroq(prompt);

      console.log("Generated code:", generatedText);

      if (generatedText) {
        socket.emit(ACTIONS.CODE_GENERATION_RESULT, { code: generatedText });
      } else {
        socket.emit(ACTIONS.CODE_GENERATION_RESULT, {
          code: "",
          error: "Failed to generate code.",
        });
      }
    } catch (error) {
      console.error("Error generating code:", error);
      socket.emit(ACTIONS.CODE_GENERATION_RESULT, {
        code: "",
        error: "Failed to generate code.",
      });
    }
  });

  socket.on(ACTIONS.RECOMMEND_CODE, async ({ code }) => {
    try {
      console.log(code);
      const recommendations = await generateWithGroq(
        `Recommend improvements for the following code:\n\n${code}`,
        "You are a helpful code reviewer. Provide clear, actionable recommendations to improve the given code."
      );

      console.log("Code recommendations:", recommendations);

      if (recommendations) {
        socket.emit(ACTIONS.RECOMMEND_RESULT, { recommendations });
      } else {
        socket.emit(ACTIONS.RECOMMEND_RESULT, {
          recommendations: "",
          error: "Failed to generate recommendations.",
        });
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
      socket.emit(ACTIONS.RECOMMEND_CODE, {
        recommendations: "",
        error: "Failed to generate recommendations.",
      });
    }
  });

  // File tree sync
  socket.on(ACTIONS.FILE_TREE_UPDATE, ({ roomId, fileTree }) => {
    socket.in(roomId).emit(ACTIONS.FILE_TREE_UPDATE, { fileTree });
  });

  // Active file change
  socket.on(ACTIONS.ACTIVE_FILE_CHANGE, ({ roomId, filePath }) => {
    socket.in(roomId).emit(ACTIONS.ACTIVE_FILE_CHANGE, {
      filePath,
      username: userSocketMap[socket.id]
    });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });

    delete userSocketMap[socket.id];
    socket.leave();
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
