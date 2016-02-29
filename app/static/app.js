"use strict";

var superTuesday = new Date('03/01/16');

var width = 960,
    height = 500,
    centered;

var format = d3.time.format("%Y-%m-%d");

class State {
  constructor(id, code, name) {
    this.id = id;
    this.code = code;
    this.name = name;
  }
}

class Primary {
  constructor(stateName, date, type, numDelegates) {
    this.stateName = stateName;
    this.date = date;
    this.type = type;
    this.numDelegates = numDelegates;
  }
}

class Dem extends Primary {
  constructor(stateName, date, type, numDelegates, numSuper) {
    super(stateName, date, type, numDelegates);
    this.numSuper = numSuper;
  }
}

class Gop extends Primary {
  constructor(stateName, date, type, numDelegates, method) {
    super(stateName, date, type, numDelegates);
    this.method = method;
  }
}

var allStates = {};
var allDem = {};
var allGop = {};

// id -> state code and name
d3.tsv('static/us-state-names.tsv', function(tsv) {
  tsv.forEach(function(d,i) {
    allStates[d.id] = new State(d.id, d.code, d.name);
  });
});

// state name -> democratic primary information
d3.csv('static/dem.csv', function(csv) {
  csv.forEach(function(d, i) {
    allDem[d.state] = new Dem(d.state, new Date(d.date), d.type, d.total, d['super']);
  });
});

// state name -> republican primary information
d3.csv('static/gop.csv', function(csv) {
  csv.forEach(function(d, i) {
    allGop[d.state] = new Gop(d.state, new Date(d.date), d.type, d.total, d.method);
  });
});

var projection = d3.geo.albersUsa()
                 .scale(1070)
                 .translate([width / 2, height / 2]);

var path = d3.geo.path()
           .projection(projection);

// SVG root
var svg = d3.select("div.map").append("svg")
          .attr("width", width)
          .attr("height", height);

// State details pane
var details = d3.select("div.details");

// Background
svg.append("rect")
.attr("class", "background")
.attr("width", width)
.attr("height", height)
.on("click", clicked);

var g = svg.append("g");

// draw the map
d3.json("static/us.json", function(error, us) {
  if (error) throw error;

  var data = topojson.feature(us, us.objects.states).features;

  // draw the states
  g.append("g")
  .attr("id", "states")
  .selectAll("path")
  .data(data)
  .enter().append("path")
  .attr("d", path)
  .classed("election-today", function(d) {
    var selected = allStates[d.id];
    var demInfo = allDem[selected.name];
    var gopInfo = allGop[selected.name];
    return (demInfo && superTuesday.getTime() == demInfo.date.getTime()) ||
      (gopInfo && superTuesday.getTime() == gopInfo.date.getTime());
  })
  .on("click", clicked);

  // state borders
  g.append("path")
  .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
  .attr("id", "state-borders")
  .attr("d", path);

  // State abbrev (hidden until zoomed)
  g.append("g")
  .selectAll("text")
  .data(data)
  .enter()
  .append("svg:text")
  .attr("pointer-events", "none")
  .attr("class", "state-label")
  .text(function(d){
    return allStates[d.id].code;
  })
  .attr("x", function(d){
    return path.centroid(d)[0];
  })
  .attr("y", function(d){
    return path.centroid(d)[1];
  })
  .attr("visibility", "hidden")
  .attr("text-anchor", "middle")
  .attr("fill", "white");
});

// zoom and unzoom
function clicked(d) {
  var x, y, k;

  // reset details pane
  d3.select('.details').selectAll("*").remove();

  var selected = allStates[d.id];
  var demInfo = allDem[selected.name];
  var gopInfo = allGop[selected.name];

  var labelVis;
  // zoomed
  if (d && centered !== d) {
    var centroid = path.centroid(d);
    x = centroid[0];
    y = centroid[1];
    k = 4;
    centered = d;

    renderDetails(selected, demInfo, gopInfo);
  } else {
    x = width / 2;
    y = height / 2;
    k = 1;
    centered = null;
  }

  g.selectAll("text.state-label")
  .attr("visibility", function(d) {
    return centered && d === centered ? "visible" : "hidden";
  });

  g.selectAll("path")
  .classed("active", centered && function(d) { return d === centered; });

  g.transition()
  .duration(750)
  .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
  .style("stroke-width", 1.5 / k + "px");
}

function renderDetails(selected, demInfo, gopInfo) {
    var details = d3.select(".details");
    details.append("div").attr("class", "state-name").text(selected.name);
    details.append("div").attr("class", "election-date").text(
      "Primary Date: " + format(demInfo.date || gopInfo.date));

    if (demInfo != null) {
      renderDem(selected.name, demInfo);
    }
    if (gopInfo != null) {
      renderGop(selected.name, gopInfo);
    }
}

function renderGop(stateName, info) {
  var div = details.append("div").attr("class", "state-info");
  renderPartyDetails(div, stateName.toLowerCase(), 'republican', info.numDelegates,
                     ['wyoming', 'minnesota', 'arkansas', 'vermont', 'colorado', 'alaska']);
  div.append('div')
  .text('Allocation method: ' + info.method)
  .style('font-size', '14px');
}

function renderDem(stateName, info) {
  var div = details.append("div").attr("class", "state-info");
  renderPartyDetails(div, stateName.toLowerCase(), 'democratic', info.numDelegates,
                     ['wyoming', 'minnesota', 'colorado', 'alaska']);
  div.append('div')
  .text('Super delegates: ' + info.numSuper)
  .style('font-size', '14px');
}

function renderPartyDetails(div, stateName, partyName, numDelegates, exclusions) {
  if (exclusions.indexOf(stateName) > 0) {
    div.append('div').html(partyName + ' delegates: ' + numDelegates);
  } else {
    var urlBase = "http://projects.fivethirtyeight.com/election-2016/primary-forecast/"
    var url = urlBase + stateName + '-' + partyName;
    var linkText = partyName + ' delegates: ' + numDelegates;
    div.append('div').append('a')
    .attr('target', '_blank')
    .attr('title', 'Forecasts by 538')
    .attr('href', url)
    .text(linkText);
  }
}