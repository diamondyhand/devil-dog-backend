class BattlePerformance {
    constructor() {
        this.creater = null;
        this.joiner = null;
        this.performances = [];
        this.starter = "creater";
    }

    newPerformance(data) {
        this.performances.push(data);
    }

    setCreater(socket) {
        this.creater = socket;
    }
    setJoiner(socket) {
        this.joiner = socket;
    }
    setStarter() {
        Math.floor(Math.random()*10)%2 === 0 ? this.starter = "creater" : 'joiner';
    }
}

module.exports = BattlePerformance;