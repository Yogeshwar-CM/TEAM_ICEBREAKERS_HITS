import React, { useState, useEffect } from 'react';

const MagicPanel = ({ code, activeLine, roomId, socketRef }) => {
    const [tool, setTool] = useState(null);
    const [data, setData] = useState(null);

    // Analyze code to decide which tool to show
    useEffect(() => {
        if (!code) return;

        const lines = code.split('\n');
        // Default to the provided active line or just scan the whole file for "strong signals"
        // For demo purposes, scanning specific patterns is more robust.

        // 1. Check for Color Hex Codes (#ffffff, #000)
        const colorMatch = code.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i);
        if (colorMatch) {
            setTool('COLOR_PICKER');
            setData({ color: colorMatch[0] });
            return;
        }

        // 2. Check for Express Routes (app.get, router.post, etc.)
        // Matches: app.get('/users', ...
        const routeMatch = code.match(/(app|router)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/);
        if (routeMatch) {
            setTool('ROUTE_TESTER');
            setData({ method: routeMatch[2].toUpperCase(), path: routeMatch[3] });
            return;
        }

        // 3. Check for SQL/Mongo Queries (db.collection, SELECT *)
        if (code.includes('mongoose') || code.includes('db.collection')) {
            setTool('DB_VIEWER');
            return;
        }

        // Fallback: No magic tool needed
        setTool(null);
    }, [code, activeLine]);

    if (!tool) return null;

    return (
        <div className="magic-panel p-3 border-top border-[#333]" style={{ backgroundColor: '#1e1e1e', height: '200px', overflowY: 'auto' }}>
            <div className="d-flex align-items-center mb-2">
                <span className="badge bg-purple-500 text-white me-2" style={{ background: '#8a2be2' }}>✨ Magic UI</span>
                <span className="text-muted small text-uppercase">{tool.replace('_', ' ')}</span>
            </div>

            <div className="magic-content">
                {/* --- Tool: Color Picker --- */}
                {tool === 'COLOR_PICKER' && (
                    <div className="d-flex align-items-center gap-3 p-2 rounded" style={{ background: '#252526' }}>
                        <div
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                backgroundColor: data.color,
                                border: '2px solid #fff'
                            }}
                        />
                        <div>
                            <div className="text-white fw-bold">{data.color}</div>
                            <div className="text-muted small">Color Detected</div>
                        </div>
                    </div>
                )}

                {/* --- Tool: Route Tester (Mini Postman) --- */}
                {tool === 'ROUTE_TESTER' && (
                    <div className="p-2 rounded" style={{ background: '#252526' }}>
                        <div className="input-group mb-2">
                            <span className={`input-group-text text-white border-0 ${data.method === 'GET' ? 'bg-success' :
                                    data.method === 'POST' ? 'bg-warning' : 'bg-danger'
                                }`} style={{ fontSize: '10px' }}>{data.method}</span>
                            <input type="text" className="form-control bg-dark text-white border-0" value={`http://localhost:3000${data.path}`} readOnly />
                            <button className="btn btn-primary btn-sm">Send</button>
                        </div>
                        <div className="text-muted small text-center">
                            <i className="fas fa-info-circle me-1"></i>
                            Detected an API endpoint. Click Send to test it live.
                        </div>
                    </div>
                )}

                {/* --- Tool: DB Viewer --- */}
                {tool === 'DB_VIEWER' && (
                    <div className="p-2 rounded text-center" style={{ background: '#252526' }}>
                        <i className="fas fa-database mb-2 text-success" style={{ fontSize: '24px' }}></i>
                        <h6 className="text-white">Database Context Detected</h6>
                        <button className="btn btn-outline-success btn-sm w-100">Connect to MongoDB Viewer</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MagicPanel;
