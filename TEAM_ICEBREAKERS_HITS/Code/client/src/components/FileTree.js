import React, { useState } from "react";
import "./FileTree.css";

// Icons for files and folders
const FolderIcon = ({ isOpen }) => (
    <span className="file-icon">
        {isOpen ? "📂" : "📁"}
    </span>
);

const FileIcon = ({ name }) => {
    const ext = name.split(".").pop().toLowerCase();
    const icons = {
        js: "📜",
        jsx: "⚛️",
        ts: "📘",
        tsx: "⚛️",
        py: "🐍",
        java: "☕",
        c: "🔷",
        cpp: "🔷",
        html: "🌐",
        css: "🎨",
        json: "📋",
        md: "📝",
    };
    return <span className="file-icon">{icons[ext] || "📄"}</span>;
};

function FileTreeItem({ item, path, activeFile, onFileSelect, onCreateFile, onCreateFolder, onDelete, onRename, depth = 0 }) {
    const [isOpen, setIsOpen] = useState(true);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(item.name);
    const [showMenu, setShowMenu] = useState(false);

    const fullPath = path ? `${path}/${item.name}` : item.name;
    const isFolder = item.type === "folder";
    const isActive = activeFile === fullPath;

    const handleClick = () => {
        if (isFolder) {
            setIsOpen(!isOpen);
        } else {
            onFileSelect(fullPath);
        }
    };

    const handleRename = (e) => {
        e.preventDefault();
        if (newName && newName !== item.name) {
            onRename(fullPath, newName);
        }
        setIsRenaming(false);
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        setShowMenu(!showMenu);
    };

    return (
        <div className="file-tree-item">
            <div
                className={`file-tree-row ${isActive ? "active" : ""}`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
            >
                {isFolder ? (
                    <FolderIcon isOpen={isOpen} />
                ) : (
                    <FileIcon name={item.name} />
                )}

                {isRenaming ? (
                    <form onSubmit={handleRename} className="rename-form">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={handleRename}
                            autoFocus
                            className="rename-input"
                        />
                    </form>
                ) : (
                    <span className="file-name">{item.name}</span>
                )}

                {showMenu && (
                    <div className="context-menu">
                        {isFolder && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); onCreateFile(fullPath); setShowMenu(false); }}>
                                    + New File
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onCreateFolder(fullPath); setShowMenu(false); }}>
                                    + New Folder
                                </button>
                            </>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setShowMenu(false); }}>
                            ✏️ Rename
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(fullPath); setShowMenu(false); }} className="delete-btn">
                            🗑️ Delete
                        </button>
                    </div>
                )}
            </div>

            {isFolder && isOpen && item.children && (
                <div className="file-tree-children">
                    {item.children.map((child, index) => (
                        <FileTreeItem
                            key={`${fullPath}-${child.name}-${index}`}
                            item={child}
                            path={fullPath}
                            activeFile={activeFile}
                            onFileSelect={onFileSelect}
                            onCreateFile={onCreateFile}
                            onCreateFolder={onCreateFolder}
                            onDelete={onDelete}
                            onRename={onRename}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function FileTree({ fileTree, activeFile, onFileSelect, onFileTreeChange }) {
    const [newItemName, setNewItemName] = useState("");
    const [creatingIn, setCreatingIn] = useState(null);
    const [creatingType, setCreatingType] = useState(null);

    const findAndModify = (items, targetPath, modifier) => {
        return items.map((item) => {
            const currentPath = item.name;
            if (currentPath === targetPath || targetPath.startsWith(currentPath + "/")) {
                if (currentPath === targetPath) {
                    return modifier(item);
                }
                if (item.children) {
                    return {
                        ...item,
                        children: findAndModify(
                            item.children,
                            targetPath.replace(currentPath + "/", ""),
                            modifier
                        ),
                    };
                }
            }
            return item;
        });
    };

    const handleCreateFile = (folderPath) => {
        setCreatingIn(folderPath);
        setCreatingType("file");
        setNewItemName("");
    };

    const handleCreateFolder = (folderPath) => {
        setCreatingIn(folderPath);
        setCreatingType("folder");
        setNewItemName("");
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        const newItem = creatingType === "folder"
            ? { name: newItemName.trim(), type: "folder", children: [] }
            : { name: newItemName.trim(), type: "file", content: "" };

        let newTree;
        if (creatingIn) {
            newTree = findAndModify(fileTree, creatingIn, (folder) => ({
                ...folder,
                children: [...(folder.children || []), newItem],
            }));
        } else {
            newTree = [...fileTree, newItem];
        }

        onFileTreeChange(newTree);
        setCreatingIn(null);
        setNewItemName("");
    };

    const handleDelete = (path) => {
        const parts = path.split("/");
        const itemName = parts.pop();
        const parentPath = parts.join("/");

        let newTree;
        if (parentPath) {
            newTree = findAndModify(fileTree, parentPath, (folder) => ({
                ...folder,
                children: folder.children.filter((c) => c.name !== itemName),
            }));
        } else {
            newTree = fileTree.filter((item) => item.name !== itemName);
        }

        onFileTreeChange(newTree);
    };

    const handleRename = (path, newName) => {
        const parts = path.split("/");
        const oldName = parts.pop();
        const parentPath = parts.join("/");

        const renameItem = (items) => {
            return items.map((item) => {
                if (item.name === oldName) {
                    return { ...item, name: newName };
                }
                if (item.children) {
                    return { ...item, children: renameItem(item.children) };
                }
                return item;
            });
        };

        let newTree;
        if (parentPath) {
            newTree = findAndModify(fileTree, parentPath, (folder) => ({
                ...folder,
                children: renameItem(folder.children),
            }));
        } else {
            newTree = renameItem(fileTree);
        }

        onFileTreeChange(newTree);
    };

    return (
        <div className="file-tree">
            <div className="file-tree-header">
                <span>📁 Explorer</span>
                <div className="file-tree-actions">
                    <button onClick={() => handleCreateFile(null)} title="New File">+📄</button>
                    <button onClick={() => handleCreateFolder(null)} title="New Folder">+📁</button>
                </div>
            </div>

            {creatingIn !== null || creatingType ? (
                <form onSubmit={handleCreateSubmit} className="new-item-form">
                    <input
                        type="text"
                        placeholder={creatingType === "folder" ? "Folder name" : "File name"}
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        autoFocus
                        className="new-item-input"
                    />
                    <button type="submit">✓</button>
                    <button type="button" onClick={() => { setCreatingIn(null); setCreatingType(null); }}>✕</button>
                </form>
            ) : null}

            <div className="file-tree-content">
                {fileTree.map((item, index) => (
                    <FileTreeItem
                        key={`root-${item.name}-${index}`}
                        item={item}
                        path=""
                        activeFile={activeFile}
                        onFileSelect={onFileSelect}
                        onCreateFile={handleCreateFile}
                        onCreateFolder={handleCreateFolder}
                        onDelete={handleDelete}
                        onRename={handleRename}
                    />
                ))}
            </div>
        </div>
    );
}

export default FileTree;
