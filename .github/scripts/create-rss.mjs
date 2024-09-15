#!/bin/bash node
import { setFailed, info } from '@actions/core';
import markdown from '@wcj/markdown-to-html';
import fs from 'fs-extra';
import { Feed } from "feed";

const issueBody = process.env.ISSUE_BODY;
const issueLink = process.env.ISSUE_LINK;
const issueTitle = process.env.ISSUE_TITLE;
const issueId = process.env.ISSUE_ID;
const issueDate = process.env.ISSUE_DATE;
const issueAuthor = process.env.ISSUE_AUTHOR;
const issueAvatar = process.env.ISSUE_AVATAR; 

// 根据时间计算一年第几周
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// 根据时间获取年份和周数
function getYearAndWeek(date) {
  return {
    year: date.getFullYear(),
    week: getWeekNumber(date)
  };
}

/**
 * 根据年份和周数生成文件，如 2021-01.json，文件内容如下：
 * 
 * ```
 * [
 *   {
 *      "id": "1",
 *      "url": "https://github.com/jaywcjlove/quick-rss/issues/3",
 *      "title": "",
 *      "content_html": "",
 *      "summary": "",
 *      "banner_image": "",
 *      "date_published": "",
 *      "author": {
 *          "name": "",
 *          "link": ""
 *      }
 *   }
 * ]
 * ```
 */

const { year, week } = getYearAndWeek(new Date(issueDate));
/** 根据年份和周数生成文件名称，如 2024-01.json */
const rssFilePath = `./docs/rss/${year}-${week}.json`;

;(async () => {
  // 读取 rssFilePath 文件内容，如果文件不存在创建它并则返回空数组
  let rss = [];
  // 从 issueBody  Markdown 中获取图片
  const bannerImage = issueBody.match(/!\[.*?\]\((.*?)\)/);

  try {
    await fs.ensureDir('./docs/rss');
    if (fs.existsSync(rssFilePath)) {
      rss = await fs.readJSON(rssFilePath);
    }
    // 从 rss 中查找是否存在当前 issueId
    const index = rss.findIndex(item => item.id === issueId);
  
    const rssItem = {
      id: issueId,
      url: issueLink,
      title: issueTitle.replace(/^\[(.+?)\]\s+/g, ''),
      content_html: issueBody,
      summary: issueBody,
      banner_image: bannerImage,
      date_published: issueDate,
      author: {
        name: issueAuthor,
        link: issueAvatar,
      },
    }
    
    const data = issueBody.split(/##+\s+[📋🔗]+\s.+/ig).map((txt) => txt.replace(/[\n\r\s]+$/g, '')).filter(Boolean);
    info(`Issue Body: ${JSON.stringify(data)}`);
    const content = (data[0] ?? "");
    rssItem.summary = content.substring(0, 200);
    rssItem.content_html = markdown(content);
    rssItem.url = data[1];
    // 输出 rssItem 日志
    info(`RSS Item: ${JSON.stringify(rssItem)}`);

    // 如果存在则替换，不存在则添加
    index > -1 ? rss.splice(index, 1, rssItem) : rss.push(rssItem);
  
    // 将 rss 根据时间排序，之后写入 rssFilePath 文件
    rss.sort((a, b) => new Date(b.date_published) - new Date(a.date_published));
    await fs.writeJSON(rssFilePath, rss, { spaces: 2 });
    // 输出写入成功日志
    info(`RSS 文件写入成功：${rssFilePath}`);

    const oldRss = await fs.readJSON('./docs/feed.json');
    // oldRss.items 和 rss.items 合并
    // 新的 newItems 根据时间排序，通过id 去重
    const rssItems = oldRss.items.concat(rss).sort((a, b) => new Date(b.date_published) - new Date(a.date_published))
      .filter((item, index, self) => self.findIndex(t => t.id === item.id) === index)
      .slice(0, 100);
    
    const feed = new Feed({
      title: "Quick RSS Feed",
      description: "Thank you for contributing and sharing valuable tech content!",
      id: "quick-rss-feed",
      link: "https://wangchujiang.com/quick-rss/",
      language: "en", // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
      image: "https://wangchujiang.com/quick-rss/assets/logo.png",
      favicon: "https://wangchujiang.com/quick-rss/assets/logo.png",
      copyright: `All rights reserved ${year}, Kenny`,
      updated: new Date(), // optional, default = today
      generator: "Feed for Node.js", // optional, default = 'Feed for Node.js'
      feedLinks: {
        json: "https://wangchujiang.com/quick-rss/json.xml",
        rss: "https://wangchujiang.com/quick-rss/rss.xml",
        atom: "https://wangchujiang.com/quick-rss/atom.xml"
      },
      author: {
        name: "Kenny",
        email: "kennyiseeyou@gmail.com",
        link: "https://wangchujiang.com/"
      }
    });

    let mdListContent = "";
    rssItems.forEach(post => {
      mdListContent += `- [${post.title}](${post.url}) [#${post.id}](https://github.com/jaywcjlove/quick-rss/issues/${post.id}) [@${post.author.name}](https://github.com/${post.author.name})\n`;
      feed.addItem({
        title: post.title,
        id: post.id,
        link: post.url,
        image: post.image,
        content: post.content_html,
        description: post.summary,
        date: new Date(post.date_published),
        author: [
          { name: post.author.name, link: post.author.link }
        ],
        contributor: [
          { name: post.author.name, link: post.author.link }
        ],
      })
    })

    const markdownContent = fs.readFileSync('./docs/README.md', 'utf-8');
    // <!--RSS_LIST_START--><!--RSS_LIST_END-->
    const contentx = markdownContent.replace(/<!--RSS_LIST_START-->[\s\S]*<!--RSS_LIST_END-->/g, `<!--RSS_LIST_START-->\n${mdListContent}\n<!--RSS_LIST_END-->`);
    fs.writeFileSync('./docs/README.md', contentx);
    // 输出写入成功日志
    info(`README.md 文件写入成功：./docs/README.md`);

    const jsonFeedPath = './docs/feed.json';
    await fs.writeFile(jsonFeedPath, feed.json1());
    info(`JSON Feed 文件写入成功：${jsonFeedPath}`);

    const atom1FeedPath = './docs/feed.xml';
    await fs.writeFile(atom1FeedPath, feed.atom1());
    info(`Atom1 Feed 文件写入成功：${atom1FeedPath}`);

    const rss2FeedPath = './docs/rss.xml';
    await fs.writeFile(rss2FeedPath, feed.rss2());
    info(`RSS2 Feed 文件写入成功：${rss2FeedPath}`);

  } catch (error) {
    setFailed(error.message);
  }
  
})();