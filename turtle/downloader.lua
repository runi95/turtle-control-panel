--[[ This is just a very basic script that
downloads the latest version of the startup.lua
script located in this directory --]]

-- Open the startup.lua file
local file = fs.open("startup.lua", "w")

-- Download the latest version from GitHub and update startup.lua
file.write(http.get("https://raw.githubusercontent.com/runi95/turtle-control-panel/master/turtle/startup.lua").readAll())

-- Run startup.lua
-- os.run({}, "startup.lua")
