import { query, sparqlEscapeUri } from 'mu';
import { parseSparqlResults } from './parseSparqlResults';
import excludedGraphs from '/config/excludedgraphs';
import caching from '../util/caching';
const CACHE_FILE_NAME = 'datamodel-analysis-service-cache';
/* Keep a cache of the query results for quicker results on each restart */
let queryCache = {};
caching.getLocalJSONFile(CACHE_FILE_NAME).then((localResult) => {
  if (localResult) {
    queryCache = localResult;
  }
});

export default {
  /* Returns true if all queries in this library were executed at least once */
  cacheWarmedup: async function () {
    let graphsInDB = await this.getGraphs();
    return Object.keys(queryCache).length >= 1 +  (2 * graphsInDB.graphs.length);
  },
  /* Queries the triplestore in the stack */
  executeQuery: async function (queryToExecute, limit, bypassCache) {
    let results = [];
    if (!bypassCache && queryCache[queryToExecute]) {
      return queryCache[queryToExecute];
    }
    try {
      if (limit) {
        queryToExecute = queryToExecute + ` LIMIT ${limit}`;
      }
      let response = await query(queryToExecute);
      results = parseSparqlResults(response);
      queryCache[queryToExecute] = results;
      await caching.writeLocalFile(CACHE_FILE_NAME, queryCache);
    } catch (e) {
      console.log(e);
    }
    return results;
  },

  /* Get all graphs in the database, and puts the ones in config/excludedgraphs.json in a separate list */
  getGraphs: async function () {
    const graphQuery = `SELECT DISTINCT ?g WHERE {
      GRAPH ?g {
        ?s a ?type .
      }
    }
    `;
    let results = await this.executeQuery(graphQuery);
    let graphs = results.map((result) => { return result.g; });
    return {
      graphs: graphs.filter((graph) => { return excludedGraphs.indexOf(graph) === -1; }),
      excluded_from_analysis: graphs.filter((graph) => { return excludedGraphs.indexOf(graph) > -1; })
    };
  },

  /* Get all types used in each non-excluded graph.
  filterPrefix Allows a search term to be added to filter the subjectTypes, objectTypes and predicates for a specific prefix (useful for domain mapping) */
  getTypes: async function (limit, filterPrefix) {
    let results = {};
    let graphsInDB = await this.getGraphs();
    for (const graph of graphsInDB.graphs) {
      const typeQuery = `SELECT DISTINCT ?subjectType WHERE {
        GRAPH <${graph}> {
          ?s a ?subjectType .
        }
      }
      `;
      results[graph] = await this.executeQuery(typeQuery, limit);
    }
    if (filterPrefix) {
      let filteredResults = {};
      for (const graph in results) {
        if (results.hasOwnProperty(graph)) {
          filteredResults[graph] = results[graph].filter((result) => { return result.subjectType.indexOf(filterPrefix) === 0; });
        }
      }
      return filteredResults;
    }
    return results;
  },

  /* Get all predicates used in each non-excluded graph.
  filterPrefix Allows a search term to be added to filter the subjectTypes, objectTypes and predicates for a specific prefix (useful for domain mapping) */
  getPredicates: async function (limit, filterPrefix) {
    let results = {};
    let graphsInDB = await this.getGraphs();
    for (const graph of graphsInDB.graphs) {
      const typeQuery = `SELECT DISTINCT ?p WHERE {
        GRAPH <${graph}> {
          ?s ?p ?o .
        }
      }
      `;
      results[graph] = await this.executeQuery(typeQuery, limit);
    }
    if (filterPrefix) {
      let filteredResults = {};
      for (const graph in results) {
        if (results.hasOwnProperty(graph)) {
          filteredResults[graph] = results[graph].filter((result) => { return result.p.indexOf(filterPrefix) === 0; });
        }
      }
      return filteredResults;
    }
    return results;
  },

  /* Get all (non-literal) relationships between resources for each non-excluded graph.
  filterPrefix Allows a search term to be added to filter the subjectTypes, objectTypes and predicates for a specific prefix (useful for domain mapping) */
  getRelationships: async function (limit, filterPrefix) {
    let results = {};
    let graphsInDB = await this.getGraphs();
    for (const graph of graphsInDB.graphs) {
      const relationshipQuery = `SELECT DISTINCT ?subjectType ?p ?objectType WHERE {
        GRAPH <${graph}> {
          ?s ?p ?o .
          ?s a ?subjectType .
          ?o a ?objectType .
        }
      }
      `;
      results[graph] = await this.executeQuery(relationshipQuery, limit);
    }
    if (filterPrefix) {
      let filteredResults = {};
      for (const graph in results) {
        if (results.hasOwnProperty(graph)) {
          filteredResults[graph] = results[graph].filter((result) => { return result.subjectType.indexOf(filterPrefix) === 0 || result.objectType.indexOf(filterPrefix) === 0 || result.p.indexOf(filterPrefix) === 0; });
        }
      }
      return filteredResults;
    }
    return results;
  },

  /* Get all literal relationships for each non-excluded graph
  filterPrefix Allows a search term to be added to filter the subjectTypes, objectTypes and predicates for a specific prefix (useful for domain mapping) */
  getAttributes: async function (limit, filterPrefix) {
    let results = {};
    let graphsInDB = await this.getGraphs();
    for (const graph of graphsInDB.graphs) {
      const attributesQuery = `SELECT DISTINCT ?subjectType ?p datatype(?o) AS ?objectType WHERE {
        GRAPH <${graph}> {
          ?s ?p ?o .
          ?s a ?subjectType .
          FILTER NOT EXISTS { ?o a ?objectType } .
        }
      }
      `;
      let resultsForGraph = await this.executeQuery(attributesQuery, limit);
      results[graph] = resultsForGraph.filter((result) => { return result.objectType !== undefined; });
    }
    if (filterPrefix) {
      let filteredResults = {};
      for (const graph in results) {
        if (results.hasOwnProperty(graph)) {
          filteredResults[graph] = results[graph].filter((result) => { return result.subjectType.indexOf(filterPrefix) === 0 || result.objectType.indexOf(filterPrefix) === 0 || result.p.indexOf(filterPrefix) === 0; });
        }
      }
      return filteredResults;
    }
    return results;
  }
};
