"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AnsiToHtml from "ansi-to-html";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  TestTube2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { TestCaseResult, TestRunResult } from "@/lib/testResults";

interface TestResultsLogProps {
  result: TestRunResult | null;
  onOpenTrace: (file: string, line: number, column?: number) => void;
  onRerunFailed: () => void;
}

const ansiOptions = {
  escapeXML: true,
  newline: true,
  stream: false,
};

export function TestResultsLog({
  result,
  onOpenTrace,
  onRerunFailed,
}: TestResultsLogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedCases, setExpandedCases] = useState<string[]>([]);
  const firstFailureRef = useRef<HTMLDivElement | null>(null);
  const converter = useMemo(() => new AnsiToHtml(ansiOptions), []);

  useEffect(() => {
    if (!result) {
      return;
    }

    setIsOpen(true);
    setExpandedCases(
      result.cases
        .filter((testCase) => testCase.status === "failed")
        .map((testCase) => testCase.id)
    );
  }, [result?.startedAt, result]);

  useEffect(() => {
    if (!result || result.summary.failed === 0) {
      return;
    }

    requestAnimationFrame(() => {
      firstFailureRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [result?.startedAt, result]);

  if (!result) {
    return null;
  }

  const failedCases = result.cases.filter((testCase) => testCase.status === "failed");

  const toggleCase = (testCaseId: string) => {
    setExpandedCases((current) =>
      current.includes(testCaseId)
        ? current.filter((caseId) => caseId !== testCaseId)
        : [...current, testCaseId]
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-lg border border-border/70 bg-background/70">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-terminal-bg text-terminal-cyan">
            <TestTube2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Test Results
            </p>
            <p className="font-mono text-xs text-foreground">
              {result.command}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-[10px] font-semibold text-emerald-300">
            {result.summary.passed} passed
          </span>
          <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 font-mono text-[10px] font-semibold text-rose-300">
            {result.summary.failed} failed
          </span>
          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t border-border/70 px-3 pb-3 pt-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-[11px] text-muted-foreground">
              {result.mode === "failed-only" ? "Failed tests rerun" : "Full test sweep"}
              {result.summary.filtered > 0 ? ` • ${result.summary.filtered} filtered` : ""}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={failedCases.length === 0}
              onClick={onRerunFailed}
              className="h-7 gap-1.5 font-mono text-[11px]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Rerun Failed
            </Button>
          </div>

          <div className="max-h-72 space-y-2 overflow-auto pr-1">
            {result.cases.map((testCase, index) => {
              const isFailed = testCase.status === "failed";
              const isExpanded = expandedCases.includes(testCase.id);

              return (
                <div
                  key={testCase.id}
                  ref={index === 0 || !firstFailureRef.current ? (isFailed ? firstFailureRef : null) : null}
                  className={cn(
                    "overflow-hidden rounded-md border",
                    isFailed
                      ? "border-rose-500/30 bg-rose-500/5"
                      : "border-emerald-500/20 bg-emerald-500/5"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleCase(testCase.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {isFailed ? (
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-300" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[12px] font-semibold text-foreground">
                          {testCase.suite}::{testCase.name}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {testCase.durationMs} ms
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/60 px-3 py-3">
                      {testCase.failureMessage && (
                        <p className="mb-3 font-mono text-[11px] text-rose-200">
                          {testCase.failureMessage}
                        </p>
                      )}

                      {testCase.diff && <TestDiffView diff={testCase.diff} />}

                      <div className="mb-3 rounded-md border border-border/60 bg-black/30 p-3 font-mono text-[11px] leading-5 text-foreground">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: converter.toHtml(testCase.stdout),
                          }}
                        />
                      </div>

                      {testCase.trace.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Stack Trace
                          </div>
                          {testCase.trace.map((trace) => (
                            <button
                              key={`${testCase.id}-${trace.file}-${trace.line}-${trace.column}`}
                              type="button"
                              onClick={() => onOpenTrace(trace.file, trace.line, trace.column)}
                              className="flex w-full items-center justify-between rounded-md border border-border/60 bg-background/80 px-3 py-2 text-left font-mono text-[11px] text-terminal-cyan transition-colors hover:border-terminal-cyan/50 hover:bg-terminal-cyan/5"
                            >
                              <span className="truncate">
                                {trace.file}:{trace.line}:{trace.column ?? 1}
                              </span>
                              <span className="ml-3 shrink-0 text-[10px] text-muted-foreground">
                                {trace.label ?? "Open in editor"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TestDiffView({ diff }: { diff: TestCaseResult["diff"] }) {
  if (!diff) {
    return null;
  }

  return (
    <div className="mb-3 grid gap-2 md:grid-cols-2">
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10">
        <div className="border-b border-emerald-500/20 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
          Expected
        </div>
        <pre className="overflow-auto px-3 py-2 font-mono text-[11px] text-emerald-100">
          {diff.expected}
        </pre>
      </div>
      <div className="rounded-md border border-rose-500/30 bg-rose-500/10">
        <div className="border-b border-rose-500/20 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200">
          Actual
        </div>
        <pre className="overflow-auto px-3 py-2 font-mono text-[11px] text-rose-100">
          {diff.actual}
        </pre>
      </div>
    </div>
  );
}