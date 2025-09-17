import { systemPrompts } from "../utils/systemPrompts.js";

const INTENT_DEFINITIONS = {
  safety: {
    keywords: [
      "safe",
      "safety",
      "security",
      "dangerous",
      "risk",
      "threat",
      "war",
      "conflict",
      "crime",
    ],
    type: "safety_inquiry",
  },
  destination_planning: {
    keywords: [
      "travel to",
      "visit",
      "trip to",
      "going to",
      "plan",
      "itinerary",
    ],
    type: "destination_planning",
  },
  accommodation: {
    keywords: [
      "hotel",
      "stay",
      "accommodation",
      "lodge",
      "resort",
      "hostel",
      "airbnb",
    ],
    type: "accommodation_search",
  },
  dining: {
    keywords: [
      "restaurant",
      "food",
      "eat",
      "cuisine",
      "dining",
      "meal",
      "lunch",
      "dinner",
    ],
    type: "dining_recommendations",
  },
  cultural: {
    keywords: [
      "culture",
      "custom",
      "tradition",
      "etiquette",
      "language",
      "religion",
      "festival",
    ],
    type: "cultural_inquiry",
  },
  weather: {
    keywords: [
      "weather",
      "climate",
      "temperature",
      "rain",
      "sunny",
      "forecast",
    ],
    type: "weather_inquiry",
  },
  activities: {
    keywords: [
      "activities",
      "attractions",
      "sightseeing",
      "experience",
      "tour",
      "adventure",
    ],
    type: "activity_recommendations",
  },
  logistics: {
    keywords: [
      "visa",
      "passport",
      "currency",
      "transport",
      "flight",
      "airport",
      "border",
    ],
    type: "travel_logistics",
  },
};

const LOCATION_PATTERNS = [
  /\b(palestine|israel|west bank|gaza|middle east|afghanistan|albania|algeria|argentina|armenia|australia|austria|azerbaijan|bahrain|bangladesh|belarus|belgium|bolivia|bosnia|brazil|bulgaria|cambodia|canada|chile|china|colombia|croatia|cyprus|czechia|denmark|ecuador|egypt|estonia|ethiopia|finland|france|georgia|germany|ghana|greece|guatemala|hungary|iceland|india|indonesia|iran|iraq|ireland|italy|japan|jordan|kazakhstan|kenya|kuwait|kyrgyzstan|latvia|lebanon|libya|lithuania|luxembourg|malaysia|maldives|malta|mexico|moldova|mongolia|montenegro|morocco|myanmar|nepal|netherlands|norway|oman|pakistan|panama|peru|philippines|poland|portugal|qatar|romania|russia|saudi arabia|serbia|singapore|slovakia|slovenia|south africa|south korea|spain|sri lanka|sweden|switzerland|syria|taiwan|tajikistan|thailand|tunisia|turkey|ukraine|united arab emirates|united kingdom|united states|uruguay|uzbekistan|venezuela|vietnam|yemen|zimbabwe)\b/gi,
  /\b(tokyo|paris|london|new york|bangkok|berlin|rome|madrid|barcelona|amsterdam|dubai|singapore|hong kong|sydney|melbourne|toronto|vancouver|los angeles|san francisco|miami|chicago|boston|seattle|helsinki|stockholm|oslo|copenhagen|prague|vienna|zurich|geneva|brussels|budapest|warsaw|krakow|lisbon|porto|dublin|edinburgh|glasgow|manchester|birmingham|liverpool|mumbai|delhi|bangalore|kolkata|chennai|hyderabad|pune|ahmedabad|jaipur|istanbul|ankara|cairo|casablanca|marrakech|jerusalem|tel aviv|ramallah|bethlehem|nablus|hebron)\b/gi,
];

const FALLBACK_PROMPT = `You are ATLAS - an Advanced Travel & Location Assistant System. You are a world-class travel expert with deep knowledge of global destinations, cultures, safety, cuisine, accommodations, and travel logistics.

CORE CAPABILITIES:
• Comprehensive destination analysis (weather, safety, culture, attractions)
• Smart restaurant discovery with cultural context and local specialties
• Intelligent accommodation recommendations across all budget ranges
• Real-time safety intelligence and travel advisories
• Cultural insights, customs, and practical travel information
• Local experiences and hidden gems discovery

RESPONSE STYLE:
• Be professional and authoritative
• Include specific details and practical tips
• Always consider safety and cultural sensitivity
• Provide alternatives for different budgets and preferences
• Use engaging, conversational tone while being thoroughly informative

Provide comprehensive, professional travel assistance that demonstrates superior intelligence and expertise.`;

export const responseEngine = {
  analyzeUserIntent(message) {
    try {
      const lowerMessage = message.toLowerCase();

      const intents = Object.fromEntries(
        Object.entries(INTENT_DEFINITIONS).map(([key, def]) => [
          key,
          {
            ...def,
            confidence:
              def.keywords.reduce(
                (score, keyword) =>
                  lowerMessage.includes(keyword) ? score + 1 : score,
                0
              ) / def.keywords.length,
          },
        ])
      );

      const primaryIntent = Object.values(intents).sort(
        (a, b) => b.confidence - a.confidence
      )[0];

      return {
        primaryIntent,
        allIntents: intents,
        locations: this.extractLocations(message),
        urgency: this.assessUrgency(message),
        complexity: this.assessComplexity(message),
      };
    } catch (error) {
      console.error("❌ Intent analysis error:", error.message);
      return {
        primaryIntent: { type: "destination_planning", confidence: 0.5 },
        allIntents: {},
        locations: [],
        urgency: "normal",
        complexity: "medium",
      };
    }
  },

  extractLocations(message) {
    try {
      const locations = [];
      LOCATION_PATTERNS.forEach((pattern) => {
        const matches = message.match(pattern);
        if (matches) {
          locations.push(...matches.map((match) => match.toLowerCase()));
        }
      });
      return [...new Set(locations)];
    } catch (error) {
      console.error("❌ Location extraction error:", error.message);
      return [];
    }
  },

  assessUrgency(message) {
    try {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("emergency") || lowerMessage.includes("urgent"))
        return "high";
      if (lowerMessage.includes("soon") || lowerMessage.includes("next week"))
        return "medium";
      return "normal";
    } catch (error) {
      return "normal";
    }
  },

  assessComplexity(message) {
    try {
      const factors = [
        message.includes("itinerary"),
        message.includes("multiple"),
        message.includes("compare"),
        message.includes("budget"),
        message.includes("family"),
        message.includes("business"),
        message.split("?").length > 2,
        message.length > 100,
      ].filter(Boolean).length;

      return factors >= 4 ? "high" : factors >= 2 ? "medium" : "low";
    } catch (error) {
      return "medium";
    }
  },

  enhanceSystemPrompt(userIntent, conversationHistory) {
    try {
      let prompt = systemPrompts?.getMainSystemPrompt?.() || FALLBACK_PROMPT;

      const intentEnhancements = {
        safety_inquiry:
          (systemPrompts?.getSafetyAnalysisPrompt?.() ||
            "Provide professional security assessment") +
          "\n\nProvide actionable security intelligence.",
        cultural_inquiry:
          (systemPrompts?.getCulturalInsightPrompt?.() ||
            "Provide cultural insights") +
          "\n\nDemonstrate deep local knowledge.",
        destination_planning:
          (systemPrompts?.getLocationAnalysisPrompt?.() ||
            "Provide destination analysis") +
          "\n\nProvide comprehensive intelligence.",
      };

      if (intentEnhancements[userIntent.primaryIntent.type]) {
        prompt += "\n\n" + intentEnhancements[userIntent.primaryIntent.type];
      }

      if (userIntent.urgency === "high") {
        prompt += "\n\nURGENT: Prioritize immediate, actionable information.";
      }

      if (userIntent.complexity === "high") {
        prompt +=
          "\n\nCOMPLEX: Use multiple tools strategically with structured response.";
      }

      return prompt;
    } catch (error) {
      console.error("❌ System prompt enhancement error:", error.message);
      return FALLBACK_PROMPT;
    }
  },

  formatProfessionalResponse(rawResponse, toolsUsed, userIntent) {
    try {
      let response = rawResponse;

      // Clean up redundant tool mentions in the response
      const toolNames = toolsUsed.map((tool) =>
        tool.replace(/comprehensive_|smart_|intelligent_/g, "")
      );
      toolNames.forEach((toolName) => {
        const redundantPhrases = [
          `Thank you for providing the ${toolName}`,
          `Based on the ${toolName}`,
          `According to the ${toolName}`,
          `The ${toolName} indicates`,
          `From the ${toolName} report`,
        ];
        redundantPhrases.forEach((phrase) => {
          response = response.replace(new RegExp(phrase, "gi"), "");
        });
      });

      // Remove repetitive acknowledgments
      response = response.replace(
        /Thank you for providing.*?tool call\.\s*/gi,
        ""
      );
      response = response.replace(/Based on the.*?report,?\s*/gi, "");
      response = response.replace(/According to the.*?assessment,?\s*/gi, "");

      // Add executive summary for complex responses
      if (
        (userIntent.complexity === "high" || toolsUsed.length > 2) &&
        !response.includes("**EXECUTIVE SUMMARY**")
      ) {
        const keyPoints = this.extractKeyPoints(response);
        if (keyPoints.length > 0) {
          const summary = keyPoints.slice(0, 2).join(" • ");
          response = `**EXECUTIVE SUMMARY**\n${summary}\n\n---\n\n` + response;
        }
      }

      // Structure the response with clear sections
      if (toolsUsed.length > 1) {
        response = this.addResponseStructure(response, userIntent, toolsUsed);
      }

      // Clean up excessive line breaks and formatting
      response = response
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\s+/gm, "")
        .trim();

      return response;
    } catch (error) {
      console.error("❌ Response formatting error:", error.message);
      return rawResponse;
    }
  },

  addResponseStructure(response, userIntent, toolsUsed) {
    // Don't restructure if it's already well-structured
    if (response.includes("**") && response.includes("##")) {
      return response;
    }

    const intentHeaders = {
      safety_inquiry: [
        "**SECURITY ASSESSMENT**",
        "**TRAVEL RECOMMENDATIONS**",
        "**EMERGENCY PROTOCOLS**",
      ],
      destination_planning: [
        "**DESTINATION OVERVIEW**",
        "**KEY RECOMMENDATIONS**",
        "**PLANNING ESSENTIALS**",
      ],
      accommodation_search: [
        "**ACCOMMODATION OPTIONS**",
        "**AREA ANALYSIS**",
        "**BOOKING STRATEGY**",
      ],
      dining_recommendations: [
        "**CULINARY LANDSCAPE**",
        "**RECOMMENDED VENUES**",
        "**LOCAL SPECIALTIES**",
      ],
      cultural_inquiry: [
        "**CULTURAL CONTEXT**",
        "**PRACTICAL GUIDANCE**",
        "**LOCAL CUSTOMS**",
      ],
      weather_inquiry: [
        "**WEATHER ANALYSIS**",
        "**TRAVEL CONDITIONS**",
        "**RECOMMENDATIONS**",
      ],
    };

    const headers = intentHeaders[userIntent.primaryIntent.type];
    if (!headers) return response;

    // Split response into logical sections and add headers
    const sections = response.split(/\n\n+/);
    if (sections.length >= 2) {
      const structuredSections = sections
        .map((section, index) => {
          if (index < headers.length && section.trim()) {
            return `${headers[index]}\n\n${section.trim()}`;
          }
          return section.trim();
        })
        .filter(Boolean);

      return structuredSections.join("\n\n");
    }

    return response;
  },

  extractKeyPoints(response) {
    try {
      const sentences = response
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 20);
      const indicators = [
        "recommend",
        "suggest",
        "important",
        "consider",
        "should",
        "must",
        "essential",
        "critical",
      ];
      const keyPoints = [];

      sentences.forEach((sentence) => {
        if (
          indicators.some((indicator) =>
            sentence.toLowerCase().includes(indicator)
          ) &&
          keyPoints.length < 3
        ) {
          keyPoints.push(sentence.trim());
        }
      });

      return keyPoints;
    } catch (error) {
      return [];
    }
  },
};
