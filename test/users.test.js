const app = require(`../server`)
const chai = require(`chai`)
const chaiHttp = require(`chai-http`)
const mongoose = require(`mongoose`)

const { TEST_MONGODB_URI } = require(`../config`)

const User = require(`../models/user`)

const expect = chai.expect

chai.use(chaiHttp)

describe(`Noteful API - Users`, function() {
  const username = `exampleUser`
  const password = `examplePass`
  const fullname = `Example User`

  before(function() {
    return mongoose
      .connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase())
  })

  beforeEach(function() {
    return User.createIndexes()
  })

  afterEach(function() {
    return mongoose.connection.db.dropDatabase()
  })

  after(function() {
    return mongoose.disconnect()
  })

  describe(`/api/users`, function() {
    describe(`POST`, function() {
      it(`Should create a new user`, function() {
        const testUser = { username, password, fullname }

        let res
        return chai
          .request(app)
          .post(`/api/users`)
          .send(testUser)
          .then(_res => {
            res = _res
            expect(res).to.have.status(201)
            expect(res.body).to.be.an(`object`)
            expect(res.body).to.have.keys(`id`, `username`, `fullname`)

            expect(res.body.id).to.exist
            expect(res.body.username).to.equal(testUser.username)
            expect(res.body.fullname).to.equal(testUser.fullname)

            return User.findOne({ username })
          })
          .then(user => {
            expect(user).to.exist
            expect(user.id).to.equal(res.body.id)
            expect(user.fullname).to.equal(testUser.fullname)
            return user.validatePassword(password)
          })
          .then(isValid => {
            expect(isValid).to.be.true
          })
      })
      it(`Should reject users with missing username`, function() {
        const testUser = { password, fullname }
        return chai
          .request(app)
          .post(`/api/users`)
          .send(testUser)
          .then(res => {
            expect(res).have.status(422)
            expect(res.body.message).to.eq(`Missing field`)
            expect(res.body.location).to.eq(`username`)
          })
      })

      it(`Should reject users with missing password`, () => {
        const testUser = { username, fullname }
        return chai
          .request(app)
          .post(`/api/users`)
          .send(testUser)
          .then(res => {
            expect(res).have.status(422)
            expect(res.body.message).to.eq(`Missing field`)
            expect(res.body.location).to.eq(`password`)
          })
      })
      it(`Should reject users with non-string username`, () => {
        const testUser = { password, fullname, username: 1231233123 }
        return chai
          .request(app)
          .post(`/api/users`)
          .send(testUser)
          .then(res => {
            expect(res).have.status(422)
            expect(res.body.message).to.eq(
              `Incorrect field type: expected string`
            )
            expect(res.body.location).to.eq(`username`)
          })
      })
      it(`Should reject users with non-string password`, () => {
        const testUser = { password: 123612312, fullname, username }
        return chai
          .request(app)
          .post(`/api/users`)
          .send(testUser)
          .then(res => {
            expect(res).have.status(422)
            expect(res.body.message).to.eq(
              `Incorrect field type: expected string`
            )
            expect(res.body.location).to.eq(`password`)
          })
      })
      it(`Should reject users with non-trimmed username`, () => {
        const testUser = { password, fullname, username: `${username} ` }
        return chai
          .request(app)
          .post(`/api/users`)
          .send(testUser)
          .then(res => {
            expect(res).have.status(422)
            expect(res.body.message).to.eq(
              `Cannot start or end with whitespace`
            )
            expect(res.body.location).to.eq(`username`)
          })
      })
      it(`Should reject users with non-trimmed password`, () => {
        const testUser = { password: `${password} `, fullname, username }
        return chai
          .request(app)
          .post(`/api/users`)
          .send(testUser)
          .then(res => {
            expect(res).have.status(422)
            expect(res.body.message).to.eq(
              `Cannot start or end with whitespace`
            )
            expect(res.body.location).to.eq(`password`)
          })
      })
      it(`Should reject users with empty username`, () => {
        const testUser = { password, fullname, username: `` }
        return chai
          .request(app)
          .post(`/api/users`)
          .send(testUser)
          .then(res => {
            expect(res).have.status(422)
            expect(res.body.message).to.eq(`Must be at least 1 characters long`)
            expect(res.body.location).to.eq(`username`)
          })
      })
      it(`Should reject users with password less than 8 characters`, () => {
        const testUser = { password: `12g67h`, fullname, username }
        return chai
          .request(app)
          .post(`/api/users`)
          .send(testUser)
          .then(res => {
            expect(res).have.status(422)
            expect(res.body.message).to.eq(`Must be at least 8 characters long`)
            expect(res.body.location).to.eq(`password`)
          })
      })
      it(`Should reject users with password greater than 72 characters`, () => {
        const testUser = { password: `12g67h`.repeat(20), fullname, username }
        return chai
          .request(app)
          .post(`/api/users`)
          .send(testUser)
          .then(res => {
            expect(res).have.status(422)
            expect(res.body.message).to.eq(`Must be at most 72 characters long`)
            expect(res.body.location).to.eq(`password`)
          })
      })
      it(`Should reject users with duplicate username`, () => {
        const testUser = { password, fullname, username }
        return User.create(testUser)
          .then(() =>
            chai
              .request(app)
              .post(`/api/users`)
              .send(testUser)
          )
          .then(res => {
            expect(res).have.status(400)
            expect(res.body.message).to.eq(`Username already exists`)
          })
      })
      it(`Should trim fullname`, () => {
        const testUser = { password, fullname: `${fullname}  `, username }
        return chai
          .request(app)
          .post(`/api/users`)
          .send(testUser)
          .then(res => {
            expect(res).have.status(201)
            expect(res.body.fullname).to.eq(fullname)
          })
      })
    })

    describe(`GET`, function() {
      it(`Should return an empty array initially`, function() {
        return chai
          .request(app)
          .get(`/api/users`)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res.body).to.be.an(`array`)
            expect(res.body).to.have.length(0)
          })
      })
      it(`Should return an array of users`, function() {
        const testUser0 = {
          username: `${username}0`,
          password: `${password}0`,
          fullname: ` ${fullname}0`
        }
        const testUser1 = {
          username: `${username}1`,
          password: `${password}1`,
          fullname: `${fullname}1`
        }
        const testUser2 = {
          username: `${username}2`,
          password: `${password}2`,
          fullname: `${fullname}2`
        }

        return chai
          .request(app)
          .post(`/api/users`)
          .send({ username, password, fullname })
          .then(() => {
            return User.insertMany([testUser0, testUser1, testUser2])
          })
          .then(() => {
            return chai
              .request(app)
              .post(`/api/login`)
              .send({ username, password })
          })
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.an(`object`)
            expect(res.body).to.haveOwnProperty(`authToken`)
            return chai
              .request(app)
              .get(`/api/users`)
              .set(`authorization`, `Bearer ${res.body.authToken}`)
          })
          .then(res => {
            const users = res.body
            expect(users.length).to.eq(4)
            expect(users[0].username).to.eq(username)
          })
      })
    })
  })
})
