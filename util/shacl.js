import { promises as fsp } from 'fs';
import * as path from 'path';
import * as rdflib from 'rdflib';
import prefixes from './prefixes';
/*
  The application allows SHACL .ttl files to be included in the ../config/shacl/ directory.
  These templates will then be loaded here, and can be used to look up whether a given subject-predicate-object relationship is a valid shape for this template.
*/
const SHACL = rdflib.Namespace("http://www.w3.org/ns/shacl#");
const normalizedPath = path.join("/config", "shacl");
let shaclTemplates = [];
fsp.readdir(normalizedPath).then(async (files) => {
  if (files) {
    for (const file of files) {
      let rdfStore = rdflib.graph();
      let shacl = await fsp.readFile(path.join("/config", "shacl", file), "utf8");
      try {
        rdflib.parse(shacl, rdfStore, 'http://localhost:8889/shacl/' + file, 'text/turtle');
      } catch (err) {
        console.log(err);
      }
      shaclTemplates.push({
        name: file,
        store: rdfStore
      })
    }
  }
});
export default {
  /* Gets the names of the loaded SHACL templates */
  getShaclTemplateNames: function () {
    return shaclTemplates.map((item) => { return item.name; })
  },
  /* Checks if a subject appears in a shaclTemplate */
  isValidSubject: function (shaclTemplate, subjectType, ignorehttps) {
    try {
      let nodeShape = shaclTemplate.store.any(undefined, SHACL('targetClass'), rdflib.sym(prefixes.removePrefixes(subjectType)));
      if (nodeShape && nodeShape.value) {
        return true;
      } else if (ignorehttps) {
        nodeShape = shaclTemplate.store.any(undefined, SHACL('targetClass'), rdflib.sym(prefixes.removePrefixes(subjectType).replace('https://', 'http://')));
        if (nodeShape && nodeShape.value) {
          return true;
        } else {
          nodeShape = shaclTemplate.store.any(undefined, SHACL('targetClass'), rdflib.sym(prefixes.removePrefixes(subjectType).replace('http://', 'https://')));
          return nodeShape && nodeShape.value;
        }
      }
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  /* Checks if an object appears in a shaclTemplate */
  isValidObject: function (shaclTemplate, objectType, ignorehttps) {
    try {
      let nodeShape = shaclTemplate.store.any(undefined, SHACL('class'), rdflib.sym(prefixes.removePrefixes(objectType)));
      if (nodeShape && nodeShape.value) {
        return true;
      } else if (ignorehttps) {
        nodeShape = shaclTemplate.store.any(undefined, SHACL('class'), rdflib.sym(prefixes.removePrefixes(objectType).replace('https://', 'http://')));
        if (nodeShape && nodeShape.value) {
          return true;
        } else {
          nodeShape = shaclTemplate.store.any(undefined, SHACL('class'), rdflib.sym(prefixes.removePrefixes(objectType).replace('http://', 'https://')));
          return nodeShape && nodeShape.value;
        }
      }
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  /* Checks if an attribute appears in a shaclTemplate */
  isValidAttribute: function (shaclTemplate, dataType, ignorehttps) {
    try {
      let nodeShape = shaclTemplate.store.any(undefined, SHACL('datatype'), rdflib.sym(prefixes.removePrefixes(dataType)));
      if (nodeShape && nodeShape.value) {
        return true;
      } else if (ignorehttps) {
        nodeShape = shaclTemplate.store.any(undefined, SHACL('datatype'), rdflib.sym(prefixes.removePrefixes(dataType).replace('https://', 'http://')));
        if (nodeShape && nodeShape.value) {
          return true;
        } else {
          nodeShape = shaclTemplate.store.any(undefined, SHACL('datatype'), rdflib.sym(prefixes.removePrefixes(dataType).replace('http://', 'https://')));
          return nodeShape && nodeShape.value;
        }
      }
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  /* Checks all SHACL templates for a given subject, and returns an array of template names where the shape is present */
  getShaclTemplatesForSubject: function (subjectType, ignorehttps) {
    let validShaclTemplates = [];
    for (const shaclTemplate of shaclTemplates) {
      let isValid = this.isValidSubject(shaclTemplate, subjectType, ignorehttps);
      if (isValid) {
        validShaclTemplates.push(shaclTemplate.name);
      }
    }
    return validShaclTemplates;
  },


  /* Checks all SHACL templates for a given subject, and returns an array of template names where the shape is present */
  getShaclTemplatesForObject: function (objectType, ignorehttps) {
    let validShaclTemplates = [];
    for (const shaclTemplate of shaclTemplates) {
      let isValid = this.isValidObject(shaclTemplate, objectType, ignorehttps);
      if (isValid) {
        validShaclTemplates.push(shaclTemplate.name);
      }
    }
    return validShaclTemplates;
  },


  /* Checks all SHACL templates for a given subject, and returns an array of template names where the shape is present */
  getShaclTemplatesForAttribute: function (dataType, ignorehttps) {
    let validShaclTemplates = [];
    for (const shaclTemplate of shaclTemplates) {
      let isValid = this.isValidAttribute(shaclTemplate, dataType, ignorehttps);
      if (isValid) {
        validShaclTemplates.push(shaclTemplate.name);
      }
    }
    return validShaclTemplates;
  },

  /* Checks a SHACL template for a given subject-predicate-object relationship and returns true if it is present in any shape, false if not. */
  isValidRelation: function (shaclTemplate, subjectType, predicate, objectType, ignorehttps) {
    try {
      // SPARQL queries and rdflib don't mix well. We're basically querying manually here
      // first check if a NodeShape exists with this subjectType as targetClass
      let nodeShape = shaclTemplate.store.any(undefined, SHACL('targetClass'), rdflib.sym(prefixes.removePrefixes(subjectType)));
      if (!nodeShape && ignorehttps) {
        nodeShape = shaclTemplate.store.any(undefined, SHACL('targetClass'), rdflib.sym(prefixes.removePrefixes(subjectType).replace('https://', 'http://')));
        if (!nodeShape) {
          nodeShape = shaclTemplate.store.any(undefined, SHACL('targetClass'), rdflib.sym(prefixes.removePrefixes(subjectType).replace('http://', 'https://')));
        }
      }
      if (nodeShape && nodeShape.value) {
        // now we can look if the relationship exists within this shape
        const properties = shaclTemplate.store.each(rdflib.sym(nodeShape.value), SHACL('property')); // NOTE: ignorehttps gets handled at the predicate level
        if (properties && properties.length > 0) {
          for (const property of properties) {
            let objectMatches = shaclTemplate.store.statementsMatching(property, SHACL('class'), rdflib.sym(prefixes.removePrefixes(objectType)));
            if ((!objectMatches || objectMatches.length === 0) && ignorehttps) {
              objectMatches = shaclTemplate.store.statementsMatching(property, SHACL('class'), rdflib.sym(prefixes.removePrefixes(objectType).replace('https://', 'http://')));
              if (!objectMatches || objectMatches.length === 0) {
                objectMatches = shaclTemplate.store.statementsMatching(property, SHACL('class'), rdflib.sym(prefixes.removePrefixes(objectType).replace('http://', 'https://')));
              }
            }
            if (objectMatches && objectMatches.length > 0) {
              // the object is the correct one according to the SHACL shape, so we can now check the predicate
              let predicateMatches = shaclTemplate.store.statementsMatching(property, SHACL('path'), rdflib.sym(prefixes.removePrefixes(predicate)));
              if ((!predicateMatches || predicateMatches.length === 0) && ignorehttps) {
                predicateMatches = shaclTemplate.store.statementsMatching(property, SHACL('path'), rdflib.sym(prefixes.removePrefixes(predicate).replace('https://', 'http://')));
                if (!objectMatches || objectMatches.length === 0) {
                  predicateMatches = shaclTemplate.store.statementsMatching(property, SHACL('path'), rdflib.sym(prefixes.removePrefixes(predicate).replace('http://', 'https://')));
                }
              }
              if (predicateMatches && predicateMatches.length > 0) {
                // this property has the correct subject targetClass, object class, and predicate path. So it must be valid
                return true;
              }
            } else {
              // this could be an attribute, in which case we need to check shacl:datatype instead
              let attributeMatches = shaclTemplate.store.statementsMatching(property, SHACL('datatype'), rdflib.sym(prefixes.removePrefixes(objectType)));
              if ((!attributeMatches || attributeMatches.length === 0) && ignorehttps) {
                attributeMatches = shaclTemplate.store.statementsMatching(property, SHACL('datatype'), rdflib.sym(prefixes.removePrefixes(objectType).replace('https://', 'http://')));
                if (!attributeMatches || attributeMatches.length === 0) {
                  attributeMatches = shaclTemplate.store.statementsMatching(property, SHACL('datatype'), rdflib.sym(prefixes.removePrefixes(objectType).replace('http://', 'https://')));
                }
              }
              if (attributeMatches && attributeMatches.length > 0) {
                // the object is the correct one according to the SHACL shape, so we can now check the predicate
                let predicateMatches = shaclTemplate.store.statementsMatching(property, SHACL('path'), rdflib.sym(prefixes.removePrefixes(predicate)));
                if ((!predicateMatches || predicateMatches.length === 0) && ignorehttps) {
                  predicateMatches = shaclTemplate.store.statementsMatching(property, SHACL('path'), rdflib.sym(prefixes.removePrefixes(predicate).replace('https://', 'http://')));
                  if (!objectMatches || objectMatches.length === 0) {
                    predicateMatches = shaclTemplate.store.statementsMatching(property, SHACL('path'), rdflib.sym(prefixes.removePrefixes(predicate).replace('http://', 'https://')));
                  }
                }
                if (predicateMatches && predicateMatches.length > 0) {
                  // this property has the correct subject targetClass, object class, and predicate path. So it must be valid
                  return true;
                }
              }
            }
          }
        }
        return false;
      }
      return false;
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  /* Checks all SHACL templates for a given subject-predicate-object relationship, and returns an array of template names where the shape is present */
  getShaclTemplatesForRelation: function (subjectType, predicate, objectType) {
    let validShaclTemplates = [];
    for (const shaclTemplate of shaclTemplates) {
      let isValid = this.isValidRelation(shaclTemplate, subjectType, predicate, objectType);
      if (isValid) {
        validShaclTemplates.push(shaclTemplate.name);
      }
    }
    return validShaclTemplates;
  }
};
