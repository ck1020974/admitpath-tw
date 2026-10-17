(function(root) {
  'use strict';
  function createSession() {
    let answers = Array(30).fill(null);
    let index = 0;
    return {
      get index() { return index; },
      get answers() { return [...answers]; },
      get answered() { return answers.filter(value => value !== null).length; },
      choose(value) {
        if (!Number.isInteger(value) || value < 0 || value > 4) throw new Error('回答須為0至4的整數。');
        answers[index] = value;
      },
      next() {
        if (answers[index] === null) return 'missing';
        if (index === 29) return answers.every(value => value !== null) ? 'complete' : 'missing';
        index++; return 'next';
      },
      back() { if (index === 0) return false; index--; return true; },
      first() { index = 0; },
      reset() { answers = Array(30).fill(null); index = 0; },
    };
  }
  const api = {createSession};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YuhsinInterestFlow = api;
})(typeof window !== 'undefined' ? window : globalThis);
