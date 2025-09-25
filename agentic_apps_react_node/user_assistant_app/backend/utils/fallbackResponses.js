// utils/fallbackResponses.js - Enhanced professional fallback responses
export const fallbackResponses = {
  generateEnhancedFallback(message, userIntent) {
    const intentType = userIntent.primaryIntent.type;
    const locations = userIntent.locations;
    const urgency = userIntent.urgency;

    // Professional responses based on intent
    switch (intentType) {
      case "safety_inquiry":
        return this.generateSafetyFallback(message, locations, urgency);
      case "destination_planning":
        return this.generateDestinationFallback(message, locations, urgency);
      case "accommodation_search":
        return this.generateAccommodationFallback(message, locations, urgency);
      case "dining_recommendations":
        return this.generateDiningFallback(message, locations, urgency);
      case "cultural_inquiry":
        return this.generateCulturalFallback(message, locations, urgency);
      case "weather_inquiry":
        return this.generateWeatherFallback(message, locations, urgency);
      case "activity_recommendations":
        return this.generateActivityFallback(message, locations, urgency);
      case "travel_logistics":
        return this.generateLogisticsFallback(message, locations, urgency);
      default:
        return this.generateGeneralFallback(message, locations, urgency);
    }
  },

  generateSafetyFallback(message, locations, urgency) {
    if (locations.length === 0) {
      return {
        result: `**ATLAS SECURITY INTELLIGENCE**

I understand you're seeking safety assessment for your travel plans. To provide you with accurate, current security intelligence, I need to know your specific destination.

**Professional Security Assessment Available For:**
• Current threat levels and risk analysis
• Regional security briefings and advisories  
• Crime statistics and traveler-specific risks
• Emergency protocols and contingency planning
• Health and medical security considerations

**Please specify your destination** (city, region, or country) so I can provide a comprehensive security briefing with current intelligence.

For immediate safety concerns or emergencies, contact your local authorities or nearest embassy/consulate.`,
        needsLocation: true,
      };
    }

    const location = locations[0];
    return {
      result: `**SECURITY BRIEFING: ${location.toUpperCase()}**

I'm currently operating in offline mode but can provide foundational security guidance for ${location}:

**GENERAL SECURITY PROTOCOLS:**
• Monitor current State Department/Foreign Office advisories
• Register with your embassy upon arrival
• Maintain situational awareness in public spaces
• Keep copies of important documents in separate locations
• Establish emergency communication protocols

**RECOMMENDED ACTIONS:**
• Consult official government travel advisories for ${location}
• Contact local embassy/consulate for current security briefing
• Research reputable local security services if needed
• Verify current entry requirements and restrictions

**Note:** For real-time threat assessment and current security intelligence, please try again when my advanced analysis systems are available, or consult official diplomatic sources.`,
      needsLocation: false,
    };
  },

  generateDestinationFallback(message, locations, urgency) {
    if (locations.length === 0) {
      return {
        result: `**ATLAS DESTINATION INTELLIGENCE**

I'm ready to provide comprehensive destination analysis for your travel planning. To deliver personalized intelligence, please specify your intended destination.

**Comprehensive Analysis Available:**
• Destination overview and strategic positioning
• Optimal travel timing and seasonal considerations
• Cultural landscape and local customs
• Economic factors and budget optimization
• Safety and security assessment
• Accommodation and dining intelligence
• Local experiences and insider recommendations

**Please specify your destination** so I can provide detailed intelligence for informed travel planning.`,
        needsLocation: true,
      };
    }

    const location = locations[0];
    return {
      result: `**DESTINATION INTELLIGENCE: ${location.toUpperCase()}**

**STRATEGIC OVERVIEW:**
${location} represents a significant travel destination with unique cultural, historical, and geographical characteristics that require informed planning for optimal experience.

**KEY PLANNING CONSIDERATIONS:**
• **Timing:** Research seasonal patterns for weather, crowds, and pricing
• **Cultural Preparation:** Study local customs, etiquette, and social norms
• **Documentation:** Verify passport/visa requirements and validity periods
• **Health:** Consult travel medicine specialists for required vaccinations
• **Communication:** Learn basic local phrases and download translation apps
• **Currency:** Research exchange rates and preferred payment methods

**PROFESSIONAL RECOMMENDATION:**
For comprehensive, real-time destination intelligence including current safety assessments, weather forecasts, and local recommendations, please reconnect when my full analytical capabilities are available.

**Immediate Resources:**
• Official tourism board websites
• Embassy/consulate travel information
• Reputable travel guide publishers
• Local tourism authority contacts`,
      needsLocation: false,
    };
  },

  generateAccommodationFallback(message, locations, urgency) {
    if (locations.length === 0) {
      return {
        result: `**ATLAS ACCOMMODATION INTELLIGENCE**

I specialize in accommodation analysis across all categories - from luxury resorts to boutique properties and budget-conscious options.

**Accommodation Intelligence Available:**
• Property analysis and value assessment
• Neighborhood positioning and accessibility
• Amenity optimization for your travel style
• Booking strategy and timing recommendations
• Local alternatives and hidden gems

**Please specify your destination** so I can provide targeted accommodation intelligence.`,
        needsLocation: true,
      };
    }

    const location = locations[0];
    return {
      result: `**ACCOMMODATION STRATEGY: ${location.toUpperCase()}**

**STRATEGIC ACCOMMODATION GUIDANCE:**
When selecting accommodation in ${location}, consider these professional recommendations:

**LOCATION PRIORITIZATION:**
• Proximity to key attractions vs. local authenticity
• Transportation accessibility and connectivity
• Neighborhood safety and evening atmosphere
• Local services and amenities availability

**BOOKING INTELLIGENCE:**
• Book 2-8 weeks in advance for optimal rates
• Monitor cancellation policies for flexibility
• Consider shoulder seasons for value optimization
• Verify included amenities vs. additional fees

**PROPERTY CATEGORIES TO CONSIDER:**
• International chains for consistency and loyalty benefits
• Boutique properties for unique local character
• Local establishments for authentic cultural immersion
• Alternative accommodations for extended stays

For real-time property analysis, current availability, and personalized recommendations, please reconnect when my full accommodation intelligence systems are operational.`,
      needsLocation: false,
    };
  },

  generateDiningFallback(message, locations, urgency) {
    if (locations.length === 0) {
      return {
        result: `**ATLAS CULINARY INTELLIGENCE**

I provide comprehensive dining intelligence including local specialties, cultural dining practices, and venue recommendations across all categories.

**Culinary Analysis Available:**
• Traditional cuisine and local specialties
• Restaurant recommendations by category and budget
• Food safety and dietary accommodation guidance
• Cultural dining etiquette and practices
• Market and street food intelligence

**Please specify your destination** for targeted culinary recommendations.`,
        needsLocation: true,
      };
    }

    const location = locations[0];
    return {
      result: `**CULINARY INTELLIGENCE: ${location.toUpperCase()}**

**CULINARY LANDSCAPE OVERVIEW:**
${location} offers a distinctive culinary environment that reflects its cultural heritage, geographical influences, and contemporary dining evolution.

**DINING STRATEGY:**
• **Local Specialties:** Research traditional dishes and regional variations
• **Dining Customs:** Understand meal timing, service expectations, and etiquette
• **Food Safety:** Follow standard precautions for international dining
• **Budget Allocation:** Mix high-end experiences with authentic local venues
• **Cultural Respect:** Learn about dietary restrictions and religious considerations

**RECOMMENDED APPROACH:**
• Start with hotel concierge recommendations for orientation
• Explore local markets for authentic ingredient sourcing
• Ask locals for family-run establishment recommendations
• Book popular restaurants in advance during peak seasons

For real-time restaurant analysis, current menu information, and personalized dining recommendations, please reconnect when my full culinary intelligence systems are available.`,
      needsLocation: false,
    };
  },

  generateCulturalFallback(message, locations, urgency) {
    if (locations.length === 0) {
      return {
        result: `**ATLAS CULTURAL INTELLIGENCE**

I provide deep cultural analysis to ensure respectful, enriching travel experiences through informed cultural engagement.

**Cultural Intelligence Available:**
• Historical context and cultural foundations
• Social customs and etiquette protocols
• Religious practices and spiritual considerations
• Communication styles and language guidance
• Business customs and professional interactions

**Please specify your destination** for comprehensive cultural briefing.`,
        needsLocation: true,
      };
    }

    const location = locations[0];
    return {
      result: `**CULTURAL INTELLIGENCE BRIEFING: ${location.toUpperCase()}**

**CULTURAL FOUNDATION:**
Understanding ${location}'s cultural landscape is essential for meaningful travel experiences and respectful interaction with local communities.

**KEY CULTURAL CONSIDERATIONS:**
• **Social Hierarchy:** Understand respect protocols and interpersonal dynamics
• **Communication:** Learn direct vs. indirect communication preferences
• **Religious Sensitivity:** Respect sacred spaces, dress codes, and observances
• **Business Etiquette:** Understand professional customs and meeting protocols
• **Gift Culture:** Learn appropriate gifts and gesture interpretations

**PRACTICAL CULTURAL NAVIGATION:**
• Research recent cultural events and celebrations
• Understand tipping customs and service expectations
• Learn basic greetings and courtesy phrases
• Respect photography restrictions and privacy norms
• Understand appropriate attire for different settings

**CULTURAL IMMERSION OPPORTUNITIES:**
• Traditional festivals and cultural events
• Local markets and artisan communities
• Cultural centers and educational institutions
• Community-based tourism initiatives

For detailed cultural briefings with current local insights, please reconnect when my full cultural intelligence systems are operational.`,
      needsLocation: false,
    };
  },

  generateWeatherFallback(message, locations, urgency) {
    if (locations.length === 0) {
      return {
        result: `**ATLAS METEOROLOGICAL INTELLIGENCE**

I provide comprehensive weather analysis including current conditions, extended forecasts, and travel-optimized recommendations.

**Weather Intelligence Available:**
• Current conditions and real-time updates
• Extended forecasts with travel impact analysis
• Seasonal patterns and optimal timing guidance
• Weather-based activity recommendations
• Climate considerations for packing and preparation

**Please specify your destination** for detailed meteorological analysis.`,
        needsLocation: true,
      };
    }

    const location = locations[0];
    return {
      result: `**METEOROLOGICAL BRIEFING: ${location.toUpperCase()}**

**WEATHER STRATEGY GUIDANCE:**
For accurate, current weather intelligence for ${location}, I recommend consulting multiple meteorological sources for the most reliable forecasting.

**RECOMMENDED WEATHER RESOURCES:**
• National meteorological services for official forecasts
• International weather services (AccuWeather, Weather.com)
• Local weather apps and regional forecasting services
• Aviation weather services for detailed atmospheric conditions

**GENERAL CLIMATE CONSIDERATIONS:**
• Research seasonal weather patterns and variations
• Understand regional microclimates and elevation effects
• Plan for weather contingencies and indoor alternatives
• Pack appropriate clothing for expected conditions
• Monitor weather alerts and advisories before departure

**TRAVEL OPTIMIZATION:**
• Consider shoulder seasons for favorable weather/crowd balance
• Plan activities based on typical daily weather patterns
• Prepare backup plans for weather-dependent activities

For real-time weather analysis with travel-specific recommendations, please reconnect when my meteorological intelligence systems are available.`,
      needsLocation: false,
    };
  },

  generateActivityFallback(message, locations, urgency) {
    if (locations.length === 0) {
      return {
        result: `**ATLAS EXPERIENCE INTELLIGENCE**

I curate experiences and activities that showcase destinations' unique character while matching your personal interests and travel style.

**Experience Analysis Available:**
• Signature attractions and cultural landmarks
• Local experiences and authentic activities
• Adventure and outdoor activity options
• Cultural immersion and learning opportunities
• Entertainment and nightlife recommendations

**Please specify your destination** for personalized experience curation.`,
        needsLocation: true,
      };
    }

    const location = locations[0];
    return {
      result: `**EXPERIENCE CURATION: ${location.toUpperCase()}**

**ACTIVITY STRATEGY FOR ${location.toUpperCase()}:**

**SIGNATURE EXPERIENCES:**
• Research iconic attractions and their optimal visiting times
• Identify unique local experiences not available elsewhere
• Consider seasonal activities and weather-dependent options
• Explore cultural institutions and educational opportunities

**LOCAL IMMERSION:**
• Connect with local tour operators and community guides
• Participate in traditional crafts or cooking experiences
• Attend local festivals, markets, and community events
• Explore neighborhoods beyond tourist districts

**PLANNING RECOMMENDATIONS:**
• Book popular attractions in advance to avoid disappointment
• Balance planned activities with spontaneous exploration time
• Consider transportation logistics between activities
• Research opening hours, ticket prices, and booking requirements

For real-time activity recommendations with current availability and personalized curation based on your interests, please reconnect when my full experience intelligence systems are operational.`,
      needsLocation: false,
    };
  },

  generateLogisticsFallback(message, locations, urgency) {
    const location = locations.length > 0 ? locations[0] : "your destination";

    return {
      result: `**ATLAS TRAVEL LOGISTICS INTELLIGENCE**

**ESSENTIAL TRAVEL LOGISTICS FOR ${location.toUpperCase()}:**

**DOCUMENTATION REQUIREMENTS:**
• Verify passport validity (6+ months recommended)
• Research visa requirements and processing times
• Obtain necessary travel insurance coverage
• Prepare digital and physical copies of important documents

**FINANCIAL PLANNING:**
• Research local currency and exchange options
• Understand credit card acceptance and fees
• Plan cash needs for markets and small vendors
• Consider mobile payment app availability

**TRANSPORTATION INTELLIGENCE:**
• Airport transfer options and booking recommendations
• Local transportation networks and payment methods
• Regional connectivity for multi-destination travel
• Transportation apps and booking platforms

**HEALTH AND SAFETY PREPARATIONS:**
• Consult travel medicine specialists for required vaccinations
• Research health insurance coverage abroad
• Prepare emergency contact information
• Understand local emergency service protocols

For real-time logistics intelligence including current entry requirements, transportation options, and personalized planning assistance, please reconnect when my full systems are operational.`,
      needsLocation: false,
    };
  },

  generateGeneralFallback(message, locations, urgency) {
    return {
      result: `**ATLAS TRAVEL INTELLIGENCE SYSTEM**

I'm currently operating in limited mode but remain committed to providing professional travel assistance.

**AVAILABLE IMMEDIATELY:**
• Destination strategy and planning guidance
• Cultural intelligence and etiquette briefings  
• Travel logistics and documentation requirements
• General safety and security protocols
• Budget planning and optimization strategies

**FULL CAPABILITIES (when systems restore):**
• Real-time safety and security intelligence
• Current weather analysis and forecasting
• Live accommodation availability and recommendations
• Restaurant intelligence with real-time data
• Cultural events and local experience curation
• Comprehensive destination analysis with multiple data sources

**IMMEDIATE ASSISTANCE:**
Please specify your destination and travel requirements, and I'll provide the most comprehensive guidance possible with current capabilities.

**Professional Recommendation:**
For mission-critical travel planning, consider consulting official tourism boards, embassy services, and established travel professionals as backup resources while my systems restore full functionality.`,
      needsLocation: locations.length === 0,
    };
  },

  // Legacy method for backward compatibility
  generateFallbackResponse(message) {
    // Simple intent detection for legacy calls
    const lowerMessage = message.toLowerCase();
    let intentType = "general";

    if (lowerMessage.includes("safe") || lowerMessage.includes("security"))
      intentType = "safety_inquiry";
    else if (lowerMessage.includes("weather")) intentType = "weather_inquiry";
    else if (
      lowerMessage.includes("restaurant") ||
      lowerMessage.includes("food")
    )
      intentType = "dining_recommendations";
    else if (lowerMessage.includes("hotel") || lowerMessage.includes("stay"))
      intentType = "accommodation_search";

    const mockIntent = {
      primaryIntent: { type: intentType },
      locations: this.hasLocationKeywords(message)
        ? ["specified location"]
        : [],
      urgency: "normal",
    };

    return this.generateEnhancedFallback(message, mockIntent);
  },

  hasLocationKeywords(message) {
    const locationKeywords = [
      "in ",
      "at ",
      "tokyo",
      "paris",
      "london",
      "new york",
      "bangkok",
      "berlin",
      "rome",
      "madrid",
      "barcelona",
      "amsterdam",
      "dubai",
      "singapore",
      "hong kong",
      "sydney",
      "melbourne",
      "toronto",
      "vancouver",
      "los angeles",
      "san francisco",
      "miami",
      "chicago",
      "boston",
      "seattle",
      "helsinki",
      "stockholm",
      "oslo",
      "copenhagen",
      "prague",
      "vienna",
      "zurich",
      "geneva",
      "brussels",
      "budapest",
      "warsaw",
      "krakow",
      "lisbon",
      "porto",
      "dublin",
      "edinburgh",
      "glasgow",
      "manchester",
      "birmingham",
      "liverpool",
      "mumbai",
      "delhi",
      "bangalore",
      "kolkata",
      "chennai",
      "hyderabad",
      "pune",
      "ahmedabad",
      "jaipur",
      "lucknow",
      "kanpur",
      "nagpur",
      "goa",
      "kerala",
      "rajasthan",
      "gujarat",
      "punjab",
      "palestine",
      "israel",
      "west bank",
      "gaza",
      "middle east",
    ];

    return locationKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
  },
};
