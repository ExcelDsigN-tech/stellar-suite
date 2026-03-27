import { DragEvent, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  FolderPlus,
  Trash2,
  Pencil,
} from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import { FileNode } from "@/lib/sample-contracts";
import {
  DROP_LIMIT_BYTES,
  mapDroppedEntriesToTree,
  mergeFileNodes,
  readDropPayload,
} from "@/lib/file-drop";

interface FileExplorerProps {
  files?: FileNode[];
  onFileSelect?: (path: string[], file: FileNode) => void;
  activeFilePath?: string[];
  onCreateFile?: (parentPath: string[], name: string) => void;
  onCreateFolder?: (parentPath: string[], name: string) => void;
  onDeleteNode?: (path: string[]) => void;
  onRenameNode?: (path: string[], newName: string) => void;
  isDragActive?: boolean;
  onDragEnter?: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (event: DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void | Promise<void>;
}

function InlineInput({
  onSubmit,
  onCancel,
  placeholder,
  depth,
  initialValue = "",
}: {
  onSubmit: (value: string) => void;
  onCancel: () => void;
  placeholder: string;
  depth: number;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div
      className="flex items-center px-2 py-0.5"
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSubmit(value.trim());
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => {
          if (value.trim()) onSubmit(value.trim());
          else onCancel();
        }}
        placeholder={placeholder}
        className="w-full bg-muted border border-primary rounded px-1.5 py-0.5 text-xs font-mono text-foreground outline-none"
      />
    </div>
  );
}

function FileTreeItem({
  node,
  depth,
  path,
  onFileSelect,
  activeFilePath,
  onCreateFile,
  onCreateFolder,
  onDeleteNode,
  onRenameNode,
}: {
  node: FileNode;
  depth: number;
  path: string[];
  onFileSelect: (path: string[], file: FileNode) => void;
  activeFilePath: string[];
  onCreateFile: (parentPath: string[], name: string) => void;
  onCreateFolder: (parentPath: string[], name: string) => void;
  onDeleteNode: (path: string[]) => void;
  onRenameNode: (path: string[], newName: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [renaming, setRenaming] = useState(false);

  const currentPath = [...path, node.name];
  const isActive = activeFilePath.join("/") === currentPath.join("/");

  const handleDelete = () => {
    const label = node.type === "folder" ? "folder" : "file";
    if (window.confirm(`Are you sure you want to delete this ${label}?`)) {
      onDeleteNode(currentPath);
    }
  };

  if (renaming) {
    return (
      <InlineInput
        depth={depth}
        placeholder={node.name}
        initialValue={node.name}
        onSubmit={(newName) => {
          if (newName !== node.name) onRenameNode(currentPath, newName);
          setRenaming(false);
        }}
        onCancel={() => setRenaming(false)}
      />
    );
  }

  if (node.type === "folder") {
    return (
      <div>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className="group flex items-center w-full hover:bg-sidebar-accent transition-colors"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              <button
                onClick={() => setIsOpen(!isOpen)}
                onDoubleClick={() => setRenaming(true)}
                className="flex items-center gap-1 flex-1 px-2 py-1 text-sm min-w-0"
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                {isOpen ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-primary" />
                )}
                <span className="truncate font-mono text-sidebar-foreground">
                  {node.name}
                </span>
              </button>

              <div className="hidden group-hover:flex items-center shrink-0 pr-1 gap-0.5">
                <button
                  onClick={() => {
                    setIsOpen(true);
                    setCreating("file");
                  }}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="New File"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setIsOpen(true);
                    setCreating("folder");
                  }}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="New Folder"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setRenaming(true)}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Rename"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent>
            <ContextMenuItem
              onClick={() => {
                setIsOpen(true);
                setCreating("file");
              }}
            >
              New File
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                setIsOpen(true);
                setCreating("folder");
              }}
            >
              New Folder
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setRenaming(true)}>
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={handleDelete}>Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {isOpen && (
          <div>
            {creating && (
              <InlineInput
                depth={depth + 1}
                placeholder={creating === "file" ? "filename.rs" : "folder_name"}
                onSubmit={(name) => {
                  if (creating === "file") onCreateFile(currentPath, name);
                  else onCreateFolder(currentPath, name);
                  setCreating(null);
                }}
                onCancel={() => setCreating(null)}
              />
            )}

            {node.children?.map((child) => (
              <FileTreeItem
                key={child.name}
                node={child}
                depth={depth + 1}
                path={currentPath}
                onFileSelect={onFileSelect}
                activeFilePath={activeFilePath}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onDeleteNode={onDeleteNode}
                onRenameNode={onRenameNode}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const getFileColor = (name: string) => {
    if (name.endsWith(".rs")) return "text-warning";
    if (name.endsWith(".toml")) return "text-success";
    return "text-muted-foreground";
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`group flex items-center w-full transition-colors ${
            isActive
              ? "bg-editor-selection text-foreground"
              : "hover:bg-sidebar-accent text-sidebar-foreground"
          }`}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
        >
          <button
            onClick={() => onFileSelect(currentPath, node)}
            onDoubleClick={() => setRenaming(true)}
            className="flex items-center gap-1.5 flex-1 px-2 py-1 text-sm min-w-0"
          >
            <FileText
              className={`h-3.5 w-3.5 shrink-0 ${getFileColor(node.name)}`}
            />
            <span className="truncate font-mono">{node.name}</span>
          </button>

          <div className="hidden group-hover:flex items-center shrink-0 pr-1 gap-0.5">
            <button
              onClick={() => setRenaming(true)}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Rename"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={() => setRenaming(true)}>
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDelete}>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function FileExplorer({
  files: propFiles,
  onFileSelect,
  activeFilePath: propActiveFilePath,
  onCreateFile: propOnCreateFile,
  onCreateFolder: propOnCreateFolder,
  onDeleteNode: propOnDeleteNode,
  onRenameNode: propOnRenameNode,
  isDragActive: propIsDragActive,
  onDragEnter: propOnDragEnter,
  onDragOver: propOnDragOver,
  onDragLeave: propOnDragLeave,
  onDrop: propOnDrop,
}: FileExplorerProps) {
  const {
    files: storeFiles,
    activeTabPath,
    setFiles,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    addTab,
    setMobilePanel,
    isExplorerDragActive,
    setTerminalOutput,
    setTerminalExpanded,
    setIsExplorerDragActive,
  } = useWorkspaceStore();
  const files = propFiles ?? storeFiles;
  const activeFilePath = propActiveFilePath ?? activeTabPath;
  const handleCreateFile = propOnCreateFile ?? createFile;
  const handleCreateFolder = propOnCreateFolder ?? createFolder;
  const handleDeleteNode = propOnDeleteNode ?? deleteNode;
  const handleRenameNode = propOnRenameNode ?? renameNode;
  const isDragActive = propIsDragActive ?? isExplorerDragActive;

  const [creatingRoot, setCreatingRoot] = useState<"file" | "folder" | null>(
    null
  );

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (propOnDragEnter) {
      propOnDragEnter(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setIsExplorerDragActive(true);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (propOnDragOver) {
      propOnDragOver(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsExplorerDragActive(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (propOnDragLeave) {
      propOnDragLeave(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setIsExplorerDragActive(false);
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    if (propOnDrop) {
      await propOnDrop(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setIsExplorerDragActive(false);

    try {
      const dropped = await readDropPayload(event.dataTransfer);
      const { nodes, uploadedFiles, skippedFiles, totalBytes } = await mapDroppedEntriesToTree(dropped);

      if (uploadedFiles === 0) {
        setTerminalExpanded(true);
        setTerminalOutput((prev) => `${prev}Upload skipped. No eligible files found (limit ${(DROP_LIMIT_BYTES / (1024 * 1024)).toFixed(0)} MB).\r\n`);
        return;
      }

      setFiles(mergeFileNodes(files, nodes));
      setTerminalExpanded(true);
      setTerminalOutput((prev) => `${prev}Uploaded ${uploadedFiles} file${uploadedFiles === 1 ? "" : "s"} (${(totalBytes / 1024).toFixed(1)} KB).\r\n`);
      if (skippedFiles > 0) {
        setTerminalOutput((prev) => `${prev}Skipped ${skippedFiles} file${skippedFiles === 1 ? "" : "s"} (ignored folders or upload limit).\r\n`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      setTerminalExpanded(true);
      setTerminalOutput((prev) => `${prev}Upload failed: ${message}\r\n`);
    }
  };

  const internalFileSelect = (path: string[], file: FileNode) => {
    if (onFileSelect) {
      onFileSelect(path, file);
    } else {
      if (file.type !== "file") return;
      addTab(path, file.name);
      setMobilePanel("none");
    }
  };

  return (
    <div
      id="tour-explorer"
      className={`h-full bg-sidebar flex flex-col ${isDragActive ? "ring-2 ring-primary/60 ring-inset" : ""}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-sidebar-border flex items-center justify-between">
        <span>Explorer</span>
        <div className="flex gap-0.5">
          <button
            onClick={() => setCreatingRoot("file")}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="New File"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setCreatingRoot("folder")}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="New Folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {creatingRoot && (
          <InlineInput
            depth={0}
            placeholder={creatingRoot === "file" ? "filename.rs" : "folder_name"}
            onSubmit={(name) => {
              if (creatingRoot === "file") handleCreateFile([], name);
              else handleCreateFolder([], name);
              setCreatingRoot(null);
            }}
            onCancel={() => setCreatingRoot(null)}
          />
        )}

        {files.map((node) => (
          <FileTreeItem
            key={node.name}
            node={node}
            depth={0}
            path={[]}
            onFileSelect={internalFileSelect}
            activeFilePath={activeFilePath}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteNode={handleDeleteNode}
            onRenameNode={handleRenameNode}
          />
        ))}
      </div>
    </div>
  );
}