from google.adk.agents import LlmAgent
from google.adk.tools import agent_tool
from google.adk.tools.google_search_tool import GoogleSearchTool
from google.adk.tools import url_context

google_search_agent = LlmAgent(
    name='google_search_agent',
    model='gemini-2.5-flash',
    description='Agent specialized in performing Google searches.',
    sub_agents=[],
    instruction='Use the GoogleSearchTool to find information on the web.',
    tools=[GoogleSearchTool()],
)

url_context_agent = LlmAgent(
    name='url_context_agent',
    model='gemini-2.5-flash',
    description='Agent specialized in fetching content from URLs.',
    sub_agents=[],
    instruction='Use the UrlContextTool to retrieve content from provided URLs.',
    tools=[url_context],
)

root_agent = LlmAgent(
    name='lawyer',
    model='gemini-2.5-flash',
    description='Agent to help interact with my data.',
    sub_agents=[],
    instruction='ТЫ профессиональный юрист',
    tools=[
        agent_tool.AgentTool(agent=google_search_agent),
        agent_tool.AgentTool(agent=url_context_agent)
    ],
)
