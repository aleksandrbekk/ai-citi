"""Deploy coach agent to Vertex AI Agent Engine"""
import vertexai
import os

# Project settings
PROJECT_ID = "gen-lang-client-0102901194"
LOCATION = "us-central1"

# Initialize Vertex AI
print("Initializing Vertex AI...")
vertexai.init(project=PROJECT_ID, location=LOCATION)

# Create client
print("Creating client...")
client = vertexai.Client()

# Get current directory (coach-agent)
current_dir = os.path.dirname(os.path.abspath(__file__))
print(f"Current directory: {current_dir}")

# Deploy from source files
print("\nDeploying agent to Agent Engine...")
print(f"Project: {PROJECT_ID}")
print(f"Location: {LOCATION}")

try:
    remote_agent = client.agent_engines.create(
        config={
            "display_name": "AI Coach - КОУЧ",
            "description": "Персональный AI-коуч для глубокого самопознания и карьерной трансформации.",
            "source_packages": [current_dir],
            "entrypoint_module": "agent",
            "entrypoint_object": "root_agent",
            "requirements_file": "requirements.txt",
            "agent_framework": "google-adk",
            "class_methods": [
                {
                    "name": "stream_query",
                    "api_mode": "stream",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "user_id": {"type": "string"},
                            "session_id": {"type": "string"},
                            "message": {"type": "string"}
                        },
                        "required": ["user_id", "session_id", "message"]
                    }
                }
            ],
        }
    )
    
    print("\n✅ Agent deployed successfully!")
    print(f"Resource name: {remote_agent.api_resource.name}")
    
except Exception as e:
    print(f"\n❌ Deployment failed: {e}")
    import traceback
    traceback.print_exc()
