/* jshint camelcase: false */
/* jshint expr: true */
var chai      = require('chai')
  , Sequelize = require('../index')
  , expect    = chai.expect
  , Support   = require(__dirname + '/support')
  , DataTypes = require(__dirname + "/../lib/data-types")
  , dialect   = Support.getTestDialect()
  , config    = require(__dirname + "/config/config")
  , sinon     = require('sinon')
  , datetime  = require('chai-datetime')
  , _         = require('lodash')
  , moment    = require('moment')
  , async     = require('async')

chai.use(datetime)
chai.Assertion.includeStack = true

describe(Support.getTestDialectTeaser("Include"), function () {
  describe('find', function () {
    it('should support a simple nested belongsTo -> belongsTo include', function (done) {
      var Task = this.sequelize.define('Task', {})
        , User = this.sequelize.define('User', {})
        , Group = this.sequelize.define('Group', {})

      Task.belongsTo(User)
      User.belongsTo(Group)

      this.sequelize.sync({force: true}).done(function () {
        async.auto({
          task: function (callback) {
            Task.create().done(callback)
          },
          user: function (callback) {
            User.create().done(callback)
          },
          group: function (callback) {
            Group.create().done(callback)
          },
          taskUser: ['task', 'user', function (callback, results) {
            results.task.setUser(results.user).done(callback)
          }],
          userGroup: ['user', 'group', function (callback, results) {
            results.user.setGroup(results.group).done(callback)
          }]
        }, function (err, results) {
          expect(err).not.to.be.ok

          Task.find({
            where: {
              id: results.task.id
            },
            include: [
              {model: User, include: [
                {model: Group}
              ]}
            ]
          }).done(function (err, task) {
            expect(err).not.to.be.ok
            expect(task.user).to.be.ok
            expect(task.user.group).to.be.ok
            done()
          })
        })
      })
    })

  it('should support a simple nested hasOne -> hasOne include', function (done) {
      var Task = this.sequelize.define('Task', {})
        , User = this.sequelize.define('User', {})
        , Group = this.sequelize.define('Group', {})

      User.hasOne(Task)
      Group.hasOne(User)

      this.sequelize.sync({force: true}).done(function () {
        async.auto({
          task: function (callback) {
            Task.create().done(callback)
          },
          user: function (callback) {
            User.create().done(callback)
          },
          group: function (callback) {
            Group.create().done(callback)
          },
          userTask: ['user', 'task', function (callback, results) {
            results.user.setTask(results.task).done(callback)
          }],
          groupUser: ['group', 'user', function (callback, results) {
            results.group.setUser(results.user).done(callback)
          }]
        }, function (err, results) {
          expect(err).not.to.be.ok

          Group.find({
            where: {
              id: results.group.id
            },
            include: [
              {model: User, include: [
                {model: Task}
              ]}
            ]
          }).done(function (err, group) {
            expect(err).not.to.be.ok
            expect(group.user).to.be.ok
            expect(group.user.task).to.be.ok
            done()
          })
        })
      })
    })

    it('should support a simple nested hasMany -> belongsTo include', function (done) {
      var Task = this.sequelize.define('Task', {})
        , User = this.sequelize.define('User', {})
        , Project = this.sequelize.define('Project', {})

      User.hasMany(Task)
      Task.belongsTo(Project)

      this.sequelize.sync({force: true}).done(function () {
        async.auto({
          user: function (callback) {
            User.create().done(callback)
          },
          projects: function (callback) {
            Project.bulkCreate([{}, {}]).done(function () {
              Project.findAll().done(callback)
            })
          },
          tasks: ['projects', function(callback, results) {
            Task.bulkCreate([
              {ProjectId: results.projects[0].id},
              {ProjectId: results.projects[1].id},
              {ProjectId: results.projects[0].id},
              {ProjectId: results.projects[1].id}
            ]).done(function () {
              Task.findAll().done(callback)
            })
          }],
          userTasks: ['user', 'tasks', function (callback, results) {
            results.user.setTasks(results.tasks).done(callback)
          }]
        }, function (err, results) {
          User.find({
            where: {
              id: results.user.id
            },
            include: [
              {model: Task, include: [
                {model: Project}
              ]}
            ]
          }).done(function (err, user) {
            expect(err).not.to.be.ok
            expect(user.tasks).to.be.ok
            expect(user.tasks.length).to.equal(4)

            user.tasks.forEach(function (task) {
              expect(task.project).to.be.ok
            })

            done()
          })
        })
      })
    })

    it('should support a simple nested belongsTo -> hasMany include', function (done) {
      var Task = this.sequelize.define('Task', {})
        , Worker = this.sequelize.define('Worker', {})
        , Project = this.sequelize.define('Project', {})

      Worker.belongsTo(Project)
      Project.hasMany(Task)

      this.sequelize.sync({force: true}).done(function () {
        async.auto({
          worker: function (callback) {
            Worker.create().done(callback)
          },
          project: function (callback) {
            Project.create().done(callback)
          },
          tasks: function(callback) {
            Task.bulkCreate([
              {},
              {},
              {},
              {}
            ]).done(function () {
              Task.findAll().done(callback)
            })
          },
          projectTasks: ['project', 'tasks', function (callback, results) {
            results.project.setTasks(results.tasks).done(callback)
          }],
          projectWorker: ['project', 'worker', function (callback, results) {
            results.worker.setProject(results.project).done(callback)
          }]
        }, function (err, results) {
          Worker.find({
            where: {
              id: results.worker.id
            },
            include: [
              {model: Project, include: [
                {model: Task}
              ]}
            ]
          }).done(function (err, worker) {
            expect(err).not.to.be.ok
            expect(worker.project).to.be.ok
            expect(worker.project.tasks).to.be.ok
            expect(worker.project.tasks.length).to.equal(4)

            done()
          })
        })
      })
    })

    it('should support a simple nested hasMany <-> hasMany include', function (done) {
      var User = this.sequelize.define('User', {})
        , Product = this.sequelize.define('Product', {
            title: DataTypes.STRING
          })
        , Tag = this.sequelize.define('Tag', {
            name: DataTypes.STRING
          })

      User.hasMany(Product)
      Product.hasMany(Tag)
      Tag.hasMany(Product)

      this.sequelize.sync({force: true}).done(function () {
        async.auto({
          user: function (callback) {
            User.create().done(callback)
          },
          products: function (callback) {
            Product.bulkCreate([
              {title: 'Chair'},
              {title: 'Desk'},
              {title: 'Dress'},
              {title: 'Bed'}
            ]).done(function () {
              Product.findAll().done(callback)
            })
          },
          tags: function(callback) {
            Tag.bulkCreate([
              {name: 'A'},
              {name: 'B'},
              {name: 'C'}
            ]).done(function () {
              Tag.findAll().done(callback)
            })
          },
          userProducts: ['user', 'products', function (callback, results) {
            results.user.setProducts(results.products).done(callback)
          }],
          productTags: ['products', 'tags', function (callback, results) {
            var chainer = new Sequelize.Utils.QueryChainer()

            chainer.add(results.products[0].setTags([results.tags[0], results.tags[2]]))
            chainer.add(results.products[1].setTags([results.tags[1]]))
            chainer.add(results.products[2].setTags([results.tags[0], results.tags[1], results.tags[2]]))

            chainer.run().done(callback)
          }]
        }, function (err, results) {
          expect(err).not.to.be.ok

          User.find({
            where: {
              id: results.user.id
            },
            include: [
              {model: Product, include: [
                {model: Tag}
              ]}
            ]
          }).done(function (err, user) {
            expect(err).not.to.be.ok            

            expect(user.products.length).to.equal(4)
            expect(user.products[0].tags.length).to.equal(2)
            expect(user.products[1].tags.length).to.equal(1)
            expect(user.products[2].tags.length).to.equal(3)
            expect(user.products[3].tags.length).to.equal(0)
            done()
          })
        })
      })
    })
  })
})