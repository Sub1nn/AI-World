import React from "react";
import { Sparkles } from "lucide-react";

const TripSuggestions = ({ setInputMessage }) => {
  const quickSuggestions = [
    "Security assessment for travel to Palestine",
    "Comprehensive destination analysis for Tokyo",
    "Cultural briefing for business travel to Dubai",
    "Luxury accommodation strategy for Paris",
    "Traditional dining experiences in Istanbul",
    "Weather intelligence for Southeast Asia travel",
  ];

  return (
    <div className="px-6 pb-6 max-w-6xl mx-auto w-full">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center">
          <Sparkles className="w-4 h-4 mr-2 text-yellow-300" />
          Professional Travel Intelligence Queries
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setInputMessage(suggestion)}
              className="text-left p-4 bg-white/8 hover:bg-white/15 rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 text-sm text-gray-200 hover:text-white backdrop-blur-sm hover:shadow-xl transform hover:scale-105 hover:shadow-blue-500/10"
            >
              <div className="font-medium text-blue-200 mb-1">
                {suggestion.split(" ")[0] + " " + suggestion.split(" ")[1]}
              </div>
              <div className="text-xs text-gray-400">{suggestion}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TripSuggestions;
