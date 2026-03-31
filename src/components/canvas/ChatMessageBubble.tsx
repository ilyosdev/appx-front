import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, User, Sparkles, Eye, Check, Loader2, AlertCircle, AlertTriangle, RotateCcw, Pencil, FileText, Pencil as PencilIcon, Play, X as XIcon, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { rewriteStorageUrl } from "@/lib/api";
import type { LocalMessage, RecommendationItem, ScreenData } from "@/types/canvas";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RecommendationCards } from "./RecommendationCards";
import { ThinkingBlock } from "./ThinkingBlock";
import { ArtifactCard } from "./ArtifactCard";
import { EditSummaryCard } from "./EditSummaryCard";
import { ActionLogSection } from "./ActionLogSection";
import { PlanCard } from "../chat/PlanCard";
import type { PlanStep } from "@/stores/chatStore";

/** Blinking cursor shown at the end of streaming text */
function StreamingCursor() {
  return (
    <span
      className="inline-block w-[2px] h-[1em] bg-primary-400 ml-0.5 align-text-bottom"
      style={{ animation: "cursor-blink 1s step-end infinite" }}
    />
  );
}

interface ChatMessageBubbleProps {
  message: LocalMessage;
  onScreenClick?: (screenId: string) => void;
  progressMessages?: Map<string, unknown>;
  onGenerateRecommended?: (screenIds: string[]) => void;
  onDismissRecommendations?: (screenIds: string[]) => void;
  streamingStatus?: string;
  screens?: ScreenData[];
  onViewScreen?: (screenId: string) => void;
  onRetry?: () => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  liveActionLogs?: import("@/types/canvas").ActionLogEvent[];
  /** Called when user confirms a plan — triggers implementation in direct mode */
  onConfirmPlan?: (planContent: string) => void;
  /** Whether the plan is currently being implemented */
  isPlanImplementing?: boolean;
  /** Called when user wants to refine a plan */
  onRefinePlan?: (planId: string, feedback: string) => void;
  /** Called when user clicks Undo on an edit summary */
  onUndoEdit?: (screenId: string, versionId: string) => void;
}

export function ChatMessageBubble({
  message,
  onScreenClick,
  progressMessages: _progressMessages,
  onGenerateRecommended,
  onDismissRecommendations,
  streamingStatus: _streamingStatus,
  screens,
  onViewScreen,
  onRetry,
  onEditMessage,
  liveActionLogs,
  onConfirmPlan,
  isPlanImplementing,
  onRefinePlan,
  onUndoEdit,
}: ChatMessageBubbleProps) {
  // Skip progress messages - they are now shown in the floating bubble
  if (message.metadata?.type === "progress") {
    return null;
  }

  // Check if this is a recommendation message
  if (
    message.metadata?.type === "screen_suggestion" &&
    message.metadata.recommendations
  ) {
    return (
      <RecommendationCards
        recommendations={message.metadata.recommendations as {
          essential: RecommendationItem[];
          optional: RecommendationItem[];
        }}
        onGenerate={onGenerateRecommended || (() => {})}
        onDismiss={onDismissRecommendations || (() => {})}
      />
    );
  }

  // Check if this is a planned screens message (shows screens being generated)
  if (
    (message.metadata?.type as string) === "planned_screens" &&
    message.metadata?.screens
  ) {
    const plannedScreens = message.metadata!.screens as Array<{
      id: string;
      name: string;
      type: string;
      description: string;
      status: string;
    }>;

    // Derive live status for each planned screen from the screens prop
    const screenStatuses = plannedScreens.map((ps) => {
      const match = screens?.find(
        (s) => s.name.toLowerCase() === ps.name.toLowerCase()
      );
      let status: "pending" | "generating" | "completed" | "failed" = "pending";
      let screenId: string | undefined;
      if (match) {
        screenId = match.id;
        if (match.hasError) status = "failed";
        else if (match.isLoading) status = "generating";
        else if (match.htmlContent || match.reactCode || match.reactNativeCode || match.compiledHtml) status = "completed";
        else status = "pending";
      }
      return { ...ps, liveStatus: status, screenId };
    });

    const completedCount = screenStatuses.filter((s) => s.liveStatus === "completed").length;
    const totalCount = screenStatuses.length;
    const allDone = completedCount === totalCount;

    return (
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex gap-2"
      >
        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-surface-800 border border-surface-700">
          <Bot className="w-3.5 h-3.5 text-surface-400" />
        </div>
        <div className="flex-1 max-w-[85%]">
          <div className={cn(
            "px-3 py-2.5 rounded-xl text-sm bg-surface-800/80 border rounded-tl-sm transition-colors duration-300",
            allDone && totalCount > 0
              ? "border-green-500/20"
              : "border-surface-700/50"
          )}>
            <p className="text-surface-200 mb-2">{message.content}</p>

            {/* Screen list -- compact, clickable when completed */}
            <div className="flex flex-col gap-0.5">
              {screenStatuses.map((screen) => {
                const isClickable = screen.liveStatus === "completed" && screen.screenId;
                return (
                  <button
                    key={screen.id}
                    onClick={() => isClickable && onViewScreen?.(screen.screenId!)}
                    disabled={!isClickable}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-left w-full transition-colors",
                      isClickable
                        ? "hover:bg-surface-700/40 cursor-pointer group/row"
                        : "cursor-default"
                    )}
                  >
                    {screen.liveStatus === "completed" && (
                      <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                    )}
                    {screen.liveStatus === "failed" && (
                      <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                    )}
                    {(screen.liveStatus === "pending" || screen.liveStatus === "generating") && (
                      <span className="w-3 h-3 flex-shrink-0" />
                    )}

                    <span className={cn(
                      "truncate",
                      screen.liveStatus === "completed" ? "text-surface-200" : "text-surface-500"
                    )}>
                      {screen.name}
                    </span>
                    {screen.type && screen.type !== "custom" && (
                      <span className="text-[10px] text-surface-500 bg-surface-700/30 px-1.5 py-0.5 rounded flex-shrink-0">
                        {screen.type}
                      </span>
                    )}
                    {isClickable && (
                      <Eye className="w-3 h-3 text-surface-600 ml-auto flex-shrink-0 opacity-50 group-hover/row:opacity-100 transition-opacity" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Completion footer */}
            {allDone && totalCount > 0 && (
              <div className="mt-2 pt-2 border-t border-surface-700/30 flex items-center gap-1.5">
                <Check className="w-3 h-3 text-green-400" />
                <span className="text-[10px] text-green-400 font-medium">
                  All {totalCount} screens ready
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Reasoning/thinking message
  if (message.metadata?.type === "reasoning" && message.content) {
    return <ThinkingBlock text={message.content} />;
  }

  // Tool calls summary
  if ((message.metadata?.type as string) === "tool_calls" && message.metadata?.toolSummary) {
    const summary = message.metadata.toolSummary as { reads?: number; writes?: number; details?: string[] };
    const [showDetails, setShowDetails] = useState(false);
    return (
      <div className="ml-9 my-1">
        <button
          onClick={() => summary.details?.length && setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 text-[11px] text-surface-500 hover:text-surface-400 transition-colors"
        >
          {summary.reads ? <><FileText className="w-3 h-3" /> Read {summary.reads} file{summary.reads > 1 ? 's' : ''}</> : null}
          {summary.reads && summary.writes ? <span className="mx-1">&middot;</span> : null}
          {summary.writes ? <><PencilIcon className="w-3 h-3" /> Wrote {summary.writes} file{summary.writes > 1 ? 's' : ''}</> : null}
        </button>
        {showDetails && summary.details && (
          <div className="mt-1 ml-[1.125rem] pl-2 border-l border-surface-700/50 text-[10px] text-surface-500 space-y-0.5">
            {summary.details.map((d, i) => <div key={i}>{d}</div>)}
          </div>
        )}
      </div>
    );
  }

  // Artifact card (generation result with files)
  if ((message.metadata?.type as string) === "artifact" && message.metadata?.files) {
    const files = message.metadata.files as Array<{ path: string; action: "created" | "modified" }>;
    const validation = message.metadata.validation as
      | { passed: number; failed: number; skipped: number }
      | undefined;
    return (
      <ArtifactCard
        title={message.content || "Generated files"}
        files={files}
        summary={message.metadata.summary as string | undefined}
        scopeLabel={message.metadata.scopeLabel as string | undefined}
        validation={validation}
        onViewCode={message.metadata?.onViewCode as (() => void) | undefined}
        onRestore={message.metadata?.onRestore as (() => void) | undefined}
      />
    );
  }

  // Inline progress (compact)
  if ((message.metadata?.type as string) === "inline_progress" && message.metadata?.taskName) {
    const taskName = message.metadata.taskName as string;
    const current = (message.metadata.current as number) || 0;
    const total = (message.metadata.total as number) || 0;
    const pct = total > 0 ? (current / total) * 100 : 0;
    return (
      <div className="ml-9 my-1 flex items-center gap-2">
        <Loader2 className="w-3 h-3 text-primary-400 animate-spin flex-shrink-0" />
        <span className="text-[11px] text-surface-400 truncate">{taskName}</span>
        {total > 0 && (
          <>
            <div className="flex-1 max-w-[80px] h-1 bg-surface-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-surface-500 tabular-nums">{current}/{total}</span>
          </>
        )}
      </div>
    );
  }

  // Structured plan card — renders PlanCard instead of markdown when planSteps exist
  if (
    !message.isStreaming &&
    message.role === "assistant" &&
    message.metadata?.planSteps &&
    Array.isArray(message.metadata.planSteps) &&
    (message.metadata.planSteps as PlanStep[]).length > 0
  ) {
    const planSteps = message.metadata.planSteps as PlanStep[];
    const planId = (message.metadata.planId as string) || message.id;
    const planVersion = (message.metadata.planVersion as number) || 1;
    const planUnderstanding = message.metadata.planUnderstanding as string | null;
    const planSummary = message.metadata.planSummary as string | null;
    const isImplemented = !!message.metadata.planImplemented;

    return (
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex gap-2"
      >
        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-surface-800 border border-surface-700">
          <Bot className="w-3.5 h-3.5 text-surface-400" />
        </div>
        <div className="flex-1 max-w-[85%]">
          <PlanCard
            understanding={planUnderstanding}
            steps={planSteps}
            summary={planSummary}
            version={planVersion}
            planId={planId}
            onRefinePlan={!isImplemented ? onRefinePlan : undefined}
            onConfirmPlan={!isImplemented ? onConfirmPlan : undefined}
            isPlanImplementing={isPlanImplementing}
            isImplemented={isImplemented}
          />
        </div>
      </motion.div>
    );
  }

  // Check if this is a completed screen card (generated screen notification in chat)
  if (message.metadata?.isGenerationMessage && message.createdScreenId) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex gap-2"
      >
        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-surface-800 border border-surface-700">
          <Bot className="w-3.5 h-3.5 text-surface-400" />
        </div>
        <div className="flex-1 max-w-[85%]">
          {/* Completed screen card */}
          <div
            className="group relative flex gap-3 p-3 rounded-lg bg-surface-800/60 border border-surface-700/50 hover:bg-surface-800/80 hover:border-surface-600/50 transition-all cursor-pointer"
            onClick={() => onScreenClick?.(message.createdScreenId!)}
          >
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-16 h-20 rounded-md bg-surface-900 border border-surface-700/50 overflow-hidden">
              {message.metadata.thumbnailUrl ? (
                <img
                  src={message.metadata.thumbnailUrl}
                  alt={message.content}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Eye className="w-6 h-6 text-surface-600" />
                </div>
              )}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                {/* Name + Badge */}
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-white truncate flex-1">
                    {message.content}
                  </h4>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0 text-[10px] font-medium rounded-full bg-green-500/20 text-green-400">
                    <Check className="w-2.5 h-2.5" />
                    <span className="ml-0.5">
                      {message.metadata.screenType || "screen"}
                    </span>
                  </span>
                </div>
                {/* Description */}
                {message.metadata.description && (
                  <p className="text-xs text-surface-400 leading-relaxed line-clamp-2">
                    {message.metadata.description}
                  </p>
                )}
              </div>
              {/* View action */}
              <div className="flex items-center gap-1 mt-1.5 text-xs text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View on canvas</span>
                <Eye className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Regular message
  const isUser = message.role === "user";
  const isGenerationMessage = message.metadata?.isGenerationMessage;
  const screenType = message.metadata?.screenType;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 12 : -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center",
          isUser
            ? "bg-primary-500/20 border border-primary-500/30"
            : "bg-surface-800 border border-surface-700",
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-primary-400" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-surface-400" />
        )}
      </div>
      <div className="flex flex-col gap-1.5 max-w-[85%]">
        <div
          className={cn(
            "relative group px-3 py-2 rounded-xl text-sm leading-relaxed",
            isUser
              ? "bg-primary-500 text-white rounded-tr-sm"
              : "bg-surface-800/80 text-surface-200 border border-surface-700/50 rounded-tl-sm",
            message.error && "bg-red-500/10 border border-red-500/30 text-red-200",
            message.warning && "bg-amber-500/10 border border-amber-500/30 text-amber-200",
          )}
        >
          {isUser && !isEditing && onEditMessage && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-surface-700 hover:bg-surface-600 border border-surface-600"
            >
              <Pencil className="w-3 h-3 text-surface-300" />
            </button>
          )}
          {isGenerationMessage && screenType && (
            <span className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-xs font-medium">
              <Sparkles className="w-3 h-3" />
              {screenType}
            </span>
          )}
          {!!message.metadata?.imageUrls && (
            <div className="flex gap-1.5 flex-wrap mb-1.5">
              {(message.metadata.imageUrls as string[]).map((url: string, i: number) => (
                <img
                  key={i}
                  src={rewriteStorageUrl(url) || url}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover border border-surface-700/50"
                  loading="lazy"
                />
              ))}
            </div>
          )}
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-surface-900 text-white rounded-lg p-2 text-sm border border-surface-600 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setIsEditing(false); setEditText(message.content); }} className="text-xs text-surface-400 hover:text-surface-200 px-2 py-1">Cancel</button>
                <button onClick={() => { onEditMessage?.(message.id, editText); setIsEditing(false); }} className="text-xs bg-primary-500 text-white px-3 py-1 rounded-md hover:bg-primary-600">Save & Regenerate</button>
              </div>
            </div>
          ) : isUser ? (
            message.content
          ) : (
            <div className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      className="!rounded-lg !text-xs !my-2"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="bg-surface-700/50 px-1.5 py-0.5 rounded text-xs text-primary-300" {...props}>
                      {children}
                    </code>
                  );
                },
                p({ children }: any) {
                  return <p className="mb-1.5 last:mb-0">{children}</p>;
                },
                ul({ children }: any) {
                  return <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>;
                },
                ol({ children }: any) {
                  return <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>;
                },
                a({ href, children }: any) {
                  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">{children}</a>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
            {/* Streaming cursor */}
            {message.isStreaming && message.content && <StreamingCursor />}
            </div>
          )}
          {!isUser && message.isStreaming && liveActionLogs && liveActionLogs.length > 0 && (
            <ActionLogSection
              actionLogs={liveActionLogs}
              defaultExpanded
            />
          )}
          {!isUser && !message.isStreaming && message.metadata?.actionLogs && (
            <ActionLogSection
              actionLogs={message.metadata.actionLogs as import("@/types/canvas").ActionLogEvent[]}
            />
          )}
          {!isUser && message.metadata?.changeSummary && (
            <EditSummaryCard
              changes={message.metadata.changeSummary as string[]}
              screenId={message.metadata?.editedScreenId as string | undefined}
              previousVersionId={message.metadata?.previousVersionId as string | undefined}
              isUndone={!!message.metadata?.editUndone}
              onUndo={
                message.metadata?.editedScreenId && message.metadata?.previousVersionId && onUndoEdit
                  ? () => onUndoEdit(
                      message.metadata!.editedScreenId as string,
                      message.metadata!.previousVersionId as string,
                    )
                  : undefined
              }
            />
          )}
          {/* Plan mode: confirm & implement buttons */}
          {!isUser && !message.isStreaming && message.content && (message.metadata?.executionMode === "Plan" || message.metadata?.planMode === true) && !message.metadata?.planImplemented && !message.error && onConfirmPlan && (
            <div className="mt-3 pt-2.5 border-t border-surface-700/30">
              <div className="flex items-center gap-1.5 mb-2">
                <ListChecks className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-[11px] font-medium text-primary-300">Plan ready</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onConfirmPlan(message.content)}
                  disabled={isPlanImplementing}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                             bg-primary-500 hover:bg-primary-400 text-white transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlanImplementing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Implementing...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      Confirm & Implement
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          {message.isStreaming && !message.content && (
            <span className="inline-flex items-center gap-1.5 text-surface-500 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
              </span>
            </span>
          )}
          {/* Error state -- polished card with icon and retry */}
          {message.error && (
            <div className="flex items-start gap-2 mt-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-red-300/80 leading-relaxed">
                  Something went wrong. You can try again or refresh the page.
                </p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors
                               px-2.5 py-1 rounded-lg bg-surface-800/60 hover:bg-surface-700/60 border border-surface-700/50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
          {/* Warning state -- amber hint for failed intents (e.g. modify_failed) */}
          {message.warning && !message.error && (
            <div className="flex items-start gap-2 mt-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                Tip: Use the screen selector above to pick which screen to edit.
              </p>
            </div>
          )}
        </div>
        {message.createdScreenId &&
          onScreenClick &&
          !isUser &&
          !isGenerationMessage && (
            <button
              onClick={() => onScreenClick(message.createdScreenId!)}
              className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 font-medium self-start px-2 py-1 rounded-lg hover:bg-surface-800/50 transition-colors"
            >
              <Eye className="w-3 h-3" />
              View screen
            </button>
          )}
      </div>
    </motion.div>
  );
}
