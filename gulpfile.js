
var inline = require('gulp-inline')
    , uglify = require('gulp-uglify')
    , minifyCss = require('gulp-minify-css');

gulp.task('default', function() {
  // place code for your default task here
   
  gulp.src('public/index.html')
    .pipe(inline({
      base: 'public/',
      js: uglify(),
      css: minifyCss(),
      disabledTypes: ['svg', 'img', 'js'], // Only inline css files 
      ignore: ['./css/do-not-inline-me.css']
    }))
    .pipe(gulp.dest('dist/'));
});
