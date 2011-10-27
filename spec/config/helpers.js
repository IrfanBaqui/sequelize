var Helpers = module.exports = function(sequelize) {
  this.sequelize = sequelize
  this.Factories = new (require("./factories"))(this)
}

Helpers.prototype.sync = function() {
  var self = this
  this.async(function(done) {
    self.sequelize
      .sync({force: true})
      .on('success', done)
      .on('failure', function(err) { console.log(err) })
  })
}

Helpers.prototype.drop = function() {
  var self = this
  this.async(function(done) {
    self.sequelize
      .drop()
      .on('success', done)
      .on('failure', function(err) { console.log(err) })
  })
}

Helpers.prototype.async = function(fct) {
  var done = false
  runs(function() {
    fct(function() { return done = true })
  })
  waitsFor(function(){ return done })
}
