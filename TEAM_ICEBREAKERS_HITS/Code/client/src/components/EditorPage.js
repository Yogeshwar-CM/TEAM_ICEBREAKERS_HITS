import React, { useEffect, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { ACTIONS } from "../Actions";
import { initSocket } from "../Socket";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import Client from "./Client";
import FileTree from "./FileTree";
import TerminalComponent from "./TerminalComponent";
import MagicPanel from "./MagicPanel";
import debounce from "lodash.debounce";
import { Tooltip, OverlayTrigger } from "react-bootstrap";
import Spinner from "react-bootstrap/Spinner";

// Default file tree structure
const DEFAULT_FILE_TREE = [
  {
    name: "src",
    type: "folder",
    children: [
      { name: "main.js", type: "file", content: "// Welcome to CodeCollab!\n// Start coding here...\n\nconsole.log('Hello, World!');" },
      { name: "utils.js", type: "file", content: "// Utility functions\n\nfunction add(a, b) {\n  return a + b;\n}\n" },
    ],
  },
  { name: "README.md", type: "file", content: "# My Project\n\nWelcome to the collaborative code editor!" },
];

// Language detection based on file extension
const getLanguageFromFile = (fileName) => {
  if (!fileName) return "javascript";
  const ext = fileName.split(".").pop().toLowerCase();
  const langMap = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    txt: "plaintext",
  };
  return langMap[ext] || "javascript";
};

function EditorPage() {
  const [clients, setClients] = useState([]);
  const editorRef = useRef(null);
  const terminalRef = useRef(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const codeRef = useRef("");
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  // File system state
  const [fileTree, setFileTree] = useState(DEFAULT_FILE_TREE);
  const [activeFile, setActiveFile] = useState("src/main.js");
  const [openTabs, setOpenTabs] = useState(["src/main.js"]);
  const [fileContents, setFileContents] = useState({});
  const [aiChat, setAiChat] = useState([{ role: "system", content: "Hi! I'm your AI coding assistant. Ask me anything about your code!" }]);

  // State for Magic Panel (debounced code updates)
  const [magicCode, setMagicCode] = useState("");

  const socketRef = useRef(null);

  // Suppress ResizeObserver error
  const consoleError = console.error;
  console.error = (...args) => {
    if (args[0] && args[0].includes("ResizeObserver loop completed")) return;
    consoleError(...args);
  };

  const getFileContent = (tree, path) => {
    const parts = path.split("/");
    let current = tree;
    for (const part of parts) {
      const found = current.find((item) => item.name === part);
      if (!found) return "";
      if (found.type === "file") return found.content || "";
      current = found.children || [];
    }
    return "";
  };

  const updateFileContent = (tree, path, content) => {
    const parts = path.split("/");
    const fileName = parts.pop();
    const updateRecursive = (items, remainingParts) => {
      if (remainingParts.length === 0) {
        return items.map((item) =>
          item.name === fileName ? { ...item, content } : item
        );
      }
      const [current, ...rest] = remainingParts;
      return items.map((item) => {
        if (item.name === current && item.children) {
          return { ...item, children: updateRecursive(item.children, rest) };
        }
        return item;
      });
    };
    return updateRecursive(tree, parts);
  };

  const handleFileSelect = (filePath) => {
    if (activeFile && editorRef.current) {
      const currentContent = editorRef.current.getValue();
      setFileContents((prev) => ({ ...prev, [activeFile]: currentContent }));
      setFileTree((prev) => updateFileContent(prev, activeFile, currentContent));
    }
    setActiveFile(filePath);
    if (!openTabs.includes(filePath)) {
      setOpenTabs((prev) => [...prev, filePath]);
    }
    const content = fileContents[filePath] || getFileContent(fileTree, filePath);
    if (editorRef.current) {
      editorRef.current.setValue(content);
      codeRef.current = content;
      setMagicCode(content); // Update magic panel immediately on file switch
    }
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.ACTIVE_FILE_CHANGE, { roomId, filePath });
    }
  };

  const handleTabClose = (filePath, e) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t !== filePath);
    setOpenTabs(newTabs);
    if (activeFile === filePath && newTabs.length > 0) {
      handleFileSelect(newTabs[newTabs.length - 1]);
    }
  };

  const handleFileTreeChange = (newTree) => {
    setFileTree(newTree);
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.FILE_TREE_UPDATE, { roomId, fileTree: newTree });
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        socketRef.current = await initSocket();

        const handleErrors = (err) => {
          console.log("Error", err);
          toast.error("Socket connection failed, Try again later");
          navigate("/");
        };

        socketRef.current.on("connect_error", handleErrors);
        socketRef.current.on("connect_failed", handleErrors);

        socketRef.current.emit(ACTIONS.JOIN, {
          roomId,
          username: location.state?.username,
        });

        socketRef.current.on(ACTIONS.JOINED, ({ clients, username, code, fileTree: syncedTree }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
          }
          setClients(clients);
          if (syncedTree) setFileTree(syncedTree);

          const initialContent = getFileContent(fileTree, activeFile);
          if (editorRef.current) {
            editorRef.current.setValue(code || initialContent);
            codeRef.current = code || initialContent;
            setMagicCode(code || initialContent);
          }
          if (code) {
            socketRef.current.emit(ACTIONS.SYNC_CODE, { code: codeRef.current });
          }
        });

        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} left the room`);
          setClients((prev) => prev.filter((client) => client.socketId !== socketId));
        });

        socketRef.current.on(ACTIONS.FILE_TREE_UPDATE, ({ fileTree: newTree }) => {
          setFileTree(newTree);
        });

        socketRef.current.on(ACTIONS.COMPILATION_RESULT, (result) => {
          setLoading(false);
          const event = new CustomEvent('terminal-write', { detail: result.output || result.error });
          window.dispatchEvent(event);
        });

        socketRef.current.on(ACTIONS.CODE_GENERATION_RESULT, (result) => {
          const code = result.code.trim().split("\n").slice(1, -1).join("\n");
          if (editorRef.current) {
            editorRef.current.setValue(code);
            codeRef.current = code;
            setMagicCode(code);
            socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code });
          }
          setLoading(false);
          setAiChat(prev => [...prev, { role: "assistant", content: "I've generated the code for you!" }]);
        });

        socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
          if (codeRef.current !== code) {
            codeRef.current = code;
            setMagicCode(code); // Remote changes update magic panel
            if (editorRef.current && editorRef.current.getValue() !== code) {
              editorRef.current.setValue(code);
            }
          }
        });

      } catch (error) {
        console.error("Socket initialization error:", error);
        toast.error("Failed to initialize socket connection.");
        navigate("/");
      }
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.COMPILATION_RESULT);
        socketRef.current.off(ACTIONS.CODE_GENERATION_RESULT);
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.FILE_TREE_UPDATE);
      }
    };
  }, []);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success(`Room ID copied`);
    } catch (error) {
      toast.error("Unable to copy the room ID");
    }
  };

  const handleCompile = () => {
    if (codeRef.current) {
      setLoading(true);
      window.dispatchEvent(new CustomEvent('terminal-clear'));
      window.dispatchEvent(new CustomEvent('terminal-write', { detail: 'Compiling...\r\n' }));

      socketRef.current.emit(ACTIONS.COMPILE_CODE, {
        code: codeRef.current,
        language: getLanguageFromFile(activeFile),
      });
    }
  };

  const handlePromptSubmit = () => {
    setLoading(true);
    setAiChat(prev => [...prev, { role: "user", content: prompt }]);
    socketRef.current.emit(ACTIONS.GENERATE_CODE, {
      prompt: prompt,
      language: getLanguageFromFile(activeFile),
    });
    setPrompt("");
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    const initialContent = getFileContent(fileTree, activeFile);
    editor.setValue(initialContent);
    codeRef.current = initialContent;
    setMagicCode(initialContent);

    const handleEditorChange = debounce(() => {
      const newCode = editor.getValue();
      if (codeRef.current !== newCode) {
        codeRef.current = newCode;
        setMagicCode(newCode); // Update magic panel
        setFileContents((prev) => ({ ...prev, [activeFile]: newCode }));
        socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code: newCode });
      }
    }, 500);

    editor.onDidChangeModelContent(handleEditorChange);
  };

  return (
    <div className="container-fluid vh-100 d-flex flex-column bg-dark text-light p-0 m-0" style={{ overflow: "hidden" }}>
      {loading && (
        <div className="loading-overlay d-flex justify-content-center align-items-center">
          <Spinner animation="border" size="lg" />
        </div>
      )}

      {/* Top Bar */}
      <div className="d-flex align-items-center px-3 py-2 bg-[#252526] border-bottom border-[#333]" style={{ backgroundColor: '#252526', height: '50px' }}>
        <img src="/images/ICEBREAKERS.png" alt="Logo" style={{ height: "24px", marginRight: "16px" }} />
        <div className="d-flex flex-grow-1 mx-3 gap-2">
          <div className="d-flex align-items-center bg-[#3c3c3c] px-2 py-1 rounded" style={{ fontSize: '12px', backgroundColor: '#3c3c3c' }}>
            <span className="text-muted me-2">Room:</span>
            <span className="font-monospace">{roomId}</span>
            <button className="btn btn-link p-0 ms-2 text-[#ccc]" onClick={copyRoomId} title="Copy ID">
              <i className="fas fa-copy"></i>
            </button>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="clients-list d-flex me-3">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>

          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleCompile} style={{ backgroundColor: '#007acc', border: 'none' }}>
            <i className="fas fa-play" style={{ fontSize: '10px' }}></i> <span>Run</span>
          </button>

          <button className="btn btn-danger d-flex align-items-center gap-2" onClick={() => navigate('/')} style={{ backgroundColor: '#d11', border: 'none' }}>
            <i className="fas fa-power-off"></i>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="d-flex flex-grow-1" style={{ overflow: "hidden", height: 'calc(100vh - 50px)' }}>

        {/* Sidebar (File Explorer) */}
        <div style={{ width: "240px", flexShrink: 0, backgroundColor: '#1e1e1e', borderRight: '1px solid #333' }}>
          <FileTree
            fileTree={fileTree}
            activeFile={activeFile}
            onFileSelect={handleFileSelect}
            onFileTreeChange={handleFileTreeChange}
          />
        </div>

        {/* Center (Editor + Terminal) */}
        <div className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
          <div className="file-tabs" style={{ height: '35px' }}>
            {openTabs.map((tab) => (
              <button
                key={tab}
                className={`file-tab ${activeFile === tab ? "active" : ""}`}
                onClick={() => handleFileSelect(tab)}
              >
                <i className="fas fa-file-code me-2" style={{ fontSize: '12px', color: '#75beff' }}></i>
                <span>{tab.split("/").pop()}</span>
                <span className="close-btn ms-2" onClick={(e) => handleTabClose(tab, e)}>×</span>
              </button>
            ))}
          </div>

          <div className="flex-grow-1 position-relative">
            <MonacoEditor
              height="100%"
              language={getLanguageFromFile(activeFile)}
              theme="vs-dark"
              onMount={handleEditorMount}
              options={{
                fontSize: 14,
                fontFamily: 'Fira Code, Consolas, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 10 },
              }}
            />
          </div>

          <div style={{ height: "250px", borderTop: '1px solid #333', backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column' }}>
            <div className="d-flex align-items-center px-3 py-1 bg-[#252526]" style={{ backgroundColor: '#252526', fontSize: '12px', borderBottom: '1px solid #333' }}>
              <span className="text-uppercase font-weight-bold" style={{ cursor: 'pointer', borderBottom: '1px solid #fff' }}>Terminal</span>
              <span className="mx-3 text-muted" style={{ cursor: 'pointer' }}>Output</span>
              <span className="text-muted" style={{ cursor: 'pointer' }}>Debug Console</span>
              <div className="ms-auto">
                <i className="fas fa-chevron-up text-muted" style={{ cursor: 'pointer' }}></i>
              </div>
            </div>
            <div className="flex-grow-1 position-relative">
              <TerminalComponent socketRef={socketRef} />
            </div>
          </div>
        </div>

        {/* Right Panel (AI Chat + Magic Panel) */}
        <div className="d-flex flex-column" style={{ width: "300px", flexShrink: 0, backgroundColor: '#1e1e1e', borderLeft: '1px solid #333' }}>
          <div className="p-3 border-bottom border-[#333]" style={{ backgroundColor: '#252526', color: '#ccc' }}>
            <i className="fas fa-robot me-2"></i> AI Assistant
          </div>

          <div className="flex-grow-1 p-3 overflow-auto d-flex flex-column gap-3">
            {aiChat.map((msg, idx) => (
              <div key={idx} className={`d-flex ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                <div style={{
                  maxWidth: '90%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  backgroundColor: msg.role === 'user' ? '#0e639c' : '#ffffff11',
                  color: '#fff'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-top border-[#333]">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Ask AI for code..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePromptSubmit()}
                style={{ backgroundColor: '#3c3c3c', border: '1px solid #333', color: '#fff', fontSize: '13px' }}
              />
              <button className="btn btn-primary" onClick={handlePromptSubmit}>
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>

          {/* MAGIC PANEL: Automatically shows context-aware tools */}
          <MagicPanel code={magicCode} activeLine={0} roomId={roomId} socketRef={socketRef} />
        </div>

      </div>
    </div>
  );
}

export default EditorPage;
