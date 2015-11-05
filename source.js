
import got from 'got';
import assign from 'lodash/object/assign';

const endpoint = 'http://api.crossref.org/';
const timeout = 60 * 1000; // crossref is *very* slow

// make a request
function GET (path, cb) {
  got(`${endpoint}${path}`, { json: true, timeout }, (err, body, res) => {
    if (err) {
      if (err.statusCode === 404) return cb(new Error(`Not found on Crossref: '${endpoint}${path}'`));
      return cb(new Error(`Crossref error: [${err.statusCode}] ${err.message}`));
    }
    if (typeof body !== 'object') return cb(new Error(`Crossref response was not JSON: ${body}`));
    if (!body.status) return cb(new Error('Malformed Crossref response: no `status` field.'));
    if (body.status !== 'ok') return cb(new Error(`Crossref error: ${body.status}`));
    cb(null, body.message);
  });
}

// make a method that just returns the one item
function item (urlTmpl) {
  return (param, cb) => {
    return GET(urlTmpl.replace('{param}', param), cb);
  };
}

// backend for list requests
function listRequest (path, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  // serialise options
  let opts = [];
  for (let k in options) {
    if (k === 'query') opts.push(`query=${encodeURIComponent(options.query)}`);
    else if (k === 'filter') {
      let filts = [];
      for (let f in options.filter) {
        filts.push(`${f}:${options.filter[f]}`);
      }
      opts.push(`filter=${filts.join(',')}`);
    }
    else if (k === 'facet' && options.facet) opts.push('facet=t');
    else opts.push(`${k}=${options[k]}`);
  }
  if (opts.length) path += `?${opts.join('&')}`;
  return GET(path, (err, msg) => {
    if (err) return cb(err);
    let objects = msg.items;
    delete msg.items;
    let nextOffset = 0;
    let isDone = false;
    let nextOptions;
    // /types is a list but it does not behave like the other lists
    // Once again the science.ai League of JStice saves the day papering over inconsistency!
    if (msg['items-per-page'] && msg.query) {
      nextOffset = msg.query['start-index'] + msg['items-per-page'];
      if (nextOffset > msg['total-results']) isDone = true;
      nextOptions = assign({}, options, { offset: nextOffset });
    }
    else {
      isDone = true;
      nextOptions = assign({}, options);
    }
    cb(null, objects, nextOptions, isDone, msg);
  });
}

// make a method that returns a list that can be
function list (path) {
  return (options, cb) => {
    return listRequest(path, options, cb);
  };
}
function itemList (urlTmpl) {
  return (param, options, cb) => {
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
export let work     = item('works/{param}');
export let funder   = item('funders/{param}');
export let prefix   = item('prefixes/{param}');
export let member   = item('members/{param}');
export let type     = item('types/{param}');
export let journal  = item('journals/{param}');

// /funders/{funder_id}/works 	returns list of works associated with the specified funder_id
// /types/{type_id}/works 	returns list of works of type type
// /prefixes/{owner_prefix}/works 	returns list of works associated with specified owner_prefix
// /members/{member_id}/works 	returns list of works associated with a CrossRef member (deposited by a CrossRef member)
// /journals/{issn}/works 	returns a list of works in the given journal
export let funderWork   = itemList('funders/{param}');
export let prefixWork   = itemList('prefixes/{param}');
export let memberWork   = itemList('members/{param}');
export let journalWork  = itemList('journals/{param}');

// /works 	returns a list of all works (journal articles, conference proceedings, books, components, etc), 20 per page
// /funders 	returns a list of all funders in the FundRef Registry
// /members 	returns a list of all CrossRef members (mostly publishers)
// /types 	returns a list of valid work types
// /licenses 	return a list of licenses applied to works in CrossRef metadata
// /journals 	return a list of journals in the CrossRef database
export let works     = list('works');
export let funders   = list('funders');
export let members   = list('members');
export let types     = list('types');
export let licenses  = list('licenses');
export let journals  = list('journals');

// everything in one big ball
const Crossref = {
  work,
  funder,
  prefix,
  member,
  type,
  journal,
  funderWork,
  prefixWork,
  memberWork,
  journalWork,
  works,
  funders,
  members,
  types,
  licenses,
  journals
};
export default Crossref;
