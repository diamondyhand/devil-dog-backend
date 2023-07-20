const Joi = require('@hapi/joi');

const schemas = {
  signUp: Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
  }),
  userSignup: Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    username: Joi.string().required(),
    password: Joi.string().required()
  }),
  userLogin: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};

module.exports = schemas;
