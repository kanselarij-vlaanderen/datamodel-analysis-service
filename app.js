require('dotenv').config();
import { app, errorHandler } from 'mu';
import main from './routes/main';
import { join } from 'path';
import { engine } from 'express-handlebars';

const testFolder = join('/public');
const fs = require('fs');

fs.readdir(testFolder, (err, files) => {
  files.forEach(file => {
    console.log(file);
  });
});

app.engine('hbs', engine({extname: '.hbs'}));
app.set('view engine', 'hbs');
app.set('views', join('/views'));

/* We need to explictly set the res.type in mu-javascript-template */
app.get('/', (req, res) => {
  res.type('html');
  res.sendFile(join('/public', 'index.html'));
});
app.get('/style.css', (req, res) => {
  res.type('text/css');
  res.sendFile(join('/public', 'style.css'));
});
app.get('/vis-network.min.js', (req, res) => {
  res.type('text/javascript');
  res.sendFile(join('/public', 'vis-network.min.js'));
});

app.use(main);

app.use(errorHandler);
