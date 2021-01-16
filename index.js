import fs from 'fs';
import mustache from 'mustache';

/**
 * The arguments to the index function.
 * @typedef {Object} Arguments 
 * @property {string} chapters
 * @property {string} title
 * @property {string} author
 */

 /**
  * Generates an FFMETA structure from the provided arguments.
  * @param {Arguments} argv 
  */
export default function index(argv) {
  const template = fs.readFileSync(`${__dirname}/ffmeta.mustache`);
  
  const tags = [];
  for(const key of ['title', 'author']) {
    if(key in argv) {
      tags.push({key, value: argv[key]});
    }
  }

  const metadata = { tags };
  
  console.log(mustache.render(template.toString(), metadata));
}
