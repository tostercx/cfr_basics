// same as odds vs bet, but added a "pot" which is actually closer to an oppenet's raise
// results - if winning chance above 50% match raise, otherwise fold - no real surprises there, but produces a nice pattern

// y - opponent's bet size 0-9
// x - bot's bet 0-9
// @ prob > 0.5
/*
        ["1.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"],
        ["0.00", "1.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"],
        ["0.00", "0.00", "0.96", "0.03", "0.01", "0.00", "0.00", "0.00", "0.00", "0.00"],
        ["0.00", "0.00", "0.00", "1.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"],
        ["0.00", "0.00", "0.00", "0.00", "0.97", "0.02", "0.01", "0.00", "0.00", "0.00"],
        ["0.00", "0.00", "0.00", "0.00", "0.00", "0.98", "0.01", "0.00", "0.00", "0.00"],
        ["0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.96", "0.03", "0.01", "0.00"],
        ["0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.99", "0.01", "0.00"],
        ["0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.99", "0.01"],
        ["0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "1.00"]
*/

var initArray = size => Array.apply(null, Array(size)).map(x => 0.0)
var initArrayV = (size, val) => Array.apply(null, Array(size)).map(x => val)

var netlinkwrapper = require('netlinkwrapper');
var nl = new netlinkwrapper();
nl.connect('localhost', 1337);

var NUM_PROB_RESOLUTION = 10;
var NUM_BET_RESOLUTION = 10;
var NUM_POT_RESOLUTION = 10;

var BET_SIZES = Array.apply(null, Array(NUM_BET_RESOLUTION)).map((x, i) => i);
var POT_SIZES = Array.apply(null, Array(NUM_BET_RESOLUTION)).map((x, i) => i);

var makeStratArray = x => Array.apply(null, Array(NUM_PROB_RESOLUTION)).map(x =>
                          Array.apply(null, Array(NUM_POT_RESOLUTION)).map(x => 
                          initArrayV(NUM_BET_RESOLUTION, 0.0)))
var makeProbArray = x => Array.apply(null, Array(NUM_POT_RESOLUTION)).map(x =>
                         initArrayV(NUM_PROB_RESOLUTION, 0))

var deck = Array.apply(null, Array(52)).map(x => x+1);

var regretSum = makeStratArray(),
    strategy = makeStratArray(),
    strategySum = makeStratArray(); 


function getStrategy() {
    var normalizingSum = makeProbArray();
    for (var c = 0; c < NUM_POT_RESOLUTION; c++)
    for (var b = 0; b < NUM_PROB_RESOLUTION; b++)
    for (var a = 0; a < NUM_BET_RESOLUTION; a++) {
        strategy[b][c][a] = regretSum[b][c][a] > 0 ? regretSum[b][c][a] : 0;
        normalizingSum[b][c] += strategy[b][c][a];
    }
    for (var c = 0; c < NUM_POT_RESOLUTION; c++)
    for (var b = 0; b < NUM_PROB_RESOLUTION; b++)
    for (var a = 0; a < NUM_BET_RESOLUTION; a++) {
        if (normalizingSum[b][c] > 0)
          strategy[b][c][a] /= normalizingSum[b][c];
        else
          strategy[b][c][a] = 1.0 / NUM_BET_RESOLUTION;
        strategySum[b][c][a] += strategy[b][c][a];
    }
    return strategy;
}

function getAction(strategy, prob, pot) {
    var r = Math.random();
    var a = 0;
    var cumulativeProbability =  0;
    while (a < NUM_BET_RESOLUTION - 1) {
        cumulativeProbability += strategy[prob][pot][a];
        if (r < cumulativeProbability)
            break;
        a++;
    }
    return a;
}

function deal(used, num) {
  var h = [];
  for(var i=0; i<num; i++) {
    do {
      var c = Math.floor(Math.random() * 52);
    } while(used[c]);
    used[c] = 1;
    h.push(c);
  }
  return h;
}

function train(iterations) {
    for (var i = 0; i < iterations; i++) {
        var strategy = getStrategy();
        var used = Array.apply(null, Array(52)).map(x => 0);
        
        var pot = Math.floor(Math.random() * 10);
        var h1 = deal(used, 2).join('_');
        var h2 = deal(used, 2).join('_');
        
        // calculate winning odds
        var sim_opponents = 1;
        var c = deal(used, 5).join('_');
        
        nl.send('C'+c+' H'+h1+' O'+sim_opponents+' I100\n');
        var p1 = Math.floor(parseFloat(nl.read(1024)) * 10);
        if(p1 == 10) p1--;
        
        var myAction = getAction(strategy, p1, pot);
        
        nl.send('C'+c+' H'+h1+' T'+h2+'\n');
        var r = parseInt(nl.read(1024));
        
        var val = BET_SIZES[myAction] * -1;
        if(r) if(BET_SIZES[myAction] < pot) val = -1; else val = pot;
        
        for(var a = 0; a < NUM_BET_RESOLUTION; a++) {
            var val2 = BET_SIZES[a] * -1;
            if(r) if(BET_SIZES[a] < pot) val2 = -1; else val2 = pot;
            regretSum[p1][pot][a] += (val2 - val);
        }
    }
}

function getAverageStrategy() {
    var avgStrategy = makeStratArray();
    var normalizingSum = makeProbArray();
    for (var c = 0; c < NUM_POT_RESOLUTION; c++)
    for (var b = 0; b < NUM_PROB_RESOLUTION; b++)
    for (var a = 0; a < NUM_BET_RESOLUTION; a++)
        normalizingSum[b][c] += strategySum[b][c][a];
    for (var c = 0; c < NUM_POT_RESOLUTION; c++)
    for (var b = 0; b < NUM_PROB_RESOLUTION; b++)
    for (var a = 0; a < NUM_BET_RESOLUTION; a++)
    {
        if (normalizingSum[b][c] > 0)
            avgStrategy[b][c][a] = strategySum[b][c][a] / normalizingSum[b][c];
        else
            avgStrategy[b][c][a] = 1.0 / NUM_BET_RESOLUTION;
        
        avgStrategy[b][c][a] = avgStrategy[b][c][a].toFixed(2);
    }
    return avgStrategy;
}

train(100000);

var fs = require('fs');
fs.writeFileSync("output.json", JSON.stringify(getAverageStrategy()));
