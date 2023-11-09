class TurtleAIController {
    #turtleControllerMap = new Map();

    add(turtleController, turtleId) {
        this.#turtleControllerMap.set(turtleId, turtleController);
        return true;
    }

    remove(id) {
        return this.#turtleControllerMap.delete(id);
    }

    async runAll() {
        await Promise.all(
            Array.from(this.#turtleControllerMap).map(([_, turtleController]) => turtleController.ai()?.next())
        );
    }
}

const globalAIController = new TurtleAIController();
const runController = async () => {
    await globalAIController.runAll();
    setTimeout(runController, 1);
};
setTimeout(runController, 1);

module.exports = globalAIController;
