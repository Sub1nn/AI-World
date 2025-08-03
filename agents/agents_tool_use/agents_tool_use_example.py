import requests
import json
from groq import Groq
from dotenv import load_dotenv
import os   

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
                for i in range(5)
            ]
        }
        return json.dumps(result)
    except Exception as e:
        return json.dumps({"error": f"Error fetching weather data: {str(e)}"})
    

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
        system_prompt = '''You are a helpful assistant that answers questions based on the provided context. If no context is available, answer from your own knowledge.
        '''
        system_context = {
            'role': 'system',
            'content': system_prompt
        }

        
        user_context = {
            'role': 'user',
            'content': user_prompt
        }

        tools = [get_weather_tool_properties()]
        available_functions = {"get_weather": get_weather}
        messages=[system_context, user_context]

        llm_response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            tools=tools,
            tool_choice="auto",
            max_completion_tokens=2000,
        )
        llm_answer = llm_response.choices[0].message     
        tool_calls = llm_answer.tool_calls
        if tool_calls:
            for tool_call in tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                tool_response = available_functions[function_name](**function_args)
                messages.append({
                  'tool_call_id': tool_call.id,
                  'role': 'tool',
                  'content': tool_response,
                  'name': function_name
                })
                llm_response = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    temperature=0.7,
                    max_completion_tokens=2000,
                )
                llm_answer = llm_response.choices[0].message.content
                messages.append({
                  'role': 'assistant',
                  'content': llm_answer
                })
            return llm_answer
        else:
            llm_answer = llm_response.choices[0].message.content
if __name__ == "__main__":
    user_prompt = input("Enter your query: ")
    answer = run_agent(user_prompt)
    print("LLM Answer:", answer)
    # Example usage:
    # user_prompt = "What's the weather like in New York City?"
    # answer = run_agent(user_prompt)
    # print("LLM Answer:", answer)
    # This will print the weather information for New York City.



    #### ADK
## session => Just a simple context window memory => which keeps track of what happened with the response of llm or input from user
