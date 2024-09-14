#!/bin/bash node
import { setFailed, info } from '@actions/core';
import markdown from '@wcj/markdown-to-html';
import fs from 'fs-extra';

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
const jsonFeedPath = './docs/rss/feed.json';

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
      title: issueTitle,
      content_html: issueBody,
      summary: issueBody,
      banner_image: bannerImage,
      date_published: issueDate,
      author: {
        name: issueAuthor,
        link: issueAvatar,
      },
    }
    
    const data = issueBody.split(/###\s.+\n+/ig).filter(Boolean);
    info(`Issue Body: ${JSON.stringify(data)}`);
    const content = data[0] ?? "";
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
  
    const jsonFeedData = {
      "version": "https://jsonfeed.org/version/1.1",
      "title": "Quick RSS Feed",
      "home_page_url": "https://wangchujiang.com/quick-rss/",
      "feed_url": "https://wangchujiang.com/quick-rss/feed.json",
      "items": rss
    }
    // 将 jsonFeedData 写入 jsonFeedPath 文件
    await fs.writeJSON(jsonFeedPath, jsonFeedData, { spaces: 2 });
    // 输出写入成功日志
    info(`JSON Feed 文件写入成功：${jsonFeedPath}`);
    
  } catch (error) {
    setFailed(error.message);
  }
  
})();