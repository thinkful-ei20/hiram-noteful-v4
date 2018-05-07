const router = require("express").Router();
const User = require("../models/user");

router.post("/", (req, res, next) => {
  newUser = {
    username: req.body.username,
    fullname: req.body.fullname
  };

  User.hashPassword(req.body.password)
    .then(password => {
      newUser.password = password;
      return User.create(newUser);
    })
    .then(user => {
      res
        .status(201)
        .location(`${req.originalUrl}/${user.id}`)
        .json(user);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error("Username already exists");
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;
