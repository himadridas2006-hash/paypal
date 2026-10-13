#!/usr/bin/env node

/**
 * Mandate Model Context Protocol (MCP) Server
 * 
 * Exposes deterministic spend firewall tools to MCP clients (Claude Desktop, Cursor, Agent SDKs):
 * - list_mandates: Retrieves active spend mandates and budgets.
 * - check_mandate: Evaluates a candidate spend request against guardrails without settling.
 * - request_payment: Evaluates spend request, executes in-policy orders via PayPal Sandbox, or intercepts to Escrow.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.MANDATE_APP_URL || 'http://localhost:3000';

const server = new Server(
  {
    name: 'mandate-spend-guardrails',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_mandates',
        description: 'List all active autonomous spend mandates, monthly caps, spent balances, and allowed merchants.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'check_mandate',
        description: 'Simulate/pre-screen a spend request against Mandate policy guardrails (returns APPROVED, ESCALATED, or BLOCKED with reasons) without executing payment.',
        inputSchema: {
          type: 'object',
          properties: {
            mandateId: { type: 'string', description: 'ID of the agent mandate' },
            merchant: { type: 'string', description: 'Target merchant name (e.g. AWS, RunPod, GitHub)' },
            amount: { type: 'number', description: 'Amount in USD to check' },
            category: { type: 'string', description: 'Spend category (e.g. Cloud Infrastructure, Developer Tools)' },
            jurisdiction: { type: 'string', description: 'Merchant jurisdiction (e.g. US, UK, Cyprus)' },
          },
          required: ['merchant', 'amount'],
        },
      },
      {
        name: 'request_payment',
        description: 'Request an autonomous payment through the Mandate Spend Firewall. If inside guardrails, captures via PayPal Sandbox rail. If outside policy, safely quarantines to Fiduciary Escrow for human authorization.',
        inputSchema: {
          type: 'object',
          properties: {
            mandateId: { type: 'string', description: 'ID of the agent mandate (optional, defaults to first active)' },
            merchant: { type: 'string', description: 'Merchant to pay' },
            amount: { type: 'number', description: 'Amount in USD' },
            category: { type: 'string', description: 'Spend category' },
            jurisdiction: { type: 'string', description: 'Merchant jurisdiction (e.g. US, DE, CY)' },
            note: { type: 'string', description: 'Business justification/memo for audit trail' },
          },
          required: ['merchant', 'amount'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'list_mandates') {
      const res = await fetch(`${APP_URL}/api/mandates`);
      const data = res.ok ? await res.json() : [];
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    if (name === 'check_mandate' || name === 'request_payment') {
      const endpoint = name === 'request_payment' ? '/api/v2/agent/pay' : '/api/v2/agent/check';
      const res = await fetch(`${APP_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args || {}),
      });

      const data = await res.json();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Tool execution failed: ${err?.message || err}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Mandate MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal MCP Server error:', err);
  process.exit(1);
});
