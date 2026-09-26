# Reproduce the Bedrock agent setup

This setup uses temporary AWS credentials and never stores the generated
Bedrock bearer token in Git.

```sh
npm install -g @strands-agents/cli
uv venv
uv pip install "strands-agents[openai]" aws-bedrock-token-generator

codex mcp add strands-agents -- uvx strands-agents-mcp-server
codex mcp add bedrock-agentcore-mcp-server -- uvx awslabs.amazon-bedrock-agentcore-mcp-server

export AWS_REGION="us-east-1"
export MODEL_ID="global.openai.gpt-5.6-terra"
export OPENAI_BASE_URL="https://bedrock-runtime.${AWS_REGION}.amazonaws.com/openai/v1"
export OPENAI_API_KEY="$(python3 -c "from aws_bedrock_token_generator import provide_token; print(provide_token(region='$AWS_REGION'))")"
python examples/strands/agent_with_tools.py
unset OPENAI_API_KEY
```

The MCP registrations become callable after starting a new Codex session.
`Unsupported` in the MCP authentication column is expected for these local
stdio servers; it is not a server failure.

The weather tool is deliberately simulated and must not be represented as
live weather data. CareScribe's healthcare workflow remains synthetic-only,
non-diagnostic, and clinician-reviewed.
