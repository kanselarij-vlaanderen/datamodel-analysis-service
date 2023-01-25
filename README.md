# Datamodel Analysis Service

This service analyses the triplestore in the mu-semtech stack and provides insight into the resource types and relationships present in each graph.

## Integration in mu-semtech stack

Add the following to your docker-compose.override.yml to run the service in the mu-semtech stack:

```
datamodel-analysis-service:
  image: semtech/mu-javascript-template #only for linux users
  #image: semtech/mu-javascript-template:windows #only for windows users
  ports:
    - 8889:80
  environment:
    NODE_ENV: "development"
    DEV_OS: "windows" #only for windows users
  links:
    - triplestore:database
  volumes:
    - /path/to/your/data/directory/:/data/
    - /path/to/your/src/directory/datamodel-analysis-service/config/:/config/
    - /path/to/your/src/directory/datamodel-analysis-service/public/:/public/
    - /path/to/your/src/directory/datamodel-analysis-service/views/:/views/
```

The service will then be accessible at http://localhost:8889/
