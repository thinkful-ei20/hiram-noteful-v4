"use strict"

const passport = require(`passport`)
const express = require(`express`)
const router = express.Router()

const mongoose = require(`mongoose`)

const Note = require(`../models/note`)
const Tag = require(`../models/tag`)
const Folder = require(`../models/folder`)

router.use(
  `/`,
  passport.authenticate(`jwt`, { session: false, failWithError: true })
)

/* ========== GET/READ ALL ITEMS ========== */
router.get(`/`, (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query
  const userId = req.user.id

  let filter = {
    userId
  }

  if (searchTerm) {
    // filter.title = { $regex: searchTerm };
    filter.$or = [
      { title: { $regex: searchTerm } },
      { content: { $regex: searchTerm } }
    ]
  }

  if (folderId && folderId !== '') {
    filter.folderId = folderId
  }

  if (tagId) {
    filter.tags = tagId
  }

  Note.find(filter)
    .populate(`tags`)
    .sort({ updatedAt: `desc` })
    .then(results => {
      res.json(results)
    })
    .catch(err => {
      next(err)
    })
})

/* ========== GET/READ A SINGLE ITEM ========== */
router.get(`/:id`, (req, res, next) => {
  const { id } = req.params
  const userId = req.user.id

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`The \`id\` is not valid`)
    err.status = 400
    return next(err)
  }

  Note.findOne({ _id: id, userId })
    .populate(`tags`)
    .then(result => {
      if (result) {
        res.json(result)
      } else {
        next()
      }
    })
    .catch(err => {
      next(err)
    })
})

/* ========== POST/CREATE AN ITEM ========== */
router.post(`/`, (req, res, next) => {
  const { title, content, folderId, tags = [] } = req.body
  const userId = req.user.id
  if (folderId === '') folderId = null

  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error(`Missing \`title\` in request body`)
    err.status = 400
    return next(err)
  }

  if (folderId !== '') {
    if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
      const err = new Error(`The \`folderId\` is not valid`)
      err.status = 400
      return next(err)
    }

    if (folderId) {
      Folder.findOne({ _id: folderId, userId })
        .then(result => {
          if (!result) {
            const err = new Error(`The \`folderId\` is not valid`)
            err.status = 400
            return next(err)
          }
        })
        .catch(next)
    }
  }
  

  if (tags) {
    tags.forEach(tag => {
      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error(`The \`tags.id\` is not valid`)
        err.status = 400
        return next(err)
      }
    })
  }

  Tag.find({ _id: { $in: tags }, userId })
    .then(results => {
      if (results.length !== tags.length) {
        const err = new Error(`The \`tags.id\` is not valid`)
        err.status = 400
        return next(err)
      }
    })
    .catch(next)

  Note.create({title, content, folderId, tags, userId})
    .then(result => {
      res
        .location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result)
    })
    .catch(err => {
      next(err)
    })
})

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put(`/:id`, (req, res, next) => {
  const { id } = req.params
  const { title, content, folderId, tags = [] } = req.body
  const userId = req.user.id

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`The \`id\` is not valid`)
    err.status = 400
    return next(err)
  }

  if (!title) {
    const err = new Error(`Missing \`title\` in request body`)
    err.status = 400
    return next(err)
  }

  if (folderId && folderId !== '' && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error(`The \`folderId\` is not valid`)
    err.status = 400
    return next(err)
  }

  if (folderId && folderId !== '') {
    Folder.findOne({ _id: folderId, userId })
      .then(result => {
        if (!result) {
          const err = new Error(`The \`folderId\` is not valid`)
          err.status = 400
          return next(err)
        }
      })
      .catch(next)
  }

  if (tags) {
    tags.forEach(tag => {
      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error(`The \`tags.id\` is not valid`)
        err.status = 400
        return next(err)
      }
    })
  }

  Tag.find({ _id: { $in: tags }, userId })
    .then(results => {
      if (results.length !== tags.length) {
        const err = new Error(`The \`tags.id\` is not valid`)
        err.status = 400
        return next(err)
      }
    })
    .catch(next)

  Note.findOneAndUpdate(
    { _id: id, userId },
    { title, content, folderId, tags },
    { new: true }
  )
    .then(result => {
      if (result) {
        res.json(result)
      } else {
        next()
      }
    })
    .catch(err => {
      next(err)
    })
})

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete(`/:id`, (req, res, next) => {
  const { id } = req.params
  const userId = req.user.id

  Note.findOneAndRemove({ _id: id, userId })
    .then(() => {
      res.status(204).end()
    })
    .catch(err => {
      next(err)
    })
})

module.exports = router
