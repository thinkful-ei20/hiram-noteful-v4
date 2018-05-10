const mongoose = require(`mongoose`)
const bcrypt = require(`bcryptjs`)

const userSchema = mongoose.Schema({
  fullname: { type: String, default: `` },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
})

userSchema.pre(`save`, function(next) {
  const user = this

  if (!user.isModified(`password`)) return next()

  bcrypt
    .hash(user.password, 10)
    .then(hash => {
      user.password = hash
      next()
    })
    .catch(next)
})

userSchema.set(`toObject`, {
  transform: (doc, ret) => {
    ret.id = ret._id
    delete ret._id
    delete ret.__v
    delete ret.password
  }
})

userSchema.statics.hashPassword = password => {
  return bcrypt.hash(password, 10)
}

userSchema.methods.validatePassword = function(password) {
  return bcrypt.compare(password, this.password)
}

const User = mongoose.model(`User`, userSchema)

module.exports = User
