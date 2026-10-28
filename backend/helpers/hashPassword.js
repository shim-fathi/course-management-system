const bcrypt = require("bcrypt");

const BCRYPT_MAX_BYTES = 72;
const BCRYPT_ROUNDS = 10;

const hashPassword = (password) =>
  bcrypt.hash(password, BCRYPT_ROUNDS);

module.exports = {
  BCRYPT_MAX_BYTES,
  hashPassword,
};
