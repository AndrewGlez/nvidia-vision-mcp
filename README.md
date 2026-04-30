# nvidia-vision-mcp

MCP server that enables text-only AI models to "see" images using NVIDIA NIM's vision models.

## Features

- **describe_image** — Describe local image files
- **describe_image_url** — Describe images from public URLs
- **extract_text** — OCR text extraction from images

Powered by [microsoft/phi-4-multimodal-instruct](https://build.nvidia.com/microsoft/phi-4-multimodal-instruct) via NVIDIA NIM API.

## Requirements

- Node.js + npm/npx
- NVIDIA API key (free trial available)

## Quick Start

### 1. Get NVIDIA API Key

Sign up at https://build.nvidia.com/ and grab a free API key.

### 2. Run with npx from GitHub

```bash
NVIDIA_API_KEY="nvapi-..." npx -y github:AndrewGlez/nvidia-vision-mcp
```

## MCP Client Configuration

```json
{
  "mcpServers": {
    "nvidia-vision": {
      "command": "npx",
      "args": ["-y", "github:AndrewGlez/nvidia-vision-mcp"],
      "env": {
        "NVIDIA_API_KEY": "nvapi-..."
      }
    }
  }
}
```

## Tool Reference

### describe_image

Describe a local image file.

```typescript
// MCP tool call
{
  name: "describe_image",
  arguments: {
    file_path: "/path/to/image.png",
    prompt: "Describe this image in detail."
  }
}
```

**Parameters:**
- `file_path` (required) — Absolute or relative path to image
- `prompt` (optional) — Custom prompt to guide description

**Returns:** Text description of the image.

### describe_image_url

Describe an image from a URL.

```typescript
{
  name: "describe_image_url", 
  arguments: {
    url: "https://example.com/image.png",
    prompt: "What is shown?"
  }
}
```

**Parameters:**
- `url` (required) — Public URL of the image
- `prompt` (optional) — Custom prompt

### extract_text

Extract readable text from an image (OCR).

```typescript
{
  name: "extract_text",
  arguments: {
    file_path: "/path/to/document.png"
  }
}
```

**Parameters:**
- `file_path` (required) — Path to image with text

**Returns:** All extracted text, preserving reading order.

## Supported Image Formats

- PNG
- JPEG/JPG
- GIF
- WebP
- BMP

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NVIDIA_API_KEY` | Yes | Your NVIDIA NIM API key |

## Troubleshooting

### "NVIDIA_API_KEY environment variable is not set"

Set the `NVIDIA_API_KEY` environment variable before running:

```bash
export NVIDIA_API_KEY="nvapi-..."
bun run src/index.ts
```

### Image too large

The API supports images up to ~180KB inline. Larger images are automatically rejected. For the full MCP server, consider using image compression before processing.

### API errors

- **422** — Check max_tokens value (max 1024)
- **401** — Invalid API key
- **429** — Rate limited, try again later

## Development

```bash
# Run in development mode
bun run src/index.ts

# Test with MCP protocol
echo '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | bun run src/index.ts
```

## Tech Stack

- [Bun](https://bun.sh/) — Runtime
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) — MCP implementation
- [zod](https://zod.dev/) — Schema validation
- [microsoft/phi-4-multimodal-instruct](https://build.nvidia.com/microsoft/phi-4-multimodal-instruct) — Vision model

## License

MIT

## Author

AndrewGlez