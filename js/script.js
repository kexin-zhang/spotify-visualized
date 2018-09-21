const WIDTH = 1200;
const HEIGHT = 600;
const FORCE_STRENGTH = 0.03;
const VELOCITY_DECAY = 0.2;
const RADIUS = 4;

let svg = d3.select("#canvas")
            .append("svg")
            .attr("height", "100%")
            .attr("width", "100%")
            .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

let nodes = [];
let circles = svg.selectAll(".bubble");
let labels = svg.selectAll(".label");
let label_pos = {};
let curr_key = null;
let show_labels = true;

let simulation = d3.forceSimulation()
            .velocityDecay(VELOCITY_DECAY)
            .force('charge', d3.forceManyBody().strength(charge))
            .on("tick", ticked);

initChart("data/songs.csv", "artist", "treemap");

function initChart(path, key, centerMethod) {
    curr_key = key;

    d3.csv(path).then((data) => {
        nodes = data.map((d) => {
            let obj = {
                radius: 4
            };
            data.columns.forEach((col) => {
                obj[col] = d[col]
            });
            return obj;
        });

        let centers = getCenters(centerMethod, key);

        simulation.force('charge', d3.forceManyBody().strength(charge))
                  .force('x', d3.forceX().strength(FORCE_STRENGTH).x((d) => nodePos(d, centers, key).x))
                  .force('y', d3.forceY().strength(FORCE_STRENGTH).y((d) => nodePos(d, centers, key).y));    

        circles = svg.selectAll('.bubble')
                        .data(nodes)
                        .enter()
                        .append("circle")
                        .attr("r", (d) => d.radius)
                        .attr("class", "bubble");
        
        
        simulation.nodes(nodes);
    });
}

function groupBy(centerMethod, key) {
    curr_key = key; 
    show_labels = true;

    // delete all labels
    d3.selectAll(".label").remove();
    d3.selectAll(".axis").remove();

    let centers = getCenters(centerMethod, key);

    simulation.force('charge', d3.forceManyBody().strength(charge))
              .force('x', d3.forceX().strength(FORCE_STRENGTH).x((d) => nodePos(d, centers, key).x))
              .force('y', d3.forceY().strength(FORCE_STRENGTH).y((d) => nodePos(d, centers, key).y));

    simulation.alpha(1).restart();
}

function displayByScale(key, min, max) {
    curr_key = key
    show_labels = false;

    // clear labels
    d3.selectAll(".label").remove();
    d3.selectAll(".axis").remove();

    if (min === undefined) { min = d3.min(nodes, (d) => d[key]); }
    if (max === undefined) { max = d3.max(nodes, (d) => d[key]); }

    let scale = d3.scaleLinear()
                  .domain([min, max])
                  .range([0, WIDTH]);

    simulation.force('charge', d3.forceManyBody().strength(0))
              .force('x', d3.forceX().strength(FORCE_STRENGTH).x((d) => scale(d[key])))
              .force('y', d3.forceY().strength(FORCE_STRENGTH).y( HEIGHT / 2 ));
    
    simulation.alpha(1).restart();

    svg.append("g")
       .attr("transform", `translate(0, ${HEIGHT/2})`)
       .call(d3.axisBottom(scale))
       .attr("class", "axis");
}

function ticked() {
    circles.attr("cx", (d) => d.x)
           .attr("cy", (d) => d.y);

    // show labels once movement has stabilized
    let max_velocity = d3.max(nodes, (d) => Math.max(d.vx, d.vy));
    if (show_labels && d3.selectAll(".label").empty() && max_velocity < 0.3) {
        showLabels(curr_key);
    }
}

function charge(d) {
    return -Math.pow(d.radius, 2.0) * FORCE_STRENGTH; 
}

function getCenters(centerMethod, key) {
    if (centerMethod === "radial") {
        let children = getRadialChildren(nodes, key);

        let centers = {}
        children.forEach((elem) => {
            centers[elem.id] = {
                x: elem.x,
                y: elem.y
            }
        });

        return centers;
    } else if (centerMethod === "treemap") {
        let children = getTreemapChildren(nodes, key);

        let centers = {}
        children.forEach((elem) => {
            centers[elem.id] = {
                x: (elem.x0 + elem.x1) / 2,
                y: (elem.y0 + elem.y1) / 2
            }
        });
    
        return centers;
    }
}

function getRadialChildren(data, key) {
    let counts = d3.nest()
                   .key((d) => d[key])
                   .rollup((v) => v.length)
                   .entries(data);

    counts = counts.map((entry) => {
        return { 
            name: entry.key,
            size: entry.value
        }
    });

    counts.push({name: "root"});

    let stratify = d3.stratify()
                     .parentId((d) => {
                         if (d.name === "root") {
                             return null;
                         }
                         return "root";
                     })
                     .id((d) => d.name);
    
    let root = stratify(counts)
                .sum((d) => Math.sqrt(d.size))
                .sort((a, b) => {
                    return b.size - a.size;
                });
    
    let pack = d3.pack().size([WIDTH, HEIGHT])
                 .padding(20);

    let children = pack(root).descendants();

    return children;
}

function getTreemapChildren(data, key) {
    let counts = d3.nest()
                   .key((d) => d[key])
                   .rollup((v) => v.length)
                   .entries(data);

    counts = counts.map((entry) => {
        return { 
            name: entry.key,
            size: entry.value
        }
    });

    counts.push({name: "root"});

    let stratify = d3.stratify()
                     .parentId(function(d) {
                         if (d.name === "root") {
                             return null;
                         }
                         return "root";
                     })
                     .id(function(d) { 
                         return d.name;
                     });
    
    let root = stratify(counts)
                .sum((d) => Math.sqrt(d.size))
                .sort((a, b) => {
                    return b.size - a.size;
                });

    let treemap = d3.treemap()
                    .size([WIDTH, HEIGHT])
                    .tile(d3.treemapSquarify.ratio(1))
                    .paddingOuter(50);
    treemap(root);
    
    return root.children;
}

function nodePos(d, centers, key) {
    return centers[d[key]];
}

function updateLabelPos(key) {
    label_pos = {};

    let agg = d3.nest()
                .key((d) => d[key])
                .rollup((v) => {
                    return {
                        x: d3.mean(v, (d) => d.x),
                        y: d3.max(v, (d) => d.y) + 15
                    }
                })
                .entries(nodes);

    agg.forEach((elem) => {
        label_pos[elem.key] = {
            x: elem.value.x,
            y: elem.value.y
        }
    });
}

function showLabels(key) {
    updateLabelPos(key);
    labels = svg.selectAll(".label")
                .data(Object.keys(label_pos))
                .enter()
                .append("text")
                .attr("class", "label")
                .attr("x", (d) => label_pos[d].x)
                .attr("y", (d) => label_pos[d].y)
                .text((d) => d)
                .call(wrap, 75);
}

// Mike Bostock's text wrapping function lol
function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = 0, //parseFloat(text.attr("dy")),
            tspan = text.text(null)
                        .append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word);
            }
        }
    });
}