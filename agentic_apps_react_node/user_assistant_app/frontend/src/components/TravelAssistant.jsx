import React, { useState, useRef, useEffect } from "react";
import { Globe, Sparkles, ArrowUp } from "lucide-react";
import MessageList from "./chat/MessageList";
import InputArea from "./chat/InputArea";
import TripSuggestions from "./features/TripSuggestions";
import { useChat } from "../hooks/useChat";

const TravelAssistant = () => {
  const {
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    isTyping,
    sendMessage,
  } = useChat();

  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop > clientHeight + 100);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-950 relative overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-96 h-96 bg-gradient-to-r from-purple-500/40 to-blue-500/40 rounded-full mix-blend-multiply blur-3xl opacity-30 animate-pulse"></div>
        <div
          className="absolute -bottom-60 -left-60 w-96 h-96 bg-gradient-to-r from-blue-500/40 to-teal-500/40 rounded-full mix-blend-multiply blur-3xl opacity-30 animate-pulse"
          style={{ animationDelay: "3s" }}
        ></div>
        <div
          className="absolute top-1/3 left-1/4 w-80 h-80 bg-gradient-to-r from-pink-500/30 to-purple-500/30 rounded-full mix-blend-multiply blur-3xl opacity-20 animate-pulse"
          style={{ animationDelay: "5s" }}
        ></div>
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float opacity-10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${12 + Math.random() * 18}s`,
            }}
          >
            <Sparkles size={14 + Math.random() * 18} className="text-white" />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4 shadow-lg">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Globe className="w-7 h-7 text-white animate-spin-slow" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  ATLAS
                </h1>
                <p className="text-sm text-gray-300">
                  Your AI Travel Companion
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-sm text-gray-300">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>AI-Powered</span>
              </div>
            </div>
          </div>
        </header>

        {/* Messages */}
        <MessageList
          messages={messages}
          isTyping={isTyping}
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
          onScroll={handleScroll}
        />

        {/* Quick Suggestions */}
        {messages.length <= 1 && (
          <TripSuggestions setInputMessage={setInputMessage} />
        )}

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-3.5 rounded-full shadow-2xl transition-all duration-300 hover:shadow-3xl transform hover:scale-110 z-30"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}

        {/* Input Area */}
        <InputArea
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          onKeyPress={handleKeyPress}
        />
      </div>
    </div>
  );
};

export default TravelAssistant;
