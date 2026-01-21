import React, { useEffect, useRef } from 'react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import './TerminalComponent.css';

const TerminalComponent = ({ socketRef }) => {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    // Store socket ref locally to access inside effect closures if needed, 
    // though we mostly rely on the passed prop.

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize xterm
        const term = new Xterm({
            cursorBlink: true,
            theme: {
                background: '#1e1e1e',
                foreground: '#cccccc',
                cursor: '#ffffff',
                selection: '#5da5d533',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#e5e5e5',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
            lineHeight: 1.2,
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        term.writeln('\x1b[1;36mCodeCollab Terminal\x1b[0m');
        term.writeln('Connected to shared session...');

        // Handle user input - sending to server
        term.onData(data => {
            if (socketRef && socketRef.current) {
                socketRef.current.emit("terminal:write", data);
            }
        });

        // Listen for data from server
        const handleTerminalData = (data) => {
            term.write(data);
        };

        if (socketRef && socketRef.current) {
            // Remove any previous listener to avoid dupes?
            // Ideally we do this once.
            socketRef.current.on("terminal:data", handleTerminalData);
        }

        // Standard event listeners for compilation output (still useful if using "Run" button)
        const handleWrite = (e) => {
            let text = e.detail;
            if (typeof text === 'string' && !text.includes('\r')) {
                text = text.replace(/\n/g, '\r\n');
            }
            term.write(text);

            // Also send to PTY if we want it to be "executed"? 
            // No, Keep compilation output local or use the PTY to run the command?
            // For now, allow overlaying output.
        };

        const handleClear = () => {
            term.clear();
            term.write('\x1b[1;36mCodeCollab Terminal\x1b[0m\r\n\r\n$ ');
        };

        window.addEventListener('terminal-write', handleWrite);
        window.addEventListener('terminal-clear', handleClear);

        const handleResize = () => {
            fitAddon.fit();
            if (socketRef && socketRef.current) {
                socketRef.current.emit("terminal:resize", { cols: term.cols, rows: term.rows });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('terminal-write', handleWrite);
            window.removeEventListener('terminal-clear', handleClear);
            term.dispose();

            if (socketRef && socketRef.current) {
                socketRef.current.off("terminal:data", handleTerminalData);
            }
        };
    }, [socketRef]); // Re-run if socketRef changes (it's a ref so it might not trigger, but parent keeps it stable)

    return <div className="terminal-container" ref={terminalRef} />;
};

export default TerminalComponent;
