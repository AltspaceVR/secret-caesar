'use strict';

const gulp = require('gulp');
const babel = require('gulp-babel');

gulp.task('default', () =>
    gulp.src('src/client.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('static/js'))
);