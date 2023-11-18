# Turtle Control Panel

A control panel that let's you monitor and control your [ComputerCraft](https://www.computercraft.info/) and/or [ComputerCraft: Tweaked](https://tweaked.cc/) turtles through a websocket connection.

![Dashboard](/screenshots/Dashboard.png)

The turtles will show up on the dashboard where their online state, activities and fuel consumption can be monitored.

![Turtle](/screenshots/Turtle.png)

Clicking on one of the turtles brings you to the turtle control panel where you can monitor a single turtle more closely as well as change it's behaviour and activities or watch it move around on the minimap.

The map only shows you what the turtle can see (or have seen) and may not be a realistic interpretation of the world as it may have changed since the last time the turtle inspected the block.

## Setup

Before you begin make sure that [Node.js](https://nodejs.org/en/) is installed, then clone the project with `git clone` and make sure your working directory is within the cloned project.

### Server

```sh
# Change the working directory
cd server

# Install dependencies
npm install

# Start the server
npm start
```

### Portal

```sh
# Change the working directory
cd portal

# Install dependencies
npm install

# Start the portal
npm start
```

### Turtle

Get the contents of [startup.lua](./turtle/startup.lua) onto the turtle. This can be achieved by either uploading the contents onto pastebin and running the `pastebin get <code> startup` on the turtle itself (recommended) or by copying the contents of the file, running `edit startup` on the turtle and pasting the content line by line.

Once the turtle has the correct startup file simply restart the turtle with `reboot` and it should attempt to connect to your running server.

NOTE: Make sure to edit the `connectionURL` variable in startup.lua to your own IP address (or server URL). If you want to run this on a local server on localhost then check out this CC:Tweaked guide on [Allowing access to local IPs](https://tweaked.cc/guide/local_ips.html).
