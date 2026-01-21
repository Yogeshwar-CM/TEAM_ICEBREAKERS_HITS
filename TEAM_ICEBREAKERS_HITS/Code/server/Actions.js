
const ACTIONS = {
  JOIN: "join",
  JOINED: "joined",
  DISCONNECTED: "disconnected",
  SYNC_CODE: "sync-code",
  CODE_CHANGE: "code-change",
  RECOMMEND_CODE: "recommend_code",
  COMPILE_CODE: "compile-code",
  RECOMMEND_RESULT: "recommend-result",
  COMPILATION_RESULT: "compilation-result",
  GENERATE_CODE: "generate-code",
  CODE_GENERATION_RESULT: "code-generation-result",
  // File tree actions
  FILE_TREE_UPDATE: "file-tree-update",
  FILE_CREATE: "file-create",
  FILE_DELETE: "file-delete",
  FILE_RENAME: "file-rename",
  FOLDER_CREATE: "folder-create",
  ACTIVE_FILE_CHANGE: "active-file-change",
  SYNC_FILE_TREE: "sync-file-tree",
};

module.exports = ACTIONS;
