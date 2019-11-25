const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));



app.get('/',
  (req, res) => {
    res.render('index'); // this is why `/index` is '/'
  });

app.get('/create',
  (req, res) => {
    res.render('index');
  });

app.get('/links',
  (req, res, next) => {
    models.Links.getAll()
      .then(links => {
        res.status(200).send(links);
      })
      .error(error => {
        res.status(500).send(error);
      });
  });

app.post('/links',
  (req, res, next) => {
    var url = req.body.url;
    if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
      return res.sendStatus(404);
    }

    return models.Links.get({ url })
      .then(link => {
        if (link) {
          throw link;
        }
        return models.Links.getUrlTitle(url);
      })
      .then(title => {
        return models.Links.create({
          url: url,
          title: title,
          baseUrl: req.headers.origin
        });
      })
      .then(results => {
        return models.Links.get({ id: results.insertId });
      })
      .then(link => {
        throw link;
      })
      .error(error => {
        res.status(500).send(error);
      })
      .catch(link => {
        res.status(200).send(link);
      });
  });

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/signup', (req, res, next) => {
  console.log(req.body);
  var username = req.body.username;
  var userId;
  var password;
  models.Users.get({ username })
    .then((data) => {
      // if username already exists
      if (data) {
        console.log('username already exists \n');
        res.redirect('/signup');
      } else {
        // create a username if username does not exist
        models.Users.create(req.body)
          .then( () => {
            console.log('aye, you did it! \n');
            res.redirect('/');
          })
          // .then( callback(err, models.Users))
          .catch( (err) => {
            console.log('something went wrong homie \n');
            res.redirect('/');
          });
      }
    });
});

app.post('/login', (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;
  console.log('this is username: ', username);
  models.Users.get({ username })
    .then((data) => {
      console.log('this is data: ', data);
      if (data) {
        console.log ('lmao u got ur password right \n');
        if (models.Users.compare(req.body.password, data.password, data.salt)) {
          console.log('heh u got p far, my dude \n');
          res.redirect('/');
        } else {
          // res.alert('try again');
          res.status(404).redirect('/login');
        }
      } else {
        res.redirect('/login');
      }
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
