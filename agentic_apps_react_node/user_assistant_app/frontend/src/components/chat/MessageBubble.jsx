import React from "react";
import { User, Bot, Clock, MapPin } from "lucide-react";
import { formatMessage } from "../../utils/formatMessage";
import { getToolIcon } from "../../utils/toolIcons";

const MessageBubble = ({ message, index }) => {
  // Group duplicate tools and show only unique ones
  const uniqueTools = message.tools ? [...new Set(message.tools)] : [];

  return (
    <div
      className="flex items-start space-x-4 animate-fade-in-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl ${
          message.type === "user"
            ? "bg-gradient-to-r from-blue-500 to-cyan-500"
            : message.isError
            ? "bg-gradient-to-r from-red-500 to-pink-500"
            : "bg-gradient-to-r from-purple-600 to-pink-600"
        }`}
      >
        {message.type === "user" ? (
          <User className="w-6 h-6 text-white" />
        ) : (
          <Bot className="w-6 h-6 text-white" />
        )}
      </div>

      {/* Message Bubble */}
      <div className="flex-1 min-w-0">
        <div
          className={`rounded-3xl p-6 shadow-2xl backdrop-blur-sm border transition-all duration-300 ${
            message.type === "user"
              ? "bg-blue-500/20 border-blue-400/40 ml-6"
              : message.isError
              ? "bg-red-500/20 border-red-400/40"
              : "bg-white/15 border-white/30 hover:bg-white/20"
          }`}
        >
          {/* Analysis Summary - Show only for assistant messages with tools */}
          {message.type === "assistant" && uniqueTools.length > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20 rounded-2xl">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-blue-200 text-sm font-semibold">
                  INTELLIGENCE ANALYSIS
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueTools.slice(0, 3).map((tool, i) => {
                  const IconComponent = getToolIcon(tool);
                  const toolName = tool
                    .replace(/_/g, " ")
                    .replace(/comprehensive |smart |intelligent /gi, "");
                  return (
                    <div
                      key={i}
                      className="flex items-center space-x-2 bg-blue-500/15 text-blue-100 px-3 py-1 rounded-xl text-xs border border-blue-400/20"
                    >
                      <IconComponent className="w-3 h-3" />
                      <span className="capitalize font-medium">{toolName}</span>
                    </div>
                  );
                })}
                {uniqueTools.length > 3 && (
                  <div className="flex items-center px-3 py-1 bg-purple-500/15 text-purple-100 rounded-xl text-xs border border-purple-400/20">
                    <span>+{uniqueTools.length - 3} more</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location Context */}
          {message.location && (
            <div className="mb-4 flex items-center space-x-2 text-sm text-blue-200 bg-blue-500/10 rounded-xl p-3 border border-blue-400/20">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">{message.location}</span>
            </div>
          )}

          {/* Message Content */}
          <div className="prose prose-invert max-w-none text-gray-100 leading-relaxed message-content">
            {formatMessage(message.content)}
          </div>

          {/* Timestamp & Status */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{message.timestamp.toLocaleTimeString()}</span>
            </div>
            {message.type === "assistant" && !message.isError && (
              <div className="flex items-center space-x-2 text-xs text-emerald-300 font-medium">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span>
                  {uniqueTools.length > 0
                    ? `${uniqueTools.length} Analysis Tool${
                        uniqueTools.length > 1 ? "s" : ""
                      } Used`
                    : "Direct Response"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
