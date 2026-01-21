const pty = require("node-pty");
const os = require("os");

const shell = process.env.SHELL || (os.platform() === "win32" ? "powershell.exe" : "/bin/bash");

const terminalSessions = {};

const initTerminal = (io, socket, roomId) => {
    // If terminal for this room doesn't exist, create it
    if (!terminalSessions[roomId]) {
        const ptyProcess = pty.spawn(shell, [], {
            name: "xterm-color",
            cols: 80,
            rows: 30,
            cwd: process.env.HOME, // Start in home directory
            env: process.env,
        });

        terminalSessions[roomId] = ptyProcess;

        // Send data from PTY to all clients in the room
        ptyProcess.onData((data) => {
            io.to(roomId).emit("terminal:data", data);
        });

        // Clean up on exit
        ptyProcess.onExit(() => {
            delete terminalSessions[roomId];
        });
    }

    // Handle input from client
    socket.on("terminal:write", (data) => {
        const ptyProcess = terminalSessions[roomId];
        if (ptyProcess) {
            ptyProcess.write(data);
        }
    });

    // Handle resize
    socket.on("terminal:resize", ({ cols, rows }) => {
        const ptyProcess = terminalSessions[roomId];
        if (ptyProcess) {
            try {
                ptyProcess.resize(cols, rows);
            } catch (err) {
                console.error("Resize failed", err);
            }
        }
    });

    // Send initial clear/prompt if joining existing session
    // (Optional: buffer replay could be added here)
};

module.exports = { initTerminal, terminalSessions };
