!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.vl=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var globals = require("./globals"),
    util = require("./util"),
    consts = require('./consts');

var vl = util.merge(consts, util);

vl.schema = require('./schema');
vl.Encoding = require('./Encoding');
vl.axis = require('./axis');
vl.compile = require('./compile');
vl.data = require('./data');
vl.legends = require('./legends');
vl.marks = require('./marks')
vl.scale = require('./scale');

module.exports = vl;

},{"./Encoding":2,"./axis":3,"./compile":4,"./consts":5,"./data":6,"./globals":7,"./legends":8,"./marks":9,"./scale":10,"./schema":11,"./util":13}],2:[function(require,module,exports){
"use strict";

var global = require('./globals'),
  consts = require('./consts'),
  util = require('./util'),
  schema = require('./schema');

var Encoding = module.exports = (function() {

  function Encoding(marktype, enc, config) {
    this._marktype = marktype;
    this._enc = enc; // {encType1:field1, ...}
    this._cfg = util.merge(Object.create(consts.DEFAULTS), config);
  }

  var proto = Encoding.prototype;

  proto.marktype = function() {
    return this._marktype;
  };

  proto.is = function(m) {
    return this._marktype === m;
  };

  proto.has = function(x) {
    return this._enc[x] !== undefined;
  };

  proto.enc = function(x){
    return this._enc[x];
  };

  // get "field" property for vega
  proto.field = function(x, nodata, nofn) {
    if (!this.has(x)) return null;

    var f = (nodata ? "" : "data.");

    if (this._enc[x].aggr === "count") {
      return f + "count";
    } else if (!nofn && this._enc[x].bin) {
      return f + "bin_" + this._enc[x].name;
    } else if (!nofn && this._enc[x].aggr) {
      return f + this._enc[x].aggr + "_" + this._enc[x].name;
    } else if (!nofn && this._enc[x].fn){
      return f + this._enc[x].fn + "_" + this._enc[x].name;
    } else {
      return f + this._enc[x].name;
    }
  };

  proto.fieldName = function(x){
    return this._enc[x].name;
  }

  proto.fieldTitle = function(x){
    if (this._enc[x].aggr) {
      return this._enc[x].aggr + "(" + this._enc[x].name + ")";
    } else {
      return this._enc[x].name;
    }
  }

  proto.scale = function(x){
    return this._enc[x].scale || {};
  }

  proto.axis = function(x){
    return this._enc[x].axis || {};
  }

  proto.aggr = function(x){
    return this._enc[x].aggr;
  }

  proto.bin = function(x){
    return this._enc[x].bin;
  }

  proto.legend = function(x){
    return this._enc[x].legend;
  }

  proto.fn = function(x){
    return this._enc[x].fn;
  }

  proto.any = function(f){
    return util.any(this._enc, f);
  }

  proto.all = function(f){
    return util.all(this._enc, f);
  }

  proto.length = function(){
    return util.keys(this._enc).length;
  }

  proto.reduce = function(f, init){
    var r = init, i=0;
    for (k in this._enc){
      r = f(r, this._enc[k], k, this._enc);
    }
    return r;
  }

  proto.forEach = function(f) {
    var i=0, k;
    for (k in this._enc) {
      f(k, this._enc[k], i++);
    }
  };

  proto.type = function(x) {
    return this.has(x) ? this._enc[x].type : null;
  };

  proto.isType = function(x, t) {
    var xt = this.type(x);
    if (xt == null) return false;
    return (xt & t) > 0;
  };

  proto.config = function(name) {
    return this._cfg[name];
  };

  proto.toSpec = function(excludeConfig){
    var enc = util.duplicate(this._enc),
      spec;

    // convert type's bitcode to type name
    for(var e in enc){
      enc[e].type = consts.dataTypeNames[enc[e].type];
    }

    spec = {
      marktype: this._marktype,
      enc: enc
    }

    if(!excludeConfig){
      spec.cfg = util.duplicate(this._cfg)
    }

    return spec;
  };

  proto.toShorthand = function(){
    var enc = this._enc;
    return this._marktype + "." + util.keys(enc).map(function(e){
      var v = enc[e];
        return e + "-" +
          (v.aggr ? v.aggr+"_" : "") +
          (v.fn ? v.fn+"_" : "") +
          (v.bin ? "bin_" : "") +
          (v.name || "") + "-" +
          consts.dataTypeNames[v.type];
      }
    ).join(".");
  }

  Encoding.parseShorthand = function(shorthand, cfg){
    var enc = shorthand.split("."),
      marktype = enc.shift();

    enc = enc.reduce(function(m, e){
      var split = e.split("-"),
        enctype = split[0],
        o = {name: split[1], type: consts.dataTypes[split[2]]};

      // check aggregate type
      for(var i in schema.aggr.enum){
        var a = schema.aggr.enum[i];
        if(o.name.indexOf(a+"_") == 0){
          o.name = o.name.substr(a.length+1);
          if (a=="count" && o.name.length === 0) o.name = "*";
          o.aggr = a;
          break;
        }
      }
      // check time fn
      for(var i in schema.timefns){
        var f = schema.timefns[i];
        if(o.name && o.name.indexOf(f+"_") == 0){
          o.name = o.name.substr(o.length+1);
          o.fn = f;
          break;
        }
      }

      // check bin
      if(o.name && o.name.indexOf("bin_") == 0){
        o.name = o.name.substr(4);
        o.bin = true;
      }

      m[enctype] = o;
      return m;
    }, {});

    return new Encoding(marktype, enc, cfg);
  }

  Encoding.fromSpec = function(spec, extraCfg) {
    var enc = util.duplicate(spec.enc);

    //convert type from string to bitcode (e.g, O=1)
    for(var e in enc){
      enc[e].type = consts.dataTypes[enc[e].type];
    }

    return new Encoding(spec.marktype, enc, util.merge(spec.cfg, extraCfg || {}));
  }

  return Encoding;

})();

},{"./consts":5,"./globals":7,"./schema":11,"./util":13}],3:[function(require,module,exports){
var globals = require('./globals'),
  util = require('./util');

var axis = module.exports = {};

axis.names = function (props) {
  return util.keys(util.keys(props).reduce(function(a, x) {
    var s = props[x].scale;
    if (s===X || s===Y) a[props[x].scale] = 1;
    return a;
  }, {}));
}

axis.defs = function(names, encoding, opt) {
  return names.reduce(function(a, name) {
    a.push(axis_def(name, encoding, opt));
    return a;
  }, []);
}

function axis_def(name, encoding, opt){
  var type = name, axis;
  var isCol = name==COL, isRow = name==ROW;
  if(isCol) type = "x";
  if(isRow) type = "y";

  var axis = {
    type: type,
    scale: name,
    ticks: 3 //TODO(kanitw): better determine # of ticks
  };

  if (encoding.axis(name).grid) {
    axis.grid = true;
    axis.layer = "back";
  }

  if (encoding.axis(name).title) {
    //show title by default

    axis = axis_title(axis, name, encoding, opt);
  }

  if(isRow || isCol){
    axis.properties = {
      ticks: { opacity: {value: 0} },
      majorTicks: { opacity: {value: 0} },
      axis: { opacity: {value: 0} }
    };
  }
  if(isCol){
    axis.offset = [opt.xAxisMargin || 0, encoding.config("yAxisMargin")];
    axis.orient = "top";
  }

  if (name=="x" && (encoding.isType(name, O) || encoding.bin(name))) {
    axis.properties = {
      labels: {
        angle: {value: 270},
        align: {value: "right"},
        baseline: {value: "middle"}
      }
    }
  }

  return axis;
}

function axis_title(axis, name, encoding, opt){
  axis.title = encoding.fieldTitle(name);
  if(name==Y){
    axis.titleOffset = 60;
    // TODO: set appropriate titleOffset
    // maybe based on some string length from stats
  }
  return axis;
}

},{"./globals":7,"./util":13}],4:[function(require,module,exports){
var globals = require('./globals'),
  util = require('./util'),
  axis = require('./axis'),
  legends = require('./legends'),
  marks = require('./marks'),
  scale = require('./scale');

var compile = module.exports = function(encoding, stats) {
  var size = setSize(encoding, stats),
    cellWidth = size.cellWidth,
    cellHeight = size.cellHeight;

  var hasAgg = encoding.any(function(v, k){
    return v.aggr !== undefined;
  });

  var spec = template(encoding, size, stats),
    group = spec.marks[0],
    mark = marks[encoding.marktype()],
    mdef = markdef(mark, encoding, {
      hasAggregate: hasAgg
    });

  var hasRow = encoding.has(ROW), hasCol = encoding.has(COL);

  var preaggregatedData = encoding.config("useVegaServer");

  group.marks.push(mdef);
  // TODO: return value not used
  binning(spec.data[0], encoding, {preaggregatedData: preaggregatedData});

  var lineType = marks[encoding.marktype()].line;

  if(!preaggregatedData){
    encoding.forEach(function(encType, field){
      if(field.type === T && field.fn){
        timeTransform(spec.data[0], encoding, encType, field);
      }
    });
  }

  // handle subfacets
  var aggResult = aggregates(spec.data[0], encoding, {preaggregatedData: preaggregatedData}),
    details = aggResult.details,
    hasDetails = details && details.length > 0,
    stack = hasDetails && stacking(spec, encoding, mdef, aggResult.facets);

  if (hasDetails && (stack || lineType)) {
    //subfacet to group stack / line together in one group
    subfacet(group, mdef, details, stack, encoding);
  }

  // auto-sort line/area values
  //TODO(kanitw): have some config to turn off auto-sort for line (for line chart that encodes temporal information)
  if (lineType) {
    var f = (encoding.isType(X, Q | T) && encoding.isType(Y, O)) ? Y : X;
    if (!mdef.from) mdef.from = {};
    mdef.from.transform = [{type: "sort", by: encoding.field(f)}];
  }

  // Small Multiples
  if (hasRow || hasCol) {
    spec = facet(group, encoding, cellHeight, cellWidth, spec, mdef, stack, stats);
  } else {
    group.scales = scale.defs(scale.names(mdef.properties.update), encoding,
      {stack: stack, stats: stats});
    group.axes = axis.defs(axis.names(mdef.properties.update), encoding);
    group.legends = legends.defs(encoding);
  }

  return spec;
}

function getCardinality(encoding, encType, stats){
  var field = encoding.fieldName(encType);
  if (encoding.bin(encType)) {
    var bins = util.getbins(stats[field]);
    return (bins.stop - bins.start) / bins.step;
  }
  return stats[field].cardinality;
}

function setSize(encoding, stats) {
  var hasRow = encoding.has(ROW),
      hasCol = encoding.has(COL),
      hasX = encoding.has(X),
      hasY = encoding.has(Y);

  // HACK to set chart size
  // NOTE: this fails for plots driven by derived values (e.g., aggregates)
  // One solution is to update Vega to support auto-sizing
  // In the meantime, auto-padding (mostly) does the trick
  //
  var colCardinality = hasCol ? getCardinality(encoding, COL, stats) : 1,
    rowCardinality = hasRow ? getCardinality(encoding, ROW, stats) : 1;

  var cellWidth = hasX ?
      +encoding.config("cellWidth") || encoding.config("width") * 1.0 / colCardinality :
      encoding.marktype() === "text" ?
        +encoding.config("textCellWidth") :
        +encoding.config("bandSize"),
    cellHeight = hasY ?
      +encoding.config("cellHeight") || encoding.config("height") * 1.0 / rowCardinality :
      +encoding.config("bandSize"),
    cellPadding = encoding.config("cellPadding"),
    bandPadding = encoding.config("bandPadding"),
    width = encoding.config("_minWidth"),
    height = encoding.config("_minHeight");

  if (hasX && (encoding.isType(X, O) || encoding.bin(X))) { //ordinal field will override parent
    // bands within cell use rangePoints()
    var xCardinality = getCardinality(encoding, X, stats);
    cellWidth = (xCardinality + bandPadding) * +encoding.config("bandSize");
  }
  // Cell bands use rangeBands(). There are n-1 padding.  Outerpadding = 0 for cells
  width = cellWidth * ((1 + cellPadding) * (colCardinality-1) + 1);

  if (hasY && (encoding.isType(Y, O) || encoding.bin(Y))) {
    // bands within cell use rangePoint()
    var yCardinality = getCardinality(encoding, Y, stats);
    cellHeight = (yCardinality + bandPadding) * +encoding.config("bandSize");
  }
  // Cell bands use rangeBands(). There are n-1 padding.  Outerpadding = 0 for cells
  height = cellHeight * ((1 + cellPadding) * (rowCardinality-1) + 1);

  return {
    cellWidth: cellWidth,
    cellHeight: cellHeight,
    width: width,
    height:height
  };
}

function facet(group, encoding, cellHeight, cellWidth, spec, mdef, stack, stats) {
    var enter = group.properties.enter;
    var facetKeys = [], cellAxes = [];

    var hasRow = encoding.has(ROW), hasCol = encoding.has(COL);

    var xAxisMargin = encoding.has(Y) ? encoding.config("xAxisMargin") : undefined;

    enter.fill = {value: encoding.config("cellBackgroundColor")};

    //move "from" to cell level and add facet transform
    group.from = {data: group.marks[0].from.data};

    if (group.marks[0].from.transform) {
      delete group.marks[0].from.data; //need to keep transform for subfacetting case
    } else {
      delete group.marks[0].from;
    }
    if (hasRow) {
      if (!encoding.isType(ROW, O)) {
        util.error("Row encoding should be ordinal.");
      }
      enter.y = {scale: ROW, field: "keys." + facetKeys.length};
      enter.height = {"value": cellHeight}; // HACK

      facetKeys.push(encoding.field(ROW));

      var from;
      if (hasCol) {
        from = util.duplicate(group.from);
        from.transform = from.transform || [];
        from.transform.unshift({type: "facet", keys: [encoding.field(COL)]});
      }

      var axesGrp = groupdef("x-axes", {
          axes: encoding.has(X) ?  axis.defs(["x"], encoding) : undefined,
          x: hasCol ? {scale: COL, field: "keys.0", offset: xAxisMargin} : {value: xAxisMargin},
          width: hasCol && {"value": cellWidth}, //HACK?
          from: from
        });

      spec.marks.push(axesGrp);
      (spec.axes = spec.axes || [])
      spec.axes.push.apply(spec.axes, axis.defs(["row"], encoding));
    } else { // doesn't have row
      if(encoding.has(X)){
        //keep x axis in the cell
        cellAxes.push.apply(cellAxes, axis.defs(["x"], encoding));
      }
    }

    if (hasCol) {
      if (!encoding.isType(COL, O)) {
        util.error("Col encoding should be ordinal.");
      }
      enter.x = {scale: COL, field: "keys." + facetKeys.length};
      enter.width = {"value": cellWidth}; // HACK

      facetKeys.push(encoding.field(COL));

      var from;
      if (hasRow) {
        from = util.duplicate(group.from);
        from.transform = from.transform || [];
        from.transform.unshift({type: "facet", keys: [encoding.field(ROW)]});
      }

      var axesGrp = groupdef("y-axes", {
        axes: encoding.has(Y) ? axis.defs(["y"], encoding) : undefined,
        y: hasRow && {scale: ROW, field: "keys.0"},
        x: hasRow && {value: xAxisMargin},
        height: hasRow && {"value": cellHeight}, //HACK?
        from: from
      });

      spec.marks.push(axesGrp);
      (spec.axes = spec.axes || [])
      spec.axes.push.apply(spec.axes, axis.defs(["col"], encoding, {
        xAxisMargin: xAxisMargin
      }));
    } else { // doesn't have col
      if(encoding.has(Y)){
        cellAxes.push.apply(cellAxes, axis.defs(["y"], encoding));
      }
    }

    if(hasRow){
      if(enter.x) enter.x.offset= xAxisMargin;
      else enter.x = {value: xAxisMargin};
    }
    if(hasCol){
      //TODO fill here..
    }

    // assuming equal cellWidth here
    // TODO: support heterogenous cellWidth (maybe by using multiple scales?)
    spec.scales = scale.defs(
      scale.names(enter).concat(scale.names(mdef.properties.update)),
      encoding,
      {cellWidth: cellWidth, cellHeight: cellHeight, stack: stack, facet:true, stats: stats}
    ); // row/col scales + cell scales

    if (cellAxes.length > 0) {
      group.axes = cellAxes;
    }

    // add facet transform
    var trans = (group.from.transform || (group.from.transform = []));
    trans.unshift({type: "facet", keys: facetKeys});

  return spec;
  }

function subfacet(group, mdef, details, stack, encoding) {
  var m = group.marks,
    g = groupdef("subfacet", {marks: m});

  group.marks = [g];
  g.from = mdef.from;
  delete mdef.from;

  //TODO test LOD -- we should support stack / line without color (LOD) field
  var trans = (g.from.transform || (g.from.transform = []));
  trans.unshift({type: "facet", keys: details});

  if (stack && encoding.has(COLOR)) {
    trans.unshift({type: "sort", by: encoding.field(COLOR)});
  }
}

function getTimeFn(fn){
  switch(fn){
    case "second": return "getUTCSeconds";
    case "minute": return "getUTCMinutes";
    case "hour": return "getUTCHours";
    case "day": return "getUTCDay";
    case "date": return "getUTCDate";
    case "month": return "getUTCMonth";
    case "year": return "getUTCFullYear";
  }
  console.error("no function specified for date");
}

function timeTransform(spec, encoding, encType, field){
  var func = getTimeFn(field.fn);

  spec.transform = spec.transform || [];
  spec.transform.push({
    type: "formula",
    field: encoding.field(encType),
    expr: "new Date(d.data."+field.name+")."+func+"()"
  });
  return spec;
}

function binning(spec, encoding, opt) {
  opt = opt || {};
  var bins = {};
  encoding.forEach(function(vv, d) {
    if (d.bin) bins[d.name] = d.name;
  });
  bins = util.keys(bins);

  if (bins.length === 0 || opt.preaggregatedData) return false;

  if (!spec.transform) spec.transform = [];
  bins.forEach(function(d) {
    spec.transform.push({
      type: "bin",
      field: "data." + d,
      output: "data.bin_" + d,
      maxbins: MAX_BINS
    });
  });
  return bins;
}

function aggregates(spec, encoding, opt) {
  opt = opt || {};
  var dims = {}, meas = {}, detail = {}, facets={};
  encoding.forEach(function(encType, field) {
    if (field.aggr) {
      if(field.aggr==="count"){
        meas["count"] = {op:"count", field:"*"};
      }else{
        meas[field.aggr+"|"+field.name] = {
          op:field.aggr,
          field:"data."+field.name
        };
      }
    } else {
      dims[field.name] = encoding.field(encType);
      if (encType==ROW || encType == COL){
        facets[field.name] = dims[field.name];
      }else if (encType !== X && encType !== Y) {
        detail[field.name] = dims[field.name];
      }
    }
  });
  dims = util.vals(dims);
  meas = util.vals(meas);

  if (meas.length > 0 && !opt.preaggregatedData) {
    if (!spec.transform) spec.transform = [];
    spec.transform.push({
      type: "aggregate",
      groupby: dims,
      fields: meas
    });

    if (encoding.marktype() === TEXT) {
      meas.forEach( function (m) {
        var fieldName = m.field.substr(5), //remove "data."
          field = "data." + (m.op ? m.op + "_" : "") + fieldName;
        spec.transform.push({
          type: "formula",
          field: field,
          expr: "d3.format('.2f')(d."+field+")"
        });
      });
    }
  }
  return {
    details: util.vals(detail),
    dims: dims,
    facets: util.vals(facets),
    aggregated: meas.length > 0
  }
}

function stacking(spec, encoding, mdef, facets) {
  if (!marks[encoding.marktype()].stack) return false;
  if (!encoding.has(COLOR)) return false;

  var dim = X, val = Y, idx = 1;
  if (encoding.isType(X,Q|T) && !encoding.isType(Y,Q|T) && encoding.has(Y)) {
    dim = Y;
    val = X;
    idx = 0;
  }

  // add transform to compute sums for scale
  var stacked = {
    name: STACKED,
    source: TABLE,
    transform: [{
      type: "aggregate",
      groupby: [encoding.field(dim)].concat(facets), // dim and other facets
      fields: [{op: "sum", field: encoding.field(val)}] // TODO check if field with aggr is correct?
    }]
  };

  if(facets && facets.length > 0){
    stacked.transform.push({ //calculate max for each facet
      type: "aggregate",
      groupby: facets,
      fields: [{op: "max", field: "data.sum_" + encoding.field(val, true)}]
    });
  }

  spec.data.push(stacked);

  // add stack transform to mark
  mdef.from.transform = [{
    type: "stack",
    point: encoding.field(dim),
    height: encoding.field(val),
    output: {y1: val, y0: val+"2"}
  }];

  // TODO: This is super hack-ish -- consolidate into modular mark properties?
  mdef.properties.update[val] = mdef.properties.enter[val] = {scale: val, field: val};
  mdef.properties.update[val+"2"] = mdef.properties.enter[val+"2"] = {scale: val, field: val+"2"};

  return val; //return stack encoding
}


function markdef(mark, encoding, opt) {
  var p = mark.prop(encoding, opt)
  return {
    type: mark.type,
    from: {data: TABLE},
    properties: {enter: p, update: p}
  };
}

function groupdef(name, opt) {
  opt = opt || {};
  return {
    _name: name || undefined,
    type: "group",
    from: opt.from,
    properties: {
      enter: {
        x: opt.x || undefined,
        y: opt.y || undefined,
        width: opt.width || {group: "width"},
        height: opt.height || {group: "height"}
      }
    },
    scales: opt.scales || undefined,
    axes: opt.axes || undefined,
    marks: opt.marks || []
  };
}

function template(encoding, size, stats) { //hack use stats

  var data = {name:TABLE, format: {type: encoding.config("dataFormatType")}},
    dataUrl = vl.data.getUrl(encoding, stats);
  if(dataUrl) data.url = dataUrl;

  var preaggregatedData = encoding.config("useVegaServer");

  encoding.forEach(function(encType, field){
    if(field.type == T){
      data.format.parse = data.format.parse || {};
      data.format.parse[field.name] = "date";
    }else if(field.type == Q){
      data.format.parse = data.format.parse || {};
      if (field.aggr === "count") {
        var name = "count";
      } else if(preaggregatedData && field.bin){
        var name = "bin_" + field.name;
      } else if(preaggregatedData && field.aggr){
        var name = field.aggr + "_" + field.name;
      } else{
        var name = field.name;
      }
      data.format.parse[name] = "number";
    }
  });

  return {
    width: size.width,
    height: size.height,
    padding: "auto",
    data: [data],
    marks: [groupdef("cell", {
      width: size.cellWidth ? {value: size.cellWidth}: undefined,
      height: size.cellHeight ? {value: size.cellHeight} : undefined
    })]
  };
}

},{"./axis":3,"./globals":7,"./legends":8,"./marks":9,"./scale":10,"./util":13}],5:[function(require,module,exports){
var globals = require('./globals');

var consts = module.exports = {};

consts.encodingTypes = [X, Y, ROW, COL, SIZE, SHAPE, COLOR, ALPHA, TEXT];

consts.dataTypes = {"O": O, "Q": Q, "T": T};

consts.dataTypeNames = ["O","Q","T"].reduce(function(r,x) {
  r[consts.dataTypes[x]] = x; return r;
},{});

consts.DEFAULTS = {
  // template
  width: undefined,
  height: undefined,
  viewport: undefined,
  _minWidth: 20,
  _minHeight: 20,

  // data source
  dataUrl: undefined, //for easier export
  useVegaServer: false,
  vegaServerUrl: "http://localhost:3001",
  vegaServerTable: undefined,
  dataFormatType: "json",

  //small multiples
  cellHeight: 200, // will be overwritten by bandWidth
  cellWidth: 200, // will be overwritten by bandWidth
  cellPadding: 0.1,
  cellBackgroundColor: "#fdfdfd",
  xAxisMargin: 80,
  yAxisMargin: 0,
  textCellWidth: 90,

  // marks
  bandSize: 21,
  bandPadding: 1,
  pointSize: 50,
  pointShape: "circle",
  strokeWidth: 2,
  color: "steelblue",
  textColor: "black",
  textAlign: "left",
  textBaseline: "middle",
  textMargin: 4,
  font: "Helvetica Neue",
  fontSize: "12",
  fontWeight: "normal",
  fontStyle: "normal",
  opacity: 1,
  _thickOpacity: 0.5,
  _thinOpacity: 0.2,

  // scales
  // TODO remove _xZero, ...
  _xZero: true,
  _xReverse: false,
  _yZero: true,
  _yReverse: false,
  timeScaleNice: "day"
};
},{"./globals":7}],6:[function(require,module,exports){
// TODO rename getDataUrl to vl.data.getUrl() ?

var util = require('./util');

module.exports.getUrl = function getDataUrl(encoding, stats) {
  if (!encoding.config("useVegaServer")) {
    // don't use vega server
    return encoding.config("dataUrl");
  }

  if (encoding.length() === 0) {
    // no fields
    return;
  }

  var fields = []
  encoding.forEach(function(encType, field){
    var obj = {
      name: encoding.field(encType, true),
      field: field.name
    }
    if (field.aggr) {
      obj.aggr = field.aggr
    }
    if (field.bin) {
      obj.binSize = util.getbins(stats[field.name]).step;
    }
    fields.push(obj);
  });

  var query = {
    table: encoding.config("vegaServerTable"),
    fields: fields
  }

  return encoding.config("vegaServerUrl") + "/query/?q=" + JSON.stringify(query)
};

module.exports.getStats = function(data){ // hack
  var stats = {};
  var fields = util.keys(data[0]);

  fields.forEach(function(k) {
    var stat = util.minmax(data, k);
    stat.cardinality = util.uniq(data, k);

    var i=0, datum = data[i][k];
    while(datum === "" || datum === null || datum === undefined){
      datum = data[++i][k];
    }

    //TODO(kanitw): better type inference here
    stat.type = (typeof datum === "number") ? "Q" :
      isNaN(Date.parse(datum)) ? "O" : "T";
    stat.count = data.length;
    stats[k] = stat;
  });
  return stats;
};

},{"./util":13}],7:[function(require,module,exports){
(function (global){
// declare global constant
var g = global || window;

g.TABLE = "table";
g.STACKED = "stacked";
g.INDEX = "index";

g.X = "x";
g.Y = "y";
g.ROW = "row";
g.COL = "col";
g.SIZE = "size";
g.SHAPE = "shape";
g.COLOR = "color";
g.ALPHA = "alpha";
g.TEXT = "text";

g.O = 1;
g.Q = 2;
g.T = 4;

//TODO refactor this to be config?
g.MAX_BINS = 20;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],8:[function(require,module,exports){
var global = require('./globals');

var legends = module.exports = {};

legends.defs = function(encoding) {
  var legends = [];

  // TODO: support alpha

  if (encoding.has(COLOR) && encoding.legend(COLOR)) {
    legends.push({
      fill: COLOR,
      title: encoding.fieldTitle(COLOR),
      orient: "right"
    });
  }

  if (encoding.has(SIZE) && encoding.legend(SIZE)) {
    legends.push({
      size: SIZE,
      title: encoding.fieldTitle(SIZE),
      orient: legends.length === 1 ? "left" : "right"
    });
  }

  if (encoding.has(SHAPE) && encoding.legend(SHAPE)) {
    if (legends.length === 2) {
      // TODO: fix this
      console.error("Vegalite currently only supports two legends");
      return legends;
    }
    legends.push({
      shape: SHAPE,
      title: encoding.fieldTitle(SHAPE),
      orient: legends.length === 1 ? "left" : "right"
    });
  }

  return legends;
}
},{"./globals":7}],9:[function(require,module,exports){
var globals = require("./globals"),
  util = require("./util");

var marks = module.exports = {};

marks.bar = {
  type: "rect",
  stack: true,
  prop: bar_props,
  requiredEncoding: ["x", "y"],
  supportedEncoding: {row:1, col:1, x:1, y:1, size:1, color:1, alpha:1}
};

marks.line = {
  type: "line",
  line: true,
  prop: line_props,
  requiredEncoding: ["x", "y"],
  supportedEncoding: {row:1, col:1, x:1, y:1, color:1, alpha:1}
};

marks.area = {
  type: "area",
  stack: true,
  line: true,
  requiredEncoding: ["x", "y"],
  prop: area_props,
  supportedEncoding: marks.line.supportedEncoding
};

marks.circle = {
  type: "symbol",
  prop: filled_point_props("circle"),
  supportedEncoding: {row:1, col:1, x:1, y:1, size:1, color:1, alpha:1}
};

marks.square = {
  type: "symbol",
  prop: filled_point_props("square"),
  supportedEncoding: marks.circle.supportedEncoding
};

marks.point = {
  type: "symbol",
  prop: point_props,
  supportedEncoding: {row:1, col:1, x:1, y:1, size:1, color:1, alpha:1, shape:1}
};

marks.text = {
  type: "text",
  prop: text_props,
  requiredEncoding: ["text"],
  supportedEncoding: {row:1, col:1, size:1, color:1, alpha:1, text:1}
};

function bar_props(e) {
  var p = {};

  // x
  if (e.isType(X,Q|T) && !e.bin(X)) {
    p.x = {scale: X, field: e.field(X)};
    if (e.has(Y) && (!e.isType(Y,Q|T) || e.bin(Y))) {
      p.x2 = {scale: X, value: 0};
    }
  } else if (e.has(X)) {
    p.xc = {scale: X, field: e.field(X)};
  } else {
    p.xc = {value: 0};
  }

  // y
  if (e.isType(Y,Q|T) && !e.bin(Y)) {
    p.y = {scale: Y, field: e.field(Y)};
    p.y2 = {scale: Y, value: 0};
  } else if (e.has(Y)) {
    p.yc = {scale: Y, field: e.field(Y)};
  } else {
    p.yc = {group: "height"};
  }

  // width
  if (!e.isType(X,Q|T)) {
    if (e.has(SIZE)) {
      p.width = {scale: SIZE, field: e.field(SIZE)};
    } else {
      // p.width = {scale: X, band: true, offset: -1};
      p.width = {value: +e.config("bandSize"), offset: -1};
    }
  } else if (!e.isType(Y,O) && !e.bin(Y)) {
    p.width = {value: +e.config("bandSize"), offset: -1};
  }

  // height
  if (!e.isType(Y,Q|T)) {
    if (e.has(SIZE)) {
      p.height = {scale: SIZE, field: e.field(SIZE)};
    } else {
      // p.height = {scale: Y, band: true, offset: -1};
      p.height = {value: +e.config("bandSize"), offset: -1};
    }
  } else if (!e.isType(X,O) && !e.bin(X)) {
    p.height = {value: +e.config("bandSize"), offset: -1};
  }

  // fill
  if (e.has(COLOR)) {
    p.fill = {scale: COLOR, field: e.field(COLOR)};
  } else if (!e.has(COLOR)) {
    p.fill = {value: e.config("color")};
  }

  // alpha
  if (e.has(ALPHA)) {
    p.opacity = {scale: ALPHA, field: e.field(ALPHA)};
  }

  return p;
}

function point_props(e, opt) {
  var p = {};
  opt = opt || {};

  // x
  if (e.has(X)) {
    p.x = {scale: X, field: e.field(X)};
  } else if (!e.has(X)) {
    p.x = {value: e.config("bandSize")/2};
  }

  // y
  if (e.has(Y)) {
    p.y = {scale: Y, field: e.field(Y)};
  } else if (!e.has(Y)) {
    p.y = {value: e.config("bandSize")/2};
  }

  // size
  if (e.has(SIZE)) {
    p.size = {scale: SIZE, field: e.field(SIZE)};
  } else if (!e.has(SIZE)) {
    p.size = {value: e.config("pointSize")};
  }

  // shape
  if (e.has(SHAPE)) {
    p.shape = {scale: SHAPE, field: e.field(SHAPE)};
  } else if (!e.has(SHAPE)) {
    p.shape = {value: e.config("pointShape")};
  }

  // stroke
  if (e.has(COLOR)) {
    p.stroke = {scale: COLOR, field: e.field(COLOR)};
  } else if (!e.has(COLOR)) {
    p.stroke = {value: e.config("color")};
  }

  // alpha
  if (e.has(ALPHA)) {
    p.opacity = {scale: ALPHA, field: e.field(ALPHA)};
  }else{
    p.opacity = {
      value: e.config("opacity") || e.config(opt.hasAggregate ? "_thickOpacity" : "_thinOpacity")
    };
  }

  p.strokeWidth = {value: e.config("strokeWidth")};

  return p;
}

function line_props(e) {
  var p = {};

  // x
  if (e.has(X)) {
    p.x = {scale: X, field: e.field(X)};
  } else if (!e.has(X)) {
    p.x = {value: 0};
  }

  // y
  if (e.has(Y)) {
    p.y = {scale: Y, field: e.field(Y)};
  } else if (!e.has(Y)) {
    p.y = {group: "height"};
  }

  // stroke
  if (e.has(COLOR)) {
    p.stroke = {scale: COLOR, field: e.field(COLOR)};
  } else if (!e.has(COLOR)) {
    p.stroke = {value: e.config("color")};
  }

  // alpha
  if (e.has(ALPHA)) {
    p.opacity = {scale: ALPHA, field: e.field(ALPHA)};
  }

  p.strokeWidth = {value: e.config("strokeWidth")};

  return p;
}

function area_props(e) {
  var p = {};

  // x
  if (e.isType(X,Q|T)) {
    p.x = {scale: X, field: e.field(X)};
    if (!e.isType(Y,Q|T) && e.has(Y)) {
      p.x2 = {scale: X, value: 0};
      p.orient = {value: "horizontal"};
    }
  } else if (e.has(X)) {
    p.x = {scale: X, field: e.field(X)};
  } else {
    p.x = {value: 0};
  }

  // y
  if (e.isType(Y,Q|T)) {
    p.y = {scale: Y, field: e.field(Y)};
    p.y2 = {scale: Y, value: 0};
  } else if (e.has(Y)) {
    p.y = {scale: Y, field: e.field(Y)};
  } else {
    p.y = {group: "height"};
  }

  // stroke
  if (e.has(COLOR)) {
    p.fill = {scale: COLOR, field: e.field(COLOR)};
  } else if (!e.has(COLOR)) {
    p.fill = {value: e.config("color")};
  }

  // alpha
  if (e.has(ALPHA)) {
    p.opacity = {scale: ALPHA, field: e.field(ALPHA)};
  }

  return p;
}

function filled_point_props(shape) {
  return function(e, opt) {
    var p = {};
    opt = opt || {};

    // x
    if (e.has(X)) {
      p.x = {scale: X, field: e.field(X)};
    } else if (!e.has(X)) {
      p.x = {value: e.config("bandSize")/2};
    }

    // y
    if (e.has(Y)) {
      p.y = {scale: Y, field: e.field(Y)};
    } else if (!e.has(Y)) {
      p.y = {value: e.config("bandSize")/2};
    }

    // size
    if (e.has(SIZE)) {
      p.size = {scale: SIZE, field: e.field(SIZE)};
    } else if (!e.has(X)) {
      p.size = {value: e.config("pointSize")};
    }

    // shape
    p.shape = {value: shape};

    // fill
    if (e.has(COLOR)) {
      p.fill = {scale: COLOR, field: e.field(COLOR)};
    } else if (!e.has(COLOR)) {
      p.fill = {value: e.config("color")};
    }

    // alpha
    if (e.has(ALPHA)) {
      p.opacity = {scale: ALPHA, field: e.field(ALPHA)};
    }else {
      p.opacity = {
        value: e.config("opacity") || e.config(opt.hasAggregate ? "_thickOpacity" : "_thinOpacity")
      };
    }

    return p;
  };
}

function text_props(e) {
  var p = {};

  // x
  if (e.has(X)) {
    p.x = {scale: X, field: e.field(X)};
  } else if (!e.has(X)) {
    p.x = {value: e.config("bandSize")/2};
  }

  // y
  if (e.has(Y)) {
    p.y = {scale: Y, field: e.field(Y)};
  } else if (!e.has(Y)) {
    p.y = {value: e.config("bandSize")/2};
  }

  // size
  if (e.has(SIZE)) {
    p.fontSize = {scale: SIZE, field: e.field(SIZE)};
  } else if (!e.has(X)) {
    p.fontSize = {value: e.config("fontSize")};
  }

  // fill
  if (e.has(COLOR)) {
    p.fill = {scale: COLOR, field: e.field(COLOR)};
  } else if (!e.has(COLOR)) {
    p.fill = {value: e.config("textColor")};
  }

  // alpha
  if (e.has(ALPHA)) {
    p.opacity = {scale: ALPHA, field: e.field(ALPHA)};
  }

  // text
  if (e.has(TEXT)) {
    p.text = {field: e.field(TEXT)};
  } else {
    p.text = {value: "Abc"};
  }

  p.font = {value: e.config("font")};
  p.fontWeight = {value: e.config("fontWeight")};
  p.fontStyle = {value: e.config("fontStyle")};
  p.baseline = {value: e.config("textBaseline")};

  // align
  if (e.has(X)) {
    if (e.isType(X,O)) {
      p.align = {value: "left"};
      p.dx = {value: e.config("textMargin")};
    } else {
      p.align = {value: "center"}
    }
  } else if (e.has(Y)) {
    p.align = {value: "left"};
    p.dx = {value: e.config("textMargin")};
  } else {
    p.align = {value: e.config("textAlign")};
  }

  return p;
}
},{"./globals":7,"./util":13}],10:[function(require,module,exports){
var globals = require("./globals"),
  util = require("./util");

var scale = module.exports = {};

scale.names = function (props) {
  return util.keys(util.keys(props).reduce(function(a, x) {
    if (props[x] && props[x].scale) a[props[x].scale] = 1;
    return a;
  }, {}));
}

scale.defs = function (names, encoding, opt) {
  opt = opt || {};

  return names.reduce(function(a, name) {
    var s = {
      name: name,
      type: scale_type(name, encoding),
      domain: scale_domain(name, encoding, opt)
    };
    if (s.type === "ordinal" && !encoding.bin(name)) {
      s.sort = true;
    }

    scale_range(s, encoding, opt);

    return (a.push(s), a);
  }, []);
}

function scale_type(name, encoding) {
  switch (encoding.type(name)) {
    case O: return "ordinal";
    case T:
      if (encoding.fn(name)) {
        return "linear";
      }
      return "time";
    case Q:
      if (encoding.bin(name)) {
        return "ordinal";
      }
      return encoding.scale(name).type || "linear";
  }
}

function scale_domain(name, encoding, opt) {
  if (encoding.type(name) === T){
    switch(encoding.fn(name)){
      case "second":
      case "minute": return [0, 59];
      case "hour": return [0, 23];
      case "day": return [0, 6];
      case "date": return [1, 31];
      case "month": return [0, 11];
    }
  }

  if (encoding.bin(name)) {
    // TODO: add includeEmptyConfig here
    if (opt.stats) {
      var bins = util.getbins(opt.stats[encoding.fieldName(name)]);
      var domain = util.range(bins.start, bins.stop, bins.step);
      return name===Y ? domain.reverse() : domain;
    }
  }

  return name == opt.stack ?
    {
      data: STACKED,
      field: "data." + (opt.facet ? "max_" :"") + "sum_" + encoding.field(name, true)
    }:
    {data: TABLE, field: encoding.field(name)};
}

function scale_range(s, encoding, opt) {
  var spec = encoding.scale(s.name);
  switch (s.name) {
    case X:
      if (encoding.isType(s.name, O) || encoding.bin(s.name)) {
        s.bandWidth = +encoding.config("bandSize");
      } else {
        s.range = opt.cellWidth ? [0, opt.cellWidth] : "width";
        //TODO zero and reverse should become generic, and we just read default from either the schema or the schema generator
        s.zero = spec.zero || encoding.config("_xZero");
        s.reverse = spec.reverse || encoding.config("_xReverse");
      }
      s.round = true;
      if (encoding.isType(s.name, T)){
        s.nice = encoding.aggr(s.name) || encoding.config("timeScaleNice");
      }else{
        s.nice = true;
      }
      break;
    case Y:
      if (encoding.isType(s.name, O) || encoding.bin(s.name)) {
        s.bandWidth = +encoding.config("bandSize");
      } else {
        s.range = opt.cellHeight ? [opt.cellHeight, 0] : "height";
        //TODO zero and reverse should become generic, and we just read default from either the schema or the schema generator
        s.zero = spec.zero || encoding.config("_yZero");
        s.reverse = spec.reverse || encoding.config("_yReverse");
      }

      s.round = true;

      if (encoding.isType(s.name, T)){
        s.nice = encoding.aggr(s.name);
      }else{
        s.nice = true;
      }
      break;
    case ROW:
      s.bandWidth = opt.cellHeight || encoding.config("cellHeight");
      s.round = true;
      s.nice = true;
      break;
    case COL:
      s.bandWidth = opt.cellWidth || encoding.config("cellWidth");
      s.round = true;
      s.nice = true;
      break;
    case SIZE:
      if (encoding.is("bar")) {
        s.range = [3, +encoding.config("bandSize")];
      } else if (encoding.is(TEXT)) {
        s.range = [8, 40];
      } else {
        s.range = [10, 1000];
      }
      s.round = true;
      s.zero = false;
      break;
    case SHAPE:
      s.range = "shapes";
      break;
    case COLOR:
      if (encoding.isType(s.name, O)) {
        s.range = "category10";
      } else {
        s.range = ["#ddf", "steelblue"];
        s.zero = false;
      }
      break;
    case ALPHA:
      s.range = [0.2, 1.0];
      break;
    default:
      throw new Error("Unknown encoding name: "+s.name);
  }

  switch(s.name){
    case ROW:
    case COL:
      s.padding = encoding.config("cellPadding");
      s.outerPadding = 0;
      break;
    case X:
    case Y:
      if (encoding.isType(s.name, O) || encoding.bin(s.name) ) { //&& !s.bandWidth
        s.points = true;
        s.padding = encoding.config("bandPadding");
      }
  }
}
},{"./globals":7,"./util":13}],11:[function(require,module,exports){
// Defining Vegalite Encoding's schema
var schema = module.exports = {},
  util = require('./util');

schema.util = require('./schemautil');

schema.marktype = {
  type: "string",
  enum: ["point", "bar", "line", "area", "circle", "square", "text"]
};

schema.aggr = {
  type: "string",
  enum: ["avg", "sum", "min", "max", "count"],
  supportedEnums: {
    Q: ["avg", "sum", "min", "max", "count"],
    O: ["count"],
    T: ["avg", "min", "max", "count"],
    "": ["count"],
  },
  supportedTypes: {"Q": true, "O": true, "T": true, "": true}
};

schema.timefns = ["month", "year", "day", "date", "hour", "minute", "second"];

schema.fn = {
  type: "string",
  enum: schema.timefns,
  supportedTypes: {"T": true}
}

//TODO(kanitw): add other type of function here

schema.scale_type = {
  type: "string",
  enum: ["linear", "log","pow", "sqrt", "quantile"],
  default: "linear",
  supportedTypes: {"Q": true}
};

schema.field = {
  type: "object",
  required: ["name", "type"],
  properties: {
    name: {
      type: "string"
    }
  }
};

var clone = util.duplicate;
var merge = schema.util.merge;

var typicalField = merge(clone(schema.field), {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["O", "Q", "T"]
    },
    bin: {
      type: "boolean",
      supportedTypes: {"Q": true, "O": true}
    },
    aggr: schema.aggr,
    fn: schema.fn,
    scale: {
      type: "object",
      properties: {
        type: schema.scale_type,
        reverse: { type: "boolean", default: false },
        zero: {
          type: "boolean",
          description: "Include zero",
          default: false,
          supportedTypes: {"Q": true}
        },
        nice: {
          type: "string",
          enum: ["second", "minute", "hour", "day", "week", "month", "year"],
          supportedTypes: {"T": true}
        }
      }
    }
  }
});

var onlyOrdinalField = merge(clone(schema.field), {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["O"]
    },
    bin: {
      type: "boolean",
      supportedTypes: {"O": true}
    },
    aggr: {
      type: "string",
      enum: ["count"],
      supportedTypes: {"O": true}
    }
  }
});

var axisMixin = {
  type: "object",
  properties: {
    axis: {
      type: "object",
      properties: {
        grid: { type: "boolean", default: false },
        title: { type: "boolean", default: true }
      }
    }
  }
}

var legendMixin = {
  type: "object",
  properties: {
    legend: { type: "boolean", default: true }
  }
}

var textMixin = {
  type: "object",
  properties: {
    text: {
      type: "object",
      properties: {
        weight: {
          type: "string",
          enum: ["normal", "bold"],
          default: "normal",
          supportedTypes: {"T": true}
        },
        size: {
          type: "integer",
          default: 10,
          minimum: 0,
          supportedTypes: {"T": true}
        },
        font: {
          type: "string",
          default: "Halvetica Neue",
          supportedTypes: {"T": true}
        }
      }
    }
  }
}

var x = merge(clone(typicalField), axisMixin);
var y = clone(x);

var row = clone(onlyOrdinalField);
var col = clone(row);

var size = merge(clone(typicalField), legendMixin);
var color = merge(clone(typicalField), legendMixin);
var alpha = clone(typicalField);
var shape = merge(clone(onlyOrdinalField), legendMixin);

var text = merge(clone(typicalField), textMixin);

var cfg = {
  type: "object",
  properties: {
    dataFormatType: {
      type: "string",
      enum: ["json", "csv"]
    },
    useVegaServer: {
      type: "boolean",
      default: false
    },
    dataUrl: {
      type: "string"
    },
    vegaServerTable: {
      type: "string"
    },
    vegaServerUrl: {
      type: "string",
      default: "http://localhost:3001"
    }
  }
}

schema.spec = {
  $schema: "http://json-schema.org/draft-04/schema#",
  type: "object",
  required: ["marktype", "enc", "cfg"],
  properties: {
    marktype: schema.marktype,
    enc: {
      type: "object",
      properties: {
        x: x,
        y: y,
        row: row,
        col: col,
        size: size,
        color: color,
        alpha: alpha,
        shape: shape,
        text: text
      }
    },
    cfg: cfg
  }
};

},{"./schemautil":12,"./util":13}],12:[function(require,module,exports){
var util = module.exports = {};

var isEmpty = function(obj) {
  return Object.keys(obj).length === 0
}

// instantiate a schema
util.instantiate = function(schema, required) {
  if (schema.type === 'object') {
    schema.required = schema.required ? schema.required : [];
    var instance = {};
    for (var name in schema.properties) {
      var child = schema.properties[name];
      instance[name] = util.instantiate(child, schema.required.indexOf(name) != -1);
    };
    return instance;
  } else if ('default' in schema) {
    return schema.default;
  } else if (schema.enum && required) {
    return schema.enum[0];
  }
  return undefined;
};

// remove all defaults from an instance
util.difference = function(defaults, instance) {
  var changes = {};
  for (var prop in instance) {
    if (!defaults || defaults[prop] !== instance[prop]) {
      if (typeof instance[prop] == "object") {
        var c = util.difference(defaults[prop], instance[prop]);
        if (!isEmpty(c))
          changes[prop] = c;
      } else {
        changes[prop] = instance[prop];
      }
    }
  }
  return changes;
};

// recursively merges instance into defaults
util.merge = function (defaults, instance) {
  if (typeof instance!=='object' || instance===null) {
    return defaults;
  }

  for (var p in instance) {
    if (!instance.hasOwnProperty(p))
      continue;
    if (instance[p]===undefined )
      continue;
    if (typeof instance[p] !== 'object' || instance[p] === null) {
      defaults[p] = instance[p];
    } else if (typeof defaults[p] !== 'object' || defaults[p] === null) {
      defaults[p] = util.merge(instance[p].constructor === Array ? [] : {}, instance[p]);
    } else {
      util.merge(defaults[p], instance[p]);
    }
  }
  return defaults;
}

},{}],13:[function(require,module,exports){
var util = module.exports = {};

util.keys = function (obj) {
  var k = [], x;
  for (x in obj) k.push(x);
  return k;
}

util.vals = function (obj) {
  var v = [], x;
  for (x in obj) v.push(obj[x]);
  return v;
}

util.range = function (start, stop, step) {
  if (arguments.length < 3) {
    step = 1;
    if (arguments.length < 2) {
      stop = start;
      start = 0;
    }
  }
  if ((stop - start) / step == Infinity) throw new Error("infinite range");
  var range = [], i = -1, j;
  if (step < 0) while ((j = start + step * ++i) > stop) range.push(j);
  else while ((j = start + step * ++i) < stop) range.push(j);
  return range;
}

util.find = function (list, pattern) {
  var l = list.filter(function(x) {
    return x[pattern.name] === pattern.value;
  });
  return l.length && l[0] || null;
}

util.uniq = function (data, field) {
  var map = {}, count = 0, i, k;
  for (i=0; i<data.length; ++i) {
    k = data[i][field];
    if (!map[k]) {
      map[k] = 1;
      count += 1;
    }
  }
  return count;
}

util.minmax = function (data, field) {
  var stats = {min: +Infinity, max: -Infinity};
  for (i=0; i<data.length; ++i) {
    var v = data[i][field];
    if (v > stats.max) stats.max = v;
    if (v < stats.min) stats.min = v;
  }
  return stats;
}

util.duplicate = function (obj) {
  return JSON.parse(JSON.stringify(obj));
};

util.any = function(arr, f){
  var i=0, k;
  for (k in arr) {
    if(f(arr[k], k, i++)) return true;
  }
  return false;
}

util.all = function(arr, f){
  var i=0, k;
  for (k in arr) {
    if(!f(arr[k], k, i++)) return false;
  }
  return true;
}

util.merge = function(dest, src){
  return util.keys(src).reduce(function(c, k){
    c[k] = src[k];
    return c;
  }, dest);
};

util.getbins = function (stats) {
  return vg.bins({
    min: stats.min,
    max: stats.max,
    maxbins: MAX_BINS
  });
}


util.error = function(msg){
  console.error("[VL Error]", msg);
}


},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvdmwiLCJzcmMvRW5jb2RpbmcuanMiLCJzcmMvYXhpcy5qcyIsInNyYy9jb21waWxlLmpzIiwic3JjL2NvbnN0cy5qcyIsInNyYy9kYXRhLmpzIiwic3JjL2dsb2JhbHMuanMiLCJzcmMvbGVnZW5kcy5qcyIsInNyYy9tYXJrcy5qcyIsInNyYy9zY2FsZS5qcyIsInNyYy9zY2hlbWEuanMiLCJzcmMvc2NoZW1hdXRpbC5qcyIsInNyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGdsb2JhbHMgPSByZXF1aXJlKFwiLi9nbG9iYWxzXCIpLFxuICAgIHV0aWwgPSByZXF1aXJlKFwiLi91dGlsXCIpLFxuICAgIGNvbnN0cyA9IHJlcXVpcmUoJy4vY29uc3RzJyk7XG5cbnZhciB2bCA9IHV0aWwubWVyZ2UoY29uc3RzLCB1dGlsKTtcblxudmwuc2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKTtcbnZsLkVuY29kaW5nID0gcmVxdWlyZSgnLi9FbmNvZGluZycpO1xudmwuYXhpcyA9IHJlcXVpcmUoJy4vYXhpcycpO1xudmwuY29tcGlsZSA9IHJlcXVpcmUoJy4vY29tcGlsZScpO1xudmwuZGF0YSA9IHJlcXVpcmUoJy4vZGF0YScpO1xudmwubGVnZW5kcyA9IHJlcXVpcmUoJy4vbGVnZW5kcycpO1xudmwubWFya3MgPSByZXF1aXJlKCcuL21hcmtzJylcbnZsLnNjYWxlID0gcmVxdWlyZSgnLi9zY2FsZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHZsO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBnbG9iYWwgPSByZXF1aXJlKCcuL2dsb2JhbHMnKSxcbiAgY29uc3RzID0gcmVxdWlyZSgnLi9jb25zdHMnKSxcbiAgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpLFxuICBzY2hlbWEgPSByZXF1aXJlKCcuL3NjaGVtYScpO1xuXG52YXIgRW5jb2RpbmcgPSBtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpIHtcblxuICBmdW5jdGlvbiBFbmNvZGluZyhtYXJrdHlwZSwgZW5jLCBjb25maWcpIHtcbiAgICB0aGlzLl9tYXJrdHlwZSA9IG1hcmt0eXBlO1xuICAgIHRoaXMuX2VuYyA9IGVuYzsgLy8ge2VuY1R5cGUxOmZpZWxkMSwgLi4ufVxuICAgIHRoaXMuX2NmZyA9IHV0aWwubWVyZ2UoT2JqZWN0LmNyZWF0ZShjb25zdHMuREVGQVVMVFMpLCBjb25maWcpO1xuICB9XG5cbiAgdmFyIHByb3RvID0gRW5jb2RpbmcucHJvdG90eXBlO1xuXG4gIHByb3RvLm1hcmt0eXBlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcmt0eXBlO1xuICB9O1xuXG4gIHByb3RvLmlzID0gZnVuY3Rpb24obSkge1xuICAgIHJldHVybiB0aGlzLl9tYXJrdHlwZSA9PT0gbTtcbiAgfTtcblxuICBwcm90by5oYXMgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuY1t4XSAhPT0gdW5kZWZpbmVkO1xuICB9O1xuXG4gIHByb3RvLmVuYyA9IGZ1bmN0aW9uKHgpe1xuICAgIHJldHVybiB0aGlzLl9lbmNbeF07XG4gIH07XG5cbiAgLy8gZ2V0IFwiZmllbGRcIiBwcm9wZXJ0eSBmb3IgdmVnYVxuICBwcm90by5maWVsZCA9IGZ1bmN0aW9uKHgsIG5vZGF0YSwgbm9mbikge1xuICAgIGlmICghdGhpcy5oYXMoeCkpIHJldHVybiBudWxsO1xuXG4gICAgdmFyIGYgPSAobm9kYXRhID8gXCJcIiA6IFwiZGF0YS5cIik7XG5cbiAgICBpZiAodGhpcy5fZW5jW3hdLmFnZ3IgPT09IFwiY291bnRcIikge1xuICAgICAgcmV0dXJuIGYgKyBcImNvdW50XCI7XG4gICAgfSBlbHNlIGlmICghbm9mbiAmJiB0aGlzLl9lbmNbeF0uYmluKSB7XG4gICAgICByZXR1cm4gZiArIFwiYmluX1wiICsgdGhpcy5fZW5jW3hdLm5hbWU7XG4gICAgfSBlbHNlIGlmICghbm9mbiAmJiB0aGlzLl9lbmNbeF0uYWdncikge1xuICAgICAgcmV0dXJuIGYgKyB0aGlzLl9lbmNbeF0uYWdnciArIFwiX1wiICsgdGhpcy5fZW5jW3hdLm5hbWU7XG4gICAgfSBlbHNlIGlmICghbm9mbiAmJiB0aGlzLl9lbmNbeF0uZm4pe1xuICAgICAgcmV0dXJuIGYgKyB0aGlzLl9lbmNbeF0uZm4gKyBcIl9cIiArIHRoaXMuX2VuY1t4XS5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZiArIHRoaXMuX2VuY1t4XS5uYW1lO1xuICAgIH1cbiAgfTtcblxuICBwcm90by5maWVsZE5hbWUgPSBmdW5jdGlvbih4KXtcbiAgICByZXR1cm4gdGhpcy5fZW5jW3hdLm5hbWU7XG4gIH1cblxuICBwcm90by5maWVsZFRpdGxlID0gZnVuY3Rpb24oeCl7XG4gICAgaWYgKHRoaXMuX2VuY1t4XS5hZ2dyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZW5jW3hdLmFnZ3IgKyBcIihcIiArIHRoaXMuX2VuY1t4XS5uYW1lICsgXCIpXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLl9lbmNbeF0ubmFtZTtcbiAgICB9XG4gIH1cblxuICBwcm90by5zY2FsZSA9IGZ1bmN0aW9uKHgpe1xuICAgIHJldHVybiB0aGlzLl9lbmNbeF0uc2NhbGUgfHwge307XG4gIH1cblxuICBwcm90by5heGlzID0gZnVuY3Rpb24oeCl7XG4gICAgcmV0dXJuIHRoaXMuX2VuY1t4XS5heGlzIHx8IHt9O1xuICB9XG5cbiAgcHJvdG8uYWdnciA9IGZ1bmN0aW9uKHgpe1xuICAgIHJldHVybiB0aGlzLl9lbmNbeF0uYWdncjtcbiAgfVxuXG4gIHByb3RvLmJpbiA9IGZ1bmN0aW9uKHgpe1xuICAgIHJldHVybiB0aGlzLl9lbmNbeF0uYmluO1xuICB9XG5cbiAgcHJvdG8ubGVnZW5kID0gZnVuY3Rpb24oeCl7XG4gICAgcmV0dXJuIHRoaXMuX2VuY1t4XS5sZWdlbmQ7XG4gIH1cblxuICBwcm90by5mbiA9IGZ1bmN0aW9uKHgpe1xuICAgIHJldHVybiB0aGlzLl9lbmNbeF0uZm47XG4gIH1cblxuICBwcm90by5hbnkgPSBmdW5jdGlvbihmKXtcbiAgICByZXR1cm4gdXRpbC5hbnkodGhpcy5fZW5jLCBmKTtcbiAgfVxuXG4gIHByb3RvLmFsbCA9IGZ1bmN0aW9uKGYpe1xuICAgIHJldHVybiB1dGlsLmFsbCh0aGlzLl9lbmMsIGYpO1xuICB9XG5cbiAgcHJvdG8ubGVuZ3RoID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdXRpbC5rZXlzKHRoaXMuX2VuYykubGVuZ3RoO1xuICB9XG5cbiAgcHJvdG8ucmVkdWNlID0gZnVuY3Rpb24oZiwgaW5pdCl7XG4gICAgdmFyIHIgPSBpbml0LCBpPTA7XG4gICAgZm9yIChrIGluIHRoaXMuX2VuYyl7XG4gICAgICByID0gZihyLCB0aGlzLl9lbmNba10sIGssIHRoaXMuX2VuYyk7XG4gICAgfVxuICAgIHJldHVybiByO1xuICB9XG5cbiAgcHJvdG8uZm9yRWFjaCA9IGZ1bmN0aW9uKGYpIHtcbiAgICB2YXIgaT0wLCBrO1xuICAgIGZvciAoayBpbiB0aGlzLl9lbmMpIHtcbiAgICAgIGYoaywgdGhpcy5fZW5jW2tdLCBpKyspO1xuICAgIH1cbiAgfTtcblxuICBwcm90by50eXBlID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB0aGlzLmhhcyh4KSA/IHRoaXMuX2VuY1t4XS50eXBlIDogbnVsbDtcbiAgfTtcblxuICBwcm90by5pc1R5cGUgPSBmdW5jdGlvbih4LCB0KSB7XG4gICAgdmFyIHh0ID0gdGhpcy50eXBlKHgpO1xuICAgIGlmICh4dCA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuICh4dCAmIHQpID4gMDtcbiAgfTtcblxuICBwcm90by5jb25maWcgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NmZ1tuYW1lXTtcbiAgfTtcblxuICBwcm90by50b1NwZWMgPSBmdW5jdGlvbihleGNsdWRlQ29uZmlnKXtcbiAgICB2YXIgZW5jID0gdXRpbC5kdXBsaWNhdGUodGhpcy5fZW5jKSxcbiAgICAgIHNwZWM7XG5cbiAgICAvLyBjb252ZXJ0IHR5cGUncyBiaXRjb2RlIHRvIHR5cGUgbmFtZVxuICAgIGZvcih2YXIgZSBpbiBlbmMpe1xuICAgICAgZW5jW2VdLnR5cGUgPSBjb25zdHMuZGF0YVR5cGVOYW1lc1tlbmNbZV0udHlwZV07XG4gICAgfVxuXG4gICAgc3BlYyA9IHtcbiAgICAgIG1hcmt0eXBlOiB0aGlzLl9tYXJrdHlwZSxcbiAgICAgIGVuYzogZW5jXG4gICAgfVxuXG4gICAgaWYoIWV4Y2x1ZGVDb25maWcpe1xuICAgICAgc3BlYy5jZmcgPSB1dGlsLmR1cGxpY2F0ZSh0aGlzLl9jZmcpXG4gICAgfVxuXG4gICAgcmV0dXJuIHNwZWM7XG4gIH07XG5cbiAgcHJvdG8udG9TaG9ydGhhbmQgPSBmdW5jdGlvbigpe1xuICAgIHZhciBlbmMgPSB0aGlzLl9lbmM7XG4gICAgcmV0dXJuIHRoaXMuX21hcmt0eXBlICsgXCIuXCIgKyB1dGlsLmtleXMoZW5jKS5tYXAoZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgdiA9IGVuY1tlXTtcbiAgICAgICAgcmV0dXJuIGUgKyBcIi1cIiArXG4gICAgICAgICAgKHYuYWdnciA/IHYuYWdncitcIl9cIiA6IFwiXCIpICtcbiAgICAgICAgICAodi5mbiA/IHYuZm4rXCJfXCIgOiBcIlwiKSArXG4gICAgICAgICAgKHYuYmluID8gXCJiaW5fXCIgOiBcIlwiKSArXG4gICAgICAgICAgKHYubmFtZSB8fCBcIlwiKSArIFwiLVwiICtcbiAgICAgICAgICBjb25zdHMuZGF0YVR5cGVOYW1lc1t2LnR5cGVdO1xuICAgICAgfVxuICAgICkuam9pbihcIi5cIik7XG4gIH1cblxuICBFbmNvZGluZy5wYXJzZVNob3J0aGFuZCA9IGZ1bmN0aW9uKHNob3J0aGFuZCwgY2ZnKXtcbiAgICB2YXIgZW5jID0gc2hvcnRoYW5kLnNwbGl0KFwiLlwiKSxcbiAgICAgIG1hcmt0eXBlID0gZW5jLnNoaWZ0KCk7XG5cbiAgICBlbmMgPSBlbmMucmVkdWNlKGZ1bmN0aW9uKG0sIGUpe1xuICAgICAgdmFyIHNwbGl0ID0gZS5zcGxpdChcIi1cIiksXG4gICAgICAgIGVuY3R5cGUgPSBzcGxpdFswXSxcbiAgICAgICAgbyA9IHtuYW1lOiBzcGxpdFsxXSwgdHlwZTogY29uc3RzLmRhdGFUeXBlc1tzcGxpdFsyXV19O1xuXG4gICAgICAvLyBjaGVjayBhZ2dyZWdhdGUgdHlwZVxuICAgICAgZm9yKHZhciBpIGluIHNjaGVtYS5hZ2dyLmVudW0pe1xuICAgICAgICB2YXIgYSA9IHNjaGVtYS5hZ2dyLmVudW1baV07XG4gICAgICAgIGlmKG8ubmFtZS5pbmRleE9mKGErXCJfXCIpID09IDApe1xuICAgICAgICAgIG8ubmFtZSA9IG8ubmFtZS5zdWJzdHIoYS5sZW5ndGgrMSk7XG4gICAgICAgICAgaWYgKGE9PVwiY291bnRcIiAmJiBvLm5hbWUubGVuZ3RoID09PSAwKSBvLm5hbWUgPSBcIipcIjtcbiAgICAgICAgICBvLmFnZ3IgPSBhO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjaGVjayB0aW1lIGZuXG4gICAgICBmb3IodmFyIGkgaW4gc2NoZW1hLnRpbWVmbnMpe1xuICAgICAgICB2YXIgZiA9IHNjaGVtYS50aW1lZm5zW2ldO1xuICAgICAgICBpZihvLm5hbWUgJiYgby5uYW1lLmluZGV4T2YoZitcIl9cIikgPT0gMCl7XG4gICAgICAgICAgby5uYW1lID0gby5uYW1lLnN1YnN0cihvLmxlbmd0aCsxKTtcbiAgICAgICAgICBvLmZuID0gZjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBjaGVjayBiaW5cbiAgICAgIGlmKG8ubmFtZSAmJiBvLm5hbWUuaW5kZXhPZihcImJpbl9cIikgPT0gMCl7XG4gICAgICAgIG8ubmFtZSA9IG8ubmFtZS5zdWJzdHIoNCk7XG4gICAgICAgIG8uYmluID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgbVtlbmN0eXBlXSA9IG87XG4gICAgICByZXR1cm4gbTtcbiAgICB9LCB7fSk7XG5cbiAgICByZXR1cm4gbmV3IEVuY29kaW5nKG1hcmt0eXBlLCBlbmMsIGNmZyk7XG4gIH1cblxuICBFbmNvZGluZy5mcm9tU3BlYyA9IGZ1bmN0aW9uKHNwZWMsIGV4dHJhQ2ZnKSB7XG4gICAgdmFyIGVuYyA9IHV0aWwuZHVwbGljYXRlKHNwZWMuZW5jKTtcblxuICAgIC8vY29udmVydCB0eXBlIGZyb20gc3RyaW5nIHRvIGJpdGNvZGUgKGUuZywgTz0xKVxuICAgIGZvcih2YXIgZSBpbiBlbmMpe1xuICAgICAgZW5jW2VdLnR5cGUgPSBjb25zdHMuZGF0YVR5cGVzW2VuY1tlXS50eXBlXTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IEVuY29kaW5nKHNwZWMubWFya3R5cGUsIGVuYywgdXRpbC5tZXJnZShzcGVjLmNmZywgZXh0cmFDZmcgfHwge30pKTtcbiAgfVxuXG4gIHJldHVybiBFbmNvZGluZztcblxufSkoKTtcbiIsInZhciBnbG9iYWxzID0gcmVxdWlyZSgnLi9nbG9iYWxzJyksXG4gIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIGF4aXMgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5heGlzLm5hbWVzID0gZnVuY3Rpb24gKHByb3BzKSB7XG4gIHJldHVybiB1dGlsLmtleXModXRpbC5rZXlzKHByb3BzKS5yZWR1Y2UoZnVuY3Rpb24oYSwgeCkge1xuICAgIHZhciBzID0gcHJvcHNbeF0uc2NhbGU7XG4gICAgaWYgKHM9PT1YIHx8IHM9PT1ZKSBhW3Byb3BzW3hdLnNjYWxlXSA9IDE7XG4gICAgcmV0dXJuIGE7XG4gIH0sIHt9KSk7XG59XG5cbmF4aXMuZGVmcyA9IGZ1bmN0aW9uKG5hbWVzLCBlbmNvZGluZywgb3B0KSB7XG4gIHJldHVybiBuYW1lcy5yZWR1Y2UoZnVuY3Rpb24oYSwgbmFtZSkge1xuICAgIGEucHVzaChheGlzX2RlZihuYW1lLCBlbmNvZGluZywgb3B0KSk7XG4gICAgcmV0dXJuIGE7XG4gIH0sIFtdKTtcbn1cblxuZnVuY3Rpb24gYXhpc19kZWYobmFtZSwgZW5jb2RpbmcsIG9wdCl7XG4gIHZhciB0eXBlID0gbmFtZSwgYXhpcztcbiAgdmFyIGlzQ29sID0gbmFtZT09Q09MLCBpc1JvdyA9IG5hbWU9PVJPVztcbiAgaWYoaXNDb2wpIHR5cGUgPSBcInhcIjtcbiAgaWYoaXNSb3cpIHR5cGUgPSBcInlcIjtcblxuICB2YXIgYXhpcyA9IHtcbiAgICB0eXBlOiB0eXBlLFxuICAgIHNjYWxlOiBuYW1lLFxuICAgIHRpY2tzOiAzIC8vVE9ETyhrYW5pdHcpOiBiZXR0ZXIgZGV0ZXJtaW5lICMgb2YgdGlja3NcbiAgfTtcblxuICBpZiAoZW5jb2RpbmcuYXhpcyhuYW1lKS5ncmlkKSB7XG4gICAgYXhpcy5ncmlkID0gdHJ1ZTtcbiAgICBheGlzLmxheWVyID0gXCJiYWNrXCI7XG4gIH1cblxuICBpZiAoZW5jb2RpbmcuYXhpcyhuYW1lKS50aXRsZSkge1xuICAgIC8vc2hvdyB0aXRsZSBieSBkZWZhdWx0XG5cbiAgICBheGlzID0gYXhpc190aXRsZShheGlzLCBuYW1lLCBlbmNvZGluZywgb3B0KTtcbiAgfVxuXG4gIGlmKGlzUm93IHx8IGlzQ29sKXtcbiAgICBheGlzLnByb3BlcnRpZXMgPSB7XG4gICAgICB0aWNrczogeyBvcGFjaXR5OiB7dmFsdWU6IDB9IH0sXG4gICAgICBtYWpvclRpY2tzOiB7IG9wYWNpdHk6IHt2YWx1ZTogMH0gfSxcbiAgICAgIGF4aXM6IHsgb3BhY2l0eToge3ZhbHVlOiAwfSB9XG4gICAgfTtcbiAgfVxuICBpZihpc0NvbCl7XG4gICAgYXhpcy5vZmZzZXQgPSBbb3B0LnhBeGlzTWFyZ2luIHx8IDAsIGVuY29kaW5nLmNvbmZpZyhcInlBeGlzTWFyZ2luXCIpXTtcbiAgICBheGlzLm9yaWVudCA9IFwidG9wXCI7XG4gIH1cblxuICBpZiAobmFtZT09XCJ4XCIgJiYgKGVuY29kaW5nLmlzVHlwZShuYW1lLCBPKSB8fCBlbmNvZGluZy5iaW4obmFtZSkpKSB7XG4gICAgYXhpcy5wcm9wZXJ0aWVzID0ge1xuICAgICAgbGFiZWxzOiB7XG4gICAgICAgIGFuZ2xlOiB7dmFsdWU6IDI3MH0sXG4gICAgICAgIGFsaWduOiB7dmFsdWU6IFwicmlnaHRcIn0sXG4gICAgICAgIGJhc2VsaW5lOiB7dmFsdWU6IFwibWlkZGxlXCJ9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGF4aXM7XG59XG5cbmZ1bmN0aW9uIGF4aXNfdGl0bGUoYXhpcywgbmFtZSwgZW5jb2RpbmcsIG9wdCl7XG4gIGF4aXMudGl0bGUgPSBlbmNvZGluZy5maWVsZFRpdGxlKG5hbWUpO1xuICBpZihuYW1lPT1ZKXtcbiAgICBheGlzLnRpdGxlT2Zmc2V0ID0gNjA7XG4gICAgLy8gVE9ETzogc2V0IGFwcHJvcHJpYXRlIHRpdGxlT2Zmc2V0XG4gICAgLy8gbWF5YmUgYmFzZWQgb24gc29tZSBzdHJpbmcgbGVuZ3RoIGZyb20gc3RhdHNcbiAgfVxuICByZXR1cm4gYXhpcztcbn1cbiIsInZhciBnbG9iYWxzID0gcmVxdWlyZSgnLi9nbG9iYWxzJyksXG4gIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKSxcbiAgYXhpcyA9IHJlcXVpcmUoJy4vYXhpcycpLFxuICBsZWdlbmRzID0gcmVxdWlyZSgnLi9sZWdlbmRzJyksXG4gIG1hcmtzID0gcmVxdWlyZSgnLi9tYXJrcycpLFxuICBzY2FsZSA9IHJlcXVpcmUoJy4vc2NhbGUnKTtcblxudmFyIGNvbXBpbGUgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVuY29kaW5nLCBzdGF0cykge1xuICB2YXIgc2l6ZSA9IHNldFNpemUoZW5jb2RpbmcsIHN0YXRzKSxcbiAgICBjZWxsV2lkdGggPSBzaXplLmNlbGxXaWR0aCxcbiAgICBjZWxsSGVpZ2h0ID0gc2l6ZS5jZWxsSGVpZ2h0O1xuXG4gIHZhciBoYXNBZ2cgPSBlbmNvZGluZy5hbnkoZnVuY3Rpb24odiwgayl7XG4gICAgcmV0dXJuIHYuYWdnciAhPT0gdW5kZWZpbmVkO1xuICB9KTtcblxuICB2YXIgc3BlYyA9IHRlbXBsYXRlKGVuY29kaW5nLCBzaXplLCBzdGF0cyksXG4gICAgZ3JvdXAgPSBzcGVjLm1hcmtzWzBdLFxuICAgIG1hcmsgPSBtYXJrc1tlbmNvZGluZy5tYXJrdHlwZSgpXSxcbiAgICBtZGVmID0gbWFya2RlZihtYXJrLCBlbmNvZGluZywge1xuICAgICAgaGFzQWdncmVnYXRlOiBoYXNBZ2dcbiAgICB9KTtcblxuICB2YXIgaGFzUm93ID0gZW5jb2RpbmcuaGFzKFJPVyksIGhhc0NvbCA9IGVuY29kaW5nLmhhcyhDT0wpO1xuXG4gIHZhciBwcmVhZ2dyZWdhdGVkRGF0YSA9IGVuY29kaW5nLmNvbmZpZyhcInVzZVZlZ2FTZXJ2ZXJcIik7XG5cbiAgZ3JvdXAubWFya3MucHVzaChtZGVmKTtcbiAgLy8gVE9ETzogcmV0dXJuIHZhbHVlIG5vdCB1c2VkXG4gIGJpbm5pbmcoc3BlYy5kYXRhWzBdLCBlbmNvZGluZywge3ByZWFnZ3JlZ2F0ZWREYXRhOiBwcmVhZ2dyZWdhdGVkRGF0YX0pO1xuXG4gIHZhciBsaW5lVHlwZSA9IG1hcmtzW2VuY29kaW5nLm1hcmt0eXBlKCldLmxpbmU7XG5cbiAgaWYoIXByZWFnZ3JlZ2F0ZWREYXRhKXtcbiAgICBlbmNvZGluZy5mb3JFYWNoKGZ1bmN0aW9uKGVuY1R5cGUsIGZpZWxkKXtcbiAgICAgIGlmKGZpZWxkLnR5cGUgPT09IFQgJiYgZmllbGQuZm4pe1xuICAgICAgICB0aW1lVHJhbnNmb3JtKHNwZWMuZGF0YVswXSwgZW5jb2RpbmcsIGVuY1R5cGUsIGZpZWxkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIGhhbmRsZSBzdWJmYWNldHNcbiAgdmFyIGFnZ1Jlc3VsdCA9IGFnZ3JlZ2F0ZXMoc3BlYy5kYXRhWzBdLCBlbmNvZGluZywge3ByZWFnZ3JlZ2F0ZWREYXRhOiBwcmVhZ2dyZWdhdGVkRGF0YX0pLFxuICAgIGRldGFpbHMgPSBhZ2dSZXN1bHQuZGV0YWlscyxcbiAgICBoYXNEZXRhaWxzID0gZGV0YWlscyAmJiBkZXRhaWxzLmxlbmd0aCA+IDAsXG4gICAgc3RhY2sgPSBoYXNEZXRhaWxzICYmIHN0YWNraW5nKHNwZWMsIGVuY29kaW5nLCBtZGVmLCBhZ2dSZXN1bHQuZmFjZXRzKTtcblxuICBpZiAoaGFzRGV0YWlscyAmJiAoc3RhY2sgfHwgbGluZVR5cGUpKSB7XG4gICAgLy9zdWJmYWNldCB0byBncm91cCBzdGFjayAvIGxpbmUgdG9nZXRoZXIgaW4gb25lIGdyb3VwXG4gICAgc3ViZmFjZXQoZ3JvdXAsIG1kZWYsIGRldGFpbHMsIHN0YWNrLCBlbmNvZGluZyk7XG4gIH1cblxuICAvLyBhdXRvLXNvcnQgbGluZS9hcmVhIHZhbHVlc1xuICAvL1RPRE8oa2FuaXR3KTogaGF2ZSBzb21lIGNvbmZpZyB0byB0dXJuIG9mZiBhdXRvLXNvcnQgZm9yIGxpbmUgKGZvciBsaW5lIGNoYXJ0IHRoYXQgZW5jb2RlcyB0ZW1wb3JhbCBpbmZvcm1hdGlvbilcbiAgaWYgKGxpbmVUeXBlKSB7XG4gICAgdmFyIGYgPSAoZW5jb2RpbmcuaXNUeXBlKFgsIFEgfCBUKSAmJiBlbmNvZGluZy5pc1R5cGUoWSwgTykpID8gWSA6IFg7XG4gICAgaWYgKCFtZGVmLmZyb20pIG1kZWYuZnJvbSA9IHt9O1xuICAgIG1kZWYuZnJvbS50cmFuc2Zvcm0gPSBbe3R5cGU6IFwic29ydFwiLCBieTogZW5jb2RpbmcuZmllbGQoZil9XTtcbiAgfVxuXG4gIC8vIFNtYWxsIE11bHRpcGxlc1xuICBpZiAoaGFzUm93IHx8IGhhc0NvbCkge1xuICAgIHNwZWMgPSBmYWNldChncm91cCwgZW5jb2RpbmcsIGNlbGxIZWlnaHQsIGNlbGxXaWR0aCwgc3BlYywgbWRlZiwgc3RhY2ssIHN0YXRzKTtcbiAgfSBlbHNlIHtcbiAgICBncm91cC5zY2FsZXMgPSBzY2FsZS5kZWZzKHNjYWxlLm5hbWVzKG1kZWYucHJvcGVydGllcy51cGRhdGUpLCBlbmNvZGluZyxcbiAgICAgIHtzdGFjazogc3RhY2ssIHN0YXRzOiBzdGF0c30pO1xuICAgIGdyb3VwLmF4ZXMgPSBheGlzLmRlZnMoYXhpcy5uYW1lcyhtZGVmLnByb3BlcnRpZXMudXBkYXRlKSwgZW5jb2RpbmcpO1xuICAgIGdyb3VwLmxlZ2VuZHMgPSBsZWdlbmRzLmRlZnMoZW5jb2RpbmcpO1xuICB9XG5cbiAgcmV0dXJuIHNwZWM7XG59XG5cbmZ1bmN0aW9uIGdldENhcmRpbmFsaXR5KGVuY29kaW5nLCBlbmNUeXBlLCBzdGF0cyl7XG4gIHZhciBmaWVsZCA9IGVuY29kaW5nLmZpZWxkTmFtZShlbmNUeXBlKTtcbiAgaWYgKGVuY29kaW5nLmJpbihlbmNUeXBlKSkge1xuICAgIHZhciBiaW5zID0gdXRpbC5nZXRiaW5zKHN0YXRzW2ZpZWxkXSk7XG4gICAgcmV0dXJuIChiaW5zLnN0b3AgLSBiaW5zLnN0YXJ0KSAvIGJpbnMuc3RlcDtcbiAgfVxuICByZXR1cm4gc3RhdHNbZmllbGRdLmNhcmRpbmFsaXR5O1xufVxuXG5mdW5jdGlvbiBzZXRTaXplKGVuY29kaW5nLCBzdGF0cykge1xuICB2YXIgaGFzUm93ID0gZW5jb2RpbmcuaGFzKFJPVyksXG4gICAgICBoYXNDb2wgPSBlbmNvZGluZy5oYXMoQ09MKSxcbiAgICAgIGhhc1ggPSBlbmNvZGluZy5oYXMoWCksXG4gICAgICBoYXNZID0gZW5jb2RpbmcuaGFzKFkpO1xuXG4gIC8vIEhBQ0sgdG8gc2V0IGNoYXJ0IHNpemVcbiAgLy8gTk9URTogdGhpcyBmYWlscyBmb3IgcGxvdHMgZHJpdmVuIGJ5IGRlcml2ZWQgdmFsdWVzIChlLmcuLCBhZ2dyZWdhdGVzKVxuICAvLyBPbmUgc29sdXRpb24gaXMgdG8gdXBkYXRlIFZlZ2EgdG8gc3VwcG9ydCBhdXRvLXNpemluZ1xuICAvLyBJbiB0aGUgbWVhbnRpbWUsIGF1dG8tcGFkZGluZyAobW9zdGx5KSBkb2VzIHRoZSB0cmlja1xuICAvL1xuICB2YXIgY29sQ2FyZGluYWxpdHkgPSBoYXNDb2wgPyBnZXRDYXJkaW5hbGl0eShlbmNvZGluZywgQ09MLCBzdGF0cykgOiAxLFxuICAgIHJvd0NhcmRpbmFsaXR5ID0gaGFzUm93ID8gZ2V0Q2FyZGluYWxpdHkoZW5jb2RpbmcsIFJPVywgc3RhdHMpIDogMTtcblxuICB2YXIgY2VsbFdpZHRoID0gaGFzWCA/XG4gICAgICArZW5jb2RpbmcuY29uZmlnKFwiY2VsbFdpZHRoXCIpIHx8IGVuY29kaW5nLmNvbmZpZyhcIndpZHRoXCIpICogMS4wIC8gY29sQ2FyZGluYWxpdHkgOlxuICAgICAgZW5jb2RpbmcubWFya3R5cGUoKSA9PT0gXCJ0ZXh0XCIgP1xuICAgICAgICArZW5jb2RpbmcuY29uZmlnKFwidGV4dENlbGxXaWR0aFwiKSA6XG4gICAgICAgICtlbmNvZGluZy5jb25maWcoXCJiYW5kU2l6ZVwiKSxcbiAgICBjZWxsSGVpZ2h0ID0gaGFzWSA/XG4gICAgICArZW5jb2RpbmcuY29uZmlnKFwiY2VsbEhlaWdodFwiKSB8fCBlbmNvZGluZy5jb25maWcoXCJoZWlnaHRcIikgKiAxLjAgLyByb3dDYXJkaW5hbGl0eSA6XG4gICAgICArZW5jb2RpbmcuY29uZmlnKFwiYmFuZFNpemVcIiksXG4gICAgY2VsbFBhZGRpbmcgPSBlbmNvZGluZy5jb25maWcoXCJjZWxsUGFkZGluZ1wiKSxcbiAgICBiYW5kUGFkZGluZyA9IGVuY29kaW5nLmNvbmZpZyhcImJhbmRQYWRkaW5nXCIpLFxuICAgIHdpZHRoID0gZW5jb2RpbmcuY29uZmlnKFwiX21pbldpZHRoXCIpLFxuICAgIGhlaWdodCA9IGVuY29kaW5nLmNvbmZpZyhcIl9taW5IZWlnaHRcIik7XG5cbiAgaWYgKGhhc1ggJiYgKGVuY29kaW5nLmlzVHlwZShYLCBPKSB8fCBlbmNvZGluZy5iaW4oWCkpKSB7IC8vb3JkaW5hbCBmaWVsZCB3aWxsIG92ZXJyaWRlIHBhcmVudFxuICAgIC8vIGJhbmRzIHdpdGhpbiBjZWxsIHVzZSByYW5nZVBvaW50cygpXG4gICAgdmFyIHhDYXJkaW5hbGl0eSA9IGdldENhcmRpbmFsaXR5KGVuY29kaW5nLCBYLCBzdGF0cyk7XG4gICAgY2VsbFdpZHRoID0gKHhDYXJkaW5hbGl0eSArIGJhbmRQYWRkaW5nKSAqICtlbmNvZGluZy5jb25maWcoXCJiYW5kU2l6ZVwiKTtcbiAgfVxuICAvLyBDZWxsIGJhbmRzIHVzZSByYW5nZUJhbmRzKCkuIFRoZXJlIGFyZSBuLTEgcGFkZGluZy4gIE91dGVycGFkZGluZyA9IDAgZm9yIGNlbGxzXG4gIHdpZHRoID0gY2VsbFdpZHRoICogKCgxICsgY2VsbFBhZGRpbmcpICogKGNvbENhcmRpbmFsaXR5LTEpICsgMSk7XG5cbiAgaWYgKGhhc1kgJiYgKGVuY29kaW5nLmlzVHlwZShZLCBPKSB8fCBlbmNvZGluZy5iaW4oWSkpKSB7XG4gICAgLy8gYmFuZHMgd2l0aGluIGNlbGwgdXNlIHJhbmdlUG9pbnQoKVxuICAgIHZhciB5Q2FyZGluYWxpdHkgPSBnZXRDYXJkaW5hbGl0eShlbmNvZGluZywgWSwgc3RhdHMpO1xuICAgIGNlbGxIZWlnaHQgPSAoeUNhcmRpbmFsaXR5ICsgYmFuZFBhZGRpbmcpICogK2VuY29kaW5nLmNvbmZpZyhcImJhbmRTaXplXCIpO1xuICB9XG4gIC8vIENlbGwgYmFuZHMgdXNlIHJhbmdlQmFuZHMoKS4gVGhlcmUgYXJlIG4tMSBwYWRkaW5nLiAgT3V0ZXJwYWRkaW5nID0gMCBmb3IgY2VsbHNcbiAgaGVpZ2h0ID0gY2VsbEhlaWdodCAqICgoMSArIGNlbGxQYWRkaW5nKSAqIChyb3dDYXJkaW5hbGl0eS0xKSArIDEpO1xuXG4gIHJldHVybiB7XG4gICAgY2VsbFdpZHRoOiBjZWxsV2lkdGgsXG4gICAgY2VsbEhlaWdodDogY2VsbEhlaWdodCxcbiAgICB3aWR0aDogd2lkdGgsXG4gICAgaGVpZ2h0OmhlaWdodFxuICB9O1xufVxuXG5mdW5jdGlvbiBmYWNldChncm91cCwgZW5jb2RpbmcsIGNlbGxIZWlnaHQsIGNlbGxXaWR0aCwgc3BlYywgbWRlZiwgc3RhY2ssIHN0YXRzKSB7XG4gICAgdmFyIGVudGVyID0gZ3JvdXAucHJvcGVydGllcy5lbnRlcjtcbiAgICB2YXIgZmFjZXRLZXlzID0gW10sIGNlbGxBeGVzID0gW107XG5cbiAgICB2YXIgaGFzUm93ID0gZW5jb2RpbmcuaGFzKFJPVyksIGhhc0NvbCA9IGVuY29kaW5nLmhhcyhDT0wpO1xuXG4gICAgdmFyIHhBeGlzTWFyZ2luID0gZW5jb2RpbmcuaGFzKFkpID8gZW5jb2RpbmcuY29uZmlnKFwieEF4aXNNYXJnaW5cIikgOiB1bmRlZmluZWQ7XG5cbiAgICBlbnRlci5maWxsID0ge3ZhbHVlOiBlbmNvZGluZy5jb25maWcoXCJjZWxsQmFja2dyb3VuZENvbG9yXCIpfTtcblxuICAgIC8vbW92ZSBcImZyb21cIiB0byBjZWxsIGxldmVsIGFuZCBhZGQgZmFjZXQgdHJhbnNmb3JtXG4gICAgZ3JvdXAuZnJvbSA9IHtkYXRhOiBncm91cC5tYXJrc1swXS5mcm9tLmRhdGF9O1xuXG4gICAgaWYgKGdyb3VwLm1hcmtzWzBdLmZyb20udHJhbnNmb3JtKSB7XG4gICAgICBkZWxldGUgZ3JvdXAubWFya3NbMF0uZnJvbS5kYXRhOyAvL25lZWQgdG8ga2VlcCB0cmFuc2Zvcm0gZm9yIHN1YmZhY2V0dGluZyBjYXNlXG4gICAgfSBlbHNlIHtcbiAgICAgIGRlbGV0ZSBncm91cC5tYXJrc1swXS5mcm9tO1xuICAgIH1cbiAgICBpZiAoaGFzUm93KSB7XG4gICAgICBpZiAoIWVuY29kaW5nLmlzVHlwZShST1csIE8pKSB7XG4gICAgICAgIHV0aWwuZXJyb3IoXCJSb3cgZW5jb2Rpbmcgc2hvdWxkIGJlIG9yZGluYWwuXCIpO1xuICAgICAgfVxuICAgICAgZW50ZXIueSA9IHtzY2FsZTogUk9XLCBmaWVsZDogXCJrZXlzLlwiICsgZmFjZXRLZXlzLmxlbmd0aH07XG4gICAgICBlbnRlci5oZWlnaHQgPSB7XCJ2YWx1ZVwiOiBjZWxsSGVpZ2h0fTsgLy8gSEFDS1xuXG4gICAgICBmYWNldEtleXMucHVzaChlbmNvZGluZy5maWVsZChST1cpKTtcblxuICAgICAgdmFyIGZyb207XG4gICAgICBpZiAoaGFzQ29sKSB7XG4gICAgICAgIGZyb20gPSB1dGlsLmR1cGxpY2F0ZShncm91cC5mcm9tKTtcbiAgICAgICAgZnJvbS50cmFuc2Zvcm0gPSBmcm9tLnRyYW5zZm9ybSB8fCBbXTtcbiAgICAgICAgZnJvbS50cmFuc2Zvcm0udW5zaGlmdCh7dHlwZTogXCJmYWNldFwiLCBrZXlzOiBbZW5jb2RpbmcuZmllbGQoQ09MKV19KTtcbiAgICAgIH1cblxuICAgICAgdmFyIGF4ZXNHcnAgPSBncm91cGRlZihcIngtYXhlc1wiLCB7XG4gICAgICAgICAgYXhlczogZW5jb2RpbmcuaGFzKFgpID8gIGF4aXMuZGVmcyhbXCJ4XCJdLCBlbmNvZGluZykgOiB1bmRlZmluZWQsXG4gICAgICAgICAgeDogaGFzQ29sID8ge3NjYWxlOiBDT0wsIGZpZWxkOiBcImtleXMuMFwiLCBvZmZzZXQ6IHhBeGlzTWFyZ2lufSA6IHt2YWx1ZTogeEF4aXNNYXJnaW59LFxuICAgICAgICAgIHdpZHRoOiBoYXNDb2wgJiYge1widmFsdWVcIjogY2VsbFdpZHRofSwgLy9IQUNLP1xuICAgICAgICAgIGZyb206IGZyb21cbiAgICAgICAgfSk7XG5cbiAgICAgIHNwZWMubWFya3MucHVzaChheGVzR3JwKTtcbiAgICAgIChzcGVjLmF4ZXMgPSBzcGVjLmF4ZXMgfHwgW10pXG4gICAgICBzcGVjLmF4ZXMucHVzaC5hcHBseShzcGVjLmF4ZXMsIGF4aXMuZGVmcyhbXCJyb3dcIl0sIGVuY29kaW5nKSk7XG4gICAgfSBlbHNlIHsgLy8gZG9lc24ndCBoYXZlIHJvd1xuICAgICAgaWYoZW5jb2RpbmcuaGFzKFgpKXtcbiAgICAgICAgLy9rZWVwIHggYXhpcyBpbiB0aGUgY2VsbFxuICAgICAgICBjZWxsQXhlcy5wdXNoLmFwcGx5KGNlbGxBeGVzLCBheGlzLmRlZnMoW1wieFwiXSwgZW5jb2RpbmcpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFzQ29sKSB7XG4gICAgICBpZiAoIWVuY29kaW5nLmlzVHlwZShDT0wsIE8pKSB7XG4gICAgICAgIHV0aWwuZXJyb3IoXCJDb2wgZW5jb2Rpbmcgc2hvdWxkIGJlIG9yZGluYWwuXCIpO1xuICAgICAgfVxuICAgICAgZW50ZXIueCA9IHtzY2FsZTogQ09MLCBmaWVsZDogXCJrZXlzLlwiICsgZmFjZXRLZXlzLmxlbmd0aH07XG4gICAgICBlbnRlci53aWR0aCA9IHtcInZhbHVlXCI6IGNlbGxXaWR0aH07IC8vIEhBQ0tcblxuICAgICAgZmFjZXRLZXlzLnB1c2goZW5jb2RpbmcuZmllbGQoQ09MKSk7XG5cbiAgICAgIHZhciBmcm9tO1xuICAgICAgaWYgKGhhc1Jvdykge1xuICAgICAgICBmcm9tID0gdXRpbC5kdXBsaWNhdGUoZ3JvdXAuZnJvbSk7XG4gICAgICAgIGZyb20udHJhbnNmb3JtID0gZnJvbS50cmFuc2Zvcm0gfHwgW107XG4gICAgICAgIGZyb20udHJhbnNmb3JtLnVuc2hpZnQoe3R5cGU6IFwiZmFjZXRcIiwga2V5czogW2VuY29kaW5nLmZpZWxkKFJPVyldfSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBheGVzR3JwID0gZ3JvdXBkZWYoXCJ5LWF4ZXNcIiwge1xuICAgICAgICBheGVzOiBlbmNvZGluZy5oYXMoWSkgPyBheGlzLmRlZnMoW1wieVwiXSwgZW5jb2RpbmcpIDogdW5kZWZpbmVkLFxuICAgICAgICB5OiBoYXNSb3cgJiYge3NjYWxlOiBST1csIGZpZWxkOiBcImtleXMuMFwifSxcbiAgICAgICAgeDogaGFzUm93ICYmIHt2YWx1ZTogeEF4aXNNYXJnaW59LFxuICAgICAgICBoZWlnaHQ6IGhhc1JvdyAmJiB7XCJ2YWx1ZVwiOiBjZWxsSGVpZ2h0fSwgLy9IQUNLP1xuICAgICAgICBmcm9tOiBmcm9tXG4gICAgICB9KTtcblxuICAgICAgc3BlYy5tYXJrcy5wdXNoKGF4ZXNHcnApO1xuICAgICAgKHNwZWMuYXhlcyA9IHNwZWMuYXhlcyB8fCBbXSlcbiAgICAgIHNwZWMuYXhlcy5wdXNoLmFwcGx5KHNwZWMuYXhlcywgYXhpcy5kZWZzKFtcImNvbFwiXSwgZW5jb2RpbmcsIHtcbiAgICAgICAgeEF4aXNNYXJnaW46IHhBeGlzTWFyZ2luXG4gICAgICB9KSk7XG4gICAgfSBlbHNlIHsgLy8gZG9lc24ndCBoYXZlIGNvbFxuICAgICAgaWYoZW5jb2RpbmcuaGFzKFkpKXtcbiAgICAgICAgY2VsbEF4ZXMucHVzaC5hcHBseShjZWxsQXhlcywgYXhpcy5kZWZzKFtcInlcIl0sIGVuY29kaW5nKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoaGFzUm93KXtcbiAgICAgIGlmKGVudGVyLngpIGVudGVyLngub2Zmc2V0PSB4QXhpc01hcmdpbjtcbiAgICAgIGVsc2UgZW50ZXIueCA9IHt2YWx1ZTogeEF4aXNNYXJnaW59O1xuICAgIH1cbiAgICBpZihoYXNDb2wpe1xuICAgICAgLy9UT0RPIGZpbGwgaGVyZS4uXG4gICAgfVxuXG4gICAgLy8gYXNzdW1pbmcgZXF1YWwgY2VsbFdpZHRoIGhlcmVcbiAgICAvLyBUT0RPOiBzdXBwb3J0IGhldGVyb2dlbm91cyBjZWxsV2lkdGggKG1heWJlIGJ5IHVzaW5nIG11bHRpcGxlIHNjYWxlcz8pXG4gICAgc3BlYy5zY2FsZXMgPSBzY2FsZS5kZWZzKFxuICAgICAgc2NhbGUubmFtZXMoZW50ZXIpLmNvbmNhdChzY2FsZS5uYW1lcyhtZGVmLnByb3BlcnRpZXMudXBkYXRlKSksXG4gICAgICBlbmNvZGluZyxcbiAgICAgIHtjZWxsV2lkdGg6IGNlbGxXaWR0aCwgY2VsbEhlaWdodDogY2VsbEhlaWdodCwgc3RhY2s6IHN0YWNrLCBmYWNldDp0cnVlLCBzdGF0czogc3RhdHN9XG4gICAgKTsgLy8gcm93L2NvbCBzY2FsZXMgKyBjZWxsIHNjYWxlc1xuXG4gICAgaWYgKGNlbGxBeGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGdyb3VwLmF4ZXMgPSBjZWxsQXhlcztcbiAgICB9XG5cbiAgICAvLyBhZGQgZmFjZXQgdHJhbnNmb3JtXG4gICAgdmFyIHRyYW5zID0gKGdyb3VwLmZyb20udHJhbnNmb3JtIHx8IChncm91cC5mcm9tLnRyYW5zZm9ybSA9IFtdKSk7XG4gICAgdHJhbnMudW5zaGlmdCh7dHlwZTogXCJmYWNldFwiLCBrZXlzOiBmYWNldEtleXN9KTtcblxuICByZXR1cm4gc3BlYztcbiAgfVxuXG5mdW5jdGlvbiBzdWJmYWNldChncm91cCwgbWRlZiwgZGV0YWlscywgc3RhY2ssIGVuY29kaW5nKSB7XG4gIHZhciBtID0gZ3JvdXAubWFya3MsXG4gICAgZyA9IGdyb3VwZGVmKFwic3ViZmFjZXRcIiwge21hcmtzOiBtfSk7XG5cbiAgZ3JvdXAubWFya3MgPSBbZ107XG4gIGcuZnJvbSA9IG1kZWYuZnJvbTtcbiAgZGVsZXRlIG1kZWYuZnJvbTtcblxuICAvL1RPRE8gdGVzdCBMT0QgLS0gd2Ugc2hvdWxkIHN1cHBvcnQgc3RhY2sgLyBsaW5lIHdpdGhvdXQgY29sb3IgKExPRCkgZmllbGRcbiAgdmFyIHRyYW5zID0gKGcuZnJvbS50cmFuc2Zvcm0gfHwgKGcuZnJvbS50cmFuc2Zvcm0gPSBbXSkpO1xuICB0cmFucy51bnNoaWZ0KHt0eXBlOiBcImZhY2V0XCIsIGtleXM6IGRldGFpbHN9KTtcblxuICBpZiAoc3RhY2sgJiYgZW5jb2RpbmcuaGFzKENPTE9SKSkge1xuICAgIHRyYW5zLnVuc2hpZnQoe3R5cGU6IFwic29ydFwiLCBieTogZW5jb2RpbmcuZmllbGQoQ09MT1IpfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0VGltZUZuKGZuKXtcbiAgc3dpdGNoKGZuKXtcbiAgICBjYXNlIFwic2Vjb25kXCI6IHJldHVybiBcImdldFVUQ1NlY29uZHNcIjtcbiAgICBjYXNlIFwibWludXRlXCI6IHJldHVybiBcImdldFVUQ01pbnV0ZXNcIjtcbiAgICBjYXNlIFwiaG91clwiOiByZXR1cm4gXCJnZXRVVENIb3Vyc1wiO1xuICAgIGNhc2UgXCJkYXlcIjogcmV0dXJuIFwiZ2V0VVRDRGF5XCI7XG4gICAgY2FzZSBcImRhdGVcIjogcmV0dXJuIFwiZ2V0VVRDRGF0ZVwiO1xuICAgIGNhc2UgXCJtb250aFwiOiByZXR1cm4gXCJnZXRVVENNb250aFwiO1xuICAgIGNhc2UgXCJ5ZWFyXCI6IHJldHVybiBcImdldFVUQ0Z1bGxZZWFyXCI7XG4gIH1cbiAgY29uc29sZS5lcnJvcihcIm5vIGZ1bmN0aW9uIHNwZWNpZmllZCBmb3IgZGF0ZVwiKTtcbn1cblxuZnVuY3Rpb24gdGltZVRyYW5zZm9ybShzcGVjLCBlbmNvZGluZywgZW5jVHlwZSwgZmllbGQpe1xuICB2YXIgZnVuYyA9IGdldFRpbWVGbihmaWVsZC5mbik7XG5cbiAgc3BlYy50cmFuc2Zvcm0gPSBzcGVjLnRyYW5zZm9ybSB8fCBbXTtcbiAgc3BlYy50cmFuc2Zvcm0ucHVzaCh7XG4gICAgdHlwZTogXCJmb3JtdWxhXCIsXG4gICAgZmllbGQ6IGVuY29kaW5nLmZpZWxkKGVuY1R5cGUpLFxuICAgIGV4cHI6IFwibmV3IERhdGUoZC5kYXRhLlwiK2ZpZWxkLm5hbWUrXCIpLlwiK2Z1bmMrXCIoKVwiXG4gIH0pO1xuICByZXR1cm4gc3BlYztcbn1cblxuZnVuY3Rpb24gYmlubmluZyhzcGVjLCBlbmNvZGluZywgb3B0KSB7XG4gIG9wdCA9IG9wdCB8fCB7fTtcbiAgdmFyIGJpbnMgPSB7fTtcbiAgZW5jb2RpbmcuZm9yRWFjaChmdW5jdGlvbih2diwgZCkge1xuICAgIGlmIChkLmJpbikgYmluc1tkLm5hbWVdID0gZC5uYW1lO1xuICB9KTtcbiAgYmlucyA9IHV0aWwua2V5cyhiaW5zKTtcblxuICBpZiAoYmlucy5sZW5ndGggPT09IDAgfHwgb3B0LnByZWFnZ3JlZ2F0ZWREYXRhKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKCFzcGVjLnRyYW5zZm9ybSkgc3BlYy50cmFuc2Zvcm0gPSBbXTtcbiAgYmlucy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICBzcGVjLnRyYW5zZm9ybS5wdXNoKHtcbiAgICAgIHR5cGU6IFwiYmluXCIsXG4gICAgICBmaWVsZDogXCJkYXRhLlwiICsgZCxcbiAgICAgIG91dHB1dDogXCJkYXRhLmJpbl9cIiArIGQsXG4gICAgICBtYXhiaW5zOiBNQVhfQklOU1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIGJpbnM7XG59XG5cbmZ1bmN0aW9uIGFnZ3JlZ2F0ZXMoc3BlYywgZW5jb2RpbmcsIG9wdCkge1xuICBvcHQgPSBvcHQgfHwge307XG4gIHZhciBkaW1zID0ge30sIG1lYXMgPSB7fSwgZGV0YWlsID0ge30sIGZhY2V0cz17fTtcbiAgZW5jb2RpbmcuZm9yRWFjaChmdW5jdGlvbihlbmNUeXBlLCBmaWVsZCkge1xuICAgIGlmIChmaWVsZC5hZ2dyKSB7XG4gICAgICBpZihmaWVsZC5hZ2dyPT09XCJjb3VudFwiKXtcbiAgICAgICAgbWVhc1tcImNvdW50XCJdID0ge29wOlwiY291bnRcIiwgZmllbGQ6XCIqXCJ9O1xuICAgICAgfWVsc2V7XG4gICAgICAgIG1lYXNbZmllbGQuYWdncitcInxcIitmaWVsZC5uYW1lXSA9IHtcbiAgICAgICAgICBvcDpmaWVsZC5hZ2dyLFxuICAgICAgICAgIGZpZWxkOlwiZGF0YS5cIitmaWVsZC5uYW1lXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpbXNbZmllbGQubmFtZV0gPSBlbmNvZGluZy5maWVsZChlbmNUeXBlKTtcbiAgICAgIGlmIChlbmNUeXBlPT1ST1cgfHwgZW5jVHlwZSA9PSBDT0wpe1xuICAgICAgICBmYWNldHNbZmllbGQubmFtZV0gPSBkaW1zW2ZpZWxkLm5hbWVdO1xuICAgICAgfWVsc2UgaWYgKGVuY1R5cGUgIT09IFggJiYgZW5jVHlwZSAhPT0gWSkge1xuICAgICAgICBkZXRhaWxbZmllbGQubmFtZV0gPSBkaW1zW2ZpZWxkLm5hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIGRpbXMgPSB1dGlsLnZhbHMoZGltcyk7XG4gIG1lYXMgPSB1dGlsLnZhbHMobWVhcyk7XG5cbiAgaWYgKG1lYXMubGVuZ3RoID4gMCAmJiAhb3B0LnByZWFnZ3JlZ2F0ZWREYXRhKSB7XG4gICAgaWYgKCFzcGVjLnRyYW5zZm9ybSkgc3BlYy50cmFuc2Zvcm0gPSBbXTtcbiAgICBzcGVjLnRyYW5zZm9ybS5wdXNoKHtcbiAgICAgIHR5cGU6IFwiYWdncmVnYXRlXCIsXG4gICAgICBncm91cGJ5OiBkaW1zLFxuICAgICAgZmllbGRzOiBtZWFzXG4gICAgfSk7XG5cbiAgICBpZiAoZW5jb2RpbmcubWFya3R5cGUoKSA9PT0gVEVYVCkge1xuICAgICAgbWVhcy5mb3JFYWNoKCBmdW5jdGlvbiAobSkge1xuICAgICAgICB2YXIgZmllbGROYW1lID0gbS5maWVsZC5zdWJzdHIoNSksIC8vcmVtb3ZlIFwiZGF0YS5cIlxuICAgICAgICAgIGZpZWxkID0gXCJkYXRhLlwiICsgKG0ub3AgPyBtLm9wICsgXCJfXCIgOiBcIlwiKSArIGZpZWxkTmFtZTtcbiAgICAgICAgc3BlYy50cmFuc2Zvcm0ucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJmb3JtdWxhXCIsXG4gICAgICAgICAgZmllbGQ6IGZpZWxkLFxuICAgICAgICAgIGV4cHI6IFwiZDMuZm9ybWF0KCcuMmYnKShkLlwiK2ZpZWxkK1wiKVwiXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB7XG4gICAgZGV0YWlsczogdXRpbC52YWxzKGRldGFpbCksXG4gICAgZGltczogZGltcyxcbiAgICBmYWNldHM6IHV0aWwudmFscyhmYWNldHMpLFxuICAgIGFnZ3JlZ2F0ZWQ6IG1lYXMubGVuZ3RoID4gMFxuICB9XG59XG5cbmZ1bmN0aW9uIHN0YWNraW5nKHNwZWMsIGVuY29kaW5nLCBtZGVmLCBmYWNldHMpIHtcbiAgaWYgKCFtYXJrc1tlbmNvZGluZy5tYXJrdHlwZSgpXS5zdGFjaykgcmV0dXJuIGZhbHNlO1xuICBpZiAoIWVuY29kaW5nLmhhcyhDT0xPUikpIHJldHVybiBmYWxzZTtcblxuICB2YXIgZGltID0gWCwgdmFsID0gWSwgaWR4ID0gMTtcbiAgaWYgKGVuY29kaW5nLmlzVHlwZShYLFF8VCkgJiYgIWVuY29kaW5nLmlzVHlwZShZLFF8VCkgJiYgZW5jb2RpbmcuaGFzKFkpKSB7XG4gICAgZGltID0gWTtcbiAgICB2YWwgPSBYO1xuICAgIGlkeCA9IDA7XG4gIH1cblxuICAvLyBhZGQgdHJhbnNmb3JtIHRvIGNvbXB1dGUgc3VtcyBmb3Igc2NhbGVcbiAgdmFyIHN0YWNrZWQgPSB7XG4gICAgbmFtZTogU1RBQ0tFRCxcbiAgICBzb3VyY2U6IFRBQkxFLFxuICAgIHRyYW5zZm9ybTogW3tcbiAgICAgIHR5cGU6IFwiYWdncmVnYXRlXCIsXG4gICAgICBncm91cGJ5OiBbZW5jb2RpbmcuZmllbGQoZGltKV0uY29uY2F0KGZhY2V0cyksIC8vIGRpbSBhbmQgb3RoZXIgZmFjZXRzXG4gICAgICBmaWVsZHM6IFt7b3A6IFwic3VtXCIsIGZpZWxkOiBlbmNvZGluZy5maWVsZCh2YWwpfV0gLy8gVE9ETyBjaGVjayBpZiBmaWVsZCB3aXRoIGFnZ3IgaXMgY29ycmVjdD9cbiAgICB9XVxuICB9O1xuXG4gIGlmKGZhY2V0cyAmJiBmYWNldHMubGVuZ3RoID4gMCl7XG4gICAgc3RhY2tlZC50cmFuc2Zvcm0ucHVzaCh7IC8vY2FsY3VsYXRlIG1heCBmb3IgZWFjaCBmYWNldFxuICAgICAgdHlwZTogXCJhZ2dyZWdhdGVcIixcbiAgICAgIGdyb3VwYnk6IGZhY2V0cyxcbiAgICAgIGZpZWxkczogW3tvcDogXCJtYXhcIiwgZmllbGQ6IFwiZGF0YS5zdW1fXCIgKyBlbmNvZGluZy5maWVsZCh2YWwsIHRydWUpfV1cbiAgICB9KTtcbiAgfVxuXG4gIHNwZWMuZGF0YS5wdXNoKHN0YWNrZWQpO1xuXG4gIC8vIGFkZCBzdGFjayB0cmFuc2Zvcm0gdG8gbWFya1xuICBtZGVmLmZyb20udHJhbnNmb3JtID0gW3tcbiAgICB0eXBlOiBcInN0YWNrXCIsXG4gICAgcG9pbnQ6IGVuY29kaW5nLmZpZWxkKGRpbSksXG4gICAgaGVpZ2h0OiBlbmNvZGluZy5maWVsZCh2YWwpLFxuICAgIG91dHB1dDoge3kxOiB2YWwsIHkwOiB2YWwrXCIyXCJ9XG4gIH1dO1xuXG4gIC8vIFRPRE86IFRoaXMgaXMgc3VwZXIgaGFjay1pc2ggLS0gY29uc29saWRhdGUgaW50byBtb2R1bGFyIG1hcmsgcHJvcGVydGllcz9cbiAgbWRlZi5wcm9wZXJ0aWVzLnVwZGF0ZVt2YWxdID0gbWRlZi5wcm9wZXJ0aWVzLmVudGVyW3ZhbF0gPSB7c2NhbGU6IHZhbCwgZmllbGQ6IHZhbH07XG4gIG1kZWYucHJvcGVydGllcy51cGRhdGVbdmFsK1wiMlwiXSA9IG1kZWYucHJvcGVydGllcy5lbnRlclt2YWwrXCIyXCJdID0ge3NjYWxlOiB2YWwsIGZpZWxkOiB2YWwrXCIyXCJ9O1xuXG4gIHJldHVybiB2YWw7IC8vcmV0dXJuIHN0YWNrIGVuY29kaW5nXG59XG5cblxuZnVuY3Rpb24gbWFya2RlZihtYXJrLCBlbmNvZGluZywgb3B0KSB7XG4gIHZhciBwID0gbWFyay5wcm9wKGVuY29kaW5nLCBvcHQpXG4gIHJldHVybiB7XG4gICAgdHlwZTogbWFyay50eXBlLFxuICAgIGZyb206IHtkYXRhOiBUQUJMRX0sXG4gICAgcHJvcGVydGllczoge2VudGVyOiBwLCB1cGRhdGU6IHB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdyb3VwZGVmKG5hbWUsIG9wdCkge1xuICBvcHQgPSBvcHQgfHwge307XG4gIHJldHVybiB7XG4gICAgX25hbWU6IG5hbWUgfHwgdW5kZWZpbmVkLFxuICAgIHR5cGU6IFwiZ3JvdXBcIixcbiAgICBmcm9tOiBvcHQuZnJvbSxcbiAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICBlbnRlcjoge1xuICAgICAgICB4OiBvcHQueCB8fCB1bmRlZmluZWQsXG4gICAgICAgIHk6IG9wdC55IHx8IHVuZGVmaW5lZCxcbiAgICAgICAgd2lkdGg6IG9wdC53aWR0aCB8fCB7Z3JvdXA6IFwid2lkdGhcIn0sXG4gICAgICAgIGhlaWdodDogb3B0LmhlaWdodCB8fCB7Z3JvdXA6IFwiaGVpZ2h0XCJ9XG4gICAgICB9XG4gICAgfSxcbiAgICBzY2FsZXM6IG9wdC5zY2FsZXMgfHwgdW5kZWZpbmVkLFxuICAgIGF4ZXM6IG9wdC5heGVzIHx8IHVuZGVmaW5lZCxcbiAgICBtYXJrczogb3B0Lm1hcmtzIHx8IFtdXG4gIH07XG59XG5cbmZ1bmN0aW9uIHRlbXBsYXRlKGVuY29kaW5nLCBzaXplLCBzdGF0cykgeyAvL2hhY2sgdXNlIHN0YXRzXG5cbiAgdmFyIGRhdGEgPSB7bmFtZTpUQUJMRSwgZm9ybWF0OiB7dHlwZTogZW5jb2RpbmcuY29uZmlnKFwiZGF0YUZvcm1hdFR5cGVcIil9fSxcbiAgICBkYXRhVXJsID0gdmwuZGF0YS5nZXRVcmwoZW5jb2RpbmcsIHN0YXRzKTtcbiAgaWYoZGF0YVVybCkgZGF0YS51cmwgPSBkYXRhVXJsO1xuXG4gIHZhciBwcmVhZ2dyZWdhdGVkRGF0YSA9IGVuY29kaW5nLmNvbmZpZyhcInVzZVZlZ2FTZXJ2ZXJcIik7XG5cbiAgZW5jb2RpbmcuZm9yRWFjaChmdW5jdGlvbihlbmNUeXBlLCBmaWVsZCl7XG4gICAgaWYoZmllbGQudHlwZSA9PSBUKXtcbiAgICAgIGRhdGEuZm9ybWF0LnBhcnNlID0gZGF0YS5mb3JtYXQucGFyc2UgfHwge307XG4gICAgICBkYXRhLmZvcm1hdC5wYXJzZVtmaWVsZC5uYW1lXSA9IFwiZGF0ZVwiO1xuICAgIH1lbHNlIGlmKGZpZWxkLnR5cGUgPT0gUSl7XG4gICAgICBkYXRhLmZvcm1hdC5wYXJzZSA9IGRhdGEuZm9ybWF0LnBhcnNlIHx8IHt9O1xuICAgICAgaWYgKGZpZWxkLmFnZ3IgPT09IFwiY291bnRcIikge1xuICAgICAgICB2YXIgbmFtZSA9IFwiY291bnRcIjtcbiAgICAgIH0gZWxzZSBpZihwcmVhZ2dyZWdhdGVkRGF0YSAmJiBmaWVsZC5iaW4pe1xuICAgICAgICB2YXIgbmFtZSA9IFwiYmluX1wiICsgZmllbGQubmFtZTtcbiAgICAgIH0gZWxzZSBpZihwcmVhZ2dyZWdhdGVkRGF0YSAmJiBmaWVsZC5hZ2dyKXtcbiAgICAgICAgdmFyIG5hbWUgPSBmaWVsZC5hZ2dyICsgXCJfXCIgKyBmaWVsZC5uYW1lO1xuICAgICAgfSBlbHNle1xuICAgICAgICB2YXIgbmFtZSA9IGZpZWxkLm5hbWU7XG4gICAgICB9XG4gICAgICBkYXRhLmZvcm1hdC5wYXJzZVtuYW1lXSA9IFwibnVtYmVyXCI7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4ge1xuICAgIHdpZHRoOiBzaXplLndpZHRoLFxuICAgIGhlaWdodDogc2l6ZS5oZWlnaHQsXG4gICAgcGFkZGluZzogXCJhdXRvXCIsXG4gICAgZGF0YTogW2RhdGFdLFxuICAgIG1hcmtzOiBbZ3JvdXBkZWYoXCJjZWxsXCIsIHtcbiAgICAgIHdpZHRoOiBzaXplLmNlbGxXaWR0aCA/IHt2YWx1ZTogc2l6ZS5jZWxsV2lkdGh9OiB1bmRlZmluZWQsXG4gICAgICBoZWlnaHQ6IHNpemUuY2VsbEhlaWdodCA/IHt2YWx1ZTogc2l6ZS5jZWxsSGVpZ2h0fSA6IHVuZGVmaW5lZFxuICAgIH0pXVxuICB9O1xufVxuIiwidmFyIGdsb2JhbHMgPSByZXF1aXJlKCcuL2dsb2JhbHMnKTtcblxudmFyIGNvbnN0cyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbmNvbnN0cy5lbmNvZGluZ1R5cGVzID0gW1gsIFksIFJPVywgQ09MLCBTSVpFLCBTSEFQRSwgQ09MT1IsIEFMUEhBLCBURVhUXTtcblxuY29uc3RzLmRhdGFUeXBlcyA9IHtcIk9cIjogTywgXCJRXCI6IFEsIFwiVFwiOiBUfTtcblxuY29uc3RzLmRhdGFUeXBlTmFtZXMgPSBbXCJPXCIsXCJRXCIsXCJUXCJdLnJlZHVjZShmdW5jdGlvbihyLHgpIHtcbiAgcltjb25zdHMuZGF0YVR5cGVzW3hdXSA9IHg7IHJldHVybiByO1xufSx7fSk7XG5cbmNvbnN0cy5ERUZBVUxUUyA9IHtcbiAgLy8gdGVtcGxhdGVcbiAgd2lkdGg6IHVuZGVmaW5lZCxcbiAgaGVpZ2h0OiB1bmRlZmluZWQsXG4gIHZpZXdwb3J0OiB1bmRlZmluZWQsXG4gIF9taW5XaWR0aDogMjAsXG4gIF9taW5IZWlnaHQ6IDIwLFxuXG4gIC8vIGRhdGEgc291cmNlXG4gIGRhdGFVcmw6IHVuZGVmaW5lZCwgLy9mb3IgZWFzaWVyIGV4cG9ydFxuICB1c2VWZWdhU2VydmVyOiBmYWxzZSxcbiAgdmVnYVNlcnZlclVybDogXCJodHRwOi8vbG9jYWxob3N0OjMwMDFcIixcbiAgdmVnYVNlcnZlclRhYmxlOiB1bmRlZmluZWQsXG4gIGRhdGFGb3JtYXRUeXBlOiBcImpzb25cIixcblxuICAvL3NtYWxsIG11bHRpcGxlc1xuICBjZWxsSGVpZ2h0OiAyMDAsIC8vIHdpbGwgYmUgb3ZlcndyaXR0ZW4gYnkgYmFuZFdpZHRoXG4gIGNlbGxXaWR0aDogMjAwLCAvLyB3aWxsIGJlIG92ZXJ3cml0dGVuIGJ5IGJhbmRXaWR0aFxuICBjZWxsUGFkZGluZzogMC4xLFxuICBjZWxsQmFja2dyb3VuZENvbG9yOiBcIiNmZGZkZmRcIixcbiAgeEF4aXNNYXJnaW46IDgwLFxuICB5QXhpc01hcmdpbjogMCxcbiAgdGV4dENlbGxXaWR0aDogOTAsXG5cbiAgLy8gbWFya3NcbiAgYmFuZFNpemU6IDIxLFxuICBiYW5kUGFkZGluZzogMSxcbiAgcG9pbnRTaXplOiA1MCxcbiAgcG9pbnRTaGFwZTogXCJjaXJjbGVcIixcbiAgc3Ryb2tlV2lkdGg6IDIsXG4gIGNvbG9yOiBcInN0ZWVsYmx1ZVwiLFxuICB0ZXh0Q29sb3I6IFwiYmxhY2tcIixcbiAgdGV4dEFsaWduOiBcImxlZnRcIixcbiAgdGV4dEJhc2VsaW5lOiBcIm1pZGRsZVwiLFxuICB0ZXh0TWFyZ2luOiA0LFxuICBmb250OiBcIkhlbHZldGljYSBOZXVlXCIsXG4gIGZvbnRTaXplOiBcIjEyXCIsXG4gIGZvbnRXZWlnaHQ6IFwibm9ybWFsXCIsXG4gIGZvbnRTdHlsZTogXCJub3JtYWxcIixcbiAgb3BhY2l0eTogMSxcbiAgX3RoaWNrT3BhY2l0eTogMC41LFxuICBfdGhpbk9wYWNpdHk6IDAuMixcblxuICAvLyBzY2FsZXNcbiAgLy8gVE9ETyByZW1vdmUgX3haZXJvLCAuLi5cbiAgX3haZXJvOiB0cnVlLFxuICBfeFJldmVyc2U6IGZhbHNlLFxuICBfeVplcm86IHRydWUsXG4gIF95UmV2ZXJzZTogZmFsc2UsXG4gIHRpbWVTY2FsZU5pY2U6IFwiZGF5XCJcbn07IiwiLy8gVE9ETyByZW5hbWUgZ2V0RGF0YVVybCB0byB2bC5kYXRhLmdldFVybCgpID9cblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMuZ2V0VXJsID0gZnVuY3Rpb24gZ2V0RGF0YVVybChlbmNvZGluZywgc3RhdHMpIHtcbiAgaWYgKCFlbmNvZGluZy5jb25maWcoXCJ1c2VWZWdhU2VydmVyXCIpKSB7XG4gICAgLy8gZG9uJ3QgdXNlIHZlZ2Egc2VydmVyXG4gICAgcmV0dXJuIGVuY29kaW5nLmNvbmZpZyhcImRhdGFVcmxcIik7XG4gIH1cblxuICBpZiAoZW5jb2RpbmcubGVuZ3RoKCkgPT09IDApIHtcbiAgICAvLyBubyBmaWVsZHNcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgZmllbGRzID0gW11cbiAgZW5jb2RpbmcuZm9yRWFjaChmdW5jdGlvbihlbmNUeXBlLCBmaWVsZCl7XG4gICAgdmFyIG9iaiA9IHtcbiAgICAgIG5hbWU6IGVuY29kaW5nLmZpZWxkKGVuY1R5cGUsIHRydWUpLFxuICAgICAgZmllbGQ6IGZpZWxkLm5hbWVcbiAgICB9XG4gICAgaWYgKGZpZWxkLmFnZ3IpIHtcbiAgICAgIG9iai5hZ2dyID0gZmllbGQuYWdnclxuICAgIH1cbiAgICBpZiAoZmllbGQuYmluKSB7XG4gICAgICBvYmouYmluU2l6ZSA9IHV0aWwuZ2V0YmlucyhzdGF0c1tmaWVsZC5uYW1lXSkuc3RlcDtcbiAgICB9XG4gICAgZmllbGRzLnB1c2gob2JqKTtcbiAgfSk7XG5cbiAgdmFyIHF1ZXJ5ID0ge1xuICAgIHRhYmxlOiBlbmNvZGluZy5jb25maWcoXCJ2ZWdhU2VydmVyVGFibGVcIiksXG4gICAgZmllbGRzOiBmaWVsZHNcbiAgfVxuXG4gIHJldHVybiBlbmNvZGluZy5jb25maWcoXCJ2ZWdhU2VydmVyVXJsXCIpICsgXCIvcXVlcnkvP3E9XCIgKyBKU09OLnN0cmluZ2lmeShxdWVyeSlcbn07XG5cbm1vZHVsZS5leHBvcnRzLmdldFN0YXRzID0gZnVuY3Rpb24oZGF0YSl7IC8vIGhhY2tcbiAgdmFyIHN0YXRzID0ge307XG4gIHZhciBmaWVsZHMgPSB1dGlsLmtleXMoZGF0YVswXSk7XG5cbiAgZmllbGRzLmZvckVhY2goZnVuY3Rpb24oaykge1xuICAgIHZhciBzdGF0ID0gdXRpbC5taW5tYXgoZGF0YSwgayk7XG4gICAgc3RhdC5jYXJkaW5hbGl0eSA9IHV0aWwudW5pcShkYXRhLCBrKTtcblxuICAgIHZhciBpPTAsIGRhdHVtID0gZGF0YVtpXVtrXTtcbiAgICB3aGlsZShkYXR1bSA9PT0gXCJcIiB8fCBkYXR1bSA9PT0gbnVsbCB8fCBkYXR1bSA9PT0gdW5kZWZpbmVkKXtcbiAgICAgIGRhdHVtID0gZGF0YVsrK2ldW2tdO1xuICAgIH1cblxuICAgIC8vVE9ETyhrYW5pdHcpOiBiZXR0ZXIgdHlwZSBpbmZlcmVuY2UgaGVyZVxuICAgIHN0YXQudHlwZSA9ICh0eXBlb2YgZGF0dW0gPT09IFwibnVtYmVyXCIpID8gXCJRXCIgOlxuICAgICAgaXNOYU4oRGF0ZS5wYXJzZShkYXR1bSkpID8gXCJPXCIgOiBcIlRcIjtcbiAgICBzdGF0LmNvdW50ID0gZGF0YS5sZW5ndGg7XG4gICAgc3RhdHNba10gPSBzdGF0O1xuICB9KTtcbiAgcmV0dXJuIHN0YXRzO1xufTtcbiIsIi8vIGRlY2xhcmUgZ2xvYmFsIGNvbnN0YW50XG52YXIgZyA9IGdsb2JhbCB8fCB3aW5kb3c7XG5cbmcuVEFCTEUgPSBcInRhYmxlXCI7XG5nLlNUQUNLRUQgPSBcInN0YWNrZWRcIjtcbmcuSU5ERVggPSBcImluZGV4XCI7XG5cbmcuWCA9IFwieFwiO1xuZy5ZID0gXCJ5XCI7XG5nLlJPVyA9IFwicm93XCI7XG5nLkNPTCA9IFwiY29sXCI7XG5nLlNJWkUgPSBcInNpemVcIjtcbmcuU0hBUEUgPSBcInNoYXBlXCI7XG5nLkNPTE9SID0gXCJjb2xvclwiO1xuZy5BTFBIQSA9IFwiYWxwaGFcIjtcbmcuVEVYVCA9IFwidGV4dFwiO1xuXG5nLk8gPSAxO1xuZy5RID0gMjtcbmcuVCA9IDQ7XG5cbi8vVE9ETyByZWZhY3RvciB0aGlzIHRvIGJlIGNvbmZpZz9cbmcuTUFYX0JJTlMgPSAyMDsiLCJ2YXIgZ2xvYmFsID0gcmVxdWlyZSgnLi9nbG9iYWxzJyk7XG5cbnZhciBsZWdlbmRzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxubGVnZW5kcy5kZWZzID0gZnVuY3Rpb24oZW5jb2RpbmcpIHtcbiAgdmFyIGxlZ2VuZHMgPSBbXTtcblxuICAvLyBUT0RPOiBzdXBwb3J0IGFscGhhXG5cbiAgaWYgKGVuY29kaW5nLmhhcyhDT0xPUikgJiYgZW5jb2RpbmcubGVnZW5kKENPTE9SKSkge1xuICAgIGxlZ2VuZHMucHVzaCh7XG4gICAgICBmaWxsOiBDT0xPUixcbiAgICAgIHRpdGxlOiBlbmNvZGluZy5maWVsZFRpdGxlKENPTE9SKSxcbiAgICAgIG9yaWVudDogXCJyaWdodFwiXG4gICAgfSk7XG4gIH1cblxuICBpZiAoZW5jb2RpbmcuaGFzKFNJWkUpICYmIGVuY29kaW5nLmxlZ2VuZChTSVpFKSkge1xuICAgIGxlZ2VuZHMucHVzaCh7XG4gICAgICBzaXplOiBTSVpFLFxuICAgICAgdGl0bGU6IGVuY29kaW5nLmZpZWxkVGl0bGUoU0laRSksXG4gICAgICBvcmllbnQ6IGxlZ2VuZHMubGVuZ3RoID09PSAxID8gXCJsZWZ0XCIgOiBcInJpZ2h0XCJcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChlbmNvZGluZy5oYXMoU0hBUEUpICYmIGVuY29kaW5nLmxlZ2VuZChTSEFQRSkpIHtcbiAgICBpZiAobGVnZW5kcy5sZW5ndGggPT09IDIpIHtcbiAgICAgIC8vIFRPRE86IGZpeCB0aGlzXG4gICAgICBjb25zb2xlLmVycm9yKFwiVmVnYWxpdGUgY3VycmVudGx5IG9ubHkgc3VwcG9ydHMgdHdvIGxlZ2VuZHNcIik7XG4gICAgICByZXR1cm4gbGVnZW5kcztcbiAgICB9XG4gICAgbGVnZW5kcy5wdXNoKHtcbiAgICAgIHNoYXBlOiBTSEFQRSxcbiAgICAgIHRpdGxlOiBlbmNvZGluZy5maWVsZFRpdGxlKFNIQVBFKSxcbiAgICAgIG9yaWVudDogbGVnZW5kcy5sZW5ndGggPT09IDEgPyBcImxlZnRcIiA6IFwicmlnaHRcIlxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGxlZ2VuZHM7XG59IiwidmFyIGdsb2JhbHMgPSByZXF1aXJlKFwiLi9nbG9iYWxzXCIpLFxuICB1dGlsID0gcmVxdWlyZShcIi4vdXRpbFwiKTtcblxudmFyIG1hcmtzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxubWFya3MuYmFyID0ge1xuICB0eXBlOiBcInJlY3RcIixcbiAgc3RhY2s6IHRydWUsXG4gIHByb3A6IGJhcl9wcm9wcyxcbiAgcmVxdWlyZWRFbmNvZGluZzogW1wieFwiLCBcInlcIl0sXG4gIHN1cHBvcnRlZEVuY29kaW5nOiB7cm93OjEsIGNvbDoxLCB4OjEsIHk6MSwgc2l6ZToxLCBjb2xvcjoxLCBhbHBoYToxfVxufTtcblxubWFya3MubGluZSA9IHtcbiAgdHlwZTogXCJsaW5lXCIsXG4gIGxpbmU6IHRydWUsXG4gIHByb3A6IGxpbmVfcHJvcHMsXG4gIHJlcXVpcmVkRW5jb2Rpbmc6IFtcInhcIiwgXCJ5XCJdLFxuICBzdXBwb3J0ZWRFbmNvZGluZzoge3JvdzoxLCBjb2w6MSwgeDoxLCB5OjEsIGNvbG9yOjEsIGFscGhhOjF9XG59O1xuXG5tYXJrcy5hcmVhID0ge1xuICB0eXBlOiBcImFyZWFcIixcbiAgc3RhY2s6IHRydWUsXG4gIGxpbmU6IHRydWUsXG4gIHJlcXVpcmVkRW5jb2Rpbmc6IFtcInhcIiwgXCJ5XCJdLFxuICBwcm9wOiBhcmVhX3Byb3BzLFxuICBzdXBwb3J0ZWRFbmNvZGluZzogbWFya3MubGluZS5zdXBwb3J0ZWRFbmNvZGluZ1xufTtcblxubWFya3MuY2lyY2xlID0ge1xuICB0eXBlOiBcInN5bWJvbFwiLFxuICBwcm9wOiBmaWxsZWRfcG9pbnRfcHJvcHMoXCJjaXJjbGVcIiksXG4gIHN1cHBvcnRlZEVuY29kaW5nOiB7cm93OjEsIGNvbDoxLCB4OjEsIHk6MSwgc2l6ZToxLCBjb2xvcjoxLCBhbHBoYToxfVxufTtcblxubWFya3Muc3F1YXJlID0ge1xuICB0eXBlOiBcInN5bWJvbFwiLFxuICBwcm9wOiBmaWxsZWRfcG9pbnRfcHJvcHMoXCJzcXVhcmVcIiksXG4gIHN1cHBvcnRlZEVuY29kaW5nOiBtYXJrcy5jaXJjbGUuc3VwcG9ydGVkRW5jb2Rpbmdcbn07XG5cbm1hcmtzLnBvaW50ID0ge1xuICB0eXBlOiBcInN5bWJvbFwiLFxuICBwcm9wOiBwb2ludF9wcm9wcyxcbiAgc3VwcG9ydGVkRW5jb2Rpbmc6IHtyb3c6MSwgY29sOjEsIHg6MSwgeToxLCBzaXplOjEsIGNvbG9yOjEsIGFscGhhOjEsIHNoYXBlOjF9XG59O1xuXG5tYXJrcy50ZXh0ID0ge1xuICB0eXBlOiBcInRleHRcIixcbiAgcHJvcDogdGV4dF9wcm9wcyxcbiAgcmVxdWlyZWRFbmNvZGluZzogW1widGV4dFwiXSxcbiAgc3VwcG9ydGVkRW5jb2Rpbmc6IHtyb3c6MSwgY29sOjEsIHNpemU6MSwgY29sb3I6MSwgYWxwaGE6MSwgdGV4dDoxfVxufTtcblxuZnVuY3Rpb24gYmFyX3Byb3BzKGUpIHtcbiAgdmFyIHAgPSB7fTtcblxuICAvLyB4XG4gIGlmIChlLmlzVHlwZShYLFF8VCkgJiYgIWUuYmluKFgpKSB7XG4gICAgcC54ID0ge3NjYWxlOiBYLCBmaWVsZDogZS5maWVsZChYKX07XG4gICAgaWYgKGUuaGFzKFkpICYmICghZS5pc1R5cGUoWSxRfFQpIHx8IGUuYmluKFkpKSkge1xuICAgICAgcC54MiA9IHtzY2FsZTogWCwgdmFsdWU6IDB9O1xuICAgIH1cbiAgfSBlbHNlIGlmIChlLmhhcyhYKSkge1xuICAgIHAueGMgPSB7c2NhbGU6IFgsIGZpZWxkOiBlLmZpZWxkKFgpfTtcbiAgfSBlbHNlIHtcbiAgICBwLnhjID0ge3ZhbHVlOiAwfTtcbiAgfVxuXG4gIC8vIHlcbiAgaWYgKGUuaXNUeXBlKFksUXxUKSAmJiAhZS5iaW4oWSkpIHtcbiAgICBwLnkgPSB7c2NhbGU6IFksIGZpZWxkOiBlLmZpZWxkKFkpfTtcbiAgICBwLnkyID0ge3NjYWxlOiBZLCB2YWx1ZTogMH07XG4gIH0gZWxzZSBpZiAoZS5oYXMoWSkpIHtcbiAgICBwLnljID0ge3NjYWxlOiBZLCBmaWVsZDogZS5maWVsZChZKX07XG4gIH0gZWxzZSB7XG4gICAgcC55YyA9IHtncm91cDogXCJoZWlnaHRcIn07XG4gIH1cblxuICAvLyB3aWR0aFxuICBpZiAoIWUuaXNUeXBlKFgsUXxUKSkge1xuICAgIGlmIChlLmhhcyhTSVpFKSkge1xuICAgICAgcC53aWR0aCA9IHtzY2FsZTogU0laRSwgZmllbGQ6IGUuZmllbGQoU0laRSl9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBwLndpZHRoID0ge3NjYWxlOiBYLCBiYW5kOiB0cnVlLCBvZmZzZXQ6IC0xfTtcbiAgICAgIHAud2lkdGggPSB7dmFsdWU6ICtlLmNvbmZpZyhcImJhbmRTaXplXCIpLCBvZmZzZXQ6IC0xfTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoIWUuaXNUeXBlKFksTykgJiYgIWUuYmluKFkpKSB7XG4gICAgcC53aWR0aCA9IHt2YWx1ZTogK2UuY29uZmlnKFwiYmFuZFNpemVcIiksIG9mZnNldDogLTF9O1xuICB9XG5cbiAgLy8gaGVpZ2h0XG4gIGlmICghZS5pc1R5cGUoWSxRfFQpKSB7XG4gICAgaWYgKGUuaGFzKFNJWkUpKSB7XG4gICAgICBwLmhlaWdodCA9IHtzY2FsZTogU0laRSwgZmllbGQ6IGUuZmllbGQoU0laRSl9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBwLmhlaWdodCA9IHtzY2FsZTogWSwgYmFuZDogdHJ1ZSwgb2Zmc2V0OiAtMX07XG4gICAgICBwLmhlaWdodCA9IHt2YWx1ZTogK2UuY29uZmlnKFwiYmFuZFNpemVcIiksIG9mZnNldDogLTF9O1xuICAgIH1cbiAgfSBlbHNlIGlmICghZS5pc1R5cGUoWCxPKSAmJiAhZS5iaW4oWCkpIHtcbiAgICBwLmhlaWdodCA9IHt2YWx1ZTogK2UuY29uZmlnKFwiYmFuZFNpemVcIiksIG9mZnNldDogLTF9O1xuICB9XG5cbiAgLy8gZmlsbFxuICBpZiAoZS5oYXMoQ09MT1IpKSB7XG4gICAgcC5maWxsID0ge3NjYWxlOiBDT0xPUiwgZmllbGQ6IGUuZmllbGQoQ09MT1IpfTtcbiAgfSBlbHNlIGlmICghZS5oYXMoQ09MT1IpKSB7XG4gICAgcC5maWxsID0ge3ZhbHVlOiBlLmNvbmZpZyhcImNvbG9yXCIpfTtcbiAgfVxuXG4gIC8vIGFscGhhXG4gIGlmIChlLmhhcyhBTFBIQSkpIHtcbiAgICBwLm9wYWNpdHkgPSB7c2NhbGU6IEFMUEhBLCBmaWVsZDogZS5maWVsZChBTFBIQSl9O1xuICB9XG5cbiAgcmV0dXJuIHA7XG59XG5cbmZ1bmN0aW9uIHBvaW50X3Byb3BzKGUsIG9wdCkge1xuICB2YXIgcCA9IHt9O1xuICBvcHQgPSBvcHQgfHwge307XG5cbiAgLy8geFxuICBpZiAoZS5oYXMoWCkpIHtcbiAgICBwLnggPSB7c2NhbGU6IFgsIGZpZWxkOiBlLmZpZWxkKFgpfTtcbiAgfSBlbHNlIGlmICghZS5oYXMoWCkpIHtcbiAgICBwLnggPSB7dmFsdWU6IGUuY29uZmlnKFwiYmFuZFNpemVcIikvMn07XG4gIH1cblxuICAvLyB5XG4gIGlmIChlLmhhcyhZKSkge1xuICAgIHAueSA9IHtzY2FsZTogWSwgZmllbGQ6IGUuZmllbGQoWSl9O1xuICB9IGVsc2UgaWYgKCFlLmhhcyhZKSkge1xuICAgIHAueSA9IHt2YWx1ZTogZS5jb25maWcoXCJiYW5kU2l6ZVwiKS8yfTtcbiAgfVxuXG4gIC8vIHNpemVcbiAgaWYgKGUuaGFzKFNJWkUpKSB7XG4gICAgcC5zaXplID0ge3NjYWxlOiBTSVpFLCBmaWVsZDogZS5maWVsZChTSVpFKX07XG4gIH0gZWxzZSBpZiAoIWUuaGFzKFNJWkUpKSB7XG4gICAgcC5zaXplID0ge3ZhbHVlOiBlLmNvbmZpZyhcInBvaW50U2l6ZVwiKX07XG4gIH1cblxuICAvLyBzaGFwZVxuICBpZiAoZS5oYXMoU0hBUEUpKSB7XG4gICAgcC5zaGFwZSA9IHtzY2FsZTogU0hBUEUsIGZpZWxkOiBlLmZpZWxkKFNIQVBFKX07XG4gIH0gZWxzZSBpZiAoIWUuaGFzKFNIQVBFKSkge1xuICAgIHAuc2hhcGUgPSB7dmFsdWU6IGUuY29uZmlnKFwicG9pbnRTaGFwZVwiKX07XG4gIH1cblxuICAvLyBzdHJva2VcbiAgaWYgKGUuaGFzKENPTE9SKSkge1xuICAgIHAuc3Ryb2tlID0ge3NjYWxlOiBDT0xPUiwgZmllbGQ6IGUuZmllbGQoQ09MT1IpfTtcbiAgfSBlbHNlIGlmICghZS5oYXMoQ09MT1IpKSB7XG4gICAgcC5zdHJva2UgPSB7dmFsdWU6IGUuY29uZmlnKFwiY29sb3JcIil9O1xuICB9XG5cbiAgLy8gYWxwaGFcbiAgaWYgKGUuaGFzKEFMUEhBKSkge1xuICAgIHAub3BhY2l0eSA9IHtzY2FsZTogQUxQSEEsIGZpZWxkOiBlLmZpZWxkKEFMUEhBKX07XG4gIH1lbHNle1xuICAgIHAub3BhY2l0eSA9IHtcbiAgICAgIHZhbHVlOiBlLmNvbmZpZyhcIm9wYWNpdHlcIikgfHwgZS5jb25maWcob3B0Lmhhc0FnZ3JlZ2F0ZSA/IFwiX3RoaWNrT3BhY2l0eVwiIDogXCJfdGhpbk9wYWNpdHlcIilcbiAgICB9O1xuICB9XG5cbiAgcC5zdHJva2VXaWR0aCA9IHt2YWx1ZTogZS5jb25maWcoXCJzdHJva2VXaWR0aFwiKX07XG5cbiAgcmV0dXJuIHA7XG59XG5cbmZ1bmN0aW9uIGxpbmVfcHJvcHMoZSkge1xuICB2YXIgcCA9IHt9O1xuXG4gIC8vIHhcbiAgaWYgKGUuaGFzKFgpKSB7XG4gICAgcC54ID0ge3NjYWxlOiBYLCBmaWVsZDogZS5maWVsZChYKX07XG4gIH0gZWxzZSBpZiAoIWUuaGFzKFgpKSB7XG4gICAgcC54ID0ge3ZhbHVlOiAwfTtcbiAgfVxuXG4gIC8vIHlcbiAgaWYgKGUuaGFzKFkpKSB7XG4gICAgcC55ID0ge3NjYWxlOiBZLCBmaWVsZDogZS5maWVsZChZKX07XG4gIH0gZWxzZSBpZiAoIWUuaGFzKFkpKSB7XG4gICAgcC55ID0ge2dyb3VwOiBcImhlaWdodFwifTtcbiAgfVxuXG4gIC8vIHN0cm9rZVxuICBpZiAoZS5oYXMoQ09MT1IpKSB7XG4gICAgcC5zdHJva2UgPSB7c2NhbGU6IENPTE9SLCBmaWVsZDogZS5maWVsZChDT0xPUil9O1xuICB9IGVsc2UgaWYgKCFlLmhhcyhDT0xPUikpIHtcbiAgICBwLnN0cm9rZSA9IHt2YWx1ZTogZS5jb25maWcoXCJjb2xvclwiKX07XG4gIH1cblxuICAvLyBhbHBoYVxuICBpZiAoZS5oYXMoQUxQSEEpKSB7XG4gICAgcC5vcGFjaXR5ID0ge3NjYWxlOiBBTFBIQSwgZmllbGQ6IGUuZmllbGQoQUxQSEEpfTtcbiAgfVxuXG4gIHAuc3Ryb2tlV2lkdGggPSB7dmFsdWU6IGUuY29uZmlnKFwic3Ryb2tlV2lkdGhcIil9O1xuXG4gIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiBhcmVhX3Byb3BzKGUpIHtcbiAgdmFyIHAgPSB7fTtcblxuICAvLyB4XG4gIGlmIChlLmlzVHlwZShYLFF8VCkpIHtcbiAgICBwLnggPSB7c2NhbGU6IFgsIGZpZWxkOiBlLmZpZWxkKFgpfTtcbiAgICBpZiAoIWUuaXNUeXBlKFksUXxUKSAmJiBlLmhhcyhZKSkge1xuICAgICAgcC54MiA9IHtzY2FsZTogWCwgdmFsdWU6IDB9O1xuICAgICAgcC5vcmllbnQgPSB7dmFsdWU6IFwiaG9yaXpvbnRhbFwifTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoZS5oYXMoWCkpIHtcbiAgICBwLnggPSB7c2NhbGU6IFgsIGZpZWxkOiBlLmZpZWxkKFgpfTtcbiAgfSBlbHNlIHtcbiAgICBwLnggPSB7dmFsdWU6IDB9O1xuICB9XG5cbiAgLy8geVxuICBpZiAoZS5pc1R5cGUoWSxRfFQpKSB7XG4gICAgcC55ID0ge3NjYWxlOiBZLCBmaWVsZDogZS5maWVsZChZKX07XG4gICAgcC55MiA9IHtzY2FsZTogWSwgdmFsdWU6IDB9O1xuICB9IGVsc2UgaWYgKGUuaGFzKFkpKSB7XG4gICAgcC55ID0ge3NjYWxlOiBZLCBmaWVsZDogZS5maWVsZChZKX07XG4gIH0gZWxzZSB7XG4gICAgcC55ID0ge2dyb3VwOiBcImhlaWdodFwifTtcbiAgfVxuXG4gIC8vIHN0cm9rZVxuICBpZiAoZS5oYXMoQ09MT1IpKSB7XG4gICAgcC5maWxsID0ge3NjYWxlOiBDT0xPUiwgZmllbGQ6IGUuZmllbGQoQ09MT1IpfTtcbiAgfSBlbHNlIGlmICghZS5oYXMoQ09MT1IpKSB7XG4gICAgcC5maWxsID0ge3ZhbHVlOiBlLmNvbmZpZyhcImNvbG9yXCIpfTtcbiAgfVxuXG4gIC8vIGFscGhhXG4gIGlmIChlLmhhcyhBTFBIQSkpIHtcbiAgICBwLm9wYWNpdHkgPSB7c2NhbGU6IEFMUEhBLCBmaWVsZDogZS5maWVsZChBTFBIQSl9O1xuICB9XG5cbiAgcmV0dXJuIHA7XG59XG5cbmZ1bmN0aW9uIGZpbGxlZF9wb2ludF9wcm9wcyhzaGFwZSkge1xuICByZXR1cm4gZnVuY3Rpb24oZSwgb3B0KSB7XG4gICAgdmFyIHAgPSB7fTtcbiAgICBvcHQgPSBvcHQgfHwge307XG5cbiAgICAvLyB4XG4gICAgaWYgKGUuaGFzKFgpKSB7XG4gICAgICBwLnggPSB7c2NhbGU6IFgsIGZpZWxkOiBlLmZpZWxkKFgpfTtcbiAgICB9IGVsc2UgaWYgKCFlLmhhcyhYKSkge1xuICAgICAgcC54ID0ge3ZhbHVlOiBlLmNvbmZpZyhcImJhbmRTaXplXCIpLzJ9O1xuICAgIH1cblxuICAgIC8vIHlcbiAgICBpZiAoZS5oYXMoWSkpIHtcbiAgICAgIHAueSA9IHtzY2FsZTogWSwgZmllbGQ6IGUuZmllbGQoWSl9O1xuICAgIH0gZWxzZSBpZiAoIWUuaGFzKFkpKSB7XG4gICAgICBwLnkgPSB7dmFsdWU6IGUuY29uZmlnKFwiYmFuZFNpemVcIikvMn07XG4gICAgfVxuXG4gICAgLy8gc2l6ZVxuICAgIGlmIChlLmhhcyhTSVpFKSkge1xuICAgICAgcC5zaXplID0ge3NjYWxlOiBTSVpFLCBmaWVsZDogZS5maWVsZChTSVpFKX07XG4gICAgfSBlbHNlIGlmICghZS5oYXMoWCkpIHtcbiAgICAgIHAuc2l6ZSA9IHt2YWx1ZTogZS5jb25maWcoXCJwb2ludFNpemVcIil9O1xuICAgIH1cblxuICAgIC8vIHNoYXBlXG4gICAgcC5zaGFwZSA9IHt2YWx1ZTogc2hhcGV9O1xuXG4gICAgLy8gZmlsbFxuICAgIGlmIChlLmhhcyhDT0xPUikpIHtcbiAgICAgIHAuZmlsbCA9IHtzY2FsZTogQ09MT1IsIGZpZWxkOiBlLmZpZWxkKENPTE9SKX07XG4gICAgfSBlbHNlIGlmICghZS5oYXMoQ09MT1IpKSB7XG4gICAgICBwLmZpbGwgPSB7dmFsdWU6IGUuY29uZmlnKFwiY29sb3JcIil9O1xuICAgIH1cblxuICAgIC8vIGFscGhhXG4gICAgaWYgKGUuaGFzKEFMUEhBKSkge1xuICAgICAgcC5vcGFjaXR5ID0ge3NjYWxlOiBBTFBIQSwgZmllbGQ6IGUuZmllbGQoQUxQSEEpfTtcbiAgICB9ZWxzZSB7XG4gICAgICBwLm9wYWNpdHkgPSB7XG4gICAgICAgIHZhbHVlOiBlLmNvbmZpZyhcIm9wYWNpdHlcIikgfHwgZS5jb25maWcob3B0Lmhhc0FnZ3JlZ2F0ZSA/IFwiX3RoaWNrT3BhY2l0eVwiIDogXCJfdGhpbk9wYWNpdHlcIilcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHA7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRleHRfcHJvcHMoZSkge1xuICB2YXIgcCA9IHt9O1xuXG4gIC8vIHhcbiAgaWYgKGUuaGFzKFgpKSB7XG4gICAgcC54ID0ge3NjYWxlOiBYLCBmaWVsZDogZS5maWVsZChYKX07XG4gIH0gZWxzZSBpZiAoIWUuaGFzKFgpKSB7XG4gICAgcC54ID0ge3ZhbHVlOiBlLmNvbmZpZyhcImJhbmRTaXplXCIpLzJ9O1xuICB9XG5cbiAgLy8geVxuICBpZiAoZS5oYXMoWSkpIHtcbiAgICBwLnkgPSB7c2NhbGU6IFksIGZpZWxkOiBlLmZpZWxkKFkpfTtcbiAgfSBlbHNlIGlmICghZS5oYXMoWSkpIHtcbiAgICBwLnkgPSB7dmFsdWU6IGUuY29uZmlnKFwiYmFuZFNpemVcIikvMn07XG4gIH1cblxuICAvLyBzaXplXG4gIGlmIChlLmhhcyhTSVpFKSkge1xuICAgIHAuZm9udFNpemUgPSB7c2NhbGU6IFNJWkUsIGZpZWxkOiBlLmZpZWxkKFNJWkUpfTtcbiAgfSBlbHNlIGlmICghZS5oYXMoWCkpIHtcbiAgICBwLmZvbnRTaXplID0ge3ZhbHVlOiBlLmNvbmZpZyhcImZvbnRTaXplXCIpfTtcbiAgfVxuXG4gIC8vIGZpbGxcbiAgaWYgKGUuaGFzKENPTE9SKSkge1xuICAgIHAuZmlsbCA9IHtzY2FsZTogQ09MT1IsIGZpZWxkOiBlLmZpZWxkKENPTE9SKX07XG4gIH0gZWxzZSBpZiAoIWUuaGFzKENPTE9SKSkge1xuICAgIHAuZmlsbCA9IHt2YWx1ZTogZS5jb25maWcoXCJ0ZXh0Q29sb3JcIil9O1xuICB9XG5cbiAgLy8gYWxwaGFcbiAgaWYgKGUuaGFzKEFMUEhBKSkge1xuICAgIHAub3BhY2l0eSA9IHtzY2FsZTogQUxQSEEsIGZpZWxkOiBlLmZpZWxkKEFMUEhBKX07XG4gIH1cblxuICAvLyB0ZXh0XG4gIGlmIChlLmhhcyhURVhUKSkge1xuICAgIHAudGV4dCA9IHtmaWVsZDogZS5maWVsZChURVhUKX07XG4gIH0gZWxzZSB7XG4gICAgcC50ZXh0ID0ge3ZhbHVlOiBcIkFiY1wifTtcbiAgfVxuXG4gIHAuZm9udCA9IHt2YWx1ZTogZS5jb25maWcoXCJmb250XCIpfTtcbiAgcC5mb250V2VpZ2h0ID0ge3ZhbHVlOiBlLmNvbmZpZyhcImZvbnRXZWlnaHRcIil9O1xuICBwLmZvbnRTdHlsZSA9IHt2YWx1ZTogZS5jb25maWcoXCJmb250U3R5bGVcIil9O1xuICBwLmJhc2VsaW5lID0ge3ZhbHVlOiBlLmNvbmZpZyhcInRleHRCYXNlbGluZVwiKX07XG5cbiAgLy8gYWxpZ25cbiAgaWYgKGUuaGFzKFgpKSB7XG4gICAgaWYgKGUuaXNUeXBlKFgsTykpIHtcbiAgICAgIHAuYWxpZ24gPSB7dmFsdWU6IFwibGVmdFwifTtcbiAgICAgIHAuZHggPSB7dmFsdWU6IGUuY29uZmlnKFwidGV4dE1hcmdpblwiKX07XG4gICAgfSBlbHNlIHtcbiAgICAgIHAuYWxpZ24gPSB7dmFsdWU6IFwiY2VudGVyXCJ9XG4gICAgfVxuICB9IGVsc2UgaWYgKGUuaGFzKFkpKSB7XG4gICAgcC5hbGlnbiA9IHt2YWx1ZTogXCJsZWZ0XCJ9O1xuICAgIHAuZHggPSB7dmFsdWU6IGUuY29uZmlnKFwidGV4dE1hcmdpblwiKX07XG4gIH0gZWxzZSB7XG4gICAgcC5hbGlnbiA9IHt2YWx1ZTogZS5jb25maWcoXCJ0ZXh0QWxpZ25cIil9O1xuICB9XG5cbiAgcmV0dXJuIHA7XG59IiwidmFyIGdsb2JhbHMgPSByZXF1aXJlKFwiLi9nbG9iYWxzXCIpLFxuICB1dGlsID0gcmVxdWlyZShcIi4vdXRpbFwiKTtcblxudmFyIHNjYWxlID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuc2NhbGUubmFtZXMgPSBmdW5jdGlvbiAocHJvcHMpIHtcbiAgcmV0dXJuIHV0aWwua2V5cyh1dGlsLmtleXMocHJvcHMpLnJlZHVjZShmdW5jdGlvbihhLCB4KSB7XG4gICAgaWYgKHByb3BzW3hdICYmIHByb3BzW3hdLnNjYWxlKSBhW3Byb3BzW3hdLnNjYWxlXSA9IDE7XG4gICAgcmV0dXJuIGE7XG4gIH0sIHt9KSk7XG59XG5cbnNjYWxlLmRlZnMgPSBmdW5jdGlvbiAobmFtZXMsIGVuY29kaW5nLCBvcHQpIHtcbiAgb3B0ID0gb3B0IHx8IHt9O1xuXG4gIHJldHVybiBuYW1lcy5yZWR1Y2UoZnVuY3Rpb24oYSwgbmFtZSkge1xuICAgIHZhciBzID0ge1xuICAgICAgbmFtZTogbmFtZSxcbiAgICAgIHR5cGU6IHNjYWxlX3R5cGUobmFtZSwgZW5jb2RpbmcpLFxuICAgICAgZG9tYWluOiBzY2FsZV9kb21haW4obmFtZSwgZW5jb2RpbmcsIG9wdClcbiAgICB9O1xuICAgIGlmIChzLnR5cGUgPT09IFwib3JkaW5hbFwiICYmICFlbmNvZGluZy5iaW4obmFtZSkpIHtcbiAgICAgIHMuc29ydCA9IHRydWU7XG4gICAgfVxuXG4gICAgc2NhbGVfcmFuZ2UocywgZW5jb2RpbmcsIG9wdCk7XG5cbiAgICByZXR1cm4gKGEucHVzaChzKSwgYSk7XG4gIH0sIFtdKTtcbn1cblxuZnVuY3Rpb24gc2NhbGVfdHlwZShuYW1lLCBlbmNvZGluZykge1xuICBzd2l0Y2ggKGVuY29kaW5nLnR5cGUobmFtZSkpIHtcbiAgICBjYXNlIE86IHJldHVybiBcIm9yZGluYWxcIjtcbiAgICBjYXNlIFQ6XG4gICAgICBpZiAoZW5jb2RpbmcuZm4obmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIFwibGluZWFyXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gXCJ0aW1lXCI7XG4gICAgY2FzZSBROlxuICAgICAgaWYgKGVuY29kaW5nLmJpbihuYW1lKSkge1xuICAgICAgICByZXR1cm4gXCJvcmRpbmFsXCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gZW5jb2Rpbmcuc2NhbGUobmFtZSkudHlwZSB8fCBcImxpbmVhclwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNjYWxlX2RvbWFpbihuYW1lLCBlbmNvZGluZywgb3B0KSB7XG4gIGlmIChlbmNvZGluZy50eXBlKG5hbWUpID09PSBUKXtcbiAgICBzd2l0Y2goZW5jb2RpbmcuZm4obmFtZSkpe1xuICAgICAgY2FzZSBcInNlY29uZFwiOlxuICAgICAgY2FzZSBcIm1pbnV0ZVwiOiByZXR1cm4gWzAsIDU5XTtcbiAgICAgIGNhc2UgXCJob3VyXCI6IHJldHVybiBbMCwgMjNdO1xuICAgICAgY2FzZSBcImRheVwiOiByZXR1cm4gWzAsIDZdO1xuICAgICAgY2FzZSBcImRhdGVcIjogcmV0dXJuIFsxLCAzMV07XG4gICAgICBjYXNlIFwibW9udGhcIjogcmV0dXJuIFswLCAxMV07XG4gICAgfVxuICB9XG5cbiAgaWYgKGVuY29kaW5nLmJpbihuYW1lKSkge1xuICAgIC8vIFRPRE86IGFkZCBpbmNsdWRlRW1wdHlDb25maWcgaGVyZVxuICAgIGlmIChvcHQuc3RhdHMpIHtcbiAgICAgIHZhciBiaW5zID0gdXRpbC5nZXRiaW5zKG9wdC5zdGF0c1tlbmNvZGluZy5maWVsZE5hbWUobmFtZSldKTtcbiAgICAgIHZhciBkb21haW4gPSB1dGlsLnJhbmdlKGJpbnMuc3RhcnQsIGJpbnMuc3RvcCwgYmlucy5zdGVwKTtcbiAgICAgIHJldHVybiBuYW1lPT09WSA/IGRvbWFpbi5yZXZlcnNlKCkgOiBkb21haW47XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgPT0gb3B0LnN0YWNrID9cbiAgICB7XG4gICAgICBkYXRhOiBTVEFDS0VELFxuICAgICAgZmllbGQ6IFwiZGF0YS5cIiArIChvcHQuZmFjZXQgPyBcIm1heF9cIiA6XCJcIikgKyBcInN1bV9cIiArIGVuY29kaW5nLmZpZWxkKG5hbWUsIHRydWUpXG4gICAgfTpcbiAgICB7ZGF0YTogVEFCTEUsIGZpZWxkOiBlbmNvZGluZy5maWVsZChuYW1lKX07XG59XG5cbmZ1bmN0aW9uIHNjYWxlX3JhbmdlKHMsIGVuY29kaW5nLCBvcHQpIHtcbiAgdmFyIHNwZWMgPSBlbmNvZGluZy5zY2FsZShzLm5hbWUpO1xuICBzd2l0Y2ggKHMubmFtZSkge1xuICAgIGNhc2UgWDpcbiAgICAgIGlmIChlbmNvZGluZy5pc1R5cGUocy5uYW1lLCBPKSB8fCBlbmNvZGluZy5iaW4ocy5uYW1lKSkge1xuICAgICAgICBzLmJhbmRXaWR0aCA9ICtlbmNvZGluZy5jb25maWcoXCJiYW5kU2l6ZVwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMucmFuZ2UgPSBvcHQuY2VsbFdpZHRoID8gWzAsIG9wdC5jZWxsV2lkdGhdIDogXCJ3aWR0aFwiO1xuICAgICAgICAvL1RPRE8gemVybyBhbmQgcmV2ZXJzZSBzaG91bGQgYmVjb21lIGdlbmVyaWMsIGFuZCB3ZSBqdXN0IHJlYWQgZGVmYXVsdCBmcm9tIGVpdGhlciB0aGUgc2NoZW1hIG9yIHRoZSBzY2hlbWEgZ2VuZXJhdG9yXG4gICAgICAgIHMuemVybyA9IHNwZWMuemVybyB8fCBlbmNvZGluZy5jb25maWcoXCJfeFplcm9cIik7XG4gICAgICAgIHMucmV2ZXJzZSA9IHNwZWMucmV2ZXJzZSB8fCBlbmNvZGluZy5jb25maWcoXCJfeFJldmVyc2VcIik7XG4gICAgICB9XG4gICAgICBzLnJvdW5kID0gdHJ1ZTtcbiAgICAgIGlmIChlbmNvZGluZy5pc1R5cGUocy5uYW1lLCBUKSl7XG4gICAgICAgIHMubmljZSA9IGVuY29kaW5nLmFnZ3Iocy5uYW1lKSB8fCBlbmNvZGluZy5jb25maWcoXCJ0aW1lU2NhbGVOaWNlXCIpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHMubmljZSA9IHRydWU7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlIFk6XG4gICAgICBpZiAoZW5jb2RpbmcuaXNUeXBlKHMubmFtZSwgTykgfHwgZW5jb2RpbmcuYmluKHMubmFtZSkpIHtcbiAgICAgICAgcy5iYW5kV2lkdGggPSArZW5jb2RpbmcuY29uZmlnKFwiYmFuZFNpemVcIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzLnJhbmdlID0gb3B0LmNlbGxIZWlnaHQgPyBbb3B0LmNlbGxIZWlnaHQsIDBdIDogXCJoZWlnaHRcIjtcbiAgICAgICAgLy9UT0RPIHplcm8gYW5kIHJldmVyc2Ugc2hvdWxkIGJlY29tZSBnZW5lcmljLCBhbmQgd2UganVzdCByZWFkIGRlZmF1bHQgZnJvbSBlaXRoZXIgdGhlIHNjaGVtYSBvciB0aGUgc2NoZW1hIGdlbmVyYXRvclxuICAgICAgICBzLnplcm8gPSBzcGVjLnplcm8gfHwgZW5jb2RpbmcuY29uZmlnKFwiX3laZXJvXCIpO1xuICAgICAgICBzLnJldmVyc2UgPSBzcGVjLnJldmVyc2UgfHwgZW5jb2RpbmcuY29uZmlnKFwiX3lSZXZlcnNlXCIpO1xuICAgICAgfVxuXG4gICAgICBzLnJvdW5kID0gdHJ1ZTtcblxuICAgICAgaWYgKGVuY29kaW5nLmlzVHlwZShzLm5hbWUsIFQpKXtcbiAgICAgICAgcy5uaWNlID0gZW5jb2RpbmcuYWdncihzLm5hbWUpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHMubmljZSA9IHRydWU7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlIFJPVzpcbiAgICAgIHMuYmFuZFdpZHRoID0gb3B0LmNlbGxIZWlnaHQgfHwgZW5jb2RpbmcuY29uZmlnKFwiY2VsbEhlaWdodFwiKTtcbiAgICAgIHMucm91bmQgPSB0cnVlO1xuICAgICAgcy5uaWNlID0gdHJ1ZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgQ09MOlxuICAgICAgcy5iYW5kV2lkdGggPSBvcHQuY2VsbFdpZHRoIHx8IGVuY29kaW5nLmNvbmZpZyhcImNlbGxXaWR0aFwiKTtcbiAgICAgIHMucm91bmQgPSB0cnVlO1xuICAgICAgcy5uaWNlID0gdHJ1ZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgU0laRTpcbiAgICAgIGlmIChlbmNvZGluZy5pcyhcImJhclwiKSkge1xuICAgICAgICBzLnJhbmdlID0gWzMsICtlbmNvZGluZy5jb25maWcoXCJiYW5kU2l6ZVwiKV07XG4gICAgICB9IGVsc2UgaWYgKGVuY29kaW5nLmlzKFRFWFQpKSB7XG4gICAgICAgIHMucmFuZ2UgPSBbOCwgNDBdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcy5yYW5nZSA9IFsxMCwgMTAwMF07XG4gICAgICB9XG4gICAgICBzLnJvdW5kID0gdHJ1ZTtcbiAgICAgIHMuemVybyA9IGZhbHNlO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBTSEFQRTpcbiAgICAgIHMucmFuZ2UgPSBcInNoYXBlc1wiO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBDT0xPUjpcbiAgICAgIGlmIChlbmNvZGluZy5pc1R5cGUocy5uYW1lLCBPKSkge1xuICAgICAgICBzLnJhbmdlID0gXCJjYXRlZ29yeTEwXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzLnJhbmdlID0gW1wiI2RkZlwiLCBcInN0ZWVsYmx1ZVwiXTtcbiAgICAgICAgcy56ZXJvID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlIEFMUEhBOlxuICAgICAgcy5yYW5nZSA9IFswLjIsIDEuMF07XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBlbmNvZGluZyBuYW1lOiBcIitzLm5hbWUpO1xuICB9XG5cbiAgc3dpdGNoKHMubmFtZSl7XG4gICAgY2FzZSBST1c6XG4gICAgY2FzZSBDT0w6XG4gICAgICBzLnBhZGRpbmcgPSBlbmNvZGluZy5jb25maWcoXCJjZWxsUGFkZGluZ1wiKTtcbiAgICAgIHMub3V0ZXJQYWRkaW5nID0gMDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgWDpcbiAgICBjYXNlIFk6XG4gICAgICBpZiAoZW5jb2RpbmcuaXNUeXBlKHMubmFtZSwgTykgfHwgZW5jb2RpbmcuYmluKHMubmFtZSkgKSB7IC8vJiYgIXMuYmFuZFdpZHRoXG4gICAgICAgIHMucG9pbnRzID0gdHJ1ZTtcbiAgICAgICAgcy5wYWRkaW5nID0gZW5jb2RpbmcuY29uZmlnKFwiYmFuZFBhZGRpbmdcIik7XG4gICAgICB9XG4gIH1cbn0iLCIvLyBEZWZpbmluZyBWZWdhbGl0ZSBFbmNvZGluZydzIHNjaGVtYVxudmFyIHNjaGVtYSA9IG1vZHVsZS5leHBvcnRzID0ge30sXG4gIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuc2NoZW1hLnV0aWwgPSByZXF1aXJlKCcuL3NjaGVtYXV0aWwnKTtcblxuc2NoZW1hLm1hcmt0eXBlID0ge1xuICB0eXBlOiBcInN0cmluZ1wiLFxuICBlbnVtOiBbXCJwb2ludFwiLCBcImJhclwiLCBcImxpbmVcIiwgXCJhcmVhXCIsIFwiY2lyY2xlXCIsIFwic3F1YXJlXCIsIFwidGV4dFwiXVxufTtcblxuc2NoZW1hLmFnZ3IgPSB7XG4gIHR5cGU6IFwic3RyaW5nXCIsXG4gIGVudW06IFtcImF2Z1wiLCBcInN1bVwiLCBcIm1pblwiLCBcIm1heFwiLCBcImNvdW50XCJdLFxuICBzdXBwb3J0ZWRFbnVtczoge1xuICAgIFE6IFtcImF2Z1wiLCBcInN1bVwiLCBcIm1pblwiLCBcIm1heFwiLCBcImNvdW50XCJdLFxuICAgIE86IFtcImNvdW50XCJdLFxuICAgIFQ6IFtcImF2Z1wiLCBcIm1pblwiLCBcIm1heFwiLCBcImNvdW50XCJdLFxuICAgIFwiXCI6IFtcImNvdW50XCJdLFxuICB9LFxuICBzdXBwb3J0ZWRUeXBlczoge1wiUVwiOiB0cnVlLCBcIk9cIjogdHJ1ZSwgXCJUXCI6IHRydWUsIFwiXCI6IHRydWV9XG59O1xuXG5zY2hlbWEudGltZWZucyA9IFtcIm1vbnRoXCIsIFwieWVhclwiLCBcImRheVwiLCBcImRhdGVcIiwgXCJob3VyXCIsIFwibWludXRlXCIsIFwic2Vjb25kXCJdO1xuXG5zY2hlbWEuZm4gPSB7XG4gIHR5cGU6IFwic3RyaW5nXCIsXG4gIGVudW06IHNjaGVtYS50aW1lZm5zLFxuICBzdXBwb3J0ZWRUeXBlczoge1wiVFwiOiB0cnVlfVxufVxuXG4vL1RPRE8oa2FuaXR3KTogYWRkIG90aGVyIHR5cGUgb2YgZnVuY3Rpb24gaGVyZVxuXG5zY2hlbWEuc2NhbGVfdHlwZSA9IHtcbiAgdHlwZTogXCJzdHJpbmdcIixcbiAgZW51bTogW1wibGluZWFyXCIsIFwibG9nXCIsXCJwb3dcIiwgXCJzcXJ0XCIsIFwicXVhbnRpbGVcIl0sXG4gIGRlZmF1bHQ6IFwibGluZWFyXCIsXG4gIHN1cHBvcnRlZFR5cGVzOiB7XCJRXCI6IHRydWV9XG59O1xuXG5zY2hlbWEuZmllbGQgPSB7XG4gIHR5cGU6IFwib2JqZWN0XCIsXG4gIHJlcXVpcmVkOiBbXCJuYW1lXCIsIFwidHlwZVwiXSxcbiAgcHJvcGVydGllczoge1xuICAgIG5hbWU6IHtcbiAgICAgIHR5cGU6IFwic3RyaW5nXCJcbiAgICB9XG4gIH1cbn07XG5cbnZhciBjbG9uZSA9IHV0aWwuZHVwbGljYXRlO1xudmFyIG1lcmdlID0gc2NoZW1hLnV0aWwubWVyZ2U7XG5cbnZhciB0eXBpY2FsRmllbGQgPSBtZXJnZShjbG9uZShzY2hlbWEuZmllbGQpLCB7XG4gIHR5cGU6IFwib2JqZWN0XCIsXG4gIHByb3BlcnRpZXM6IHtcbiAgICB0eXBlOiB7XG4gICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgZW51bTogW1wiT1wiLCBcIlFcIiwgXCJUXCJdXG4gICAgfSxcbiAgICBiaW46IHtcbiAgICAgIHR5cGU6IFwiYm9vbGVhblwiLFxuICAgICAgc3VwcG9ydGVkVHlwZXM6IHtcIlFcIjogdHJ1ZSwgXCJPXCI6IHRydWV9XG4gICAgfSxcbiAgICBhZ2dyOiBzY2hlbWEuYWdncixcbiAgICBmbjogc2NoZW1hLmZuLFxuICAgIHNjYWxlOiB7XG4gICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICB0eXBlOiBzY2hlbWEuc2NhbGVfdHlwZSxcbiAgICAgICAgcmV2ZXJzZTogeyB0eXBlOiBcImJvb2xlYW5cIiwgZGVmYXVsdDogZmFsc2UgfSxcbiAgICAgICAgemVybzoge1xuICAgICAgICAgIHR5cGU6IFwiYm9vbGVhblwiLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkluY2x1ZGUgemVyb1wiLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgIHN1cHBvcnRlZFR5cGVzOiB7XCJRXCI6IHRydWV9XG4gICAgICAgIH0sXG4gICAgICAgIG5pY2U6IHtcbiAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgICAgIGVudW06IFtcInNlY29uZFwiLCBcIm1pbnV0ZVwiLCBcImhvdXJcIiwgXCJkYXlcIiwgXCJ3ZWVrXCIsIFwibW9udGhcIiwgXCJ5ZWFyXCJdLFxuICAgICAgICAgIHN1cHBvcnRlZFR5cGVzOiB7XCJUXCI6IHRydWV9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuXG52YXIgb25seU9yZGluYWxGaWVsZCA9IG1lcmdlKGNsb25lKHNjaGVtYS5maWVsZCksIHtcbiAgdHlwZTogXCJvYmplY3RcIixcbiAgcHJvcGVydGllczoge1xuICAgIHR5cGU6IHtcbiAgICAgIHR5cGU6IFwic3RyaW5nXCIsXG4gICAgICBlbnVtOiBbXCJPXCJdXG4gICAgfSxcbiAgICBiaW46IHtcbiAgICAgIHR5cGU6IFwiYm9vbGVhblwiLFxuICAgICAgc3VwcG9ydGVkVHlwZXM6IHtcIk9cIjogdHJ1ZX1cbiAgICB9LFxuICAgIGFnZ3I6IHtcbiAgICAgIHR5cGU6IFwic3RyaW5nXCIsXG4gICAgICBlbnVtOiBbXCJjb3VudFwiXSxcbiAgICAgIHN1cHBvcnRlZFR5cGVzOiB7XCJPXCI6IHRydWV9XG4gICAgfVxuICB9XG59KTtcblxudmFyIGF4aXNNaXhpbiA9IHtcbiAgdHlwZTogXCJvYmplY3RcIixcbiAgcHJvcGVydGllczoge1xuICAgIGF4aXM6IHtcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGdyaWQ6IHsgdHlwZTogXCJib29sZWFuXCIsIGRlZmF1bHQ6IGZhbHNlIH0sXG4gICAgICAgIHRpdGxlOiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZWZhdWx0OiB0cnVlIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxudmFyIGxlZ2VuZE1peGluID0ge1xuICB0eXBlOiBcIm9iamVjdFwiLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgbGVnZW5kOiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZWZhdWx0OiB0cnVlIH1cbiAgfVxufVxuXG52YXIgdGV4dE1peGluID0ge1xuICB0eXBlOiBcIm9iamVjdFwiLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgdGV4dDoge1xuICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgd2VpZ2h0OiB7XG4gICAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcbiAgICAgICAgICBlbnVtOiBbXCJub3JtYWxcIiwgXCJib2xkXCJdLFxuICAgICAgICAgIGRlZmF1bHQ6IFwibm9ybWFsXCIsXG4gICAgICAgICAgc3VwcG9ydGVkVHlwZXM6IHtcIlRcIjogdHJ1ZX1cbiAgICAgICAgfSxcbiAgICAgICAgc2l6ZToge1xuICAgICAgICAgIHR5cGU6IFwiaW50ZWdlclwiLFxuICAgICAgICAgIGRlZmF1bHQ6IDEwLFxuICAgICAgICAgIG1pbmltdW06IDAsXG4gICAgICAgICAgc3VwcG9ydGVkVHlwZXM6IHtcIlRcIjogdHJ1ZX1cbiAgICAgICAgfSxcbiAgICAgICAgZm9udDoge1xuICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCIsXG4gICAgICAgICAgZGVmYXVsdDogXCJIYWx2ZXRpY2EgTmV1ZVwiLFxuICAgICAgICAgIHN1cHBvcnRlZFR5cGVzOiB7XCJUXCI6IHRydWV9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxudmFyIHggPSBtZXJnZShjbG9uZSh0eXBpY2FsRmllbGQpLCBheGlzTWl4aW4pO1xudmFyIHkgPSBjbG9uZSh4KTtcblxudmFyIHJvdyA9IGNsb25lKG9ubHlPcmRpbmFsRmllbGQpO1xudmFyIGNvbCA9IGNsb25lKHJvdyk7XG5cbnZhciBzaXplID0gbWVyZ2UoY2xvbmUodHlwaWNhbEZpZWxkKSwgbGVnZW5kTWl4aW4pO1xudmFyIGNvbG9yID0gbWVyZ2UoY2xvbmUodHlwaWNhbEZpZWxkKSwgbGVnZW5kTWl4aW4pO1xudmFyIGFscGhhID0gY2xvbmUodHlwaWNhbEZpZWxkKTtcbnZhciBzaGFwZSA9IG1lcmdlKGNsb25lKG9ubHlPcmRpbmFsRmllbGQpLCBsZWdlbmRNaXhpbik7XG5cbnZhciB0ZXh0ID0gbWVyZ2UoY2xvbmUodHlwaWNhbEZpZWxkKSwgdGV4dE1peGluKTtcblxudmFyIGNmZyA9IHtcbiAgdHlwZTogXCJvYmplY3RcIixcbiAgcHJvcGVydGllczoge1xuICAgIGRhdGFGb3JtYXRUeXBlOiB7XG4gICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgZW51bTogW1wianNvblwiLCBcImNzdlwiXVxuICAgIH0sXG4gICAgdXNlVmVnYVNlcnZlcjoge1xuICAgICAgdHlwZTogXCJib29sZWFuXCIsXG4gICAgICBkZWZhdWx0OiBmYWxzZVxuICAgIH0sXG4gICAgZGF0YVVybDoge1xuICAgICAgdHlwZTogXCJzdHJpbmdcIlxuICAgIH0sXG4gICAgdmVnYVNlcnZlclRhYmxlOiB7XG4gICAgICB0eXBlOiBcInN0cmluZ1wiXG4gICAgfSxcbiAgICB2ZWdhU2VydmVyVXJsOiB7XG4gICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgZGVmYXVsdDogXCJodHRwOi8vbG9jYWxob3N0OjMwMDFcIlxuICAgIH1cbiAgfVxufVxuXG5zY2hlbWEuc3BlYyA9IHtcbiAgJHNjaGVtYTogXCJodHRwOi8vanNvbi1zY2hlbWEub3JnL2RyYWZ0LTA0L3NjaGVtYSNcIixcbiAgdHlwZTogXCJvYmplY3RcIixcbiAgcmVxdWlyZWQ6IFtcIm1hcmt0eXBlXCIsIFwiZW5jXCIsIFwiY2ZnXCJdLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgbWFya3R5cGU6IHNjaGVtYS5tYXJrdHlwZSxcbiAgICBlbmM6IHtcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHg6IHgsXG4gICAgICAgIHk6IHksXG4gICAgICAgIHJvdzogcm93LFxuICAgICAgICBjb2w6IGNvbCxcbiAgICAgICAgc2l6ZTogc2l6ZSxcbiAgICAgICAgY29sb3I6IGNvbG9yLFxuICAgICAgICBhbHBoYTogYWxwaGEsXG4gICAgICAgIHNoYXBlOiBzaGFwZSxcbiAgICAgICAgdGV4dDogdGV4dFxuICAgICAgfVxuICAgIH0sXG4gICAgY2ZnOiBjZmdcbiAgfVxufTtcbiIsInZhciB1dGlsID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxudmFyIGlzRW1wdHkgPSBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID09PSAwXG59XG5cbi8vIGluc3RhbnRpYXRlIGEgc2NoZW1hXG51dGlsLmluc3RhbnRpYXRlID0gZnVuY3Rpb24oc2NoZW1hLCByZXF1aXJlZCkge1xuICBpZiAoc2NoZW1hLnR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgc2NoZW1hLnJlcXVpcmVkID0gc2NoZW1hLnJlcXVpcmVkID8gc2NoZW1hLnJlcXVpcmVkIDogW107XG4gICAgdmFyIGluc3RhbmNlID0ge307XG4gICAgZm9yICh2YXIgbmFtZSBpbiBzY2hlbWEucHJvcGVydGllcykge1xuICAgICAgdmFyIGNoaWxkID0gc2NoZW1hLnByb3BlcnRpZXNbbmFtZV07XG4gICAgICBpbnN0YW5jZVtuYW1lXSA9IHV0aWwuaW5zdGFudGlhdGUoY2hpbGQsIHNjaGVtYS5yZXF1aXJlZC5pbmRleE9mKG5hbWUpICE9IC0xKTtcbiAgICB9O1xuICAgIHJldHVybiBpbnN0YW5jZTtcbiAgfSBlbHNlIGlmICgnZGVmYXVsdCcgaW4gc2NoZW1hKSB7XG4gICAgcmV0dXJuIHNjaGVtYS5kZWZhdWx0O1xuICB9IGVsc2UgaWYgKHNjaGVtYS5lbnVtICYmIHJlcXVpcmVkKSB7XG4gICAgcmV0dXJuIHNjaGVtYS5lbnVtWzBdO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG4vLyByZW1vdmUgYWxsIGRlZmF1bHRzIGZyb20gYW4gaW5zdGFuY2VcbnV0aWwuZGlmZmVyZW5jZSA9IGZ1bmN0aW9uKGRlZmF1bHRzLCBpbnN0YW5jZSkge1xuICB2YXIgY2hhbmdlcyA9IHt9O1xuICBmb3IgKHZhciBwcm9wIGluIGluc3RhbmNlKSB7XG4gICAgaWYgKCFkZWZhdWx0cyB8fCBkZWZhdWx0c1twcm9wXSAhPT0gaW5zdGFuY2VbcHJvcF0pIHtcbiAgICAgIGlmICh0eXBlb2YgaW5zdGFuY2VbcHJvcF0gPT0gXCJvYmplY3RcIikge1xuICAgICAgICB2YXIgYyA9IHV0aWwuZGlmZmVyZW5jZShkZWZhdWx0c1twcm9wXSwgaW5zdGFuY2VbcHJvcF0pO1xuICAgICAgICBpZiAoIWlzRW1wdHkoYykpXG4gICAgICAgICAgY2hhbmdlc1twcm9wXSA9IGM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGFuZ2VzW3Byb3BdID0gaW5zdGFuY2VbcHJvcF07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBjaGFuZ2VzO1xufTtcblxuLy8gcmVjdXJzaXZlbHkgbWVyZ2VzIGluc3RhbmNlIGludG8gZGVmYXVsdHNcbnV0aWwubWVyZ2UgPSBmdW5jdGlvbiAoZGVmYXVsdHMsIGluc3RhbmNlKSB7XG4gIGlmICh0eXBlb2YgaW5zdGFuY2UhPT0nb2JqZWN0JyB8fCBpbnN0YW5jZT09PW51bGwpIHtcbiAgICByZXR1cm4gZGVmYXVsdHM7XG4gIH1cblxuICBmb3IgKHZhciBwIGluIGluc3RhbmNlKSB7XG4gICAgaWYgKCFpbnN0YW5jZS5oYXNPd25Qcm9wZXJ0eShwKSlcbiAgICAgIGNvbnRpbnVlO1xuICAgIGlmIChpbnN0YW5jZVtwXT09PXVuZGVmaW5lZCApXG4gICAgICBjb250aW51ZTtcbiAgICBpZiAodHlwZW9mIGluc3RhbmNlW3BdICE9PSAnb2JqZWN0JyB8fCBpbnN0YW5jZVtwXSA9PT0gbnVsbCkge1xuICAgICAgZGVmYXVsdHNbcF0gPSBpbnN0YW5jZVtwXTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZhdWx0c1twXSAhPT0gJ29iamVjdCcgfHwgZGVmYXVsdHNbcF0gPT09IG51bGwpIHtcbiAgICAgIGRlZmF1bHRzW3BdID0gdXRpbC5tZXJnZShpbnN0YW5jZVtwXS5jb25zdHJ1Y3RvciA9PT0gQXJyYXkgPyBbXSA6IHt9LCBpbnN0YW5jZVtwXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHV0aWwubWVyZ2UoZGVmYXVsdHNbcF0sIGluc3RhbmNlW3BdKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRzO1xufVxuIiwidmFyIHV0aWwgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG51dGlsLmtleXMgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBrID0gW10sIHg7XG4gIGZvciAoeCBpbiBvYmopIGsucHVzaCh4KTtcbiAgcmV0dXJuIGs7XG59XG5cbnV0aWwudmFscyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIHYgPSBbXSwgeDtcbiAgZm9yICh4IGluIG9iaikgdi5wdXNoKG9ialt4XSk7XG4gIHJldHVybiB2O1xufVxuXG51dGlsLnJhbmdlID0gZnVuY3Rpb24gKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgIHN0ZXAgPSAxO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgc3RvcCA9IHN0YXJ0O1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgfVxuICBpZiAoKHN0b3AgLSBzdGFydCkgLyBzdGVwID09IEluZmluaXR5KSB0aHJvdyBuZXcgRXJyb3IoXCJpbmZpbml0ZSByYW5nZVwiKTtcbiAgdmFyIHJhbmdlID0gW10sIGkgPSAtMSwgajtcbiAgaWYgKHN0ZXAgPCAwKSB3aGlsZSAoKGogPSBzdGFydCArIHN0ZXAgKiArK2kpID4gc3RvcCkgcmFuZ2UucHVzaChqKTtcbiAgZWxzZSB3aGlsZSAoKGogPSBzdGFydCArIHN0ZXAgKiArK2kpIDwgc3RvcCkgcmFuZ2UucHVzaChqKTtcbiAgcmV0dXJuIHJhbmdlO1xufVxuXG51dGlsLmZpbmQgPSBmdW5jdGlvbiAobGlzdCwgcGF0dGVybikge1xuICB2YXIgbCA9IGxpc3QuZmlsdGVyKGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4geFtwYXR0ZXJuLm5hbWVdID09PSBwYXR0ZXJuLnZhbHVlO1xuICB9KTtcbiAgcmV0dXJuIGwubGVuZ3RoICYmIGxbMF0gfHwgbnVsbDtcbn1cblxudXRpbC51bmlxID0gZnVuY3Rpb24gKGRhdGEsIGZpZWxkKSB7XG4gIHZhciBtYXAgPSB7fSwgY291bnQgPSAwLCBpLCBrO1xuICBmb3IgKGk9MDsgaTxkYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgayA9IGRhdGFbaV1bZmllbGRdO1xuICAgIGlmICghbWFwW2tdKSB7XG4gICAgICBtYXBba10gPSAxO1xuICAgICAgY291bnQgKz0gMTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvdW50O1xufVxuXG51dGlsLm1pbm1heCA9IGZ1bmN0aW9uIChkYXRhLCBmaWVsZCkge1xuICB2YXIgc3RhdHMgPSB7bWluOiArSW5maW5pdHksIG1heDogLUluZmluaXR5fTtcbiAgZm9yIChpPTA7IGk8ZGF0YS5sZW5ndGg7ICsraSkge1xuICAgIHZhciB2ID0gZGF0YVtpXVtmaWVsZF07XG4gICAgaWYgKHYgPiBzdGF0cy5tYXgpIHN0YXRzLm1heCA9IHY7XG4gICAgaWYgKHYgPCBzdGF0cy5taW4pIHN0YXRzLm1pbiA9IHY7XG4gIH1cbiAgcmV0dXJuIHN0YXRzO1xufVxuXG51dGlsLmR1cGxpY2F0ZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob2JqKSk7XG59O1xuXG51dGlsLmFueSA9IGZ1bmN0aW9uKGFyciwgZil7XG4gIHZhciBpPTAsIGs7XG4gIGZvciAoayBpbiBhcnIpIHtcbiAgICBpZihmKGFycltrXSwgaywgaSsrKSkgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG51dGlsLmFsbCA9IGZ1bmN0aW9uKGFyciwgZil7XG4gIHZhciBpPTAsIGs7XG4gIGZvciAoayBpbiBhcnIpIHtcbiAgICBpZighZihhcnJba10sIGssIGkrKykpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxudXRpbC5tZXJnZSA9IGZ1bmN0aW9uKGRlc3QsIHNyYyl7XG4gIHJldHVybiB1dGlsLmtleXMoc3JjKS5yZWR1Y2UoZnVuY3Rpb24oYywgayl7XG4gICAgY1trXSA9IHNyY1trXTtcbiAgICByZXR1cm4gYztcbiAgfSwgZGVzdCk7XG59O1xuXG51dGlsLmdldGJpbnMgPSBmdW5jdGlvbiAoc3RhdHMpIHtcbiAgcmV0dXJuIHZnLmJpbnMoe1xuICAgIG1pbjogc3RhdHMubWluLFxuICAgIG1heDogc3RhdHMubWF4LFxuICAgIG1heGJpbnM6IE1BWF9CSU5TXG4gIH0pO1xufVxuXG5cbnV0aWwuZXJyb3IgPSBmdW5jdGlvbihtc2cpe1xuICBjb25zb2xlLmVycm9yKFwiW1ZMIEVycm9yXVwiLCBtc2cpO1xufVxuXG4iXX0=