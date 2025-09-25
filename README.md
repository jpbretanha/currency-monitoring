# 💰 Currency Monitor

A command-line application that monitors USD-to-BRL exchange rates and sends macOS notifications when it's a good time to sell your US dollars.

## Features

- 🕐 **30-Minute Monitoring**: Automatically checks USD-BRL rates every 30 minutes
- 💰 **Sell Alerts**: Notifies when the ask rate reaches or exceeds your target
- 🔔 **macOS Notifications**: Native system notifications with sound
- 💾 **Persistent Configuration**: Your threshold is saved between restarts
- 🌐 **Web API**: RESTful endpoints for status and configuration
- 🛡️ **Error Handling**: Robust error handling with retry logic and fallbacks

## Installation

This application requires [Bun](https://bun.sh/) runtime.

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install
```

## Terminal Function Setup (Recommended)

For convenience, you can add a `currency` function to your shell that allows you to run the monitor from anywhere in your terminal.

### Add to your .zshrc (or .bashrc)

```bash
# Currency Monitor
currency() {
    local currency_dir="/path/to/your/currency-monitor"
    
    if [[ ! -d "$currency_dir" ]]; then
        echo "❌ Currency monitor directory not found: $currency_dir"
        return 1
    fi
    
    case "$1" in
        "status")
            echo "📊 Currency Monitor Status:"
            curl -s http://localhost:3000/status | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/status
            ;;
        "check")
            echo "🔍 Forcing currency check:"
            curl -s http://localhost:3000/check | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/check
            ;;
        "config")
            echo "⚙️  Current configuration:"
            curl -s http://localhost:3000/config | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/config
            ;;
        "stop")
            echo "🛑 Stopping currency monitor..."
            pkill -f "bun.*currency-monitor" && echo "✅ Stopped" || echo "❌ No process found"
            ;;
        "help"|"-h"|"--help")
            echo "💰 Currency Monitor Commands:"
            echo "  currency [threshold]     - Start monitoring with threshold (e.g., currency 5.3)"
            echo "  currency status          - Check current status"
            echo "  currency check           - Force immediate rate check"
            echo "  currency config          - View current configuration"
            echo "  currency stop            - Stop the monitor"
            echo "  currency help            - Show this help"
            ;;
        "")
            echo "💰 Starting currency monitor with saved threshold..."
            cd "$currency_dir" && bun run start
            ;;
        *)
            if [[ "$1" =~ ^[0-9]+\.?[0-9]*$ ]]; then
                echo "💰 Starting currency monitor with threshold: $1 BRL"
                cd "$currency_dir" && bun run start "$1"
            else
                echo "❌ Invalid threshold: $1"
                echo "Usage: currency [threshold] | status | check | config | stop | help"
                return 1
            fi
            ;;
    esac
}
```

**Remember to:**
1. Replace `/path/to/your/currency-monitor` with your actual path
2. Reload your shell: `exec zsh` or open a new terminal

## Usage

### With Terminal Function (Recommended)

Once you've added the function to your shell:

```bash
# Start monitoring with threshold
currency 5.3

# Start with previously saved threshold
currency

# Check current status (formatted JSON)
currency status

# Force immediate check
currency check

# View configuration
currency config

# Stop monitoring
currency stop

# Show help
currency help
```

### Direct Usage (From Project Directory)

If you prefer to run directly from the project directory:

```bash
# Monitor USD-BRL rate, notify when ask rate >= 5.30 BRL
bun run start 5.3

# Uses the previously saved threshold
bun run start

# Update threshold to 5.50 BRL
bun run start 5.5
```

## API Endpoints

Once running, the server provides these endpoints at `http://localhost:3000`:

- `GET /` - API information and available endpoints
- `GET /status` - Current rate, threshold, and monitoring status
- `GET /config` - Current configuration
- `GET /check` - Force an immediate rate check
- `POST /threshold` - Update threshold programmatically

### Example API Calls

```bash
# Check current status
curl http://localhost:3000/status

# Force immediate check
curl http://localhost:3000/check

# Update threshold via API
curl -X POST http://localhost:3000/threshold \
  -H "Content-Type: application/json" \
  -d '{"threshold": 5.5}'
```

## How It Works

1. **Rate Source**: Uses [AwesomeAPI](https://docs.awesomeapi.com.br/api-de-moedas) for real-time USD-BRL rates
2. **Monitoring**: Checks the "ask" price (selling rate) every 30 minutes
3. **Notifications**: Sends macOS notifications when rate ≥ your threshold
4. **Cooldown**: Prevents spam by limiting notifications to once every 2 hours
5. **Persistence**: Saves configuration to `config.json` for restart persistence

## Configuration

The application creates a `config.json` file with your settings:

```json
{
  "threshold": 5.3,
  "lastNotification": "2024-01-15T10:00:00Z",
  "created": "2024-01-15T09:00:00Z",
  "lastCheck": "2024-01-15T11:00:00Z"
}
```

## Sample Output

### Starting the Monitor
```bash
$ currency 5.3
💰 Starting currency monitor with threshold: 5.3 BRL
✅ Threshold set to 5.30 BRL per USD
📱 Notification sent: 🚀 Currency Monitor Started
🚀 Server running on http://localhost:3000
📡 Fetching current USD-BRL rate...
📊 Current USD ask rate: 5.2845 BRL
📉 Rate below target. Need 0.0155 more BRL to reach 5.3000
📊 Current USD ask rate: 5.2845 BRL (below target)
⏰ Next check: 1/15/2024, 11:30:00 AM
```

### Checking Status
```bash
$ currency status
📊 Currency Monitor Status:
{
  "currentRate": 5.3512,
  "threshold": 5.3,
  "aboveTarget": true,
  "lastCheck": "2025-09-25T14:57:17.314Z",
  "nextCheck": "9/25/2025, 11:30:00 AM"
}
```

### When Your Threshold is Reached
```
⏰ Running scheduled currency check...
📡 Fetching current USD-BRL rate...
📊 Current USD ask rate: 5.3200 BRL
🎯 Great time to sell USD! Rate: 5.3200 BRL (target: ≥5.3000)
📱 Notification sent: 💰 USD Sell Alert
🎯 ALERT: Rate above target - Notification sent!
```

### Forcing a Check
```bash
$ currency check
🔍 Forcing currency check:
{
  "success": true,
  "rate": 5.3512,
  "threshold": 5.3,
  "triggered": true,
  "message": "Great time to sell USD! Rate: 5.3512 BRL (target: ≥5.3000)"
}
```

## Quick Command Reference

With the terminal function, you can run these commands from any directory:

| Command | Description | Example |
|---------|-------------|---------|
| `currency 5.3` | Start monitoring with threshold | Monitor when USD ≥ 5.30 BRL |
| `currency` | Start with saved threshold | Use previously configured threshold |
| `currency status` | Check current rate and status | See if rate is above/below target |
| `currency check` | Force immediate rate check | Get latest rate right now |
| `currency config` | View current configuration | See saved threshold and settings |
| `currency stop` | Stop the monitor | End background monitoring |
| `currency help` | Show all commands | Get help and usage examples |

### Common Workflows

**Start monitoring from anywhere:**
```bash
# From your home directory, work projects, anywhere
cd ~/Documents
currency 5.3
# Monitor starts running in background
```

**Check status while working:**
```bash
# Quick status check without leaving your current work
currency status
# Shows: rate is 5.35 BRL, above your 5.30 target
```

**Update threshold on the fly:**
```bash
# Stop current monitor and start with new threshold
currency stop
currency 5.5
```

## Troubleshooting

### Currency Function Not Working
- **Function not found**: Reload your shell with `exec zsh` or open a new terminal
- **Directory not found**: Update the `currency_dir` path in your `.zshrc` to match your installation
- **Permission denied**: Check that your user has read/write access to the project directory

### Notifications Not Working
- Ensure you're on macOS (notifications use `osascript`)
- Check System Preferences > Notifications for Terminal/Bun permissions
- The app falls back to console logging if macOS notifications fail

### API Connection Issues
- The app retries failed requests up to 3 times with exponential backoff
- Check your internet connection
- API errors are logged to console and sent as notifications
- Use `currency check` to test connectivity manually

### Configuration Issues
- Delete `config.json` to reset configuration
- Ensure threshold is a positive number
- Check file permissions in the project directory
- Use `currency config` to view current settings

### Common Fixes
```bash
# Reset everything and start fresh
currency stop
rm config.json  # (run from project directory)
currency 5.3

# Test if function is working
currency help

# Check if monitor is running
currency status
```

## Development

```bash
# Development mode with auto-reload
bun run dev

# Build for production
bun run build
```

## Technical Details

- **Runtime**: Bun
- **Framework**: ElysiaJS with cron plugin
- **API**: AwesomeAPI (economia.awesomeapi.com.br)
- **Notifications**: macOS osascript
- **Scheduling**: 30-minute cron jobs
- **Data**: JSON file persistence

## License

MIT License - feel free to modify and distribute.