
require("dotenv").config();
const client = require('../../../services/db');

const winston = require('winston');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const consoleTransport = new winston.transports.Console()
const myWinstonOptions = {
  transports: [consoleTransport]
}
const logger = new winston.createLogger(myWinstonOptions)

// Users API

const createUser = async (parameters, res) => {
  try {
    const { email, first_name, last_name, birthdate, country, password } = parameters;
    const userData =
      'select * from users where email=$1';
    const response = await client.query(userData, [email]);

    if (response.rows[0]) {
      return res.status(500).json({ success: false, message: 'USER_ALREADY_EXISTS' });
    }

    const hash = await bcrypt.hash(password, 10);

    const insertUser =
      'INSERT INTO users (email, first_name, last_name, birthdate, country, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';

    const resultUser = await client.query(insertUser, [
      email, first_name, last_name, birthdate, country, hash
    ]);
    if (resultUser.rows[0]) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ success: false, message: 'UNABLE_TO_REGISTER_USER' });
    }
  } catch (e) {
    logger.error(`User signup error: ${e}`);
    return res.status(500).json({
      success: false,
      message: e
    })
  }
};

const loginUser = async (parameters, res) => {
  try {
    const { email, password } = parameters;
    const userData =
      'select * from users where email=$1';
    const response = await client.query(userData, [email]);

    if (!response.rows[0]) {
      return res.status(500).json({ success: false, message: 'USER_NOT_FOUND' });
    }

    const passCheck = await bcrypt.compare(password, response.rows[0].password);
    if (!passCheck) {
      return res.status(500).json({ success: false, message: 'INVALID_PASSWORD' });
    }

    const token = jwt.sign(
      { user_id: response.rows[0].id },
      "sfdfdsfdf12332323!344$$2",
      {
        expiresIn: "10h",
      }
    );
    // TODO: implement it properly
    const refreshToken = jwt.sign(
      { user_id: response.rows[0].id },
      "kldsjkdsjkdsj!344$$2",
      {
        expiresIn: "10h",
      }
    );

    return res.status(200).json({
      success: true,
      user: {
        id: response.rows[0].id,
        email: response.rows[0].email,
        first_name: response.rows[0].first_name,
        last_name: response.rows[0].last_name,
        birthdate: response.rows[0].birthdate,
        country: response.rows[0].country,
      },
      token: token,
      refreshToken: refreshToken
    });

  } catch (e) {
    logger.error(`User login error: ${e}`);
    return res.status(500).json({
      success: false,
      message: e
    })
  }
};
const updateUser = async (parameters, res) => {
  try {
    const { id, email, first_name, last_name, birthdate, country, password } = parameters;
    const userData =
      'select * from users where email=$1';
    const response = await client.query(userData, [email]);

    const hash = await bcrypt.hash(password, 10);
    // if (response.rows[0]) {
    //   return res.status(500).json({ success: false, message: 'EMAIL_ALREADY_EXISTS' }); 
    // }

    await client.query("update users set first_name = $2, last_name =$3, birthdate =$4, country =$5, password =$6 where id = $7", [email, first_name, last_name, birthdate, country, hash, id]);

    const token = jwt.sign(
      { user_id: id },
      "sfdfdsfdf12332323!344$$2",
      {
        expiresIn: "10h",
      }
    );
    // TODO: implement it properly
    const refreshToken = jwt.sign(
      { user_id: id },
      "kldsjkdsjkdsj!344$$2",
      {
        expiresIn: "10h",
      }
    );

    return res.status(200).json({
      success: true,
      user: {
        id: id,
        email: email,
        first_name: first_name,
        last_name: last_name,
        birthdate: birthdate,
        country: country,
      },
      token: token,
      refreshToken: refreshToken
    });

  } catch (e) {
    logger.error(`User login error: ${e}`);
    return res.status(500).json({
      success: false,
      message: e
    })
  }
};

const authUser = async (headers, res) => {
  try {
    const jwtToken = headers["authorization"];
    if (!jwtToken) {
      return res.status(404).json({ success: false, msg: "Token not found" });
    }

    const token = jwtToken.split(" ")[1];
    const decoded = jwt.verify(token, "sfdfdsfdf12332323!344$$2");

    const userId = decoded.user_id;

    console.log(decoded)

    const userData =
      'select email, first_name, last_name, birthdate, country from users where id=$1';
    const response = await client.query(userData, [userId]);

    if (!response.rows[0]) {
      return res.status(500).json({ success: false, message: 'USER_NOT_FOUND' });
    }

    return res.status(200).json({
      user: {
        email: response.rows[0].email,
        first_name: response.rows[0].first_name,
        last_name: response.rows[0].last_name,
        birthdate: response.rows[0].birthdate,
        country: response.rows[0].country,
      }
    });

  } catch (e) {
    logger.error(`User auth error: ${e}`);
    return res.status(500).json({
      success: false,
      message: e
    })
  }
};

module.exports.createUser = async (res, req) => {
  await createUser(req.body, res);
};

module.exports.loginUser = async (res, req) => {
  await loginUser(req.body, res);
};
module.exports.updateUser = async (res, req) => {
  await updateUser(req.body, res);
};

module.exports.authUser = async (res, req) => {
  await authUser(req.headers, res);
};

