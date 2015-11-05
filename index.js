'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _got = require('got');

var _got2 = _interopRequireDefault(_got);

var _lodashObjectAssign = require('lodash/object/assign');

var _lodashObjectAssign2 = _interopRequireDefault(_lodashObjectAssign);

var endpoint = 'http://api.crossref.org/';
var timeout = 60 * 1000; // crossref is *very* slow

// make a request
function GET(path, cb) {
  // console.log(`### ${endpoint}${path}`);
  (0, _got2['default'])('' + endpoint + path, { json: true, timeout: timeout }, function (err, body, res) {
    if (err) {
      if (err.statusCode === 404) return cb(new Error('Not found on Crossref: \'' + endpoint + path + '\''));
      return cb(new Error('Crossref error: [' + err.statusCode + '] ' + err.message));
    }
    if (typeof body !== 'object') return cb(new Error('Crossref response was not JSON: ' + body));
    if (!body.status) return cb(new Error('Malformed Crossref response: no `status` field.'));
    if (body.status !== 'ok') return cb(new Error('Crossref error: ' + body.status));
    cb(null, body.message);
  });
}

// make a method that just returns the one item
function item(urlTmpl) {
  return function (param, cb) {
    return GET(urlTmpl.replace('{param}', param), cb);
  };
}

// backend for list requests
function listRequest(path, options, cb) {
  if (options === undefined) options = {};

  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  // serialise options
  var opts = [];
  for (var k in options) {
    if (k === 'query') opts.push('query=' + encodeURIComponent(options.query));else if (k === 'filter') {
      var filts = [];
      for (var f in options.filter) {
        filts.push(f + ':' + options.filter[f]);
      }
      opts.push('filter=' + filts.join(','));
    } else if (k === 'facet' && options.facet) opts.push('facet=t');else opts.push(k + '=' + options[k]);
  }
  if (opts.length) path += '?' + opts.join('&');
  return GET(path, function (err, msg) {
    if (err) return cb(err);
    var objects = msg.items;
    delete msg.items;
    var nextOffset = 0;
    var isDone = false;
    var nextOptions = undefined;
    // /types is a list but it does not behave like the other lists
    // Once again the science.ai League of JStice saves the day papering over inconsistency!
    if (msg['items-per-page'] && msg.query) {
      nextOffset = msg.query['start-index'] + msg['items-per-page'];
      if (nextOffset > msg['total-results']) isDone = true;
      nextOptions = (0, _lodashObjectAssign2['default'])({}, options, { offset: nextOffset });
    } else {
      isDone = true;
      nextOptions = (0, _lodashObjectAssign2['default'])({}, options);
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
    return listRequest(urlTmpl.replace('{param}', param), options, cb);
  };
}

// Actual API
// /works/{doi} 	returns metadata for the specified CrossRef DOI.
// /funders/{funder_id} 	returns metadata for specified funder and its suborganizations
// /prefixes/{owner_prefix} 	returns metadata for the DOI owner prefix
// /members/{member_id} 	returns metadata for a CrossRef member
// /types/{type_id} 	returns information about a metadata work type
// /journals/{issn} 	returns information about a journal with the given ISSN
var work = item('works/{param}');
exports.work = work;
var funder = item('funders/{param}');
exports.funder = funder;
var prefix = item('prefixes/{param}');
exports.prefix = prefix;
var member = item('members/{param}');
exports.member = member;
var type = item('types/{param}');
exports.type = type;
var journal = item('journals/{param}');

exports.journal = journal;
// /funders/{funder_id}/works 	returns list of works associated with the specified funder_id
// /types/{type_id}/works 	returns list of works of type type
// /prefixes/{owner_prefix}/works 	returns list of works associated with specified owner_prefix
// /members/{member_id}/works 	returns list of works associated with a CrossRef member (deposited by a CrossRef member)
// /journals/{issn}/works 	returns a list of works in the given journal
var funderWorks = itemList('funders/{param}/works');
exports.funderWorks = funderWorks;
var prefixWorks = itemList('prefixes/{param}/works');
exports.prefixWorks = prefixWorks;
var memberWorks = itemList('members/{param}/works');
exports.memberWorks = memberWorks;
var journalWorks = itemList('journals/{param}/works');

exports.journalWorks = journalWorks;
// /works 	returns a list of all works (journal articles, conference proceedings, books, components, etc), 20 per page
// /funders 	returns a list of all funders in the FundRef Registry
// /members 	returns a list of all CrossRef members (mostly publishers)
// /types 	returns a list of valid work types
// /licenses 	return a list of licenses applied to works in CrossRef metadata
// /journals 	return a list of journals in the CrossRef database
var works = list('works');
exports.works = works;
var funders = list('funders');
exports.funders = funders;
var members = list('members');
exports.members = members;
var types = list('types');
exports.types = types;
var licenses = list('licenses');
exports.licenses = licenses;
var journals = list('journals');

exports.journals = journals;
// everything in one big ball
var Crossref = {
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
exports['default'] = Crossref;
