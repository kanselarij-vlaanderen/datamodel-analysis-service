require('dotenv').config();
import { app, errorHandler } from 'mu';
import main from './routes/main';
import { join } from 'path';
import { engine } from 'express-handlebars';


app.engine('hbs', engine({extname: '.hbs'}));
app.set('view engine', 'hbs');
app.set('views', join(__dirname,'views'));

/* We need to explictly set the res.type in mu-javascript-template */
app.get('/', (req, res) => {
  res.type('html');
  res.sendFile(join(__dirname, 'public', 'index.html'));
});
app.get('/style.css', (req, res) => {
  res.type('text/css');
  res.sendFile(join(__dirname, 'public', 'style.css'));
});
app.get('/vis-network.min.js', (req, res) => {
  res.type('text/javascript');
  res.sendFile(join(__dirname, 'public', 'vis-network.min.js'));
});

app.use(main);

app.use(errorHandler);
