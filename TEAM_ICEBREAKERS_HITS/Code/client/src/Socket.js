import { io } from "socket.io-client";

export const initSocket = async () => {
  try {
    const options = {
      "force new connection": true,
      reconnectionAttempts: "Infinity",
      timeout: 10000,
      transports: ["websocket"],
    };

    const socket = io(process.env.REACT_APP_BACKEND_URL, options);

    // Verify if socket connection is established
    socket.on("connect", () => {
      console.log("Socket connected successfully");
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      throw err; // Rethrow or handle error as needed
    });

    return socket;
  } catch (error) {
    console.error("Failed to initialize socket:", error);
    throw error; // Rethrow or handle error as needed
  }
};
