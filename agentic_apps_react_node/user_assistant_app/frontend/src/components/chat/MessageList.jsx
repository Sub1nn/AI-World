import React from "react";
import { Bot } from "lucide-react";
import MessageBubble from "./MessageBubble";

const MessageList = ({
  messages,
  isTyping,
  messagesContainerRef,
  messagesEndRef,
  onScroll,
}) => {
  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-6 max-w-6xl mx-auto w-full"
      onScroll={onScroll}
    >
      {messages.map((message, index) => (
        <MessageBubble key={message.id} message={message} index={index} />
      ))}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex items-start space-x-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center shadow-xl">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="bg-white/15 border border-white/30 rounded-3xl p-6 backdrop-blur-sm shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
                <div
                  className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <span className="text-blue-200 text-sm font-medium">
                ATLAS is crafting your travel plan...
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
