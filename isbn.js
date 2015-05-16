//
// isbn.js
//
// The MIT License
// Copyright (c) 2007, 2010 hetappi <hetappi.pm (a) gmail.com>
//
"use strict";
var ISBN;
(function () {
ISBN  = {
  VERSION: '0.01',
  GROUPS: {
    '0': {
      'name': 'English speaking area',
      'ranges': [['00', '19'], ['200', '699'], ['7000', '8499'], ['85000', '89999'], ['900000', '949999'], ['9500000', '9999999']]
    },
    '1': {
      'name': 'English speaking area',
      'ranges': [['00', '09'], ['100', '399'], ['4000', '5499'], ['55000', '86979'], ['869800', '998999']]
    },
    '4': {
      'name': 'Japan',
      'ranges': [['00','19'], ['200','699'], ['7000','8499'], ['85000','89999'], ['900000','949999'], ['9500000','9999999']]
    }
  },

  isbn: function () {
    this.initialize.apply(this, arguments);
  },

  parse: function(val, groups) {
    var me = new ISBN.isbn(val, groups ? groups : ISBN.GROUPS);
    return me.isValid() ? me : null;
  },

  hyphenate: function(val) {
    var me = ISBN.parse(val);
    return me ? me.isIsbn13() ? me.asIsbn13(true) : me.asIsbn10(true) : null;
  },

  asIsbn13: function(val, hyphen) {
    var me = ISBN.parse(val);
    return me ? me.asIsbn13(hyphen) : null;
  },

  asIsbn10: function(val, hyphen) {
    var me = ISBN.parse(val);
    return me ? me.asIsbn10(hyphen) : null;
  }
};

ISBN.isbn.prototype = {
  isValid: function() {
    return this.codes && this.codes.isValid;
  },

  isIsbn13: function() {
    return this.isValid() && this.codes.isIsbn13;
  },

  isIsbn10: function() {
    return this.isValid() && this.codes.isIsbn10;
  },

  asIsbn10: function(hyphen) {
    return this.isValid() ? hyphen ? this.codes.isbn10h : this.codes.isbn10 : null;
  },

  asIsbn13: function(hyphen) {
    return this.isValid() ? hyphen ? this.codes.isbn13h : this.codes.isbn13 : null;
  },

  initialize: function(val, groups) {
    this.groups = groups;
    this.codes = this.parse(val);
  },

  merge: function(lobj, robj) {
    var key;
    if (!lobj || !robj) {
      return null;
    }
    for (key in robj) {
      if (robj.hasOwnProperty(key)) {
        lobj[key] = robj[key];
      }
    }
    return lobj;
  },

  parse: function(val) {
    var ret;
    // correct for misplaced hyphens
    // val = val.replace(/ -/,'');
    ret =
      val.match(/^\d{9}[\dX]$/) ?
        this.fill(
          this.merge({source: val, isValid: true, isIsbn10: true, isIsbn13: false}, this.split(val))) :
      val.length === 13 && val.match(/^(\d+)-(\d+)-(\d+)-([\dX])$/) ?
        this.fill({
          source: val, isValid: true, isIsbn10: true, isIsbn13: false, group: RegExp.$1, publisher: RegExp.$2,
          article: RegExp.$3, check: RegExp.$4}) :
      val.match(/^(978|979)(\d{9}[\dX]$)/) ?
        this.fill(
          this.merge({source: val, isValid: true, isIsbn10: false, isIsbn13: true, prefix: RegExp.$1},
          this.split(RegExp.$2))) :
      val.length === 17 && val.match(/^(978|979)-(\d+)-(\d+)-(\d+)-([\dX])$/) ?
        this.fill({
          source: val, isValid: true, isIsbn10: false, isIsbn13: true, prefix: RegExp.$1, group: RegExp.$2,
          publisher: RegExp.$3, article: RegExp.$4, check: RegExp.$5}) :
        null;

    if (!ret) {
      return {source: val, isValid: false};
    }

    return this.merge(ret, {isValid: ret.check === (ret.isIsbn13 ? ret.check13 : ret.check10)});
  },

  split: function(isbn) {
    return (
      !isbn ?
        null :
      isbn.length === 13 ?
        this.merge(this.split(isbn.substr(3)), {prefix: isbn.substr(0, 3)}) :
      isbn.length === 10 ?
        this.splitToObject(isbn) :
        null);
  },

  splitToArray: function(isbn10) {
    var rec, key, rest, i, m;
    rec = this.getGroupRecord(isbn10);
    if (!rec) {
      return null;
    }

    for (key, i = 0, m = rec.record.ranges.length; i < m; i += 1) {
      key = rec.rest.substr(0, rec.record.ranges[i][0].length);
      if (rec.record.ranges[i][0] <= key && rec.record.ranges[i][1] >= key) {
        rest = rec.rest.substr(key.length);
        return [rec.group, key, rest.substr(0, rest.length - 1), rest.charAt(rest.length - 1)];
      }
    }
    return null;
  },

  splitToObject: function(isbn10) {
    var a = this.splitToArray(isbn10);
    if (!a || a.length !== 4) {
      return null;
    }
    return {group: a[0], publisher: a[1], article: a[2], check: a[3]};
  },

  fill: function(codes) {
    var rec, prefix, ck10, ck13, parts13, parts10;

    if (!codes) {
      return null;
    }

    rec = this.groups[codes.group];
    if (!rec) {
      return null;
    }

    prefix = codes.prefix ? codes.prefix : '978';
    ck10 = this.calcCheckDigit([
      codes.group, codes.publisher, codes.article].join(''));
    if (!ck10) {
      return null;
    }

    ck13 = this.calcCheckDigit([prefix, codes.group, codes.publisher, codes.article].join(''));
    if (!ck13) {
      return null;
    }

    parts13 = [prefix, codes.group, codes.publisher, codes.article, ck13];
    this.merge(codes, {
      isbn13: parts13.join(''),
      isbn13h: parts13.join('-'),
      check10: ck10,
      check13: ck13,
      groupname: rec.name
    });

    if (prefix === '978') {
      parts10 = [codes.group, codes.publisher, codes.article, ck10];
      this.merge(codes, {isbn10: parts10.join(''), isbn10h: parts10.join('-')});
    }

    return codes;
  },

  getGroupRecord: function(isbn10) {
    var key;
    for (key in this.groups) {
      if (isbn10.match('^' + key + '(.+)')) {
        return {group: key, record: this.groups[key], rest: RegExp.$1};
      }
    }
    return null;
  },

  calcCheckDigit: function(isbn) {
    var c, n;
    if (isbn.match(/^\d{9}[\dX]?$/)) {
      c = 0;
      for (n = 0; n < 9; n += 1) {
        c += (10 - n) * isbn.charAt(n);
      }
      c = (11 - c % 11) % 11;
      return c === 10 ? 'X' : String(c);

    } else if (isbn.match(/(?:978|979)\d{9}[\dX]?/)) {
      c = 0;
      for (n = 0; n < 12; n += 2) {
        c += Number(isbn.charAt(n)) + 3 * isbn.charAt(n + 1);
      }
      return String((10 - c % 10) % 10);
    }

    return null;
  }
};
}());


var BASE64_STRING = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz~'

function base16to64(base16) {
  while (base16.length % 3 != 0 && base16.length > 0) base16 = '0' + base16
  var result = ''
  while (base16.length > 0) {
    var chunk   = base16.substr(base16.length-3, 3)
    var base10  = parseInt(chunk, 16)
    var base64a = Math.floor(base10 / 64)
    var base64b = base10 % 64
    result      = BASE64_STRING.substr(base64a, 1) + BASE64_STRING.substr(base64b, 1) + result
//		console.log(chunk, base10, base64a, base64b, result)
    base16      = base16.substr(0, base16.length-3)
  }
  return result
}

function base64to16(base64) {
  while (base64.length % 2 != 0 && base64.length > 0) base64 = '0' + base64
  var result = ''
  while (base64.length > 0) {
    var chunk   = base64.substr(-2)
    var base64a = BASE64_STRING.indexOf(chunk[0])
    var base64b = BASE64_STRING.indexOf(chunk[1])
    var base10  = base64a * 64 + base64b
    var base16  = '00' + base10.toString(16)
    result      = base16.substr(-3) + result
//		console.log(base64a, base64b, base10, base16, result)
    base64      = base64.substr(0, base64.length-2)
  }
  if (result.length %2 == 1 && result[0] == '0') {
    result = result.substr(1)
  }
  return result
}


function isbnTo16(isbn) {
  if ('string' === typeof isbn) isbn = parseInt(isbn)
  return isbn.toString(16)
}

function isbnFrom16(isbn16) {
  var isbn = parseInt(isbn16, 16)
  var len  = (isbn.length < 11) ? 10 : 13
  for (; isbn.length < len;) {
    isbn = '0' + isbn // restore leading 0's
  }
  return isbn
}

function isbnTo36(isbn) {
  if ('string' === typeof isbn) isbn = parseInt(isbn)
  return isbn.toString(36)
}

function isbnFrom36(isbn36) {
  var isbn = parseInt(isbn36, 36)
  var len  = (isbn.length < 11) ? 10 : 13
  for (; isbn.length < len;) {
    isbn = '0' + isbn // restore leading 0's
  }
  return isbn
}

function isbnTo64(isbn) {
  var isbn16 = isbnTo16(isbn)
  return base16to64(isbn16)
}

function isbnFrom64(isbn64) {
  var isbn16 = base64to16(isbn64)
  return isbnFrom16(isbn16)
}



module.exports        = ISBN
module.exports.to16   = isbnTo16
module.exports.from16 = isbnFrom16
module.exports.to36   = isbnTo36
module.exports.from36 = isbnFrom36
module.exports.to64   = isbnTo64
module.exports.from64 = isbnFrom64
