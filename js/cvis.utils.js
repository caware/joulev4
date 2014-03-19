/* Javascript formatters */


var zero = d3.format("02d");
var yearMonthFormatter = d3.time.format("%b %Y");
var pwrFormatter = d3.format(".2f");
var engFormatter = d3.format(",f");
var carbonFormatter = d3.format(",f");
var zoomDateFormat = d3.time.format("%a %d %b");
var zoomTimeFormat = d3.time.format("%H:%M");
var overallDateFormat = d3.time.format("%d %b '%y");
var col = d3.scale.category10();

var utils = {

	sum : function (array) {
		return array.reduce(function(a, b) {
			return a + b.y;
		}, 0);
	},

	avg : function (array) {
		return utils.sum(array)/array.length;
	},

	makeCopyReadings : function (data) { // Duplicate a bi-dimensional array
		var res = [];
		for (var i=0;i<data.length; i++){
			res.push ([data[i][0], data[i][1]]);
		}
		return res;
	},

	accumDataReadings : function (accum, next, sign) { // Sums or subtracts correspondent values of accum and next depending on sign

		var offset, mystart;

		if (next === null) return;

		if (next.step != accum.step) {
			console.warn("Attempt to create a virtual meter which combines timeseries with different steps.");
			return;
		}

		if ((next.start < accum.start) || (next.readings.length != accum.readings.length)) {
			console.warn("A virtual meter is being created which combines unmatched timeseries.");
		}

		// There are some other horrible possibilities which we will ignore for now

		offset = (next.start - accum.start) / accum.step;

		if (offset < 0){
			mystart = 0;
		}
		else {
			mystart = offset;
		}

		for (var i=mystart; i<accum.readings.length; i++){
			if ((i - offset) >= next.readings.length) break;
			accum.readings[i] += sign * next.readings[i-offset];
		}
	},

	altDataReadings : function (prim, sec) { // Produces a time series with values preferentially from prim, else from sec
		// if steps are different do nothing...
		if (prim.step != sec.step) return prim;

		var res = new timeSeries ((prim.start <= sec.start) ? prim.start : sec.start,
					   prim.step,
					   []);
		var primEnd = prim.start + res.step * (prim.readings.length - 1);
		var secEnd = sec.start + res.step * (sec.readings.length - 1);
		var length = (((prim.end >=  sec.end) ? prim.end : sec.end) - res.start) / prim.step + 1;
		var t = res.start;
		var primInd;
		var secInd;

		for (var i=0; i<length; i++){ 
			res.readings[i] = 0;
			primInd = (t - prim.start) / res.step;
			if ((primInd >= 0) && (primInd <prim.readings.length)){
				res.readings[i] = prim.readings[primInd];
			}
			if (res.readings[i] == 0){
			     	secInd = (t - sec.start) / res.step;
			     	if ((secInd >= 0) && (secInd < sec.readings.length)){
					res.readings[i] = sec.readings[secInd];

				}
			}
			t += res.step;
		}
		return res;

	},

	isMeter : function (comp){
		return (comp.indexOf("S-m") === 0);
	},

	getUrlArgs : function () {
		var args = {};
		var hashes = window.location.hash.substr(1).split('&');
		for(var i = 0; i < hashes.length; i++) {
			var hash = hashes[i].split('=');
			args[hash[0]] = hash[1];
		}
		return args;
	},

	nulls : function (l) {
	
		if (typeof l != 'number') return;
		
		l = Math.abs(parseInt(l));
		
		var output = new Array(l);
		
		for (var i=0; i<l; i++) output[i] = null;
		
		return output;
	
	},

	mapper : function (treeObj, depth) {

		typeof depth == 'undefined' ? depth = 1 : depth++;
	
		var remappedTree = new Array();

		treeObj.forEach(function (v, k, l) {

		if ((v.depth == depth) || (v.depth == 0)) {
			if (v.hasOwnProperty("children")) {
				var childrenArray = utils.mapper(v.children, depth);
				childrenArray.unshift({"id" : v.id, "name" : v.nodeName + " Total", "description" : v.description, "selected" : v.selected, "type" : "leaf"})
				remappedTree.push({
					"id" : v.id + "n",
					"name" : v.nodeName,
					"description" : v.description,
					"type" : "node",
					"_children" : childrenArray
				});
			} else {
				remappedTree.push({"id" : v.id, "name" : v.nodeName, "description" : v.description, "selected" : v.selected, "type" : "leaf"});
			}
		}
		
		});

		return remappedTree;

	},

	updater : function (treeObj, plotLineDesc, expand) {
		
		if (treeObj.type == "leaf") {
			treeObj.selected = plotLineDesc[treeObj.id].selected;
			treeObj.error = plotLineDesc[treeObj.id].error;
		}
		if (treeObj.hasOwnProperty("children")) {
			if (typeof expand == 'boolean' && !expand) {
				treeObj._children = treeObj.children;
				delete treeObj.children;
				treeObj._children.forEach(function (v) { utils.updater(v, plotLineDesc, false); });
			} else
				treeObj.children.forEach(function (v) { utils.updater(v, plotLineDesc, expand); });
		} else if (treeObj.hasOwnProperty("_children")) {
			if (typeof expand == 'boolean' && expand) {
				treeObj.children = treeObj._children;
				delete treeObj._children;
				treeObj.children.forEach(function (v) { utils.updater(v, plotLineDesc, true); });
			} else
				treeObj._children.forEach(function (v) { utils.updater(v, plotLineDesc, expand); });
		}
		
	}

}