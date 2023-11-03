module.exports = class Turtle {
    constructor(
        id,
        name,
        isOnline,
        fuelLevel,
        fuelLimit,
        location,
        direction,
        selectedSlot,
        inventory = {},
        stepsSinceLastRecharge = undefined,
        state = undefined
    ) {
        this.id = id;
        this.name = name;
        this.isOnline = isOnline;
        this.fuelLevel = fuelLevel;
        this.fuelLimit = fuelLimit;
        this.location = location;
        this.selectedSlot = selectedSlot;

        /**
         * 1: WEST
         * 2: NORTH
         * 3: EAST
         * 4: SOUTH
         */
        this.direction = direction;
        this.inventory = inventory;
        this.stepsSinceLastRecharge = stepsSinceLastRecharge;

        /**
         * Undefined: Standby
         */
        this.state = state;
    }
};
