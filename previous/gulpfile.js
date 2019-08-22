const gulp        = require('gulp');

const gulpSize   = require('gulp-size');
const gulpUglify = require('gulp-uglify');

// browserify
const browserify = require('browserify');
const source     = require('vinyl-source-stream');
const buffer     = require('vinyl-buffer');
const gutil      = require('gulp-util');

// tests
const istanbul    = require('gulp-istanbul');
const mocha       = require('gulp-mocha');

gulp.task('pre-test', function () {
  return gulp.src(['index.js', 'lib/**/*.js'])
    // Covering files
    .pipe(istanbul())
    // Force `require` to return covered files
    .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function () {
  return gulp.src(['test/**/*.js'])
    .pipe(mocha())
    // Creating the reports after tests ran
    .pipe(istanbul.writeReports())
    // Enforce a coverage of at least 90%
    .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }));
});

gulp.task('javascript', function () {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: './lib/ipc-node.js',
    // debug: true,
    // defining transforms here will avoid crashing your stream
    transform: [],
  });

  return b.bundle()
    .on('error', function (err) {
      gutil.log('Browserify Error', err);
      this.emit('end')
    })
    .pipe(source('ipc-node.bundle.js'))
    .pipe(buffer())
    .pipe(gulpUglify())
    // calculate size before writing source maps
    .pipe(gulpSize({
      title: 'javascript',
      showFiles: true
    }))
    .pipe(gulp.dest('./dist/'));
});
