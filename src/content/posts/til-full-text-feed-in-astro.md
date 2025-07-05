---
title: Full-text feed in Astro
description: Generating a full-text RSS feed in Astro that supports Markdown and MDX files
pubDate: 2025-07-02T14:00:00-05:00
# tendDate:
tags: ['til']
draft: false
---

Today I learned how to generate a full-text RSS feed in Astro! It handles both Markdown and MDX files. And most importantly, it handles any images or inline components used in those files.

**tl;dr** I used [this code](https://github.com/delucis/astro-blog-full-text-rss/) from Chris Swithinbank. It works by rendering any posts in a content collection, then pipes *that* content to Astro’s [native RSS function](https://docs.astro.build/en/recipes/rss/). And it works like a charm.

One gotcha I ran into implementing this: I followed [Astro’s documentation](https://docs.astro.build/en/recipes/rss/) for implementing a feed. They recommend creating a `rss.xml.js` file. Chris's solution includes type-checking, so the code didn't work until I renamed the file `rss.xml.ts`.

Obviously I had to customize details tailored to my environment. I also added a filter for draft posts, so those don’t get published to the feed, along with sorting by pubDate or tendDate, the latter of which I use to note when a post is updated.

## The frustrating journey to get here

I'm using both Markdown and MDX files for my posts, which made this challenging to figure out.

Astro’s official documentation for generating a basic RSS feed does handle both Markdown and MDX files, but it won’t generate a full-text feed. They describe a method for generating a full-text feed, but it only handles Markdown files. 

I tried (and failed) to vibe code a solution using a combination of CoPilot (Claude Sonnet 3.5), Claude Sonnet 4, and the model native to [Dia’s](https://www.diabrowser.com/) chat feature. They all got close – some with wonderfully complicated approaches – but they all failed when it came to handling the complexities of MDX files, namely the imports and images (i.e. embedded components) I'm using.

Eventually, I found the answer in [Astro’s Discord](https://astro.build/chat). A simple search for ‘full-text rss’ pointed me to Chris's solution. 

My next step is to investigate why this isn’t part of Astro’s documentation. Based on my frustrated searches, many others have wrestled with this question.