import convert from 'xml-js';
import fs from 'fs-extra';

const opmlPath = `./feeds/opml.xml`;

;(async () => {
    const feedContent = await fs.readFile(opmlPath, 'utf-8');
    const opmlJson = convert.xml2js(feedContent, { compact: true, spaces: 4 });
    const outlines = opmlJson.opml.body.outline;
    let markdown = ""
    outlines.forEach((outline) => {
        markdown += `### [${outline._attributes.text}](${outline._attributes.htmlUrl})\n\n`;
        if (outline._attributes.description) {
            markdown += `${outline._attributes.description}\n\n`;
        }
        markdown += `\`\`\`\n${outline._attributes.xmlUrl}\n\`\`\`\n\n`;
    });
    
    const favoritesContent = fs.readFileSync('./feeds/feed_favorites.md', 'utf-8');
    const content = favoritesContent.replace(/<!--RSS_FAVORITES_LIST_START-->[\s\S]*<!--RSS_FAVORITES_LIST_END-->/g, `<!--RSS_FAVORITES_LIST_START-->\n${markdown}\n<!--RSS_FAVORITES_LIST_END-->`);
    fs.writeFileSync('./feeds/feed_favorites.md', content);

    const favoritesZhContent = fs.readFileSync('./feeds/feed_favorites.zh.md', 'utf-8');
    const contentZh = favoritesZhContent.replace(/<!--RSS_FAVORITES_LIST_START-->[\s\S]*<!--RSS_FAVORITES_LIST_END-->/g, `<!--RSS_FAVORITES_LIST_START-->\n${markdown}\n<!--RSS_FAVORITES_LIST_END-->`);
    fs.writeFileSync('./feeds/feed_favorites.zh.md', contentZh);
})();
