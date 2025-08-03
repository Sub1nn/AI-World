import os
import json
import requests
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ---------- Session Memory Management ----------
class ConversationMemory:
    def __init__(self, max_messages=15):
        self.messages = []
        self.max_messages = max_messages

    def add_message(self, message: dict):
        self.messages.append(message)
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages:]

    def get_messages(self):
        return self.messages

    def clear_messages(self):
        self.messages = []

conversation_memory = ConversationMemory()

# ---------- External API Tools ----------

def get_location_coordinates(city_name: str):
    """Get latitude, longitude, and full display name from city name via OpenStreetMap."""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {'q': city_name, 'format': 'json', 'limit': 1}
        headers = {'User-Agent': 'TravelAssistant/1.0'}
        resp = requests.get(url, params=params, headers=headers)
        data = resp.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon']), data[0]['display_name']
        else:
            return None, None, None
    except Exception as e:
        return None, None, f"Error in get_location_coordinates: {str(e)}"

def fetch_weather_forecast(latitude: float, longitude: float):
    """Fetch current weather and next 5 hours forecast from Open-Meteo."""
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={latitude}&longitude={longitude}"
            "&current_weather=true"
            "&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,rain"
            "&timezone=auto"
        )
        resp = requests.get(url)
        data = resp.json()
        current = data.get("current_weather", {})
        hourly = data.get("hourly", {})

        if not current:
            return json.dumps({"error": "No current weather data available."})

        next_5_hours = [
            {
                "time": hourly.get("time", [])[i],
                "temperature": hourly.get("temperature_2m", [])[i],
                "apparent_temperature": hourly.get("apparent_temperature", [])[i],
                "relative_humidity": hourly.get("relative_humidity_2m", [])[i],
                "wind_speed": hourly.get("wind_speed_10m", [])[i],
                "rain": hourly.get("rain", [])[i]
            }
            for i in range(min(5, len(hourly.get("time", []))))
        ]

        return json.dumps({
            "current_weather": {
                "temperature": current.get("temperature", "N/A"),
                "wind_speed": current.get("windspeed", "N/A"),
                "time": current.get("time", "N/A")
            },
            "next_5_hours": next_5_hours
        })

    except Exception as e:
        return json.dumps({"error": f"Error fetching weather: {str(e)}"})

def search_hotels_by_budget(latitude: float, longitude: float, budget_level="mid"):
    """Search hotels by budget range using Google Places API."""
    try:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return json.dumps({"error": "Google API key not configured."})

        budget_map = {
            "budget": "budget hotel",
            "mid": "midrange hotel",
            "luxury": "luxury hotel"
        }
        query_text = budget_map.get(budget_level.lower(), "hotel")
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        params = {
            "query": query_text,
            "location": f"{latitude},{longitude}",
            "radius": 5000,
            "key": api_key
        }
        resp = requests.get(url, params=params)
        results = resp.json().get("results", [])[:5]
        return json.dumps(results)
    except Exception as e:
        return json.dumps({"error": f"Error searching hotels: {str(e)}"})

def search_restaurants_by_cuisine(latitude: float, longitude: float, cuisine_type="traditional"):
    """Search restaurants by cuisine type using Google Places API."""
    try:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return json.dumps({"error": "Google API key not configured."})

        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        params = {
            "query": f"{cuisine_type} restaurant",
            "location": f"{latitude},{longitude}",
            "radius": 5000,
            "key": api_key
        }
        resp = requests.get(url, params=params)
        results = resp.json().get("results", [])[:5]
        return json.dumps(results)
    except Exception as e:
        return json.dumps({"error": f"Error searching restaurants: {str(e)}"})

def get_travel_advisory_for_location(location_name: str):
    """Fetch recent events/advisories for location from Wikipedia current events."""
    try:
        url = "https://en.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "list": "search",
            "srsearch": f"{location_name} current events",
            "format": "json"
        }
        headers = {'User-Agent': 'TravelAssistant/1.0'}
        resp = requests.get(url, params=params, headers=headers)
        results = resp.json().get("query", {}).get("search", [])

        if not results:
            return json.dumps({"advisory": f"No recent events found for {location_name}."})

        summary = "\n\n".join([f"- {item['title']}: {item['snippet']}" for item in results[:3]])
        return json.dumps({"advisory": f"Recent events in {location_name}:\n\n{summary}"})

    except Exception as e:
        return json.dumps({"error": f"Error fetching advisory: {str(e)}"})

# --------- Tool metadata for LLM ---------
def get_tools_metadata():
    return [
        {
            "type": "function",
            "function": {
                "name": "fetch_weather_forecast",
                "description": "Get current weather and next 5 hours forecast for given latitude and longitude.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "latitude": {"type": "number"},
                        "longitude": {"type": "number"}
                    },
                    "required": ["latitude", "longitude"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_hotels_by_budget",
                "description": "Get hotel options filtered by budget (budget, mid, luxury).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "latitude": {"type": "number"},
                        "longitude": {"type": "number"},
                        "budget_level": {"type": "string"}
                    },
                    "required": ["latitude", "longitude"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_restaurants_by_cuisine",
                "description": "Find restaurants by cuisine type.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "latitude": {"type": "number"},
                        "longitude": {"type": "number"},
                        "cuisine_type": {"type": "string"}
                    },
                    "required": ["latitude", "longitude"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_travel_advisory_for_location",
                "description": "Get current travel advisories or recent events for a location.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location_name": {"type": "string"}
                    },
                    "required": ["location_name"]
                }
            }
        }
    ]

# Map function names to actual implementations
available_tools = {
    "fetch_weather_forecast": fetch_weather_forecast,
    "search_hotels_by_budget": search_hotels_by_budget,
    "search_restaurants_by_cuisine": search_restaurants_by_cuisine,
    "get_travel_advisory_for_location": get_travel_advisory_for_location
}

# ---------- Helper: Safe Groq API call with error handling ----------
def safe_groq_chat_completion_call(messages, tools=None, tool_choice="auto", max_tokens=2000):
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            tools=tools,
            tool_choice=tool_choice,
            max_completion_tokens=max_tokens,
        )
        return response, None
    except Exception as e:
        err_text = str(e)
        if "rate_limit_exceeded" in err_text or "429" in err_text:
            user_msg = "⚠️ API rate limit reached. Please wait a few minutes before retrying."
        else:
            user_msg = f"❌ LLM error: {err_text}"
        return None, user_msg

# ----------- Core agent processing function ----------
def process_user_query(user_input: str):
    # Add user message to conversation
    conversation_memory.add_message({'role': 'user', 'content': user_input})

    # Prepare system prompt
    system_content = (
        "You are a dynamic travel assistant AI. Use your tools to provide:\n"
        "- Weather info\n"
        "- Hotels recommendations by budget\n"
        "- Restaurant suggestions by cuisine\n"
        "- Travel advisories based on current events\n\n"
        "Be clear and helpful.\n"
        "Recent conversation:\n" + json.dumps(conversation_memory.get_messages()[-3:], indent=2)
    )

    messages = [{'role': 'system', 'content': system_content}] + conversation_memory.get_messages()

    # First call: allow tool calls
    llm_response, error = safe_groq_chat_completion_call(messages, tools=get_tools_metadata())
    if error:
        conversation_memory.add_message({'role': 'assistant', 'content': error})
        return error

    llm_msg = llm_response.choices[0].message
    tool_calls = getattr(llm_msg, "tool_calls", None)

    # If tools are called, execute them
    if tool_calls:
        for tool_call in tool_calls:
            func_name = tool_call.function.name
            raw_args = tool_call.function.arguments

            try:
                func_args = json.loads(raw_args)
            except Exception:
                err_msg = f"⚠️ Could not parse tool arguments: {raw_args}"
                conversation_memory.add_message({'role': 'assistant', 'content': err_msg})
                return err_msg

            func = available_tools.get(func_name)
            if not func:
                err_msg = f"⚠️ Unknown tool requested: {func_name}"
                conversation_memory.add_message({'role': 'assistant', 'content': err_msg})
                return err_msg

            # Call the tool function and add result to memory
            tool_result = func(**func_args)
            conversation_memory.add_message({
                'role': 'tool',
                'name': func_name,
                'tool_call_id': tool_call.id,
                'content': tool_result
            })

        # Second call: get final LLM response with updated conversation
        final_response, error = safe_groq_chat_completion_call(conversation_memory.get_messages(), tools=None)
        if error:
            conversation_memory.add_message({'role': 'assistant', 'content': error})
            return error

        final_text = final_response.choices[0].message.content
        conversation_memory.add_message({'role': 'assistant', 'content': final_text})
        return final_text

    else:
        # No tools called, respond directly
        reply_text = llm_msg.content or "Sorry, I don't have an answer for that."
        conversation_memory.add_message({'role': 'assistant', 'content': reply_text})
        return reply_text

# ---------- CLI interface ----------
def main_cli_loop():
    print("\n🧳 Travel Assistant AI - Type 'exit' or 'quit' to leave, 'clear' to reset.\n")
    while True:
        try:
            user_text = input("✈️ You: ").strip()
            if user_text.lower() in ['exit', 'quit']:
                print("👋 Goodbye!")
                break
            if user_text.lower() == 'clear':
                conversation_memory.clear_messages()
                print("🧹 Conversation cleared!")
                continue
            if not user_text:
                continue

            print("🤖 Assistant: ", end="")
            answer = process_user_query(user_text)
            print(answer)

        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break

if __name__ == "__main__":
    main_cli_loop()
