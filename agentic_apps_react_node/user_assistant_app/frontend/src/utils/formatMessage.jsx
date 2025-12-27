import React from "react";

const FORMATTING_RULES = [
  {
    pattern: /^\*\*[^*]+\*\*$/,
    render: (line, index) => {
      const text = line.replace(/^\*\*|\*\*$/g, "");
      // Skip if it's just "EXECUTIVE SUMMARY" or other empty headers
      if (text.trim().length < 3) return null;

      return (
        <div key={index} className="mb-6 mt-6">
          <h3 className="text-blue-300 font-bold text-xl mb-3 tracking-wide border-b border-blue-500/30 pb-2">
            {text}
          </h3>
        </div>
      );
    },
  },
  {
    pattern: /^#{1,3}\s/,
    render: (line, index) => {
      const level = line.match(/^#{1,3}/)[0].length;
      const text = line.replace(/^#{1,3}\s/, "");
      const sizes = { 1: "text-2xl", 2: "text-xl", 3: "text-lg" };
      return (
        <h4
          key={index}
          className={`text-blue-200 font-semibold ${sizes[level]} mt-6 mb-3`}
        >
          {text}
        </h4>
      );
    },
  },
  {
    pattern: /^---+$/,
    render: (line, index) => (
      <hr key={index} className="border-blue-500/20 my-6" />
    ),
  },
  {
    pattern: /^[\d]+\.\s/,
    render: (line, index) => (
      <div key={index} className="flex items-start mb-3 ml-2">
        <span className="text-blue-400 mr-3 font-semibold bg-blue-500/20 px-2 py-1 rounded-lg text-sm min-w-[28px] text-center">
          {line.match(/^\d+/)[0]}
        </span>
        <p className="text-gray-200 flex-1 leading-relaxed">
          {line.replace(/^\d+\.\s/, "")}
        </p>
      </div>
    ),
  },
  {
    pattern: /^[•\-*]\s/,
    render: (line, index) => (
      <div key={index} className="flex items-start mb-2 ml-2">
        <span className="text-blue-400 mr-3 mt-1.5 font-bold text-sm">•</span>
        <p className="text-gray-200 flex-1 leading-relaxed">
          {line.replace(/^[•\-*]\s/, "")}
        </p>
      </div>
    ),
  },
];

const CONTENT_HIGHLIGHTS = [
  {
    keywords: ["EXECUTIVE SUMMARY"],
    wrapper: (content, index) => {
      // Skip if content is too short or empty
      if (content.replace("**EXECUTIVE SUMMARY**", "").trim().length < 10) {
        return null;
      }

      return (
        <div
          key={index}
          className="bg-gradient-to-r from-blue-500/15 to-purple-500/15 border-l-4 border-blue-400 p-5 my-6 rounded-r-xl shadow-lg"
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-blue-200 font-bold text-sm tracking-wide">
              EXECUTIVE SUMMARY
            </span>
          </div>
          <div className="text-blue-100 font-medium leading-relaxed">
            {content.replace("**EXECUTIVE SUMMARY**", "").trim()}
          </div>
        </div>
      );
    },
  },
  {
    keywords: ["IMMEDIATE ASSESSMENT", "CRITICAL ALERT"],
    wrapper: (content, index) => {
      return (
        <div
          key={index}
          className="bg-red-500/10 border border-red-400/30 p-4 my-4 rounded-xl"
        >
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span className="text-red-200 font-bold text-sm">
              CRITICAL ALERT
            </span>
          </div>
          <div className="text-red-100 font-medium leading-relaxed">
            {content}
          </div>
        </div>
      );
    },
  },
  {
    keywords: ["STRATEGIC", "PROFESSIONAL", "INTELLIGENCE"],
    wrapper: (content, index) => (
      <div
        key={index}
        className="bg-purple-500/10 border border-purple-400/30 p-4 my-4 rounded-xl"
      >
        <p className="text-purple-100 font-medium leading-relaxed">{content}</p>
      </div>
    ),
  },
  {
    keywords: ["RECOMMENDATION", "IMPORTANT", "NOTE", "KEY"],
    wrapper: (content, index) => (
      <div
        key={index}
        className="bg-yellow-500/10 border border-yellow-400/25 p-4 my-4 rounded-xl"
      >
        <p className="text-yellow-100 font-medium leading-relaxed">{content}</p>
      </div>
    ),
  },
  {
    keywords: ["WARNING", "ALERT", "CAUTION", "CRITICAL", "DANGER"],
    wrapper: (content, index) => (
      <div
        key={index}
        className="bg-red-500/10 border border-red-400/25 p-4 my-4 rounded-xl"
      >
        <p className="text-red-200 font-medium leading-relaxed">{content}</p>
      </div>
    ),
  },
  {
    keywords: ["EXCELLENT", "RECOMMENDED", "OPTIMAL", "BEST"],
    wrapper: (content, index) => (
      <div
        key={index}
        className="bg-green-500/10 border border-green-400/25 p-4 my-4 rounded-xl"
      >
        <p className="text-green-200 font-medium leading-relaxed">{content}</p>
      </div>
    ),
  },
];

export const formatMessage = (content) => {
  const cleanContent = content
    .replace(/(?:```json|```tool-use)[\s\S]*?```/g, "")
    .replace(/<\/?tool-use[\s\S]*?>/g, "")
    .replace(/{[^}]*"tool_calls"[^}]*}/g, "")
    .trim();

  const formatLine = (line, index) => {
    if (line.trim() === "") return <br key={index} />;

    // Apply formatting rules in order
    for (const rule of FORMATTING_RULES) {
      if (line.match(rule.pattern)) {
        const result = rule.render(line, index);
        // Skip null results (empty headers)
        if (result === null) return null;
        return result;
      }
    }

    // Apply content highlights
    for (const highlight of CONTENT_HIGHLIGHTS) {
      if (
        highlight.keywords.some((keyword) =>
          line.toUpperCase().includes(keyword)
        )
      ) {
        const result = highlight.wrapper(line, index);
        // Skip null results (empty content)
        if (result === null) return null;
        return result;
      }
    }

    // Handle bold text within lines
    if (line.includes("**") && !line.match(/^\*\*[^*]+\*\*$/)) {
      const parts = line.split(/(\*\*[^*]+\*\*)/);
      return (
        <p key={index} className="text-gray-200 mb-3 leading-relaxed text-base">
          {parts.map((part, i) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <span
                key={i}
                className="font-semibold text-blue-200 bg-blue-500/10 px-1.5 py-0.5 rounded"
              >
                {part.slice(2, -2)}
              </span>
            ) : (
              part
            )
          )}
        </p>
      );
    }

    // Enhanced default paragraph - skip if too short or meaningless
    if (line.trim().length < 3 || line.trim() === "---") {
      return null;
    }

    return (
      <p key={index} className="text-gray-200 mb-4 leading-relaxed text-base">
        {line}
      </p>
    );
  };

  const formattedLines = cleanContent
    .split("\n")
    .map(formatLine)
    .filter((line) => line !== null);

  // If we ended up with very few lines, it might be due to over-filtering
  if (formattedLines.length === 0) {
    return (
      <p className="text-gray-200 mb-4 leading-relaxed text-base">
        {cleanContent}
      </p>
    );
  }

  return formattedLines;
};
