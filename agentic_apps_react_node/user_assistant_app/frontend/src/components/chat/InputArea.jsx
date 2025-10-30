import React from "react";
import { Send, Loader2 } from "lucide-react";

const InputArea = ({
  inputMessage,
  setInputMessage,
  isLoading,
  onSendMessage,
  onKeyPress,
}) => {
  return (
    <div className="bg-black/20 backdrop-blur-md border-t border-white/10 p-5">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end space-x-4 bg-white/12 rounded-3xl p-4 border border-white/20 backdrop-blur-sm shadow-2xl">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder="Ask me about destinations, hotels, food, safety, or experiences..."
              className="w-full bg-transparent border-0 outline-none resize-none text-white placeholder-gray-300 text-lg leading-relaxed min-h-[24px] max-h-32"
              rows="1"
              disabled={isLoading}
              maxLength={1000}
            />
          </div>
          <button
            onClick={onSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className={`p-3.5 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg ${
              isLoading || !inputMessage.trim()
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-2xl"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Send className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-2 text-xs text-gray-400">
          <span>Press Enter to send · Shift+Enter for new line</span>
          <span>{inputMessage.length}/1000</span>
        </div>
      </div>
    </div>
  );
};

export default InputArea;
