import requests
import json
from groq import Groq
from dotenv import load_dotenv
import os   

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ADK: Session Memory Class
class SessionMemory:
    def __init__(self, max_history=10):
        self.history = []
        self.max_history = max_history
    
    def add_message(self, message):
        """Add a message to the session history"""
        self.history.append(message)
        # Keep only the most recent messages
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]
    
    def get_history(self):
        """Get the complete conversation history"""
        return self.history
    
    def clear_history(self):
        """Clear the conversation history"""
        self.history = []
    
    def get_recent_context(self, n=5):
        """Get the most recent n messages"""
        return self.history[-n:] if len(self.history) >= n else self.history

# Initialize global session memory
session_memory = SessionMemory()

def get_weather(lat, lon):
    try:
        url = (
                f"https://api.open-meteo.com/v1/forecast"
                f"?latitude={lat}&longitude={lon}"
                "&current_weather=true"
                "&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,rain"
                "&timezone=auto"
        )
        response = requests.get(url)
        data = response.json()
        current_weather = data.get("current_weather", {})
        hourly_data = data.get("hourly", {})
        if not current_weather:
            return "No current weather data available. Cannot provide weather information."
        
        result = {
            "current_weather": {
                "temperature": current_weather.get("temperature", "N/A"),
                "wind_speed": current_weather.get("windspeed", "N/A"),
                "time": current_weather.get("time", "N/A"),
            },
            "next_5_hours": [
                {
                    "time": hourly_data.get("time", [])[i],
                    "temperature": hourly_data.get("temperature_2m", [])[i],
                    "apparent_temperature": hourly_data.get("apparent_temperature", [])[i],
                    "relative_humidity": hourly_data.get("relative_humidity_2m", [])[i],
                    "wind_speed": hourly_data.get("wind_speed_10m", [])[i],
                    "rain": hourly_data.get("rain", [])[i],
                }
                for i in range(min(5, len(hourly_data.get("time", []))))
            ]
        }
        return json.dumps(result)
    except Exception as e:
        return json.dumps({"error": f"Error fetching weather data: {str(e)}"})

def get_coordinates(city_name):
    """
    Convert city name to latitude and longitude using OpenStreetMap API
    """
    try:
        url = f"https://nominatim.openstreetmap.org/search"
        params = {
            'q': city_name,
            'format': 'json',
            'limit': 1
        }
        headers = {
            'User-Agent': 'WeatherApp/1.0'
        }
        response = requests.get(url, params=params, headers=headers)
        data = response.json()
        
        if data:
            lat = float(data[0]['lat'])
            lon = float(data[0]['lon'])
            return lat, lon
        else:
            return None, None
    except Exception as e:
        print(f"Error getting coordinates: {e}")
        return None, None

def get_weather_tool_properties():
    return {
        'type': "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather and next 5 hours forecast for a given latitude and longitude of provided city.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {
                        "type": "number",
                        "description": "Latitude of the location."
                    },
                    "lon": {
                        "type": "number",
                        "description": "Longitude of the location."
                    }
                },
                "required": ["lat", "lon"]
            }
        }
    }

def run_agent(user_prompt):
    # ADK: Add user message to session memory
    user_message = {
        'role': 'user',
        'content': user_prompt
    }
    session_memory.add_message(user_message)
    
    system_prompt = '''You are a helpful weather assistant. You can help users get weather information for any location.
    When users ask for weather in a city by name, you should automatically determine the coordinates and fetch the weather.
    Provide clear, concise weather information in a user-friendly format.
    
    Conversation History:
    ''' + json.dumps(session_memory.get_history()[-3:], indent=2)  # Include recent context
    
    system_context = {
        'role': 'system',
        'content': system_prompt
    }

    # Get conversation history from session memory
    conversation_history = session_memory.get_history()
    messages = [system_context] + conversation_history

    tools = [get_weather_tool_properties()]
    available_functions = {"get_weather": get_weather}
    
    # ADK: Enhanced tool calling with better error handling
    try:
        llm_response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            tools=tools,
            tool_choice="auto",
            max_completion_tokens=2000,
        )
    except Exception as e:
        error_msg = f"Error calling LLM: {str(e)}"
        session_memory.add_message({'role': 'assistant', 'content': error_msg})
        return error_msg
    
    llm_answer = llm_response.choices[0].message     
    tool_calls = llm_answer.tool_calls
    
    if tool_calls:
        # ADK: Process tool calls and maintain session context
        for tool_call in tool_calls:
            function_name = tool_call.function.name
            try:
                function_args = json.loads(tool_call.function.arguments)
                if function_name in available_functions:
                    tool_response = available_functions[function_name](**function_args)
                else:
                    tool_response = json.dumps({"error": f"Function {function_name} not found"})
            except Exception as e:
                tool_response = json.dumps({"error": f"Error executing function: {str(e)}"})
            
            # ADK: Add tool response to session memory
            tool_message = {
                'tool_call_id': tool_call.id,
                'role': 'tool',
                'content': tool_response,
                'name': function_name
            }
            session_memory.add_message(tool_message)
            
            # ADK: Get final response from LLM
            try:
                llm_response = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=session_memory.get_history(),  # Use updated history
                    temperature=0.7,
                    max_completion_tokens=2000,
                )
                
                llm_answer = llm_response.choices[0].message.content
                # ADK: Add final assistant response to session memory
                assistant_message = {
                    'role': 'assistant',
                    'content': llm_answer
                }
                session_memory.add_message(assistant_message)
                return llm_answer
                
            except Exception as e:
                error_msg = f"Error getting final response: {str(e)}"
                session_memory.add_message({'role': 'assistant', 'content': error_msg})
                return error_msg
    else:
        # ADK: Handle direct responses
        llm_answer_content = llm_response.choices[0].message.content if llm_response.choices[0].message.content else "I'm not sure how to help with that."
        # ADK: Add assistant response to session memory
        assistant_message = {
            'role': 'assistant',
            'content': llm_answer_content
        }
        session_memory.add_message(assistant_message)
        return llm_answer_content

# ADK: Enhanced main function with session management
def main():
    print("🌤️ Weather Assistant ADK")
    print("Type 'quit' to exit, 'clear' to reset conversation history")
    print("-" * 50)
    
    while True:
        try:
            user_prompt = input("\n🌤️ You: ").strip()
            
            if user_prompt.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            elif user_prompt.lower() == 'clear':
                session_memory.clear_history()
                print("🧹 Conversation history cleared!")
                continue
            elif user_prompt.lower() == 'history':
                print("\n📝 Conversation History:")
                for i, msg in enumerate(session_memory.get_history()):
                    print(f"{i+1}. {msg['role']}: {msg['content'][:100]}{'...' if len(msg['content']) > 100 else ''}")
                continue
            elif not user_prompt:
                continue
                
            print("🤖 Assistant:", end=" ")
            answer = run_agent(user_prompt)
            print(answer)
            
        except KeyboardInterrupt:
            print("\n\n👋 Interrupted. Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    main()