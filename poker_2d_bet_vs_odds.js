// calculate startegy for poker with current winning chance 0-9 and avail. bet sizes 0-9
// results are pretty boring - bet as much as you can if winning chance > 0.5

var initArray = size => Array.apply(null, Array(size)).map(x => 0.0)
var initArrayV = (size, val) => Array.apply(null, Array(size)).map(x => val)

var netlinkwrapper = require('netlinkwrapper');
var nl = new netlinkwrapper();
nl.connect('localhost', 1337);

var NUM_PROB_RESOLUTION = 10;
var NUM_ACTIONS = 10;
var ACTIONS = Array.apply(null, Array(NUM_ACTIONS)).map((x, i) => i);

var makeStratArray = x => Array.apply(null, Array(NUM_PROB_RESOLUTION)).map(x => initArrayV(NUM_ACTIONS, 0.0))
var makeProbArray = x => initArrayV(NUM_PROB_RESOLUTION, 0)

var deck = Array.apply(null, Array(52)).map(x => x+1);

var regretSum = makeStratArray(),
    strategy = makeStratArray(),
    strategySum = makeStratArray(); 


function getStrategy() {
    var normalizingSum = makeProbArray();
    for (var b = 0; b < NUM_PROB_RESOLUTION; b++)
    for (var a = 0; a < NUM_ACTIONS; a++) {
        strategy[b][a] = regretSum[b][a] > 0 ? regretSum[b][a] : 0;
        normalizingSum[b] += strategy[b][a];
    }
    for (var b = 0; b < NUM_PROB_RESOLUTION; b++)
    for (var a = 0; a < NUM_ACTIONS; a++) {//console.log(normalizingSum[b]);
        if (normalizingSum[b] > 0)
          strategy[b][a] /= normalizingSum[b];
        else
          strategy[b][a] = 1.0 / NUM_ACTIONS;
        strategySum[b][a] += strategy[b][a];
    }
    return strategy;
}

function getAction(strategy, prob) {
    var r = Math.random();
    var a = 0;
    var cumulativeProbability =  0;
    while (a < NUM_ACTIONS - 1) {//console.log(prob);
        cumulativeProbability += strategy[prob][a];
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
        var strategy = getStrategy();//console.dir(strategy);if(i > 1) process.exit();
        var used = Array.apply(null, Array(52)).map(x => 0);
        
        var h1 = deal(used, 2).join('_');
        var h2 = deal(used, 2).join('_');
        
        // calculate winning odds
        var sim_opponents = 1;
        var c = deal(used, 5).join('_');
        //var c = ''; //game.community.map(cc).join('_');
        
        nl.send('C'+c+' H'+h1+' O'+sim_opponents+' I100\n');
        var p1 = Math.floor(parseFloat(nl.read(1024)) * 10);
        if(p1 == 10) p1--;
        
        var myAction = getAction(strategy, p1);//console.log(myAction);
        
        nl.send('C'+c+' H'+h1+' T'+h2+'\n');
        var r = parseInt(nl.read(1024));
        
        var d = 1;
        if(!r) d = -1;
        
        var val = ACTIONS[myAction] * d;
        
        for(var a = 0; a < NUM_ACTIONS; a++) {
            regretSum[p1][a] += (ACTIONS[a] * d - val);
        }
    }
}

function getAverageStrategy() {
    var avgStrategy = makeStratArray();
    var normalizingSum = makeProbArray();
    for (var b = 0; b < NUM_PROB_RESOLUTION; b++)
    for (var a = 0; a < NUM_ACTIONS; a++)
        normalizingSum[b] += strategySum[b][a];
    for (var b = 0; b < NUM_PROB_RESOLUTION; b++)
    for (var a = 0; a < NUM_ACTIONS; a++) 
        if (normalizingSum[b] > 0)
            avgStrategy[b][a] = strategySum[b][a] / normalizingSum[b];
        else
            avgStrategy[b][a] = 1.0 / NUM_ACTIONS;
    return avgStrategy;
}

train(100000);
console.dir(getAverageStrategy());
