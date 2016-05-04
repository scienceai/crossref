"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var request = _interopRequire(require("request"));

var assign = _interopRequire(require("lodash/assign"));

var endpoint = "http://api.crossref.org/";
var timeout = 60 * 1000; // CrossRef is *very* slow

// make a request
function GET(path, cb) {
  // console.log(`### ${endpoint}${path}`);
  request("" + endpoint + "" + path, { json: true, timeout: timeout }, function (err, res, body) {
    if (err || !res || res.statusCode >= 400) {
      var statusCode = res ? res.statusCode : 0,
          statusMessage = res ? res.statusMessage : "Unspecified error (likely a timeout)";
      if (statusCode === 404) return cb(new Error("Not found on CrossRef: '" + endpoint + "" + path + "'"));
      return cb(new Error("CrossRef error: [" + statusCode + "] " + (err && err.message ? err.message : res.statusMessage)));
    }
    if (typeof body !== "object") return cb(new Error("CrossRef response was not JSON: " + body));
    if (!body.status) return cb(new Error("Malformed CrossRef response: no `status` field."));
    if (body.status !== "ok") return cb(new Error("CrossRef error: " + body.status));
    cb(null, body.message);
  });
}

// make a method that just returns the one item
function item(urlTmpl) {
  return function (param, cb) {
    return GET(urlTmpl.replace("{param}", param), cb);
  };
}

// backend for list requests
function listRequest(path, _x, cb) {
  var options = arguments[1] === undefined ? {} : arguments[1];

  if (typeof options === "function") {
    cb = options;
    options = {};
  }
  // serialise options
  var opts = [];
  for (var k in options) {
    // The whole URL *minus* the scheme and "://" (for whatever benighted reason) has to be at most
    // 4096 characters long. Taking the extra bloat that `encodeURIComponent()` adds we truncate the
    // query to 2000 chars. We could be more precise and regenerate the URL until we reach as close
    // as possible to 4096, but frankly if you're searching for a string longer than 2000 characters
    // you're probably doing something wrong.
    if (k === "query") {
      if (options.query.length > 2000) options.query = options.query.substr(0, 2000);
      opts.push("query=" + encodeURIComponent(options.query));
    } else if (k === "filter") {
      (function () {
        var filts = [];
        for (var f in options.filter) {
          (function (f) {
            if (Array.isArray(options.filter[f])) {
              options.filter[f].forEach(function (val) {
                filts.push("" + f + ":" + val);
              });
            } else {
              filts.push("" + f + ":" + options.filter[f]);
            }
          })(f);
        }
        opts.push("filter=" + filts.join(","));
      })();
    } else if (k === "facet" && options.facet) opts.push("facet=t");else opts.push("" + k + "=" + options[k]);
  }
  if (opts.length) path += "?" + opts.join("&");
  return GET(path, function (err, msg) {
    if (err) return cb(err);
    var objects = msg.items;
    delete msg.items;
    var nextOffset = 0;
    var isDone = false;
    var nextOptions = undefined;
    // /types is a list but it does not behave like the other lists
    // Once again the science.ai League of JStice saves the day papering over inconsistency!
    if (msg["items-per-page"] && msg.query) {
      nextOffset = msg.query["start-index"] + msg["items-per-page"];
      if (nextOffset > msg["total-results"]) isDone = true;
      nextOptions = assign({}, options, { offset: nextOffset });
    } else {
      isDone = true;
      nextOptions = assign({}, options);
    }
    cb(null, objects, nextOptions, isDone, msg);
  });
}

// make a method that returns a list that can be
function list(path) {
  return function (options, cb) {
    return listRequest(path, options, cb);
  };
}
function itemList(urlTmpl) {
  return function (param, options, cb) {
    return listRequest(urlTmpl.replace("{param}", param), options, cb);
  };
}

// Actual API
// /works/{doi} 	returns metadata for the specified CrossRef DOI.
// /funders/{funder_id} 	returns metadata for specified funder and its suborganizations
// /prefixes/{owner_prefix} 	returns metadata for the DOI owner prefix
// /members/{member_id} 	returns metadata for a CrossRef member
// /types/{type_id} 	returns information about a metadata work type
// /journals/{issn} 	returns information about a journal with the given ISSN
var work = exports.work = item("works/{param}");
var funder = exports.funder = item("funders/{param}");
var prefix = exports.prefix = item("prefixes/{param}");
var member = exports.member = item("members/{param}");
var type = exports.type = item("types/{param}");
var journal = exports.journal = item("journals/{param}");

// /funders/{funder_id}/works 	returns list of works associated with the specified funder_id
// /types/{type_id}/works 	returns list of works of type type
// /prefixes/{owner_prefix}/works 	returns list of works associated with specified owner_prefix
// /members/{member_id}/works 	returns list of works associated with a CrossRef member (deposited by a CrossRef member)
// /journals/{issn}/works 	returns a list of works in the given journal
var funderWorks = exports.funderWorks = itemList("funders/{param}/works");
var prefixWorks = exports.prefixWorks = itemList("prefixes/{param}/works");
var memberWorks = exports.memberWorks = itemList("members/{param}/works");
var journalWorks = exports.journalWorks = itemList("journals/{param}/works");

// /works 	returns a list of all works (journal articles, conference proceedings, books, components, etc), 20 per page
// /funders 	returns a list of all funders in the FundRef Registry
// /members 	returns a list of all CrossRef members (mostly publishers)
// /types 	returns a list of valid work types
// /licenses 	return a list of licenses applied to works in CrossRef metadata
// /journals 	return a list of journals in the CrossRef database
var works = exports.works = list("works");
var funders = exports.funders = list("funders");
var members = exports.members = list("members");
var types = exports.types = list("types");
var licenses = exports.licenses = list("licenses");
var journals = exports.journals = list("journals");

// everything in one big ball
var CrossRef = {
  work: work,
  funder: funder,
  prefix: prefix,
  member: member,
  type: type,
  journal: journal,
  funderWorks: funderWorks,
  prefixWorks: prefixWorks,
  memberWorks: memberWorks,
  journalWorks: journalWorks,
  works: works,
  funders: funders,
  members: members,
  types: types,
  licenses: licenses,
  journals: journals
};
exports["default"] = CrossRef;
Object.defineProperty(exports, "__esModule", {
  value: true
});
