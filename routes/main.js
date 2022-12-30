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
      let currentId = 1;
      if (relationships[graph]) {
        for (let i = 0; i < relationships[graph].length; i++) {
          if (highlightSHACL) {
            // look into the SHACL templates
            relationships[graph][i].shaclTemplates = shacl.getShaclTemplatesForRelation(relationships[graph][i].subjectType, relationships[graph][i].p, relationships[graph][i].objectType, req.query.ignorehttps === 'true');
          }
          // add the node for the subject resource type
          if (!ids[relationships[graph][i].subjectType]) {
            let subjectNode = { id: currentId + 1, label: relationships[graph][i].subjectType, shape: 'box' };
            if (highlightSHACL) {
              // look into the SHACL templates
              let shaclTemplates = shacl.getShaclTemplatesForSubject(relationships[graph][i].subjectType, req.query.ignorehttps === 'true');
              if (shaclTemplates && shaclTemplates.length > 0) {
                subjectNode.color = 'rgb(4, 207, 38)';
              } else {
                subjectNode.color = 'rgba(52, 161, 235,0.1)';
              }
            }
            visData[graph].nodes.push(subjectNode);
            ids[relationships[graph][i].subjectType] = currentId + 1;
            currentId++;
          }
          // add the node for the object resource type
          if (!ids[relationships[graph][i].objectType]) {
            let objectNode = { id: currentId + 1, label: relationships[graph][i].objectType, shape: 'box' };
            if (highlightSHACL) {
              // look into the SHACL templates
              let shaclTemplates = shacl.getShaclTemplatesForSubject(relationships[graph][i].objectType, req.query.ignorehttps === 'true');
              if (shaclTemplates && shaclTemplates.length > 0) {
                objectNode.color = 'rgb(4, 207, 38)';
              } else {
                objectNode.color = 'rgba(52, 161, 235, 0.5)';
              }
            }
            visData[graph].nodes.push(objectNode);
            ids[relationships[graph][i].objectType] = currentId + 1;
            currentId++;
          }
          // add the arrow
          visData[graph].edges.push({
            from: ids[relationships[graph][i].subjectType],
            to: ids[relationships[graph][i].objectType],
            arrows: "to",
            label: relationships[graph][i].p,
            color: highlightSHACL && relationships[graph][i].shaclTemplates.indexOf(highlightSHACL) > -1 ? 'rgb(4, 207, 38)' : 'rgba(52, 161, 235, 0.5)',
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
            let subjectNode = { id: currentId + 1, label: attributes[graph][i].subjectType, shape: 'box' };
            if (highlightSHACL) {
              // look into the SHACL templates
              let shaclTemplates = shacl.getShaclTemplatesForSubject(attributes[graph][i].subjectType, req.query.ignorehttps === 'true');
              if (shaclTemplates && shaclTemplates.length > 0) {
                subjectNode.color = 'rgb(4, 207, 38)';
              } else {
                subjectNode.color = 'rgba(52, 161, 235,0.1)';
              }
            }
            visData[graph].nodes.push(subjectNode);
            ids[attributes[graph][i].subjectType] = currentId + 1;
            currentId++;
          }
          // add a new node for an attribute per subject resource type, or the network graphs get too dense
          let attributeId = req.query.attributeGrouping === 'individual' ? attributes[graph][i].objectType + (currentId + 1) : attributes[graph][i].subjectType + '-' + attributes[graph][i].objectType;
          if (!ids[attributeId]) {
            visData[graph].nodes.push({ id: currentId + 1, label: attributes[graph][i].objectType, shape: 'box', color: 'orange' });
            ids[attributeId] = currentId + 1;
            currentId++;
          }
          // add the arrow
          visData[graph].edges.push({
            from: ids[attributes[graph][i].subjectType],
            to: ids[attributeId],
            arrows: "to",
            label: attributes[graph][i].p,
            color: highlightSHACL && attributes[graph][i].shaclTemplates.indexOf(highlightSHACL) > -1 ? 'rgb(4, 207, 38)' : 'rgba(52, 161, 235, 0.5)',
            dashes: highlightSHACL && attributes[graph][i].shaclTemplates.indexOf(highlightSHACL) === -1 ? true : false,
            width: highlightSHACL && attributes[graph][i].shaclTemplates.indexOf(highlightSHACL) === -1 ? 2 : undefined
          });
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
