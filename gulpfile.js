var gulp = require('gulp');

gulp.task('default', function() {
  // place code for your default task here
	var inline = require('gulp-inline')
	 
	gulp.src('src/index.html')
	  .pipe(inline({
	    base: 'src/',
	    //disabledTypes: ['svg', 'img', 'js'], // Only inline css files 
	    //ignore: ['./css/do-not-inline-me.css']
	  }))
	  .pipe(gulp.dest('dist/'));
});
