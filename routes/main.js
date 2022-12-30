const express = require('express');
const router = express.Router();
import database from '../util/database';

/* Warm up the cache*/
database.getGraphs()
.then(async () => {
  await database.getRelationships();
}).then(async () => {
  await database.getAttributes();
}).then(() => {
  console.log('Cache warmed up');
});

/* Returns true if the essential queries have been cached */
router.get('/cache-warmed-up', async function(req, res) {
  try {
    let cacheWarmedup = await database.cacheWarmedup();
    res.send(cacheWarmedup);
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

/* Get all graphs in the database */
router.get('/all-graphs', async function(req, res) {
  try {
    let results = await database.getGraphs();
    res.send(database.subsitutePrefixes(results));
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

router.get('/all-relationships', async function(req, res) {
  try {
    let results = await database.getRelationships(req.query.limit);
    res.send(database.subsitutePrefixes(results));
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

router.get('/all-attributes', async function(req, res) {
  try {
    let results = await database.getAttributes(req.query.limit);
    res.send(database.subsitutePrefixes(results));
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

router.get('/visualize', async (req, res) => {
  let cacheWarmedup = await database.cacheWarmedup();
  res.type('html');
  if (cacheWarmedup) {
    let graphsResult = await database.getGraphs();
    let relationships = await database.getRelationships();
    relationships = database.subsitutePrefixes(relationships);
    let attributes = await database.getAttributes();
    attributes = database.subsitutePrefixes(attributes);
    let visData = {};
    for (const graph of graphsResult.graphs) {
      visData[graph] = {
        nodes: [],
        edges: []
      };
      let ids = {};
      let currentId = 1;
      if (relationships[graph]) {
        for (let i = 0; i < relationships[graph].length; i++) {
          // add the node for the subject resource type
          if (!ids[relationships[graph][i].subjectType]) {
            visData[graph].nodes.push({ id: currentId + 1, label: relationships[graph][i].subjectType, shape: 'box' });
            ids[relationships[graph][i].subjectType] = currentId + 1;
            currentId++;
          }
          // add the node for the object resource type
          if (!ids[relationships[graph][i].objectType]) {
            visData[graph].nodes.push({ id: currentId + 1, label: relationships[graph][i].objectType, shape: 'box' });
            ids[relationships[graph][i].objectType] = currentId + 1;
            currentId++;
          }
          // add the arrow
          visData[graph].edges.push({
            from: ids[relationships[graph][i].subjectType],
            to: ids[relationships[graph][i].objectType],
            arrows: "to",
            label: relationships[graph][i].p
          });
        }
      }
      if (attributes[graph]) {
        for (let i = 0; i < attributes[graph].length; i++) {
          // add the node for the subject resource type
          if (!ids[attributes[graph][i].subjectType]) {
            visData[graph].nodes.push({ id: currentId + 1, label: attributes[graph][i].subjectType, shape: 'box' });
            ids[attributes[graph][i].subjectType] = currentId + 1;
            currentId++;
          }
          // add a new node for an attribute per subject resource type, or the network graphs get too dense
          let subjectAttribute = attributes[graph][i].subjectType + '-' + attributes[graph][i].objectType;
          if (!ids[subjectAttribute]) {
            visData[graph].nodes.push({ id: currentId + 1, label: attributes[graph][i].objectType, shape: 'box', color: 'orange' });
            ids[subjectAttribute] = currentId + 1;
            currentId++;
          }
          // add the arrow
          visData[graph].edges.push({
            from: ids[attributes[graph][i].subjectType],
            to: ids[subjectAttribute],
            arrows: "to",
            label: attributes[graph][i].p
          });
        }
      }
    }
    res.render('visualize', {
      title: 'Datamodel visualization',
      cacheWarmedup: true,
      graphs: graphsResult.graphs,
      serialized: {
        // these will be fed to the javascript on the page, and need to be stringified for this to happen
        graphs: JSON.stringify(graphsResult.graphs),
        visData: JSON.stringify(visData)
      }
    });
  } else {
    res.render('visualize', {
      title: 'Datamodel visualization',
      cacheWarmedup: false
    });
  }
});

export default router;