---
title: 'Unlocks for side projects '
description: A sampling of the techniques and tools I use to capture ideas, explore designs, and launch side projects
pubDate: 2025-07-07T14:00:00-05:00
tags: ['post']
draft: false
---

## Capturing ideas
The biggest unlock is the simplest. Capture every idea. I keep a spark file (inspired by [Steven Johnson's technique](https://medium.com/the-writers-room/the-spark-file-8d6e7df7ae58)). When inspiration strikes—like an idea for a new project or a feature for an existing project—I add it to the top of my spark file. I have a monthly reminder to review the file, and I scan it from top to bottom. Some ideas still seem good, but I might not have the time, tools, or skills to bring them to life. Other ideas don't make sense anymore (in the 'what was I thinking' sense). I don't remove anything from the list. If an idea leads to a project, I give it a checkmark and maybe add a launch date. 

Here's a random sample of three ideas from my spark file:
- Use my markdown-based journal to generate a daily 'on this day' email. I created a working prototype, but haven't finished it.
- Create a macOS app that highlights the current active window (helpful when I'm using multiple displays).
- Domain ideas for side projects. I find it's better to write down ideas rather than buy and hoard domains I may never use. Not that I don't own a bunch of domains I'll never use…

*(For the productivity nerds, I manage my list in [Obsidian](https://obsidian.md/) and use [Things](https://culturedcode.com/things/) for recurring reminders.)*

## Visual inspiration and design
[MEMEX](/p/memex/) is one of my side projects I use to this day. It's my personal collection of visual inspiration. Kind of a private, self-hosted Pinterest. When I'm starting a project, I grab visuals from MEMEX and create a mood board in my current design tool of choice…

[Figma](https://www.figma.com/). If you're reading this, you've probably heard of it. For my side projects, I use a scratchpad file to build mood boards and explore design ideas. If I get serious about an idea, I'll move it to its own file. For example, [here's my Figma file](https://www.figma.com/design/iojKTp83iYmleVE22Q0ey6/kyleio?node-id=1-3&t=1QmgUQ7CIsUnLzwY-1) for this site.

## Prototyping and building
When I want to see something in a browser as quickly as possible, I reach for [Laravel Herd](https://herd.laravel.com/). On macOS, I open the `~/Sites/` folder, add a new folder (like `myidea`), add an `index.html` file, and view the page in a browser at `myidea.test`. I used Herd to make almost all the sites on my [project page](/t/project/).

For more complex projects—like this site—[Astro](https://astro.build/) is my favorite web framework for building content-heavy sites. Even their [basic starter](https://docs.astro.build/en/install-and-setup/) makes it easy to start a new project and focus on building. If an idea leads somewhere, I can easily layer on design and features and launch the project. Astro powers [my bookshelf](/p/project-bookshelf) and a recipe site.

## Hosting
When I'm ready to launch, I point [Cloudflare Pages](https://pages.cloudflare.com/) to my GitHub repo and the project is automatically deployed. I have used Netlify and Vercel (both great), but I prefer Cloudflare. They have a generous free tier that's perfect for the scale of my projects and they offer low-cost domain registrations so I can manage everything in one place.

That's it. That's the list. A modest set of techniques and tools that help me create side projects. Maybe they’ll help you create yours, too.