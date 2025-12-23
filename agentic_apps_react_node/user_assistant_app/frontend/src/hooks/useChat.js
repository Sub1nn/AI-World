import { useState } from "react";
import { chatAPI } from "../services/api";

export const useChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "assistant",
      content:
        "**ATLAS TRAVEL INTELLIGENCE SYSTEM**\n\nWelcome to the world's most advanced AI travel companion. I provide professional-grade travel intelligence including:\n\n• **Real-time Security Analysis** - Current threat assessments and safety intelligence\n• **Destination Intelligence** - Comprehensive location analysis and strategic recommendations\n• **Accommodation Strategy** - Property analysis and booking optimization across all categories\n• **Culinary Intelligence** - Local dining culture and restaurant recommendations\n• **Cultural Briefings** - Deep cultural insights and etiquette guidance\n• **Weather Intelligence** - Meteorological analysis with travel impact assessment\n\n**Ready to provide world-class travel intelligence.** Where would you like to explore?",
      timestamp: new Date(),
      tools: [],
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const data = await chatAPI.sendMessage(inputMessage);
      setIsTyping(false);

      const assistantMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: data.result,
        timestamp: new Date(),
        tools: data.tools_used || [],
        location: data.context_location,
        isError: false,
      };

      // Simulate typing delay for better UX
      setTimeout(() => {
        setMessages((prev) => [...prev, assistantMessage]);
      }, 600);
    } catch (error) {
      setIsTyping(false);
      console.error("Chat error:", error);

      const errorMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content:
          error.message ||
          "I apologize, but I'm having trouble connecting to my travel intelligence systems. Please check that the backend server is running and try again.",
        timestamp: new Date(),
        tools: [],
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetContext = async () => {
    try {
      await chatAPI.resetContext();
      setMessages([messages[0]]); // Keep welcome message
    } catch (error) {
      console.error("Reset context error:", error);
    }
  };

  return {
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    isTyping,
    sendMessage,
    resetContext,
  };
};
