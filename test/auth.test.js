const app = require(`../server`)
const chai = require(`chai`)
const chaiHttp = require(`chai-http`)
const mongoose = require(`mongoose`)
const jwt = require(`jsonwebtoken`)

const { TEST_MONGODB_URI, JWT_SECRET } = require(`../config`)

const User = require(`../models/user`)

const expect = chai.expect
chai.use(chaiHttp)

describe.only(`Noteful API - Login`, function() {
  const fullname = `Example User`
  const username = `exampleUser`
  const password = `password`

  before(function() {
    return mongoose
      .connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase())
  })

  beforeEach(function() {
    return User.hashPassword(password).then(hash => {
      return User.create({ username, fullname, password: hash })
    })
  })

  afterEach(function() {
    return mongoose.connection.db.dropDatabase()
  })

  after(function() {
    return mongoose.disconnect()
  })

  it(`Should return a valid auth token`, function() {
    return chai
      .request(app)
      .post(`/api/login`)
      .send({ username, password })
      .then(res => {
        expect(res).to.have.status(200)
        expect(res.body).to.be.an(`object`)
        expect(res.body.authToken).to.be.a(`string`)

        const payload = jwt.verify(res.body.authToken, JWT_SECRET)

        expect(payload.user).to.not.have.property(`password`)
        expect(payload.user.username).to.equal(username)
        expect(payload.user.fullname).to.equal(fullname)
      })
  })

  it(`Should reject requests with no credentials`, () => {
    return chai
      .request(app)
      .post(`/api/login`)
      .then(res => {
        expect(res).to.have.status(400)
        expect(res.body.message).to.eq(`Bad Request`)
      })
  })
  it(`Should reject requests with incorrect usernames`, () => {
    return chai
      .request(app)
      .post(`/api/login`)
      .send({ username: `aufhauilsfhasd`, password })
      .then(res => {
        expect(res).to.have.status(500)
        expect(res.body.message).to.eq(`Incorrect Username`)
      })
  })
  it(`Should reject requests with incorrect passwords`, () => {
    return chai
      .request(app)
      .post(`/api/login`)
      .send({ username, password: `adijasasfdfifa` })
      .then(res => {
        expect(res).to.have.status(500)
        expect(res.body.message).to.eq(`Incorrect Password`)
      })
  })
})
