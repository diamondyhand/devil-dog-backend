const express = require('express');

const controller = require('./controller/index');
const validateSchemas = require('../../middlewares/validateSchemas');
const schemas = require('./utils/schemasValidation');

const router = express.Router();

router.post(
  '/api/v1/auth/registerbody',
  // validateSchemas.inputs(schemas.userSignup, 'body'),
  (req, res) => {
    controller.createUser(res, req);
  }
);

router.post(
  '/api/v1/auth/login',
  validateSchemas.inputs(schemas.userLogin, 'body'),
  (req, res) => {
    controller.loginUser(res, req);
  }
);

router.post(
  '/api/v1/auth/update',
  (req, res) => {
    controller.updateUser(res, req);
  }
);

router.get(
  '/api/v1/auth/user',
  (req, res) => {
    controller.authUser(res, req);
  }
);

module.exports = router;