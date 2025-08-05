# downdetector-mcp

MCP server for Downdetector - check service status and outage information. This server provides tools to query Downdetector for service outages and status updates across various services and regions.

- **Real-time Service Status**: Get current status reports for any service monitored by Downdetector
- **No Authentication Required**: Direct access to public Downdetector data
- **Global Coverage**: Support for different Downdetector domains (com, uk, it, fr, etc.)

## Installation

- [Claude Desktop](#claude-desktop)
- [Cursor](#cursor)
- [Cline](#cline)

### Claude Desktop

#### (Recommended) Alternative: Via manual .dxt installation

1. Find the latest dxt build in [the GitHub Actions history](https://github.com/domdomegg/downdetector-mcp/actions/workflows/dxt.yaml?query=branch%3Amaster) (the top one)
2. In the 'Artifacts' section, download the `mcp-server-dxt` file
3. Rename the `.zip` file to `.dxt`
4. Double-click the `.dxt` file to open with Claude Desktop
5. Click "Install"

#### (Advanced) Alternative: Via JSON configuration

1. Install [Node.js](https://nodejs.org/en/download)
2. Open Claude Desktop and go to Settings → Developer
3. Click "Edit Config" to open your `claude_desktop_config.json` file
4. Add the following configuration to the "mcpServers" section:

```json
{
  "mcpServers": {
    "downdetector": {
      "command": "npx",
      "args": [
        "-y",
        "downdetector-mcp"
      ]
    }
  }
}
```

5. Save the file and restart Claude Desktop

### Cursor

#### (Recommended) Via one-click install

1. Click [![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=downdetector-mcp&config=JTdCJTIyY29tbWFuZCUyMiUzQSUyMm5weCUyMC15JTIwZG93bmRldGVjdG9yLW1jcCUyMiU3RA%3D%3D)

#### (Advanced) Alternative: Via JSON configuration

Create either a global (`~/.cursor/mcp.json`) or project-specific (`.cursor/mcp.json`) configuration file:

```json
{
  "mcpServers": {
    "downdetector": {
      "command": "npx",
      "args": ["-y", "downdetector-mcp"]
    }
  }
}
```

### Cline

#### Via JSON configuration

1. Click the "MCP Servers" icon in the Cline extension
2. Click on the "Installed" tab, then the "Configure MCP Servers" button at the bottom
3. Add the following configuration to the "mcpServers" section:

```json
{
  "mcpServers": {
    "downdetector": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "downdetector-mcp"]
    }
  }
}
```

## Example Usage

Once configured, you can ask Claude things like:

- "Check if Steam is down right now"
- "What's the current status of Netflix?"
- "Get the latest reports for Instagram in the UK"
- "Show me the recent activity for Discord"

## Limitations

- Data comes from Downdetector's public interface and may be rate-limited
- Some domains (especially .com) may be protected by Cloudflare and could be intermittently unavailable
- Service names must match those used by Downdetector (case-insensitive)

## Available Tools

### `downdetector`
Get current status and outage reports for any service monitored by Downdetector.

**Parameters:**
- `serviceName` (required): Name of the service (e.g., "steam", "netflix", "twitter")
- `domain` (optional): Downdetector domain ("com", "uk", "it", "fr", etc.)

## Contributing

Pull requests are welcomed on GitHub! To get started:

1. Install Git and Node.js
2. Clone the repository
3. Install dependencies with `npm install`
4. Run `npm run test` to run tests
5. Build with `npm run build`

## Releases

Versions follow the [semantic versioning spec](https://semver.org/).

To release:

1. Use `npm version <major | minor | patch>` to bump the version
2. Run `git push --follow-tags` to push with tags
3. Wait for GitHub Actions to publish to the NPM registry.
