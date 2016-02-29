"use strict";
var width = 960,
    height = 500,
    centered;

function State(id, code, name) {
  this.id = id;
  this.code = code;
  this.name = name;
}

var allStates = {};
d3.tsv('static/us-state-names.tsv', function(tsv) {
  tsv.forEach(function(d,i) {
    allStates[d.id] = new State(d.id, d.code, d.name);
  });
});

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

var allDem = {};
var allGop = {};

d3.csv('static/dem.csv', function(csv) {
  csv.forEach(function(d, i) {
    allDem[d.state] = new Dem(d.state, new Date(d.date), d.type, d.total, d['super']);
  });
});
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

var svg = d3.select("div.map").append("svg")
          .attr("width", width)
          .attr("height", height);

var details = d3.select("div.details");

svg.append("rect")
.attr("class", "background")
.attr("width", width)
.attr("height", height)
.on("click", clicked);

var g = svg.append("g");

d3.json("static/us.json", function(error, us) {
  if (error) throw error;

  var data = topojson.feature(us, us.objects.states).features;
  g.append("g")
  .attr("id", "states")
  .selectAll("path")
  .data(data)
  .enter().append("path")
  .attr("d", path)
  .on("click", clicked);

  g.append("path")
  .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
  .attr("id", "state-borders")
  .attr("d", path);

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

var selected;
function clicked(d) {
  var x, y, k;

  d3.select('.details').selectAll("*").remove();
  selected = allStates[d.id];
  var labelVis;
  if (d && centered !== d) {
    var centroid = path.centroid(d);
    x = centroid[0];
    y = centroid[1];
    k = 4;
    centered = d;

    var details = d3.select(".details");
    details.append("div").attr("class", "state-name").text(selected.name);

    var demInfo = allDem[selected.name];
    var gopInfo = allGop[selected.name];
    var dem = details.append("div").attr("class", "state-info");
    dem.append('div').html('<a target="_blank" href="http://projects.fivethirtyeight.com/election-2016/primary-forecast/' + selected.name.toLowerCase() + '-democratic">DEM</a>');

    var format = d3.time.format("%Y-%m-%d");

    var table = dem.append('table');
    var row = table.append('tr');
    row.append('td').html("Primary Date");
    row.append('td').html(format(demInfo.date));
    row = table.append('tr');
    row.append('td').html('# Delegates');
    row.append('td').html(demInfo.numDelegates);
    row = table.append('tr');
    row.append('td').html('# Super');
    row.append('td').html(demInfo.numSuper);

    var gop = details.append("div").attr("class", "state-info");
    gop.append('div').html('<a target="_blank" href="http://projects.fivethirtyeight.com/election-2016/primary-forecast/' + selected.name.toLowerCase() + '-republican">GOP</a>');
    table = gop.append('table');
    row = table.append('tr');
    row.append('td').html("Primary Date");
    row.append('td').html(format(gopInfo.date));
    row = table.append('tr');
    row.append('td').html('# Delegates');
    row.append('td').html(gopInfo.numDelegates);
    row = table.append('tr');
    row.append('td').html('Method');
    row.append('td').html(gopInfo.method);

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
