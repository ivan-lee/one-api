# Relay Module

## OVERVIEW
Core API gateway logic - translates OpenAI-compatible requests to 40+ LLM provider APIs. The heart of one-api.

## STRUCTURE
```
relay/
├── adaptor.go                  # Adaptor factory + interface
├── adaptor/                    # Provider-specific adaptors (42 providers)
│   ├── openai/                 # Reference implementation
│   ├── anthropic/              # Claude models
│   ├── gemini/                 # Google Gemini
│   ├── aws/                    # AWS Bedrock
│   ├── baidu/                  # Baidu Wenxin
│   ├── ali/                    # Alibaba Qwen
│   └── ...                     # 40+ providers
├── apitype/                    # API type definitions
├── billing/                    # Token counting + billing logic
├── channeltype/                # Channel type enum + constants
├── constant/                   # Relay constants
├── controller/                 # Relay request handlers
├── meta/                       # Metadata definitions
├── model/                      # Relay data models
└── relaymode/                  # Relay mode definitions
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add new LLM provider | `adaptor/{provider}/` | Follow `openai/` pattern |
| Modify token counting | `billing/` | Critical for billing accuracy |
| Add relay endpoint | `controller/` | Chat, completion, embeddings, etc. |
| Channel type enum | `channeltype/` | Update when adding providers |

## CONVENTIONS
- **Adaptor interface**: All providers implement common interface (see `adaptor.go`)
- **OpenAI compatibility**: All adaptors translate to/from OpenAI format
- **Token counting**: Use tiktoken-go for OpenAI models, provider-specific for others
- **Error handling**: Return adaptor-specific errors, converted to OpenAI format
- **Stream mode**: Support both stream and non-stream (TODO: some adaptors missing non-stream)

## ANTI-PATTERNS (THIS MODULE)
- **DO NOT** add new adaptors without implementing full interface
- **NEVER** suppress token encoder errors - critical for billing accuracy
- **DO NOT** hardcode model ratios - use `billing/ratio/model.go`
- **AVOID** direct HTTP calls in controllers - use relay controller
- **DO NOT** forget to update `ChannelBaseURLs` array when adding channel type (will panic at init)

## UNIQUE STYLES
1. **Adaptor Pattern**: Factory returns provider-specific adaptor by type
2. **Model Mapping**: Optional model name translation (avoid unless necessary)
3. **Request/Response Transformation**: Per-adaptor conversion logic
4. **Stream Proxy**: Transparent stream passthrough with token counting

## CRITICAL WARNINGS
- `channeltype/url.go:61`: PANIC if `ChannelBaseURLs` length doesn't match `Dummy` constant
- `billing/`: Token counting errors affect billing - never suppress
- `adaptor/replicate/adaptor.go:44`: TODO - non-stream mode not supported
- `channel-billing.go:418`: TODO - Azure OpenAI billing not supported

## TESTING
- Minimal test coverage (only `adaptor_test.go`)
- Integration-style tests preferred
- Test with real provider APIs when possible

## KEY FILES
- `adaptor.go`: Factory function `GetAdaptor(channelType int)`
- `billing/ratio/model.go`: Model pricing ratios (deprecated models marked)
- `controller/`: Request handlers for chat, completion, embeddings, audio, images
