// Fake MCP server for tests. Reads JSON-RPC requests from stdin, writes responses to stdout.

process.stdin.setEncoding('utf8');

let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const req = JSON.parse(line);
      const id = req.id;

      if (req.method === 'tools/list') {
        sendResponse(id, {
          tools: [
            { name: 'goto' },
            { name: 'evaluate' },
            { name: 'links' },
            { name: 'semantic_tree' },
            { name: 'interactiveElements' },
            { name: 'structuredData' },
          ],
        });
      } else if (req.method === 'tools/call') {
        const name = req.params?.name;
        const args = req.params?.arguments || {};

        if (name === 'goto') {
          sendResponse(id, { content: [{ type: 'text', text: `loaded ${args.url}` }] });
        } else if (name === 'evaluate') {
          sendResponse(id, {
            content: [{ type: 'text', text: JSON.stringify({ result: `evaluated ${args.script?.slice(0, 20)}` }) }],
          });
        } else if (name === 'links') {
          sendResponse(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify([
                  { href: 'https://example.com/pricing', text: 'Pricing' },
                  { href: 'https://example.com/features', text: 'Features' },
                  { href: 'https://other.com/page', text: 'External' },
                ]),
              },
            ],
          });
        } else if (name === 'semantic_tree') {
          sendResponse(id, { content: [{ type: 'text', text: '[]' }] });
        } else if (name === 'interactiveElements') {
          sendResponse(id, { content: [{ type: 'text', text: '[]' }] });
        } else if (name === 'structuredData') {
          sendResponse(id, { content: [{ type: 'text', text: '{}' }] });
        } else {
          sendError(id, -32601, 'Unknown tool');
        }
      } else {
        sendError(id, -32601, 'Method not found');
      }
    } catch (err) {
      // ignore malformed lines
    }
  }
});

function sendResponse(id: number | string, result: unknown) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function sendError(id: number | string, code: number, message: string) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}
