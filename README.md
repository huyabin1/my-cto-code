# CTO AI Code 🤖

An AI-powered code generation and assistance tool designed to help CTOs, developers, and engineering teams write better code faster.

## Features

- **Code Generation**: Generate code from natural language descriptions
- **Code Review**: Get AI-powered code reviews with actionable suggestions
- **Code Explanation**: Understand complex code with detailed explanations
- **Multi-Language Support**: Works with Python, JavaScript, and more
- **Multiple AI Providers**: Support for OpenAI and Anthropic APIs

## Installation

```bash
# Clone the repository
git clone https://github.com/huyabin1/my-cto-code.git
cd my-cto-code

# Install dependencies
pip install -r requirements.txt
```

## Quick Start

### Basic Usage

```python
from cto_ai_code import CTOAICode

# Initialize the assistant
assistant = CTOAICode()

# Generate code
code = assistant.generate_code("Create a function to calculate fibonacci numbers")
print(code)

# Review code
review = assistant.review_code(your_code)
print(f"Score: {review['score']}/100")

# Explain code
explanation = assistant.explain_code(your_code)
print(explanation)
```

### Running Examples

```bash
# Run the main demo
python cto_ai_code.py

# Run detailed examples
python examples.py
```

## Configuration

Set your API key as an environment variable:

```bash
# For OpenAI
export OPENAI_API_KEY='your-openai-key-here'

# For Anthropic
export ANTHROPIC_API_KEY='your-anthropic-key-here'
```

Or use a `.env` file:

```
OPENAI_API_KEY=your-openai-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
```

## Usage Examples

### Code Generation

```python
assistant = CTOAICode()
code = assistant.generate_code(
    prompt="Create a REST API endpoint for user authentication",
    language="python"
)
```

### Code Review

```python
assistant = CTOAICode()
review = assistant.review_code("""
def add(a, b):
    return a + b
""")

print(review['suggestions'])
```

### Code Explanation

```python
assistant = CTOAICode()
explanation = assistant.explain_code("""
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
""")
```

## Architecture

The project is structured as follows:

- `cto_ai_code.py`: Main module with core functionality
- `examples.py`: Comprehensive usage examples
- `requirements.txt`: Python dependencies
- `.gitignore`: Git ignore rules

## Development

The tool currently includes mock implementations that work without API keys. To enable full AI capabilities:

1. Obtain an API key from OpenAI or Anthropic
2. Set the appropriate environment variable
3. The tool will automatically use the real AI APIs

## Use Cases

- **Code Generation**: Quickly scaffold new functions, classes, or modules
- **Code Review**: Get instant feedback on code quality and best practices
- **Learning**: Understand unfamiliar code through AI explanations
- **Productivity**: Accelerate development with AI-assisted coding
- **Quality Assurance**: Catch issues early with automated code analysis

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this in your projects!

## Support

For issues, questions, or contributions, please open an issue on GitHub.
