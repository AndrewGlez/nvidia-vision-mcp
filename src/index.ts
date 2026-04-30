import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Environment: NVIDIA API key
const apiKey = process.env.NVIDIA_API_KEY;
if (!apiKey) {
  console.error('NVIDIA_API_KEY environment variable is not set');
  process.exit(1);
}

// NVIDIA NIM API endpoint for phi-4-multimodal-instruct
const API_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'microsoft/phi-4-multimodal-instruct';

// ─── Helpers ──────────────────────────────────────────────────────────────────────────────

/**
 * Encode image file as base64 data URL.
 */
async function imageToBase64(filePath: string): Promise<{ mimeType: string; base64: string }> {
  const fs = await import('fs');
  const data = await fs.promises.readFile(filePath);
  const mimeType = getMimeType(filePath);
  const base64 = Buffer.from(data).toString('base64');
  return { mimeType, base64 };
}

function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop() ?? '';
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
  };
  return mimeTypes[ext] ?? 'image/png';
}

/**
 * Call phi-4-multimodal-instruct via NVIDIA NIM API
 */
async function describeImageInternal(
  imageContent: string,
  prompt: string,
): Promise<string> {
  const payload = {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageContent } }
        ]
      },
    ],
    max_tokens: 1024,
    temperature: 0.3,
  };

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NVIDIA API error ${response.status}: ${error}`);
  }

  const result = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return result.choices[0]?.message?.content ?? 'No description returned.';
}

/**
 * Call phi-4-multimodal-instruct for URL images
 */
async function describeImageUrl(
  url: string,
  prompt: string,
): Promise<string> {
  const payload = {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url } }
        ]
      },
    ],
    max_tokens: 1024,
    temperature: 0.3,
  };

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NVIDIA API error ${response.status}: ${error}`);
  }

  const result = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return result.choices[0]?.message?.content ?? 'No description returned.';
}

// ─── Server ─────────────────────────────────────────���───────────────────────

const server = new McpServer({ name: 'nvidia-vision-mcp', version: '2.0.0' });

// Tool 1: Describe a local image file
server.registerTool(
  'describe_image',
  {
    description: 'Describe a local image file using NVIDIA phi-4-multimodal-instruct model. Returns detailed text description of what the image contains.',
    inputSchema: z.object({
      file_path: z.string().describe('Absolute or relative path to the image file'),
      prompt: z.string().optional().describe('Optional: custom prompt to guide description.'),
    }),
  },
  async ({ file_path, prompt = 'Describe this image in detail. What is shown? Include all text, objects, colors, layout, and context.' }) => {
    try {
      const { mimeType, base64 } = await imageToBase64(file_path);
      const imageTag = `data:${mimeType};base64,${base64}`;
      const description = await describeImageInternal(imageTag, prompt);
      return { content: [{ type: 'text', text: description }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

// Tool 2: Describe an image from a URL
server.registerTool(
  'describe_image_url',
  {
    description: 'Describe an image from a URL using NVIDIA phi-4-multimodal-instruct model. Returns detailed text description of what the image contains.',
    inputSchema: z.object({
      url: z.string().url().describe('Public URL of the image'),
      prompt: z.string().optional().describe('Optional: custom prompt to guide description.'),
    }),
  },
  async ({ url, prompt = 'Describe this image in detail. What is shown? Include all text, objects, colors, layout, and context.' }) => {
    try {
      const description = await describeImageUrl(url, prompt);
      return { content: [{ type: 'text', text: description }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

// Tool 3: Extract text from an image (OCR)
server.registerTool(
  'extract_text',
  {
    description: 'Extract readable text from an image using OCR. Extracts all visible text from screenshots, documents, and images with text.',
    inputSchema: z.object({
      file_path: z.string().describe('Absolute or relative path to the image file'),
    }),
  },
  async ({ file_path }) => {
    try {
      const { mimeType, base64 } = await imageToBase64(file_path);
      const imageTag = `data:${mimeType};base64,${base64}`;
      const text = await describeImageInternal(
        imageTag,
        'Extract ALL readable text from this image. Include every word, number, label, heading, and caption. Preserve the reading order.',
      );
      return { content: [{ type: 'text', text: text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('nvidia-vision-mcp v2.0 running on stdio (phi-4-multimodal-instruct)');
}

main();