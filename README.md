![Turtle Control Panel](/images/Banner.png)

A control panel that lets you monitor and control your [ComputerCraft](https://www.computercraft.info/) and/or [ComputerCraft: Tweaked](https://tweaked.cc/) turtles through a WebSocket connection.

![Dashboard](/images/Dashboard.png)

The turtles show up on the dashboard where their online status, activities and fuel consumption can be easily monitored.

![Turtle](/images/Turtle.png)

Clicking on a specific turtle brings you to that turtle's control panel where you can monitor it, change its current activity, manipulate its inventory or simply watch it move around in the world.

The 3D map only shows you what the turtle can see (or have seen) and may not be a realistic interpretation of the world as it may have changed since the last time the turtle inspected the blocks. It is highly recommended to use this control panel along with at least one of the supported mods for rapid world discovery:

- [Advanced Peripherals](https://www.curseforge.com/minecraft/mc-mods/advanced-peripherals) by utilizing the `Geo Scanner` peripheral.
- [Plethora](https://www.curseforge.com/minecraft/mc-mods/plethora-peripherals) by utilizing the `Block Scanner` peripheral.
- [UnlimitedPeripheralWorks](https://www.curseforge.com/minecraft/mc-mods/unlimitedperipheralworks) by utilizing the `Universal Scanner` peripheral.

## Setup

Before you begin make sure that [Node.js](https://nodejs.org/en/) is installed, then clone the project with `git clone` and make sure your working directory is within the cloned project.

### Server

```sh
# Change the working directory
cd server

# Install dependencies
npm install

# Build the server
npm run build

# Start the server
npm start
```

Or optionally run as dev

```sh
# Change the working directory
cd server

# Install dependencies
npm install

# Start the server in development mode
npm run dev
```

#### Environment variables (all optional)

- `WSS_PORT` - Port for the WebSocket server used by the portal (defaults to 6868)
- `TURTLE_WSS_PORT` - Port for the second WebSocket server used by the turtles (defaults to 5757)
- `LOG_LEVEL` - Log level for the server (defaults to info). Possible values are: emerg, alert, crit, error, warning, notice, info, debug
- `TURTLE_LOG_LEVEL` - Log level for the connected turtles (defaults to INFO). Possible values are ERROR, WARNING, INFO, DEBUG

### Portal

```sh
# Change the working directory
cd portal

# Install dependencies
npm install

# Start the portal
npm run dev
```

#### Environment variables (all optional)

- `NEXT_PUBLIC_HTTP_SERVER_URL` - URL to use when connecting to the HTTP server (defaults to http://localhost:6868)
- `NEXT_PUBLIC_WSS_SERVER_URL` - URL to use when connecting to the WebSocket server (defaults to ws://localhost:6868)

### Turtle

Run the following command inside your turtle:

```
> wget run https://raw.githubusercontent.com/runi95/turtle-control-panel/master/turtle/downloader.lua
> edit startup.lua
```

NOTE: Make sure to edit the `connectionURL` variable in `startup.lua` (on the turtle) to your own IP address (or server URL). If you want to run this on a local server on localhost then check out this CC:Tweaked guide on [Allowing access to local IPs](https://tweaked.cc/guide/local_ips.html).
