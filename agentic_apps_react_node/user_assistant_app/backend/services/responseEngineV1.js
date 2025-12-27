import { systemPrompts } from "../utils/systemPrompts.js";

const INTENT_DEFINITIONS = {
  system_identity: {
    keywords: [
      "who are you",
      "what are you",
      "who created you",
      "who made you",
      "who built you",
      "who developed you",
      "what is atlas",
      "about atlas",
      "your creator",
      "your developer",
      "tell me about yourself",
      "creator name",
      "name of your creator",
      "who is your creator",
      "created by who",
      "made by whom",
    ],
    type: "system_identity",
    priority_keywords: [
      "who are you",
      "what are you",
      "who created",
      "creator name",
      "your creator",
    ],
    context_keywords: ["atlas", "system", "ai", "name"],
    weight: 3.0, // High weight to ensure identity questions are caught
  },
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
      "violence",
      "threat level",
      "advisories",
    ],
    type: "safety_inquiry",
    priority_keywords: ["safe", "security", "dangerous", "risk"],
    context_keywords: ["travel", "visit", "going"],
    weight: 2.0,
  },
  destination_planning: {
    keywords: [
      "travel to",
      "visit",
      "trip to",
      "going to",
      "plan",
      "itinerary",
      "destination",
      "explore",
      "tour",
      "vacation",
      "holiday",
    ],
    type: "destination_planning",
    priority_keywords: ["travel", "visit", "trip", "plan"],
    context_keywords: ["next week", "next month", "planning"],
    weight: 1.5,
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
      "booking",
      "where to stay",
      "place to stay",
    ],
    type: "accommodation_search",
    priority_keywords: ["hotel", "stay", "accommodation"],
    context_keywords: ["book", "reservation", "night"],
    weight: 1.8,
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
      "breakfast",
      "where to eat",
    ],
    type: "dining_recommendations",
    priority_keywords: ["restaurant", "food", "eat"],
    context_keywords: ["traditional", "local", "best"],
    weight: 1.6,
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
      "local people",
      "customs",
    ],
    type: "cultural_inquiry",
    priority_keywords: ["culture", "custom", "tradition"],
    context_keywords: ["respect", "appropriate", "should"],
    weight: 1.4,
  },
  weather: {
    keywords: [
      "weather",
      "climate",
      "temperature",
      "rain",
      "sunny",
      "forecast",
      "conditions",
      "season",
      "hot",
      "cold",
      "humid",
    ],
    type: "weather_inquiry",
    priority_keywords: ["weather", "climate", "forecast"],
    context_keywords: ["today", "tomorrow", "this week"],
    weight: 1.7,
  },
  activities: {
    keywords: [
      "activities",
      "attractions",
      "sightseeing",
      "experience",
      "tour",
      "adventure",
      "things to do",
      "places to visit",
      "entertainment",
      "tennis",
      "sports",
      "courts",
      "facilities",
      "venues",
    ],
    type: "activity_recommendations",
    priority_keywords: ["activities", "attractions", "things to do"],
    context_keywords: ["fun", "interesting", "must see"],
    weight: 1.5,
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
      "documents",
      "requirements",
      "entry",
    ],
    type: "travel_logistics",
    priority_keywords: ["visa", "passport", "documents"],
    context_keywords: ["need", "required", "must"],
    weight: 1.3,
  },
};

const LOCATION_PATTERNS = [
  /\b(palestine|israel|west bank|gaza|middle east|afghanistan|albania|algeria|argentina|armenia|australia|austria|azerbaijan|bahrain|bangladesh|belarus|belgium|bolivia|bosnia|brazil|bulgaria|cambodia|canada|chile|china|colombia|croatia|cyprus|czechia|denmark|ecuador|egypt|estonia|ethiopia|finland|france|georgia|germany|ghana|greece|guatemala|hungary|iceland|india|indonesia|iran|iraq|ireland|italy|japan|jordan|kazakhstan|kenya|kuwait|kyrgyzstan|latvia|lebanon|libya|lithuania|luxembourg|malaysia|maldives|malta|mexico|moldova|mongolia|montenegro|morocco|myanmar|nepal|netherlands|norway|oman|pakistan|panama|peru|philippines|poland|portugal|qatar|romania|russia|saudi arabia|serbia|singapore|slovakia|slovenia|south africa|south korea|spain|sri lanka|sweden|switzerland|syria|taiwan|tajikistan|thailand|tunisia|turkey|ukraine|united arab emirates|united kingdom|united states|uruguay|uzbekistan|venezuela|vietnam|yemen|zimbabwe)\b/gi,
  /\b(tokyo|paris|london|new york|bangkok|berlin|rome|madrid|barcelona|amsterdam|dubai|singapore|hong kong|sydney|melbourne|toronto|vancouver|los angeles|san francisco|miami|chicago|boston|seattle|helsinki|stockholm|oslo|copenhagen|prague|vienna|zurich|geneva|brussels|budapest|warsaw|krakow|lisbon|porto|dublin|edinburgh|glasgow|manchester|birmingham|liverpool|mumbai|delhi|bangalore|kolkata|chennai|hyderabad|pune|ahmedabad|jaipur|istanbul|ankara|cairo|casablanca|marrakech|jerusalem|tel aviv|ramallah|bethlehem|nablus|hebron)\b/gi,
];

// Conversation continuation patterns
const CONTINUATION_PATTERNS = [
  /^(yes|yeah|yep|sure|ok|okay|please|go ahead|continue|tell me more|that would be great)$/i,
  /^(yes please|yeah please|sure thing|sounds good|perfect)$/i,
  /^(do it|let's do it|let's go|proceed)$/i,
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
      const lowerMessage = message.toLowerCase().trim();

      // PRIORITY CHECK: System identity questions first (before any other analysis)
      // Must be very specific to avoid false positives
      const identityKeywords = [
        "who are you",
        "what are you",
        "who created you",
        "who made you",
        "who built you",
        "who developed you",
        "what is atlas",
        "about atlas",
        "your creator",
        "your developer",
        "tell me about yourself",
        "creator name",
        "name of your creator",
        "who is your creator",
        "created by who",
        "made by whom",
      ];

      // ENHANCED: More precise matching to avoid false positives
      const isIdentityQuestion = identityKeywords.some((keyword) => {
        // Exact phrase matching for better precision
        if (keyword.includes(" ")) {
          return lowerMessage.includes(keyword);
        } else {
          // For single words, ensure they're not part of other phrases
          const words = lowerMessage.split(/\s+/);
          return words.includes(keyword);
        }
      });

      // ADDITIONAL CHECK: Must be a direct question about the system, not travel planning
      const isDefinitelyIdentityQuestion =
        isIdentityQuestion &&
        (lowerMessage.startsWith("who are") ||
          lowerMessage.startsWith("what are") ||
          lowerMessage.startsWith("who created") ||
          lowerMessage.startsWith("who made") ||
          lowerMessage.startsWith("who built") ||
          lowerMessage.includes("your creator") ||
          lowerMessage.includes("creator name") ||
          lowerMessage.includes("name of your creator") ||
          (lowerMessage.includes("who") &&
            lowerMessage.includes("created") &&
            lowerMessage.includes("you")));

      if (isDefinitelyIdentityQuestion) {
        console.log(
          "🤖 IDENTITY QUESTION DETECTED - bypassing travel analysis"
        );
        return {
          primaryIntent: {
            type: "system_identity",
            confidence: 1.0, // Maximum confidence for identity questions
          },
          allIntents: {
            system_identity: { type: "system_identity", confidence: 1.0 },
          },
          locations: [], // No locations for identity questions
          urgency: "normal",
          complexity: "low",
          isConversationContinuation: false,
          multiToolRequirements: {
            shouldUseMultipleTools: false, // Never use tools for identity
            requiredTools: [],
            reasoning: ["Identity question - no tools needed"],
          },
          travelContext: { type: "system", indicators: ["identity"] },
          messageLength: message.length,
          hasQuestions: message.includes("?"),
          hasDates: [],
        };
      }

      // Check for conversation continuation
      const isConversationContinuation = CONTINUATION_PATTERNS.some((pattern) =>
        pattern.test(lowerMessage)
      );

      // Enhanced intent analysis with weighted scoring
      const intents = Object.fromEntries(
        Object.entries(INTENT_DEFINITIONS).map(([key, def]) => {
          let confidence = 0;

          // Primary keyword matching with higher weight
          const primaryMatches = def.priority_keywords.filter((keyword) =>
            lowerMessage.includes(keyword)
          ).length;
          confidence += primaryMatches * def.weight;

          // Secondary keyword matching
          const secondaryMatches = def.keywords.filter(
            (keyword) =>
              !def.priority_keywords.includes(keyword) &&
              lowerMessage.includes(keyword)
          ).length;
          confidence += secondaryMatches * 0.5;

          // Context keyword bonus
          const contextMatches =
            def.context_keywords?.filter((keyword) =>
              lowerMessage.includes(keyword)
            ).length || 0;
          confidence += contextMatches * 0.3;

          // Normalize confidence score
          const maxPossibleScore =
            def.priority_keywords.length * def.weight +
            (def.keywords.length - def.priority_keywords.length) * 0.5 +
            (def.context_keywords?.length || 0) * 0.3;

          return [
            key,
            {
              ...def,
              confidence: Math.min(confidence / maxPossibleScore, 1.0),
              raw_score: confidence,
            },
          ];
        })
      );

      // Get primary intent (highest confidence)
      const primaryIntent = Object.values(intents).sort(
        (a, b) => b.confidence - a.confidence
      )[0];

      // Ensure minimum confidence threshold
      if (primaryIntent.confidence < 0.1) {
        primaryIntent.type = "destination_planning";
        primaryIntent.confidence = 0.3;
      }

      const locations = this.extractLocations(message);
      const urgency = this.assessUrgency(message);
      const complexity = this.assessComplexity(message);

      // Enhanced multi-tool requirements analysis
      const multiToolRequirements = this.analyzeMultiToolRequirements(
        message,
        primaryIntent,
        locations,
        intents
      );

      // Enhanced travel context analysis
      const travelContext = this.analyzeTravelContext(message, primaryIntent);

      return {
        primaryIntent,
        allIntents: intents,
        locations,
        urgency,
        complexity,
        isConversationContinuation,
        multiToolRequirements,
        travelContext,
        messageLength: message.length,
        hasQuestions: message.includes("?"),
        hasDates: this.extractDates(message).length > 0,
      };
    } catch (error) {
      console.error("Intent analysis error:", error.message);
      return {
        primaryIntent: { type: "destination_planning", confidence: 0.5 },
        allIntents: {},
        locations: [],
        urgency: "normal",
        complexity: "medium",
        isConversationContinuation: false,
        multiToolRequirements: { shouldUseMultipleTools: false },
        travelContext: { type: "general", indicators: [] },
      };
    }
  },

  analyzeMultiToolRequirements(message, primaryIntent, locations, intents) {
    const lowerMessage = message.toLowerCase();
    let shouldUseMultipleTools = false;
    const requiredTools = [];
    const reasoning = [];

    // Multi-intent detection (high confidence in multiple areas)
    const highConfidenceIntents = Object.values(intents).filter(
      (intent) => intent.confidence > 0.4
    );

    if (highConfidenceIntents.length > 1) {
      shouldUseMultipleTools = true;
      reasoning.push("Multiple high-confidence intents detected");
      highConfidenceIntents.forEach((intent) => {
        requiredTools.push(this.mapIntentToTool(intent.type));
      });
    }

    // Complex travel planning indicators
    const complexPlanningKeywords = [
      "comprehensive",
      "detailed",
      "complete",
      "full analysis",
      "everything",
      "all information",
      "thorough",
      "in-depth",
      "extensive",
    ];

    if (
      complexPlanningKeywords.some((keyword) => lowerMessage.includes(keyword))
    ) {
      shouldUseMultipleTools = true;
      reasoning.push("Comprehensive analysis requested");
    }

    // Location-based comprehensive requests
    if (
      locations.length > 0 &&
      (lowerMessage.includes("tell me about") ||
        lowerMessage.includes("what should I know") ||
        lowerMessage.includes("plan my trip") ||
        lowerMessage.includes("visiting") ||
        lowerMessage.includes("traveling to"))
    ) {
      shouldUseMultipleTools = true;
      reasoning.push("Comprehensive destination analysis requested");
      requiredTools.push(
        "cultural_and_travel_insights",
        "comprehensive_safety_intelligence"
      );
    }

    // Safety + other concerns
    if (primaryIntent.type === "safety_inquiry" && locations.length > 0) {
      if (
        lowerMessage.includes("weather") ||
        lowerMessage.includes("climate")
      ) {
        shouldUseMultipleTools = true;
        requiredTools.push(
          "comprehensive_safety_intelligence",
          "comprehensive_weather_analysis"
        );
        reasoning.push("Safety inquiry with weather concerns");
      }
    }

    return {
      shouldUseMultipleTools,
      requiredTools: [...new Set(requiredTools)],
      reasoning,
      complexity: shouldUseMultipleTools ? "high" : "standard",
    };
  },

  analyzeTravelContext(message, primaryIntent) {
    const lowerMessage = message.toLowerCase();

    // Detect travel timing
    const timingIndicators = {
      immediate: ["today", "now", "right now", "immediately", "urgent"],
      near_term: ["tomorrow", "this week", "next week", "soon", "shortly"],
      planned: ["next month", "next year", "planning", "future", "later"],
    };

    let timing = "unspecified";
    for (const [timeframe, indicators] of Object.entries(timingIndicators)) {
      if (indicators.some((indicator) => lowerMessage.includes(indicator))) {
        timing = timeframe;
        break;
      }
    }

    // Detect travel purpose
    const purposeIndicators = {
      business: ["business", "work", "conference", "meeting", "professional"],
      leisure: ["vacation", "holiday", "fun", "relax", "leisure", "tourism"],
      family: ["family", "kids", "children", "relatives", "wedding"],
      adventure: ["adventure", "hiking", "extreme", "sports", "outdoor"],
      cultural: ["culture", "history", "museum", "heritage", "traditional"],
      medical: ["medical", "treatment", "health", "doctor", "hospital"],
    };

    const purposes = [];
    for (const [purpose, indicators] of Object.entries(purposeIndicators)) {
      if (indicators.some((indicator) => lowerMessage.includes(indicator))) {
        purposes.push(purpose);
      }
    }

    return {
      timing,
      purposes: purposes.length > 0 ? purposes : ["general"],
      type: primaryIntent.type,
      indicators: this.extractTravelIndicators(message),
    };
  },

  extractTravelIndicators(message) {
    const indicators = [];
    const lowerMessage = message.toLowerCase();

    // Duration indicators
    if (lowerMessage.includes("week")) indicators.push("week_duration");
    if (lowerMessage.includes("month")) indicators.push("month_duration");
    if (lowerMessage.includes("day")) indicators.push("day_duration");

    // Group size indicators
    if (lowerMessage.includes("solo") || lowerMessage.includes("alone"))
      indicators.push("solo_travel");
    if (lowerMessage.includes("family") || lowerMessage.includes("kids"))
      indicators.push("family_travel");
    if (lowerMessage.includes("group") || lowerMessage.includes("friends"))
      indicators.push("group_travel");

    // Budget indicators
    if (lowerMessage.includes("budget") || lowerMessage.includes("cheap"))
      indicators.push("budget_conscious");
    if (lowerMessage.includes("luxury") || lowerMessage.includes("premium"))
      indicators.push("luxury_seeking");

    return indicators;
  },

  mapIntentToTool(intentType) {
    const mapping = {
      safety_inquiry: "comprehensive_safety_intelligence",
      weather_inquiry: "comprehensive_weather_analysis",
      dining_recommendations: "intelligent_restaurant_discovery",
      accommodation_search: "smart_accommodation_finder",
      cultural_inquiry: "cultural_and_travel_insights",
      activity_recommendations: "local_experiences_and_attractions",
    };
    return mapping[intentType] || "cultural_and_travel_insights";
  },

  extractLocations(message) {
    try {
      const locations = [];
      LOCATION_PATTERNS.forEach((pattern) => {
        const matches = message.match(pattern);
        if (matches) {
          locations.push(...matches.map((match) => match.toLowerCase().trim()));
        }
      });

      // Also check for common location prepositions
      const locationPrepositions =
        /\b(?:to|in|at|from|visiting|going to|traveling to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
      let match;
      while ((match = locationPrepositions.exec(message)) !== null) {
        const location = match[1].toLowerCase();
        if (location.length > 2) {
          // Avoid single letters or very short words
          locations.push(location);
        }
      }

      return [...new Set(locations)];
    } catch (error) {
      console.error("Location extraction error:", error.message);
      return [];
    }
  },

  extractDates(message) {
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // MM/DD/YYYY or DD/MM/YYYY
      /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g, // MM-DD-YYYY or DD-MM-YYYY
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{2,4}\b/gi,
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{2,4}\b/gi,
      /\b(next|this)\s+(week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    ];

    const dates = [];
    datePatterns.forEach((pattern) => {
      const matches = message.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    });

    return dates;
  },

  assessUrgency(message) {
    try {
      const lowerMessage = message.toLowerCase();

      // High urgency indicators
      if (
        lowerMessage.includes("emergency") ||
        lowerMessage.includes("urgent") ||
        lowerMessage.includes("immediately") ||
        lowerMessage.includes("right now") ||
        lowerMessage.includes("asap")
      ) {
        return "high";
      }

      // Medium urgency indicators
      if (
        lowerMessage.includes("soon") ||
        lowerMessage.includes("next week") ||
        lowerMessage.includes("this week") ||
        lowerMessage.includes("tomorrow") ||
        lowerMessage.includes("quickly")
      ) {
        return "medium";
      }

      return "normal";
    } catch (error) {
      return "normal";
    }
  },

  assessComplexity(message) {
    try {
      const complexityFactors = [
        message.includes("itinerary"),
        message.includes("multiple"),
        message.includes("compare"),
        message.includes("comprehensive"),
        message.includes("detailed"),
        message.includes("budget"),
        message.includes("family"),
        message.includes("business"),
        message.split("?").length > 2,
        message.split(",").length > 3,
        message.length > 100,
        this.extractLocations(message).length > 1,
        this.extractDates(message).length > 0,
      ].filter(Boolean).length;

      if (complexityFactors >= 5) return "high";
      if (complexityFactors >= 3) return "medium";
      return "low";
    } catch (error) {
      return "medium";
    }
  },

  enhanceSystemPrompt(userIntent, conversationHistory) {
    try {
      let prompt = systemPrompts?.getMainSystemPrompt?.() || FALLBACK_PROMPT;

      // Add intent-specific enhancements
      const intentEnhancements = {
        safety_inquiry:
          (systemPrompts?.getSafetyAnalysisPrompt?.() ||
            "Provide comprehensive security assessment with actionable intelligence") +
          "\n\nFocus on current threat levels and practical recommendations.",

        cultural_inquiry:
          (systemPrompts?.getCulturalInsightPrompt?.() ||
            "Provide deep cultural insights and practical guidance") +
          "\n\nEmphasize respectful cultural engagement and authentic experiences.",

        destination_planning:
          (systemPrompts?.getLocationAnalysisPrompt?.() ||
            "Provide comprehensive destination analysis") +
          "\n\nDeliver strategic travel intelligence with multiple perspectives.",

        weather_inquiry:
          "Provide detailed weather analysis with travel-specific recommendations. Include clothing advice, activity suggestions, and weather alerts.",

        accommodation_search:
          "Provide strategic accommodation recommendations across all price points with neighborhood analysis and booking optimization.",

        dining_recommendations:
          "Provide culinary intelligence including local specialties, cultural dining practices, and restaurant recommendations.",

        activity_recommendations:
          "Provide experience curation with local insights, authentic activities, and practical planning advice.",
      };

      if (intentEnhancements[userIntent.primaryIntent.type]) {
        prompt += "\n\n" + intentEnhancements[userIntent.primaryIntent.type];
      }

      // Add urgency-based modifications
      if (userIntent.urgency === "high") {
        prompt +=
          "\n\nURGENT REQUEST: Prioritize immediate, actionable information with clear next steps.";
      }

      // Add complexity-based modifications
      if (userIntent.complexity === "high") {
        prompt +=
          "\n\nCOMPLEX ANALYSIS: Use multiple tools strategically. Provide comprehensive analysis with structured, professional response format.";
      }

      // Add multi-tool strategy if required
      if (userIntent.multiToolRequirements?.shouldUseMultipleTools) {
        prompt += `\n\nMULTI-TOOL STRATEGY: This request requires comprehensive analysis using multiple tools. Required tools: ${userIntent.multiToolRequirements.requiredTools.join(
          ", "
        )}. Provide integrated analysis from all sources.`;
      }

      // Add conversation context
      if (conversationHistory && conversationHistory.length > 0) {
        prompt +=
          "\n\nCONVERSATION CONTEXT: Continue the conversation naturally, referencing previous interactions when relevant.";
      }

      return prompt;
    } catch (error) {
      console.error("System prompt enhancement error:", error.message);
      return FALLBACK_PROMPT;
    }
  },

  formatProfessionalResponse(rawResponse, toolsUsed, userIntent) {
    try {
      let response = rawResponse;

      // Clean up redundant tool mentions
      const toolNames = toolsUsed.map((tool) =>
        tool.replace(/comprehensive_|smart_|intelligent_/g, "")
      );

      // Remove redundant acknowledgments
      const redundantPhrases = [
        /Thank you for providing.*?tool call\.?\s*/gi,
        /Based on the.*?report,?\s*/gi,
        /According to the.*?assessment,?\s*/gi,
        /The.*?indicates that\s*/gi,
        /From the.*?analysis,?\s*/gi,
      ];

      redundantPhrases.forEach((pattern) => {
        response = response.replace(pattern, "");
      });

      // Remove empty lines and excessive spacing
      response = response
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\s+/gm, "")
        .trim();

      // ENHANCED: Remove empty headings and fix structure
      response = this.removeEmptyHeadings(response);

      // Add executive summary for complex responses (but only if content exists)
      if (
        (userIntent.complexity === "high" || toolsUsed.length > 2) &&
        !response.includes("**EXECUTIVE SUMMARY**") &&
        response.length > 200
      ) {
        const keyPoints = this.extractKeyPoints(response);
        if (keyPoints.length > 0) {
          const summary = keyPoints.slice(0, 2).join(" • ");
          response = `**EXECUTIVE SUMMARY**\n${summary}\n\n---\n\n${response}`;
        }
      }

      // ENHANCED: Only structure if we have substantial content
      if (toolsUsed.length > 1 && response.length > 300) {
        response = this.addResponseStructure(response, userIntent, toolsUsed);
        // Clean up again after structuring
        response = this.removeEmptyHeadings(response);
      }

      return response;
    } catch (error) {
      console.error("Response formatting error:", error.message);
      return rawResponse;
    }
  },

  // NEW: Remove empty headings and sections
  removeEmptyHeadings(response) {
    const lines = response.split("\n");
    const cleanedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i].trim();

      // If this is a heading (starts and ends with **)
      if (
        currentLine.startsWith("**") &&
        currentLine.endsWith("**") &&
        currentLine.length > 4
      ) {
        // Check if there's actual content after this heading
        let hasContent = false;
        let nextContentIndex = -1;

        // Look ahead for the next non-empty, non-heading line
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine === "") continue; // Skip empty lines

          // If we hit another heading, stop looking
          if (nextLine.startsWith("**") && nextLine.endsWith("**")) {
            break;
          }

          // Found actual content
          if (nextLine.length > 0) {
            hasContent = true;
            nextContentIndex = j;
            break;
          }
        }

        // Only include the heading if there's content after it
        if (hasContent) {
          cleanedLines.push(currentLine);
        } else {
          console.log(`Removing empty heading: ${currentLine}`);
        }
      } else {
        // Not a heading, include as-is
        cleanedLines.push(currentLine);
      }
    }

    return cleanedLines.join("\n");
  },

  addResponseStructure(response, userIntent, toolsUsed) {
    // Don't restructure if it's already well-structured OR if it's too short
    if (
      (response.includes("**") && response.includes("##")) ||
      response.length < 400
    ) {
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
      activity_recommendations: [
        "**ACTIVITY OVERVIEW**",
        "**TOP RECOMMENDATIONS**",
        "**PLANNING TIPS**",
      ],
    };

    const headers = intentHeaders[userIntent.primaryIntent.type];
    if (!headers) return response;

    // Split response into logical sections with better logic
    const paragraphs = response.split(/\n\n+/);
    if (paragraphs.length < 2) return response;

    // Only add structure if we have enough substantial paragraphs
    const substantialParagraphs = paragraphs.filter(
      (p) => p.trim().length > 100
    );
    if (substantialParagraphs.length < 2) return response;

    // Distribute content more intelligently
    const structuredSections = [];
    let headerIndex = 0;

    substantialParagraphs.forEach((paragraph, index) => {
      if (headerIndex < headers.length && paragraph.trim().length > 50) {
        structuredSections.push(
          `${headers[headerIndex]}\n\n${paragraph.trim()}`
        );
        headerIndex++;
      } else {
        // Add to last section if no more headers
        if (structuredSections.length > 0) {
          structuredSections[
            structuredSections.length - 1
          ] += `\n\n${paragraph.trim()}`;
        } else {
          structuredSections.push(paragraph.trim());
        }
      }
    });

    return structuredSections.join("\n\n");
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
        "key",
        "main",
        "primary",
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
