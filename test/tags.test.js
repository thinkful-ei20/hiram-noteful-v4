"use strict"
const app = require(`../server`)
const chai = require(`chai`)
const chaiHttp = require(`chai-http`)
const mongoose = require(`mongoose`)

const { TEST_MONGODB_URI } = require(`../config`)

const Tag = require(`../models/tag`)
const seedTags = require(`../db/seed/tags`)
const User = require(`../models/user`)
const seedUsers = require(`../db/seed/users`)

const expect = chai.expect

chai.use(chaiHttp)

const testUser = { username: `user0`, password: `password` }
const testId = `333333333333333333333300`
let token

describe(`Noteful API - Tags`, function() {
  before(function() {
    return mongoose
      .connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase())
  })

  beforeEach(function() {
    return User.insertMany(seedUsers)
      .then(() => User.createIndexes())
      .then(() => Tag.insertMany(seedTags))
      .then(() => Tag.createIndexes())
      .then(() =>
        chai
          .request(app)
          .post(`/api/login`)
          .send(testUser)
      )
      .then(res => {
        token = res.body.authToken
      })
  })

  afterEach(function() {
    return mongoose.connection.db
      .dropDatabase()
      .catch(err => console.error(err))
  })

  after(function() {
    return mongoose.disconnect()
  })

  describe(`GET /api/tags`, function() {
    it(`should return the correct number of tags`, function() {
      return Promise.all([
        Tag.find({ userId: testId }),
        chai
          .request(app)
          .get(`/api/tags`)
          .set(`authorization`, `Bearer ${token}`)
      ]).then(([data, res]) => {
        expect(res).to.have.status(200)
        expect(res).to.be.json
        expect(res.body).to.be.a(`array`)
        expect(res.body).to.have.length(data.length)
      })
    })

    it(`should return a list with the correct right fields`, function() {
      return Promise.all([
        Tag.find({ userId: testId }),
        chai
          .request(app)
          .get(`/api/tags`)
          .set(`authorization`, `Bearer ${token}`)
      ]).then(([data, res]) => {
        expect(res).to.have.status(200)
        expect(res).to.be.json
        expect(res.body).to.be.a(`array`)
        expect(res.body).to.have.length(data.length)
        res.body.forEach(function(item) {
          expect(item).to.be.a(`object`)
          expect(item).to.have.keys(
            `id`,
            `name`,
            `createdAt`,
            `updatedAt`,
            `userId`
          )
        })
      })
    })
  })

  describe(`GET /api/tags/:id`, function() {
    it(`should return correct tags`, function() {
      let data
      return Tag.findOne({ userId: testId })
        .select(`id name`)
        .then(_data => {
          data = _data
          return chai
            .request(app)
            .get(`/api/tags/${data.id}`)
            .set(`authorization`, `Bearer ${token}`)
        })
        .then(res => {
          expect(res).to.have.status(200)
          expect(res).to.be.json

          expect(res.body).to.be.an(`object`)
          expect(res.body).to.have.keys(
            `id`,
            `name`,
            `createdAt`,
            `updatedAt`,
            `userId`
          )

          expect(res.body.id).to.equal(data.id)
          expect(res.body.name).to.equal(data.name)
        })
    })

    it(`should respond with a 400 for an invalid ID`, function() {
      const badId = `99-99-99`

      return chai
        .request(app)
        .get(`/api/tags/${badId}`)
        .set(`authorization`, `Bearer ${token}`)
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(400)
          expect(res.body.message).to.eq(`The \`id\` is not valid`)
        })
    })

    it(`should respond with a 404 for an ID that does not exist`, function() {
      return chai
        .request(app)
        .get(`/api/tags/AAAAAAAAAAAAAAAAAAAAAAAA`)
        .set(`authorization`, `Bearer ${token}`)
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(404)
        })
    })
  })

  describe(`POST /api/tags`, function() {
    it(`should create and return a new item when provided valid data`, function() {
      const newItem = {
        name: `newTag`
      }
      let body
      return chai
        .request(app)
        .post(`/api/tags`)
        .set(`authorization`, `Bearer ${token}`)
        .send(newItem)
        .then(function(res) {
          body = res.body
          expect(res).to.have.status(201)
          expect(res).to.have.header(`location`)
          expect(res).to.be.json
          expect(body).to.be.a(`object`)
          expect(body).to.include.keys(`id`, `name`, `userId`)
          return Tag.findById(body.id)
        })
        .then(data => {
          expect(body.id).to.equal(data.id)
          expect(body.name).to.equal(data.name)
        })
    })

    it(`should return an error when missing "name" field`, function() {
      const newItem = {
        foo: `bar`
      }

      return chai
        .request(app)
        .post(`/api/tags`)
        .set(`authorization`, `Bearer ${token}`)
        .send(newItem)
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(400)
          expect(res).to.be.json
          expect(res.body).to.be.a(`object`)
          expect(res.body.message).to.equal(`Missing \`name\` in request body`)
        })
    })

    it(`should return an error when given a duplicate name`, function() {
      return Tag.findOne({ userId: testId })
        .select(`id name`)
        .then(data => {
          const newItem = { name: data.name }
          return chai
            .request(app)
            .post(`/api/tags`)
            .set(`authorization`, `Bearer ${token}`)
            .send(newItem)
        })
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(400)
          expect(res).to.be.json
          expect(res.body).to.be.a(`object`)
          expect(res.body.message).to.equal(`Tag name already exists`)
        })
    })
  })

  describe(`PUT /api/tags/:id`, function() {
    it(`should update the tag`, function() {
      const updateItem = {
        name: `Updated Name`
      }
      let data
      return Tag.findOne({ userId: testId })
        .select(`id name`)
        .then(_data => {
          data = _data
          return chai
            .request(app)
            .put(`/api/tags/${data.id}`)
            .set(`authorization`, `Bearer ${token}`)
            .send(updateItem)
        })
        .then(function(res) {
          expect(res).to.have.status(200)
          expect(res).to.be.json
          expect(res.body).to.be.a(`object`)
          expect(res.body).to.include.keys(`id`, `name`, `userId`)

          expect(res.body.id).to.equal(data.id)
          expect(res.body.name).to.equal(updateItem.name)
        })
    })

    it(`should respond with a 400 for an invalid ID`, function() {
      const updateItem = {
        name: `Blah`
      }
      const badId = `99-99-99`

      return chai
        .request(app)
        .put(`/api/tags/${badId}`)
        .set(`authorization`, `Bearer ${token}`)
        .send(updateItem)
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(400)
          expect(res.body.message).to.eq(`The \`id\` is not valid`)
        })
    })

    it(`should respond with a 404 for an ID that does not exist`, function() {
      const updateItem = {
        name: `Blah`
      }

      return chai
        .request(app)
        .put(`/api/tags/AAAAAAAAAAAAAAAAAAAAAAAA`)
        .set(`authorization`, `Bearer ${token}`)
        .send(updateItem)
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(404)
        })
    })

    it(`should return an error when missing "name" field`, function() {
      const updateItem = {
        foo: `bar`
      }

      return chai
        .request(app)
        .put(`/api/tags/9999`)
        .set(`authorization`, `Bearer ${token}`)
        .send(updateItem)
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(400)
          expect(res).to.be.json
          expect(res.body).to.be.a(`object`)
          expect(res.body.message).to.equal(`Missing \`name\` in request body`)
        })
    })

    it(`should return an error when given a duplicate name`, function() {
      return Tag.find({ userId: testId })
        .select(`id name`)
        .limit(2)
        .then(results => {
          const [item1, item2] = results
          item1.name = item2.name
          return chai
            .request(app)
            .put(`/api/tags/${item1.id}`)
            .set(`authorization`, `Bearer ${token}`)
            .send(item1)
        })
        .catch(err => err.response)
        .then(res => {
          expect(res).to.have.status(400)
          expect(res).to.be.json
          expect(res.body).to.be.a(`object`)
          expect(res.body.message).to.equal(`Tag name already exists`)
        })
    })
  })

  describe(`DELETE /api/tags/:id`, function() {
    it(`should delete an existing document and respond with 204`, function() {
      let data
      return Tag.findOne({ userId: testId })
        .then(_data => {
          data = _data
          return chai
            .request(app)
            .delete(`/api/tags/${data.id}`)
            .set(`authorization`, `Bearer ${token}`)
        })
        .then(function(res) {
          expect(res).to.have.status(204)
          return Tag.count({ _id: data.id })
        })
        .then(count => {
          expect(count).to.equal(0)
        })
    })

    it(`should respond with 404 when document does not exist`, function() {
      return chai
        .request(app)
        .delete(`/api/tags/DOESNOTEXIST`)
        .set(`authorization`, `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(204)
        })
    })
  })
})
