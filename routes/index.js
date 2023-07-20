const users = require('../src/users/routes');

module.exports = (app) => {
  // app.use('/users', users);
  
  app.use('*', (req, res) => {
    res.send('Not found!!!');
  });
};
