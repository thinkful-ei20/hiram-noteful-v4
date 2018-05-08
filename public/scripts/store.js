// eslint-disable-next-line no-unused-vars
"use strict";

const store = (function() {
  return {
    authToken: "",

    notes: [],
    folders: [],
    tags: [],

    currentNote: {},
    currentQuery: {
      searchTerm: ""
    },

    currentUser: {}
  };
})();
