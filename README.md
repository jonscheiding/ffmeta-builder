# ffmeta-builder

Command-line tool to quickly create an [FFMETA file](https://ffmpeg.org/ffmpeg-formats.html#Metadata-1) for [ffmpeg](https://ffmpeg.org/), mainly for building the chapter metadata from a CSV file.

## Setup

Just clone and run `yarn`.

## Usage

First, create a CSV file for the chapters. It should look like this:

```csv
title,startTime,endTime
Chapter 1,0:00:00,0:01:00
Chapter 2,0:01:00,0:05:00
```

The duplication is not required; you may omit `endTime` if the subsequent chapter has a `startTime`, and you may omit `startTime` if the previous chapter has an `endTime`.

After preparing the CSV file, run a command like the following:

```sh
$ ./cli --chapters ./data/chapters.csv --title "Test Video" --author "Video Tester"
;FFMETADATA1
title=Test Video
author=Video Tester

[CHAPTER]
TIMEBASE=1/1000
START=0
END=60000
title=Chapter 1

[CHAPTER]
TIMEBASE=1/1000
START=60000
END=300000
title=Chapter 2
```

