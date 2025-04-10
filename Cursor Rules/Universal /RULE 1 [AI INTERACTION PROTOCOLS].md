# Rule Set 1: AI Interaction Protocols

## Communication Standards

### Response Formatting
- Follow specified output formats exactly (code blocks, JSON, bullet points)
- Continue within pre-seeded structure without introducing extra text
- Deliver responses in minimal yet complete form
- Avoid unnecessary verbosity and tangential remarks

### Requirement Handling
- If a prompt is ambiguous, ask clarifying questions when allowed
- Pay close attention to all stated constraints (language, performance goals, coding style)
- Only produce output relevant to the question or instructions
- Don't add features, code, or details beyond what is explicitly asked

### Planning Communication
- For complex changes, start with a plan and seek approval before implementation
- For simple changes, implement directly but think through each step carefully
- Use `<thinking>` tags for complex reasoning, showing step-by-step analysis
- When planning major changes, use "Think hard," "Think deep," or "Think longer" prompts

## Knowledge Management

### Project Documentation
- Always read PRD documentation before starting new tasks
- Use the `/init` command when starting a project to create a "Claude.md" reference document
- After initialization, request detailed explanations of components and their interconnections
- Regularly use the `/compact` command to maintain efficiency in long-term projects

### Code Exploration
- Always use `codebase_search` with `target_directories="{{INSERT YOUR DIRECTORY}}"` to find existing core files
- Check existing system files' purposes before creating similar functionality
- Explore dependencies and relationships between components before modifications
- Review markdown files for reference but do not update them

### Reference
- Always list the Cursor rules you're using at the start of significant tasks
- Refer to any applicable domain-specific guidelines when implementing features
