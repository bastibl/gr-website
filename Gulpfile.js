var gulp = require('gulp');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var nunjucks = require('nunjucks');
var debug = require('gulp-debug');
var data = require('gulp-data');
var marked = require('marked');
var nunjucksRender = require('gulp-nunjucks-render');
var del = require('del');

var sass = require('gulp-sass');
var sourcemaps   = require('gulp-sourcemaps');
var cssmin = require('gulp-cssmin');
var autoprefixer = require('gulp-autoprefixer');
var dateFilter = require('nunjucks-date-filter');

marked.Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  return (escaped ? code : escape(code, true))
};

marked.setOptions({
    gfm: true,
    tables: true,
    breaks: false,
    pendantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: true,
    highlight: function (code, lang) {
        return highlight(code, lang, 'html')
    }
});

//=======================================================================
//         NUNJUCKS
//=======================================================================
var template_path = ['design/templates'];

var manageEnvironment = function(environment) {

    // ================= EXCERPT FILTER ====================
    environment.addFilter('excerpt', function(content, url) {

        var match = content.search(/<!--\s*more\s*-->/);
        if(match > 0) {
            var ret = content.slice(0, match);
            ret += '<a type="button" class="btn" href="' + url + '">read more <span class="fa fa-angle-double-right"></span></a>';
            return ret;
        } else {
            return content;
        }
    });

    environment.addFilter('markdown', function(content) {
        return marked(content);
    });

    environment.addFilter('date', dateFilter);
}

gulp.task('pages', function() {
    return gulp.src(['content/**/*.j2', '!content/_*/**/*'])
        .pipe(debug({minimal: true}))
        .pipe(nunjucksRender({
            path: template_path,
            envOptions: {
                autoescape: false
            },
            manageEnv: manageEnvironment
        }))
        .pipe(gulp.dest('dist'))
        .pipe(browserSync.stream());
});

// static content
gulp.task('assets', function() {
    return gulp.src(['content/**/*', '!content/**/*.j2', '!content/_*', '!content/_*/**/*'])
        .pipe(gulp.dest('dist'))
        .pipe(browserSync.stream());
});

// css
gulp.task('css', function() {
    return gulp.src('design/css/style.scss')
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(autoprefixer({browsers: ['last 2 versions'], cascade: false}))
        .pipe(cssmin())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/assets/css'))
        .pipe(browserSync.stream());
});


//=======================================================================
//         BUILD / RUN
//=======================================================================
gulp.task('default', ['pages', 'assets', 'css']);

gulp.task('clean', function() {
    del(['dist']);
});

gulp.task('serve', ['default'], function() {

    gulp.watch(['content/[^_]*/*.j2', 'content/*.j2'], ['pages']);

    browserSync({
        server: './dist',
        open: false
    });
});
