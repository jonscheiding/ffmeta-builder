import fs from 'fs';
import { spawn } from 'child_process';
import mustache from 'mustache';
import csvToJson from 'csvtojson';
import colors from 'colors';
import temp from 'temp';

function warn(msg) {
  console.warn(colors.yellow(msg));
}

/**
 * @typedef {Object} Arguments 
 * @property {string} chapters
 * @property {string} title
 * @property {string} author
 * @property {string} input
 * @property {string} output
 */

/**
 * @typedef {Object} ChapterMetadata
 * @property {string} title
 * @property {number} startTime
 * @property {number} endTime
 */

/**
 * Escapes text for FFMETA
 * @param {string} text 
 * @returns {string}
 */
function escape(text) {
  return text.replace(/([=;#\\\n])/g, '\$1')
}

/**
 * Checks if value is a valid number
 * @param {*} value 
 * @returns {boolean}
 */
function isNumeric(value) {
  return typeof(value) === 'number' && !isNaN(value);
}

/**
 * Parses value as a date
 * @param {string} value 
 */
function parseTime(value) {
  if(!value) return undefined;
  
  const referenceDate = Date.parse("2000-01-01T00:00:00Z");

  //
  // Allow the common form of "0:00:00"
  //
  if(value.match(/^\d:\d\d:\d\d$/)) {
    value = '0' + value;
  }

  const parsedDate = Date.parse(`2000-01-01T${value}Z`);

  if(!isNumeric(parsedDate)) {
    warn(`Value '${value}' could not be parsed as a time.`);
  }

  return parsedDate - referenceDate;
}

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
      title: escape,
      startTime: f => parseTime(f),
      endTime: f => parseTime(f)
    }
  }).fromFile(csvFilename);

  for(let i = 0; i < chapters.length; i++) {
    if(!isNumeric(chapters[i].startTime)) {
      if(i === 0) {
        warn('First chapter does not have a start time; assuming 0:00:00');
        chapters[i].startTime = 0;
      } else {
        if(!isNumeric(chapters[i - 1].endTime)) {
          warn(`Chapter ${i + 1} does not have a start time, and previous chapter does not have an end time; metadata will not be generate correctly.`);
        } else {
          chapters[i].startTime = chapters[i - 1].endTime;
        }
      }
    }

    if(!isNumeric(chapters[i].endTime)) {
      if(i === chapters.length - 1) {
        warn('Last chapter does not have an end time; metadata will not generate correctly.');
      } else {
        if(!isNumeric(chapters[i + 1].startTime)) {
          warn(`Chapter ${i + 1} does not have an end time, and following chapter does not have a start time; metadata will not generate correctly.`);
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
 async function generateMeta(argv) {
  const template = fs.readFileSync(`${__dirname}/ffmeta.mustache`);
  
  const tags = [];
  for(const key of ['title', 'author']) {
    if(key in argv) {
      tags.push({key, value: escape(argv[key])});
    }
  }

  let chapters = [];
  if('chapters' in argv) {
    chapters = await processChapters(argv.chapters);
  }

  const metadata = { tags, chapters };
  
  return mustache.render(template.toString(), metadata);
}

/**
 * Generates an FFMETA structure from the provided arguments
 * and outputs it to the console.
 * @param {Arguments} argv 
 */
export async function generate(argv) {
  console.log(await generateMeta(argv));
}

/**
 * Generates an FFMETA structure from the provided arguments
 * and uses ffmpeg to embed it into a video file.
 * @param {Arguments} argv 
 */
export async function embed(argv) {
  temp.track();
  const ffmeta = temp.openSync();

  fs.writeFileSync(ffmeta.fd, await generateMeta(argv));
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', 
      [
        '-i', argv.input,
        '-i', ffmeta.path,
        '-map_metadata', '1',
        '-c', 'copy',
        argv.output
      ],
      {stdio: [process.stdin, process.stdout, process.stderr]});

    ffmpeg.on('error', reject);
    ffmpeg.on('close', code => {
      console.log(`Exited with code ${code}.`);
      resolve(code);
    });
  });
}
