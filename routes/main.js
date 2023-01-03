const express = require('express');
const router = express.Router();
import database from '../util/database';
import prefixes from '../util/prefixes';
import shacl from '../util/shacl';

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
    res.send(prefixes.subsitutePrefixes(results));
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

router.get('/all-relationships', async function(req, res) {
  try {
    let results = await database.getRelationships(req.query.limit);
    res.send(prefixes.subsitutePrefixes(results));
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

router.get('/all-attributes', async function(req, res) {
  try {
    let results = await database.getAttributes(req.query.limit);
    res.send(prefixes.subsitutePrefixes(results));
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
    relationships = prefixes.subsitutePrefixes(relationships);
    let attributes = await database.getAttributes();
    attributes = prefixes.subsitutePrefixes(attributes);
    let highlightSHACL = req.query.highlightSHACL;
    let visData = {};
    for (const graph of graphsResult.graphs) {
      visData[graph] = {
        nodes: [],
        edges: []
      };
      let ids = {};
      let nodes = {};
      let currentId = 1;
      if (relationships[graph]) {
        for (let i = 0; i < relationships[graph].length; i++) {
          if (highlightSHACL) {
            // look into the SHACL templates.
            relationships[graph][i].shaclTemplates = shacl.getShaclTemplatesForRelation(relationships[graph][i].subjectType, relationships[graph][i].p, relationships[graph][i].objectType, req.query.ignorehttps === 'true');
          }
          // add the node for the subject resource type
          if (!ids[relationships[graph][i].subjectType]) {
            let subjectNode = { id: currentId + 1, label: relationships[graph][i].subjectType, shape: 'box'};
            nodes[relationships[graph][i].subjectType] = subjectNode;
            ids[relationships[graph][i].subjectType] = currentId + 1;
            currentId++;
          }
          // add the node for the object resource type
          if (!ids[relationships[graph][i].objectType]) {
            let objectNode = { id: currentId + 1, label: relationships[graph][i].objectType, shape: 'box' };
            nodes[relationships[graph][i].objectType] = objectNode;
            ids[relationships[graph][i].objectType] = currentId + 1;
            currentId++;
          }
          if (highlightSHACL) {
            // We will highlight all subjects, preficates, and objects that are in a valid relation.
            if (relationships[graph][i].shaclTemplates && relationships[graph][i].shaclTemplates.length > 0) {
              nodes[relationships[graph][i].subjectType].color = 'rgb(4, 207, 38)';
              nodes[relationships[graph][i].objectType].color = 'rgb(4, 207, 38)';
            } else {
              if (!nodes[relationships[graph][i].subjectType].color) {
                nodes[relationships[graph][i].subjectType].color = 'rgba(52, 161, 235,0.3)';// this could be overwritten in another relationship
              }
              if (!nodes[relationships[graph][i].objectType].color) {
                nodes[relationships[graph][i].objectType].color = 'rgba(52, 161, 235,0.3)';// this could be overwritten in another relationship
              }
            }
          }
          // add the arrow
          visData[graph].edges.push({
            from: ids[relationships[graph][i].subjectType],
            to: ids[relationships[graph][i].objectType],
            arrows: "to",
            label: relationships[graph][i].p,
            color: highlightSHACL && relationships[graph][i].shaclTemplates.indexOf(highlightSHACL) > -1 ? 'rgb(4, 207, 38)' : 'rgba(52, 161, 235, 0.3)',
            dashes: highlightSHACL && relationships[graph][i].shaclTemplates.indexOf(highlightSHACL) === -1 ? true : false,
            width: highlightSHACL && relationships[graph][i].shaclTemplates.indexOf(highlightSHACL) > -1 ? 2 : undefined
          });
        }
      }
      if (attributes[graph]) {
        for (let i = 0; i < attributes[graph].length; i++) {
          if (highlightSHACL) {
            // look into the SHACL templates
            attributes[graph][i].shaclTemplates = shacl.getShaclTemplatesForRelation(attributes[graph][i].subjectType, attributes[graph][i].p, attributes[graph][i].objectType, req.query.ignorehttps === 'true');
          }
          // add the node for the subject resource type
          if (!ids[attributes[graph][i].subjectType]) {
            let subjectNode = { id: currentId + 1, label: attributes[graph][i].subjectType, shape: 'box'};
            nodes[attributes[graph][i].subjectType] = subjectNode;
            ids[attributes[graph][i].subjectType] = currentId + 1;
            currentId++;
          }
          // add a new node for an attribute per subject resource type, or the network graphs get too dense
          let attributeType = req.query.attributeGrouping === 'individual' ? attributes[graph][i].objectType + (currentId + 1) : attributes[graph][i].subjectType + '-' + attributes[graph][i].objectType;
          if (!ids[attributeType]) {
            let attributeNode = { id: currentId + 1, label: attributes[graph][i].objectType, shape: 'box', color: 'orange' };
            nodes[attributeType] = attributeNode;
            ids[attributeType] = currentId + 1;
            currentId++;
          }
          if (highlightSHACL) {
            // We will highlight all subjects, preficates, and objects that are in a valid relation.
            if (attributes[graph][i].shaclTemplates && attributes[graph][i].shaclTemplates.length > 0) {
              nodes[attributes[graph][i].subjectType].color = 'rgb(4, 207, 38)';
              nodes[attributeType].color = 'rgb(4, 207, 38)';
            } else {
              if (!nodes[attributes[graph][i].subjectType].color) {
                nodes[attributes[graph][i].subjectType].color = 'rgba(52, 161, 235,0.3)';// this could be overwritten in another relationship
              }
              if (!nodes[attributeType].color) {
                nodes[attributeType].color = 'rgba(52, 161, 235,0.3)';// this could be overwritten in another relationship
              }
            }
          }
          // add the arrow
          visData[graph].edges.push({
            from: ids[attributes[graph][i].subjectType],
            to: ids[attributeType],
            arrows: "to",
            label: attributes[graph][i].p,
            color: highlightSHACL && attributes[graph][i].shaclTemplates.indexOf(highlightSHACL) > -1 ? 'rgb(4, 207, 38)' : 'rgba(52, 161, 235, 0.3)',
            dashes: highlightSHACL && attributes[graph][i].shaclTemplates.indexOf(highlightSHACL) === -1 ? true : false,
            width: highlightSHACL && attributes[graph][i].shaclTemplates.indexOf(highlightSHACL) === -1 ? 2 : undefined
          });
        }
      }
      // add all unique and highlighted nodes
      for (const node in nodes) {
        if (nodes.hasOwnProperty(node)) {
          visData[graph].nodes.push(nodes[node]);
        }
      }
    }
    res.render('visualize', {
      title: 'Datamodel visualization',
      cacheWarmedup: true,
      graphs: graphsResult.graphs,
      shaclTemplates: shacl.getShaclTemplateNames(),
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
