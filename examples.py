#!/usr/bin/env python3
"""
Example usage of CTO AI Code
"""

from cto_ai_code import CTOAICode


def example_code_generation():
    """Demonstrate code generation capabilities."""
    print("=" * 60)
    print("Example 1: Code Generation")
    print("=" * 60)
    
    assistant = CTOAICode()
    
    prompts = [
        ("Create a function to sort a list", "python"),
        ("Write a REST API endpoint", "python"),
        ("Create a function to validate email", "javascript"),
    ]
    
    for prompt, lang in prompts:
        print(f"\nPrompt: {prompt} ({lang})")
        print("-" * 60)
        code = assistant.generate_code(prompt, lang)
        print(code)


def example_code_review():
    """Demonstrate code review capabilities."""
    print("\n" + "=" * 60)
    print("Example 2: Code Review")
    print("=" * 60)
    
    assistant = CTOAICode()
    
    code_samples = [
        """
def calculate_sum(numbers):
    total = 0
    for num in numbers:
        total += num
    return total
""",
        """
class UserManager:
    def __init__(self):
        self.users = []
    
    def add_user(self, name, email):
        self.users.append({'name': name, 'email': email})
"""
    ]
    
    for i, code in enumerate(code_samples, 1):
        print(f"\nReviewing Code Sample {i}:")
        print("-" * 60)
        print(code)
        print("\nReview Results:")
        review = assistant.review_code(code)
        print(f"  Score: {review['score']}/100")
        print(f"  Summary: {review['summary']}")
        if review['suggestions']:
            print("  Suggestions:")
            for suggestion in review['suggestions']:
                print(f"    - {suggestion}")


def example_code_explanation():
    """Demonstrate code explanation capabilities."""
    print("\n" + "=" * 60)
    print("Example 3: Code Explanation")
    print("=" * 60)
    
    assistant = CTOAICode()
    
    code = """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
"""
    
    print("Code to explain:")
    print("-" * 60)
    print(code)
    print("\nExplanation:")
    print("-" * 60)
    explanation = assistant.explain_code(code)
    print(explanation)


def main():
    """Run all examples."""
    print("\n🤖 CTO AI Code - Examples\n")
    
    example_code_generation()
    example_code_review()
    example_code_explanation()
    
    print("\n" + "=" * 60)
    print("Examples completed!")
    print("=" * 60)
    print("\nNote: These examples use mock implementations.")
    print("To use real AI features, set your API key:")
    print("  export OPENAI_API_KEY='your-key-here'")
    print("  or")
    print("  export ANTHROPIC_API_KEY='your-key-here'")


if __name__ == "__main__":
    main()
