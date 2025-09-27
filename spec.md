# Overview
I'm working on learning morse code, and I'm dissatisfied with many of the tools available to study.

There are a few big gaps, from my perspective:
- Many of the tools are focused on learning in "levels" which are arbitrary groupings of characers. For me, at least, I know all the characters, but I need to improve all of them, not just a subset.
- Many of the tools have awful UIs with many bugs. They don't feel modern at all.
- There are specific modes of study that they are lacking.

I want to focus on:
- Continuous learning over levels. We might decide to add timed sessions, but it shouldn't have the concept of a level.
- Instant character recognition. The goal is to get out of my head. I dont want to be given the opportunity to think about what I heard.
- Instant feedback. I don't want to find out how I'm doing many seconds later. I want to know in real time.
- Tracking and statistics. I want statistics to give me a sense of progress. I want to see that I'm improving over time.
- Better source of text

## Statistics
There should be a statistics view which shows you:
- Accuracy over time. A graph of over the last N days, what your accuracy was each day. There should be a dropdown to choose different time windows.
- Speed: A graph of recognition speed over time. It's possible this should be combined with the accuracy view on the same axes
- Confusion matrix: Top confused letter pairs in the last N days
- Study time: A graph of how much study time was spent per day.

## Configuration Options
- Character speed in WPM
- Enable numbers (default true)
- Enable standard punctuation (,./=?), (default true)
- Enable advanced punctuation (:;etc), (default false)

## Text Source
We should support several high quality text options:
- Random letters
- Random english words, sampled by frequency (so more common words should occur more often)
- Reddit headlines
- Hard characters (the 10 hardest characters for the user)

I've tested that Reddit supports RSS feeds
curl -H "User-Agent: Mozilla/5.0 (compatible; RSS reader)" \
     -H "Accept: application/rss+xml, application/xml" \
     "https://old.reddit.com/r/popular.rss"

By default we should support a few obvious reddits, but we should let the user add any rss feed

## Study Session
- User selects how much time they want this session to be, from 1, 2, or 5 minutes
- User selects text source from drop down of options
- User selects mode: Practice, Listen, or Live Copy
- User specifies speed: slow, medium, fast, lightning
- If Practice mode, user selects:
  - Feedback: buzzer, flash, both
  - Replay: True / False

## Mode: Practice
In Practice mode, text will be sent to the user, and the user will be expected to type what they hear quickly with immediate feedback.
The user has limited time to recognize each character:
- slow: 2000ms
- medium: 1000ms
- fast: 500ms
- lightning: 300ms

If the user is successful we move on immediately to the next character.
If the user fails:
- The feedback is triggered based on the setting (buzzer, flash, both)
- If replay is true, the letter is shown in a popup style, LARGE, while the sound for that letter is replayed
- The user does not get the same letter again if they fail, unless that happens to be the next letter

The user should be able to see the previously sent characters

## Mode: Listen
In Listen mode there is no feedback or user input. The text source is just sent to the user for passive listening.

The user should be able to see the previously sent characters, but critically they cannot see the current character.
The timing should work as follows:
- Slow: character sent, 3 dits spacing, character displayed on screen, 3 dit spacing, next character
- Medium: character sent, 3 dits spacing, character displayed on screen, 2 dit spacing, next character
- Fast: character sent, 2 dits spacing, character displayed on screen, 1 dit spacing, next character
- Lightning: character sent, 2 dits spacing, character displayed on screen, 1 dit spacing, next character (same as fast)

## Mode: Live Copy
In Live Copy mode, the user types what they hear in real-time, but receives no feedback during the session. All corrections are revealed only at the end of the session. This more closely simulates real morse code copy where you cannot control transmission pacing.



