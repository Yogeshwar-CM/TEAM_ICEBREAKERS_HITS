import React, { useEffect, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { ACTIONS } from "../Actions";
import { initSocket } from "../Socket";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import Client from "./Client";
import debounce from "lodash.debounce";
import { Tooltip, OverlayTrigger } from "react-bootstrap"; // For tooltips
import Spinner from "react-bootstrap/Spinner"; // For loading spinner

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [compilationResult, setCompilationResult] = useState(null);
  const [language, setLanguage] = useState("javascript");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false); // For loading state
  const codeRef = useRef("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [recommendedCode, setRecommendedCode] = useState("");
  const editorRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const socketRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        socketRef.current = await initSocket();
        console.log("Socket connected");

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

        socketRef.current.on(ACTIONS.JOINED, ({ clients, username, code }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
          }
          setClients(clients);

          if (editorRef.current) {
            editorRef.current.setValue(code);
            codeRef.current = code;
          }

          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
          });
        });

        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} left the room`);
          setClients((prev) =>
            prev.filter((client) => client.socketId !== socketId)
          );
        });

        socketRef.current.on(ACTIONS.COMPILATION_RESULT, (result) => {
          setCompilationResult(result.output);
          setLoading(false); // End loading state
        });

        socketRef.current.on(ACTIONS.CODE_GENERATION_RESULT, (result) => {
          const code = result.code.trim().split("\n").slice(1, -1).join("\n"); // Remove first and last line

          setGeneratedCode(code);
          console.log("Processed Generated Code:", code);

          if (editorRef.current) {
            editorRef.current.setValue(code);
            codeRef.current = code;

            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
              roomId,
              code: code,
            });
          }
          setLoading(false); // End loading state
        });

        socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
          console.log("Code received from socket:", code);
          if (codeRef.current !== code) {
            codeRef.current = code;
            if (editorRef.current && editorRef.current.getValue() !== code) {
              editorRef.current.setValue(code);
            }
          }
        });

        socketRef.current.on(ACTIONS.RECOMMEND_RESULT, (result) => {
          const recommendations = result.recommendations
            .trim()
            .split("\n")
            .slice(1, -1)
            .join("\n"); // Remove first and last line

          setRecommendedCode(recommendations);
          console.log("Processed Recommended Code:", recommendations);

          if (editorRef.current) {
            editorRef.current.setValue(recommendations);
            codeRef.current = recommendations;

            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
              roomId,
              code: recommendations,
            });
          }
          setLoading(false); // End loading state
        });
      } catch (error) {
        console.error("Socket initialization error:", error);
        toast.error("Failed to initialize socket connection.");
        navigate("/");
      }
    };

    init();

    return () => {
      socketRef.current && socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
      socketRef.current.off(ACTIONS.COMPILATION_RESULT);
      socketRef.current.off(ACTIONS.CODE_GENERATION_RESULT);
      socketRef.current.off(ACTIONS.CODE_CHANGE);
      socketRef.current.off(ACTIONS.RECOMMEND_RESULT);
    };
  }, [location.state?.username, roomId, navigate]);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success(`Room ID copied`);
    } catch (error) {
      console.log(error);
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = () => {
    navigate("/");
  };

  const handleCompile = () => {
    if (codeRef.current) {
      socketRef.current.emit(ACTIONS.COMPILE_CODE, {
        code: codeRef.current,
        language: language,
      });
    }
  };

  const handlePromptSubmit = () => {
    setLoading(true);
    try {
      socketRef.current.emit(ACTIONS.GENERATE_CODE, {
        prompt: prompt,
        language: language,
      });
      setPrompt("");
    } catch (error) {
      console.error("Error sending prompt:", error);
      toast.error("Failed to send prompt. Please try again.");
      setLoading(false);
    }
  };

  const handleRecommend = () => {
    setLoading(true);
    try {
      socketRef.current.emit(ACTIONS.RECOMMEND_CODE, {
        code: codeRef.current,
        language: language,
      });
    } catch (error) {
      console.error("Error sending recommendation request:", error);
      toast.error("Failed to request recommendation. Please try again.");
      setLoading(false);
    }
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    const handleEditorChange = debounce(() => {
      const newCode = editor.getValue();
      if (codeRef.current !== newCode) {
        codeRef.current = newCode;
        socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code: newCode });
      }
    }, 500);

    editor.onDidChangeModelContent(handleEditorChange);
  };

  return (
    <div className="container-fluid vh-100 bg-dark text-light position-relative border border-secondary">
      {loading && (
        <div className="loading-overlay d-flex justify-content-center align-items-center">
          <Spinner animation="border" size="lg" />
        </div>
      )}
      <div className="row h-100">
        <div className="col-12 d-flex flex-column h-100">
          <div className="d-flex align-items-center p-2 bg-dark flex-wrap border-bottom border-secondary">
            <img
              src="/images/ICEBREAKERS.png"
              alt="Logo"
              className="img-fluid"
              style={{ maxWidth: "150px" }}
            />
            <div className="d-flex flex-grow-1 mx-3 flex-wrap">
              {clients.map((client) => (
                <Client key={client.socketId} username={client.username} />
              ))}
            </div>
            <div className="d-flex align-items-center flex-wrap">
              <OverlayTrigger
                placement="bottom"
                overlay={<Tooltip id="copy-tooltip">Copy Room ID</Tooltip>}
              >
                <button
                  className="btn btn-link text-light"
                  onClick={copyRoomId}
                >
                  <i className="fas fa-copy"></i>
                </button>
              </OverlayTrigger>
              <OverlayTrigger
                placement="bottom"
                overlay={<Tooltip id="leave-tooltip">Leave Room</Tooltip>}
              >
                <button
                  className="btn btn-link text-light ms-2"
                  onClick={leaveRoom}
                >
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </OverlayTrigger>
              <OverlayTrigger
                placement="bottom"
                overlay={
                  <Tooltip id="recommend-tooltip">Recommend Code</Tooltip>
                }
              >
                <button
                  className="btn btn-link text-light ms-2"
                  onClick={handleRecommend}
                >
                  <i className="fas fa-lightbulb"></i>
                </button>
              </OverlayTrigger>
              <select
                className="form-select ms-2 bg-dark text-light border border-secondary"
                style={{ width: "auto" }}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="c">C</option>
                <option value="cpp">C++</option>
              </select>
              <button className="btn btn-light ms-2" onClick={handleCompile}>
                <i className="fas fa-play"></i>
              </button>
            </div>
          </div>
          <div className="row flex-grow-1">
            <div className="col-12 col-md-8 p-2 d-flex flex-column">
              <MonacoEditor
                height="100%"
                language={language}
                theme="vs-dark"
                value={codeRef.current}
                onMount={handleEditorMount}
                options={{ fontSize: 18 }}
              />
            </div>
            <div className="col-12 col-md-4 p-2 bg-dark border-start border-secondary d-flex flex-column">
              <div className="d-flex align-items-center mb-2">
                <input
                  type="text"
                  className="form-control bg-dark text-white me-2"
                  id="cr"
                  placeholder="Enter prompt for code generation"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <button className="btn btn-light" onClick={handlePromptSubmit}>
                  <i className="fas fa-cogs"></i>
                </button>
              </div>
              {compilationResult && (
                <div className="alert alert-dark border border-secondary">
                  {compilationResult}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorPage;
