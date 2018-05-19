var gulp = require('gulp');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var nunjucks = require('nunjucks');
var debug = require('gulp-debug');
var data = require('gulp-data');
var marked = require('marked');
var nunjucksRender = require('gulp-nunjucks-render');
var del = require('del');
var frontMatter = require('gulp-front-matter');
var sass = require('gulp-sass');
var sourcemaps   = require('gulp-sourcemaps');
var cssmin = require('gulp-cssmin');
var autoprefixer = require('gulp-autoprefixer');
var dateFilter = require('nunjucks-date-filter');
var through = require('through2');
var fs = require('fs');
var File = require('vinyl');

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
});

//=======================================================================
//         NUNJUCKS
//=======================================================================
var template_path = ['design/templates', 'content/_news/'];

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

//=======================================================================
//         CONTENT
//=======================================================================

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

var processNews = function(file) {

    return through.obj(function(file, enc, cb) {

        var match_news = /(\d{4})-(\d{2})-(\d{2})-(.*)\/index.j2$/.exec(file.relative);

        data = file.data || {};

        if(!match_news) {
            throw "wrong news entry name: " + file.relative;
        }

        var year  = match_news[1];
        var month = match_news[2];
        var day   = match_news[3];
        var slag  = match_news[4];

        data['post_file'] = file.relative;
        data['date'] = new Date(year + "-" + month + "-" + day);
        data['url'] = '/news/' + slag + '/';
        data['permalink'] = 'https://www.gnuradio.org' + data.url;

        file.stem = 'index';
        file.path = file.base + data['url'] + 'index.html';
        file.data = data;

        this.push(file);
        cb();
    });
};

var prepareNewsEntry = function() {

    return through.obj(function bufferContents(file, enc, cb) {
        file.contents = fs.readFileSync('design/templates/news_entry.j2'),
        this.push(file);
        cb();
    });
};

gulp.task('news:assets', function() {
    // todo: pictures of news entries should be in corresponding folder
    // ...and not in assets
});

// static content
gulp.task('news:pages', function() {
    return gulp.src(['content/_news/*/index.j2'])
        .pipe(debug({minimal: true}))
        .pipe(frontMatter({
            property: 'data',
            remove: true
        }))
        .pipe(processNews())
        .pipe(prepareNewsEntry())
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

var prepareNewsIndex = function() {

    var posts = [];

    function bufferContents(file, enc, cb) {
        var p = {
            url: data.url,
            date: data.date,
            template: data.post_file
        };
        posts.push(p);
        cb();
    };

    function endStream(cb) {
        posts.sort(function(a, b) {
            if(a.date < b.date) return 1;
            if(a.date > b.date) return -1;
            return 0;
        });
        var f = new File({
            cwd: '',
            base: null,
            path: 'news/index.html',
            contents: fs.readFileSync('design/templates/news.j2')
        });
        f.data = {}
        f.data.news = posts;

        this.push(f);
        cb();
    };

    return through.obj(bufferContents, endStream);
};

gulp.task('news:index', function() {
    return gulp.src('content/_news/*/index.j2')
        .pipe(processNews())
        .pipe(prepareNewsIndex())
        .pipe(nunjucksRender({
            path: template_path,
            envOptions: {
                autoescape: false
            },
            manageEnv: manageEnvironment
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('news', ['news:pages', 'news:assets', 'news:index']);


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
gulp.task('default', ['pages', 'assets', 'css', 'news']);

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
