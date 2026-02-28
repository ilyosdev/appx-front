import { motion } from "framer-motion";
import { Bot, User, Sparkles, Eye, Check, Loader2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocalMessage, RecommendationItem, ScreenData } from "@/types/canvas";
import { RecommendationCards } from "./RecommendationCards";

interface ChatMessageBubbleProps {
  message: LocalMessage;
  onScreenClick?: (screenId: string) => void;
  progressMessages?: Map<string, unknown>;
  onGenerateRecommended?: (screenIds: string[]) => void;
  onDismissRecommendations?: (screenIds: string[]) => void;
  streamingStatus?: string;
  screens?: ScreenData[];
  onViewScreen?: (screenId: string) => void;
}

export function ChatMessageBubble({
  message,
  onScreenClick,
  progressMessages: _progressMessages,
  onGenerateRecommended,
  onDismissRecommendations,
  streamingStatus,
  screens,
  onViewScreen,
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
        else if (match.htmlContent || match.reactCode || match.compiledHtml) status = "completed";
        else status = "pending";
      }
      return { ...ps, liveStatus: status, screenId };
    });

    const completedCount = screenStatuses.filter((s) => s.liveStatus === "completed").length;
    const totalCount = screenStatuses.length;
    const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const hasAnyGenerating = screenStatuses.some((s) => s.liveStatus === "generating");
    const allDone = completedCount === totalCount;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
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

            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex-1 h-1.5 bg-surface-700/50 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    allDone ? "bg-green-500" : "bg-primary-500"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium tabular-nums flex-shrink-0",
                allDone ? "text-green-400" : "text-surface-400"
              )}>
                {completedCount}/{totalCount}
              </span>
            </div>

            {/* Screen list with live status */}
            <div className="flex flex-col gap-1">
              {screenStatuses.map((screen, index) => {
                const isClickable = screen.liveStatus === "completed" && screen.screenId;
                const showDescription = screen.description && screen.liveStatus !== "completed";
                return (
                  <motion.div
                    key={screen.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                  >
                    <button
                      onClick={() => isClickable && onViewScreen?.(screen.screenId!)}
                      disabled={!isClickable}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all text-left w-full",
                        screen.liveStatus === "generating" && "bg-primary-500/5",
                        screen.liveStatus === "completed" && "bg-green-500/5",
                        screen.liveStatus === "failed" && "bg-red-500/5",
                        isClickable
                          ? "hover:bg-surface-700/40 cursor-pointer group/row"
                          : "cursor-default"
                      )}
                    >
                      {/* Status icon */}
                      {screen.liveStatus === "completed" && (
                        <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      )}
                      {screen.liveStatus === "generating" && (
                        <Loader2 className="w-3.5 h-3.5 text-primary-400 animate-spin flex-shrink-0" />
                      )}
                      {screen.liveStatus === "pending" && (
                        <Clock className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
                      )}
                      {screen.liveStatus === "failed" && (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      )}

                      {/* Screen name + type badge */}
                      <span
                        className={cn(
                          "truncate",
                          screen.liveStatus === "completed" && "text-surface-200",
                          screen.liveStatus === "generating" && "text-primary-300",
                          screen.liveStatus === "pending" && "text-surface-500",
                          screen.liveStatus === "failed" && "text-red-300"
                        )}
                      >
                        {screen.name}
                      </span>
                      {screen.type && screen.type !== "custom" && (
                        <span className="text-[10px] text-surface-500 bg-surface-700/30 px-1.5 py-0.5 rounded flex-shrink-0">
                          {screen.type}
                        </span>
                      )}

                      {/* View hint for completed */}
                      {isClickable && (
                        <Eye className="w-3 h-3 text-surface-600 ml-auto flex-shrink-0 opacity-50 group-hover/row:opacity-100 transition-opacity" />
                      )}
                    </button>
                    {/* Description for pending/generating screens */}
                    {showDescription && (
                      <p className="text-[10px] text-surface-500 truncate ml-[1.375rem] px-2 pb-0.5">
                        {screen.description}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Footer: generating indicator or completion state */}
            {allDone && totalCount > 0 ? (
              <div className="mt-2 pt-2 border-t border-surface-700/30 flex items-center gap-1.5">
                <Check className="w-3 h-3 text-green-400" />
                <span className="text-[10px] text-green-400 font-medium">
                  All screens ready
                </span>
              </div>
            ) : hasAnyGenerating && (
              <div className="mt-2 pt-2 border-t border-surface-700/30 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-primary-400" />
                <span className="text-[10px] text-surface-400">
                  Generating screens...
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Check if this is a completed screen card (generated screen notification in chat)
  if (message.metadata?.isGenerationMessage && message.createdScreenId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
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
            "px-3 py-2 rounded-xl text-sm leading-relaxed",
            isUser
              ? "bg-primary-500 text-white rounded-tr-sm"
              : "bg-surface-800/80 text-surface-200 border border-surface-700/50 rounded-tl-sm",
            message.error && "bg-red-500/20 border-red-500/30 text-red-300",
          )}
        >
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
                  src={url}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover border border-surface-700/50"
                  loading="lazy"
                />
              ))}
            </div>
          )}
          {message.content}
          {message.isStreaming && (
            <span className="inline-flex items-center gap-2 text-surface-400">
              <span className="inline-block w-1.5 h-3.5 bg-primary-500 animate-pulse rounded-sm" />
              <span className="text-sm">
                {streamingStatus || "Thinking..."}
              </span>
            </span>
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
