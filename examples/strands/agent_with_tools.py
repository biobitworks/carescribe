from datetime import datetime
from datetime import timezone as tz
from typing import Any
from zoneinfo import ZoneInfo

import os
from strands import Agent, tool
from strands.models.openai_responses import OpenAIResponsesModel


@tool
def current_time(timezone: str = "UTC") -> str:
    """Get the current time in a specified timezone."""
    if timezone.upper() == "UTC":
        timezone_obj: Any = tz.utc
    else:
        timezone_obj = ZoneInfo(timezone)
    return datetime.now(timezone_obj).strftime("%Y-%m-%d %H:%M:%S %Z")


@tool
def current_weather(city: str) -> str:
    """Get simulated weather for a city; replace this with a real API."""
    weather_data = {
        "Seattle": "58°F, Cloudy with light rain",
        "New York": "72°F, Sunny and clear",
        "London": "55°F, Overcast",
        "Miami": "85°F, Humid with scattered clouds",
        "Tokyo": "68°F, Partly cloudy",
    }
    return weather_data.get(city, f"Weather data not available for {city}")


model = OpenAIResponsesModel(
    model_id=os.environ["MODEL_ID"],
    client_args={
        "api_key": os.environ["OPENAI_API_KEY"],
        "base_url": os.environ["OPENAI_BASE_URL"],
    },
)

agent = Agent(
    model=model,
    system_prompt=(
        "You are a helpful assistant that can tell the time and weather. "
        "Use your tools when the user asks about time or weather."
    ),
    tools=[current_time, current_weather],
)

response = agent("What is the current time and weather in Seattle?")
