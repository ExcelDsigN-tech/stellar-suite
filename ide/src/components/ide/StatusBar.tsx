import { useMathSafetyStore } from "@/store/useMathSafetyStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { type NetworkKey } from "@/lib/networkConfig";
import { GitBranch, Save } from "lucide-react";

import { NetworkSelector } from "./NetworkSelector";

interface StatusBarProps {
  language?: string;
  line?: number;
  col?: number;
  network?: NetworkKey;
  unsavedCount?: number;
}

export function StatusBar({
  language: propLanguage,
  line: propLine,
  col: propCol,
  network: propNetwork,
  unsavedCount: propUnsavedCount,
}: StatusBarProps) {
  const {
    cursorPos,
    network,
    horizonUrl,
    customRpcUrl,
    customHeaders,
    setNetwork,
    setCustomRpcUrl,
    setCustomHeaders,
    unsavedFiles,
    files,
    activeTabPath,
  } = useWorkspaceStore();

  const { config, setConfig, setShowMathSafetyInfo } = useMathSafetyStore();

  const activeFile = files.find(
    (f) => f.name === activeTabPath[activeTabPath.length - 1],
  );
  const language = propLanguage || activeFile?.language || "rust";
  const line = propLine ?? cursorPos.line;
  const col = propCol ?? cursorPos.col;
  const currentNetwork = propNetwork ?? network;
  const currentUnsavedCount = propUnsavedCount ?? unsavedFiles.size;

  const toggleMathSafety = () => {
    setConfig({ enabled: !config.enabled });
  };
  return (
    <div className="flex flex-col bg-primary text-primary-foreground text-[10px] md:text-[11px] font-mono">
      <div className="flex items-center justify-between px-2 md:px-3 py-0.5">
        <div className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          <span className="hidden sm:inline">main</span>
        </div>
        <NetworkSelector
          network={currentNetwork}
          horizonUrl={horizonUrl}
          customRpcUrl={customRpcUrl}
          customHeaders={customHeaders}
          onNetworkChange={setNetwork}
          onCustomRpcUrlChange={setCustomRpcUrl}
          onCustomHeadersChange={setCustomHeaders}
        />
        <button
          onClick={toggleMathSafety}
          className="flex items-center gap-1 hover:bg-primary-foreground/20 px-2 py-1 rounded transition-colors"
          title={`Math Safety ${config.enabled ? "Enabled" : "Disabled"} (${config.sensitivity} sensitivity)`}
        >
          <span
            className={`w-3 h-3 rounded-full inline-block ${config.enabled ? "bg-green-400" : "bg-primary-foreground/30"}`}
          />
          <span className="hidden sm:inline">
            Math {config.enabled ? "On" : "Off"}
          </span>
        </button>
        {currentUnsavedCount > 0 && (
          <div className="flex items-center gap-1 text-primary-foreground/70">
            <Save className="h-2.5 w-2.5" />
            <span>{currentUnsavedCount} unsaved</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-0.5">
        <span>
          Ln {line}, Col {col}
        </span>
        <span className="hidden sm:inline">{language}</span>
        <span className="hidden md:inline">UTF-8</span>
      </div>
    </div>
  );
}
