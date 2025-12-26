/**
 * AI Provider Router
 * 
 * Unified interface for multiple AI providers:
 * - Oobabooga (local text-generation-webui)
 * - Grok (xAI)
 * - ChatGPT (OpenAI)
 * - Claude (Anthropic)
 * 
 * Each provider implements a common interface for:
 * - Chat completions
 * - Token counting
 * - Streaming responses
 */

import fetch from 'node-fetch';

export class AIProviderRouter {
  constructor(config = {}) {
    this.providers = {
      oobabooga: new OobaboogaProvider(config.oobabooga || {}),
      grok: new GrokProvider(config.grok || {}),
      chatgpt: new ChatGPTProvider(config.chatgpt || {}),
      claude: new ClaudeProvider(config.claude || {})
    };
  }

  /**
   * Get provider by name
   */
  getProvider(name) {
    return this.providers[name];
  }

  /**
   * Check if provider is enabled
   */
  isEnabled(name) {
    const provider = this.providers[name];
    return provider && provider.enabled;
  }

  /**
   * List all available providers
   */
  listProviders() {
    return Object.entries(this.providers).map(([name, provider]) => ({
      name,
      enabled: provider.enabled,
      models: provider.getModels(),
      features: provider.getFeatures()
    }));
  }

  /**
   * Route chat completion to appropriate provider
   */
  async chat(providerName, messages, options = {}) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    if (!provider.enabled) {
      throw new Error(`Provider not enabled: ${providerName}`);
    }
    return provider.chat(messages, options);
  }

  /**
   * Route streaming chat to appropriate provider
   */
  async *chatStream(providerName, messages, options = {}) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    if (!provider.enabled) {
      throw new Error(`Provider not enabled: ${providerName}`);
    }
    yield* provider.chatStream(messages, options);
  }

  /**
   * Count tokens for a provider
   */
  countTokens(providerName, text) {
    const provider = this.providers[providerName];
    if (!provider) {
      // Rough estimate: 4 chars per token
      return Math.ceil(text.length / 4);
    }
    return provider.countTokens(text);
  }
}


/**
 * Base Provider Class
 */
class BaseProvider {
  constructor(config) {
    this.enabled = config.enabled || false;
    this.config = config;
  }

  getModels() {
    return [];
  }

  getFeatures() {
    return {
      chat: true,
      streaming: false,
      functionCalling: false,
      vision: false
    };
  }

  countTokens(text) {
    // Rough approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  async chat(messages, options) {
    throw new Error('Not implemented');
  }

  async *chatStream(messages, options) {
    throw new Error('Streaming not implemented');
  }
}


/**
 * Oobabooga Provider (text-generation-webui)
 * 
 * Connects to local Oobabooga instance for self-hosted models
 * Supports: LLaMA, Mistral, Gemini-Mini (your custom model), etc.
 */
class OobaboogaProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:5000';
    this.enabled = config.enabled !== false; // Default enabled for local
    this.defaultModel = config.defaultModel || 'current';
  }

  getModels() {
    return [
      { id: 'current', name: 'Currently Loaded Model' },
      { id: 'gemini-mini', name: 'Gemini-Mini 240M (Custom)' },
      { id: 'llama-3', name: 'LLaMA 3' },
      { id: 'mistral-7b', name: 'Mistral 7B' }
    ];
  }

  getFeatures() {
    return {
      chat: true,
      streaming: true,
      functionCalling: false,
      vision: false,
      localInference: true
    };
  }

  async chat(messages, options = {}) {
    try {
      // Oobabooga OpenAI-compatible API
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages,
          max_tokens: options.max_tokens || 1000,
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          stream: false,
          mode: 'chat',
          character: options.character || 'Assistant'
        })
      });

      if (!response.ok) {
        throw new Error(`Oobabooga error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        provider: 'oobabooga',
        model: this.defaultModel,
        content: data.choices[0].message.content,
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || this.countTokens(JSON.stringify(messages)),
          completion_tokens: data.usage?.completion_tokens || this.countTokens(data.choices[0].message.content),
          total_tokens: data.usage?.total_tokens || 0
        },
        finish_reason: data.choices[0].finish_reason
      };

    } catch (error) {
      // If Oobabooga is not running, return mock response
      if (error.code === 'ECONNREFUSED') {
        return this.getMockResponse(messages, options);
      }
      throw error;
    }
  }

  async *chatStream(messages, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages,
          max_tokens: options.max_tokens || 1000,
          temperature: options.temperature || 0.7,
          stream: true
        })
      });

      const reader = response.body;
      const decoder = new TextDecoder();

      for await (const chunk of reader) {
        const text = decoder.decode(chunk);
        const lines = text.split('\n').filter(line => line.startsWith('data: '));
        
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices[0].delta?.content) {
              yield {
                content: parsed.choices[0].delta.content,
                done: false
              };
            }
          } catch (e) {
            // Skip malformed chunks
          }
        }
      }

    } catch (error) {
      // Fallback to non-streaming
      const response = await this.chat(messages, options);
      yield { content: response.content, done: true };
    }
  }

  getMockResponse(messages, options) {
    const lastMessage = messages[messages.length - 1];
    return {
      provider: 'oobabooga',
      model: 'mock',
      content: `[Oobabooga Mock] I received your message: "${lastMessage.content.slice(0, 50)}..."`,
      usage: {
        prompt_tokens: this.countTokens(JSON.stringify(messages)),
        completion_tokens: 20,
        total_tokens: this.countTokens(JSON.stringify(messages)) + 20
      },
      finish_reason: 'stop',
      mock: true
    };
  }
}


/**
 * Grok Provider (xAI)
 * 
 * Connects to xAI's Grok API
 */
class GrokProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.x.ai/v1';
    this.enabled = !!this.apiKey;
  }

  getModels() {
    return [
      { id: 'grok-beta', name: 'Grok Beta' },
      { id: 'grok-2', name: 'Grok 2' },
      { id: 'grok-2-mini', name: 'Grok 2 Mini' }
    ];
  }

  getFeatures() {
    return {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: false,
      realTimeData: true
    };
  }

  async chat(messages, options = {}) {
    if (!this.enabled) {
      return this.getMockResponse(messages);
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || 'grok-beta',
        messages: messages,
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Grok API error: ${error.error?.message || response.status}`);
    }

    const data = await response.json();

    return {
      provider: 'grok',
      model: data.model,
      content: data.choices[0].message.content,
      usage: data.usage,
      finish_reason: data.choices[0].finish_reason
    };
  }

  getMockResponse(messages) {
    return {
      provider: 'grok',
      model: 'mock',
      content: '[Grok Mock] API key not configured. Set GROK_API_KEY to enable.',
      usage: { prompt_tokens: 0, completion_tokens: 10, total_tokens: 10 },
      finish_reason: 'stop',
      mock: true
    };
  }
}


/**
 * ChatGPT Provider (OpenAI)
 */
class ChatGPTProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.enabled = !!this.apiKey;
    this.organization = config.organization;
  }

  getModels() {
    return [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'o1-preview', name: 'O1 Preview' },
      { id: 'o1-mini', name: 'O1 Mini' }
    ];
  }

  getFeatures() {
    return {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      jsonMode: true
    };
  }

  async chat(messages, options = {}) {
    if (!this.enabled) {
      return this.getMockResponse(messages);
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        messages: messages,
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7,
        stream: false,
        ...(options.response_format && { response_format: options.response_format }),
        ...(options.tools && { tools: options.tools })
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.status}`);
    }

    const data = await response.json();

    return {
      provider: 'chatgpt',
      model: data.model,
      content: data.choices[0].message.content,
      usage: data.usage,
      finish_reason: data.choices[0].finish_reason,
      tool_calls: data.choices[0].message.tool_calls
    };
  }

  async *chatStream(messages, options = {}) {
    if (!this.enabled) {
      yield { content: this.getMockResponse(messages).content, done: true };
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        messages: messages,
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7,
        stream: true
      })
    });

    const reader = response.body;
    const decoder = new TextDecoder();

    for await (const chunk of reader) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n').filter(line => line.startsWith('data: '));
      
      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices[0].delta?.content) {
            yield {
              content: parsed.choices[0].delta.content,
              done: false
            };
          }
        } catch (e) {
          // Skip malformed chunks
        }
      }
    }
  }

  getMockResponse(messages) {
    return {
      provider: 'chatgpt',
      model: 'mock',
      content: '[ChatGPT Mock] API key not configured. Set OPENAI_API_KEY to enable.',
      usage: { prompt_tokens: 0, completion_tokens: 10, total_tokens: 10 },
      finish_reason: 'stop',
      mock: true
    };
  }
}


/**
 * Claude Provider (Anthropic)
 */
class ClaudeProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.enabled = !!this.apiKey;
  }

  getModels() {
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
    ];
  }

  getFeatures() {
    return {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      longContext: true,
      computerUse: true
    };
  }

  async chat(messages, options = {}) {
    if (!this.enabled) {
      return this.getMockResponse(messages);
    }

    // Convert from OpenAI format to Anthropic format
    const anthropicMessages = this.convertMessages(messages);
    const systemMessage = messages.find(m => m.role === 'system')?.content;

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || 'claude-sonnet-4-20250514',
        max_tokens: options.max_tokens || 1000,
        messages: anthropicMessages,
        ...(systemMessage && { system: systemMessage }),
        ...(options.tools && { tools: this.convertTools(options.tools) })
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.status}`);
    }

    const data = await response.json();

    // Extract text content
    const textContent = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    return {
      provider: 'claude',
      model: data.model,
      content: textContent,
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens
      },
      finish_reason: data.stop_reason,
      tool_use: data.content.filter(block => block.type === 'tool_use')
    };
  }

  convertMessages(messages) {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));
  }

  convertTools(openaiTools) {
    // Convert OpenAI tool format to Anthropic format
    return openaiTools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters
    }));
  }

  async *chatStream(messages, options = {}) {
    if (!this.enabled) {
      yield { content: this.getMockResponse(messages).content, done: true };
      return;
    }

    const anthropicMessages = this.convertMessages(messages);
    const systemMessage = messages.find(m => m.role === 'system')?.content;

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || 'claude-sonnet-4-20250514',
        max_tokens: options.max_tokens || 1000,
        messages: anthropicMessages,
        ...(systemMessage && { system: systemMessage }),
        stream: true
      })
    });

    const reader = response.body;
    const decoder = new TextDecoder();

    for await (const chunk of reader) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n').filter(line => line.startsWith('data: '));
      
      for (const line of lines) {
        const data = line.slice(6);
        
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield {
              content: parsed.delta.text,
              done: false
            };
          }
          if (parsed.type === 'message_stop') {
            return;
          }
        } catch (e) {
          // Skip malformed chunks
        }
      }
    }
  }

  getMockResponse(messages) {
    return {
      provider: 'claude',
      model: 'mock',
      content: '[Claude Mock] API key not configured. Set ANTHROPIC_API_KEY to enable.',
      usage: { prompt_tokens: 0, completion_tokens: 10, total_tokens: 10 },
      finish_reason: 'stop',
      mock: true
    };
  }
}


export default AIProviderRouter;
export { OobaboogaProvider, GrokProvider, ChatGPTProvider, ClaudeProvider };
