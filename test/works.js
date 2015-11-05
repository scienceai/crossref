
import test from 'ava';
import xref from '..';

test('list works', t => {
  xref.works((err, objs, nextOpts, done) => {
    t.ifError(err, 'does not error');
    t.same(objs.length, objs.filter(w => w.DOI).length, 'has list of works');
    t.same(nextOpts.offset, 20, 'next offset is configured correctly');
    t.false(done, 'is not done on the first page');
    t.end();
  });
});
