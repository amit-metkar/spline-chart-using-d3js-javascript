// start - plugin code

(function ($) {

    var chartMethods = {
        init: function (options) {
            var settings = {};
            if (!options.reloadSettings && this.data('chartSettings')) {
                settings = this.data('chartSettings');
                settings.data = options.data;
            } else {
                settings = $.extend({
                    title: "ICAAP",
                    id: "chart",
                    w: 600,
                    h: 400,
                    initialize: true,
                    legends: { width: 0, height: 40, size: 10, spacing: 4, length: 255, topMargin: 70, pagination: { pageSize: 8, pageNumber: 1, leftMargin: 20 } },
                    axisName: {},
                    margin: { top: 58, bottom: 100, left: 80, right: 25 },
                    ticks: { x: 6, y: 8 },
                    tickSize: { x: 10, y: 10 },
                    reloadSettings: false,
                    config: { title: { tab1: 'Data', tab2: 'Analytical' } },
                    contextMenuItems: [
                        { key: "rawValue", value: "Raw Value" },
                        { key: "rawChangeAbsolute", value: "Raw Change - vs. Launchpoint" },
                        { key: "rawChangeRelative", value: "Raw Change - vs. Previous Period" },
                        { key: "percentChangeAbsolute", value: "% Change - vs. Launchpoint" },
                        { key: "percentChangeRelative", value: "% Change - vs. Previous Period" }
                    ],
                    controlSettings: {}
                }, options);

                if (this.attr("id")) {
                    settings.container = "#" + this.attr("id");
                }
                else {
                    settings.container = "." + this.attr("class").replace(" ", ".");
                }

                settings.controlSettings.width = settings.w - settings.margin.left - settings.margin.right;
                settings.controlSettings.height = settings.h - settings.margin.top - settings.margin.bottom;
                settings.controlSettings.chart = {};
                settings.controlSettings.svg = {};
                settings.controlSettings.innerContainerId = settings.id + '-container';
                settings.controlSettings.showAllScenariosId = 'showAllScenarios';
                settings.controlSettings.t = d3.transition().duration(500).ease(d3.easeLinear);
                // adjust legends height
                settings.legends.height = (settings.legends.pagination.pageSize / 2) * 10;
            }

            function getCopyofData() {
                return JSON.parse(JSON.stringify(settings.data));
            }

            function drawAxis(params) {
                if (params.initialize === true) {
                    // Add vertical/x gridline
                    this.append("g")
                        .call(params.gridLines.x)
                        .classed("x gridline", true)
                        .attr("stroke", "#e4e4e4")
                        .attr("transform", "translate(0,0)");

                    // Add horizontal/y gridline
                    this.append("g")
                        .call(params.gridLines.y)
                        .classed("y gridline", true)
                        .attr("stroke", "#e4e4e4")
                        .attr("transform", "translate(0,0)");

                    // x axis
                    this.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + (settings.controlSettings.height - settings.legends.height) + ")")
                        .call(params.axis.x)
                        .selectAll("text")
                        .classed("x-axis-label", true)
                        // .style("text-anchor", "end")
                        .attr("dx", -8)
                        .attr("dy", 8)
                        .attr("transform", "translate(0,0) rotate(-45)");

                    // Add X axis label text
                    if (settings.axisName.x) {
                        this.append("g")
                            .append("text")
                            .attr("x", 0)
                            .attr("y", 0)
                            .classed("x-axis", true)
                            .attr("transform", "translate(" + settings.controlSettings.width / 2 + ", " + (settings.controlSettings.height - settings.legends.height + 85) + ")")
                            .text(settings.axisName.x);
                    }
                    // y axis
                    this.append("g")
                        .attr("class", "y axis")
                        .call(params.axis.y)
                        .selectAll("text")
                        .classed("y-axis-label", true);

                    // Add Y axis label text
                    if (settings.axisName.y) {
                        this.append("g")
                            .append("text")
                            .attr("x", 0)
                            .attr("y", 0)
                            .classed("y-axis", true)
                            .attr("transform", "translate(-60," + (settings.controlSettings.height - settings.legends.height) / 2 + ") rotate(-90)")
                            .text(settings.axisName.y);
                    }
                }
                else if (params.initialize === false) {
                    // Update info
                    this.selectAll("g.x.gridline")
                        .call(params.gridLines.x);
                    this.selectAll("g.y.gridline")
                        .call(params.gridLines.y);
                    this.selectAll("g.x.axis")
                        // .transition()
                        // .duration(500)
                        .call(params.axis.x);
                    this.selectAll(".x-axis-label")
                        // .style("text-anchor", "end")
                        // .transition()
                        // .duration(500)
                        .attr("dx", -8)
                        .attr("dy", 8)
                        .attr("transform", "translate(0,0) rotate(-45)");
                    this.selectAll("g.y.axis")
                        // .transition()
                        // .duration(500)
                        .call(params.axis.y);
                }
            }

            function setParams(params) {
                params.scale = {};
                params.axis = {};
                params.gridLines = {};
                // params.tooltip = {}

                params.scale.x = d3.scaleTime()
                    .domain(d3.extent(params.data.periods, function (d) { return new Date(d); }))
                    .range([0, settings.controlSettings.width]);

                params.scale.y = d3.scaleLinear()
                    .domain([
                        d3.min(params.data.plotData, function (s) { return d3.min(s.data, function (d, i) { return d[1]; }); }),
                        d3.max(params.data.plotData, function (s) { return d3.max(s.data, function (d, i) { return d[1]; }); })
                    ])
                    .range([settings.controlSettings.height - settings.legends.height, 0]);

                params.scale.z = d3.scaleOrdinal(d3.schemeCategory20)
                    .domain(params.data.plotData.map(function (s) { return s.label2; }));

                params.line = d3.line()
                    .x(function (d) { return params.scale.x(new Date(d[0])); })
                    .y(function (d) { return params.scale.y(d[1]); })
                    .curve(d3.curveCardinal);

                params.axis.x = d3.axisBottom(params.scale.x)
                    .tickSize(settings.tickSize.x)
                    .ticks(d3.timeMonth, settings.ticks.x)
                    .tickFormat(d3.timeFormat("%Y/%m/%d"));

                params.axis.y = d3.axisLeft(params.scale.y)
                    .tickSize(settings.tickSize.y)
                    .ticks(settings.ticks.y);

                // Vertical/X grid lines
                params.gridLines.x = d3.axisBottom(params.scale.x)
                    .ticks(d3.timeMonth, settings.ticks.x)
                    .tickSize(settings.controlSettings.height - settings.legends.height, 0, 0)
                    .tickFormat("");

                // Horizontal/Y grid lines
                params.gridLines.y = d3.axisLeft(params.scale.y)
                    .ticks(settings.ticks.y)
                    .tickSize(-settings.controlSettings.width, 0, 0)
                    .tickFormat("");

                // Define the div for the tooltip
                params.tooltip = d3.select("body").append("div")
                    .attr("class", "tooltip");
                // params.tooltip.line = d3.tip()
                //     .attr("class", "d3-tip")
                //     .offset([-8, 0])
                //     .html(function (d) { return '<div class="content">' + d.label2 + '</div>'; });

                // params.tooltip.point = d3.tip()
                //     .attr("class", "d3-tip")
                //     .offset([-8, 0])
                //     .html(function (d) { return '<div class="content">' + this.parentNode.__data__.label2 + '<br>' + 'Forecast: ' + d[1] + ' on Date: ' + d3.timeFormat("%m/%d/%Y")(d[0]) + '</div>'; });

                return params;
            }

            function truncateLongString(str, keepFirstLength, keepLastLength) {
                var modifiedStr = str;
                var elipses = "....";
                if (str.length > (keepFirstLength + keepLastLength + elipses.length)) {
                    var firstStr = str.substring(0, keepFirstLength);
                    var lastStr = str.substring(str.length - keepLastLength);
                    modifiedStr = firstStr + elipses + lastStr;
                }
                return modifiedStr;
            }

            function drawLegends(params) {

                // reset page number
                settings.legends.pagination.pageNumber = 1;

                settings.controlSettings.svg.select(".legends").remove();

                var chartBBox = this._groups[0][0].getBBox();

                function getLegendPageData() {
                    return params.data.plotData.slice(
                        (settings.legends.pagination.pageNumber - 1) * settings.legends.pagination.pageSize, settings.legends.pagination.pageNumber * settings.legends.pagination.pageSize
                    );
                }

                function getPageUpOpacity() {
                    if (settings.legends.pagination.pageNumber <= 1) {
                        return 0.7;
                    } else {
                        return 1;
                    }
                }

                function getPageDownOpacity() {
                    if (params.data.plotData.length - settings.legends.pagination.pageSize * settings.legends.pagination.pageNumber <= 0) {
                        return 0.7;
                    } else {
                        return 1;
                    }
                }

                function updatePageNumber(n) {
                    if ((settings.legends.pagination.pageNumber <= 1 && n < 0) ||
                        ((params.data.plotData.length - settings.legends.pagination.pageSize * settings.legends.pagination.pageNumber <= 0) && n > 0)) {
                        return false;
                    }
                    settings.legends.pagination.pageNumber = settings.legends.pagination.pageNumber + n;

                    pageUp.style("opacity", getPageUpOpacity);
                    pageDown.style("opacity", getPageDownOpacity);

                    return true;
                }

                var legends = settings.controlSettings.svg.append("g")
                    .classed("legends", true)
                    .attr('height', settings.legends.height)
                    .attr("transform", "translate(0, " + (chartBBox.height + settings.legends.topMargin) + ")");

                var pagination = legends.append("g")
                    .classed("legends-pagination", true)
                    .attr('height', settings.legends.height)
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("transform", "translate(" + settings.legends.pagination.leftMargin + ", 0)");


                var buttonSize = "16px";
                // page up button
                var pageUp = pagination.append("svg")
                    .classed("pagination-button page-up", true)
                    .attr("height", buttonSize)
                    .attr("width", buttonSize)
                    .attr("viewBox", "0 0 292.362 292.361")
                    .attr("x", 0)
                    .attr("y", 0)
                    .append("g")
                    .classed("page-up-group", true)
                    .style("opacity", getPageUpOpacity)
                    .on("click", function () {
                        if (updatePageNumber(-1)) {
                            draw(getLegendPageData());
                        }
                    });

                pageUp.append("path")
                    .attr("d", "M286.935,197.287L159.028,69.381c-3.613-3.617-7.895-5.424-12.847-5.424s-9.233,1.807-12.85,5.424L5.424,197.287   C1.807,200.904,0,205.186,0,210.134s1.807,9.233,5.424,12.847c3.621,3.617,7.902,5.425,12.85,5.425h255.813   c4.949,0,9.233-1.808,12.848-5.425c3.613-3.613,5.427-7.898,5.427-12.847S290.548,200.904,286.935,197.287z")
                    .attr("fill", "#245D9A");

                if (settings.legends.pagination.pageSize > 4) {
                    pagination.append("text")
                        .classed("page-number", true)
                        .attr("transform", "translate(4, " + ((settings.legends.height / 2) + 10) + ")")
                        .text(settings.legends.pagination.pageNumber);
                }
                // page down button
                var pageDown = pagination.append("svg")
                    .classed("pagination-button page-down", true)
                    .attr("height", buttonSize)
                    .attr("width", buttonSize)
                    .attr("viewBox", "0 0 292.362 292.362")
                    .attr("x", 0)
                    .attr("y", function (d, i) {
                        if (settings.legends.height - 5 < 10) {
                            return 10;
                        }
                        return settings.legends.height - 5;
                    })
                    .append("g")
                    .classed("page-down-group", true)
                    .style("opacity", getPageDownOpacity)
                    .on("click", function () {
                        if (updatePageNumber(1)) {
                            draw(getLegendPageData());
                        }
                    });
                pageDown.append("path")
                    .attr("d", "M286.935,69.377c-3.614-3.617-7.898-5.424-12.848-5.424H18.274c-4.952,0-9.233,1.807-12.85,5.424   C1.807,72.998,0,77.279,0,82.228c0,4.948,1.807,9.229,5.424,12.847l127.907,127.907c3.621,3.617,7.902,5.428,12.85,5.428   s9.233-1.811,12.847-5.428L286.935,95.074c3.613-3.617,5.427-7.898,5.427-12.847C292.362,77.279,290.548,72.998,286.935,69.377z")
                    .attr("fill", "#245D9A");

                function draw(data) {

                    legends.selectAll(".legend").remove();

                    // draw legends group
                    var legend = legends.selectAll(".legend")
                        .data(getLegendPageData())
                        .enter()
                        .append("g")
                        .classed("legend", true)
                        .attr("transform", function (d, i) {
                            var hor = 0;
                            var ver = i / 2 * (settings.legends.size + settings.legends.spacing);
                            if (i % 2 !== 0) {
                                hor = settings.legends.length;
                                ver = (i - 1) / 2 * (settings.legends.size + settings.legends.spacing);
                            }
                            return 'translate(' + (hor + settings.margin.left) + ',' + ver + ')';
                        })
                        .on("mouseover", function (d, i) {
                            settings.controlSettings.svg.select("[data-legend='" + d.name + "']").transition().duration(200).style("stroke-width", "4px");

                            var html = '<div class="content">' + d.name + '</div>';
                            params.tooltip.transition().duration(200).style("opacity", 0.9);
                            params.tooltip.html(html).style("left", (d3.event.pageX) + "px").style("top", (d3.event.pageY - 30) + "px");
                        })
                        .on("mouseout", function (d, i) {
                            settings.controlSettings.svg.select("[data-legend='" + d.name + "']").transition().duration(500).style("stroke-width", "2px");

                            params.tooltip.transition().duration(500).style("opacity", 0);
                        });

                    legend.append('rect')
                        .attr('width', settings.legends.size)
                        .attr('height', settings.legends.size)
                        .style('fill', function (d, i) { return d.color; })
                        .style('stroke', function (d, i) { return d.color; })
                        .call(function (d, i) { d.exit().remove(); });

                    legend.append('text')
                        .classed("legend-text", true)
                        .attr('x', settings.legends.size + settings.legends.spacing)
                        .attr('y', settings.legends.size + 2 - settings.legends.spacing)
                        .text(function (d, i) { return truncateLongString(d.name, 25, 20); })
                        .call(function (d, i) { d.exit().remove(); });

                    legend.data(getLegendPageData())
                        .exit()
                        .remove();
                    if (settings.legends.pagination.pageSize > 4) {
                        pagination.select("text").text(settings.legends.pagination.pageNumber);
                    }
                }
                draw(getLegendPageData());
            }

            function plot(params) {

                drawAxis.call(this, params);

                this.selectAll(".scenario").remove();

                var scenario = this.selectAll(".scenario")
                    .data(params.data.plotData)
                    .enter()
                    .append("g")
                    .classed("scenario", true);

                // enter()
                scenario.append("path")
                    .classed("line", true)
                    .on("mouseover", function (d, i) {
                        d3.select(this).transition().duration(200).style("stroke-width", "4px");

                        // params.tooltip.line.show();
                        var html = '<div class="content">' + d.label2 + '</div>';
                        params.tooltip.transition().duration(200).style("opacity", 0.9);
                        params.tooltip.html(html).style("left", (d3.event.pageX) + "px").style("top", (d3.event.pageY - 30) + "px");
                    })
                    .on("mouseout", function (d, i) {
                        d3.select(this).transition().duration(500).style("stroke-width", "2px");

                        // params.tooltip.line.hide();
                        params.tooltip.transition().duration(500).style("opacity", 0);
                    });

                scenario.selectAll(".point")
                    .data(function (s) { return s.data; })
                    .enter()
                    .append("circle")
                    .classed("point", true)
                    .attr("r", 3)
                    .on("mouseover", function (d, i) {
                        d3.select(this).transition().duration(200)
                            .style("fill", this.parentNode.__data__.color)
                            .style("r", 5);
                        d3.select(this.parentElement).select(".line").transition().duration(200).style("stroke-width", "4px");

                        // params.tooltip.point.show();
                        var html = '<div class="content">' + this.parentNode.__data__.label2 + '<br>' + 'YValues: ' + d[1] + ' on Date: ' + d3.timeFormat("%m/%d/%Y")(d[0]) + '</div>';
                        params.tooltip.transition().duration(200).style("opacity", 0.9);
                        params.tooltip.html(html).style("left", (d3.event.pageX) + "px").style("top", (d3.event.pageY - 50) + "px");
                    })
                    .on("mouseout", function (d, i) {
                        d3.select(this).transition().duration(500).style("r", 2);
                        d3.select(this.parentElement).select(".line").transition().duration(200).style("stroke-width", "2px");

                        // params.tooltip.point.hide();
                        params.tooltip.transition().duration(500).style("opacity", 0);
                    });

                // update()
                scenario.selectAll(".line")
                    .attr("d", function (d) {
                        return params.line(d.data);
                    })
                    .attr("data-legend", function (d) {
                        return d.name;
                    })
                    .style("stroke", function (d) {
                        return d.color;
                    });

                scenario.selectAll(".point")
                    .attr("cx", function (d) {
                        return params.scale.x(new Date(d[0]));
                    })
                    .attr("cy", function (d) {
                        return params.scale.y(d[1]);
                    })
                    .attr("fill", function (d) {
                        return this.parentNode.__data__.color;
                    })
                    .attr("stroke", function (d) {
                        return this.parentNode.__data__.color;
                    });

                // exit()
                this.selectAll(".scenario")
                    .data(params.data.plotData)
                    .exit()
                    .remove();

                this.selectAll(".point")
                    .exit()
                    .remove();

                // Draw Legends
                drawLegends.call(this, params);
            }

            function getObject(list, prop, val) {
                for (var i = 0; i < list.length; i++) {
                    if (list[i][prop] == val) {
                        return list[i];
                    }
                }
                return null;
            }

            function getConfigurationHtml(data, w, h) {
                var scenario = [];
                for (var i = 0; i < data.plotData.length; i++) {
                    var obj = getObject(scenario, 'id', data.plotData[i].var_id);
                    if (obj == null) {
                        scenario.push({ id: data.plotData[i].var_id, name: data.plotData[i].var_name, child: [{ scenario: data.plotData[i].scenario }] });
                    } else {
                        obj.child.push({ scenario: data.plotData[i].scenario });
                    }
                }

                var html = '<div class="chart-config row ml-0 mr-0" style="width:100%;"><div class="col-12">';
                html += '<div class="row"><div class="col-12"><div class="form-check"><label class="form-check-label"><input id="' + settings.controlSettings.showAllScenariosId + '" class="form-check-input" type="checkbox" checked="checked" value="">Show all Scenarios</label></div></div></div><hr>';
                for (var i = 0; i < scenario.length; i++) {
                    // Add parent group checkbox
                    html += '<div class="row config-section"><div class="col-12"><div class="form-check"><label class="form-check-label"><input id="' + scenario[i].id + '" class="form-check-input parent" type="checkbox" checked="checked" value="">' + scenario[i].name + '</label></div>';
                    html += '<div class="row">';
                    for (var j = 0; j < scenario[i].child.length; j++) {
                        // Add child group checkbox
                        html += '<div class="col-3"><div class="form-check"><label class="form-check-label"><input id="' + scenario[i].id + '-' + j + '" data-id="' + scenario[i].id + '" data-scenario="' + scenario[i].child[j].scenario + '"  class="form-check-input child" type="checkbox" checked="checked" value="">' + scenario[i].child[j].scenario + '</label></div></div>';
                    }
                    html += '</div><hr></div></div>';
                }
                html += '</div></div>';

                // var html = '<div class="chart-config row ml-0 mr-0" style="width:100%;"><div class="col-12"><ul class="nav nav-tabs" id="myTab" role="tablist"><li class="nav-item"><a class="nav-link active" id="data-tab" data-toggle="tab" href="#data" role="tab" aria-controls="data"aria-selected="true">Data</a></li><li class="nav-item"><a class="nav-link" id="analytical-tab" data-toggle="tab" href="#analytical" role="tab" aria-controls="analytical" aria-selected="false">Analytical</a></li></ul><div class="tab-content" id="myTabContent"><div class="tab-pane fade show active" id="data" role="tabpanel" aria-labelledby="data-tab">';

                // // Add tab 1 HTML
                // var tab1Html = '<div class="row"><div class="col-12"><div class="form-check"><label class="form-check-label"><input id="' + settings.controlSettings.showAllScenariosId + '" class="form-check-input" type="checkbox" checked="checked" value="">Show all Scenarios</label></div></div></div><hr>';
                // for (var i = 0; i < scenario.length; i++) {
                //     // Add parent group checkbox
                //     tab1Html += '<div class="row config-section"><div class="col-12"><div class="form-check"><label class="form-check-label"><input id="' + scenario[i].id + '" class="form-check-input parent" type="checkbox" checked="checked" value="">' + scenario[i].name + '</label></div>';
                //     tab1Html += '<div class="row">';
                //     for (var j = 0; j < scenario[i].child.length; j++) {
                //         // Add child group checkbox
                //         tab1Html += '<div class="col-3"><div class="form-check"><label class="form-check-label"><input id="' + scenario[i].id + '-' + j + '" data-id="' + scenario[i].id + '" data-scenario="' + scenario[i].child[j].scenario + '"  class="form-check-input child" type="checkbox" checked="checked" value="">' + scenario[i].child[j].scenario + '</label></div></div>';
                //     }
                //     tab1Html += '</div><hr></div></div>';
                // }
                // html += tab1Html;

                // html += '</div><div class="tab-pane fade" id="analytical" role="tabpanel" aria-labelledby="analytical-tab">';

                // // Add tab 2 HTML

                // html += '</div></div></div></div>';

                return html;
            }

            function getUpdatedData() {
                var _data = getCopyofData();
                var updatedData = [];
                for (var i = 0; i < _data.plotData.length; i++) {
                    if ($(settings.container + " #" + settings.controlSettings.innerContainerId + " .chart-configuration input[data-id='" + _data.plotData[i].var_id + "'][data-scenario='" + _data.plotData[i].scenario + "']").is(':checked')) {
                        updatedData.push(_data.plotData[i]);
                    }
                }
                _data.plotData = updatedData;
                return _data;
            }

            function getSVGString(svgNode) {
                svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
                var cssStyleText = getCSSStyles(svgNode);
                appendCSS(cssStyleText, svgNode);

                var serializer = new XMLSerializer();
                var svgString = serializer.serializeToString(svgNode);
                svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
                svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix

                return svgString;

                function getCSSStyles(parentElement) {
                    var selectorTextArr = [];

                    // Add Parent element Id and Classes to the list
                    selectorTextArr.push('#' + parentElement.id);
                    for (var c = 0; c < parentElement.classList.length; c++)
                        if (!contains('.' + parentElement.classList[c], selectorTextArr))
                            selectorTextArr.push('.' + parentElement.classList[c]);

                    // Add Children element Ids and Classes to the list
                    var nodes = parentElement.getElementsByTagName("*");
                    for (var i = 0; i < nodes.length; i++) {
                        var id = nodes[i].id;
                        if (!contains('#' + id, selectorTextArr))
                            selectorTextArr.push('#' + id);

                        var classes = nodes[i].classList;
                        for (var c = 0; c < classes.length; c++)
                            if (!contains('.' + classes[c], selectorTextArr))
                                selectorTextArr.push('.' + classes[c]);
                    }

                    // Add missing selectors 
                    selectorTextArr.push("svg");
                    selectorTextArr.push(".gridline path");
                    selectorTextArr.push(".gridline line");

                    // Extract CSS Rules
                    var extractedCSSText = "";
                    for (var i = 0; i < document.styleSheets.length; i++) {
                        var s = document.styleSheets[i];

                        if ((s.href && s.href.indexOf('chart.css') == -1) || !s.href) {
                            continue;
                        }

                        try {
                            if (!s.cssRules) continue;
                        } catch (e) {
                            if (e.name !== 'SecurityError') throw e; // for Firefox
                            continue;
                        }

                        var cssRules = s.cssRules;
                        for (var r = 0; r < cssRules.length; r++) {
                            if (contains(cssRules[r].selectorText, selectorTextArr))
                                extractedCSSText += cssRules[r].cssText;
                        }
                    }


                    return extractedCSSText;

                    function contains(str, arr) {
                        return arr.indexOf(str) === -1 ? false : true;
                    }

                }

                function appendCSS(cssText, element) {
                    $("svg style").remove();
                    var styleElement = document.createElement("style");
                    styleElement.setAttribute("type", "text/css");
                    styleElement.innerHTML = cssText;
                    var refNode = element.hasChildNodes() ? element.children[0] : null;
                    element.insertBefore(styleElement, refNode);
                }
            }

            function svgString2Image(svgString, width, height, format, callback) {
                var format = format ? format : 'png';

                var imgsrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString))); // Convert SVG string to data URL

                var canvas = document.createElement("canvas");
                var context = canvas.getContext("2d");

                canvas.width = width;
                canvas.height = height;

                var image = new Image();
                image.onload = function () {
                    context.clearRect(0, 0, width, height);
                    context.drawImage(image, 0, 0, width, height);

                    canvas.toBlob(function (blob) {
                        var filesize = Math.round(blob.length / 1024) + ' KB';
                        if (callback) callback(blob, filesize);
                    });
                };

                image.src = imgsrc;
            }

            if (settings.initialize === true) {

                var container = d3.select(settings.container)
                    .append("div")
                    .attr("id", settings.controlSettings.innerContainerId)
                    .classed("chart-inner-container", true);

                container.append("canvas")
                    .attr("width", settings.w)
                    .attr("height", settings.h);

                settings.controlSettings.svg = container.append("svg")
                    .attr("id", settings.id)
                    .attr("width", "100%")
                    // .attr("height", settings.h)
                    .attr("preserveAspectRatio", "xMaxYMax meet")
                    .attr("viewBox", "0 0 " + settings.w + " " + settings.h + "");

                settings.controlSettings.svg.append("g")
                    .classed("chart-title", true)
                    .append("text")
                    .attr("x", 0)
                    .attr("y", 0)
                    .classed("title", true)
                    .attr("transform", "translate(" + settings.w / 2 + ",30)")
                    .text(settings.title);

                settings.controlSettings.chart = settings.controlSettings.svg.append("g")
                    .classed("display", true)
                    .attr('transform', 'translate(' + settings.margin.left + ',' + settings.margin.top + ')');
            }
            else {
                settings.controlSettings.chart = d3.select(settings.container + " .display");
            }

            var updatedData = {};
            if(settings.initialize) {
                updatedData = getCopyofData();
            } else {
                updatedData = getUpdatedData();
            }

            var params = setParams({
                data: updatedData,
                initialize: settings.initialize
            });
            plot.call(settings.controlSettings.chart, params);

            if (settings.initialize === true) {
                // Configure button
                var configIcon = settings.controlSettings.svg.append("svg")
                    .classed("configure-button-icon", true)
                    .attr("height", "25px")
                    .attr("width", "25px")
                    .attr("viewBox", "0 0 52 52")
                    .attr("x", "20")
                    .attr("y", "12")
                    .append("g")
                    .on("mouseover", function () {
                        d3.select(this).transition().duration(500)
                            .attrTween("transform", function (d, i, a) {
                                return d3.interpolateString('translate(0,0) rotate(0)',
                                    'translate(0,0) rotate(60, 26, 26)');
                            });
                    })
                    .on("click", function () {
                        d3.select(this).transition().duration(1000)
                            .attrTween("transform", function (d, i, a) {
                                return d3.interpolateString('translate(0,0) rotate(0)',
                                    'translate(0,0) rotate(180, 26, 26)');
                            });
                        var configSection = d3.select(settings.container + " #" + settings.controlSettings.innerContainerId + " .chart-configuration");
                        if (configSection.style("display") == "none") {
                            // set height
                            var svgHeight = $("svg#" + settings.id).height();
                            var titlePosition = ($(".chart-title").height() + 25); // 25~30 is y position in transform translate
                            d3.select(settings.container + " #" + settings.controlSettings.innerContainerId + " .chart-config").style("height", "" + (svgHeight - titlePosition - 10) + "px");
                            configSection.style("top", "" + titlePosition + "px");

                            configSection.transition(settings.controlSettings.t).style("opacity", "1").style("display", "block");
                        } else {
                            configSection.transition(settings.controlSettings.t).style("opacity", "0").style("display", "none");

                            var updatedData = getUpdatedData();
                            console.log(updatedData.plotData);
                            params = setParams({
                                data: updatedData,
                                initialize: false
                            });
                            plot.call(settings.controlSettings.chart, params);
                        }
                    });

                configIcon.append("path")
                    .attr("d", "M50.219,21h-2.797c-0.552-2.375-1.486-4.602-2.739-6.613l1.978-1.978  c0.695-0.695,0.695-1.823,0-2.518l-4.553-4.553c-0.695-0.695-1.823-0.695-2.518,0l-1.978,1.978C35.602,6.064,33.375,5.13,31,4.578  V1.781C31,0.797,30.203,0,29.219,0h-6.439C21.797,0,21,0.797,21,1.781v2.797c-2.375,0.552-4.602,1.486-6.613,2.739L12.41,5.339  c-0.695-0.695-1.823-0.695-2.518,0L5.339,9.892c-0.695,0.695-0.695,1.823,0,2.518l1.978,1.978C6.064,16.398,5.13,18.625,4.578,21  H1.781C0.797,21,0,21.797,0,22.781v6.439C0,30.203,0.797,31,1.781,31h2.797c0.552,2.375,1.486,4.602,2.739,6.613L5.339,39.59  c-0.695,0.696-0.695,1.823,0,2.518l4.553,4.553c0.695,0.695,1.823,0.695,2.518,0l1.978-1.978c2.011,1.252,4.238,2.187,6.613,2.739  v2.797C21,51.203,21.797,52,22.781,52h6.439C30.203,52,31,51.203,31,50.219v-2.797c2.375-0.552,4.602-1.486,6.613-2.739l1.978,1.978  c0.695,0.695,1.823,0.695,2.518,0l4.553-4.553c0.695-0.695,0.695-1.823,0-2.518l-1.978-1.978c1.252-2.01,2.186-4.238,2.739-6.613  h2.797C51.203,31,52,30.203,52,29.219v-6.439C52,21.797,51.203,21,50.219,21z M26,35c-4.971,0-9-4.03-9-9c0-4.971,4.029-9,9-9  s9,4.029,9,9C35,30.97,30.971,35,26,35z")
                    .attr("fill", "#CED2D3");

                configIcon.append("path")
                    .attr("d", "M26,13c-7.18,0-13,5.82-13,13s5.82,13,13,13s13-5.82,13-13S33.18,13,26,13z M26,35  c-4.971,0-9-4.03-9-9c0-4.971,4.029-9,9-9s9,4.029,9,9C35,30.97,30.971,35,26,35z")
                    .attr("fill", "#245D9A");

                configIcon.append("circle")
                    .attr("r", 9)
                    .attr("cx", 26)
                    .attr("cy", 26)
                    .attr("fill", "white");

                var configure = d3.select(settings.container + " #" + settings.controlSettings.innerContainerId)
                    .append("div")
                    .classed("chart-configuration", true)
                    .style("height", settings.h)
                    .style("width", "100%");

                configure.append('div')
                    .style("margin", "10px")
                    .html(getConfigurationHtml(settings.data, settings.w, settings.h));

                $(settings.container + " #" + settings.controlSettings.innerContainerId + " .chart-configuration input:checkbox").change(function () {
                    var ischecked = $(this).is(':checked');
                    var id = $(this).attr("id");
                    var chartConfigSectionSelector = settings.container + " #" + settings.controlSettings.innerContainerId + " .chart-configuration";
                    var isShowAllScenariosChecked = $(chartConfigSectionSelector + " #" + settings.controlSettings.showAllScenariosId).is(':checked');

                    // if parent check changed then change all child checkbox
                    $(chartConfigSectionSelector + " input[id^='" + id + "']").prop("checked", ischecked);
                    // check/ uncheck parent checkbox based on all child checked/unchecked
                    if ($(this).hasClass("child")) {
                        // get parent checkbox id
                        var parentId = id.substring(0, id.lastIndexOf('-'));
                        // get child checkboxes status
                        var checkStatus = $(chartConfigSectionSelector + " input[id^='" + parentId + "'].child").is(':checked');
                        // update parent checkbox based on child checkbox status
                        $(chartConfigSectionSelector + " input[id^='" + parentId + "'].parent").prop("checked", checkStatus);
                    }

                    if (isShowAllScenariosChecked) {
                        // show all checkboxes 
                        $(chartConfigSectionSelector + " .config-section input[type='checkbox']").parent().parent().parent().show(400);
                    } else {
                        // hide unchecked checkboxes
                        $(chartConfigSectionSelector + " .config-section input[type='checkbox'].parent").not(':checked').parent().parent().parent().hide(400);
                    }
                });

                // Export button
                var exportIcon = settings.controlSettings.svg.append("svg")
                    .classed("export-button-icon", true)
                    .attr("height", "25px")
                    .attr("width", "25px")
                    .attr("viewBox", "0 0 20 20")
                    .attr("x", settings.w - 40)
                    .attr("y", "12")
                    .append("g")
                    .on("mouseover", function () {
                        d3.select(this).transition().duration(500)
                            .style("opacity", "0.8");
                    })
                    .on("mouseout", function () {
                        d3.select(this).transition().duration(500)
                            .style("opacity", "1");
                    })
                    .on("click", function () {
                        var svgString = getSVGString(settings.controlSettings.svg.node());
                        svgString2Image(svgString, 2.4 * settings.controlSettings.width, 3.3 * settings.controlSettings.height, 'png', save); // passes Blob and filesize String to the callback

                        function save(dataBlob, filesize) {
                            saveAs(dataBlob, 'D3 vis exported to PNG.png'); // FileSaver.js function
                        }
                    });

                exportIcon.append("path")
                    .attr("d", "M4.25,5.5l2.5-2H2.006C0.898,3.5,0,4.4,0,5.492v7.016c0,1.1,0.897,1.992,2.006,1.992h9.988   c1.108,0,2.006-0.9,2.006-1.992V8.9l-2,1.6v2H2v-7H4.25z")
                    .attr("fill", "#245D9A");

                exportIcon.append("path")
                    .attr("d", "M11,3.477c-3.539,0.035-7.033,3.124-7.033,7.046c1.694-1.65,3.7-3.136,7.033-3.016V9.5l5-4l-5-4   V3.477z")
                    .attr("fill", "#245D9A");
            }

            function contextMenu() {
                var height,
                    width,
                    margin = 0.1, // fraction of width
                    items = [],
                    rescale = false,
                    style = {
                        'rect': {
                            'mouseout': {
                                'fill': '#245d9a',
                                'stroke': 'white',
                                'stroke-width': '0px'
                            },
                            'mouseover': {
                                'fill': '#548bbf'
                            }
                        },
                        'text': {
                            'fill': 'white',
                            'font-size': '11'
                        }
                    },
                    selector = settings.container + " #" + settings.controlSettings.innerContainerId;

                function menu(x, y) {
                    d3.select(selector + ' .context-menu').remove();
                    scaleItems();

                    // Draw the menu
                    var contextMenu = d3.select(selector + ' svg')
                        .append('g')
                        .attr('class', 'context-menu');

                    var menuEntry = contextMenu.selectAll('.tmp')
                        .data(items)
                        .enter()
                        .append('g')
                        .attr('class', 'menu-entry')
                        .style('cursor', 'pointer')
                        .on('mouseover', function () {
                            d3.select(this).select('rect').style("fill", style.rect.mouseover.fill);
                        })
                        .on('mouseout', function () {
                            d3.select(this).select('rect')
                                .style("fill", style.rect.mouseout.fill)
                                .style("stroke", style.rect.mouseout.stroke)
                                .style("stroke-width", style.rect.mouseout["stroke-width"]);
                        })
                        .on('click', function (d, i) {
                            if (settings.onTransformData) {
                                settings.onTransformData(d, i);
                            }
                        });

                    menuEntry.append('rect')
                        .attr('x', x)
                        .attr('y', function (d, i) { return y + (i * height); })
                        .attr('width', width)
                        .attr('height', height)
                        .style("fill", style.rect.mouseout.fill)
                        .style("stroke", style.rect.mouseout.stroke)
                        .style("stroke-width", style.rect.mouseout["stroke-width"]);

                    menuEntry.append('text')
                        .text(function (d) { return d.value; })
                        .attr('x', x)
                        .attr('y', function (d, i) { return y + (i * height); })
                        .attr('dy', height - margin / 2)
                        .attr('dx', margin)
                        .style("fill", style.text.fill)
                        .style("font-size", style.text["font-size"]);

                    // Other interactions
                    settings.controlSettings.svg.on('click', function (d, i) {
                        d3.select(selector + ' .context-menu').remove();
                    });

                }

                menu.items = function (e) {
                    items = e;
                    rescale = true;
                    return menu;
                };

                function setWidthNHeight() {
                    var maxWidth = d3.max(settings.controlSettings.svg.selectAll('.tmp')._groups[0], function (d, i) {
                        return d.getBBox().width;
                    });

                    margin = margin * maxWidth;
                    width = maxWidth + 2 * margin;
                    height = 25;
                }

                // Automatically set width, height, and margin;
                function scaleItems() {
                    if (rescale) {
                        settings.controlSettings.svg.selectAll('.tmp')
                            .data(items).enter()
                            .append('text')
                            .text(function (d) { return d.value; })
                            .style("fill", style.text.fill)
                            .style("font-size", style.text["font-size"])
                            .attr('x', -1000)
                            .attr('y', -1000)
                            .attr('class', 'tmp');

                        setWidthNHeight();

                        // cleanup
                        d3.selectAll('.tmp').remove();
                        rescale = false;
                    }
                }


                return menu;
            }

            // var menu = contextMenu().items('first item', 'second option', 'whatever, man');
            var menu = contextMenu().items(settings.contextMenuItems);

            settings.controlSettings.svg.on('contextmenu', function () {
                d3.event.preventDefault();
                menu(d3.mouse(this)[0], d3.mouse(this)[1]);
            });

            function updateData(data) {
                // settings.data = data;
                console.log(data);
            }

            settings.initialize = false;
            this.data('chartSettings', settings);

            return this;
        }
    };

    $.fn.splineChart = function (options) {
        if (chartMethods[options]) {
            return chartMethods[options].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof options === 'object' || !options) {
            // Default to "init"
            return chartMethods.init.apply(this, arguments);
        } else {
            $.error('Method ' + options + ' does not exist on jQuery.tooltip');
        }
    };

} (jQuery));


// end - plugin code
