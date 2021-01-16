import fs from 'fs';
import mustache from 'mustache';
import csvToJson from 'csvtojson';

/**
 * @typedef {Object} Arguments 
 * @property {string} chapters
 * @property {string} title
 * @property {string} author
 */

 /**
  * @typedef {Object} ChapterMetadata
  * @property {string} title
  * @property {number} startTime
  * @property {number} endTime
  */

 /**
  * Generates the chapters list as an array with millisecond timestamps
  * @param {string} csvFilename 
  * @returns {ChapterMetadata[]}
  */
 async function processChapters(csvFilename)  {
  if(!fs.existsSync(csvFilename)) {
    throw new Error(`File '${csvFilename}' does not exist.`);
  }

  const referenceDate = Date.parse("2000-01-01T00:00:00Z");

  /** @type ChapterMetadata[] */
  const chapters = await csvToJson({
    colParser: {
      startTime: f => Date.parse(`2000-01-01T${f}Z`) - referenceDate,
      endTime: f => Date.parse(`2000-01-01T${f}Z`) - referenceDate
    }
  }).fromFile(csvFilename);

  for(let i = 0; i < chapters.length; i++) {
    if(chapters[i].startTime == null) {
      if(i === 0) {
        console.warn('First chapter does not have a start time; assuming 0:00:00');
        chapters[i].startTime = 0;
      } else {
        if(!chapters[i - 1].endTime) {
          console.warn(`Chapter ${i + 1} does not have a start time, and previous chapter does not have an end time; metadata will not be generate correctly.`);
        } else {
          chapters[i].startTime = chapters[i - 1].endTime;
        }
      }
    }

    if(chapters[i].endTime == null) {
      if(i === chapters.length - 1) {
        console.warn('Last chapter does not have an end time; metadata will not generate correctly.');
      } else {
        if(!chapters[i + 1].startTime) {
          console.warn(`Chapter ${i} does not have an end time, and following chapter does not have a start time; metadata will not generate correctly.`);
        } else {
          chapters[i].endTime = chapters[i + 1].startTime;
        }
      }
    }
  }

  return chapters;
 }

 /**
  * Generates an FFMETA structure from the provided arguments.
  * @param {Arguments} argv 
  */
export default async function index(argv) {
  const template = fs.readFileSync(`${__dirname}/ffmeta.mustache`);
  
  const tags = [];
  for(const key of ['title', 'author']) {
    if(key in argv) {
      tags.push({key, value: argv[key]});
    }
  }

  let chapters = [];
  if('chapters' in argv) {
    chapters = await processChapters(argv.chapters);
  }

  const metadata = { tags, chapters };
  
  console.log(mustache.render(template.toString(), metadata));
}
