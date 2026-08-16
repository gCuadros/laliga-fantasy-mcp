import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeEach, describe, expect, it } from 'vitest';

import { createServer } from './server.js';

async function connectedClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0.0.0' });
  await Promise.all([createServer().connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe('servidor MCP', () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectedClient();
  });

  it('expone health_check y ninguna otra tool mientras la Fase 0 siga abierta', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(['health_check']);
  });

  it('marca health_check como sólo lectura y sin acceso al exterior', async () => {
    const { tools } = await client.listTools();
    expect(tools[0]?.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: false });
  });

  it('health_check responde texto, no JSON crudo', async () => {
    const result = await client.callTool({ name: 'health_check' });
    const content = result.content as { type: string; text: string }[];
    expect(content).toHaveLength(1);
    expect(content[0]?.type).toBe('text');
    expect(content[0]?.text).toContain('fantasy-mcp-es v');
    expect(() => {
      JSON.parse(content[0]?.text ?? '');
    }).toThrow();
  });
});
