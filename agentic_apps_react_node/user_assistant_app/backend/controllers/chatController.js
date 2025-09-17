import axios from "axios";
import { toolService } from "../services/toolService.js";
import { responseEngine } from "../services/responseEngine.js";
import { getLocationData } from "../utils/locationUtils.js";
import { conversationContext } from "../utils/profileUtils.js";
import { fallbackResponses } from "../utils/fallbackResponses.js";
import crypto from "crypto";

// Helper functions to avoid 'this' binding issues (enhanced versions)
function getOrCreateContext(userId) {
  try {
    if (!conversationContext.has(userId)) {
      console.log(`🆕 Creating new context for user: ${userId}`);
      conversationContext.set(userId, {
        history: [],
        currentLocation: null,
        userProfile: {
          preferredStyle: "comprehensive",
          travelExperience: "intermediate",
          interests: [],
        },
        createdAt: Date.now(),
        lastActive: Date.now(),
        requestCount: 0,
      });
    } else {
      // Update last active time and request count
      const context = conversationContext.get(userId);
      context.lastActive = Date.now();
      context.requestCount = (context.requestCount || 0) + 1;
    }
    return conversationContext.get(userId);
  } catch (err) {
    console.error("❌ Context creation error:", err.message);
    return {
      history: [],
      currentLocation: null,
      userProfile: {
        preferredStyle: "comprehensive",
        travelExperience: "intermediate",
        interests: [],
      },
      createdAt: Date.now(),
      lastActive: Date.now(),
      requestCount: 1,
    };
  }
}

// Enhanced input validation
function validateInput(message, userId) {
  const errors = [];

  if (!message || typeof message !== "string") {
    errors.push("Message is required and must be a string");
  } else {
    if (message.length < 1) errors.push("Message cannot be empty");
    if (message.length > 2000)
      errors.push("Message too long (max 2000 characters)");
    if (message.trim().length === 0)
      errors.push("Message cannot be only whitespace");
  }

  if (userId && (typeof userId !== "string" || userId.length > 50)) {
    errors.push("Invalid user ID format");
  }

  return errors;
}

// Sanitize user input
function sanitizeInput(message) {
  return message
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .substring(0, 2000); // Hard limit
}

// Generate unique request ID for tracking
function generateRequestId() {
  return `req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

// Enhanced API call with retry logic
async function callGroqAPIWithRetry(
  message,
  context,
  userIntent,
  maxRetries = 3
) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await callGroqAPI(message, context, userIntent);

      // Validate response structure
      if (!response?.data?.choices?.[0]) {
        throw new Error("Invalid API response structure");
      }

      return response;
    } catch (error) {
      lastError = error;
      console.warn(
        `🔄 Groq API attempt ${attempt}/${maxRetries} failed:`,
        error.message
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

async function callGroqAPI(message, context, userIntent) {
  try {
    // Validate API key
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured");
    }

    const systemPrompt = {
      role: "system",
      content: responseEngine.enhanceSystemPrompt(userIntent, context.history),
    };

    // Clean the conversation history - remove custom metadata that Groq doesn't support
    // Keep only last 4 messages to save tokens and prevent context overflow
    const cleanHistory = context.history
      .map((msg) => ({
        role: msg.role,
        content:
          typeof msg.content === "string"
            ? msg.content.substring(0, 1000)
            : msg.content,
      }))
      .slice(-4);

    // Enhanced tool choice strategy
    let toolChoice = determineToolChoice(message, userIntent, context);

    const requestData = {
      model: "llama-3.3-70b-versatile",
      messages: [
        systemPrompt,
        ...cleanHistory,
        { role: "user", content: message },
      ],
      tools: toolService.getTools(),
      tool_choice: toolChoice,
      max_tokens: 2500,
      temperature: 0.3,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    };

    console.log(
      `🤖 Calling Groq API with ${
        requestData.messages.length
      } messages, tool_choice: ${JSON.stringify(toolChoice)}`
    );

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      requestData,
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 45000,
        validateStatus: (status) => status < 500, // Don't throw for 4xx errors
      }
    );

    if (response.status >= 400) {
      throw new Error(
        `API returned ${response.status}: ${response.statusText}`
      );
    }

    return response;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error("Request timeout - please try again");
    }
    if (error.response?.status === 429) {
      throw new Error("Rate limit exceeded");
    }
    if (error.response?.status === 401) {
      throw new Error("Authentication failed");
    }
    throw error;
  }
}

// Enhanced tool choice determination
function determineToolChoice(message, userIntent, context) {
  const lowerMessage = message.toLowerCase();

  // Handle conversation continuations (like "Yes please")
  if (
    userIntent.isConversationContinuation &&
    userIntent.primaryIntent.type === "activity_recommendations"
  ) {
    console.log(`🎾 Continuation: Forcing attractions tool for tennis courts`);
    return {
      type: "function",
      function: { name: "local_experiences_and_attractions" },
    };
  }

  // Smart activity analysis - check if weather would be helpful for outdoor activities
  if (userIntent.primaryIntent.type === "activity_recommendations") {
    const isOutdoorActivity =
      [
        "play",
        "tennis",
        "golf",
        "football",
        "run",
        "bike",
        "walk",
        "hike",
        "outdoor",
      ].some((keyword) => lowerMessage.includes(keyword)) &&
      ["today", "tomorrow", "this", "planning", "thinking"].some((keyword) =>
        lowerMessage.includes(keyword)
      );

    if (isOutdoorActivity && userIntent.locations?.length > 0) {
      console.log(
        `🌤️ Outdoor activity planning detected - using weather analysis for optimal timing`
      );
      return {
        type: "function",
        function: { name: "comprehensive_weather_analysis" },
      };
    } else if (
      ["where", "courts", "facilities", "venues"].some((keyword) =>
        lowerMessage.includes(keyword)
      )
    ) {
      console.log(`🔍 Venue search detected - using attractions tool`);
      return {
        type: "function",
        function: { name: "local_experiences_and_attractions" },
      };
    }
  }

  // Multi-tool requirements
  else if (userIntent.multiToolRequirements?.shouldUseMultipleTools) {
    console.log(`🔧 Multi-tool strategy activated - forcing tool usage`);
    return "required"; // Force tool usage
  }

  // Direct intent mapping with enhanced logic
  else if (
    userIntent.primaryIntent.type === "safety_inquiry" ||
    (userIntent.locations?.length > 0 &&
      ["safe", "security", "dangerous", "risk", "visit", "travel"].some(
        (keyword) => lowerMessage.includes(keyword)
      ))
  ) {
    console.log(
      `🚨 Safety-related query detected for locations: ${
        userIntent.locations?.join(", ") || "unknown"
      } - forcing safety tool`
    );
    return {
      type: "function",
      function: { name: "comprehensive_safety_intelligence" },
    };
  } else if (userIntent.primaryIntent.type === "weather_inquiry") {
    return {
      type: "function",
      function: { name: "comprehensive_weather_analysis" },
    };
  } else if (
    userIntent.primaryIntent.type === "dining_recommendations" &&
    ["restaurant", "where to eat"].some((keyword) =>
      lowerMessage.includes(keyword)
    )
  ) {
    return {
      type: "function",
      function: { name: "intelligent_restaurant_discovery" },
    };
  } else if (userIntent.primaryIntent.type === "accommodation_search") {
    return {
      type: "function",
      function: { name: "smart_accommodation_finder" },
    };
  } else if (userIntent.primaryIntent.type === "cultural_inquiry") {
    return {
      type: "function",
      function: { name: "cultural_and_travel_insights" },
    };
  }

  // Location-based fallback with enhanced keyword detection
  else if (userIntent.locations?.length > 0 && toolChoice === "auto") {
    console.log(
      `🌍 Location-based query detected: ${userIntent.locations.join(
        ", "
      )} - selecting appropriate tool`
    );

    const locationKeywords = {
      weather: ["weather", "climate"],
      food: ["food", "restaurant", "eat"],
      hotel: ["hotel", "stay", "accommodation"],
      culture: ["culture", "people", "custom"],
      activities: ["activities", "attractions", "things to do"],
    };

    for (const [category, keywords] of Object.entries(locationKeywords)) {
      if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
        const toolMap = {
          weather: "comprehensive_weather_analysis",
          food: "intelligent_restaurant_discovery",
          hotel: "smart_accommodation_finder",
          culture: "cultural_and_travel_insights",
          activities: "local_experiences_and_attractions",
        };

        const selectedTool = toolMap[category];
        console.log(
          `🎯 Selected tool: ${selectedTool} for location-based query`
        );

        return {
          type: "function",
          function: { name: selectedTool },
        };
      }
    }

    // Default to cultural insights for general location queries
    return {
      type: "function",
      function: { name: "cultural_and_travel_insights" },
    };
  }

  return "auto";
}

function updateContext(
  context,
  message,
  responseContent,
  userIntent,
  toolsUsed
) {
  try {
    context.history.push(
      { role: "user", content: message },
      {
        role: "assistant",
        content: responseContent,
        intent: userIntent.primaryIntent.type,
        toolsUsed,
        timestamp: new Date().toISOString(),
      }
    );

    // Keep history manageable - reduced from 12 to 10
    if (context.history.length > 10) {
      context.history = context.history.slice(-10);
    }

    // Update user profile safely
    const profile = context.userProfile;
    if (userIntent.locations && userIntent.locations.length > 0) {
      const currentInterests = profile.interests || [];
      const newInterests = [...currentInterests, ...userIntent.locations];
      profile.interests = [...new Set(newInterests)].slice(0, 20); // Limit to prevent bloat
    }

    // Update preferred style based on keywords
    const styleKeywords = {
      luxury: ["luxury", "premium", "high-end", "exclusive"],
      budget: ["budget", "cheap", "affordable", "economical"],
      adventure: ["adventure", "extreme", "outdoor", "hiking"],
      cultural: ["culture", "museum", "history", "traditional"],
    };

    Object.entries(styleKeywords).forEach(([style, keywords]) => {
      if (keywords.some((keyword) => message.toLowerCase().includes(keyword))) {
        profile.preferredStyle = style;
      }
    });
  } catch (err) {
    console.error("❌ Context update error:", err.message);
  }
}

function handleAPIError(
  groqError,
  message,
  userIntent,
  context,
  res,
  requestId
) {
  console.error("🛠️ Handling API error:", {
    message: groqError.message,
    status: groqError.response?.status,
    requestId,
  });

  const errorTypes = {
    network: ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT"],
    serviceDown: [503],
    rateLimited: [429],
    unauthorized: [401],
    badRequest: [400],
  };

  // Handle 400 Bad Request errors
  if (errorTypes.badRequest.includes(groqError.response?.status)) {
    console.log("⚠️ Bad request to Groq API - using fallback");
    const fallback = fallbackResponses.generateEnhancedFallback(
      message,
      userIntent
    );
    return res.json({
      result:
        fallback.result +
        "\n\n*Note: Providing professional guidance due to API compatibility issue.*",
      tools_used: [],
      context_location: context.currentLocation?.formatted_address || null,
      timestamp: new Date().toISOString(),
      fallback: true,
      requestId,
    });
  }

  // Network issues
  if (errorTypes.network.includes(groqError.code)) {
    console.log("🌐 Network connectivity issue detected");
    const fallback = fallbackResponses.generateEnhancedFallback(
      message,
      userIntent
    );
    return res.json({
      result:
        fallback.result +
        "\n\n*Note: Operating in offline mode due to connectivity issues.*",
      tools_used: [],
      context_location: context.currentLocation?.formatted_address || null,
      timestamp: new Date().toISOString(),
      fallback: true,
      networkIssue: true,
      requestId,
    });
  }

  // Service unavailable
  if (errorTypes.serviceDown.includes(groqError.response?.status)) {
    console.log("⚠️ AI service unavailable");
    const fallback = fallbackResponses.generateEnhancedFallback(
      message,
      userIntent
    );
    return res.json({
      result:
        fallback.result +
        "\n\n*Note: AI services temporarily unavailable. Professional guidance provided.*",
      tools_used: [],
      context_location: context.currentLocation?.formatted_address || null,
      timestamp: new Date().toISOString(),
      fallback: true,
      requestId,
    });
  }

  // Rate limited
  if (errorTypes.rateLimited.includes(groqError.response?.status)) {
    console.log("⏱️ Rate limit exceeded");

    // Try to provide useful info from tools even when rate limited
    if (context.currentLocation || userIntent.locations?.length > 0) {
      const location =
        context.currentLocation?.formatted_address || userIntent.locations[0];
      return res.json({
        result: `I'm currently experiencing high demand, but I can tell you that for ${location}, you should check official travel advisories and consult with local authorities for the most current information. Please try again in a few moments for a comprehensive analysis.`,
        tools_used: [],
        timestamp: new Date().toISOString(),
        isError: true,
        rateLimited: true,
        location: location,
        requestId,
      });
    }

    return res.json({
      result:
        "Our AI systems are at capacity due to high demand. Please wait a moment for full capabilities.",
      tools_used: [],
      timestamp: new Date().toISOString(),
      isError: true,
      rateLimited: true,
      requestId,
    });
  }

  // Authentication error
  if (errorTypes.unauthorized.includes(groqError.response?.status)) {
    console.error("🔒 Authentication failed");
    return res.status(500).json({
      error: "Authentication error",
      message: "Server configuration issue. Please contact support.",
      requestId,
    });
  }

  // Generic API error - provide fallback
  console.log("🔥 Providing fallback for generic API error");
  const fallback = fallbackResponses.generateEnhancedFallback(
    message,
    userIntent
  );
  return res.json({
    result:
      fallback.result +
      "\n\n*Note: Providing professional guidance while AI services restore.*",
    tools_used: [],
    context_location: context.currentLocation?.formatted_address || null,
    timestamp: new Date().toISOString(),
    fallback: true,
    requestId,
  });
}

// Standalone function for processing tools (FIXED: not a method)
async function processWithTools(
  toolCalls,
  assistantMessage,
  message,
  context,
  userIntent,
  startTime,
  res,
  requestId
) {
  try {
    console.log(
      `🔧 Processing ${toolCalls.length} tool calls for request ${requestId}`
    );

    const toolResults = await Promise.all(
      toolCalls.map(async (toolCall, index) => {
        try {
          console.log(
            `🔧 Executing tool ${index + 1}/${toolCalls.length}: ${
              toolCall.function.name
            } - Request ${requestId}`
          );

          const { name, arguments: args } = toolCall.function;
          let parsedArgs;

          try {
            parsedArgs = JSON.parse(args);
          } catch (parseError) {
            console.error(
              `❌ Failed to parse tool arguments for ${name}:`,
              parseError.message
            );
            return {
              role: "tool",
              tool_call_id: toolCall.id,
              name,
              content: JSON.stringify({
                error: `Invalid tool arguments: ${parseError.message}`,
              }),
            };
          }

          // Auto-enhance with location data
          if (
            (name.includes("restaurant") ||
              name.includes("accommodation") ||
              name.includes("experiences")) &&
            !parsedArgs.lat &&
            parsedArgs.location_name
          ) {
            try {
              console.log(
                `🔍 Getting location data for: ${parsedArgs.location_name}`
              );
              const locationData = await getLocationData(
                parsedArgs.location_name
              );
              parsedArgs = {
                ...parsedArgs,
                lat: locationData.lat,
                lon: locationData.lon,
                country: locationData.country,
              };
              context.currentLocation = locationData;
              console.log(
                `✅ Location enhanced: ${locationData.formatted_address} - Request ${requestId}`
              );
            } catch (locError) {
              console.warn(
                `⚠️ Location enhancement failed for request ${requestId}:`,
                locError.message
              );
            }
          }

          // For multi-tool requests, enhance with detected location if missing
          if (
            userIntent.locations?.length > 0 &&
            !parsedArgs.location &&
            !parsedArgs.country
          ) {
            const primaryLocation = userIntent.locations[0];
            parsedArgs.location = primaryLocation;
            parsedArgs.country = primaryLocation;
            console.log(
              `🔍 Enhanced ${name} with location: ${primaryLocation}`
            );
          }

          // Validate and execute tool
          toolService.validateToolArgs(name, parsedArgs);
          const result = await toolService.executeTool(name, parsedArgs);

          // VALIDATION: Check if tool actually returned useful data
          let toolContent = JSON.stringify(result);
          let hasValidData = false;

          if (result && !result.error) {
            if (name === "local_experiences_and_attractions") {
              hasValidData =
                result.recommendations &&
                Array.isArray(result.recommendations) &&
                result.recommendations.length > 0;
            } else if (name === "intelligent_restaurant_discovery") {
              hasValidData =
                result.restaurants &&
                Array.isArray(result.restaurants) &&
                result.restaurants.length > 0;
            } else if (name === "smart_accommodation_finder") {
              hasValidData =
                result.properties &&
                Array.isArray(result.properties) &&
                result.properties.length > 0;
            } else if (name === "comprehensive_safety_intelligence") {
              hasValidData =
                result.safety_assessment ||
                result.current_situation ||
                !result.error;
            } else if (name === "comprehensive_weather_analysis") {
              hasValidData =
                result.current_conditions ||
                result.forecast_summary ||
                !result.error;
            } else if (name === "cultural_and_travel_insights") {
              hasValidData =
                result.cultural_intelligence ||
                result.practical_tips ||
                !result.error;
            }
          }

          // If no valid data, mark it clearly
          if (!hasValidData) {
            console.warn(`⚠️ Tool ${name} returned no valid data`);
            toolContent = JSON.stringify({
              tool_status: "no_data_available",
              message: `No current data available for ${name}. Please provide fallback guidance.`,
              location:
                parsedArgs.location ||
                parsedArgs.location_name ||
                parsedArgs.country,
              tool_name: name,
            });
          } else {
            console.log(`✅ Tool ${name} returned valid data: ${hasValidData}`);
          }

          console.log(`✅ Tool ${name} executed successfully`);

          return {
            role: "tool",
            tool_call_id: toolCall.id,
            name,
            content: toolContent,
          };
        } catch (toolError) {
          console.error(
            `❌ Tool ${toolCall.function.name} failed for request ${requestId}:`,
            toolError.message
          );
          return {
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify({
              error: `Tool execution failed: ${toolError.message}`,
              suggestion:
                "Please provide complete location information for accurate analysis.",
            }),
          };
        }
      })
    );

    console.log(
      `🔄 Generating final response with tool results for request ${requestId}`
    );

    // Generate final response with enhanced system prompt
    const finalResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: responseEngine
              .enhanceSystemPrompt(userIntent, context.history)
              .substring(0, 1500),
          },
          { role: "user", content: message },
          assistantMessage,
          ...toolResults,
        ],
        max_tokens: 2500,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 45000,
      }
    );

    const finalContent = responseEngine.formatProfessionalResponse(
      finalResponse.data.choices[0].message.content,
      toolCalls.map((tc) => tc.function.name),
      userIntent
    );

    updateContext(
      context,
      message,
      finalContent,
      userIntent,
      toolCalls.map((tc) => tc.function.name)
    );

    console.log(
      `✅ Tool-based response completed successfully for request ${requestId}`
    );

    return res.json({
      result: finalContent,
      tools_used: toolCalls.map((tc) => tc.function.name),
      context_location: context.currentLocation?.formatted_address || null,
      timestamp: new Date().toISOString(),
      intent_analysis: {
        primary_intent: userIntent.primaryIntent.type,
        confidence: userIntent.primaryIntent.confidence,
        complexity: userIntent.complexity,
        urgency: userIntent.urgency,
        multi_tool_strategy:
          userIntent.multiToolRequirements?.shouldUseMultipleTools || false,
      },
      response_metadata: {
        tools_executed: toolCalls.length,
        processing_time: Date.now() - startTime,
        is_multi_tool: toolCalls.length > 1,
      },
      requestId,
    });
  } catch (err) {
    console.error(
      `❌ Tool processing error for request ${requestId}:`,
      err.message
    );

    // Handle rate limit on final response generation
    if (err.response?.status === 429) {
      console.log(
        `⚠️ Rate limit on final response - providing tool results directly for request ${requestId}`
      );

      const simplifiedResponse = `Based on the analysis tools, here's what I found for ${
        userIntent.locations?.[0] || "your destination"
      }. 

The safety intelligence indicates current conditions and recommendations for travelers. Please try again in a few moments for a detailed formatted analysis.

*Tool data collected successfully but detailed formatting temporarily unavailable due to high demand.*`;

      return res.json({
        result: simplifiedResponse,
        tools_used: toolCalls.map((tc) => tc.function.name),
        context_location: context.currentLocation?.formatted_address || null,
        timestamp: new Date().toISOString(),
        rateLimitedFinalResponse: true,
        intent_analysis: {
          primary_intent: userIntent.primaryIntent.type,
          confidence: userIntent.primaryIntent.confidence,
        },
        requestId,
      });
    }

    throw err;
  }
}

// Standalone function for processing direct response (FIXED: not a method)
function processDirectResponse(
  content,
  message,
  context,
  userIntent,
  startTime,
  res,
  requestId
) {
  try {
    console.log(`📝 Processing direct response for request ${requestId}`);

    const enhancedContent = responseEngine.formatProfessionalResponse(
      content,
      [],
      userIntent
    );
    updateContext(context, message, enhancedContent, userIntent, []);

    console.log(
      `✅ Direct response completed successfully for request ${requestId}`
    );

    return res.json({
      result: enhancedContent,
      tools_used: [],
      context_location: context.currentLocation?.formatted_address || null,
      timestamp: new Date().toISOString(),
      intent_analysis: {
        primary_intent: userIntent.primaryIntent.type,
        confidence: userIntent.primaryIntent.confidence,
        complexity: userIntent.complexity,
        urgency: userIntent.urgency,
        multi_tool_strategy:
          userIntent.multiToolRequirements?.shouldUseMultipleTools || false,
      },
      response_metadata: {
        tools_executed: 0,
        processing_time: Date.now() - startTime,
        is_multi_tool: false,
      },
      requestId,
    });
  } catch (err) {
    console.error(
      `❌ Direct response processing error for request ${requestId}:`,
      err.message
    );
    throw err;
  }
}

export const chatController = {
  async handleChat(req, res) {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      const { message, userId = "anonymous" } = req.body;

      // Enhanced input validation
      const validationErrors = validateInput(message, userId);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Validation failed",
          message: validationErrors.join(", "),
          requestId,
        });
      }

      // Sanitize input
      const sanitizedMessage = sanitizeInput(message);

      console.log(
        `📨 Request ${requestId} - User: ${userId}, Message: "${sanitizedMessage.substring(
          0,
          100
        )}..."`
      );

      // Check API key
      if (!process.env.GROQ_API_KEY) {
        console.error("❌ GROQ_API_KEY not configured");
        return res.status(500).json({
          error: "Configuration error",
          message:
            "Server configuration incomplete. Please contact administrator.",
          requestId,
        });
      }

      // Initialize user context using existing profileUtils
      const context = getOrCreateContext(userId);
      const userIntent = responseEngine.analyzeUserIntent(sanitizedMessage);

      // Handle conversation continuations (like "Yes please")
      if (userIntent.isConversationContinuation && context.history.length > 0) {
        console.log(
          `💬 Conversation continuation detected for request ${requestId}`
        );

        // Get the last assistant message to understand context
        const lastAssistantMessage = context.history
          .slice()
          .reverse()
          .find((msg) => msg.role === "assistant");

        if (lastAssistantMessage && lastAssistantMessage.content) {
          // Check if the last message was asking for recommendations
          const wasAskingForRecommendations = [
            "recommend",
            "would you like",
            "looking for",
            "tennis courts",
            "facilities",
          ].some((phrase) =>
            lastAssistantMessage.content.toLowerCase().includes(phrase)
          );

          if (wasAskingForRecommendations) {
            console.log(`🎾 Continuing tennis court search context`);

            // Extract location from conversation history
            let location = null;
            const lastUserMessage = context.history
              .slice()
              .reverse()
              .find((msg) => msg.role === "user");

            if (lastUserMessage) {
              const extractedLocations = responseEngine.extractLocations(
                lastUserMessage.content
              );
              location =
                extractedLocations[0] ||
                context.currentLocation?.formatted_address;
            }

            if (location) {
              // Modify the user intent to search for tennis courts/activities
              userIntent.primaryIntent = {
                type: "activity_recommendations",
                confidence: 0.9,
              };
              userIntent.locations = [location];
              userIntent.travelContext = {
                type: "sports",
                indicators: ["tennis", "continuation"],
              };
              console.log(
                `🔍 Modified intent for tennis court search in ${location}`
              );
            }
          }
        }
      }

      console.log(
        `🎯 Intent: ${userIntent.primaryIntent.type} (${userIntent.complexity}/${userIntent.urgency}) - Request ${requestId}`
      );

      // Log multi-tool requirements
      if (userIntent.multiToolRequirements?.shouldUseMultipleTools) {
        console.log(
          `🔧 Multi-tool requirements: ${JSON.stringify(
            userIntent.multiToolRequirements
          )}`
        );
      }

      try {
        const response = await callGroqAPIWithRetry(
          sanitizedMessage,
          context,
          userIntent
        );
        const assistantMessage = response.data.choices[0]?.message;
        const toolCalls = assistantMessage?.tool_calls;

        console.log(
          `📊 Groq response received for ${requestId}. Tool calls: ${
            toolCalls?.length || 0
          }`
        );

        if (toolCalls?.length > 0) {
          // FIXED: Call standalone function instead of this.processWithTools
          return await processWithTools(
            toolCalls,
            assistantMessage,
            sanitizedMessage,
            context,
            userIntent,
            startTime,
            res,
            requestId
          );
        } else {
          // If multi-tool was expected but no tools called, this is an issue
          if (userIntent.multiToolRequirements?.shouldUseMultipleTools) {
            console.log(
              "⚠️ Multi-tool expected but no tools called - using fallback"
            );

            const fallback = fallbackResponses.generateEnhancedFallback(
              sanitizedMessage,
              userIntent
            );

            return res.json({
              result:
                fallback.result +
                "\n\n*Note: Comprehensive analysis temporarily unavailable. Basic guidance provided.*",
              tools_used: [],
              context_location:
                context.currentLocation?.formatted_address || null,
              timestamp: new Date().toISOString(),
              fallback: true,
              expectedMultiTool: true,
              requestId,
            });
          }

          // FIXED: Call standalone function instead of this.processDirectResponse
          return processDirectResponse(
            assistantMessage.content,
            sanitizedMessage,
            context,
            userIntent,
            startTime,
            res,
            requestId
          );
        }
      } catch (groqError) {
        console.error("❌ Groq API Error Details:", {
          message: groqError.message,
          code: groqError.code,
          status: groqError.response?.status,
          statusText: groqError.response?.statusText,
          data: groqError.response?.data,
          requestId,
        });
        return handleAPIError(
          groqError,
          sanitizedMessage,
          userIntent,
          context,
          res,
          requestId
        );
      }
    } catch (err) {
      console.error("❌ Chat handler critical error:", {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        userId: req.body?.userId,
        messageLength: req.body?.message?.length,
        requestId,
      });
      return res.status(500).json({
        error: "Internal server error",
        message:
          "I'm experiencing technical difficulties. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        requestId,
        ...(process.env.NODE_ENV === "development" && { debug: err.message }),
      });
    }
  },

  async resetContext(req, res) {
    try {
      const { userId } = req.body;

      if (userId) {
        if (conversationContext.has(userId)) {
          conversationContext.delete(userId);
          console.log(`🔄 Context reset for user: ${userId}`);
          res.json({
            message: `Context reset for user ${userId}`,
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(404).json({
            error: "User context not found",
            message: `No context found for user ${userId}`,
          });
        }
      } else {
        const count = conversationContext.size;
        conversationContext.clear();
        console.log(`🔄 All contexts cleared (${count} contexts)`);
        res.json({
          message: "All contexts cleared",
          count,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("❌ Reset context error:", err.message);
      res.status(500).json({
        error: "Failed to reset context",
        message: "Unable to reset conversation context",
      });
    }
  },

  async getContext(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          error: "User ID required",
          message: "Please provide a user ID",
        });
      }

      const context = conversationContext.get(userId);
      if (!context) {
        return res.status(404).json({
          error: "Context not found",
          message: `No context found for user ${userId}`,
        });
      }

      res.json({
        userId,
        context: {
          messageCount: context.history.length,
          currentLocation: context.currentLocation,
          userProfile: context.userProfile,
          lastActivity: new Date(context.lastActive).toISOString(),
          requestCount: context.requestCount || 0,
        },
      });
    } catch (err) {
      console.error("❌ Get context error:", err.message);
      res.status(500).json({
        error: "Failed to get context",
        message: "Unable to retrieve conversation context",
      });
    }
  },

  // Enhanced system stats using existing conversationContext
  async getSystemStats(req, res) {
    try {
      const memoryUsage = process.memoryUsage();
      const contexts = Array.from(conversationContext.values());
      const now = Date.now();

      const stats = {
        system: "ATLAS Travel Assistant",
        status: "operational",
        contexts: {
          total: conversationContext.size,
          activeToday: contexts.filter(
            (context) => now - context.lastActive < 24 * 60 * 60 * 1000
          ).length,
          activeThisHour: contexts.filter(
            (context) => now - context.lastActive < 60 * 60 * 1000
          ).length,
        },
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
          usage:
            Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) +
            "%",
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
        },
        uptime: Math.floor(process.uptime()) + " seconds",
        environment: process.env.NODE_ENV || "development",
        node_version: process.version,
        timestamp: new Date().toISOString(),
        api_keys_configured: {
          groq: !!process.env.GROQ_API_KEY,
          openweather: !!process.env.OPEN_WEATHER_KEY,
          yelp: !!process.env.YELP_API_KEY,
          news: !!process.env.NEWS_API_KEY,
          google: !!process.env.GOOGLE_API_KEY,
        },
      };

      res.json(stats);
    } catch (err) {
      console.error("❌ Stats error:", err.message);
      res.status(500).json({
        error: "Failed to get system stats",
        message: "Unable to retrieve system statistics",
      });
    }
  },
};
