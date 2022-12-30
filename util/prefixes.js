import prefixes from '../config/prefixes.json';

/* Replace all occurences in a string of a full URI that corresponds with a known prefix by that prefix */
const addPrefixes = function (string) {
  for (const prefix in prefixes) {
    if (prefixes.hasOwnProperty(prefix)) {
      string = string.replace(prefixes[prefix], prefix + ':');
    }
  }
  return string;
};

/* Replace all occurences in a string of a prefix that corresponds with a known prefix by the full URI */
const removePrefixes = function (string) {
  for (const prefix in prefixes) {
    if (prefixes.hasOwnProperty(prefix)) {
      string = string.replace(prefix + ':', prefixes[prefix]);
    }
  }
  return string;
};


export default {
  /* Takes a result (array, object or string) with full URIs and replaces them by their prefixes for human-readable results */
  subsitutePrefixes: function (result) {
    if (Array.isArray(result)) {
      return result.map((resultItem) => { return this.subsitutePrefixes(resultItem); });
    } else if (typeof result === 'object') {
      let resultCopy = {};
      for (const key in result) {
        if (result.hasOwnProperty(key)) {
          resultCopy[this.subsitutePrefixes(key)] = this.subsitutePrefixes(result[key]);
        }
      }
      return resultCopy;
    } else if (typeof result === 'string') {
      return addPrefixes(result)
    } else {
      return result;
    }
  },

  /* Takes a result (array, object or string) with prefixed URIs and replaces them by their full URIs */
  removePrefixes: function (result) {
    if (Array.isArray(result)) {
      return result.map((resultItem) => { return this.removePrefixes(resultItem); });
    } else if (typeof result === 'object') {
      let resultCopy = {};
      for (const key in result) {
        if (result.hasOwnProperty(key)) {
          resultCopy[this.removePrefixes(key)] = this.removePrefixes(result[key]);
        }
      }
      return resultCopy;
    } else if (typeof result === 'string') {
      return removePrefixes(result)
    } else {
      return result;
    }
  }
}
