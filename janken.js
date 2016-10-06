var initArray = size => Array.apply(null, Array(size)).map(x => 0.0)

var ROCK = 0, PAPER = 1, SCISSORS = 2, NUM_ACTIONS = 3;
var regretSum = initArray(NUM_ACTIONS), 
         strategy = initArray(NUM_ACTIONS), 
         strategySum = initArray(NUM_ACTIONS), 
         oppStrategy = [ 0.4, 0.3, 0.3 ]; 


function getStrategy() {
    var normalizingSum = 0;
    for (var a = 0; a < NUM_ACTIONS; a++) {
        strategy[a] = regretSum[a] > 0 ? regretSum[a] : 0;
        normalizingSum += strategy[a];
    }
    for (var a = 0; a < NUM_ACTIONS; a++) {
        if (normalizingSum > 0)
          strategy[a] /= normalizingSum;
        else
          strategy[a] = 1.0 / NUM_ACTIONS;
        strategySum[a] += strategy[a];
    }
    return strategy;
}

function getAction(strategy) {
    var r = Math.random();
    var a = 0;
    var cumulativeProbability =  0;
    while (a < NUM_ACTIONS - 1) {
        cumulativeProbability += strategy[a];
        if (r < cumulativeProbability)
            break;
        a++;
    }
    return a;
}

function train(iterations) {
    var actionUtility = initArray(NUM_ACTIONS);
    for (var i = 0; i < iterations; i++) {
        var strategy = getStrategy();
        var myAction = getAction(strategy);
        var otherAction = getAction(oppStrategy);

        actionUtility[otherAction] = 0;
        actionUtility[otherAction == NUM_ACTIONS - 1 ? 0 : otherAction + 1] = 1;
        actionUtility[otherAction == 0 ? NUM_ACTIONS - 1 : otherAction - 1] = -1;

        for(var a = 0; a < NUM_ACTIONS; a++)
            regretSum[a] += actionUtility[a] - actionUtility[myAction];
    }
}

function getAverageStrategy() {
    var avgStrategy = initArray(NUM_ACTIONS);
    var normalizingSum = 0;
    for (var a = 0; a < NUM_ACTIONS; a++)
        normalizingSum += strategySum[a];
    for (var a = 0; a < NUM_ACTIONS; a++) 
        if (normalizingSum > 0)
            avgStrategy[a] = strategySum[a] / normalizingSum;
        else
            avgStrategy[a] = 1.0 / NUM_ACTIONS;
    return avgStrategy;
}

train(1000000);
console.dir(getAverageStrategy());
