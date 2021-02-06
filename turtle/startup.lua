local connectionURL = "<INPUT YOUR CONNECTION URL HERE>"
local ws, err = http.websocket(connectionURL)
if not ws then
    return printError(err)
end

print("> CONNECTED")

function arrayToObject(arr)
    local result = {}
    
    for k, v in pairs(arr) do
        result[tostring(k)] = arr[k];
    end

    return result
end

function eval(f, uuid)
    local func = loadstring(f)
    local result = {func()}
    local type = "EVAL"
    local response = { uuid = uuid, type = type, message = result }
    ws.send(textutils.serializeJSON(response))
end

function handshake(uuid)
    local id = os.getComputerID()
    local label = os.getComputerLabel()
    local inventory = {}
    for i = 1, 16 do
        local item = turtle.getItemDetail(i, true)
        item["itemSpaceLeft"] = turtle.getItemSpace(i)
        if not (item == nil) then
            if (item["name"] == "computercraft:wireless_modem_normal" or item["name"] == "computercraft:wireless_modem_advanced") then
                turtle.select(i)
                turtle.equipRight()
            elseif item["name"] == "minecraft:diamond_pickaxe" then
                turtle.select(i)
                turtle.equipLeft()
            elseif item["name"] == "minecraft:coal" then
                turtle.select(i)
                turtle.refuel()
            else
                inventory[tostring(i)] = item
            end
        end
    end
    turtle.select(1)
    local fuelLevel = turtle.getFuelLevel()
    local fuelLimit = turtle.getFuelLimit()
    local fuel = { level = fuelLevel, limit = fuelLimit }
    local x, y, z = gps.locate()
    if (x == nil) then
        return ws.send(textutils.serializeJSON({ type = "ERROR", uuid = uuid, message = "nogps: Failed to connect to the GPS" }))
    end

    local movedBackwards = false
    if (not turtle.forward()) then
        movedBackwards = true
        if (not turtle.back()) then
            movedBackwards = false
            turtle.turnLeft()
            if (not turtle.forward()) then
                movedBackwards = true
                if (not turtle.back()) then
                    return ws.send(textutils.serializeJSON({ type = "ERROR", uuid = uuid, message = "stuck: Turtle can't move" }))
                end
            end
        end
    end

    local x2, y2, z2 = gps.locate()
    if (x2 == nil) then
        return ws.send(textutils.serializeJSON({ type = "ERROR", uuid = uuid, message = "nogps: Failed to connect to the GPS" }))
    end

    local heading
    if movedBackwards then
        heading = vector.new(x, y, z) - vector.new(x2, y2, z2)
    else
        heading = vector.new(x2, y2, z2) - vector.new(x, y, z)
    end
    local direction = ((heading.x + math.abs(heading.x) * 2) + (heading.z + math.abs(heading.z) * 3))
    local location = { x = x2, y = y2, z = z2 }
    local selectedSlot = turtle.getSelectedSlot()
    local computer = { id = id, label = label, fuel = fuel, inventory = inventory, location = location, direction = direction, selectedSlot = selectedSlot }
    local response = { type = "HANDSHAKE", uuid = uuid, message = computer }
    ws.send(textutils.serializeJSON(response))
end

while true do
    local message = ws.receive()
    if message == nil then
        ws.close()
        print("> RECONNECTING...")
        ws, err = http.websocket(connectionURL)
        if not ws then
            return printError(err)
        end
        print("> CONNECTED")
    else
        local obj = textutils.unserializeJSON(message)
        if obj.type == "HANDSHAKE" then
            handshake(obj.uuid)
        elseif obj.type == "RENAME" then
            os.setComputerLabel(obj["message"])
            local response = { type = "RENAME", uuid = obj.uuid }
            ws.send(textutils.serializeJSON(response))
        elseif obj.type == "EVAL" then
            eval(obj["function"], obj.uuid)
        elseif obj.type == "DISCONNECT" then
            ws.close()
            return print("TERMINATED")
        elseif obj.type == "REBOOT" then
            ws.close()
            print("> REBOOTING")
            os.reboot()
        end
    end
end