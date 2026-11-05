"""Calls to the Claude API, with every call traced.

Each skill asks for JSON that matches a schema (structured outputs), so the
answer is always parseable and can only use the fields we allow.
"""

import json
import os
import time

DEFAULT_MODEL = os.environ.get("TRIMTAX_MODEL", "claude-sonnet-5-5")

# Price per token in billionths of a dollar ($2 per million tokens = 2,000).
PRICES = {
    "claude-sonnet-5-5": {"input": 2000, "output": 10000},
    "claude-haiku-5-5": {"input": 100, "output": 500},  # prompts under 100,000 tokens
    "claude-opus-5-5": {"input": 4000, "output": 20000},
}


def cost_nanodollars(model, input_tokens, output_tokens):
    price = PRICES.get(model)
    if price is None:
        return None
    return input_tokens * price["input"] + output_tokens * price["output"]


class ClaudeModel:
    """The real model. Needs ANTHROPIC_API_KEY in the environment."""

    def __init__(self, model=DEFAULT_MODEL):
        import anthropic

        self.client = anthropic.Anthropic()
        self.model = model

    def run(self, system, content, schema, max_tokens=1024):
        """Returns (parsed JSON, usage). Raises if the call fails."""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": content}],
            output_config={"format": {"type": "json_schema", "schema": schema}},
        )
        text = ""
        for block in response.content:
            if block.type == "text":
                text += block.text
        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        }
        return json.loads(text), usage


def available():
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def traced_call(model, skill, prompt_version, ruleset_version, system, content, schema, traces, max_tokens=1024):
    """Run one skill and add a trace entry to `traces`. Returns the parsed answer or None.

    The trace never holds receipt text or keys: just which skill ran, on what
    model and prompt version, how long it took and what it cost.
    """
    started = time.monotonic()
    trace = {
        "skill": skill,
        "model": model.model,
        "prompt_version": prompt_version,
        "ruleset_version": ruleset_version,
    }
    try:
        answer, usage = model.run(system, content, schema, max_tokens)
        trace["ok"] = True
        trace["input_tokens"] = usage["input_tokens"]
        trace["output_tokens"] = usage["output_tokens"]
        trace["cost_nanodollars"] = cost_nanodollars(model.model, usage["input_tokens"], usage["output_tokens"])
    except Exception as error:  # a failed call is logged, never shown as a number
        answer = None
        trace["ok"] = False
        trace["error"] = type(error).__name__
    trace["latency_ms"] = round((time.monotonic() - started) * 1000)
    traces.append(trace)
    return answer
