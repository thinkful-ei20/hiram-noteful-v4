"use strict"
const app = require(`../server`)
const chai = require(`chai`)
const chaiHttp = require(`chai-http`)
const mongoose = require(`mongoose`)

const { TEST_MONGODB_URI } = require(`../config`)

const User = require(`../models/user`)
const Note = require(`../models/note`)
const Folder = require(`../models/folder`)
const Tag = require(`../models/tag`)
const seedUsers = require(`../db/seed/users`)
const seedNotes = require(`../db/seed/notes`)
const seedFolders = require(`../db/seed/folders`)
const seedTags = require(`../db/seed/tags`)

const expect = chai.expect

chai.use(chaiHttp)

const testUser = { username: `user0`, password: `password` }
const testId = `333333333333333333333300`

describe(`Noteful API - Notes`, function() {
  let token

  before(function() {
    return mongoose
      .connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase())
  })

  beforeEach(function() {
    return Promise.all([
      User.insertMany(seedUsers),
      Folder.insertMany(seedFolders),
      Tag.insertMany(seedTags),
      Note.insertMany(seedNotes)
    ])
      .then(() =>
        Promise.all([
          User.createIndexes(),
          Tag.createIndexes(),
          Folder.createIndexes()
        ])
      )
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
    return mongoose.connection.db.dropDatabase()
  })

  after(function() {
    return mongoose.disconnect()
  })

  describe(`GET /api/notes`, function() {
    it(`should return the correct number of Notes`, function() {
      return Promise.all([
        Note.find({ userId: testId }),
        chai
          .request(app)
          .get(`/api/notes`)
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
        Note.find({ userId: testId }),
        chai
          .request(app)
          .get(`/api/notes`)
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
            `title`,
            `content`,
            `createdAt`,
            `updatedAt`,
            `folderId`,
            `tags`,
            `userId`
          )
        })
      })
    })

    it(`should return correct search results for a searchTerm query`, function() {
      const searchTerm = `gaga`

      return Promise.all([
        Note.find({ title: { $regex: searchTerm }, userId: testId }),
        chai
          .request(app)
          .get(`/api/notes?searchTerm=${searchTerm}`)
          .set(`authorization`, `Bearer ${token}`)
      ]).then(([data, res]) => {
        expect(res).to.have.status(200)
        expect(res).to.be.json
        expect(res.body).to.be.a(`array`)
        expect(res.body).to.have.length(data.length)
      })
    })

    it(`should return correct search results for a folderId query`, function() {
      let data
      return Folder.findOne()
        .then(_data => {
          data = _data
          return Promise.all([
            Note.find({ folderId: data.id, userId: testId }),
            chai
              .request(app)
              .get(`/api/notes?folderId=${data.id}`)
              .set(`authorization`, `Bearer ${token}`)
          ])
        })
        .then(([data, res]) => {
          expect(res).to.have.status(200)
          expect(res).to.be.json
          expect(res.body).to.be.a(`array`)
          expect(res.body).to.have.length(data.length)
        })
    })

    it(`should return an empty array for an incorrect query`, function() {
      const searchTerm = `NotValid`

      return Promise.all([
        Note.find({ title: { $regex: searchTerm }, username: `user0` }),
        chai
          .request(app)
          .get(`/api/notes?searchTerm=${searchTerm}`)
          .set(`authorization`, `Bearer ${token}`)
      ]).then(([data, res]) => {
        expect(res).to.have.status(200)
        expect(res).to.be.json
        expect(res.body).to.be.a(`array`)
        expect(res.body).to.have.length(data.length)
      })
    })
  })

  describe(`GET /api/notes/:id`, function() {
    it(`should return correct note`, function() {
      let data
      return Note.findOne({ userId: testId })
        .then(_data => {
          data = _data
          return chai
            .request(app)
            .get(`/api/notes/${data.id}`)
            .set(`authorization`, `Bearer ${token}`)
        })
        .then(res => {
          expect(res).to.have.status(200)
          expect(res).to.be.json

          expect(res.body).to.be.an(`object`)
          expect(res.body).to.have.keys(
            `id`,
            `title`,
            `content`,
            `createdAt`,
            `updatedAt`,
            `folderId`,
            `tags`,
            `userId`
          )

          expect(res.body.id).to.equal(data.id)
          expect(res.body.title).to.equal(data.title)
          expect(res.body.content).to.equal(data.content)
        })
    })

    it(`should respond with status 400 and an error message when \`id\` is not valid`, function() {
      return chai
        .request(app)
        .get(`/api/notes/INVALID`)
        .set(`authorization`, `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400)
          expect(res.body.message).to.eq(`The \`id\` is not valid`)
        })
    })
  })

  describe(`POST /api/notes`, function() {
    it(`should create and return a new item when provided valid data`, function() {
      const newItem = {
        title: `The best article about cats ever!`,
        content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...`
      }
      let res
      return chai
        .request(app)
        .post(`/api/notes`)
        .send(newItem)
        .set(`authorization`, `Bearer ${token}`)
        .then(function(_res) {
          res = _res
          expect(res).to.have.status(201)
          expect(res).to.have.header(`location`)
          expect(res).to.be.json
          expect(res.body).to.be.a(`object`)
          expect(res.body).to.have.keys(
            `id`,
            `title`,
            `content`,
            `createdAt`,
            `updatedAt`,
            `tags`,
            `userId`
          )
          return Note.findById(res.body.id)
        })
        .then(data => {
          expect(res.body.title).to.equal(data.title)
          expect(res.body.content).to.equal(data.content)
        })
    })

    it(`should return an error when posting an object with a missing "title" field`, function() {
      const newItem = {
        content: `Lorem ipsum dolor sit amet, sed do eiusmod tempor...`
      }

      return chai
        .request(app)
        .post(`/api/notes`)
        .set(`authorization`, `Bearer ${token}`)
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(400)
          expect(res).to.be.json
          expect(res.body).to.be.a(`object`)
          expect(res.body.message).to.equal(`Missing \`title\` in request body`)
        })
    })
  })

  describe(`PUT /api/notes/:id`, function() {
    it(`should update the note when provided proper valid data`, function() {
      const updateItem = {
        title: `What about dogs?!`,
        content: `woof woof`
      }
      let data
      return Note.findOne({ userId: testId })
        .then(_data => {
          data = _data
          return chai
            .request(app)
            .put(`/api/notes/${data.id}`)
            .set(`authorization`, `Bearer ${token}`)
            .send(updateItem)
        })
        .then(function(res) {
          expect(res).to.have.status(200)
          expect(res).to.be.json
          expect(res.body).to.be.a(`object`)
          expect(res.body).to.have.keys(
            `id`,
            `title`,
            `content`,
            `createdAt`,
            `updatedAt`,
            `folderId`,
            `tags`,
            `userId`
          )

          expect(res.body.id).to.equal(data.id)
          expect(res.body.title).to.equal(updateItem.title)
          expect(res.body.content).to.equal(updateItem.content)
        })
    })

    it(`should respond with status 400 and an error message when \`id\` is not valid`, function() {
      const updateItem = {
        title: `What about dogs?!`,
        content: `woof woof`
      }

      return chai
        .request(app)
        .put(`/api/notes/INVALID`)
        .set(`authorization`, `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(400)
          expect(res.body.message).to.eq(`The \`id\` is not valid`)
        })
    })

    it(`should respond with a 404 for a missing id`, function() {
      const updateItem = {
        title: `What about dogs?!`,
        content: `woof woof`
      }

      return chai
        .request(app)
        .put(`/api/notes/AAAAAAAAAAAAAAAAAAAAAAAA`)
        .set(`authorization`, `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404)
        })
    })

    it(`should respond with status 400 and an error message when \`id\` is not valid`, function() {
      const updateItem = {}
      return chai
        .request(app)
        .put(`/api/notes/INVALID`)
        .set(`authorization`, `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(400)
          expect(res).to.be.json
          expect(res.body).to.be.a(`object`)
          expect(res.body.message).to.equal(`The \`id\` is not valid`)
        })
    })

    it(`should return an error when missing "title" field`, function() {
      const updateItem = {
        foo: `bar`
      }
      let data
      return Note.findOne({ userId: testId })
        .then(_data => {
          data = _data
          return chai
            .request(app)
            .put(`/api/notes/${data.id}`)
            .set(`authorization`, `Bearer ${token}`)
            .send(updateItem)
        })
        .then(res => {
          expect(res).to.have.status(400)
          expect(res).to.be.json
          expect(res.body).to.be.a(`object`)
          expect(res.body.message).to.equal(`Missing \`title\` in request body`)
        })
    })
  })

  describe(`DELETE /api/notes/:id`, function() {
    it(`should delete an existing document and respond with 204`, function() {
      let data
      return Note.findOne({ userId: testId })
        .then(_data => {
          data = _data
          return chai
            .request(app)
            .delete(`/api/notes/${data.id}`)
            .set(`authorization`, `Bearer ${token}`)
        })
        .then(function(res) {
          expect(res).to.have.status(204)
          return Note.count({ _id: data.id })
        })
        .then(count => {
          expect(count).to.equal(0)
        })
    })

    it(`should respond with 404 when document does not exist`, function() {
      return chai
        .request(app)
        .delete(`/api/notes/DOESNOTEXIST`)
        .set(`authorization`, `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(204)
        })
    })
  })
})
