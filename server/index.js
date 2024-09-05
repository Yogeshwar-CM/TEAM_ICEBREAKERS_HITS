const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Ollama } = require("ollama-node");
const ACTIONS = require("./Actions");
const Eval = require("open-eval");
const mongoose = require("mongoose");
const Code = require("./models/Code");

mongoose
  .connect(
    "mongodb+srv://root:root@cluster0.rzb1t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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

const ollama = new Ollama();
const ev = new Eval();

async function initializeOllama() {
  try {
    await ollama.setModel("llama3.1:latest");
    console.log("Model llama3.1:latest set successfully.");
    await ollama.setSystemPrompt(
      "Generate only code. Do not include explanations or additional text."
    );
  } catch (error) {
    console.error("Error setting model:", error);
  }
}

initializeOllama();

io.on("connection", (socket) => {
  console.log("Socket connected", socket.id);

  socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);

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
      const response = await ollama.generate(prompt);
      const generatedText = response.output || "";

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
      const response = await ollama.generate(
        `Recommend improvements for the following code:\n\n${code}`
      );
      const recommendations = response.output || "";

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
