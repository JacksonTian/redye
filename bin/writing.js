#!/usr/bin/env node
'use strict';

// 依赖
const fs = require('fs');
const path = require('path');

const han = require('han');
const ncp = require('ncp');
const mkdirp = require('mkdirp');
const marked = require('marked');
const renderer = new marked.Renderer();
const ejs = require('ejs');

// 当前执行目录
var cwd = process.cwd();
var argv = process.argv.slice(2);
if (argv.length < 1) {
  console.log('Usage:');
  console.log('  writing test.md');
  process.exit(-1);
}

marked.setOptions({
  highlight: function (code) {
    return require('highlight.js').highlightAuto(code).value;
  }
});

renderer.table = function (header, body) {
  return `<table class="table"><thead>${header}</thead><tbody>${body}</tbody></table>\n`;
};

renderer.image = function(href, title, text) {
  var out = '<div class="img"><img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '></div>';
  return out;
};

var assetdir = path.join(cwd, 'assets');
mkdirp.sync(assetdir);

var tpldir = path.join(__dirname, '../tpl');
var articleTpl = fs.readFileSync(path.join(tpldir, 'article.tpl'), 'utf-8');

var getMarkdown = function (filename) {
  var content = fs.readFileSync(filename, 'utf-8');
  // 抽取元数据
  var meta = {};
  var exp = /<!--(.*):(.*)-->/g;
  var match;
  while ((match = exp.exec(content))) {
    meta[match[1]] = match[2];
  }

  var htmlname = path.basename(filename, path.extname(filename));

  // 抽取标题
  var titleRxp = /^#([^#\n]*)/;
  var titleMatched = content.match(titleRxp);
  var title = (titleMatched && titleMatched[1] || htmlname).trim();
  if (titleMatched) {
    // 删除标题
    content = content.replace(titleMatched[0], '');
  }

  return {
    meta: meta,
    title: title,
    article: marked(content, {renderer: renderer}),
    html: han.letter(htmlname, '-') + '.html'
  };
};

var markdown = getMarkdown(argv[0]);

// 生成每个文章页
var output = ejs.render(articleTpl, Object.assign(markdown, {
  filename: path.join(__dirname, '../tpl/article.tpl')
}));

var article = path.join(cwd, markdown.html);
fs.writeFileSync(article, output);
console.log('generated at: %s', article);

// 拷贝静态文件
ncp(path.join(tpldir, 'assets'), assetdir, function (err) {
  if (err) {
    return console.error(err);
  }
});
