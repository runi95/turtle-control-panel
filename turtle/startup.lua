local connectionURL = "127.0.0.1:5757" --replace with your server IP

local ws
local logLevel = 0
local maxBytesPerMessage = 131072

local function send(msg, uuid)
    if uuid == nil then
        uuid = ""
    end

    -- msg + end of transmission
    local messageWithEnding = msg .. string.char(0x04)
    local index = 0
    local messageNumber = 1
    local size = string.len(msg)
    local uuidSize = string.len(uuid)

    while index < size do
        if ws then
            -- start of heading + message index + uuid + start of text
            local maxBodySize = maxBytesPerMessage - (11 + uuidSize);
            ws.send(string.char(0x01) .. string.pack(">i4", messageNumber) .. string.pack(">i4", uuidSize) .. uuid .. string.char(0x02) .. messageWithEnding:sub(index + 1, index + maxBodySize), true)
            index = index + maxBodySize
            messageNumber = messageNumber + 1
        end
    end
end

local function eval(f, uuid)
    if logLevel == 0 then
        print("EVAL => " .. f)
    end
    local func = loadstring(f)
    local result = {func()}
    local type = "EVAL"
    local response = { type = type, message = result }
    send(textutils.serializeJSON(response), uuid)
end

local function handshake(uuid)
    local id = os.getComputerID()
    local label = os.getComputerLabel()
    local inventory = {}
    for i = 1, 16 do
        local item = turtle.getItemDetail(i, true)
        inventory[tostring(i)] = item
    end
    local fuelLevel = turtle.getFuelLevel()
    local fuelLimit = turtle.getFuelLimit()
    if logLevel < 3 then
        if fuelLevel == 0 then
            print("WARN: Out of fuel")
        elseif fuelLevel < 0.1 * fuelLimit then
            print("WARN: Low on fuel")
        end
    end
    local fuel = { level = fuelLevel, limit = fuelLimit }
    local selectedSlot = turtle.getSelectedSlot()
    local computer = { id = id, label = label, fuel = fuel, inventory = inventory, selectedSlot = selectedSlot }
    local response = { type = "HANDSHAKE", message = computer }
    send(textutils.serializeJSON(response), uuid)
end

local function main()
    if logLevel < 2 then
        print("> CONNECTING...")
    end
    ws, err = http.websocket(connectionURL)
    if ws and logLevel < 2 then
        print("> CONNECTED")
    else
        printError(err)
    end

    local reconnectionAttempts = 0
    while true do
        local message = nil
        if ws then
            message = ws.receive()
        end
        if message == nil then
            if ws then
                ws.close()
            end
            if logLevel < 2 then
                print("> RECONNECTING..." .. " [" .. (reconnectionAttempts + 1) .. "]")
            end
            ws, err = http.websocket(connectionURL)
            if ws then
                if logLevel < 2 then
                    print("> CONNECTED")
                end
                reconnectionAttempts = 0
            else
                reconnectionAttempts = reconnectionAttempts + 1
                printError(err)
                os.sleep(math.min(reconnectionAttempts, 30))
            end
        else
            xpcall(function ()
                local obj = textutils.unserializeJSON(message)
                if obj.type == "HANDSHAKE" then
                    logLevel = obj.logLevel or 0
                    handshake(obj.uuid)
                elseif obj.type == "RENAME" then
                    os.setComputerLabel(obj["message"])
                    local response = { type = "RENAME" }
                    send(textutils.serializeJSON(response), obj.uuid)
                elseif obj.type == "EVAL" then
                    eval(obj["function"], obj.uuid)
                elseif obj.type == "DISCONNECT" then
                    if ws then
                        ws.close()
                    end
                    return print("TERMINATED")
                elseif obj.type == "REBOOT" then
                    if ws then
                        ws.close()
                    end
                    if logLevel < 2 then
                        print("> REBOOTING")
                    end
                    os.reboot()
                end
            end, function (msg)
                printError(msg)
            end)
        end
    end
end

local function wrappedMain()
    local ok, errorMessage = pcall(main)

    pcall(ws and ws.close or function()end)

    if not ok then
        printError(errorMessage)
    end
end

local function waitForDisconnect()
    while true do
        os.pullEvent("websocket_closed")
        if logLevel < 3 then
            print("> WEBSOCKET CLOSED")
        end
        ws = nil
    end
end

parallel.waitForAny(wrappedMain, waitForDisconnect)
