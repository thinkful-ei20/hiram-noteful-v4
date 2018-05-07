const { Strategy: LocalStrategy } = require("passport-local");
const User = require("../models/user");

const localStrategy = new LocalStrategy((username, password, done) => {
  let user;
  User.findOne({ username })
    .then(_user => {
      user = _user;
      if (!user) {
        return Promise.reject({
          reason: "LoginError",
          message: "Incorrect Username",
          location: "username"
        });
      }
      const isValid = user.validatePassword(password);
      if (!isValid) {
        return Promise.reject({
          reason: "LoginError",
          message: "Incorrect Password",
          location: "password"
        });
      }
      return done(null, user);
    })
    .catch(err => {
      if (err.reason === "LoginError") {
        return done(null, false);
      }
      return done(err);
    });
});

module.exports = localStrategy;
