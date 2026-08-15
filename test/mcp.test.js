import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { McpServer } from '../src/mcp/server.js';
import { TestHarness } from './harness.js';

describe('FastMCP Stdio Server (MCP-001 - MCP-003)', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = TestHarness.createSandbox('agy-mcp-test-');
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('MCP-001: handles initialize handshake with server capabilities', async () => {
    const req = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {},
    };

    const res = await McpServer.handleRequest(req);
    assert.equal(res.jsonrpc, '2.0');
    assert.equal(res.id, 1);
    assert.equal(res.result.serverInfo.name, 'agy-plugins-mcp');
    assert.ok(res.result.capabilities.tools);
  });

  it('MCP-002: lists all 11 registered MCP tools with valid schemas', async () => {
    const req = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    };

    const res = await McpServer.handleRequest(req);
    assert.equal(res.id, 2);
    const tools = res.result.tools;
    assert.equal(tools.length, 11);

    const toolNames = tools.map((t) => t.name);
    assert.ok(toolNames.includes('plugin_list'));
    assert.ok(toolNames.includes('plugin_search'));
    assert.ok(toolNames.includes('plugin_install'));
    assert.ok(toolNames.includes('plugin_uninstall'));
    assert.ok(toolNames.includes('plugin_changelog'));
    assert.ok(toolNames.includes('marketplace_changelog'));
    assert.ok(toolNames.includes('marketplace_list'));
    assert.ok(toolNames.includes('marketplace_add'));
    assert.ok(toolNames.includes('marketplace_update'));
    assert.ok(toolNames.includes('marketplace_remove'));
    assert.ok(toolNames.includes('doctor_diagnostics'));
  });

  it('MCP-003: executes plugin_list and plugin_search tool calls', async () => {
    TestHarness.createMockMarketplace(sandbox, 'mcp-market', [
      {
        name: 'mcp-tool-test',
        description: 'An AI assistant tool capability',
        skills: [{ name: 'mcp-tool-test', description: 'AI assistant tool' }],
      },
    ]);

    // 1. plugin_list
    const listCall = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'plugin_list',
        arguments: {},
      },
    };

    const listRes = await McpServer.handleRequest(listCall);
    assert.equal(listRes.id, 3);
    const listData = JSON.parse(listRes.result.content[0].text);
    assert.ok(Array.isArray(listData));
    assert.equal(listData.length, 1);
    assert.equal(listData[0].name, 'mcp-tool-test');

    // 2. plugin_search
    const searchCall = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'plugin_search',
        arguments: { query: 'assistant' },
      },
    };

    const searchRes = await McpServer.handleRequest(searchCall);
    assert.equal(searchRes.id, 4);
    const searchData = JSON.parse(searchRes.result.content[0].text);
    assert.ok(Array.isArray(searchData));
    assert.equal(searchData.length, 1);
    assert.equal(searchData[0].name, 'mcp-tool-test');
  });

  it('MCP-004: executes plugin_install and plugin_uninstall tool calls', async () => {
    TestHarness.createMockMarketplace(sandbox, 'mcp-market-2', [
      {
        name: 'installable-plugin',
        description: 'Installable plugin via MCP',
        skills: [{ name: 'installable-plugin', description: 'Installable skill' }],
      },
    ]);

    // Install
    const installCall = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'plugin_install',
        arguments: { pluginName: 'installable-plugin' },
      },
    };

    const installRes = await McpServer.handleRequest(installCall);
    const installData = JSON.parse(installRes.result.content[0].text);
    assert.equal(installData.success, true);

    // Uninstall
    const uninstallCall = {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'plugin_uninstall',
        arguments: { pluginName: 'installable-plugin' },
      },
    };

    const uninstallRes = await McpServer.handleRequest(uninstallCall);
    const uninstallData = JSON.parse(uninstallRes.result.content[0].text);
    assert.equal(uninstallData.success, true);
  });

  it('MCP-005: executes plugin_changelog and marketplace_changelog tools', async () => {
    TestHarness.createMockMarketplace(sandbox, 'mcp-changelog-market', [
      {
        name: 'versioned-plugin',
        description: 'Plugin with version metadata',
        skills: [{ name: 'versioned-plugin', description: 'Versioned skill' }],
      },
    ]);

    const changelogCall = {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'plugin_changelog',
        arguments: { pluginName: 'versioned-plugin', marketplaceName: 'mcp-changelog-market' },
      },
    };

    const changelogRes = await McpServer.handleRequest(changelogCall);
    assert.equal(changelogRes.id, 7);
    const changelogData = JSON.parse(changelogRes.result.content[0].text);
    assert.equal(changelogData.pluginName, 'versioned-plugin');
  });
});
