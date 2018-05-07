const passport = require("passport");
const router = require("express").Router();

const options = { session: false, failWithError: true };

const localAuth = passport.authenticate("local", options);

router.post("/login", localAuth, (req, res) => {
  return res.json(req.user);
});

module.exports = router;
