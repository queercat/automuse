import * as dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";
import PlotGenerator from "@xeserv/plottoriffic";
import { generateName } from "@kotofurumiya/th-namegen";
import * as fs from "node:fs/promises";

dotenv.config();

const dirName = `var/${generateName()}`;
await fs.mkdir(dirName, { recursive: true });
console.log(`dirName: ${dirName}`);

const pg = new PlotGenerator({ flipGenders: false });
const plot = pg.generate();

await fs.writeFile(`${dirName}/plotto.json`, JSON.stringify(plot));

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const promptBase = `Write me the following about the following plot summary for a novel:

- A two to five word title for the novel starting with "Title: " and followed by two newlines. For example: "Fresh Beginnings" or "Jared's Adventure through Crime".
- A detailed plot summary for the story starting with "Plot Summary: " and followed by two newlines. The plot summary should be on the same line as the prefix.
- The string "Chapter Summaries" followed by two newlines.
- A markdown list of detailed chapter summaries in at least 3 sentences and titles for each of the 10 chapters that a novel based on the plot summary would have. Surround each chapter title in quotes and put a dash after the name like this:

- Chapter name - Chapter summary goes here. More words in the summary go here.
- Second chapter name - Second chapter summary goes here.`;

const summary = await openai.createChatCompletion({
  model: "gpt-3.5-turbo",
  messages: [
    {
      role: "user",
      content: promptBase + "\n\n" + plot.plot,
    },
  ],
});

if (!!summary.data.usage) {
  const usage = summary.data.usage;
  console.log(
    `${usage.total_tokens} tokens (${usage.prompt_tokens} prompt, ${usage?.completion_tokens} completion)`
  );
}

const summaryText = summary.data.choices[0].message?.content;

console.log(summaryText);
await fs.writeFile(`${dirName}/summary.txt`, summaryText as string);

const titleRegex = /^Title: (.+)$/gm;
const plotSummaryRegex = /^Plot Summary: (.+)$/gm;
const chapterSummaryRegex = /^- (.+) - (.+)$/gm;

let title = summaryText?.split("\n", 2)[0].split(titleRegex)[1] as string;

if (title[0] === '"') {
  title = title.slice(1, -1);
}

const chapterList = summaryText
  ?.split("\n\n")
  .slice(-1)[0]
  .split("\n")
  .map((line) => {
    return line.split(chapterSummaryRegex);
  })
  .map((ch) => {
    ch.shift();
    ch.pop();
    return { title: ch[0].slice(1, -1), summary: ch[1] };
  });

const plotSummary = summaryText?.split("\n\n", 3)[1].split(plotSummaryRegex)[1];

plot.cast.forEach(async (ch) => {});

const bookInfo = {
  title,
  chapterList,
  plotSummary,
};

console.log(bookInfo);
await fs.writeFile(`${dirName}/summary.json`, JSON.stringify(bookInfo));
